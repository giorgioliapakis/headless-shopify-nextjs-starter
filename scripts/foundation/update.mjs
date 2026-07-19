#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { analyzeUpdate, parseNameStatus } from "./lib.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(process.cwd());
const config = JSON.parse(await readFile(join(root, "config", "foundation-update.json"), "utf8"));
const options = parseOptions(process.argv.slice(2));
const from = required(options, "from");
const to = required(options, "to");
await validateRef(from);
await validateRef(to);
if (!(await isAncestor(from, "HEAD"))) fail(`${from} is not an ancestor of the downstream HEAD`);
if (!(await isAncestor(from, to))) fail(`${from} is not an ancestor of ${to}`);

const foundationChanges = parseNameStatus(await git(["diff", "--name-status", `${from}..${to}`]));
const downstreamChanges = parseNameStatus(await git(["diff", "--name-status", `${from}..HEAD`]));
const plan = analyzeUpdate(config, foundationChanges, downstreamChanges);
const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  from,
  to,
  foundationChanges: foundationChanges.length,
  downstreamChanges: downstreamChanges.length,
  conflicts: plan.conflicts,
  protectedFoundationChanges: plan.protectedFoundationChanges,
  safeToMerge: plan.safeToMerge,
  applyCommand: plan.safeToMerge
    ? `pnpm foundation:update --from ${from} --to ${to} --apply`
    : null,
};

if (options.apply === true) {
  if (!plan.safeToMerge) fail("update plan contains conflicts; resolve ownership before applying");
  if ((await git(["status", "--porcelain"])).trim())
    fail("working tree must be clean before apply");
  await git(["merge", "--no-ff", "--no-edit", to]);
  result.applied = true;
} else result.applied = false;

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!plan.safeToMerge) process.exitCode = 2;

function parseOptions(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!flag.startsWith("--")) fail(`unexpected argument: ${flag}`);
    const name = flag.slice(2);
    if (!["from", "to", "apply"].includes(name)) fail(`unknown option: ${flag}`);
    if (name === "apply") parsed.apply = true;
    else parsed[name] = args[++index];
  }
  return parsed;
}

async function validateRef(ref) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/@-]{0,199}$/.test(ref) || ref.includes(".."))
    fail(`unsafe Git ref: ${ref}`);
  await git(["rev-parse", "--verify", `${ref}^{commit}`]).catch(() =>
    fail(`unknown Git ref: ${ref}`),
  );
}
async function isAncestor(ancestor, descendant) {
  return execFileAsync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
    cwd: root,
  }).then(
    () => true,
    () => false,
  );
}
async function git(args) {
  return (
    await execFileAsync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
  ).stdout;
}
function required(values, key) {
  if (typeof values[key] !== "string" || !values[key]) fail(`missing --${key}`);
  return values[key];
}
function fail(message) {
  console.error(`Foundation update failed: ${message}`);
  process.exit(1);
}
