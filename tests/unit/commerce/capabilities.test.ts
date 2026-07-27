import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { validateFeatureConfig } from "@/config/schema/features";
import { enabledCapabilityIds, getCapabilityManifest } from "@/lib/commerce/capabilities";

const disabledFeatures = validateFeatureConfig({
  accounts: { hosted: false, url: null },
  analytics: { shopify: false },
  markets: { enabled: false },
  pdp: { bundles: false, complementaryProducts: false, relatedProducts: false },
  webhooks: { enabled: false },
});

describe("commerce capability manifest", () => {
  it("keeps core routes enabled and conditional packs disabled by default", () => {
    const enabled = enabledCapabilityIds(disabledFeatures);
    expect(enabled).toContain("catalog.products");
    expect(enabled).toContain("content.blogs");
    expect(enabled).toContain("shopify.cart");
    expect(enabled).toContain("selling-plans");
    expect(enabled).not.toContain("analytics.shopify");
    expect(enabled).not.toContain("markets");
  });

  it("gives every enabled capability a real consumer", async () => {
    const capabilities = getCapabilityManifest(disabledFeatures);
    const enabled = capabilities.filter((capability) => capability.enabled);
    expect(enabled.every((capability) => capability.consumers.length > 0)).toBe(true);
    await expect(
      Promise.all(
        enabled.flatMap((capability) => capability.consumers.map((path) => access(resolve(path)))),
      ),
    ).resolves.toEqual(enabled.flatMap((capability) => capability.consumers.map(() => undefined)));
  });

  it("keeps the coding-agent JSON mirror aligned with the executable registry", async () => {
    const document = JSON.parse(await readFile(resolve(".agents/capability-map.json"), "utf8")) as {
      capabilities: Array<{ id: string; status: string }>;
      schemaVersion: number;
    };
    const executable = getCapabilityManifest(disabledFeatures).map(({ id, status }) => ({
      id,
      status,
    }));
    expect(document.schemaVersion).toBe(1);
    expect(document.capabilities).toEqual(executable);
  });

  it("rejects unknown feature configuration instead of silently enabling it", () => {
    expect(() => validateFeatureConfig({ ...disabledFeatures, unknown: true })).toThrow();
  });
});
