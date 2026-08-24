import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from "next/constants";

import { storefrontSecurityHeaders } from "./lib/security/headers";

function assertRequiredEnv() {
  const missingShopify: string[] = [];
  if (!process.env.PUBLIC_STORE_DOMAIN && !process.env.SHOPIFY_STORE_DOMAIN) {
    missingShopify.push("PUBLIC_STORE_DOMAIN");
  }
  if (!process.env.PUBLIC_STOREFRONT_API_TOKEN && !process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    missingShopify.push("PUBLIC_STOREFRONT_API_TOKEN");
  }

  if (missingShopify.length > 0) {
    throw new Error(
      `Missing required Shopify environment variables: ${missingShopify.join(", ")}. See .env.example.`,
    );
  }
}

// `/styleguide` is a builder tool, not a shopper surface. Routes written as
// `page.dev.tsx` exist while developing and are dropped from production builds,
// so a merchant never ships the design-system browser to their customers.
const developmentOnlyPageExtensions =
  process.env.NODE_ENV === "production" ? [] : ["dev.tsx", "dev.ts"];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  pageExtensions: ["tsx", "ts", "jsx", "js", ...developmentOnlyPageExtensions],
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
    return [
      {
        source: "/(.*)",
        headers: storefrontSecurityHeaders(process.env.NODE_ENV === "production"),
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
    assertRequiredEnv();
  }

  return config;
}

export default getConfig;
