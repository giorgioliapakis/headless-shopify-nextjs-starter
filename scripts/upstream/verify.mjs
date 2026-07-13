#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const EXPECTED_REPOSITORY = "https://github.com/vercel/shop.git";
const EXPECTED_COMMIT = "04a29f8276598e58ec28e74218f38601f6203470";
const root = resolve(process.cwd());
const manifestPath = resolve(root, "docs/provenance/vercel-shop.json");
const prohibitedPrefixes = [
  "app/account/",
  "app/api/chat/",
  "components/account/",
  "components/agent/",
  "lib/agent/",
  "lib/auth/",
  "lib/customer/",
];
const prohibitedFiles = new Set([
  "app/favicon.ico",
  "components/action-bar/index.tsx",
  "components/nav/account.tsx",
  "lib/shopify/customer-account.ts",
  "lib/shopify/operations/customer.ts",
  "lib/shopify/transforms/customer.ts",
  "public/og-default.png",
]);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function fail(message) {
  console.error(`Upstream verification failed: ${message}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  fail(`missing or invalid ${manifestPath}`);
}

if (manifest.repository !== EXPECTED_REPOSITORY) fail("unexpected upstream repository");
if (manifest.commit !== EXPECTED_COMMIT) fail("unexpected or mutable upstream revision");
if (manifest.sourceSubtree !== "apps/template") fail("unexpected upstream source subtree");
if (manifest.license !== "MIT") fail("upstream license is not recorded as MIT");
if (!Array.isArray(manifest.files) || manifest.files.length === 0) fail("manifest has no files");

const paths = manifest.files.map(({ path }) => path);
if (new Set(paths).size !== paths.length) fail("manifest contains duplicate paths");
if (paths.some((path) => prohibitedFiles.has(path))) fail("manifest contains a prohibited file");
if (paths.some((path) => prohibitedPrefixes.some((prefix) => path.startsWith(prefix)))) {
  fail("manifest contains a prohibited surface");
}

for (const entry of manifest.files) {
  if (!entry.path || !/^[a-f0-9]{64}$/.test(entry.sourceSha256)) {
    fail(`invalid provenance entry for ${entry.path || "unknown path"}`);
  }
  if (entry.currentSha256 && !/^[a-f0-9]{64}$/.test(entry.currentSha256)) {
    fail(`invalid current checksum for ${entry.path}`);
  }
  if (entry.currentSha256 && !entry.modification) {
    fail(`modified file has no rationale: ${entry.path}`);
  }

  const absolutePath = resolve(root, entry.path);
  if (!absolutePath.startsWith(`${root}/`)) fail(`path escapes repository: ${entry.path}`);

  let metadata;
  try {
    metadata = await stat(absolutePath);
  } catch {
    fail(`missing imported file: ${entry.path}`);
  }

  if (!metadata.isFile()) fail(`imported path is not a regular file: ${entry.path}`);
  const actual = sha256(await readFile(absolutePath));
  const expected = entry.currentSha256 ?? entry.sourceSha256;
  if (actual !== expected) fail(`checksum mismatch: ${entry.path}`);
}

await readFile(resolve(root, "UPSTREAM.md"), "utf8").catch(() => fail("missing UPSTREAM.md"));
console.log(`Verified ${manifest.files.length} files from vercel/shop@${EXPECTED_COMMIT}.`);
