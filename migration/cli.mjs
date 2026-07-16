#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

import { buildCaptureManifest, buildReconstructionReadiness } from "./lib/capture-manifest.mjs";
import { buildReconstructionModel } from "./lib/model.mjs";
import { validatePublicStoreUrl } from "./lib/network.mjs";
import { capturePublicSnapshot } from "./lib/snapshot.mjs";
import { inspectThemeSource } from "./lib/theme.mjs";
import {
  appendLedger,
  createRun,
  currentRun,
  recordArtifact,
  updateState,
  withWorkspaceLock,
  writeJsonAtomic,
} from "./lib/workspace.mjs";

const execFileAsync = promisify(execFile);
const SECRET_FLAG = /token|secret|password|credential|authorization|api[-_]?key/i;
const PHASE_STATUSES = new Set([
  "pending",
  "in_progress",
  "completed",
  "partial",
  "blocked",
  "failed",
  "cancelled",
]);

export class MigrationCommandError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "MigrationCommandError";
    this.code = code;
    this.details = details;
  }
}

export function parseArguments(argv) {
  const command = argv[0];
  if (!command || command.startsWith("-")) throw new Error(usage());
  const options = {};
  const positionals = [];
  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }
    const [rawName, inline] = value.slice(2).split(/=(.*)/s, 2);
    if (!/^[a-z][a-z0-9-]*$/.test(rawName)) throw new Error(`Invalid option: --${rawName}`);
    if (SECRET_FLAG.test(rawName)) {
      throw new Error(
        `Secret-bearing option --${rawName} is forbidden. Use the external credential broker.`,
      );
    }
    if (Object.hasOwn(options, rawName)) throw new Error(`Duplicate option: --${rawName}`);
    if (inline !== undefined) options[rawName] = inline;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) options[rawName] = argv[++index];
    else options[rawName] = true;
  }
  return { command, options, positionals };
}

async function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  const parsed = parseArguments(argv);
  const json = parsed.options.json === true;
  const result = await dispatch(parsed, cwd);
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`${formatResult(parsed.command, result)}\n`);
}

async function dispatch(parsed, cwd) {
  const aliases = { preflight: "doctor" };
  const command = aliases[parsed.command] ?? parsed.command;
  const mutating = new Set(["doctor", "capability", "snapshot", "decision", "verify", "resume"]);
  const execute = () => handlers[command]?.(parsed.options, parsed.positionals, cwd);
  if (!handlers[command]) throw new Error(usage());
  return mutating.has(command) ? withWorkspaceLock(cwd, command, execute) : execute();
}

