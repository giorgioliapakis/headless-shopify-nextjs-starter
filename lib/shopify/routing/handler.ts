import "server-only";
import { handleShopifyRoutes } from "@shopify/hydrogen";

import { createRequestStorefrontClient } from "@/lib/shopify/hydrogen/storefront";

import { applyPrivateNoStoreHeaders, classifyShopifyProxyRoute } from "./policy";
import { createStatelessShopifyRouteSession } from "./session";

export async function handleSafeShopifyProxyRoute(
  request: Request,
  options?: Parameters<typeof createRequestStorefrontClient>[1],
): Promise<Response | null> {
  const route = classifyShopifyProxyRoute(new URL(request.url).pathname);
  if (route === "next") return null;
  if (route === "blocked") {
    return new Response("Not Found", {
      status: 404,
      headers: { "cache-control": "private, no-store" },
    });
  }

  const storefrontClient = createRequestStorefrontClient(request, options);
  const response = await handleShopifyRoutes({
    request,
    requestContext: storefrontClient.requestContext,
    sessionManager: createStatelessShopifyRouteSession(request),
    storefrontClient,
  });

  if (!response) return null;
  const mutableResponse = new Response(response.body, response);
  applyPrivateNoStoreHeaders(mutableResponse.headers);
  return mutableResponse;
}
