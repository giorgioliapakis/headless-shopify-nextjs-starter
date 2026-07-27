#!/usr/bin/env node

// Boots `next dev` against the credential-free demo fixture.
//
// No file editing, no .env.local, no Shopify credentials. Any inherited token
// is stripped before the child starts so a configured real store can never be
// mixed into the demo dataset — the fixture gate would reject it anyway.

import { spawn } from "node:child_process";

const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/(?:TOKEN|SECRET|HOOK|PASSWORD|PRIVATE_KEY|API_KEY)$/i.test(key),
  ),
);

const port = process.env.PORT ?? "3000";

Object.assign(environment, {
  NEXT_PUBLIC_BASE_URL: `http://localhost:${port}`,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME ?? "Demo Store",
  PUBLIC_STOREFRONT_API_TOKEN: "demo-public-token",
  PUBLIC_STORE_DOMAIN: "demo-fixture.myshopify.com",
  SHOPIFY_API_VERSION: "2026-07",
  SHOPIFY_STOREFRONT_FIXTURE: "demo",
});

console.log(`Starting the credential-free demo storefront on http://localhost:${port}`);

const child = spawn("pnpm", ["exec", "next", "dev", "--port", port], {
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
