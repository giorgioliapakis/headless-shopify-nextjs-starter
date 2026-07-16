#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/(?:TOKEN|SECRET|HOOK|PASSWORD|PRIVATE_KEY|API_KEY)$/i.test(key),
  ),
);
Object.assign(environment, {
  NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SITE_NAME: "Neutral Verification Store",
  PUBLIC_STOREFRONT_API_TOKEN: "fixture-public-token",
  PUBLIC_STORE_DOMAIN: "neutral-fixture.myshopify.com",
  SHOPIFY_API_VERSION: "2026-07",
  SHOPIFY_STOREFRONT_FIXTURE: "neutral",
});

run("pnpm", ["build"], environment);
run("node", ["scripts/performance/bundle-budget.mjs"], environment);

function run(command, args, env) {
  const result = spawnSync(command, args, { cwd: process.cwd(), env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
