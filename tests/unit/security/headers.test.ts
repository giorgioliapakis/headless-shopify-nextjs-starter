import { describe, expect, it } from "vitest";

import { appendServerTiming } from "@/lib/observability/server-timing";
import { storefrontSecurityHeaders } from "@/lib/security/headers";

describe("storefront response security", () => {
  it("ships a restrictive storefront CSP and production transport policy", () => {
    const headers = new Map(
      storefrontSecurityHeaders(true).map(({ key, value }) => [key.toLowerCase(), value]),
    );
    expect(headers.get("content-security-policy")).toContain("object-src 'none'");
    expect(headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("content-security-policy")).toContain(
      "font-src 'self' data: https://cdn.shopify.com",
    );
    expect(headers.get("content-security-policy")).not.toContain("unsafe-eval");
    expect(headers.get("strict-transport-security")).toContain("includeSubDomains");
    expect(headers.get("permissions-policy")).toContain("camera=()");
  });

  it("does not force HSTS in local development", () => {
    expect(
      storefrontSecurityHeaders(false).some(({ key }) => key === "Strict-Transport-Security"),
    ).toBe(false);
  });

  it("allows eval only in development, where React's dev build requires it", () => {
    const development = new Map(
      storefrontSecurityHeaders(false).map(({ key, value }) => [key.toLowerCase(), value]),
    );
    expect(development.get("content-security-policy")).toContain("'unsafe-eval'");
    // Every other guarantee must hold identically in both environments.
    expect(development.get("content-security-policy")).toContain("object-src 'none'");
    expect(development.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("appends bounded Server-Timing values without identifiers", () => {
    const headers = new Headers({ "server-timing": "app;dur=1.0" });
    appendServerTiming(headers, "shopify_route", 12.345, 'cart";token=secret');
    expect(headers.get("server-timing")).toBe(
      'app;dur=1.0, shopify_route;dur=12.3;desc="carttokensecret"',
    );
  });
});