const handlers = {
  async doctor(options, positionals, cwd) {
    rejectPositionals(positionals);
    rejectUnknown(options, [
      "json",
      "store-url",
      "theme-source",
      "theme-rights-confirmed",
      "new-run",
    ]);
    if (options["theme-rights-confirmed"] !== true) {
      throw new MigrationCommandError(
        "THEME_RIGHTS_REQUIRED",
        "Confirm that the merchant may use the supplied theme source for this migration.",
        {
          remediation:
            "Verify theme, font, media and app-license rights, then rerun with --theme-rights-confirmed",
        },
      );
    }
    const validatedStoreUrl = validatePublicStoreUrl(requiredString(options, "store-url"));
    validatedStoreUrl.pathname = "/";
    validatedStoreUrl.search = "";
    const storeUrl = validatedStoreUrl.toString();
    const themeSource = resolve(requiredString(options, "theme-source"));
    const checks = await runDoctorChecks(cwd, themeSource);
    if (checks.some((check) => check.status !== "pass")) {
      throw new MigrationCommandError(
        "PREFLIGHT_FAILED",
        `Preflight failed: ${checks
          .filter((check) => check.status !== "pass")
          .map((check) => check.id)
          .join(", ")}`,
        { checks },
      );
    }
    const inventory = await inspectThemeSource(themeSource);
    let run;
    if (options["new-run"] === true) run = await createRun({ cwd, storeUrl, themeSource });
    else {
      run = await currentRun(cwd).catch((error) =>
        error?.code === "ENOENT" ? null : Promise.reject(error),
      );
      if (!run) run = await createRun({ cwd, storeUrl, themeSource });
      else if (run.state.storeUrl !== storeUrl || resolve(run.state.themeSource) !== themeSource) {
        throw new Error(
          "The active run belongs to a different source. Pass --new-run to create an isolated run.",
        );
      }
    }
    const reportPath = join(run.runDirectory, "reports", "preflight.json");
    const inventoryPath = join(run.runDirectory, "snapshots", "theme-inventory-v1.json");
    await writeJsonAtomic(reportPath, {
      schemaVersion: 1,
      checkedAt: new Date().toISOString(),
      checks,
      themeRights: {
        asserted: true,
        authority: "merchant-assertion",
        scope: "downstream-migration-only",
        foundationRedistribution: false,
      },
    });
    await writeJsonAtomic(inventoryPath, inventory);
    let state = await setPhase(run.runDirectory, run.state, "preflight", "completed");
    state = await recordArtifact(run.runDirectory, state, {
      id: "preflight",
      path: reportPath,
      kind: "report",
    });
    state = await recordArtifact(run.runDirectory, state, {
      id: "theme-inventory",
      path: inventoryPath,
      kind: "snapshot",
    });
    state = await updateState(run.runDirectory, state, {
      nextActions: inventory.requiresArchiveInspection
        ? ["Inspect the theme archive in an isolated archive-safe sandbox", "Run public snapshot"]
        : ["Run public snapshot", "Review the capability map"],
    });
    await appendLedger(run.runDirectory, {
      event: "preflight.completed",
      details: {
        checks: checks.length,
        themeKind: inventory.kind,
        themeFiles: inventory.fileCount ?? null,
      },
    });
    return {
      ok: true,
      runId: state.runId,
      checks,
      theme: summarizeTheme(inventory),
      nextActions: state.nextActions,
    };
  },

  async capability(options, positionals, cwd) {
    rejectPositionals(positionals);
    rejectUnknown(options, ["json"]);
    const run = await requireRun(cwd, "preflight");
    const source = JSON.parse(
      await readFile(join(cwd, "agent-workflows", "capability-map.json"), "utf8"),
    );
    const artifact = {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      sourcePath: "agent-workflows/capability-map.json",
      capabilities: source.capabilities,
      customization: source.customization,
      summary: countBy(source.capabilities, "status"),
    };
    const path = join(run.runDirectory, "model", "capabilities.json");
    await writeJsonAtomic(path, artifact);
    let state = await recordArtifact(run.runDirectory, run.state, {
      id: "capabilities",
      path,
      kind: "model",
    });
    state = await updateState(run.runDirectory, state, {
      nextActions: ["Run public snapshot", "Resolve conditional and unsupported capabilities"],
    });
    await appendLedger(run.runDirectory, {
      event: "capabilities.mapped",
      details: artifact.summary,
    });
    return {
      ok: true,
      runId: state.runId,
      summary: artifact.summary,
      capabilities: artifact.capabilities,
    };
  },

  async snapshot(options, positionals, cwd) {
    rejectPositionals(positionals);
    rejectUnknown(options, ["json", "max-pages"]);
    const run = await requireRun(cwd, "preflight");
    let state = await setPhase(run.runDirectory, run.state, "public-snapshot", "in_progress");
    try {
      const snapshot = await capturePublicSnapshot({
        runDirectory: run.runDirectory,
        storeUrl: state.storeUrl,
        maxPages: optionalInteger(options, "max-pages", 100),
      });
      const path = join(run.runDirectory, "snapshots", "public-v1.json");
      await writeJsonAtomic(path, snapshot);
      state = await recordArtifact(run.runDirectory, state, {
        id: "public-snapshot",
        path,
        kind: "snapshot",
      });
      const theme = await readOptionalJson(
        join(run.runDirectory, "snapshots", "theme-inventory-v1.json"),
      );
      const capabilityMap =
        (await readOptionalJson(join(run.runDirectory, "model", "capabilities.json"))) ??
        JSON.parse(await readFile(join(cwd, "agent-workflows", "capability-map.json"), "utf8"));
      const model = buildReconstructionModel({ snapshot, theme, capabilityMap });
      const modelPath = join(run.runDirectory, "model", "reconstruction-plan-v1.json");
      await writeJsonAtomic(modelPath, model);
      state = await recordArtifact(run.runDirectory, state, {
        id: "reconstruction-plan",
        path: modelPath,
        kind: "model",
      });
      const captureManifest = buildCaptureManifest(model);
      const capturePath = join(run.runDirectory, "model", "capture-manifest-v1.json");
      await writeJsonAtomic(capturePath, captureManifest);
      state = await recordArtifact(run.runDirectory, state, {
        id: "capture-manifest",
        path: capturePath,
        kind: "model",
      });
      const readiness = buildReconstructionReadiness(model, captureManifest);
      const readinessPath = join(run.runDirectory, "reports", "reconstruction-readiness-v1.json");
      await writeJsonAtomic(readinessPath, readiness);
      state = await recordArtifact(run.runDirectory, state, {
        id: "reconstruction-readiness",
        path: readinessPath,
        kind: "report",
      });
      const status =
        snapshot.summary.failedCount ||
        snapshot.summary.passwordGateCount ||
        snapshot.summary.selectedCount === 0
          ? "partial"
          : "completed";
      state = await setPhase(
        run.runDirectory,
        state,
        "public-snapshot",
        status,
        snapshot.summary.selectedCount === 0
          ? "No public pages were permitted by discovery and robots rules"
          : snapshot.summary.passwordGateCount
            ? "Source storefront is password-gated"
            : snapshot.summary.failedCount
              ? "Some public pages could not be captured"
              : undefined,
      );
      state = await updateState(run.runDirectory, state, { nextActions: readiness.nextActions });
      await appendLedger(run.runDirectory, {
        event: "public-snapshot.completed",
        details: snapshot.summary,
      });
      return {
        ok: true,
        runId: state.runId,
        phaseStatus: status,
        summary: snapshot.summary,
        readiness: { status: readiness.status, blockers: readiness.blockers.length },
        nextActions: state.nextActions,
      };
    } catch (error) {
      await setPhase(run.runDirectory, state, "public-snapshot", "failed", safeError(error));
      await appendLedger(run.runDirectory, {
        event: "public-snapshot.failed",
        details: { error: safeError(error) },
      });
      throw error;
    }
  },

  async status(options, positionals, cwd) {
    rejectPositionals(positionals);
    rejectUnknown(options, ["json"]);
    const { state } = await currentRun(cwd);
    return {
      runId: state.runId,
      status: state.status,
      storeUrl: state.storeUrl,
      phases: state.phases,
      artifactCount: state.artifacts.length,
      nextActions: state.nextActions,
      launchAuthority: "human-only",
    };
  },

  async decision(options, positionals, cwd) {
    rejectPositionals(positionals);
    rejectUnknown(options, ["json", "id", "status", "summary"]);
    const run = await requireRun(cwd, "preflight");
    const id = requiredString(options, "id");
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id))
      throw new Error("--id must be a lowercase kebab-case identifier");
    const status = requiredString(options, "status");
    if (!["pending", "accepted", "rejected"].includes(status))
      throw new Error("--status must be pending, accepted, or rejected");
    const summary = requiredString(options, "summary");
    if (summary.length > 500) throw new Error("--summary may not exceed 500 characters");
    if (containsSecret(summary))
      throw new Error("--summary appears to contain a secret and was rejected");
    const decision = {
      schemaVersion: 1,
      id,
      status,
      summary,
      recordedAt: new Date().toISOString(),
      authority: "migration-review-only",
      isProductionApproval: false,
    };
    const path = join(run.runDirectory, "decisions", `${id}.json`);
    await writeJsonAtomic(path, decision);
    let state = await recordArtifact(run.runDirectory, run.state, {
      id: `decision-${id}`,
      path,
      kind: "decision",
    });
    state = await setPhase(run.runDirectory, state, "review", "in_progress");
    await appendLedger(run.runDirectory, { event: "decision.recorded", details: decision });
    return {
      ok: true,
      runId: state.runId,
      decision,
      warning:
        "This records a migration review decision, not deployment, DNS, cutover, or production approval.",
    };
  },

  async verify(options, positionals, cwd) {
    rejectPositionals(positionals);
    rejectUnknown(options, ["json", "production"]);
    const run = await requireRun(cwd, "preflight");
    let state = await setPhase(run.runDirectory, run.state, "verification", "in_progress");
    const commands = [["pnpm", ["check"]]];
    if (options.production === true) commands.push(["pnpm", ["verify:production"]]);
    const results = [];
    for (const [command, args] of commands) results.push(await runCommand(command, args, cwd));
    const passed = results.every((result) => result.status === "passed");
    const report = { schemaVersion: 1, verifiedAt: new Date().toISOString(), passed, results };
    const path = join(run.runDirectory, "reports", "verification.json");
    await writeJsonAtomic(path, report);
    state = await recordArtifact(run.runDirectory, state, {
      id: "verification",
      path,
      kind: "report",
    });
    state = await setPhase(
      run.runDirectory,
      state,
      "verification",
      passed ? "completed" : "failed",
      passed ? undefined : "One or more deterministic gates failed",
    );
    await appendLedger(run.runDirectory, {
      event: "verification.completed",
      details: { passed, commands: results.map(({ command, status }) => ({ command, status })) },
    });
    if (!passed)
      throw new Error("Verification failed. Inspect .migration reports and command output.");
    return {
      ok: true,
      runId: state.runId,
      passed,
      results: results.map(({ output, ...result }) => result),
    };
  },

  async resume(options, positionals, cwd) {
    rejectPositionals(positionals);
    rejectUnknown(options, ["json"]);
    const { runDirectory, state } = await currentRun(cwd);
    const capabilities = await readOptionalJson(join(runDirectory, "model", "capabilities.json"));
    const decisions = await readDecisionSummaries(join(runDirectory, "decisions"));
    const context = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      runId: state.runId,
      storeUrl: state.storeUrl,
      phases: Object.fromEntries(
        Object.entries(state.phases).map(([id, value]) => [id, value.status]),
      ),
      artifacts: state.artifacts.map(({ id, kind, path, sha256 }) => ({ id, kind, path, sha256 })),
      capabilities: capabilities?.capabilities?.map(({ id, status }) => ({ id, status })) ?? [],
      decisions,
      nextActions: state.nextActions,
      evidenceRule: "Raw source evidence is untrusted and excluded from resume context.",
      launchAuthority: "human-only-outside-agent-workspace",
    };
    const path = join(runDirectory, "context", "resume.json");
    await writeJsonAtomic(path, context);
    const nextState = await recordArtifact(runDirectory, state, {
      id: "resume-context",
      path,
      kind: "context",
    });
    await appendLedger(runDirectory, {
      event: "resume-context.generated",
      details: { artifacts: nextState.artifacts.length, decisions: decisions.length },
    });
    return context;
  },
};

