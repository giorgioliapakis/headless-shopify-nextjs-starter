import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as readiness } from "@/app/api/readiness/route";
import robots from "@/app/robots";

const SHOPIFY_ENVIRONMENT_NAMES = [
  "PRIVATE_STOREFRONT_API_TOKEN",
  "PUBLIC_CHECKOUT_DOMAIN",
  "PUBLIC_STOREFRONT_API_TOKEN",
  "PUBLIC_STOREFRONT_ID",
  "PUBLIC_STORE_DOMAIN",
  "SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  "SHOPIFY_STOREFRONT_FIXTURE",
  "SHOPIFY_STORE_DOMAIN",
] as const;

function clearShopifyEnvironment() {
  for (const name of SHOPIFY_ENVIRONMENT_NAMES) vi.stubEnv(name, "");
}

afterEach(() => vi.unstubAllEnvs());

describe("zero-credential demo runtime", () => {
  it("blocks crawlers and refuses production readiness", async () => {
    clearShopifyEnvironment();

    expect(robots()).toEqual({ rules: [{ userAgent: "*", disallow: "/" }] });
    const response = readiness();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      mode: "neutral-demo",
      status: "setup-required",
    });
  });

  it("reports ready only after the complete Shopify pair is present", async () => {
    clearShopifyEnvironment();
    vi.stubEnv("PUBLIC_STORE_DOMAIN", "merchant.myshopify.com");
    vi.stubEnv("PUBLIC_STOREFRONT_API_TOKEN", "public-token");

    const response = readiness();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ mode: "shopify", status: "ready" });
  });
});
