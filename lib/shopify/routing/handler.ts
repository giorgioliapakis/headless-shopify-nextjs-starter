import "server-only";
import { handleShopifyRoutes } from "@shopify/hydrogen";

import { hydrogenCartHandlers } from "@/lib/shopify/hydrogen/cart-handlers";
import { createRequestStorefrontClient } from "@/lib/shopify/hydrogen/storefront";

import {
  applyPrivateNoStoreHeaders,
  classifyShopifyProxyRoute,
  hardenCartCookies,
  isSameOriginMutation,
} from "./policy";
import { createStatelessShopifyRouteSession } from "./session";

export async function handleSafeShopifyProxyRoute(
  request: Request,
  options?: Parameters<typeof createRequestStorefrontClient>[1],
): Promise<Response | null> {
  const route = classifyShopifyProxyRoute(new URL(request.url).pathname);
  if (route === "next") return null;
  if (route === "redirect-candidate") return null;
  if (route === "blocked") {
    return new Response("Not Found", {
      status: 404,
      headers: { "cache-control": "private, no-store" },
    });
  }

  if (route === "cart" && request.method !== "GET") {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "GET, POST", "cache-control": "private, no-store" },
      });
    }
    if (!isSameOriginMutation(request)) {
      return new Response("Forbidden", {
        status: 403,
        headers: { "cache-control": "private, no-store" },
      });
    }
    const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
    if (contentType !== "application/json" && contentType !== "application/x-www-form-urlencoded") {
      return new Response("Unsupported Media Type", {
        status: 415,
        headers: { "cache-control": "private, no-store" },
      });
    }
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > 65_536) {
      return new Response("Payload Too Large", {
        status: 413,
        headers: { "cache-control": "private, no-store" },
      });
    }
    if ((await request.clone().arrayBuffer()).byteLength > 65_536) {
      return new Response("Payload Too Large", {
        status: 413,
        headers: { "cache-control": "private, no-store" },
      });
    }
  }

  const storefrontClient = createRequestStorefrontClient(request, options);
  const response = await handleShopifyRoutes({
    request,
    requestContext: storefrontClient.requestContext,
    sessionManager: createStatelessShopifyRouteSession(request),
    storefrontClient,
    handlers: route === "cart" ? [hydrogenCartHandlers] : undefined,
  });

  if (!response) return null;
  const mutableResponse = new Response(response.body, response);
  applyPrivateNoStoreHeaders(mutableResponse.headers);
  hardenCartCookies(mutableResponse.headers, process.env.NODE_ENV === "production");
  return mutableResponse;
}
