#!/usr/bin/env node

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(process.cwd());
const source = resolve(root, ".agents/skills");
const destination = resolve(root, ".claude/skills");

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const entry of await readdir(source, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    await cp(resolve(source, entry.name), resolve(destination, entry.name), { recursive: true });
  }
}
console.log("Synchronized canonical skills for Claude Code.");
