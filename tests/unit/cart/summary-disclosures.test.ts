import type { CartErrorGroup } from "@shopify/hydrogen";
import { describe, expect, it } from "vitest";

import {
  isDiscountSectionActive,
  isNoteSectionActive,
} from "@/components/cart/summary-disclosures";

function group(partial: Partial<CartErrorGroup> = {}): CartErrorGroup {
  return { userErrors: [], warnings: [], ...partial };
}

describe("discount disclosure", () => {
  it("stays collapsed with no codes and no errors", () => {
    expect(isDiscountSectionActive([], [])).toBe(false);
    expect(isDiscountSectionActive([], [group()])).toBe(false);
  });

  it("opens when a code is applied", () => {
    expect(isDiscountSectionActive([{ code: "WELCOME10" }], [])).toBe(true);
  });

  it("opens when applying a code failed", () => {
    const errors = [group({ userErrors: [{ code: null, message: "Invalid code" }] })];
    expect(isDiscountSectionActive([], errors)).toBe(true);
  });

  it("opens on warnings too", () => {
    const errors = [
      group({
        warnings: [{ code: "DISCOUNT_CODE_NOT_HONOURED", message: "Code cannot be honored" }],
      }),
    ];
    expect(isDiscountSectionActive([], errors)).toBe(true);
  });
});

describe("note disclosure", () => {
  it("stays collapsed for empty or whitespace notes", () => {
    expect(isNoteSectionActive(null, group())).toBe(false);
    expect(isNoteSectionActive(undefined, group())).toBe(false);
    expect(isNoteSectionActive("   ", group())).toBe(false);
  });

  it("opens when the cart has a note", () => {
    expect(isNoteSectionActive("Leave at the door", group())).toBe(true);
  });

  it("opens when saving the note failed", () => {
    const errors = group({ userErrors: [{ code: null, message: "Note too long" }] });
    expect(isNoteSectionActive(null, errors)).toBe(true);
  });
});
