import { describe, expect, it, vi } from "vitest";

import type { StorefrontEnvironment } from "@/lib/shopify/hydrogen/env";
import { handleSafeShopifyProxyRoute } from "@/lib/shopify/routing/handler";
import {
  hardenCartCookies,
  blockedShopifyProxyPaths,
  classifyShopifyProxyRoute,
  isKnownApplicationPath,
  isSameOriginMutation,
} from "@/lib/shopify/routing/policy";
import { resolveShopifyRedirect } from "@/lib/shopify/routing/redirects";
import { shopifyRouteTemplates } from "@/lib/shopify/routing/templates";

const privateEnvironment: StorefrontEnvironment = {
  apiVersion: "2026-07",
  privateStorefrontToken: "fixture-private-token",
  publicStorefrontToken: "fixture-public-token",
  storefrontId: "0",
  storeDomain: "neutral-fixture.myshopify.com",
  usedLegacyAliases: [],
};

function redirectRequest(pathname: string): Request {
  return new Request(`https://store.example${pathname}`, {
    headers: { "x-forwarded-for": "203.0.113.10" },
  });
}

describe("Hydrogen request lifecycle", () => {
  it("uses one route manifest and canonicalizes collection-scoped PDP URLs", () => {
    expect(shopifyRouteTemplates).toEqual({ productInCollection: "/products/:productHandle" });
  });

  it.each([
    "/api/mcp",
    "/agent/session",
    "/graphiql",
    "/api/2026-07/graphql.json",
    "/cart.js",
    "/cart/add.js",
  ])("keeps %s outside the public attack surface", async (pathname) => {
    expect(classifyShopifyProxyRoute(pathname)).toBe("blocked");
    const response = await handleSafeShopifyProxyRoute(
      new Request(`https://store.example${pathname}`),
    );
    expect(response?.status).toBe(404);
    expect(response?.headers.get("cache-control")).toContain("no-store");
  });

  it("does not initialize Hydrogen for ordinary catalogue routes", async () => {
    expect(blockedShopifyProxyPaths.length).toBeGreaterThan(0);
    await expect(
      handleSafeShopifyProxyRoute(new Request("https://store.example/products/neutral-shirt")),
    ).resolves.toBeNull();
  });

  it("only classifies paths outside the explicit application manifest for redirect lookup", () => {
    for (const path of ["/", "/products/neutral-shirt", "/collections/all", "/sitemap.xml"]) {
      expect(isKnownApplicationPath(path)).toBe(true);
      expect(classifyShopifyProxyRoute(path)).toBe("next");
    }
    expect(classifyShopifyProxyRoute("/legacy-campaign")).toBe("redirect-candidate");
    expect(classifyShopifyProxyRoute("/admin")).toBe("redirect-candidate");
    expect(classifyShopifyProxyRoute("/api/cart")).toBe("cart");
  });

  it("keeps cart reads private and returns a settled empty envelope without a cookie", async () => {
    const fetchMock = vi.fn();
    const response = await handleSafeShopifyProxyRoute(
      new Request("https://store.example/api/cart"),
      { environment: privateEnvironment, fetch: fetchMock },
    );
    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toEqual({ cart: null });
    expect(response?.headers.get("cache-control")).toContain("private");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin, unsupported and oversized cart mutations before Shopify", async () => {
    const cases = [
      new Request("https://store.example/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://attacker.example" },
        body: "{}",
      }),
      new Request("https://store.example/api/cart", {
        method: "POST",
        headers: { "content-type": "text/plain", origin: "https://store.example" },
        body: "invalid",
      }),
      new Request("https://store.example/api/cart", {
        method: "POST",
        headers: {
          "content-length": "65537",
          "content-type": "application/json",
          origin: "https://store.example",
        },
        body: "{}",
      }),
    ];
    const fetchMock = vi.fn();
    const responses = await Promise.all(
      cases.map((request) =>
        handleSafeShopifyProxyRoute(request, {
          environment: privateEnvironment,
          fetch: fetchMock,
        }),
      ),
    );
    expect(responses.map((response) => response?.status)).toEqual([403, 415, 413]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts same-origin cart mutations and hardens Hydrogen's cart cookie", async () => {
    const money = { amount: "24.00", currencyCode: "USD" };
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          cartCreate: {
            cart: {
              checkoutUrl: "https://neutral-fixture.myshopify.com/checkouts/fixture",
              cost: {
                checkoutChargeAmount: money,
                subtotalAmount: money,
                totalAmount: money,
              },
              discountCodes: [],
              id: "gid://shopify/Cart/fixture-cart",
              lines: { nodes: [] },
              note: null,
              totalQuantity: 1,
              updatedAt: "2026-01-01T00:00:00Z",
            },
            userErrors: [],
            warnings: [],
          },
        },
      }),
    );
    const response = await handleSafeShopifyProxyRoute(
      new Request("https://store.example/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://store.example" },
        body: JSON.stringify({
          lines: [{ merchandiseId: "gid://shopify/ProductVariant/1001", quantity: 1 }],
        }),
      }),
      { environment: privateEnvironment, fetch: fetchMock },
    );
    expect(response?.status).toBe(200);
    expect(response?.headers.get("set-cookie")).toMatch(
      /^cart=fixture-cart; Path=\/; SameSite=Lax; Max-Age=1209600; HttpOnly; Priority=High$/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses browser-controlled same-origin evidence and preserves unrelated cookies", () => {
    expect(
      isSameOriginMutation(
        new Request("https://store.example/api/cart", {
          headers: { referer: "https://store.example/products/neutral-product" },
        }),
      ),
    ).toBe(true);
    const headers = new Headers();
    headers.append("set-cookie", "cart=fixture; Path=/; SameSite=Lax; Max-Age=1");
    headers.append("set-cookie", "preference=compact; Path=/");
    hardenCartCookies(headers, true);
    expect(headers.getSetCookie()).toEqual([
      "cart=fixture; Path=/; SameSite=Lax; Max-Age=1; HttpOnly; Secure; Priority=High",
      "preference=compact; Path=/",
    ]);
  });

  it("handles hosted-checkout fallbacks privately without a network call", async () => {
    const fetchMock = vi.fn();
    const response = await handleSafeShopifyProxyRoute(
      new Request("https://store.example/checkout"),
      { environment: privateEnvironment, fetch: fetchMock },
    );
    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe("https://store.example/");
    expect(response?.headers.get("cache-control")).toContain("private");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves Shopify URL redirects after 404 and preserves query state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: { urlRedirects: { edges: [{ node: { target: "/collections/new" } }] } },
      }),
    );
    const result = await resolveShopifyRedirect(redirectRequest("/old?utm_source=test"), {
      environment: privateEnvironment,
      fetch: fetchMock,
      isVercel: true,
    });

    expect(result).toEqual({
      location: "/collections/new?utm_source=test",
      permanent: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed for redirect loops and cross-origin URL redirect targets", async () => {
    for (const target of ["/old", "https://attacker.example/collect"]) {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          Response.json({ data: { urlRedirects: { edges: [{ node: { target } }] } } }),
        );
      await expect(
        resolveShopifyRedirect(redirectRequest("/old"), {
          environment: privateEnvironment,
          fetch: fetchMock,
          isVercel: true,
        }),
      ).resolves.toBeNull();
    }
  });

  it("resolves /admin without a Storefront round-trip", async () => {
    const fetchMock = vi.fn();
    await expect(
      resolveShopifyRedirect(redirectRequest("/admin"), {
        environment: privateEnvironment,
        fetch: fetchMock,
        isVercel: true,
      }),
    ).resolves.toEqual({
      location: "https://neutral-fixture.myshopify.com/admin",
      permanent: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("degrades to the real 404 when private redirect credentials are unavailable", async () => {
    const fetchMock = vi.fn();
    await expect(
      resolveShopifyRedirect(redirectRequest("/missing"), {
        environment: { ...privateEnvironment, privateStorefrontToken: undefined },
        fetch: fetchMock,
        isVercel: true,
      }),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
