const CART_PERMALINK = /^\/cart\/\d+:\d+(?:,\d+:\d+)*$/;
const STOREFRONT_API_PROXY = /^\/api\/(?:unstable|2\d{3}-\d{2})\/graphql\.json$/;
const AJAX_CART =
  /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/cart(?:\.(?:js|json)|\/(?:add|update|change|clear)(?:\.(?:js|json))?)$/i;

export type ShopifyProxyRoute = "blocked" | "checkout" | "next" | "redirect-candidate";

const APPLICATION_ROUTE_PREFIXES = [
  "/api/draft",
  "/api/webhooks/shopify",
  "/cart",
  "/collections",
  "/llms.txt",
  "/md",
  "/og-default.png",
  "/pages",
  "/policies",
  "/products",
  "/robots.txt",
  "/search",
  "/sitemap",
  "/sitemap.xml",
] as const;

export function isKnownApplicationPath(pathname: string): boolean {
  if (pathname === "/" || /\/[^/]+\.[A-Za-z0-9]+$/.test(pathname)) return true;
  return APPLICATION_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Keep preview-only and unbounded proxy surfaces closed. We can promote one of
 * these routes later only with an independently tested capability adapter.
 */
export function classifyShopifyProxyRoute(pathname: string): ShopifyProxyRoute {
  if (
    pathname === "/api/mcp" ||
    pathname.startsWith("/agent/") ||
    pathname === "/graphiql" ||
    STOREFRONT_API_PROXY.test(pathname) ||
    AJAX_CART.test(pathname)
  ) {
    return "blocked";
  }

  if (pathname === "/checkout" || CART_PERMALINK.test(pathname)) return "checkout";
  return isKnownApplicationPath(pathname) ? "next" : "redirect-candidate";
}

export function applyPrivateNoStoreHeaders(headers: Headers): void {
  headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
  headers.delete("cdn-cache-control");
  headers.delete("vercel-cdn-cache-control");
  headers.delete("surrogate-control");
}

export const blockedShopifyProxyPaths = [
  "/api/mcp",
  "/agent/*",
  "/graphiql",
  "/api/:version/graphql.json",
  "/cart.js and AJAX cart mutation routes",
] as const;
