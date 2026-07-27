import { describe, expect, it } from "vitest";

import { hasUnavailableLines } from "@/components/cart/unavailable-lines";
import { parseCursorParam } from "@/lib/collections/server";

type TestCart = Parameters<typeof hasUnavailableLines>[0];

function cart(merchandise: Array<Record<string, unknown> | null>): TestCart {
  return {
    lines: {
      nodes: merchandise.map((value, index) => ({ id: `line-${index}`, merchandise: value })),
    },
  } as unknown as TestCart;
}

describe("in-cart availability", () => {
  it("blocks checkout when a line's merchandise is explicitly sold out", () => {
    expect(
      hasUnavailableLines(cart([{ availableForSale: true }, { availableForSale: false }])),
    ).toBe(true);
  });

  it("treats a missing availability field as purchasable rather than sold out", () => {
    expect(hasUnavailableLines(cart([{ quantityAvailable: 3 }]))).toBe(false);
    expect(hasUnavailableLines(cart([null]))).toBe(false);
  });

  it("never blocks an empty or absent cart", () => {
    expect(hasUnavailableLines(cart([]))).toBe(false);
    expect(hasUnavailableLines(null)).toBe(false);
  });
});

describe("crawlable pagination cursor", () => {
  it("accepts a single opaque cursor", () => {
    expect(parseCursorParam("eyJsYXN0X2lkIjoxfQ==")).toBe("eyJsYXN0X2lkIjoxfQ==");
    expect(parseCursorParam(["first", "second"])).toBe("first");
  });

  it("rejects absent and oversized values instead of forwarding them to Shopify", () => {
    expect(parseCursorParam(undefined)).toBeUndefined();
    expect(parseCursorParam("")).toBeUndefined();
    expect(parseCursorParam("x".repeat(513))).toBeUndefined();
  });
});
