import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

import yauzl from "yauzl";

const DEFAULT_MAX_FILES = 5_000;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;
const MAX_GIT_INDEX_BYTES = 20 * 1024 * 1024;
const MAX_GIT_OBJECT_BYTES = 250 * 1024 * 1024;
const MAX_GIT_OBJECT_FILES = 20_000;
const SKIPPED_DIRECTORIES = new Set([".git", ".migration", "node_modules"]);
const execFileAsync = promisify(execFile);

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
    return inspectThemeArchive(source, sourceStat.size, options);
  }
  if (!sourceStat.isDirectory()) throw new Error("Theme source must be a directory or .zip file");

  const root = await realpath(source);
  const files = [];
  let totalBytes = 0;
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (
        [...entry.name].some((character) => {
          const code = character.codePointAt(0) ?? 0;
          return code <= 31 || code === 127;
        })
      )
        throw new Error("Theme source contains an invalid path");
      const absolute = resolve(directory, entry.name);
      if (entry.name === ".git") {
        if (directory !== root)
          throw new Error(
            `Theme source contains a nested Git repository: ${safeRelative(root, absolute)}`,
          );
        continue;
      }
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
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
      const file = {
        path: safeRelative(root, absolute),
        bytes: info.size,
        sha256: await hashFile(absolute),
      };
      if (file.path.endsWith(".json") && info.size <= 1_048_576) {
        file.structure = await inspectJsonStructure(absolute, file.path);
      }
      files.push(file);
      if (files.length > maxFiles)
        throw new Error(`Theme source exceeds the ${maxFiles} file limit`);
    }
  }

  await visit(root);
  files.sort((left, right) => left.path.localeCompare(right.path));
  const manifestSha256 = createHash("sha256").update(JSON.stringify(files)).digest("hex");
  const provenance = await inspectGitProvenance(root, files, manifestSha256);
  return {
    schemaVersion: 1,
    kind: "directory",
    source: root,
    name: basename(root),
    fileCount: files.length,
    bytes: totalBytes,
    manifestSha256,
    files,
    provenance,
    inspection: "read-only-hash-inventory",
    requiresArchiveInspection: false,
  };
}

async function inspectJsonStructure(path, sourcePath) {
  try {
    return inspectJsonValue(await readFile(path, "utf8"), sourcePath);
  } catch {
    return { parseStatus: "invalid-json", sectionTypes: [], appBlockTypes: [] };
  }
}

function inspectJsonValue(input, sourcePath = "") {
  try {
    const value = JSON.parse(input);
    const sectionTypes = new Set();
    const appBlockTypes = new Set();
    let nodes = 0;
    const queue = [value];
    while (queue.length) {
      const current = queue.shift();
      nodes += 1;
      if (nodes > 10_000) {
        return { parseStatus: "bounded", sectionTypes: [], appBlockTypes: [] };
      }
      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }
      if (!current || typeof current !== "object") continue;
      for (const [key, nested] of Object.entries(current)) {
        if (key === "type" && typeof nested === "string") {
          const bounded = nested.slice(0, 300);
          if (bounded.startsWith("shopify://apps/")) appBlockTypes.add(bounded);
          else if (/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(bounded)) sectionTypes.add(bounded);
        }
        if (nested && typeof nested === "object") queue.push(nested);
      }
    }
    const observations = /^config\/(?:settings_data|settings_schema)\.json$/i.test(sourcePath)
      ? inspectThemeObservations(value)
      : null;
    return {
      parseStatus: "parsed-data-only",
      sectionTypes: [...sectionTypes].sort().slice(0, 200),
      appBlockTypes: [...appBlockTypes].sort().slice(0, 200),
      ...(observations ? { observations } : {}),
    };
  } catch {
    return { parseStatus: "invalid-json", sectionTypes: [], appBlockTypes: [] };
  }
}

