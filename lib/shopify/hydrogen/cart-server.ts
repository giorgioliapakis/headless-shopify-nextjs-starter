import "server-only";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";

import { hydrogenCartHandlers } from "./cart-handlers";
import { createRequestStorefrontClient } from "./storefront";

export type HydrogenCartEnvelope = Awaited<ReturnType<typeof hydrogenCartHandlers.get>>["data"];

/**
 * `loaded` means the Storefront API answered — an empty cart is still `loaded`.
 * `unavailable` means the lookup failed, which must never be rendered as "your cart is empty".
 */
export type CartEnvelopeResult =
  | { data: HydrogenCartEnvelope; status: "loaded" }
  | { data: { cart: null }; status: "unavailable" };

export async function getHydrogenCartEnvelope(): Promise<HydrogenCartEnvelope> {
  const incoming = await headers();
  const requestHeaders = new Headers(incoming);
  const storefrontUrl = requestHeaders.get("x-storefront-url") ?? "http://localhost/api/cart";
  const request = new Request(storefrontUrl, { headers: requestHeaders });
  const storefrontClient = createRequestStorefrontClient(request);
  const result = await hydrogenCartHandlers.get({ request, storefrontClient });
  return result.data;
}

/**
 * Request-deduplicated so the nav badge and the `/cart` body share a single Storefront round trip.
 */
export const loadCartEnvelope = cache(async (): Promise<CartEnvelopeResult> => {
  try {
    const data = await getHydrogenCartEnvelope();
    // The handler reports a degraded Storefront response as `errors` rather than throwing.
    if (data.errors?.length) {
      console.error("[shopify] cart lookup returned errors:", data.errors);
      return { data: { cart: null }, status: "unavailable" };
    }
    return { data, status: "loaded" };
  } catch (error) {
    // Next signals "this subtree is dynamic" by throwing. Swallowing that would strand the render.
    unstable_rethrow(error);
    console.error("[shopify] cart lookup failed:", error);
    return { data: { cart: null }, status: "unavailable" };
  }
});
