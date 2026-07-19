#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";

const PACKAGE_NAME = "@shopify/hydrogen";
const PACKAGE_VERSION = "0.0.0-preview-8a708a8-20260708155454";
const EXPECTED_SKILLS = [
  "hydrogen-analytics",
  "hydrogen-cart-drawer",
  "hydrogen-cart-ui",
  "hydrogen-collection-browser",
  "hydrogen-markets",
  "hydrogen-money",
  "hydrogen-predictive-search",
  "hydrogen-request-handlers",
  "hydrogen-routing",
  "hydrogen-setup",
  "hydrogen-shop-pay",
  "hydrogen-smoke-test",
  "hydrogen-storefront-client",
  "hydrogen-variant-form",
];

const root = resolve(process.cwd());
const packageRoot = resolve(root, "node_modules/@shopify/hydrogen");
const sourceRoot = resolve(packageRoot, "skills");
const destinationRoot = resolve(root, ".agents/skills");
const manifestPath = resolve(root, "agent-workflows/skills.json");

function fail(message) {
  throw new Error(`Hydrogen skill sync failed: ${message}`);
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolutePath)));
    else if (entry.isFile()) files.push(absolutePath);
    else fail(`refusing non-regular package path ${absolutePath}`);
  }
  return files;
}

const packageJson = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
if (packageJson.name !== PACKAGE_NAME || packageJson.version !== PACKAGE_VERSION) {
  fail(`expected ${PACKAGE_NAME}@${PACKAGE_VERSION}`);
}
if (packageJson.license !== "MIT") fail("package license is not MIT");
for (const lifecycle of ["preinstall", "install", "postinstall"]) {
  if (packageJson.scripts?.[lifecycle]) fail(`unexpected ${lifecycle} lifecycle script`);
}

const packageSkills = (await readdir(sourceRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (packageSkills.join("\n") !== EXPECTED_SKILLS.join("\n")) {
  fail(`skill inventory drifted: ${packageSkills.join(", ")}`);
}

const importedSkills = [];
for (const target of EXPECTED_SKILLS) {
  const source = resolve(sourceRoot, target);
  const destination = resolve(destinationRoot, target);
  if (!source.startsWith(`${sourceRoot}/`) || !destination.startsWith(`${destinationRoot}/`)) {
    fail(`skill path escaped its root: ${target}`);
  }

  await rm(destination, { recursive: true, force: true });
  const files = [];
  for (const sourceFile of await listFiles(source)) {
    const path = relative(source, sourceFile).split(sep).join("/");
    const destinationFile = resolve(destination, path);
    if (!destinationFile.startsWith(`${destination}/`)) fail(`file path escaped ${target}`);
    const metadata = await stat(sourceFile);
    if (!metadata.isFile()) fail(`non-file entry in ${target}`);
    const content = await readFile(sourceFile);
    await mkdir(dirname(destinationFile), { recursive: true });
    await copyFile(sourceFile, destinationFile);
    files.push({ path, sha256: sha256(content) });
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  importedSkills.push({ sourcePath: `skills/${target}`, target, files });
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.packages = [
  {
    package: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    provenance: "docs/provenance/hydrogen-sdk.json",
    license: "MIT",
    skills: importedSkills,
  },
];
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `Synchronized ${importedSkills.length} skills from ${PACKAGE_NAME}@${PACKAGE_VERSION}.`,
);
