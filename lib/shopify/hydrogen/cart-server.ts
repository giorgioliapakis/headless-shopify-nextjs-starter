import "server-only";
import { headers } from "next/headers";

import { hydrogenCartHandlers } from "./cart-handlers";
import { createRequestStorefrontClient } from "./storefront";

export type HydrogenCartEnvelope = Awaited<ReturnType<typeof hydrogenCartHandlers.get>>["data"];

export async function getHydrogenCartEnvelope(): Promise<HydrogenCartEnvelope> {
  const incoming = await headers();
  const requestHeaders = new Headers(incoming);
  const storefrontUrl = requestHeaders.get("x-storefront-url") ?? "http://localhost/api/cart";
  const request = new Request(storefrontUrl, { headers: requestHeaders });
  const storefrontClient = createRequestStorefrontClient(request);
  const result = await hydrogenCartHandlers.get({ request, storefrontClient });
  return result.data;
}
