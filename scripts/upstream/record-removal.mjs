#!/usr/bin/env node

import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const [path, modification] = process.argv.slice(2);
if (!path || !modification) {
  console.error("Usage: record-removal.mjs <imported-path> <rationale>");
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

await access(resolve(root, path))
  .then(() => {
    throw new Error(`Refusing to record a removal while ${path} still exists`);
  })
  .catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });

delete entry.currentSha256;
entry.removed = true;
entry.modification = modification;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Recorded intentional removal for ${path}.`);
