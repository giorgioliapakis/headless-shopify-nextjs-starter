import type { CartErrorGroup } from "@shopify/hydrogen";
import { describe, expect, it } from "vitest";

import { collectOrphanedLineMessages, isBannerDismissed } from "@/components/cart/warnings-model";

const FALLBACK = "Something went wrong updating an item that is no longer in your cart.";

function group(partial: Partial<CartErrorGroup>): CartErrorGroup {
  return { userErrors: [], warnings: [], ...partial };
}

function userError(message: string): CartErrorGroup["userErrors"][number] {
  return { code: null, message };
}

describe("orphaned line errors", () => {
  it("promotes errors for removed lines to the banner", () => {
    const lineErrors = new Map<string, CartErrorGroup>([
      ["gid://shopify/CartLine/gone", group({ userErrors: [userError("Quantity update failed")] })],
    ]);

    expect(collectOrphanedLineMessages(lineErrors, [], FALLBACK)).toEqual([
      "Quantity update failed",
    ]);
  });

  it("leaves errors alone when their line still renders inline", () => {
    const lineErrors = new Map<string, CartErrorGroup>([
      ["gid://shopify/CartLine/present", group({ userErrors: [userError("Inline error")] })],
      [
        "gid://shopify/CartLine/gone",
        group({
          warnings: [{ code: "MERCHANDISE_NOT_ENOUGH_STOCK", message: "Not enough stock" }],
        }),
      ],
    ]);
    const lines = [{ id: "gid://shopify/CartLine/present" }];

    expect(collectOrphanedLineMessages(lineErrors, lines, FALLBACK)).toEqual(["Not enough stock"]);
  });

  it("falls back to a generic message when the orphaned error has no readable text", () => {
    const lineErrors = new Map<string, CartErrorGroup>([
      ["gid://shopify/CartLine/gone", group({ userErrors: [userError("")] })],
    ]);

    expect(collectOrphanedLineMessages(lineErrors, [], FALLBACK)).toEqual([FALLBACK]);
  });

  it("surfaces nothing for empty error groups or an empty error map", () => {
    const emptyGroup = new Map<string, CartErrorGroup>([
      ["gid://shopify/CartLine/gone", group({})],
    ]);

    expect(collectOrphanedLineMessages(emptyGroup, [], FALLBACK)).toEqual([]);
    expect(collectOrphanedLineMessages(new Map(), [], FALLBACK)).toEqual([]);
  });
});

describe("banner dismissal", () => {
  it("shows the banner before any dismissal", () => {
    // A fresh mount starts with dismissedAt = 0; any recorded error has a real timestamp.
    expect(isBannerDismissed(1_700_000_000_000, 0)).toBe(false);
  });

  it("hides the banner once dismissed at the current error timestamp", () => {
    const lastUpdatedAt = 1_700_000_000_000;

    expect(isBannerDismissed(lastUpdatedAt, lastUpdatedAt)).toBe(true);
  });

  it("re-shows the banner when a newer error arrives after dismissal", () => {
    const dismissedAt = 1_700_000_000_000;
    const newerError = dismissedAt + 1;

    expect(isBannerDismissed(newerError, dismissedAt)).toBe(false);
  });

  it("keeps older errors hidden after dismissal", () => {
    expect(isBannerDismissed(1_700_000_000_000 - 5_000, 1_700_000_000_000)).toBe(true);
  });
});
