import "server-only";
import { handleShopifyRoutes, parseCartRequest, type StorefrontClient } from "@shopify/hydrogen";

import { appendServerTiming } from "@/lib/observability/server-timing";
import { hydrogenCartHandlers } from "@/lib/shopify/hydrogen/cart-handlers";
import {
  hasHydrogenCartCookie,
  responseHasExpiredCart,
  withoutHydrogenCartCookie,
} from "@/lib/shopify/hydrogen/cart-recovery";
import { createRequestStorefrontClient } from "@/lib/shopify/hydrogen/storefront";
import { shopConfig } from "@/shop.config";

import { handleConsentBootstrap } from "./consent";
import {
  applyPrivateNoStoreHeaders,
  classifyShopifyProxyRoute,
  hardenCartCookies,
  isSameOriginMutation,
} from "./policy";
import { createStatelessShopifyRouteSession } from "./session";

type SafeShopifyRouteOptions = NonNullable<Parameters<typeof createRequestStorefrontClient>[1]> & {
  analyticsEnabled?: boolean;
};

export async function handleSafeShopifyProxyRoute(
  request: Request,
  options?: SafeShopifyRouteOptions,
): Promise<Response | null> {
  const startedAt = performance.now();
  const route = classifyShopifyProxyRoute(new URL(request.url).pathname);
  if (route === "next") return null;
  if (route === "redirect-candidate") return null;
  if (route === "consent") {
    return handleConsentBootstrap(request, {
      enabled: options?.analyticsEnabled ?? shopConfig.analytics.shopify.enabled,
      environment: options?.environment,
      fetch: options?.fetch,
    });
  }
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

  const response =
    route === "cart"
      ? await handleCartRoute(request, options)
      : await handleRoute(request, createRequestStorefrontClient(request, options));

  if (!response) return null;
  const mutableResponse = new Response(response.body, response);
  applyPrivateNoStoreHeaders(mutableResponse.headers);
  hardenCartCookies(mutableResponse.headers, process.env.NODE_ENV === "production");
  appendServerTiming(
    mutableResponse.headers,
    "shopify_route",
    performance.now() - startedAt,
    route,
  );
  return mutableResponse;
}

async function handleCartRoute(
  request: Request,
  options?: SafeShopifyRouteOptions,
): Promise<Response | null> {
  let effectiveRequest = request;
  const isJson = request.headers.get("content-type")?.includes("application/json") ?? false;

  // Progressive add forms redirect before their mutation payload can be inspected. Verify only this
  // low-frequency path when a cart cookie exists, then let Hydrogen create a replacement cart.
  if (!isJson && request.method === "POST" && hasHydrogenCartCookie(request)) {
    const parsed = await parseCartRequest(request.clone()).catch(() => null);
    if (parsed?.action.intent === "add") {
      const client = createRequestStorefrontClient(request, options);
      const current = await hydrogenCartHandlers.get({ request, storefrontClient: client });
      if (!current.data.cart) effectiveRequest = withoutHydrogenCartCookie(request);
    }
  }

  const retryRequest = isJson && request.method === "POST" ? request.clone() : null;
  let response = await handleRoute(
    effectiveRequest,
    createRequestStorefrontClient(effectiveRequest, options),
    true,
  );
  if (
    retryRequest &&
    hasHydrogenCartCookie(retryRequest) &&
    response &&
    (await responseHasExpiredCart(response))
  ) {
    const cleanRequest = withoutHydrogenCartCookie(retryRequest);
    response = await handleRoute(
      cleanRequest,
      createRequestStorefrontClient(cleanRequest, options),
      true,
    );
  }
  return response;
}

function handleRoute(
  request: Request,
  storefrontClient: StorefrontClient,
  cart = false,
): Promise<Response | null> {
  return handleShopifyRoutes({
    request,
    requestContext: storefrontClient.requestContext,
    sessionManager: createStatelessShopifyRouteSession(request),
    storefrontClient,
    handlers: cart ? [hydrogenCartHandlers] : undefined,
  });
}
