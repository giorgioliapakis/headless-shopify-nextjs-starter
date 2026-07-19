import { describe, expect, it } from "vitest";

import { resolveStorefrontMode } from "@/lib/shopify/storefront-mode";

describe("Storefront bootstrap mode", () => {
  it("selects the neutral demo when no Shopify configuration exists", () => {
    expect(resolveStorefrontMode({})).toBe("neutral-demo");
  });

  it("selects Shopify only when the required pair is complete", () => {
    expect(
      resolveStorefrontMode({
        PUBLIC_STOREFRONT_API_TOKEN: "public-token",
        PUBLIC_STORE_DOMAIN: "merchant.myshopify.com",
      }),
    ).toBe("shopify");
  });

  it("keeps the explicit neutral CI fixture in the live-like presentation", () => {
    expect(
      resolveStorefrontMode({
        PUBLIC_STOREFRONT_API_TOKEN: "fixture-public-token",
        PUBLIC_STORE_DOMAIN: "neutral-fixture.myshopify.com",
        SHOPIFY_STOREFRONT_FIXTURE: "neutral",
      }),
    ).toBe("shopify");
  });

  it.each([
    [{ PUBLIC_STORE_DOMAIN: "merchant.myshopify.com" }, "PUBLIC_STOREFRONT_API_TOKEN"],
    [{ PUBLIC_STOREFRONT_API_TOKEN: "public-token" }, "PUBLIC_STORE_DOMAIN"],
    [{ PRIVATE_STOREFRONT_API_TOKEN: "private-token" }, "PUBLIC_STORE_DOMAIN"],
  ])("fails closed on partial configuration", (source, missingName) => {
    expect(() => resolveStorefrontMode(source)).toThrow(missingName);
  });
});
