import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const WORKSPACE_SCHEMA_VERSION = 1;

export function migrationRoot(cwd = process.cwd()) {
  return resolve(cwd, ".migration");
}

export async function createRun({ cwd = process.cwd(), storeUrl, themeSource }) {
  const root = migrationRoot(cwd);
  await mkdir(join(root, "runs"), { recursive: true, mode: 0o700 });
  const runId = `${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
  const runDirectory = join(root, "runs", runId);
  await mkdir(runDirectory, { recursive: false, mode: 0o700 });
  const now = new Date().toISOString();
  const state = {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    runId,
    createdAt: now,
    updatedAt: now,
    storeUrl,
    themeSource,
    status: "active",
    phases: {
      preflight: { status: "pending", updatedAt: now },
      "public-snapshot": { status: "pending", updatedAt: now },
      reconstruction: { status: "pending", updatedAt: now },
      verification: { status: "pending", updatedAt: now },
      review: { status: "pending", updatedAt: now },
      launch: {
        status: "blocked",
        updatedAt: now,
        reason: "Human-gated and outside migration CLI authority",
      },
    },
    artifacts: [],
    nextActions: ["Complete credential-free doctor checks"],
  };
  await writeJsonAtomic(join(runDirectory, "state.json"), state);
  await writeTextAtomic(join(root, "current"), `${runId}\n`);
  await appendLedger(runDirectory, { event: "run.created", details: { storeUrl, themeSource } });
  return { runDirectory, state };
}

export async function currentRun(cwd = process.cwd()) {
  const root = migrationRoot(cwd);
  const runId = (await readFile(join(root, "current"), "utf8")).trim();
  if (!/^[\w-]{1,80}$/.test(runId)) throw new Error("Invalid current migration run pointer");
  const runDirectory = join(root, "runs", runId);
  const state = JSON.parse(await readFile(join(runDirectory, "state.json"), "utf8"));
  if (state.schemaVersion !== WORKSPACE_SCHEMA_VERSION || state.runId !== runId) {
    throw new Error("Unsupported or inconsistent migration state");
  }
  return { runDirectory, state };
}

export async function updateState(runDirectory, state, patch = {}) {
  const next = { ...state, ...patch, updatedAt: new Date().toISOString() };
  await writeJsonAtomic(join(runDirectory, "state.json"), next);
  return next;
}

export async function recordArtifact(runDirectory, state, { id, path, kind }) {
  const absolute = resolve(path);
  if (!absolute.startsWith(`${resolve(runDirectory)}/`)) {
    throw new Error("Migration artifact must stay inside its run directory");
  }
  const digest = await sha256File(absolute);
  const artifact = {
    id,
    kind,
    path: absolute.slice(resolve(runDirectory).length + 1),
    sha256: digest,
    recordedAt: new Date().toISOString(),
  };
  const artifacts = [...state.artifacts.filter((entry) => entry.id !== id), artifact];
  return updateState(runDirectory, state, { artifacts });
}

export async function appendLedger(runDirectory, entry) {
  const ledgerPath = join(runDirectory, "ledger.jsonl");
  const handle = await open(ledgerPath, "a", 0o600);
  try {
    await handle.write(`${JSON.stringify(redact({ at: new Date().toISOString(), ...entry }))}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function withWorkspaceLock(cwd, command, callback) {
  const root = migrationRoot(cwd);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const lockPath = join(root, ".lock");
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
    await handle.writeFile(
      JSON.stringify({ command, pid: process.pid, at: new Date().toISOString() }),
    );
  } catch (error) {
    if (error?.code === "EEXIST") {
      const age = await stat(lockPath)
        .then((value) => Date.now() - value.mtimeMs)
        .catch(() => 0);
      throw new Error(
        `Migration workspace is locked${age ? ` (${Math.round(age / 1000)}s old)` : ""}. Confirm no command is running before removing .migration/.lock.`,
        { cause: error },
      );
    }
    throw error;
  }
  try {
    return await callback();
  } finally {
    await handle?.close();
    await rm(lockPath, { force: true });
  }
}

export async function writeJsonAtomic(path, value) {
  await writeTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function writeTextAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

export async function sha256File(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        /token|secret|password|credential|authorization/i.test(key) ? "[REDACTED]" : redact(nested),
      ]),
    );
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/\b(?:shpat|shpca|shpss|shppa)_[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+\b/gi, "Bearer [REDACTED]");
}
