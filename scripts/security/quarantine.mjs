#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const toolRoot = resolve(import.meta.dirname, "../..");
const policyPath = join(toolRoot, "config", "security", "quarantine-policy.json");
const SECRET_FLAG = /token|secret|password|credential|authorization|api[-_]?key/i;
const FORBIDDEN_PATH = /(^|\/)\.env(?:\..+)?$/i;
const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bshp(?:at|ca|ss|pa)_[A-Za-z0-9_-]{16,}\b/,
  /\bgh[oprsu]_[A-Za-z0-9_]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~-]{16,}\b/i,
];
const GENERATED_CODE_REVIEW_PATTERNS = [
  { reason: "subprocess", pattern: /(?:node:)?child_process|\bexecFileSync\s*\(|\bspawnSync\s*\(/ },
  {
    reason: "raw-network",
    pattern: /(?:from\s+|require\s*\(\s*)["'](?:node:)?(?:net|dgram|tls)["']/,
  },
  { reason: "dynamic-execution", pattern: /\beval\s*\(|\bnew\s+Function\s*\(/ },
  {
    reason: "secret-read",
    pattern: /process\.env(?:\.[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY)|\[[^\]]+\])/,
  },
  { reason: "literal-network-destination", pattern: /\bfetch\s*\(\s*["']https?:\/\// },
];

export class QuarantineError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "QuarantineError";
    this.code = code;
    this.details = details;
  }
}

export function parseQuarantineArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new QuarantineError("INVALID_ARGUMENT", value);
    const [name, inline] = value.slice(2).split(/=(.*)/s, 2);
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new QuarantineError("INVALID_ARGUMENT", value);
    if (SECRET_FLAG.test(name)) {
      throw new QuarantineError("SECRET_ARGUMENT_REJECTED", `Secret-bearing flag --${name}`);
    }
    if (Object.hasOwn(options, name)) {
      throw new QuarantineError("DUPLICATE_ARGUMENT", `Duplicate flag --${name}`);
    }
    if (inline !== undefined) options[name] = inline;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) options[name] = argv[++index];
    else options[name] = true;
  }
  const unknown = Object.keys(options).filter(
    (name) =>
      !["workspace", "foundation", "runtime", "json", "self-test", "prove-boundary"].includes(name),
  );
  if (unknown.length) throw new QuarantineError("UNKNOWN_ARGUMENT", `Unknown flag --${unknown[0]}`);
  return options;
}

export async function stageWorkspace({ workspace, foundation, destination, policy }) {
  const sourceRoot = resolve(workspace);
  const foundationRoot = resolve(foundation);
  await requireDirectory(sourceRoot, "workspace");
  await requireDirectory(foundationRoot, "foundation");
  await compareImmutablePaths(sourceRoot, foundationRoot, policy.immutablePaths);
  await reviewGeneratedChanges(sourceRoot, foundationRoot, policy);

  const summary = { files: 0, bytes: 0, ignored: 0 };
  await copyDirectory(sourceRoot, destination, "", policy, summary);
  return summary;
}

async function reviewGeneratedChanges(workspace, foundation, policy) {
  const findings = [];
  async function walk(relativeDirectory) {
    const directory = join(workspace, relativeDirectory);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && policy.ignoredDirectories.includes(entry.name)) continue;
      if (policy.ignoredFiles.includes(entry.name)) continue;
      const relativePath = join(relativeDirectory, entry.name);
      const normalized = relativePath.split(sep).join("/");
      const workspacePath = join(workspace, relativePath);
      const metadata = await lstat(workspacePath);
      if (metadata.isDirectory()) {
        await walk(relativePath);
        continue;
      }
      if (!metadata.isFile()) continue;
      const content = await readFile(workspacePath);
      const foundationContent = await readFile(join(foundation, relativePath)).catch((error) =>
        error?.code === "ENOENT" ? null : Promise.reject(error),
      );
      if (foundationContent?.equals(content)) continue;
      if (/^app\/.+\/route\.[cm]?[jt]sx?$/.test(normalized)) {
        findings.push({ path: normalized, reason: "endpoint" });
      }
      if (content.includes(0)) continue;
      const text = content.toString("utf8");
      for (const review of GENERATED_CODE_REVIEW_PATTERNS) {
        if (review.pattern.test(text)) findings.push({ path: normalized, reason: review.reason });
      }
    }
  }
  await walk("");
  if (findings.length) {
    throw new QuarantineError(
      "STATIC_REVIEW_REQUIRED",
      "Generated changes introduced a privileged code pattern that requires separate review",
      { findings },
    );
  }
}

async function run(options) {
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  validatePolicy(policy);
  const workspace = resolve(requiredString(options, "workspace"));
  const foundation = resolve(requiredString(options, "foundation"));
  if (workspace === foundation && options["self-test"] !== true) {
    throw new QuarantineError(
      "DISTINCT_FOUNDATION_REQUIRED",
      "Use a separate clean foundation checkout, or pass --self-test only when testing the foundation itself",
    );
  }
  const runtime = await selectRuntime(options.runtime);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "shopify-quarantine-"));
  const staged = join(temporaryRoot, "input");
  const buildContext = join(temporaryRoot, "build");
  try {
    await mkdir(staged, { recursive: true, mode: 0o700 });
    const stagedSummary = await stageWorkspace({
      workspace,
      foundation,
      destination: staged,
      policy,
    });
    if (options["prove-boundary"] === true) {
      await addBoundaryProbe(staged, stagedSummary);
    }
    await createBuildContext(foundation, buildContext);
    const image = await ensureDependencyImage({ runtime, buildContext, foundation, policy });
    const result = await executeQuarantine({ runtime, image, staged, policy });
    return {
      ok: true,
      boundary: "ephemeral-container",
      runtime,
      baseImage: policy.baseImage,
      image,
      network: "none",
      credentials: "none",
      broker: "not-mounted",
      sourceMount: "read-only-staged-copy",
      rootFilesystem: "read-only",
      dependencyInstallInput: "immutable-manifests-only-generated-source-absent",
      lifecycleScriptsDuringInstall: "disabled",
      boundaryProbe: options["prove-boundary"] === true ? "passed" : "not-requested",
      staged: stagedSummary,
      checks: policy.commands,
      durationMs: result.durationMs,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function addBoundaryProbe(staged, summary) {
  const path = join(staged, "tests", "quarantine-boundary.test.ts");
  const source = await readFile(
    join(toolRoot, "scripts", "security", "quarantine-boundary-probe.ts"),
    "utf8",
  );
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, source, { mode: 0o600 });
  summary.files += 1;
  summary.bytes += Buffer.byteLength(source);
}

async function compareImmutablePaths(workspace, foundation, immutablePaths) {
  const mismatches = [];
  for (const path of immutablePaths) {
    const [workspaceDigest, foundationDigest] = await Promise.all([
      digestPath(join(workspace, path), workspace),
      digestPath(join(foundation, path), foundation),
    ]);
    if (workspaceDigest !== foundationDigest) mismatches.push(path);
  }
  if (mismatches.length) {
    throw new QuarantineError(
      "TRUSTED_INPUT_DRIFT",
      "Generated workspace changed dependency or verification controls",
      { paths: mismatches },
    );
  }
}

async function digestPath(path, root) {
  const metadata = await lstat(path).catch((error) =>
    error?.code === "ENOENT" ? null : Promise.reject(error),
  );
  if (!metadata) return "missing";
  if (metadata.isSymbolicLink() || (!metadata.isDirectory() && !metadata.isFile())) {
    return "invalid";
  }
  const hash = createHash("sha256");
  if (metadata.isFile()) {
    hash.update(relative(root, path));
    hash.update(await readFile(path));
    return hash.digest("hex");
  }
  for (const entry of await listTree(path)) {
    hash.update(entry.relativePath);
    hash.update(entry.digest);
  }
  return hash.digest("hex");
}

async function listTree(root) {
  const result = [];
  async function walk(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = join(directory, entry.name);
      const relativePath = relative(root, path).split(sep).join("/");
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink() || (!metadata.isDirectory() && !metadata.isFile())) {
        result.push({ relativePath, digest: "invalid" });
      } else if (metadata.isDirectory()) await walk(path);
      else {
        result.push({
          relativePath,
          digest: createHash("sha256")
            .update(await readFile(path))
            .digest("hex"),
        });
      }
    }
  }
  await walk(root);
  return result;
}

