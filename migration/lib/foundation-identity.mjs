import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const CONTRACT_PATHS = [
  "package.json",
  "pnpm-lock.yaml",
  "next.config.ts",
  "playwright.config.ts",
  "vitest.config.ts",
  "agent-workflows",
  "migration",
  "config/schema",
  "config/performance-budgets.json",
  "config/security",
  "config/foundation-update.json",
  "docs/provenance/hydrogen-sdk.json",
  "lib/commerce",
  "lib/security",
  "lib/shopify",
  "components/sections",
  "components/ui",
];
const MAX_FILES = 2_000;
const MAX_BYTES = 25 * 1024 * 1024;

export async function captureFoundationIdentity(cwd) {
  const root = resolve(cwd);
  const files = [];
  const missing = [];
  let totalBytes = 0;

  async function visit(path, requiredPath) {
    const info = await lstat(path).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (!info) {
      missing.push(requiredPath);
      return;
    }
    if (info.isSymbolicLink())
      throw new Error(`Foundation contract contains a symlink: ${requiredPath}`);
    if (info.isDirectory()) {
      for (const entry of (await readdir(path)).sort()) {
        await visit(join(path, entry), requiredPath);
      }
      return;
    }
    if (!info.isFile())
      throw new Error(`Foundation contract contains a special file: ${requiredPath}`);
    totalBytes += info.size;
    if (files.length + 1 > MAX_FILES) throw new Error("Foundation identity exceeds its file limit");
    if (totalBytes > MAX_BYTES) throw new Error("Foundation identity exceeds its byte limit");
    const content = await readFile(path);
    files.push({
      path: safeRelative(root, path),
      bytes: info.size,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }

  for (const path of CONTRACT_PATHS) await visit(join(root, path), path);
  files.sort((left, right) => left.path.localeCompare(right.path));
  const canonical = { files, missing: [...new Set(missing)].sort() };
  return {
    schemaVersion: 1,
    status: canonical.missing.length ? "incomplete" : "current",
    sha256: createHash("sha256").update(JSON.stringify(canonical)).digest("hex"),
    fileCount: files.length,
    bytes: totalBytes,
    files,
    missing: canonical.missing,
  };
}

export function compareFoundationIdentity(previous, current) {
  if (!previous) {
    return {
      status: "not-recorded",
      changedPaths: [],
      invalidates: ["reconstruction", "verification", "review"],
      previousSha256: null,
      currentSha256: current.sha256,
    };
  }
  if (previous.sha256 === current.sha256) {
    return {
      status: current.status,
      changedPaths: [],
      invalidates: [],
      previousSha256: previous.sha256,
      currentSha256: current.sha256,
    };
  }
  const previousFiles = new Map((previous.files ?? []).map((file) => [file.path, file.sha256]));
  const currentFiles = new Map((current.files ?? []).map((file) => [file.path, file.sha256]));
  const changedPaths = [...new Set([...previousFiles.keys(), ...currentFiles.keys()])]
    .filter((path) => previousFiles.get(path) !== currentFiles.get(path))
    .sort();
  return {
    status: "changed",
    changedPaths,
    missing: current.missing,
    invalidates: ["reconstruction", "verification", "review"],
    previousSha256: previous.sha256,
    currentSha256: current.sha256,
  };
}

function safeRelative(root, path) {
  const value = relative(root, path);
  if (!value || value === ".." || value.startsWith(`..${sep}`)) {
    throw new Error("Foundation contract path escaped the repository");
  }
  return value.split(sep).join("/");
}
