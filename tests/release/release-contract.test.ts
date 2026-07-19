import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("release contract", () => {
  it("keeps local release and migration evidence untracked", async () => {
    const ignore = await readFile(".gitignore", "utf8");
    expect(ignore).toContain(".migration/");
    expect(ignore).toContain(".release/");
    expect(ignore).toContain(".artifacts/");
  });

  it("uses a clean tracked Git archive and emits source/SBOM evidence", async () => {
    const script = await readFile("scripts/release/verify.mjs", "utf8");
    expect(script).toContain('git(["status", "--porcelain"])');
    expect(script).toContain('git(["archive", "--format=tar"');
    expect(script).toContain('"sbom.cdx.json"');
    expect(script).toContain('"license-inventory.json"');
    expect(script).toContain("auditLicenseReport");
    expect(script).toContain('signature: "unsigned-local-evidence"');
    expect(script).toContain('path !== ".env.example"');
  });

  it("documents every exact lifecycle-script exception", async () => {
    const allowlist = JSON.parse(
      await readFile("config/supply-chain/lifecycle-allowlist.json", "utf8"),
    );
    expect(allowlist.schemaVersion).toBe(1);
    expect(allowlist.packages.length).toBeGreaterThan(0);
    for (const entry of allowlist.packages) {
      expect(entry.name).toBeTruthy();
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(Object.keys(entry.scripts)).not.toHaveLength(0);
      expect(entry.reason.length).toBeGreaterThan(20);
    }
  });

  it("fails closed on unreviewed production licenses", async () => {
    const policy = JSON.parse(await readFile("config/supply-chain/license-policy.json", "utf8"));
    expect(policy.schemaVersion).toBe(1);
    expect(policy.approvedExpressions).toContain("MIT");
    expect(policy.approvedExpressions).not.toContain("LGPL-3.0-or-later");
    for (const entry of policy.reviewedExceptions) {
      expect(entry.packagePattern).toMatch(/^\^/);
      expect(entry.packagePattern).toMatch(/\$$/);
      expect(entry.reason.length).toBeGreaterThan(40);
    }
    const manifest = JSON.parse(await readFile("package.json", "utf8"));
    expect(manifest.scripts["supply-chain:audit"]).toContain("audit-licenses.mjs");
  });

  it("defines fail-closed merchant ownership for downstream updates", async () => {
    const config = JSON.parse(await readFile("config/foundation-update.json", "utf8"));
    expect(config).toMatchObject({ schemaVersion: 1, conflictPolicy: "fail-closed" });
    expect(config.merchantOwned).toContain("config/presets/");
    expect(config.merchantOwned).toContain("public/merchant/");
  });

  it("pins manual release evidence and keeps publishing outside its authority", async () => {
    const workflow = await readFile(".github/workflows/release-evidence.yml", "utf8");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("actions/attest@a1948c3f048ba23858d222213b7c278aabede763");
    expect(workflow).toContain("actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a");
    expect(workflow).toContain(".release/license-inventory.json");
    expect(workflow).not.toMatch(/gh release|npm publish|vercel deploy/);
  });

  it("applies Lighthouse SEO assertions only to indexable storefront routes", async () => {
    const config = JSON.parse(await readFile("lighthouserc.json", "utf8"));
    expect(config.ci.collect.settings.chromeFlags).not.toContain("--headless");
    expect(config.ci.collect.settings.chromeFlags).toContain("--disable-gpu");
    const assertionMatrix = config.ci.assert.assertMatrix;
    expect(assertionMatrix).toHaveLength(4);
    expect(assertionMatrix[0].matchingUrlPattern).toBe(".*");
    expect(assertionMatrix[0].assertions["categories:seo"]).toBeUndefined();
    expect(assertionMatrix[3].matchingUrlPattern).toContain("collections");
    expect(assertionMatrix[3].matchingUrlPattern).toContain("products");
    expect(assertionMatrix[3].matchingUrlPattern).not.toContain("search");
    expect(assertionMatrix[3].matchingUrlPattern).not.toContain("cart");
    expect(assertionMatrix[3].assertions["categories:seo"]).toEqual(["error", { minScore: 1 }]);
  });

  it("makes a zero-credential deployment visible and non-indexable", async () => {
    const [layout, nextConfig, playwright, readiness, robots] = await Promise.all([
      readFile("app/layout.tsx", "utf8"),
      readFile("next.config.ts", "utf8"),
      readFile("playwright.config.ts", "utf8"),
      readFile("app/api/readiness/route.ts", "utf8"),
      readFile("app/robots.ts", "utf8"),
    ]);
    expect(layout).toContain("DemoStorefrontNotice");
    expect(nextConfig).toContain('X-Robots-Tag", value: "noindex, nofollow, noarchive');
    expect(playwright).toContain("/api/health");
    expect(playwright).not.toContain('url: "http://127.0.0.1:3100/api/readiness"');
    expect(readiness).toContain('status: "setup-required"');
    expect(robots).toContain('disallow: "/"');
  });

  it("uses representative Lighthouse runs and preserves failed diagnostics", async () => {
    const config = JSON.parse(await readFile("lighthouserc.json", "utf8"));
    expect(config.ci.collect.numberOfRuns).toBe(3);
    for (const routeGate of config.ci.assert.assertMatrix) {
      expect(routeGate.aggregationMethod).toBe("median-run");
    }
    expect(
      config.ci.assert.assertMatrix[1].assertions["largest-contentful-paint"][1].aggregationMethod,
    ).toBe("median");
    expect(
      config.ci.assert.assertMatrix[2].assertions["largest-contentful-paint"][1].aggregationMethod,
    ).toBe("median");
    expect(config.ci.assert.assertMatrix[2].assertions["largest-contentful-paint"]).toEqual([
      "error",
      { maxNumericValue: 3400, aggregationMethod: "median" },
    ]);

    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("Preserve failed Lighthouse diagnostics");
    expect(workflow).toContain("actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a");
    expect(workflow).toContain("retention-days: 7");
  });
});
