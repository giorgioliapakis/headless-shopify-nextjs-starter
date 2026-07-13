#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(process.cwd());
const manifest = JSON.parse(await readFile(resolve(root, "agent-workflows/skills.json"), "utf8"));
let count = 0;

function fail(message) {
  console.error(`Skill verification failed: ${message}`);
  process.exit(1);
}

if (manifest.schemaVersion !== 1) fail("unsupported manifest schema");
if (manifest.nextReference?.version !== "16.2.10") fail("Next.js reference version drifted");

for (const source of manifest.sources ?? []) {
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(source.repository)) {
    fail(`untrusted repository: ${source.repository}`);
  }
  if (!/^[a-f0-9]{40}$/.test(source.commit)) fail(`mutable commit for ${source.repository}`);
  if (!source.license) fail(`missing license for ${source.repository}`);

  for (const skill of source.skills ?? []) {
    for (const file of skill.files ?? []) {
      const path = resolve(root, ".agents/skills", skill.target, file.path);
      if (!path.startsWith(resolve(root, ".agents/skills") + "/")) fail("skill path escaped root");
      const metadata = await stat(path).catch(() => fail(`missing ${skill.target}/${file.path}`));
      if (!metadata.isFile()) fail(`non-file skill entry: ${skill.target}/${file.path}`);
      const actual = createHash("sha256")
        .update(await readFile(path))
        .digest("hex");
      if (actual !== file.sha256) fail(`checksum mismatch: ${skill.target}/${file.path}`);
      count += 1;
    }
  }
}

if (count === 0) fail("manifest contains no skill files");
console.log(`Verified ${count} files across the pinned repository skills.`);