async function copyDirectory(sourceRoot, destinationRoot, relativeDirectory, policy, summary) {
  const source = join(sourceRoot, relativeDirectory);
  for (const entry of (await readdir(source, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const relativePath = join(relativeDirectory, entry.name);
    const normalized = relativePath.split(sep).join("/");
    if (entry.isDirectory() && policy.ignoredDirectories.includes(entry.name)) {
      summary.ignored += 1;
      continue;
    }
    if (policy.ignoredFiles.includes(entry.name)) {
      summary.ignored += 1;
      continue;
    }
    if (FORBIDDEN_PATH.test(normalized) && normalized !== ".env.example") {
      throw new QuarantineError("SENSITIVE_PATH", `Sensitive path rejected: ${normalized}`);
    }
    const sourcePath = join(sourceRoot, relativePath);
    const metadata = await lstat(sourcePath);
    if (metadata.isSymbolicLink()) {
      throw new QuarantineError("SYMLINK_REJECTED", `Symbolic link rejected: ${normalized}`);
    }
    if (metadata.isDirectory()) {
      await mkdir(join(destinationRoot, relativePath), { recursive: true, mode: 0o700 });
      await copyDirectory(sourceRoot, destinationRoot, relativePath, policy, summary);
      continue;
    }
    if (!metadata.isFile()) {
      throw new QuarantineError("SPECIAL_FILE_REJECTED", `Special file rejected: ${normalized}`);
    }
    summary.files += 1;
    summary.bytes += metadata.size;
    if (summary.files > policy.limits.maxFiles) {
      throw new QuarantineError("FILE_LIMIT", "Generated workspace exceeded the file-count limit");
    }
    if (metadata.size > policy.limits.maxFileBytes || summary.bytes > policy.limits.maxTotalBytes) {
      throw new QuarantineError(
        "SIZE_LIMIT",
        `Generated workspace exceeded a size limit at ${normalized}`,
      );
    }
    const content = await readFile(sourcePath);
    if (content.includes(0) === false) {
      const text = content.toString("utf8");
      if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) {
        throw new QuarantineError(
          "SECRET_MATERIAL",
          `Possible secret material rejected: ${normalized}`,
        );
      }
    }
    const destinationPath = join(destinationRoot, relativePath);
    await mkdir(dirname(destinationPath), { recursive: true, mode: 0o700 });
    await writeFile(destinationPath, content, { mode: 0o600 });
  }
}

async function createBuildContext(foundation, destination) {
  await mkdir(destination, { recursive: true, mode: 0o700 });
  for (const name of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc"]) {
    await copyFile(join(foundation, name), join(destination, name));
  }
  await copyFile(
    join(toolRoot, "scripts", "security", "quarantine.Dockerfile"),
    join(destination, "Dockerfile"),
  );
  await copyFile(
    join(toolRoot, "scripts", "security", "quarantine-entrypoint.sh"),
    join(destination, "quarantine-entrypoint.sh"),
  );
}

async function ensureDependencyImage({ runtime, buildContext, foundation, policy }) {
  const identity = createHash("sha256")
    .update(policy.baseImage)
    .update(policy.packageManager)
    .update(await readFile(join(foundation, "pnpm-lock.yaml")))
    .update(await readFile(join(toolRoot, "scripts", "security", "quarantine.Dockerfile")))
    .update(await readFile(join(toolRoot, "scripts", "security", "quarantine-entrypoint.sh")))
    .digest("hex")
    .slice(0, 20);
  const image = `agentic-shopify-quarantine:${identity}`;
  const exists = await exec(runtime, ["image", "inspect", image], 30_000).then(
    () => true,
    () => false,
  );
  if (!exists) {
    await exec(
      runtime,
      [
        "build",
        "--pull",
        "--build-arg",
        `BASE_IMAGE=${policy.baseImage}`,
        "--build-arg",
        `PACKAGE_MANAGER=${policy.packageManager}`,
        "--tag",
        image,
        buildContext,
      ],
      policy.limits.timeoutMs,
    );
  }
  return image;
}

async function executeQuarantine({ runtime, image, staged, policy }) {
  const started = Date.now();
  await exec(
    runtime,
    [
      "run",
      "--rm",
      "--name",
      `shopify-quarantine-${randomUUID().slice(0, 8)}`,
      "--network",
      "none",
      "--read-only",
      "--ipc",
      "none",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--pids-limit",
      String(policy.limits.pids),
      "--memory",
      policy.limits.memory,
      "--cpus",
      policy.limits.cpus,
      "--ulimit",
      "nofile=1024:1024",
      "--ulimit",
      "core=0:0",
      "--user",
      "65532:65532",
      "--env",
      "CI=1",
      "--env",
      "HOME=/tmp/home",
      "--env",
      "XDG_CACHE_HOME=/tmp/cache",
      "--env",
      "NEXT_TELEMETRY_DISABLED=1",
      "--mount",
      `type=bind,source=${staged},target=/input,readonly`,
      "--tmpfs",
      `/work:rw,exec,nosuid,nodev,size=${policy.limits.workTmpfs},uid=65532,gid=65532,mode=0700`,
      "--tmpfs",
      "/tmp:rw,exec,nosuid,nodev,size=512m,uid=65532,gid=65532,mode=0700",
      image,
    ],
    policy.limits.timeoutMs,
  );
  return { durationMs: Date.now() - started };
}

async function selectRuntime(requested) {
  if (requested && !["docker", "podman"].includes(requested)) {
    throw new QuarantineError("INVALID_RUNTIME", "--runtime must be docker or podman");
  }
  for (const runtime of requested ? [requested] : ["docker", "podman"]) {
    if (
      await exec(runtime, ["version"], 30_000).then(
        () => true,
        () => false,
      )
    )
      return runtime;
  }
  throw new QuarantineError(
    "CONTAINER_RUNTIME_REQUIRED",
    "Install and start Docker or Podman; generated code is never executed without OS isolation",
  );
}

async function exec(command, args, timeout) {
  try {
    return await execFileAsync(command, args, {
      encoding: "utf8",
      timeout,
      maxBuffer: 50 * 1024 * 1024,
      env: minimalHostEnvironment(),
    });
  } catch (error) {
    const output = sanitize(`${error?.stdout ?? ""}${error?.stderr ?? ""}`).slice(-20_000);
    throw new QuarantineError("RUNTIME_FAILED", `${basename(command)} command failed`, {
      exitCode: typeof error?.code === "number" ? error.code : null,
      output,
    });
  }
}

function minimalHostEnvironment() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      ["PATH", "HOME", "DOCKER_HOST", "DOCKER_CONTEXT", "CONTAINER_HOST"].includes(key),
    ),
  );
}

