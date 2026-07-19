#!/usr/bin/env node
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const allowlist = JSON.parse(
  await readFile(join(root, "config", "supply-chain", "lifecycle-allowlist.json"), "utf8"),
);
if (allowlist.schemaVersion !== 1 || !Array.isArray(allowlist.packages)) fail("invalid allowlist");

const observed = await discoverLifecyclePackages(join(root, "node_modules", ".pnpm"));
const expected = new Map(
  allowlist.packages.map((entry) => [`${entry.name}@${entry.version}`, entry]),
);
for (const entry of observed) {
  const key = `${entry.name}@${entry.version}`;
  const allowed = expected.get(key);
  if (!allowed) fail(`unreviewed lifecycle package ${key}`);
  if (JSON.stringify(entry.scripts) !== JSON.stringify(allowed.scripts)) {
    fail(`lifecycle script drift for ${key}`);
  }
  if (!allowed.reason) fail(`missing rationale for ${key}`);
  expected.delete(key);
}
if (expected.size)
  fail(`allowlisted lifecycle package not installed: ${[...expected.keys()].join(", ")}`);

console.log(`Lifecycle audit passed: ${observed.length} exact package scripts allowlisted.`);

export async function discoverLifecyclePackages(storeRoot) {
  const results = new Map();
  for (const storeEntry of await readdir(storeRoot)) {
    const modules = join(storeRoot, storeEntry, "node_modules");
    if (!(await isDirectory(modules))) continue;
    for (const packagePath of await packageDirectories(modules)) {
      const manifestPath = join(packagePath, "package.json");
      const manifest = await readFile(manifestPath, "utf8")
        .then(JSON.parse)
        .catch(() => null);
      if (!manifest?.name || !manifest.version) continue;
      const scripts = Object.fromEntries(
        ["preinstall", "install", "postinstall"]
          .filter((name) => typeof manifest.scripts?.[name] === "string")
          .map((name) => [name, manifest.scripts[name]]),
      );
      if (Object.keys(scripts).length) {
        results.set(`${manifest.name}@${manifest.version}`, {
          name: manifest.name,
          version: manifest.version,
          scripts,
        });
      }
    }
  }
  return [...results.values()].sort((left, right) =>
    `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`),
  );
}

async function packageDirectories(modules) {
  const result = [];
  for (const entry of await readdir(modules, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const path = join(modules, entry.name);
    if (entry.name.startsWith("@")) {
      for (const scoped of await readdir(path, { withFileTypes: true })) {
        if (scoped.isDirectory()) result.push(join(path, scoped.name));
      }
    } else result.push(path);
  }
  return result;
}

async function isDirectory(path) {
  return stat(path)
    .then((value) => value.isDirectory())
    .catch(() => false);
}

function fail(message) {
  console.error(`Lifecycle audit failed: ${message}`);
  process.exit(1);
}
