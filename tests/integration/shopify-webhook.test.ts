import crypto from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag }));

import {
  cacheTagsForShopifyWebhook,
  POST,
  verifyShopifyWebhook,
} from "@/app/api/webhooks/shopify/route";

const body = JSON.stringify({
  admin_graphql_api_id: "gid://shopify/Product/123",
  handle: "neutral-shirt",
});
const secret = "fixture-webhook-secret";

function signature(value: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("base64");
}

function webhookRequest(overrides: Record<string, string> = {}): Request {
  return new Request("https://store.example/api/webhooks/shopify", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-shopify-api-version": "2026-07",
      "x-shopify-hmac-sha256": signature(body),
      "x-shopify-shop-domain": "neutral-fixture.myshopify.com",
      "x-shopify-topic": "products/update",
      "x-shopify-webhook-id": "00000000-0000-4000-8000-000000000000",
      ...overrides,
    },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  revalidateTag.mockClear();
});

describe("Shopify webhook boundary", () => {
  it("compares the raw body HMAC without throwing on malformed input", () => {
    const bytes = new TextEncoder().encode(body);
    expect(verifyShopifyWebhook(bytes, signature(body), secret)).toBe(true);
    expect(verifyShopifyWebhook(bytes, "not-base64!", secret)).toBe(false);
    expect(verifyShopifyWebhook(bytes, null, secret)).toBe(false);
  });

  it("maps product, collection and article changes to bounded cache tags", () => {
    expect(
      cacheTagsForShopifyWebhook("products/update", {
        handle: "neutral-shirt",
        id: 123,
      }),
    ).toEqual([
      "products",
      "product-neutral-shirt",
      "recommendations-neutral-shirt",
      "product-123",
    ]);
    expect(cacheTagsForShopifyWebhook("collections/create", { handle: "new-arrivals" })).toEqual([
      "collections",
      "collections-index",
      "collection-new-arrivals",
    ]);
    expect(
      cacheTagsForShopifyWebhook("articles/update", {
        blog_handle: "journal",
        handle: "neutral-article",
      }),
    ).toEqual(["blogs", "blog-journal", "article-journal-neutral-article"]);
  });

  it("fails closed when the endpoint is not configured", async () => {
    const response = await POST(webhookRequest());
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("authenticates shop, topic, version and ID before invalidating", async () => {
    vi.stubEnv("SHOPIFY_WEBHOOK_SECRET", secret);
    vi.stubEnv("PUBLIC_STORE_DOMAIN", "neutral-fixture.myshopify.com");
    vi.stubEnv("SHOPIFY_API_VERSION", "2026-07");

    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);
    expect(revalidateTag.mock.calls).toEqual([
      ["products", "max"],
      ["product-neutral-shirt", "max"],
      ["recommendations-neutral-shirt", "max"],
      ["product-123", "max"],
    ]);
  });

  it("rejects a signed request from a different shop", async () => {
    vi.stubEnv("SHOPIFY_WEBHOOK_SECRET", secret);
    vi.stubEnv("PUBLIC_STORE_DOMAIN", "neutral-fixture.myshopify.com");
    const response = await POST(
      webhookRequest({ "x-shopify-shop-domain": "attacker.myshopify.com" }),
    );
    expect(response.status).toBe(403);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
