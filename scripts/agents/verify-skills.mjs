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

for (const source of manifest.packages ?? []) {
  if (source.package !== "@shopify/hydrogen") fail(`untrusted package: ${source.package}`);
  if (source.version !== "0.0.0-preview-8a708a8-20260708155454") {
    fail(`Hydrogen version drifted: ${source.version}`);
  }
  if (source.license !== "MIT") fail(`missing MIT license for ${source.package}`);

  const provenancePath = resolve(root, source.provenance ?? "");
  if (!provenancePath.startsWith(`${resolve(root, "docs/provenance")}/`)) {
    fail(`package provenance escaped root: ${source.package}`);
  }
  const provenance = JSON.parse(
    await readFile(provenancePath, "utf8").catch(() => fail(`missing ${source.provenance}`)),
  );
  if (provenance.package !== source.package || provenance.version !== source.version) {
    fail(`provenance mismatch: ${source.package}`);
  }
  if (new Date(`${provenance.expires}T23:59:59Z`).getTime() < Date.now()) {
    fail(`preview exception expired: ${source.package}`);
  }

  const installedPackage = JSON.parse(
    await readFile(resolve(root, "node_modules/@shopify/hydrogen/package.json"), "utf8").catch(() =>
      fail("Hydrogen package is not installed"),
    ),
  );
  if (installedPackage.version !== source.version || installedPackage.license !== "MIT") {
    fail("installed Hydrogen package does not match provenance");
  }
  for (const lifecycle of ["preinstall", "install", "postinstall"]) {
    if (installedPackage.scripts?.[lifecycle]) fail(`Hydrogen added ${lifecycle}`);
  }

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
console.log(`Verified ${count} files across pinned repository and package skills.`);
