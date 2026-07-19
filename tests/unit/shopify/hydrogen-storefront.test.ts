import { describe, expect, it, vi } from "vitest";

import type { StorefrontEnvironment } from "@/lib/shopify/hydrogen/env";
import {
  createRequestStorefrontClient,
  createStaticStorefrontTransport,
} from "@/lib/shopify/hydrogen/storefront";

const publicEnvironment: StorefrontEnvironment = {
  apiVersion: "2026-07",
  mode: "shopify",
  publicStorefrontToken: "fixture-public-token",
  storefrontId: "0",
  storeDomain: "neutral-fixture.myshopify.com",
  usedLegacyAliases: [],
};

describe("Hydrogen Storefront client factories", () => {
  it("uses a request-independent public client and preserves the stable response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { shop: { name: "Neutral Store" } } }), {
        headers: { "x-shopify-api-version": "2026-07" },
      }),
    );
    const transport = createStaticStorefrontTransport({
      environment: publicEnvironment,
      fetch: fetchMock,
      locale: "en-AU",
    });

    expect(transport.client.type).toBe("public");
    await expect(transport.request("query Shop { shop { name } }")).resolves.toEqual({
      data: { shop: { name: "Neutral Store" } },
      errors: undefined,
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).variables).toEqual({ country: "AU", language: "EN" });
  });

  it("uses a private no-buyer-context client only with an actual private token", () => {
    const transport = createStaticStorefrontTransport({
      environment: { ...publicEnvironment, privateStorefrontToken: "fixture-private-token" },
      fetch: vi.fn(),
    });

    expect(transport.client.type).toBe("private_no_buyer_context");
  });

  it("uses private buyer context only for a trusted Vercel forwarding chain", () => {
    const environment = { ...publicEnvironment, privateStorefrontToken: "fixture-private-token" };
    const trusted = createRequestStorefrontClient(
      new Request("https://store.example/products/fixture", {
        headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
      }),
      { environment, fetch: vi.fn(), isVercel: true },
    );
    const untrusted = createRequestStorefrontClient(
      new Request("https://store.example/products/fixture", {
        headers: { "x-forwarded-for": "not-an-ip" },
      }),
      { environment, fetch: vi.fn(), isVercel: true },
    );
    const nonVercel = createRequestStorefrontClient(
      new Request("https://store.example", { headers: { "x-forwarded-for": "203.0.113.11" } }),
      { environment, fetch: vi.fn(), isVercel: false },
    );

    expect(trusted.type).toBe("private");
    expect(untrusted.type).toBe("public");
    expect(nonVercel.type).toBe("public");
  });

  it("does not share request context between simultaneous buyers", () => {
    const environment = { ...publicEnvironment, privateStorefrontToken: "fixture-private-token" };
    const first = createRequestStorefrontClient(
      new Request("https://store.example", { headers: { "x-forwarded-for": "203.0.113.12" } }),
      { environment, fetch: vi.fn(), isVercel: true },
    );
    const second = createRequestStorefrontClient(
      new Request("https://store.example", { headers: { "x-forwarded-for": "203.0.113.13" } }),
      { environment, fetch: vi.fn(), isVercel: true },
    );

    expect(first.requestContext).not.toBe(second.requestContext);
    expect(first.requestContext.requestGroupId).not.toBe(second.requestContext.requestGroupId);
  });
});
