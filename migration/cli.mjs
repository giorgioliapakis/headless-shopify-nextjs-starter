#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

import { buildCaptureManifest, buildReconstructionReadiness } from "./lib/capture-manifest.mjs";
import { buildSourceDrift, snapshotIdentity } from "./lib/drift.mjs";
import { buildReconstructionModel } from "./lib/model.mjs";
import { validatePublicStoreUrl } from "./lib/network.mjs";
import { buildReviewManifest, renderReviewHtml } from "./lib/review-package.mjs";
import { capturePublicSnapshot } from "./lib/snapshot.mjs";
import { buildThemeRightsInventory, buildThemeRightsStatus } from "./lib/theme-rights.mjs";
import { inspectThemeSource } from "./lib/theme.mjs";
import {
  appendLedger,
  createRun,
  currentRun,
  recordArtifact,
  sha256File,
  updateState,
  withWorkspaceLock,
  writeJsonAtomic,
  writeTextAtomic,
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
  const mutating = new Set([
    "doctor",
    "capability",
    "snapshot",
    "review",
    "rights",
    "decision",
    "verify",
    "resume",
  ]);
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
      } else {
        const previousInventory = await readOptionalJson(
          join(run.runDirectory, "snapshots", "theme-inventory-v1.json"),
        );
        if (
          previousInventory &&
          (previousInventory.manifestSha256 !== inventory.manifestSha256 ||
            previousInventory.provenance?.sourceIdentity !== inventory.provenance?.sourceIdentity)
        ) {
          throw new Error(
            "The theme source identity changed. Pass --new-run to preserve the earlier run and its evidence.",
          );
        }
      }
    }
    const reportPath = join(run.runDirectory, "reports", "preflight.json");
    const inventoryPath = join(run.runDirectory, "snapshots", "theme-inventory-v1.json");
    const rightsPath = join(run.runDirectory, "reports", "theme-rights-inventory-v1.json");
    const rightsStatusPath = join(run.runDirectory, "reports", "theme-rights-status-v1.json");
    const rightsInventory = buildThemeRightsInventory(inventory);
    const rightsStatus = buildThemeRightsStatus(
      rightsInventory,
      await readThemeRightsDecisions(join(run.runDirectory, "decisions", "theme-rights")),
    );
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
    await writeJsonAtomic(rightsPath, rightsInventory);
    await writeJsonAtomic(rightsStatusPath, rightsStatus);
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
    state = await recordArtifact(run.runDirectory, state, {
      id: "theme-rights-inventory",
      path: rightsPath,
      kind: "report",
    });
    state = await recordArtifact(run.runDirectory, state, {
      id: "theme-rights-status",
      path: rightsStatusPath,
      kind: "report",
    });
    const preflightNextActions = [
      ...(rightsStatus.summary.unresolved
        ? ["Review every unresolved item in reports/theme-rights-inventory-v1.json"]
        : []),
      ...(inventory.requiresArchiveInspection
        ? ["Inspect the theme archive in an isolated archive-safe sandbox"]
        : []),
      "Run public snapshot",
      "Review the capability map",
    ];
    state = await updateState(run.runDirectory, state, {
      nextActions: preflightNextActions,
    });
    await appendLedger(run.runDirectory, {
      event: "preflight.completed",
      details: {
        checks: checks.length,
        themeKind: inventory.kind,
        themeFiles: inventory.fileCount ?? null,
        themeRightsItems: rightsInventory.summary.itemCount,
      },
    });
    return {
      ok: true,
      runId: state.runId,
      checks,
      theme: summarizeTheme(inventory),
      themeRights: rightsInventory.summary,
      themeRightsStatus: rightsStatus.summary,
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
      const theme = await readRequiredJson(
        join(run.runDirectory, "snapshots", "theme-inventory-v1.json"),
        "Run preflight before public snapshot",
      );
      await assertRecordedArtifactCurrent(run, "theme-inventory");
      await assertRecordedArtifactCurrent(run, "theme-rights-status");
      const currentTheme = await inspectThemeSource(state.themeSource);
      if (
        currentTheme.manifestSha256 !== theme.manifestSha256 ||
        currentTheme.provenance?.sourceIdentity !== theme.provenance?.sourceIdentity
      ) {
        throw new Error(
          "Theme source changed after preflight; create a new isolated migration run from the new source identity",
        );
      }
      const currentPath = join(run.runDirectory, "snapshots", "public-v1.json");
      let previousSnapshot = await readOptionalJson(currentPath);
      if (previousSnapshot) {
        const observedIdentity = snapshotIdentity(previousSnapshot);
        if (previousSnapshot.snapshotId && previousSnapshot.snapshotId !== observedIdentity) {
          throw new Error("Previous public snapshot failed its content-identity check");
        }
        previousSnapshot = { ...previousSnapshot, snapshotId: observedIdentity };
      }
      const snapshot = await capturePublicSnapshot({
        runDirectory: run.runDirectory,
        storeUrl: state.storeUrl,
        maxPages: optionalInteger(options, "max-pages", 100),
      });
      const immutablePath = join(
        run.runDirectory,
        "snapshots",
        "public",
        `${snapshot.snapshotId}.json`,
      );
      if (await pathExists(immutablePath)) {
        const immutableSnapshot = await readRequiredJson(
          immutablePath,
          "Immutable snapshot disappeared during capture",
        );
        if (
          immutableSnapshot.snapshotId !== snapshot.snapshotId ||
          snapshotIdentity(immutableSnapshot) !== snapshot.snapshotId
        ) {
          throw new Error("Immutable public snapshot failed its content-identity check");
        }
      } else await writeJsonAtomic(immutablePath, snapshot);
      await writeJsonAtomic(currentPath, snapshot);
      state = await recordArtifact(run.runDirectory, state, {
        id: `public-snapshot-${snapshot.snapshotId.slice(0, 12)}`,
        path: immutablePath,
        kind: "snapshot",
      });
      state = await recordArtifact(run.runDirectory, state, {
        id: "public-snapshot",
        path: currentPath,
        kind: "snapshot",
      });
      const drift = buildSourceDrift(previousSnapshot, snapshot);
      const driftPath = join(run.runDirectory, "reports", "source-drift-v1.json");
      await writeJsonAtomic(driftPath, drift);
      state = await recordArtifact(run.runDirectory, state, {
        id: "source-drift",
        path: driftPath,
        kind: "report",
      });
      const decisions = await readDecisionSummaries(join(run.runDirectory, "decisions"));
      const decisionValidity = buildDecisionValidity(decisions, drift);
      const decisionValidityPath = join(run.runDirectory, "reports", "decision-validity-v1.json");
      await writeJsonAtomic(decisionValidityPath, decisionValidity);
      state = await recordArtifact(run.runDirectory, state, {
        id: "decision-validity",
        path: decisionValidityPath,
        kind: "report",
      });
      if (drift.status === "changed") {
        const now = new Date().toISOString();
        state = await updateState(run.runDirectory, state, {
          phases: {
            ...state.phases,
            reconstruction: { status: "pending", updatedAt: now, reason: "Source drift detected" },
            verification: { status: "pending", updatedAt: now, reason: "Source drift detected" },
            review: {
              status: "pending",
              updatedAt: now,
              reason: "Review decisions require revalidation",
            },
          },
        });
      }
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
      let readiness = buildReconstructionReadiness(model, captureManifest);
      const themeRightsStatus = await readRequiredJson(
        join(run.runDirectory, "reports", "theme-rights-status-v1.json"),
        "Run preflight again to generate the per-asset rights status",
      );
      if (themeRightsStatus.summary.unresolved) {
        readiness = setRequiredReview(
          readiness,
          {
            code: "THEME_ASSET_RIGHTS_REVIEW",
            count: themeRightsStatus.summary.unresolved,
          },
          "Resolve every font, media, script and app-output license decision before copying downstream",
        );
      }
      if (drift.status === "changed") {
        readiness = setRequiredReview(
          readiness,
          { code: "SOURCE_DRIFT_REVIEW", count: drift.affectedPaths.length },
          "Review source drift and revalidate affected routes before reconstruction",
        );
        readiness = {
          ...readiness,
          sourceDrift: {
            status: drift.status,
            previousSnapshotId: drift.previousSnapshotId,
            currentSnapshotId: drift.currentSnapshotId,
            affectedPaths: drift.affectedPaths,
          },
        };
      }
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
        details: { ...snapshot.summary, snapshotId: snapshot.snapshotId, drift: drift.status },
      });
      return {
        ok: true,
        runId: state.runId,
        phaseStatus: status,
        summary: snapshot.summary,
        snapshotId: snapshot.snapshotId,
        drift: { status: drift.status, affectedPaths: drift.affectedPaths.length },
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

  async review(options, positionals, cwd) {
    rejectPositionals(positionals);
    rejectUnknown(options, ["json"]);
    const run = await requireRun(cwd, "preflight");
    const model = await readRequiredJson(
      join(run.runDirectory, "model", "reconstruction-plan-v1.json"),
      "Run public snapshot before generating the review package",
    );
    const readiness = await readRequiredJson(
      join(run.runDirectory, "reports", "reconstruction-readiness-v1.json"),
      "Run public snapshot before generating the review package",
    );
    const captureManifest = await readRequiredJson(
      join(run.runDirectory, "model", "capture-manifest-v1.json"),
      "Run public snapshot before generating the review package",
    );
    const decisions = await readDecisionSummaries(join(run.runDirectory, "decisions"));
    const sourceDrift = await readOptionalJson(
      join(run.runDirectory, "reports", "source-drift-v1.json"),
    );
    const decisionValidity = await readOptionalJson(
      join(run.runDirectory, "reports", "decision-validity-v1.json"),
    );
    const artifactIntegrity = await verifyArtifactIntegrity(run.runDirectory, run.state.artifacts, [
      "review-package",
      "review-html",
    ]);
    const report = buildReviewManifest({
      state: run.state,
      model,
      readiness,
      captureManifest,
      decisions,
      sourceDrift,
      decisionValidity,
      artifactIntegrity,
    });
    const manifestPath = join(run.runDirectory, "review", "review-package-v1.json");
    const htmlPath = join(run.runDirectory, "review", "index.html");
    await writeJsonAtomic(manifestPath, report);
    await writeTextAtomic(htmlPath, renderReviewHtml(report));
    let state = await recordArtifact(run.runDirectory, run.state, {
      id: "review-package",
      path: manifestPath,
      kind: "review",
    });
    state = await recordArtifact(run.runDirectory, state, {
      id: "review-html",
      path: htmlPath,
      kind: "review",
    });
    state = await setPhase(run.runDirectory, state, "review", "in_progress");
    state = await updateState(run.runDirectory, state, {
      nextActions: readiness.nextActions,
    });
    await appendLedger(run.runDirectory, {
      event: "review-package.generated",
      details: {
        blockers: report.summary.blockerCount,
        requiredReviews: report.summary.requiredReviewCount,
        staleArtifacts: report.summary.staleArtifactCount,
      },
    });
    return {
      ok: true,
      runId: state.runId,
      summary: report.summary,
      report: state.artifacts.find((artifact) => artifact.id === "review-html")?.path,
      warning:
        "Local migration review only. This report grants no deploy, DNS, cutover, or launch authority.",
      nextActions: state.nextActions,
    };
  },

  async rights(options, positionals, cwd) {
    rejectPositionals(positionals);
    rejectUnknown(options, ["json", "item", "status", "basis", "summary"]);
    const run = await requireRun(cwd, "preflight");
    const inventory = await readRequiredJson(
      join(run.runDirectory, "reports", "theme-rights-inventory-v1.json"),
      "Run preflight before recording an asset rights decision",
    );
    await assertRecordedArtifactCurrent(run, "theme-rights-inventory");
    const itemId = requiredString(options, "item");
    const item = inventory.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new Error("--item must match an item in theme-rights-inventory-v1.json");
    const status = requiredString(options, "status");
    if (!new Set(["approved-downstream", "excluded"]).has(status)) {
      throw new Error("--status must be approved-downstream or excluded");
    }
    const basis = requiredString(options, "basis");
    const approvedBases = new Set(["merchant-owned", "license-reviewed", "app-terms-reviewed"]);
    if (
      (status === "excluded" && basis !== "excluded-from-migration") ||
      (status === "approved-downstream" && !approvedBases.has(basis))
    ) {
      throw new Error(
        "Use excluded-from-migration for excluded items, or merchant-owned, license-reviewed, or app-terms-reviewed for approved downstream use",
      );
    }
    const summary = requiredString(options, "summary");
    if (summary.length > 500) throw new Error("--summary may not exceed 500 characters");
    if (containsSecret(summary))
      throw new Error("--summary appears to contain a secret and was rejected");
    const decision = {
      schemaVersion: 1,
      itemId: item.id,
      category: item.category,
      status,
      basis,
      summary,
      recordedAt: new Date().toISOString(),
      themeSourceIdentity: inventory.themeSourceIdentity,
      themeManifestSha256: inventory.themeManifestSha256,
      authority: "downstream-asset-use-review-only",
      foundationRedistribution: false,
    };
    const decisionPath = join(run.runDirectory, "decisions", "theme-rights", `${item.id}.json`);
    await writeJsonAtomic(decisionPath, decision);
    let state = await recordArtifact(run.runDirectory, run.state, {
      id: `theme-rights-decision-${item.id}`,
      path: decisionPath,
      kind: "decision",
    });
    const decisions = await readThemeRightsDecisions(
      join(run.runDirectory, "decisions", "theme-rights"),
    );
    const rightsStatus = buildThemeRightsStatus(inventory, decisions);
    const statusPath = join(run.runDirectory, "reports", "theme-rights-status-v1.json");
    await writeJsonAtomic(statusPath, rightsStatus);
    state = await recordArtifact(run.runDirectory, state, {
      id: "theme-rights-status",
      path: statusPath,
      kind: "report",
    });
    const readinessPath = join(run.runDirectory, "reports", "reconstruction-readiness-v1.json");
    const readiness = await readOptionalJson(readinessPath);
    if (readiness) {
      const nextReadiness = setRequiredReview(
        readiness,
        {
          code: "THEME_ASSET_RIGHTS_REVIEW",
          count: rightsStatus.summary.unresolved,
        },
        "Resolve every font, media, script and app-output license decision before copying downstream",
      );
      await writeJsonAtomic(readinessPath, nextReadiness);
      state = await recordArtifact(run.runDirectory, state, {
        id: "reconstruction-readiness",
        path: readinessPath,
        kind: "report",
      });
      state = await updateState(run.runDirectory, state, {
        nextActions: nextReadiness.nextActions,
      });
    } else {
      state = await updateState(run.runDirectory, state, {
        nextActions: rightsStatus.summary.unresolved
          ? ["Resolve the remaining theme asset rights items", "Run public snapshot"]
          : ["Run public snapshot", "Review the capability map"],
      });
    }
    await appendLedger(run.runDirectory, {
      event: "theme-rights.decision-recorded",
      details: { itemId: item.id, status, basis, remaining: rightsStatus.summary.unresolved },
    });
    return {
      ok: true,
      runId: state.runId,
      decision,
      summary: rightsStatus.summary,
      warning:
        "Downstream asset-use review only. This does not grant foundation redistribution or production approval.",
      nextActions: state.nextActions,
    };
  },

  async decision(options, positionals, cwd) {
    rejectPositionals(positionals);
    rejectUnknown(options, ["json", "id", "status", "summary"]);
    const run = await requireRun(cwd, "preflight");
    const id = requiredString(options, "id");
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id))
      throw new Error("--id must be a lowercase kebab-case identifier");
    if (id === "theme-asset-rights-review") {
      throw new Error(
        "Theme rights cannot be approved in bulk; use pnpm migrate rights for every inventory item",
      );
    }
    const status = requiredString(options, "status");
    if (!["pending", "accepted", "rejected"].includes(status))
      throw new Error("--status must be pending, accepted, or rejected");
    const summary = requiredString(options, "summary");
    if (summary.length > 500) throw new Error("--summary may not exceed 500 characters");
    if (containsSecret(summary))
      throw new Error("--summary appears to contain a secret and was rejected");
    const snapshot = await readRequiredJson(
      join(run.runDirectory, "snapshots", "public-v1.json"),
      "Run public snapshot before recording a source-bound review decision",
    );
    const decision = {
      schemaVersion: 1,
      id,
      status,
      summary,
      recordedAt: new Date().toISOString(),
      sourceSnapshotId: snapshot.snapshotId,
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
    const sourceDrift = await readOptionalJson(
      join(run.runDirectory, "reports", "source-drift-v1.json"),
    );
    const decisionValidity = buildDecisionValidity(
      await readDecisionSummaries(join(run.runDirectory, "decisions")),
      sourceDrift ?? {
        currentSnapshotId: snapshot.snapshotId,
        status: "baseline",
      },
    );
    const decisionValidityPath = join(run.runDirectory, "reports", "decision-validity-v1.json");
    await writeJsonAtomic(decisionValidityPath, decisionValidity);
    state = await recordArtifact(run.runDirectory, state, {
      id: "decision-validity",
      path: decisionValidityPath,
      kind: "report",
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
    const snapshot = await readOptionalJson(join(runDirectory, "snapshots", "public-v1.json"));
    const sourceDrift = await readOptionalJson(
      join(runDirectory, "reports", "source-drift-v1.json"),
    );
    const decisionValidity = await readOptionalJson(
      join(runDirectory, "reports", "decision-validity-v1.json"),
    );
    const artifactIntegrity = await verifyArtifactIntegrity(runDirectory, state.artifacts, [
      "resume-context",
    ]);
    const degradedArtifacts = artifactIntegrity.filter((artifact) => artifact.status !== "current");
    const validity = new Map(
      (decisionValidity?.decisions ?? []).map((decision) => [decision.id, decision.validity]),
    );
    const context = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      runId: state.runId,
      storeUrl: state.storeUrl,
      contextTrust: degradedArtifacts.length ? "degraded-artifact-integrity" : "current",
      sourceSnapshotId: snapshot?.snapshotId ?? null,
      sourceDrift: sourceDrift
        ? { status: sourceDrift.status, affectedPaths: sourceDrift.affectedPaths }
        : { status: "not-evaluated", affectedPaths: [] },
      phases: Object.fromEntries(
        Object.entries(state.phases).map(([id, value]) => [id, value.status]),
      ),
      artifacts: artifactIntegrity,
      capabilities: capabilities?.capabilities?.map(({ id, status }) => ({ id, status })) ?? [],
      decisions: decisions.map((decision) => ({
        ...decision,
        validity: validity.get(decision.id) ?? "not-evaluated",
      })),
      nextActions: [
        ...(degradedArtifacts.length
          ? ["Regenerate or explicitly investigate every stale or missing migration artifact"]
          : []),
        ...state.nextActions,
      ],
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

async function pathExists(path) {
  return access(path).then(
    () => true,
    (error) => (error?.code === "ENOENT" ? false : Promise.reject(error)),
  );
}

function buildDecisionValidity(decisions, drift) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceSnapshotId: drift.currentSnapshotId,
    sourceDriftStatus: drift.status,
    authority: "review-state-only",
    decisions: decisions.map((decision) => ({
      id: decision.id,
      recordedStatus: decision.status,
      boundSnapshotId: decision.sourceSnapshotId ?? null,
      validity:
        decision.sourceSnapshotId === drift.currentSnapshotId
          ? "current-review-only"
          : "stale-source-drift",
    })),
  };
}

async function readRequiredJson(path, remediation) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(remediation, { cause: error });
    throw error;
  }
}

