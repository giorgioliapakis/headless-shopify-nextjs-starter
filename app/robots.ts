import type { MetadataRoute } from "next";

import { resolveStorefrontEnvironment } from "@/lib/shopify/hydrogen/env";
import { shopConfig } from "@/shop.config";

export default function robots(): MetadataRoute.Robots {
  if (resolveStorefrontEnvironment().mode === "neutral-demo") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/cart",
          "/account",
          "/login",
          "/search",
          "/*/cart",
          "/*/account",
          "/*/login",
          "/*/search",
          "/collections/*?*sort=",
          "/collections/*?*filter.",
          "/*/collections/*?*sort=",
          "/*/collections/*?*filter.",
        ],
      },
    ],
    sitemap: `${shopConfig.site.url}/sitemap.xml`,
  };
}
