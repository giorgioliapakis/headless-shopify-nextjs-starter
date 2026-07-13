#!/usr/bin/env node

import { lstat, readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import process from "node:process";

const root = resolve(process.cwd());
const ignoredDirectories = new Set([
  ".git",
  ".migration",
  "node_modules",
  ".next",
  "coverage",
]);
const ignoredFiles = new Set([".DS_Store"]);
const binaryExtensions = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".ttf",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);
const allowedBinaryPaths = new Set();
const forbiddenPathPatterns = [
  /(^|\/)\.env(?:\..+)?$/,
  /(^|\/)migration-(?:snapshot|evidence|report)(?:\/|\.|$)/i,
  /(^|\/)(?:theme|store)-export(?:\/|\.|$)/i,
];
const secretPatterns = [
  {
    label: "private key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    label: "Shopify private token",
    pattern: /\bshp(?:at|ca|ss)_[A-Za-z0-9]{16,}\b/,
  },
  { label: "GitHub token", pattern: /\bgh[oprsu]_[A-Za-z0-9_]{20,}\b/ },
  { label: "Vercel token", pattern: /\bvercel_[A-Za-z0-9_-]{20,}\b/i },
];

const findings = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredFiles.has(entry.name)) continue;
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const absolutePath = join(directory, entry.name);
    const repositoryPath = relative(root, absolutePath).split(sep).join("/");
    const metadata = await lstat(absolutePath);

    if (metadata.isSymbolicLink()) {
      findings.push(
        `${repositoryPath}: symbolic links require an explicit provenance exception`,
      );
      continue;
    }

    if (metadata.isDirectory()) {
      await walk(absolutePath);
      continue;
    }

    if (!metadata.isFile()) {
      findings.push(`${repositoryPath}: special files are prohibited`);
      continue;
    }

    if (
      forbiddenPathPatterns.some((pattern) => pattern.test(repositoryPath)) &&
      !repositoryPath.endsWith(".env.example")
    ) {
      findings.push(`${repositoryPath}: sensitive path is prohibited`);
    }

    if (binaryExtensions.has(extname(repositoryPath).toLowerCase())) {
      if (!allowedBinaryPaths.has(repositoryPath)) {
        findings.push(
          `${repositoryPath}: binary asset is not in the audited allowlist`,
        );
      }
      continue;
    }

    const content = await readFile(absolutePath, "utf8");
    for (const { label, pattern } of secretPatterns) {
      if (pattern.test(content))
        findings.push(`${repositoryPath}: possible ${label}`);
    }
  }
}

await walk(root);

if (findings.length > 0) {
  console.error("Clean-room scan failed:\n");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log("Clean-room scan passed.");
}