async function assertRecordedArtifactCurrent(run, id) {
  const artifact = run.state.artifacts.find((candidate) => candidate.id === id);
  if (!artifact) throw new Error(`Required recorded artifact is missing: ${id}`);
  const path = resolve(run.runDirectory, artifact.path);
  if (!path.startsWith(`${resolve(run.runDirectory)}/`)) {
    throw new Error(`Required artifact escaped its run directory: ${id}`);
  }
  const observed = await sha256File(path).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (observed !== artifact.sha256) {
    throw new Error(`Required artifact failed its integrity check: ${id}`);
  }
}

async function verifyArtifactIntegrity(runDirectory, artifacts, excludedIds = []) {
  return Promise.all(
    artifacts
      .filter((artifact) => !excludedIds.includes(artifact.id))
      .map(async (artifact) => {
        const path = resolve(runDirectory, artifact.path);
        if (!path.startsWith(`${resolve(runDirectory)}/`)) {
          return {
            id: artifact.id,
            kind: artifact.kind,
            path: artifact.path,
            expectedSha256: artifact.sha256,
            observedSha256: null,
            status: "invalid-path",
          };
        }
        try {
          const observedSha256 = await sha256File(path);
          return {
            id: artifact.id,
            kind: artifact.kind,
            path: artifact.path,
            expectedSha256: artifact.sha256,
            observedSha256,
            status: observedSha256 === artifact.sha256 ? "current" : "mismatch",
          };
        } catch (error) {
          if (error?.code === "ENOENT") {
            return {
              id: artifact.id,
              kind: artifact.kind,
              path: artifact.path,
              expectedSha256: artifact.sha256,
              observedSha256: null,
              status: "missing",
            };
          }
          throw error;
        }
      }),
  );
}

