import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Storefront transport contract", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "neutral-fixture.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_ACCESS_TOKEN", "fixture-public-token");
    vi.stubEnv("SHOPIFY_API_VERSION", "2026-07");
  });

  it("preserves explicit market context and operation observability", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { shop: { name: "Neutral Store" } } }), {
        headers: { "x-request-id": "request-market", "x-shopify-api-version": "2026-07" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { storefront } = await import("@/lib/shopify/storefront");

    await storefront.request("query MarketShop($country: CountryCode) { shop { name } }", {
      variables: { country: "AU", language: "EN" },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://neutral-fixture.myshopify.com/api/2026-07/graphql.json?operation=MarketShop",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      query: "query MarketShop($country: CountryCode) { shop { name } }",
      variables: { country: "AU", language: "EN" },
    });
  });

  it("keeps GraphQL errors in the stable response for operation-level classification", async () => {
    const graphqlResponse = {
      data: null,
      errors: [{ message: "Field is unavailable", path: ["shop"] }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(graphqlResponse), {
          headers: { "x-shopify-api-version": "2026-07" },
        }),
      ),
    );
    const { storefront } = await import("@/lib/shopify/storefront");

    await expect(storefront.request("query InvalidField { shop { name } }")).resolves.toEqual(
      graphqlResponse,
    );
  });

  it("classifies malformed upstream JSON without reflecting its body", async () => {
    const secretBody = "merchant-private-upstream-payload";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(secretBody, {
          headers: {
            "content-type": "application/json",
            "x-request-id": "request-invalid-json",
            "x-shopify-api-version": "2026-07",
          },
        }),
      ),
    );
    const { storefront } = await import("@/lib/shopify/storefront");

    const rejection = storefront.request("query Malformed { shop { name } }");
    await expect(rejection).rejects.toMatchObject({
      message: "Shopify Malformed returned an invalid JSON response",
      requestId: "request-invalid-json",
      status: 200,
    });
    await expect(rejection).rejects.not.toThrow(secretBody);
  });
});
