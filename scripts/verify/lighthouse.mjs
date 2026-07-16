#!/usr/bin/env node
import { spawnSync } from "node:child_process";

import { chromium } from "playwright";

const result = spawnSync("pnpm", ["exec", "lhci", "autorun"], {
  cwd: process.cwd(),
  env: { ...process.env, CHROME_PATH: chromium.executablePath() },
  stdio: "inherit",
});
process.exit(result.status ?? 1);
