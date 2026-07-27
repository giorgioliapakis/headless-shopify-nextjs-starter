import type { StorefrontCart } from "./hydrogen";

/**
 * Shopify rejects checkout for sold-out merchandise, so the storefront must surface it in-cart.
 * `availableForSale` is optional in the response — only an explicit `false` is treated as sold out.
 */
export function hasUnavailableLines(cart: StorefrontCart | null | undefined): boolean {
  return Boolean(cart?.lines.nodes.some((line) => line.merchandise?.availableForSale === false));
}
