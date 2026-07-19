import "server-only";
import { handleShopifyRedirects } from "@shopify/hydrogen";

import { resolveStorefrontEnvironment } from "@/lib/shopify/hydrogen/env";
import { createRequestPrivateStorefrontClient } from "@/lib/shopify/hydrogen/storefront";

import { shopifyRouteTemplates } from "./templates";

export interface ResolvedShopifyRedirect {
  location: string;
  permanent: boolean;
}

function safeRedirectLocation(request: Request, location: string): string | null {
  const source = new URL(request.url);
  let target: URL;
  try {
    target = new URL(location, source);
  } catch {
    return null;
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") return null;
  const isAdminHandoff = source.pathname === "/admin";
  if (!isAdminHandoff && target.origin !== source.origin) return null;

  const sameDestination =
    target.origin === source.origin &&
    target.pathname.replace(/\/+$/, "") === source.pathname.replace(/\/+$/, "") &&
    target.search === source.search;
  if (sameDestination) return null;

  return target.origin === source.origin
    ? `${target.pathname}${target.search}${target.hash}`
    : target.toString();
}

export async function resolveShopifyRedirect(
  request: Request,
  options?: Parameters<typeof createRequestPrivateStorefrontClient>[1],
): Promise<ResolvedShopifyRedirect | null> {
  const source = new URL(request.url);

  // /admin is deterministic and does not justify a Storefront API round-trip.
  if (source.pathname === "/admin") {
    const environment = options?.environment ?? resolveStorefrontEnvironment();
    return {
      location: `https://${environment.storeDomain}/admin`,
      permanent: true,
    };
  }

  const storefrontClient = createRequestPrivateStorefrontClient(request, options);
  if (!storefrontClient) return null;

  const response = await handleShopifyRedirects({
    request,
    routeTemplates: shopifyRouteTemplates,
    storefrontClient,
  });
  const location = response?.headers.get("location");
  if (!response || !location || response.status < 300 || response.status >= 400) return null;

  const safeLocation = safeRedirectLocation(request, location);
  if (!safeLocation) return null;
  return { location: safeLocation, permanent: response.status === 301 || response.status === 308 };
}
