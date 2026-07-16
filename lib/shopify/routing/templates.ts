import { createShopifyRouteTemplates } from "@shopify/hydrogen";

/**
 * The single source of truth for Shopify resource URLs.
 *
 * Product, collection and page routes use Shopify's defaults. The one explicit
 * override canonicalizes legacy collection-scoped product URLs onto the PDP.
 * Locale prefixes belong to the market layer, never in these templates.
 */
export const shopifyRouteTemplates = createShopifyRouteTemplates({
  productInCollection: "/products/:productHandle",
});
