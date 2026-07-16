import { describe, expect, it, vi } from "vitest";

import type { StorefrontEnvironment } from "@/lib/shopify/hydrogen/env";
import { handleSafeShopifyProxyRoute } from "@/lib/shopify/routing/handler";
import {
  blockedShopifyProxyPaths,
  classifyShopifyProxyRoute,
  isKnownApplicationPath,
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
