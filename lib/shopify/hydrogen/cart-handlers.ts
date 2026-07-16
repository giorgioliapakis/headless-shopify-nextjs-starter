import "server-only";
import { createCartServerHandlers, gql } from "@shopify/hydrogen";

/** `updatedAt` is required by Hydrogen analytics cart-delta deduplication. */
const CART_ANALYTICS_FRAGMENT = gql(`
  fragment CartFragment on Cart {
    updatedAt
  }
`);

export const hydrogenCartHandlers = createCartServerHandlers({
  fragment: CART_ANALYTICS_FRAGMENT,
});
