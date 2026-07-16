import { NextResponse, type NextRequest } from "next/server";

import { classifyShopifyProxyRoute } from "@/lib/shopify/routing/policy";

export async function proxy(request: NextRequest) {
  const route = classifyShopifyProxyRoute(request.nextUrl.pathname);
  if (route === "blocked" || route === "cart" || route === "checkout") {
    const { handleSafeShopifyProxyRoute } = await import("@/lib/shopify/routing/handler");
    const response = await handleSafeShopifyProxyRoute(request);
    if (response) return response;
  }
  if (route === "redirect-candidate") {
    const [{ resolveShopifyRedirect }, { applyPrivateNoStoreHeaders }] = await Promise.all([
      import("@/lib/shopify/routing/redirects"),
      import("@/lib/shopify/routing/policy"),
    ]);
    const shopifyRedirect = await resolveShopifyRedirect(request);
    if (shopifyRedirect) {
      const response = Response.redirect(
        new URL(shopifyRedirect.location, request.url),
        shopifyRedirect.permanent ? 308 : 307,
      );
      const mutableResponse = new Response(response.body, response);
      applyPrivateNoStoreHeaders(mutableResponse.headers);
      return mutableResponse;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-storefront-url", request.url);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Known application routes take only the local header path: no Hydrogen
 * client, cookie or I/O. Only paths outside the app-owned route manifest are
 * eligible for a Shopify redirect lookup before Next renders its static 404.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico).*)"],
};
