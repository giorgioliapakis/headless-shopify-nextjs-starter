import { createHash } from "node:crypto";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { basename, extname, relative, resolve, sep } from "node:path";

const DEFAULT_MAX_FILES = 5_000;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;
const SKIPPED_DIRECTORIES = new Set([".git", ".migration", "node_modules"]);

export async function inspectThemeSource(input, options = {}) {
  const source = resolve(input);
  const sourceStat = await lstat(source).catch((error) => {
    if (error?.code === "ENOENT") throw new Error(`Theme source does not exist: ${source}`);
    throw error;
  });
  if (sourceStat.isSymbolicLink()) throw new Error("Theme source may not be a symbolic link");

  if (sourceStat.isFile()) {
    const extension = extname(source).toLowerCase();
    if (extension !== ".zip") throw new Error("Theme archive must be a .zip file");
    assertWithinLimit(sourceStat.size, options.maxBytes ?? DEFAULT_MAX_BYTES, "Theme archive");
    return {
      kind: "zip",
      source,
      name: basename(source),
      bytes: sourceStat.size,
      sha256: await hashFile(source),
      inspection: "metadata-only",
      requiresArchiveInspection: true,
    };
  }
  if (!sourceStat.isDirectory()) throw new Error("Theme source must be a directory or .zip file");

  const root = await realpath(source);
  const files = [];
  let totalBytes = 0;
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.includes("\0")) throw new Error("Theme source contains an invalid path");
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const absolute = resolve(directory, entry.name);
      const info = await lstat(absolute);
      if (info.isSymbolicLink())
        throw new Error(`Theme source contains a symbolic link: ${safeRelative(root, absolute)}`);
      if (info.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (!info.isFile())
        throw new Error(
          `Theme source contains an unsupported entry: ${safeRelative(root, absolute)}`,
        );
      totalBytes += info.size;
      assertWithinLimit(totalBytes, maxBytes, "Theme source");
      files.push({
        path: safeRelative(root, absolute),
        bytes: info.size,
        sha256: await hashFile(absolute),
      });
      if (files.length > maxFiles)
        throw new Error(`Theme source exceeds the ${maxFiles} file limit`);
    }
  }

  await visit(root);
  files.sort((left, right) => left.path.localeCompare(right.path));
  const manifestSha256 = createHash("sha256").update(JSON.stringify(files)).digest("hex");
  return {
    kind: "directory",
    source: root,
    name: basename(root),
    fileCount: files.length,
    bytes: totalBytes,
    manifestSha256,
    files,
    inspection: "read-only-hash-inventory",
    requiresArchiveInspection: false,
  };
}

async function hashFile(path) {
  const handle = await open(path, "r");
  const hash = createHash("sha256");
  try {
    for await (const chunk of handle.createReadStream()) hash.update(chunk);
  } finally {
    await handle.close();
  }
  return hash.digest("hex");
}

function safeRelative(root, path) {
  const result = relative(root, path);
  if (
    !result ||
    result === ".." ||
    result.startsWith(`..${sep}`) ||
    resolve(root, result) !== resolve(path)
  ) {
    throw new Error("Theme source escaped its approved directory");
  }
  return result.split(sep).join("/");
}

function assertWithinLimit(value, limit, label) {
  if (value > limit) throw new Error(`${label} exceeds the ${limit} byte limit`);
}
