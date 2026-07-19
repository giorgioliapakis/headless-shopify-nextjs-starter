import { describe, expect, it, vi } from "vitest";

import { inspectStorefrontConnection } from "../../../scripts/shopify/doctor-lib.mjs";

const environment = {
  PUBLIC_STORE_DOMAIN: "neutral-fixture.myshopify.com",
  PUBLIC_STOREFRONT_API_TOKEN: "fixture-public-token",
  SHOPIFY_API_VERSION: "2026-07",
};

describe("Storefront setup doctor", () => {
  it("proves the bounded read contract without returning credentials or merchant content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          data: {
            shop: { id: "gid://shopify/Shop/1", privacyPolicy: null },
            localization: { country: { isoCode: "US", currency: { isoCode: "USD" } } },
            products: { nodes: [] },
            collections: { nodes: [] },
            menu: null,
            pages: { nodes: [] },
          },
        },
        { headers: { "x-shopify-api-version": "2026-07" } },
      ),
    );
    const report = await inspectStorefrontConnection(environment, fetchMock);
    expect(report.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0];
    expect(String(request?.[0])).toBe(
      "https://neutral-fixture.myshopify.com/api/2026-07/graphql.json",
    );
    expect(String(request?.[1]?.body)).toContain("StorefrontDoctor");
    expect(JSON.stringify(report)).not.toContain("fixture-public-token");
    expect(JSON.stringify(report)).not.toContain("gid://shopify/Shop/1");
  });

  it("fails before the network for malformed or incomplete configuration", async () => {
    const fetchMock = vi.fn();
    const report = await inspectStorefrontConnection(
      {
        PUBLIC_STORE_DOMAIN: "https://store.example/path",
        PUBLIC_STOREFRONT_API_TOKEN: "",
        SHOPIFY_API_VERSION: "unstable",
      },
      fetchMock,
    );
    expect(report.ok).toBe(false);
    expect(
      report.checks.filter((check: { status: string }) => check.status === "fail"),
    ).toHaveLength(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails on GraphQL access errors and API version drift without reflecting response content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { errors: [{ message: "Access denied for secret merchant field" }] },
          { headers: { "x-shopify-api-version": "2026-10" } },
        ),
      );
    const report = await inspectStorefrontConnection(environment, fetchMock);
    expect(report.ok).toBe(false);
    expect(report.checks.map((check: { id: string }) => check.id)).toContain("storefront-graphql");
    expect(JSON.stringify(report)).not.toContain("secret merchant field");
  });
});