async function requireDirectory(path, label) {
  const metadata = await stat(path).catch(() => null);
  if (!metadata?.isDirectory()) {
    throw new QuarantineError("DIRECTORY_REQUIRED", `${label} must be an existing directory`);
  }
}

function validatePolicy(policy) {
  if (
    policy.schemaVersion !== 1 ||
    !/^node:24-[\w.-]+@sha256:[a-f0-9]{64}$/.test(policy.baseImage) ||
    policy.packageManager !== "pnpm@11.5.0" ||
    JSON.stringify(policy.runtimeTools) !== JSON.stringify(["git"]) ||
    !Array.isArray(policy.immutablePaths) ||
    JSON.stringify(policy.commands) !==
      JSON.stringify([
        "trusted dependency layer from immutable manifests",
        "trusted quality gate without package-manager script dispatch",
        "neutral production build and bundle budgets",
      ])
  ) {
    throw new QuarantineError("INVALID_POLICY", "Quarantine policy is invalid or unpinned");
  }
}

function requiredString(options, key) {
  const value = options[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new QuarantineError("MISSING_ARGUMENT", `Missing --${key}`);
  }
  return value.trim();
}

function sanitize(value) {
  return value
    .replace(/\b(?:shpat|shpca|shpss|shppa)_[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+\b/gi, "Bearer [REDACTED]")
    .replace(/\b(token|secret|password|api[_-]?key)\s*([=:])\s*\S+/gi, "$1$2[REDACTED]");
}

function formatFailure(error) {
  return {
    ok: false,
    error: {
      code: error instanceof QuarantineError ? error.code : "QUARANTINE_FAILED",
      message: sanitize(String(error?.message ?? error)).slice(0, 500),
      details: error instanceof QuarantineError ? error.details : undefined,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseQuarantineArguments(process.argv.slice(2));
  run(options)
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      const failure = formatFailure(error);
      process.stderr.write(`${JSON.stringify(failure, null, 2)}\n`);
      process.exitCode = 1;
    });
}
