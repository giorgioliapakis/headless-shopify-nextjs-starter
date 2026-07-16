#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const expectedWarnings = [
  "The field Cart.discountAllocations is deprecated. Use `cart.lines[].discountAllocations(lineLevelOnly: false)` and `cart.deliveryGroups[].discountAllocations` instead.",
];
const executable = resolve(
  "node_modules/.bin",
  process.platform === "win32" ? "gql.tada.cmd" : "gql.tada",
);
const result = spawnSync(executable, ["check"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
process.stdout.write(output);

if (result.status !== 0) process.exit(result.status ?? 1);

const warningLines = output
  .split(/\r?\n/)
  .filter((line) => line.includes("\twarn\t"))
  .map((line) => line.split("\twarn\t")[1]?.trim())
  .filter(Boolean);

if (
  warningLines.length !== expectedWarnings.length ||
  expectedWarnings.some((warning) => !warningLines.includes(warning))
) {
  console.error(
    `GraphQL warning inventory drifted. Expected ${expectedWarnings.length}, received ${warningLines.length}.`,
  );
  process.exit(1);
}

console.log(
  `Validated Storefront documents with ${warningLines.length} reviewed deprecation warning.`,
);