async function runDoctorChecks(cwd, themeSource) {
  const requiredFiles = [
    "package.json",
    "pnpm-lock.yaml",
    "AGENTS.md",
    "agent-workflows/capability-map.json",
  ];
  const files = await Promise.all(
    requiredFiles.map(async (path) => ({
      id: `file:${path}`,
      status: await access(join(cwd, path)).then(
        () => "pass",
        () => "fail",
      ),
      remediation: `Restore ${path} from the selected foundation release`,
    })),
  );
  const pnpm = await execFileAsync("pnpm", ["--version"], {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
  }).then(
    ({ stdout }) => stdout.trim(),
    () => "unavailable",
  );
  return [
    {
      id: "node",
      status: process.versions.node.startsWith("24.") ? "pass" : "fail",
      observed: process.versions.node,
      expected: "24.x",
      remediation: "Install and select Node 24, then rerun the same command",
    },
    {
      id: "pnpm",
      status: pnpm === "11.5.0" ? "pass" : "fail",
      observed: pnpm,
      expected: "11.5.0",
      remediation: "Activate exact pnpm 11.5.0 through Corepack, then rerun the same command",
    },
    {
      id: "theme-source",
      status: await access(themeSource).then(
        () => "pass",
        () => "fail",
      ),
      observed: basename(themeSource),
      remediation: "Export the current published Shopify theme and pass its directory or .zip path",
    },
    ...files,
  ];
}

