#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { auditLicenseReport } from "./license-policy.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(process.cwd());
const policy = JSON.parse(
  await readFile(join(root, "config", "supply-chain", "license-policy.json"), "utf8"),
);

try {
  const { stdout } = await execFileAsync("pnpm", ["licenses", "list", "--prod", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  const packages = auditLicenseReport(JSON.parse(stdout), policy);
  const exceptions = packages.filter((entry) => entry.review === "reviewed-exception");
  console.log(
    `License audit passed: ${packages.length} production package versions; ${exceptions.length} reviewed exceptions.`,
  );
} catch (error) {
  console.error(`License audit failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
