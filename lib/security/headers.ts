const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' https://cdn.shopify.com https://shop.app https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.shopify.com",
  "font-src 'self' data: https://cdn.shopify.com",
  "connect-src 'self' https://*.myshopify.com https://cdn.shopify.com https://shop.app https://vitals.vercel-insights.com",
  "frame-src https://*.myshopify.com https://shop.app",
  "form-action 'self' https://*.myshopify.com https://shop.app",
  "media-src 'self' blob: https://cdn.shopify.com",
  "worker-src 'self' blob:",
].join("; ");

export function storefrontSecurityHeaders(production: boolean): Array<{
  key: string;
  value: string;
}> {
  const headers = [
    { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
  ];
  if (production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }
  return headers;
}