async function inspectThemeArchive(source, archiveBytes, options) {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const zipfile = await yauzl.openPromise(source, {
    autoClose: true,
    decodeStrings: true,
    strictFileNames: true,
    validateEntrySizes: true,
  });
  if (zipfile.entryCount > maxFiles) {
    zipfile.close();
    throw new Error(`Theme archive exceeds the ${maxFiles} file limit`);
  }
  const files = [];
  let totalBytes = 0;
  try {
    for await (const entry of zipfile.eachEntry()) {
      if (entry.fileName.endsWith("/")) continue;
      if (entry.isEncrypted())
        throw new Error(`Theme archive contains an encrypted entry: ${entry.fileName}`);
      if (isSymbolicLinkEntry(entry))
        throw new Error(`Theme archive contains a symbolic link: ${entry.fileName}`);
      if (!isRegularFileEntry(entry))
        throw new Error(`Theme archive contains an unsupported entry: ${entry.fileName}`);
      totalBytes += entry.uncompressedSize;
      assertWithinLimit(totalBytes, maxBytes, "Theme archive contents");
      const readStream = await zipfile.openReadStreamPromise(entry);
      const hash = createHash("sha256");
      const collectJson = entry.fileName.endsWith(".json") && entry.uncompressedSize <= 1_048_576;
      const chunks = [];
      let observedBytes = 0;
      for await (const chunk of readStream) {
        observedBytes += chunk.length;
        if (observedBytes > entry.uncompressedSize || observedBytes > maxBytes) {
          throw new Error(`Theme archive entry exceeded its declared size: ${entry.fileName}`);
        }
        hash.update(chunk);
        if (collectJson) chunks.push(chunk);
      }
      if (observedBytes !== entry.uncompressedSize) {
        throw new Error(`Theme archive entry size mismatch: ${entry.fileName}`);
      }
      files.push({
        path: entry.fileName,
        bytes: observedBytes,
        sha256: hash.digest("hex"),
        ...(collectJson
          ? {
              structure: inspectJsonValue(Buffer.concat(chunks).toString("utf8"), entry.fileName),
            }
          : {}),
      });
      if (files.length > maxFiles)
        throw new Error(`Theme archive exceeds the ${maxFiles} file limit`);
    }
  } finally {
    if (zipfile.isOpen) zipfile.close();
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  const sourceSha256 = await hashFile(source);
  return {
    schemaVersion: 1,
    kind: "zip",
    source,
    name: basename(source),
    archiveBytes,
    bytes: totalBytes,
    fileCount: files.length,
    sha256: sourceSha256,
    manifestSha256: createHash("sha256").update(JSON.stringify(files)).digest("hex"),
    files,
    provenance: {
      kind: "merchant-supplied-archive",
      sourceIdentity: sourceSha256,
      immutableSourceMatch: "archive-sha256-and-entry-manifest",
      execution: "none",
    },
    inspection: "read-only-lazy-entry-inventory",
    requiresArchiveInspection: false,
  };
}

async function inspectGitProvenance(root, files, manifestSha256) {
  const gitDirectory = join(root, ".git");
  const gitStat = await lstat(gitDirectory).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!gitStat) {
    return {
      kind: "merchant-supplied-directory",
      sourceIdentity: manifestSha256,
      immutableSourceMatch: "file-manifest-only-no-vcs-commit",
      execution: "none",
    };
  }
  if (gitStat.isSymbolicLink() || !gitStat.isDirectory()) {
    throw new Error(
      "Theme Git metadata must be a local .git directory, not a link or indirection file",
    );
  }

  await rejectExecutableGitAttributes(root, files);
  await rejectGitBoundaryEntries(root, gitDirectory);
  const commit = await resolveHeadCommit(gitDirectory);
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error("Theme Git source must use a supported SHA-1 object-format repository");
  }

  const stagedGitDirectory = await mkdtemp(join(tmpdir(), "theme-git-metadata-"));
  try {
    await mkdir(join(stagedGitDirectory, "objects"));
    await mkdir(join(stagedGitDirectory, "refs"));
    const indexPath = join(gitDirectory, "index");
    const indexStat = await lstat(indexPath).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (!indexStat?.isFile() || indexStat.isSymbolicLink()) {
      throw new Error("Theme Git source must have a regular index file");
    }
    assertWithinLimit(indexStat.size, MAX_GIT_INDEX_BYTES, "Theme Git index");
    await writeFile(join(stagedGitDirectory, "index"), await readFile(indexPath), { mode: 0o600 });
    await writeFile(join(stagedGitDirectory, "HEAD"), `${commit}\n`, { mode: 0o600 });
    await writeFile(
      join(stagedGitDirectory, "config"),
      "[core]\n\trepositoryformatversion = 0\n\tbare = false\n\tfilemode = false\n\thooksPath = /dev/null\n\tfsmonitor = false\n\tquotePath = false\n",
      { mode: 0o600 },
    );

    const gitPrefix = [
      "--no-optional-locks",
      `--git-dir=${stagedGitDirectory}`,
      `--work-tree=${root}`,
    ];
    const execution = {
      cwd: root,
      encoding: "utf8",
      timeout: 15_000,
      maxBuffer: 5 * 1024 * 1024,
      env: safeGitEnvironment(stagedGitDirectory, join(gitDirectory, "objects")),
    };
    const { stdout: stagedEntries } = await execFileAsync(
      "git",
      [...gitPrefix, "ls-files", "--stage"],
      execution,
    );
    if (stagedEntries.split("\n").some((line) => line.startsWith("160000 "))) {
      throw new Error("Theme Git source contains a submodule entry");
    }
    const { stdout } = await execFileAsync(
      "git",
      [...gitPrefix, "status", "--porcelain=v1", "--untracked-files=all", "--ignored=matching"],
      execution,
    );
    const changes = stdout
      .split("\n")
      .filter(Boolean)
      .filter((line) => !isSkippedGitStatusEntry(line));
    if (changes.length) {
      throw new Error(
        `Theme Git source must match HEAD exactly; observed ${changes.length} changed, untracked, or ignored entries`,
      );
    }

    return {
      kind: "local-git-worktree",
      commit,
      sourceIdentity: `${commit}:${manifestSha256}`,
      immutableSourceMatch: "clean-worktree-head-and-file-manifest",
      gitMetadata: "staged-minimal-read-only-object-access",
      hooks: "disabled",
      filters: "rejected",
      submodules: "rejected",
      credentialHelpers: "unavailable",
      network: "not-invoked",
      execution: "git-status-only-with-controlled-config",
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        "Git is required to prove a local theme repository matches its immutable commit",
        { cause: error },
      );
    }
    throw error;
  } finally {
    await rm(stagedGitDirectory, { recursive: true, force: true });
  }
}

