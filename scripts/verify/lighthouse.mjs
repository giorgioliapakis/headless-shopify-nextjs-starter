#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { accessSync, constants, readdirSync } from "node:fs";
import { createServer } from "node:net";
import { basename, dirname, join } from "node:path";

import { chromium } from "@playwright/test";

await assertPortAvailable(3100);
const chromePath = getHeadlessShellPath();
const result = spawnSync("pnpm", ["exec", "lhci", "autorun"], {
  cwd: process.cwd(),
  env: { ...process.env, CHROME_PATH: chromePath },
  stdio: "inherit",
});
process.exit(result.status ?? 1);

function getHeadlessShellPath() {
  let browserDirectory = dirname(chromium.executablePath());
  while (!/^chromium-\d+$/.test(basename(browserDirectory))) {
    const parent = dirname(browserDirectory);
    if (parent === browserDirectory) {
      throw new Error("Could not locate Playwright's pinned Chromium installation.");
    }
    browserDirectory = parent;
  }

  const revision = basename(browserDirectory).slice("chromium-".length);
  const shellDirectory = join(dirname(browserDirectory), `chromium_headless_shell-${revision}`);
  let executable;
  try {
    executable = findExecutable(shellDirectory);
  } catch {
    // The install instruction below is more useful than a raw ENOENT.
  }
  if (!executable) {
    throw new Error("Playwright's Chromium headless shell is missing. Run `pnpm browser:install`.");
  }
  return executable;
}

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${port} is already in use. Stop the existing storefront server before running Lighthouse.`,
          ),
        );
        return;
      }
      reject(error);
    });
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
}

function findExecutable(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = findExecutable(path);
      if (nested) return nested;
      continue;
    }
    if (entry.name !== "chrome-headless-shell" && entry.name !== "chrome-headless-shell.exe") {
      continue;
    }
    try {
      accessSync(path, constants.X_OK);
      return path;
    } catch {
      // Keep looking for the platform executable.
    }
  }
  return undefined;
}
