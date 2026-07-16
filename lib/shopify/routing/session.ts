import type { handleShopifyRoutes } from "@shopify/hydrogen";

type ShopifyRouteSessionManager = Parameters<typeof handleShopifyRoutes>[0]["sessionManager"];

/**
 * Checkout/permalink handling does not use route session state. Supplying a
 * stateless implementation keeps that narrow Hydrogen handler usable without
 * introducing a storefront-wide session cookie or dynamic shell.
 */
export function createStatelessShopifyRouteSession(request: Request): ShopifyRouteSessionManager {
  return {
    getSessionOrigin: () => new URL(request.url).origin,
    getSessionItem: () => undefined,
    setSessionItem: () => undefined,
    removeSessionItem: () => undefined,
  };
}
