import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

const MATRIX_PATH = "agent-workflows/qualification-matrix.json";
const MAX_FILES = 20;
const MAX_BYTES = 5 * 1024 * 1024;

export async function captureQualificationIdentity(cwd) {
  const root = await realpath(resolve(cwd));
  const matrix = await readJsonOptional(resolve(root, MATRIX_PATH));
  if (!matrix) return identity([], [MATRIX_PATH]);

  const declaredPaths = new Set([
    MATRIX_PATH,
    ...Object.values(matrix.bindings ?? {}).map((binding) => binding?.path),
    ...(matrix.hosts ?? []).map((host) => host?.adapter),
  ]);
  declaredPaths.delete(null);
  declaredPaths.delete(undefined);
  if (declaredPaths.size > MAX_FILES) {
    throw new Error(`Agent qualification identity exceeds the ${MAX_FILES} file limit`);
  }

  const files = [];
  const missing = [];
  let bytes = 0;
  for (const path of [...declaredPaths].sort()) {
    if (!safeRelativePath(path)) {
      throw new Error(`Agent qualification contract contains an unsafe path: ${String(path)}`);
    }
    const absolute = resolve(root, path);
    const info = await lstat(absolute).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (!info) {
      missing.push(path);
      continue;
    }
    if (info.isSymbolicLink() || !info.isFile() || (await realpath(absolute)) !== absolute) {
      throw new Error(`Agent qualification contract must be a regular in-repository file: ${path}`);
    }
    bytes += info.size;
    if (bytes > MAX_BYTES) {
      throw new Error(`Agent qualification identity exceeds the ${MAX_BYTES} byte limit`);
    }
    files.push({
      path,
      bytes: info.size,
      sha256: createHash("sha256")
        .update(await readFile(absolute))
        .digest("hex"),
    });
  }
  return identity(files, missing);
}

export function compareQualificationIdentity(previous, current) {
  if (!previous) {
    return {
      status: "not-recorded",
      changedPaths: [],
      invalidates: ["review"],
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
  const before = new Map((previous.files ?? []).map((file) => [file.path, file.sha256]));
  const after = new Map((current.files ?? []).map((file) => [file.path, file.sha256]));
  const changedPaths = [...new Set([...before.keys(), ...after.keys()])]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
  return {
    status: "changed",
    changedPaths,
    missing: current.missing,
    invalidates: ["review"],
    previousSha256: previous.sha256,
    currentSha256: current.sha256,
  };
}

function identity(files, missing) {
  const canonical = { files, missing: [...new Set(missing)].sort() };
  return {
    schemaVersion: 1,
    status: canonical.missing.length ? "incomplete" : "current",
    sha256: createHash("sha256").update(JSON.stringify(canonical)).digest("hex"),
    files,
    missing: canonical.missing,
  };
}

function safeRelativePath(path) {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    path.length <= 300 &&
    !path.includes("\\") &&
    !path.startsWith("/") &&
    path !== ".." &&
    !path.startsWith(`..${sep}`) &&
    !path.split("/").includes("..")
  );
}

async function readJsonOptional(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}