async function requireRun(cwd, phase) {
  const run = await currentRun(cwd);
  if (phase && run.state.phases[phase]?.status !== "completed")
    throw new Error(`Phase ${phase} must be completed first`);
  return run;
}

async function setPhase(runDirectory, state, phase, status, reason) {
  if (!PHASE_STATUSES.has(status) || !state.phases[phase])
    throw new Error(`Invalid migration phase transition: ${phase}/${status}`);
  return updateState(runDirectory, state, {
    phases: {
      ...state.phases,
      [phase]: { status, updatedAt: new Date().toISOString(), ...(reason ? { reason } : {}) },
    },
  });
}

async function runCommand(command, args, cwd) {
  const started = Date.now();
  const display = [command, ...args].join(" ");
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      command: display,
      status: "passed",
      durationMs: Date.now() - started,
      output: sanitizeLog(`${stdout}${stderr}`).slice(-20_000),
    };
  } catch (error) {
    return {
      command: display,
      status: "failed",
      durationMs: Date.now() - started,
      exitCode: error?.code ?? null,
      output: sanitizeLog(`${error?.stdout ?? ""}${error?.stderr ?? ""}`).slice(-20_000),
    };
  }
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function readDecisionSummaries(directory) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(directory).catch((error) =>
    error?.code === "ENOENT" ? [] : Promise.reject(error),
  );
  return Promise.all(
    entries
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map(async (name) => {
        const decision = JSON.parse(await readFile(join(directory, name), "utf8"));
        return {
          id: decision.id,
          status: decision.status,
          summary: decision.summary,
          recordedAt: decision.recordedAt,
        };
      }),
  );
}