async function rejectExecutableGitAttributes(root, files) {
  for (const file of files.filter((entry) => basename(entry.path) === ".gitattributes")) {
    const attributes = await readFile(join(root, file.path), "utf8");
    const rules = attributes
      .split("\n")
      .map((line) => line.replace(/#.*$/, "").trim())
      .filter(Boolean);
    if (
      rules.some((line) =>
        /(?:^|\s)(?:-|!|\w+=)?(?:filter|diff|merge)(?:=\S+)?(?:\s|$)/i.test(line),
      )
    ) {
      throw new Error(`Theme Git source contains executable attribute drivers: ${file.path}`);
    }
  }
}

async function rejectGitBoundaryEntries(root, gitDirectory) {
  for (const path of [
    join(root, ".gitmodules"),
    join(gitDirectory, "commondir"),
    join(gitDirectory, "objects", "info", "alternates"),
  ]) {
    const entry = await lstat(path).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (entry)
      throw new Error(`Theme Git source contains unsupported metadata: ${relative(root, path)}`);
  }
  const objects = await lstat(join(gitDirectory, "objects"));
  if (!objects.isDirectory() || objects.isSymbolicLink()) {
    throw new Error("Theme Git object database must be a local directory");
  }
  await assertBoundedGitObjects(join(gitDirectory, "objects"));
}

async function assertBoundedGitObjects(objectsDirectory) {
  let files = 0;
  let bytes = 0;
  const pending = [objectsDirectory];
  while (pending.length) {
    const directory = pending.pop();
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink())
        throw new Error("Theme Git object database contains a symbolic link");
      if (info.isDirectory()) {
        pending.push(path);
        continue;
      }
      if (!info.isFile()) throw new Error("Theme Git object database contains a special file");
      files += 1;
      bytes += info.size;
      if (files > MAX_GIT_OBJECT_FILES) {
        throw new Error(`Theme Git object database exceeds the ${MAX_GIT_OBJECT_FILES} file limit`);
      }
      assertWithinLimit(bytes, MAX_GIT_OBJECT_BYTES, "Theme Git object database");
    }
  }
}

