import { describe, expect, it } from "vitest";

import {
  buildMarketReturnTo,
  isMarketSwitchingEnabled,
  marketCacheKey,
  resolveStorefrontMarket,
  storefrontMarkets,
} from "@/lib/commerce/market";

describe("market contract", () => {
  it("keeps the default starter on one bounded market", () => {
    expect(storefrontMarkets).toHaveLength(1);
    expect(isMarketSwitchingEnabled()).toBe(false);
    expect(resolveStorefrontMarket("en-US")?.countryCode).toBe("US");
    expect(marketCacheKey("en-US")).toBe("en-US:US");
  });

  it("rejects arbitrary market cache cardinality", () => {
    expect(resolveStorefrontMarket("xx-ZZ")).toBeNull();
    expect(() => marketCacheKey("xx-ZZ")).toThrow("Unsupported storefront market");
  });

  it("preserves route and query state without allowing scheme-relative redirects", () => {
    expect(buildMarketReturnTo("/products/neutral", "variant=gid%3A%2F%2F1")).toBe(
      "/products/neutral?variant=gid%3A%2F%2F1",
    );
    expect(buildMarketReturnTo("//attacker.example", "x=1")).toBe("/?x=1");
  });
});