function summarizeTheme(value) {
  return {
    kind: value.kind,
    name: value.name,
    bytes: value.bytes,
    fileCount: value.fileCount ?? null,
    sha256: value.sha256 ?? value.manifestSha256,
    requiresArchiveInspection: value.requiresArchiveInspection,
  };
}
function countBy(values, key) {
  return values.reduce(
    (result, item) => ({ ...result, [item[key]]: (result[item[key]] ?? 0) + 1 }),
    {},
  );
}
function optionalInteger(options, key, fallback) {
  const value = options[key] ?? fallback;
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error(`--${key} must be an integer`);
  return number;
}
function requiredString(options, key) {
  const value = options[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing required --${key}`);
  return value.trim();
}
function rejectPositionals(positionals) {
  if (positionals.length) throw new Error(`Unexpected arguments: ${positionals.join(" ")}`);
}
function rejectUnknown(options, allowed) {
  const unknown = Object.keys(options).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unknown option: --${unknown[0]}`);
}
function safeError(error) {
  return sanitizeLog(String(error?.message ?? error)).slice(0, 500);
}
function containsSecret(value) {
  return /\b(?:shpat|shpca|shpss|shppa)_[A-Za-z0-9_-]+\b|\bBearer\s+[A-Za-z0-9._~-]+|(?:token|secret|password|api[_-]?key)\s*[=:]\s*\S+/i.test(
    value,
  );
}
function sanitizeLog(value) {
  return value
    .replace(/\b(?:shpat|shpca|shpss|shppa)_[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+\b/gi, "Bearer [REDACTED]")
    .replace(/\b(token|secret|password|api[_-]?key)\s*([=:])\s*\S+/gi, "$1$2[REDACTED]");
}

function formatResult(command, result) {
  if (command === "status" || command === "resume") return JSON.stringify(result, null, 2);
  const lines = [`${result.ok ? "✓" : "!"} ${command} ${result.ok ? "completed" : "reported"}`];
  if (result.runId) lines.push(`Run: ${result.runId}`);
  if (result.summary) lines.push(`Summary: ${JSON.stringify(result.summary)}`);
  if (result.warning) lines.push(`Warning: ${result.warning}`);
  if (result.nextActions?.length) lines.push(`Next: ${result.nextActions.join("; ")}`);
  return lines.join("\n");
}

function usage() {
  return `Usage: pnpm migrate <command> [options]\n\nCommands:\n  doctor|preflight --store-url <https-url> --theme-source <path> --theme-rights-confirmed [--new-run]\n  capability\n  snapshot [--max-pages 100]\n  status\n  decision --id <id> --status <pending|accepted|rejected> --summary <text>\n  verify [--production]\n  resume\n\nAdd --json for machine-readable output. Secret-bearing flags are forbidden.`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const failure = formatFailure(error);
    if (process.argv.slice(2).includes("--json")) {
      process.stderr.write(`${JSON.stringify(failure, null, 2)}\n`);
    } else {
      process.stderr.write(
        `Migration command failed [${failure.error.code}]: ${failure.error.message}\n`,
      );
      for (const check of failure.error.details?.checks ?? []) {
        if (check.status !== "pass") process.stderr.write(`- ${check.id}: ${check.remediation}\n`);
      }
      if (failure.error.details?.remediation) {
        process.stderr.write(`- remediation: ${failure.error.details.remediation}\n`);
      }
    }
    process.exitCode = 1;
  });
}

export function formatFailure(error) {
  return {
    ok: false,
    error: {
      code: error instanceof MigrationCommandError ? error.code : "COMMAND_FAILED",
      message: safeError(error),
      details: error instanceof MigrationCommandError ? error.details : undefined,
    },
  };
}
