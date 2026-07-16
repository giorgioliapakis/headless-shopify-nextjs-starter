import { resolveStorefrontEnvironment } from "@/lib/shopify/hydrogen/env";

export function GET(): Response {
  try {
    const environment = resolveStorefrontEnvironment();
    return Response.json(
      { apiVersion: environment.apiVersion, status: "ready" },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { status: "not-ready" },
      { status: 503, headers: { "cache-control": "private, no-store" } },
    );
  }
}
