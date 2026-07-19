#!/usr/bin/env node
import { spawn } from "node:child_process";

const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/(?:TOKEN|SECRET|HOOK|PASSWORD|PRIVATE_KEY|API_KEY)$/i.test(key),
  ),
);
Object.assign(environment, {
  HOSTNAME: "127.0.0.1",
  NEXT_PUBLIC_BASE_URL: "http://127.0.0.1:3100",
  NEXT_PUBLIC_SITE_NAME: "Neutral Browser Store",
  PUBLIC_STOREFRONT_API_TOKEN: "fixture-public-token",
  PUBLIC_STORE_DOMAIN: "neutral-fixture.myshopify.com",
  SHOPIFY_API_VERSION: "2026-07",
  SHOPIFY_STOREFRONT_FIXTURE: "neutral",
});

const child = spawn("pnpm", ["start", "--port", "3100", "--hostname", "127.0.0.1"], {
  cwd: process.cwd(),
  env: environment,
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
