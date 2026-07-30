import { describe, expect, it } from "vitest";

import { transformPredictiveSearchResult } from "@/lib/shopify/transforms/search";

function product(overrides: { handle?: string; trackingParameters?: string | null } = {}) {
  return {
    id: "gid://shopify/Product/1",
    title: "Everyday Tote",
    handle: overrides.handle ?? "everyday-tote",
    vendor: "Arc",
    availableForSale: true,
    trackingParameters: overrides.trackingParameters ?? null,
    featuredImage: null,
    priceRange: { minVariantPrice: { amount: "48.0", currencyCode: "USD" } },
    compareAtPriceRange: null,
  };
}

describe("transformPredictiveSearchResult", () => {
  it("builds product links with the search term and Shopify tracking parameters", () => {
    const result = transformPredictiveSearchResult(
      {
        products: [product({ trackingParameters: "queryID=abc123&position=1" })],
        collections: [],
        queries: [],
      },
      "tote",
    );

    const url = new URL(result.products[0].url, "https://store.local");
    expect(url.pathname).toBe("/products/everyday-tote");
    expect(url.searchParams.get("q")).toBe("tote");
    expect(url.searchParams.get("queryID")).toBe("abc123");
    expect(url.searchParams.get("position")).toBe("1");
  });

  it("falls back cleanly when tracking parameters are absent", () => {
    const result = transformPredictiveSearchResult(
      {
        products: [product({ trackingParameters: null }), product({ handle: "belt" })],
        collections: [],
        queries: [],
      },
      "to",
    );

    expect(result.products[0].url).toBe("/products/everyday-tote?q=to");
    expect(result.products[1].url).toBe("/products/belt?q=to");
  });

  it("tolerates fixture payloads that omit trackingParameters entirely", () => {
    const { trackingParameters: _omitted, ...bare } = product();

    const result = transformPredictiveSearchResult(
      { products: [bare], collections: [], queries: [] },
      "tote",
    );

    expect(result.products[0].url).toBe("/products/everyday-tote?q=tote");
  });

  it("builds collection links through the shared route templates", () => {
    const result = transformPredictiveSearchResult(
      {
        products: [],
        collections: [{ handle: "bags", title: "Bags", trackingParameters: "queryID=col9" }],
        queries: [],
      },
      "bag",
    );

    const url = new URL(result.collections[0].url, "https://store.local");
    expect(url.pathname).toBe("/collections/bags");
    expect(url.searchParams.get("q")).toBe("bag");
    expect(url.searchParams.get("queryID")).toBe("col9");
  });

  it("builds query suggestion links from the suggestion text with attribution", () => {
    const result = transformPredictiveSearchResult(
      {
        products: [],
        collections: [],
        queries: [
          {
            text: "tote bag",
            styledText: "<mark>tote</mark> bag",
            trackingParameters: "queryID=q1",
          },
        ],
      },
      "tote",
    );

    const url = new URL(result.queries[0].url, "https://store.local");
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("q")).toBe("tote bag");
    expect(url.searchParams.get("queryID")).toBe("q1");
  });
});
