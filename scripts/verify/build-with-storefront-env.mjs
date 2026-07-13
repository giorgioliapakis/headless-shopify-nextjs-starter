#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const envPath = process.argv[2] ? resolve(process.argv[2]) : resolve(".env.local");
const values = new Map();

for (const line of (await readFile(envPath, "utf8")).split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (!match) continue;
  const value = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  values.set(match[1], value);
}

const domain = values.get("SHOPIFY_STORE_DOMAIN");
const token = values.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
if (!domain || !token) {
  console.error("The supplied env file must contain Shopify Storefront domain and token values.");
  process.exit(1);
}

const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/(?:TOKEN|SECRET|HOOK|PASSWORD|PRIVATE_KEY|API_KEY)$/i.test(key),
  ),
);
Object.assign(environment, {
  SHOPIFY_STORE_DOMAIN: domain,
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: token,
  SHOPIFY_API_VERSION: "2026-07",
  NEXT_PUBLIC_SITE_NAME: "Verification Store",
  NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
});

let status = 1;
try {
  status =
    spawnSync("pnpm", ["build"], {
      cwd: process.cwd(),
      env: environment,
      stdio: "inherit",
    }).status ?? 1;
} finally {
  await rm(resolve(".next"), { recursive: true, force: true });
}

process.exit(status);
