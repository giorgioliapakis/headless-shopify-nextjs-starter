#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";

const REPOSITORY = "https://github.com/vercel/shop.git";
const COMMIT = "04a29f8276598e58ec28e74218f38601f6203470";
const SOURCE_SUBTREE = "apps/template";
const root = resolve(process.cwd());

const allowedRootFiles = new Set([
  ".env.example",
  ".graphqlrc.ts",
  ".npmrc",
  ".nvmrc",
  ".oxfmtrc.json",
  ".oxlintrc.json",
  "components.json",
  "global.ts",
  "next.config.ts",
  "package.json",
  "postcss.config.mjs",
  "tsconfig.json",
]);
const allowedDirectories = ["app/", "components/", "hooks/", "lib/"];
const excludedPrefixes = [
  "app/account/",
  "app/api/chat/",
  "components/account/",
  "components/agent/",
  "lib/agent/",
  "lib/auth/",
  "lib/customer/",
];
const excludedFiles = new Set([
  "app/favicon.ico",
  "app/layout.tsx",
  "components/action-bar/index.tsx",
  "components/footer/index.tsx",
  "components/nav/account.tsx",
  "components/nav/index.tsx",
  "lib/shopify/customer-account.ts",
  "lib/shopify/operations/customer.ts",
  "lib/shopify/transforms/customer.ts",
  "public/og-default.png",
  "shop.config.ts",
]);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function isAllowed(path) {
  if (excludedFiles.has(path)) return false;
  if (excludedPrefixes.some((prefix) => path.startsWith(prefix))) return false;
  return allowedRootFiles.has(path) || allowedDirectories.some((prefix) => path.startsWith(prefix));
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolutePath)));
    else if (entry.isFile()) files.push(absolutePath);
    else throw new Error(`Refusing non-regular upstream path: ${absolutePath}`);
  }
  return files;
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), "agentic-shopify-upstream-"));

try {
  run("git", ["init", "--quiet"], temporaryDirectory);
  run("git", ["remote", "add", "origin", REPOSITORY], temporaryDirectory);
  run("git", ["fetch", "--quiet", "--depth", "1", "origin", COMMIT], temporaryDirectory);
  const fetchedCommit = run("git", ["rev-parse", "FETCH_HEAD"], temporaryDirectory);
  if (fetchedCommit !== COMMIT) throw new Error(`Expected ${COMMIT}, fetched ${fetchedCommit}`);
  run("git", ["checkout", "--quiet", "--detach", COMMIT], temporaryDirectory);

  const sourceRoot = join(temporaryDirectory, SOURCE_SUBTREE);
  const license = await readFile(join(sourceRoot, "LICENSE"), "utf8");
  if (!license.startsWith("MIT License")) throw new Error("Upstream template license is not MIT");

  const manifestFiles = [];
  const sourceFiles = await listFiles(sourceRoot);
  for (const sourceFile of sourceFiles) {
    const path = relative(sourceRoot, sourceFile).split(sep).join("/");
    if (!isAllowed(path)) continue;

    const destination = resolve(root, path);
    if (!destination.startsWith(`${root}/`))
      throw new Error(`Import path escapes repository: ${path}`);
    const content = await readFile(sourceFile);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(sourceFile, destination);
    manifestFiles.push({ path, sourceSha256: sha256(content) });
  }

  manifestFiles.sort((left, right) => left.path.localeCompare(right.path));
  const manifest = {
    schemaVersion: 1,
    repository: REPOSITORY,
    commit: COMMIT,
    sourceSubtree: SOURCE_SUBTREE,
    license: "MIT",
    importPolicy: "explicit-root-files-and-directories-with-denylist",
    excludedPrefixes,
    excludedFiles: [...excludedFiles].sort(),
    files: manifestFiles,
  };

  const manifestPath = resolve(root, "docs/provenance/vercel-shop.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Imported ${manifestFiles.length} files from vercel/shop@${COMMIT}.`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
