import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("platform contract", () => {
  it("pins stable runtime channels and permits only the ADR-bound Hydrogen preview", async () => {
    const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
    const dependencies = packageJson.dependencies as Record<string, string>;

    expect(dependencies.next).toBe("16.3.2");
    expect(dependencies.react).toBe("19.2.8");
    expect(dependencies["@base-ui/react"]).toBe("1.7.0");
    expect(dependencies["@shopify/hydrogen"]).toBe("0.0.0-preview-8a708a8-20260708155454");
    expect(dependencies["@ai-sdk/react"]).toBeUndefined();
    expect(
      Object.entries(dependencies)
        .filter(([name]) => name !== "@shopify/hydrogen")
        .some(([, version]) => /canary|preview|unstable/i.test(version)),
    ).toBe(false);
  });

  it("resolves the Lighthouse browser from a declared dependency", async () => {
    const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
    const lighthouseScript = await readFile(resolve("scripts/verify/lighthouse.mjs"), "utf8");

    expect(packageJson.devDependencies["@playwright/test"]).toBeDefined();
    expect(lighthouseScript).toContain('from "@playwright/test"');
    expect(lighthouseScript).not.toContain('from "playwright"');
    expect(lighthouseScript).toContain("chromium_headless_shell-");
    expect(lighthouseScript).toContain("constants.X_OK");
    expect(lighthouseScript).toContain("assertPortAvailable");
    expect(lighthouseScript).toContain("EADDRINUSE");
  });
});
