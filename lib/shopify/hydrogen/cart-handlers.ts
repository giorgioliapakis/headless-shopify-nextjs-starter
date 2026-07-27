import "server-only";
import { createCartServerHandlers, gql } from "@shopify/hydrogen";

/**
 * `updatedAt` is required by Hydrogen analytics cart-delta deduplication.
 * `availableForSale`/`quantityAvailable` drive in-cart sold-out and quantity-cap handling.
 */
const CART_ANALYTICS_FRAGMENT = gql(`
  fragment CartFragment on Cart {
    updatedAt
    lines(first: 250) {
      nodes {
        sellingPlanAllocation {
          sellingPlan { id name }
        }
        merchandise {
          ... on ProductVariant {
            availableForSale
            currentlyNotInStock
            quantityAvailable
            price { amount currencyCode }
            product { id title vendor productType handle }
          }
        }
      }
    }
  }
`);

export const hydrogenCartHandlers = createCartServerHandlers({
  fragment: CART_ANALYTICS_FRAGMENT,
});
