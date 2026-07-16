import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { applyPrivateNoStoreHeaders } from "@/lib/shopify/routing/policy";

describe("commerce cache isolation", () => {
  it("removes every shared-cache directive from personalized responses", () => {
    const headers = new Headers({
      "cache-control": "public, s-maxage=3600",
      "cdn-cache-control": "public, max-age=3600",
      "surrogate-control": "max-age=3600",
      "vercel-cdn-cache-control": "public, max-age=3600",
    });
    applyPrivateNoStoreHeaders(headers);

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
    expect(headers.get("cdn-cache-control")).toBeNull();
    expect(headers.get("surrogate-control")).toBeNull();
    expect(headers.get("vercel-cdn-cache-control")).toBeNull();
  });

  it("keeps Hydrogen transport and cart mutations outside Cache Components", async () => {
    const [storefront, cart] = await Promise.all([
      readFile("lib/shopify/hydrogen/storefront.ts", "utf8"),
      readFile("lib/shopify/hydrogen/cart-handlers.ts", "utf8"),
    ]);

    expect(storefront).not.toMatch(/\bcache\s*:/);
    expect(cart).not.toMatch(/["']use cache(?:: remote)?["']/);
  });
});
