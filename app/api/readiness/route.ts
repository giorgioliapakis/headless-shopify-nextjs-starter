import { resolveStorefrontEnvironment } from "@/lib/shopify/hydrogen/env";

export function GET(): Response {
  try {
    const environment = resolveStorefrontEnvironment();
    if (environment.mode === "neutral-demo") {
      return Response.json(
        { mode: environment.mode, status: "setup-required" },
        { status: 503, headers: { "cache-control": "private, no-store" } },
      );
    }
    return Response.json(
      { apiVersion: environment.apiVersion, mode: environment.mode, status: "ready" },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { status: "not-ready" },
      { status: 503, headers: { "cache-control": "private, no-store" } },
    );
  }
}