async function resolveHeadCommit(gitDirectory) {
  const head = (await readFile(join(gitDirectory, "HEAD"), "utf8")).trim();
  if (/^[0-9a-f]{40,64}$/.test(head)) return head;
  const match = /^ref: (refs\/(?:heads|tags)\/[A-Za-z0-9._/-]+)$/.exec(head);
  if (!match || match[1].includes("..") || match[1].endsWith("/")) {
    throw new Error("Theme Git HEAD is malformed or points outside heads/tags");
  }
  const looseRef = await readFile(join(gitDirectory, ...match[1].split("/")), "utf8").catch(
    (error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    },
  );
  if (looseRef) return looseRef.trim();
  const packedRefs = await readFile(join(gitDirectory, "packed-refs"), "utf8").catch((error) => {
    if (error?.code === "ENOENT") return "";
    throw error;
  });
  const packed = packedRefs
    .split("\n")
    .find((line) => line.endsWith(` ${match[1]}`) && /^[0-9a-f]{40,64} /.test(line));
  if (!packed) throw new Error("Theme Git HEAD ref could not be resolved");
  return packed.split(" ", 1)[0];
}

function safeGitEnvironment(home, objectDirectory) {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: home,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/usr/bin/false",
    SSH_ASKPASS: "/usr/bin/false",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_OBJECT_DIRECTORY: objectDirectory,
    GIT_LFS_SKIP_SMUDGE: "1",
  };
}

function isSkippedGitStatusEntry(line) {
  const path = line.slice(3).replace(/^"|"$/g, "");
  return [...SKIPPED_DIRECTORIES].some(
    (directory) => path === directory || path.startsWith(`${directory}/`),
  );
}

function inspectThemeObservations(value) {
  const colors = new Set();
  const fonts = new Set();
  const logos = new Set();
  const layout = [];
  const queue = [{ value, path: [] }];
  let nodes = 0;
  while (queue.length && nodes < 10_000) {
    const current = queue.shift();
    nodes += 1;
    if (Array.isArray(current.value)) {
      current.value.forEach((nested, index) =>
        queue.push({ value: nested, path: [...current.path, String(index)] }),
      );
      continue;
    }
    if (!current.value || typeof current.value !== "object") continue;
    for (const [key, nested] of Object.entries(current.value)) {
      const path = [...current.path, key];
      const normalizedKey = key.toLowerCase();
      if (typeof nested === "string") {
        const normalizedValue = nested.trim();
        if (
          /(?:color|background|foreground|accent|border)/.test(normalizedKey) &&
          /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^)]{1,80}\))$/i.test(normalizedValue)
        ) {
          colors.add(normalizedValue.toLowerCase());
        }
        if (
          /(?:font|typeface|heading_family|body_family)/.test(normalizedKey) &&
          /^[\w .,'+-]{1,100}$/.test(normalizedValue)
        ) {
          fonts.add(normalizedValue);
        }
        if (
          /logo/.test(normalizedKey) &&
          /^(?:shopify:\/\/shop_images\/)?[\w .@()+-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(
            normalizedValue,
          )
        ) {
          logos.add(normalizedValue);
        }
      }
      if (
        /(?:radius|corner|page_width|spacing|gutter|grid)/.test(normalizedKey) &&
        (typeof nested === "number" ||
          (typeof nested === "string" && /^-?\d+(?:\.\d+)?(?:px|rem|em|%)?$/.test(nested))) &&
        layout.length < 100
      ) {
        layout.push({ key: path.join(".").slice(0, 200), value: nested });
      }
      if (nested && typeof nested === "object") queue.push({ value: nested, path });
    }
  }
  return {
    colors: [...colors].sort().slice(0, 100),
    fonts: [...fonts].sort().slice(0, 50),
    logos: [...logos].sort().slice(0, 50),
    layout,
    extraction: "bounded-selected-theme-settings-only",
  };
}

function unixMode(entry) {
  return entry.versionMadeBy >>> 8 === 3 ? (entry.externalFileAttributes >>> 16) & 0xffff : 0;
}

function isSymbolicLinkEntry(entry) {
  return (unixMode(entry) & 0o170000) === 0o120000;
}

function isRegularFileEntry(entry) {
  const mode = unixMode(entry);
  return mode === 0 || (mode & 0o170000) === 0o100000;
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
