#!/usr/bin/env node

// Guards the tracked history of this starter: no credentials, no store-specific
// exports, no unreviewed binary assets. Only tracked files are scanned, so a
// local .env.local or a build artifact never fails the gate.

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = resolve(process.cwd());

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

// Binary assets must be added here deliberately, with a reviewed licence.
// docs/media screenshots are self-generated captures of the built-in demo
// fixture (invented, repo-owned content) — no third-party rights involved.
const allowedBinaryPaths = new Set(["docs/media/home-light.png", "docs/media/product-dark.png"]);

const forbiddenPathPatterns = [/(^|\/)\.env(?:\..+)?$/, /(^|\/)(?:theme|store)-export(?:\/|\.|$)/i];

const secretPatterns = [
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "Shopify private token", pattern: /\bshp(?:at|ca|ss)_[A-Za-z0-9]{16,}\b/ },
  { label: "Shopify Admin access token", pattern: /\bshpat_[A-Fa-f0-9]{32}\b/ },
  { label: "GitHub token", pattern: /\bgh[oprsu]_[A-Za-z0-9_]{20,}\b/ },
  { label: "AWS access key id", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "Google API key", pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  { label: "Slack token", pattern: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/ },
];

const findings = [];

const { stdout } = await run("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const trackedPaths = stdout.split("\0").filter(Boolean);

for (const repositoryPath of trackedPaths) {
  if (forbiddenPathPatterns.some((pattern) => pattern.test(repositoryPath))) {
    if (!repositoryPath.endsWith(".env.example")) {
      findings.push(`${repositoryPath}: sensitive path must not be tracked`);
      continue;
    }
  }

  if (binaryExtensions.has(extname(repositoryPath).toLowerCase())) {
    if (!allowedBinaryPaths.has(repositoryPath)) {
      findings.push(`${repositoryPath}: binary asset is not in the audited allowlist`);
    }
    continue;
  }

  let content;
  try {
    content = await readFile(resolve(root, repositoryPath), "utf8");
  } catch {
    continue; // deleted from the worktree but still in the index
  }

  for (const { label, pattern } of secretPatterns) {
    if (pattern.test(content)) findings.push(`${repositoryPath}: possible ${label}`);
  }
}

if (findings.length > 0) {
  console.error("Repository scan failed:\n");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Repository scan passed (${trackedPaths.length} tracked files).`);
}
