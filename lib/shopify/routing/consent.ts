import "server-only";
import type { AnyStorefrontQueryString } from "@shopify/hydrogen";

import { resolveStorefrontEnvironment } from "@/lib/shopify/hydrogen/env";
import { createRequestStorefrontClient } from "@/lib/shopify/hydrogen/storefront";

import { applyPrivateNoStoreHeaders, isSameOriginMutation } from "./policy";

const MAX_CONSENT_BODY_BYTES = 8_192;
const CONSENT_QUERY_SOURCE =
  "query ensureCookies{consentManagement{cookies(visitorConsent:{}){cookieDomain}}}";
const CONSENT_QUERY = CONSENT_QUERY_SOURCE as AnyStorefrontQueryString;

function jsonError(message: string, status: number) {
  const response = Response.json({ error: message }, { status });
  applyPrivateNoStoreHeaders(response.headers);
  return response;
}

export async function handleConsentBootstrap(
  request: Request,
  options: {
    enabled: boolean;
    environment?: ReturnType<typeof resolveStorefrontEnvironment>;
    fetch?: typeof globalThis.fetch;
  },
): Promise<Response> {
  if (!options.enabled) return new Response("Not Found", { status: 404 });
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "POST", "cache-control": "private, no-store" },
    });
  }
  if (!isSameOriginMutation(request)) return jsonError("Forbidden", 403);
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim() !== "application/json") {
    return jsonError("Unsupported Media Type", 415);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CONSENT_BODY_BYTES) {
    return jsonError("Payload Too Large", 413);
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_CONSENT_BODY_BYTES) {
    return jsonError("Payload Too Large", 413);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return jsonError("Invalid Request", 400);
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    Object.keys(payload).length !== 1 ||
    typeof (payload as { query?: unknown }).query !== "string" ||
    (payload as { query: string }).query.replace(/\s+/g, "") !==
      CONSENT_QUERY_SOURCE.replace(/\s+/g, "")
  ) {
    return jsonError("Operation Not Allowed", 403);
  }

  try {
    const environment = options.environment ?? resolveStorefrontEnvironment();
    const storefrontClient = createRequestStorefrontClient(request, {
      environment: { ...environment, apiVersion: "unstable" },
      fetch: options.fetch,
    });
    const result = await storefrontClient.graphql(CONSENT_QUERY);
    const response = Response.json({ data: result.data, errors: result.errors });
    storefrontClient.requestContext.applyResponseHeaders(response.headers);
    applyPrivateNoStoreHeaders(response.headers);
    return response;
  } catch {
    return jsonError("Shopify consent bootstrap unavailable", 502);
  }
}