async function readDecisionSummaries(directory) {
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
          sourceSnapshotId: decision.sourceSnapshotId ?? null,
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
    provenance: value.provenance
      ? {
          kind: value.provenance.kind,
          commit: value.provenance.commit ?? null,
          sourceIdentity: value.provenance.sourceIdentity,
          immutableSourceMatch: value.provenance.immutableSourceMatch,
        }
      : null,
    requiresArchiveInspection: value.requiresArchiveInspection,
  };
}
function countBy(values, key) {
  return values.reduce(
    (result, item) => ({ ...result, [item[key]]: (result[item[key]] ?? 0) + 1 }),
    {},
  );
}
function setRequiredReview(readiness, decision, action) {
  const blockerCount = readiness.blockers?.length ?? 0;
  const currentDecisions = readiness.decisions ?? [];
  const existingIndex = currentDecisions.findIndex((item) => item.code === decision.code);
  const nextActions = [...(readiness.nextActions ?? [])];
  if (existingIndex >= 0) nextActions.splice(blockerCount + existingIndex, 1);
  const decisions = currentDecisions.filter((item) => item.code !== decision.code);
  if (decision.count > 0) {
    decisions.unshift(decision);
    nextActions.splice(blockerCount, 0, action);
  }
  return {
    ...readiness,
    status: blockerCount
      ? "blocked"
      : decisions.length
        ? "needs-review"
        : "ready-for-reconstruction",
    decisions,
    nextActions,
  };
}

async function readThemeRightsDecisions(directory) {
  const entries = await readdir(directory).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  return Promise.all(
    entries
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map(async (name) => JSON.parse(await readFile(join(directory, name), "utf8"))),
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
  return `Usage: pnpm migrate <command> [options]\n\nCommands:\n  doctor|preflight --store-url <https-url> --theme-source <path> --theme-rights-confirmed [--new-run]\n  capability\n  rights --item <id> --status <approved-downstream|excluded> --basis <basis> --summary <text>\n  snapshot [--max-pages 100]\n  status\n  review\n  decision --id <id> --status <pending|accepted|rejected> --summary <text>\n  verify [--production]\n  resume\n\nAdd --json for machine-readable output. Secret-bearing flags are forbidden.`;
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
