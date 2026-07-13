#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const [path, modification] = process.argv.slice(2);
if (!path || !modification) {
  console.error("Usage: record-modification.mjs <imported-path> <rationale>");
  process.exit(1);
}

const root = resolve(process.cwd());
const manifestPath = resolve(root, "docs/provenance/vercel-shop.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const entry = manifest.files.find((candidate) => candidate.path === path);
if (!entry) {
  console.error(`Not an imported upstream file: ${path}`);
  process.exit(1);
}

const content = await readFile(resolve(root, path));
entry.currentSha256 = createHash("sha256").update(content).digest("hex");
entry.modification = modification;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Recorded adapted checksum for ${path}.`);
