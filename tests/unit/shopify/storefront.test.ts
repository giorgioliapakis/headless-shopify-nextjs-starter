import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Storefront transport", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "fixture.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_ACCESS_TOKEN", "fixture-token");
    vi.stubEnv("SHOPIFY_API_VERSION", "2026-07");
  });

  it("sends a dated authenticated GraphQL request with locale defaults", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { shop: { name: "Fixture" } } }), {
        headers: { "content-type": "application/json", "x-shopify-api-version": "2026-07" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { storefront } = await import("@/lib/shopify/storefront");

    await expect(storefront.request("query ShopName { shop { name } }")).resolves.toEqual({
      data: { shop: { name: "Fixture" } },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://fixture.myshopify.com/api/2026-07/graphql.json");
    expect(new Headers(init.headers).get("x-hydrogen-version")).toBe(
      "0.0.0-preview-8a708a8-20260708155454",
    );
    expect(new Headers(init.headers).get("X-Shopify-Storefront-Access-Token")).toBe(
      "fixture-token",
    );
    expect(JSON.parse(String(init.body))).toMatchObject({
      query: "query ShopName { shop { name } }",
      variables: { country: "US", language: "EN" },
    });
  });

  it("fails when Shopify silently serves a different API version", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), {
          headers: { "x-shopify-api-version": "2026-10" },
        }),
      ),
    );
    const { storefront } = await import("@/lib/shopify/storefront");

    await expect(storefront.request("query Drift { shop { name } }")).rejects.toThrow(
      "Shopify served API 2026-10; configured 2026-07",
    );
  });

  it("returns a redacted HTTP failure without reflecting a response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("sensitive upstream body", {
          status: 401,
          headers: { "x-request-id": "request-1" },
        }),
      ),
    );
    const { storefront } = await import("@/lib/shopify/storefront");

    await expect(storefront.request("query Private { shop { name } }")).rejects.toMatchObject({
      message: "Shopify Private failed with HTTP 401",
      requestId: "request-1",
      status: 401,
    });
  });
});
