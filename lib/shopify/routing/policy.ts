const CART_PERMALINK = /^\/cart\/\d+:\d+(?:,\d+:\d+)*$/;
const STOREFRONT_API_PROXY = /^\/api\/(?:unstable|2\d{3}-\d{2})\/graphql\.json$/;
const AJAX_CART =
  /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/cart(?:\.(?:js|json)|\/(?:add|update|change|clear)(?:\.(?:js|json))?)$/i;

export type ShopifyProxyRoute =
  | "blocked"
  | "cart"
  | "checkout"
  | "consent"
  | "next"
  | "redirect-candidate";

const APPLICATION_ROUTE_PREFIXES = [
  "/api/draft",
  "/api/health",
  "/api/readiness",
  "/api/webhooks/shopify",
  "/blogs",
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
  if (pathname === "/api/unstable/graphql.json") return "consent";
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
  if (pathname === "/api/cart") return "cart";
  return isKnownApplicationPath(pathname) ? "next" : "redirect-candidate";
}

export function applyPrivateNoStoreHeaders(headers: Headers): void {
  headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
  headers.delete("cdn-cache-control");
  headers.delete("vercel-cdn-cache-control");
  headers.delete("surrogate-control");
}

export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const browserOrigin = origin ?? referer;
  if (!browserOrigin) return false;

  let normalizedBrowserOrigin: string;
  try {
    normalizedBrowserOrigin = new URL(browserOrigin).origin;
  } catch {
    return false;
  }

  const requestUrl = new URL(request.url);
  const acceptedOrigins = new Set([requestUrl.origin]);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProtocol ?? requestUrl.protocol.slice(0, -1);

  if (host && !host.includes(",") && (protocol === "http" || protocol === "https")) {
    try {
      const publicUrl = new URL(`${protocol}://${host}`);
      if (!publicUrl.username && !publicUrl.password && publicUrl.pathname === "/") {
        acceptedOrigins.add(publicUrl.origin);
      }
    } catch {
      // The request URL remains the only accepted origin when proxy headers are malformed.
    }
  }

  return acceptedOrigins.has(normalizedBrowserOrigin);
}

export function hardenCartCookies(headers: Headers, production: boolean): void {
  const cookies = headers.getSetCookie();
  if (cookies.length === 0) return;
  headers.delete("set-cookie");
  for (const cookie of cookies) {
    let value = cookie;
    if (/^cart=/i.test(value)) {
      if (!/;\s*HttpOnly/i.test(value)) value += "; HttpOnly";
      if (production && !/;\s*Secure/i.test(value)) value += "; Secure";
      if (!/;\s*Priority=/i.test(value)) value += "; Priority=High";
    }
    headers.append("set-cookie", value);
  }
}

export const blockedShopifyProxyPaths = [
  "/api/mcp",
  "/agent/*",
  "/graphiql",
  "/api/:version/graphql.json",
  "/cart.js and AJAX cart mutation routes",
] as const;
