#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

import { auditLicenseReport, licenseMap } from "../security/license-policy.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(process.cwd());
const releaseDirectory = join(root, ".release");
const prohibited = [
  /^\.env(?:\.|$)/,
  /^\.migration\//,
  /^\.context\//,
  /^\.artifacts\//,
  /^source-theme\//,
  /^test-results\//,
  /^\.next\//,
  /^node_modules\//,
];

const status = (await git(["status", "--porcelain"])).trim();
if (status) fail("working tree must be clean so evidence matches the archived commit");
const commit = (await git(["rev-parse", "HEAD"])).trim();
const files = (await git(["ls-files", "-z"])).split("\0").filter(Boolean).sort();
const sourceFiles = [];
for (const path of files) {
  if (path !== ".env.example" && prohibited.some((pattern) => pattern.test(path))) {
    fail(`prohibited tracked path: ${path}`);
  }
  const absolute = join(root, path);
  const metadata = await stat(absolute);
  if (!metadata.isFile()) fail(`non-regular tracked path: ${path}`);
  if (metadata.size > 5 * 1024 * 1024) fail(`tracked file exceeds 5 MiB release limit: ${path}`);
  const content = await readFile(absolute);
  if (content.includes(0)) fail(`unapproved binary tracked file: ${path}`);
  sourceFiles.push({ path, bytes: metadata.size, sha256: sha256(content) });
}

const packageManifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const licensePolicy = JSON.parse(
  await readFile(join(root, "config", "supply-chain", "license-policy.json"), "utf8"),
);
const [dependencyResult, licenseResult] = await Promise.all([
  execFileAsync("pnpm", ["list", "--prod", "--json", "--depth", "Infinity"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  }),
  execFileAsync("pnpm", ["licenses", "list", "--prod", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  }),
]);
const licensedPackages = auditLicenseReport(JSON.parse(licenseResult.stdout), licensePolicy);
const components = collectComponents(
  JSON.parse(dependencyResult.stdout),
  licenseMap(licensedPackages),
);
const generatedAt = new Date().toISOString();
await mkdir(releaseDirectory, { recursive: true });
await writeJson(join(releaseDirectory, "source-manifest.json"), {
  schemaVersion: 1,
  generatedAt,
  commit,
  fileCount: sourceFiles.length,
  files: sourceFiles,
});
await writeJson(join(releaseDirectory, "sbom.cdx.json"), {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: `urn:uuid:${randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: generatedAt,
    component: {
      type: "application",
      name: packageManifest.name,
      version: packageManifest.version,
      bomRef: `pkg:npm/${packageManifest.name}@${packageManifest.version}`,
    },
  },
  components,
});
await writeJson(join(releaseDirectory, "license-inventory.json"), {
  schemaVersion: 1,
  generatedAt,
  commit,
  packageVersionCount: licensedPackages.length,
  reviewedExceptionCount: licensedPackages.filter((entry) => entry.review === "reviewed-exception")
    .length,
  packages: licensedPackages,
});
const archiveName = `agentic-shopify-starter-${packageManifest.version}.tar`;
const archivePath = join(releaseDirectory, archiveName);
await git(["archive", "--format=tar", `--output=${archivePath}`, "HEAD"]);
const archive = await readFile(archivePath);
await writeJson(join(releaseDirectory, "release-report.json"), {
  schemaVersion: 1,
  generatedAt,
  commit,
  archive: { file: basename(archivePath), bytes: archive.byteLength, sha256: sha256(archive) },
  sourceFileCount: sourceFiles.length,
  componentCount: components.length,
  licensedComponentCount: components.filter((component) => component.licenses).length,
  reviewedLicenseExceptionCount: licensedPackages.filter(
    (entry) => entry.review === "reviewed-exception",
  ).length,
  signature: "unsigned-local-evidence",
  note: "Distribution requires protected CI provenance/attestation; this local report grants no release authority.",
});
console.log(
  `Release evidence passed: ${sourceFiles.length} source files, ${components.length} components, ${archiveName}.`,
);

function collectComponents(trees, licensesByPackage) {
  const collected = new Map();
  function visit(node) {
    for (const [name, value] of Object.entries(node?.dependencies ?? {})) {
      if (!value?.version) continue;
      const ref = `pkg:npm/${encodeURIComponent(name)}@${value.version}`;
      const license = licensesByPackage.get(`${name}@${value.version}`);
      collected.set(ref, {
        type: "library",
        name,
        version: value.version,
        purl: ref,
        "bom-ref": ref,
        ...(license ? { licenses: [{ expression: license }] } : {}),
      });
      visit(value);
    }
  }
  for (const tree of Array.isArray(trees) ? trees : [trees]) visit(tree);
  return [...collected.values()].sort((left, right) => left.purl.localeCompare(right.purl));
}

async function git(args) {
  return (
    await execFileAsync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 })
  ).stdout;
}
async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function fail(message) {
  console.error(`Release verification failed: ${message}`);
  process.exit(1);
}
