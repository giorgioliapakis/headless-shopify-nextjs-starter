import type { MenuItem } from "@/lib/shopify/types/menu";

export type SocialPlatform =
  | "facebook"
  | "github"
  | "instagram"
  | "linkedin"
  | "pinterest"
  | "tiktok"
  | "x"
  | "youtube";

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface ShopConfig {
  accounts: { url: string | null };
  analytics: {
    speedInsights: { enabled: boolean };
    vercel: { enabled: boolean };
  };
  navigation: { footer: MenuItem[]; nav: MenuItem[] };
  pdp: {
    bundles: { enabled: boolean };
    complementaryProducts: { enabled: boolean };
    relatedProducts: { enabled: boolean };
  };
  site: { name: string; socialLinks: SocialLink[]; url: string };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

const defaultUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const shopConfig = {
  accounts: {
    url: process.env.NEXT_PUBLIC_SHOPIFY_ACCOUNT_URL
      ? trimTrailingSlash(process.env.NEXT_PUBLIC_SHOPIFY_ACCOUNT_URL)
      : null,
  },
  analytics: {
    speedInsights: { enabled: false },
    vercel: { enabled: false },
  },
  navigation: {
    footer: [],
    nav: [
      {
        id: "default-nav-shop",
        title: "Shop",
        url: "/collections/all",
        type: "HTTP",
        items: [],
      },
    ],
  },
  pdp: {
    bundles: { enabled: false },
    complementaryProducts: { enabled: false },
    relatedProducts: { enabled: false },
  },
  site: {
    name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Your Store",
    socialLinks: [],
    url: trimTrailingSlash(process.env.NEXT_PUBLIC_BASE_URL || defaultUrl),
  },
} satisfies ShopConfig;
