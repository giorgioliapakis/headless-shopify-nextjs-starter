import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from "next/constants";

import { storefrontSecurityHeaders } from "./lib/security/headers";
import { resolveStorefrontMode } from "./lib/shopify/storefront-mode";

function validateStorefrontConfiguration() {
  resolveStorefrontMode(process.env);
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    deviceSizes: [1080, 1920],
    imageSizes: [],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        hostname: "cdn.shopify.com",
        protocol: "https",
      },
    ],
    unoptimized: !!process.env.V0_CALLBACK_URL,
  },
  reactCompiler: true,
  turbopack: { root: process.cwd() },
  async headers() {
    const headers = storefrontSecurityHeaders(process.env.NODE_ENV === "production");
    if (resolveStorefrontMode(process.env) === "neutral-demo") {
      headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" });
    }
    return [
      {
        source: "/(.*)",
        headers,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/collections/:handle",
          destination: "/md/collections/:handle",
          has: [{ type: "header", key: "accept", value: "(.*)text/markdown(.*)" }],
        },
        {
          source: "/products/:handle",
          destination: "/md/products/:handle",
          has: [{ type: "header", key: "accept", value: "(.*)text/markdown(.*)" }],
        },
        {
          source: "/search",
          destination: "/md/search",
          has: [{ type: "header", key: "accept", value: "(.*)text/markdown(.*)" }],
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

const withNextIntl = createNextIntlPlugin({
  experimental: { createMessagesDeclaration: "./lib/i18n/messages/en.json" },
  requestConfig: "./lib/i18n/request.ts",
});

const config = withNextIntl(nextConfig);

function getConfig(phase: string): NextConfig {
  // `next typegen` shares PHASE_PRODUCTION_BUILD but runs before any .env exists (create-next-app), so exclude it.
  const isTypegen = process.argv.includes("typegen");
  const isRuntime =
    phase === PHASE_DEVELOPMENT_SERVER ||
    phase === PHASE_PRODUCTION_BUILD ||
    phase === PHASE_PRODUCTION_SERVER;

  if (isRuntime && !isTypegen) {
    validateStorefrontConfiguration();
  }

  return config;
}

export default getConfig;
