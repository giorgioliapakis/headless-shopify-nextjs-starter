import { describe, expect, it } from "vitest";

import { resolveStorefrontEnvironment } from "@/lib/shopify/hydrogen/env";

describe("Hydrogen Storefront environment", () => {
  it("prefers canonical names and keeps private credentials separate", () => {
    const environment = resolveStorefrontEnvironment({
      PRIVATE_STOREFRONT_API_TOKEN: "private-token",
      PUBLIC_CHECKOUT_DOMAIN: "https://checkout.example.com",
      PUBLIC_STOREFRONT_API_TOKEN: "public-token",
      PUBLIC_STOREFRONT_ID: "gid://shopify/Storefront/fixture",
      PUBLIC_STORE_DOMAIN: "https://neutral-fixture.myshopify.com",
      SHOPIFY_API_VERSION: "2026-07",
      SHOPIFY_STOREFRONT_ACCESS_TOKEN: "ignored-legacy-token",
      SHOPIFY_STORE_DOMAIN: "ignored-legacy.myshopify.com",
    });

    expect(environment).toEqual({
      apiVersion: "2026-07",
      checkoutDomain: "checkout.example.com",
      mode: "shopify",
      privateStorefrontToken: "private-token",
      publicStorefrontToken: "public-token",
      storefrontId: "gid://shopify/Storefront/fixture",
      storeDomain: "neutral-fixture.myshopify.com",
      usedLegacyAliases: [],
    });
  });

  it("accepts the bounded legacy public aliases without promoting them to private access", () => {
    const environment = resolveStorefrontEnvironment({
      SHOPIFY_STOREFRONT_ACCESS_TOKEN: "legacy-public-token",
      SHOPIFY_STORE_DOMAIN: "legacy-fixture.myshopify.com",
    });

    expect(environment.publicStorefrontToken).toBe("legacy-public-token");
    expect(environment.mode).toBe("shopify");
    expect(environment.privateStorefrontToken).toBeUndefined();
    expect(environment.usedLegacyAliases).toEqual([
      "SHOPIFY_STORE_DOMAIN",
      "SHOPIFY_STOREFRONT_ACCESS_TOKEN",
    ]);
  });

  it.each([
    [{ PUBLIC_STORE_DOMAIN: "https://attacker.example.com", PUBLIC_STOREFRONT_API_TOKEN: "x" }],
    [{ PUBLIC_STORE_DOMAIN: "store.myshopify.com/path", PUBLIC_STOREFRONT_API_TOKEN: "x" }],
    [
      {
        PUBLIC_STOREFRONT_API_TOKEN: "x",
        PUBLIC_STORE_DOMAIN: "store.myshopify.com",
        SHOPIFY_API_VERSION: "unstable",
      },
    ],
  ])("rejects unsafe or moving Storefront configuration", (source) => {
    expect(() => resolveStorefrontEnvironment(source)).toThrow();
  });

  it("fails with variable names but never includes credential values", () => {
    expect(() =>
      resolveStorefrontEnvironment({ PUBLIC_STORE_DOMAIN: "neutral-fixture.myshopify.com" }),
    ).toThrow("PUBLIC_STOREFRONT_API_TOKEN");
  });

  it("uses the neutral demo only when Shopify configuration is completely absent", () => {
    expect(resolveStorefrontEnvironment({})).toMatchObject({
      mode: "neutral-demo",
      publicStorefrontToken: "fixture-public-token",
      storeDomain: "neutral-fixture.myshopify.com",
    });

    expect(() =>
      resolveStorefrontEnvironment({ PRIVATE_STOREFRONT_API_TOKEN: "private-without-store" }),
    ).toThrow("PUBLIC_STORE_DOMAIN, PUBLIC_STOREFRONT_API_TOKEN");
  });
});
