import type { CartErrorGroup } from "@shopify/hydrogen";

function hasMessages(groups: Iterable<CartErrorGroup>): boolean {
  for (const group of groups) {
    if (group.userErrors.length > 0 || group.warnings.length > 0) {
      return true;
    }
  }
  return false;
}

/** The drawer's discount disclosure should be open when codes are applied or errored. */
export function isDiscountSectionActive(
  discountCodes: readonly { code: string }[],
  errorGroups: Iterable<CartErrorGroup>,
): boolean {
  return discountCodes.length > 0 || hasMessages(errorGroups);
}

/** The drawer's note disclosure should be open when a note exists or saving it failed. */
export function isNoteSectionActive(
  note: string | null | undefined,
  errors: CartErrorGroup,
): boolean {
  return Boolean(note && note.trim().length > 0) || hasMessages([errors]);
}
