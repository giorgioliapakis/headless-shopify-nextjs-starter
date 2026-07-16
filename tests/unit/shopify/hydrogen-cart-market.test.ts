import { afterEach, describe, expect, it, vi } from "vitest";

import {
  normalizeHydrogenCartId,
  syncHydrogenCartMarket,
} from "@/lib/shopify/hydrogen/cart-market";

describe("Hydrogen cart market synchronization", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("normalizes the compact Hydrogen cookie token", () => {
    expect(normalizeHydrogenCartId("fixture-cart")).toBe("gid://shopify/Cart/fixture-cart");
    expect(normalizeHydrogenCartId("gid%3A%2F%2Fshopify%2FCart%2Ffixture-cart")).toBe(
      "gid://shopify/Cart/fixture-cart",
    );
  });

  it("rejects malformed or oversized cookie values", () => {
    expect(normalizeHydrogenCartId("%20")).toBeNull();
    expect(normalizeHydrogenCartId("fixture;other=value")).toBeNull();
    expect(normalizeHydrogenCartId("x".repeat(2049))).toBeNull();
  });

  it("updates buyer identity through the neutral Storefront fixture", async () => {
    vi.stubEnv("SHOPIFY_STOREFRONT_FIXTURE", "neutral");
    vi.stubEnv("PUBLIC_STORE_DOMAIN", "neutral-fixture.myshopify.com");
    vi.stubEnv("PUBLIC_STOREFRONT_API_TOKEN", "fixture-public-token");
    await expect(syncHydrogenCartMarket("fixture-cart", "en-AU")).resolves.toBeUndefined();
  });
});
