import { describe, expect, it } from "vitest";

import {
  hasHydrogenCartCookie,
  responseHasExpiredCart,
  withoutHydrogenCartCookie,
} from "@/lib/shopify/hydrogen/cart-recovery";

describe("Hydrogen expired-cart recovery", () => {
  it("removes only the HttpOnly Hydrogen cart identity", () => {
    const request = new Request("https://store.example/api/cart", {
      headers: { cookie: "market=en-AU; cart=expired-token; consent=yes" },
    });
    expect(hasHydrogenCartCookie(request)).toBe(true);
    expect(withoutHydrogenCartCookie(request).headers.get("cookie")).toBe(
      "market=en-AU; consent=yes",
    );
  });

  it("recognizes only Shopify's invalid expired-cart mutation shape", async () => {
    const expired = Response.json({
      cart: null,
      userErrors: [{ code: "INVALID", message: "The specified cart does not exist." }],
    });
    const invalidLine = Response.json({
      cart: null,
      userErrors: [{ code: "INVALID_MERCHANDISE_LINE", message: "Line is invalid." }],
    });
    expect(await responseHasExpiredCart(expired)).toBe(true);
    expect(await responseHasExpiredCart(invalidLine)).toBe(false);
  });

  it("does not treat malformed or non-JSON responses as recoverable", async () => {
    expect(await responseHasExpiredCart(new Response("bad gateway", { status: 502 }))).toBe(false);
    expect(hasHydrogenCartCookie(new Request("https://store.example/api/cart"))).toBe(false);
  });
});
