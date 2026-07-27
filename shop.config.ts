import { neutralHomeRecipe } from "@/config/presets/neutral-home";
import { neutralLandingRecipes } from "@/config/presets/neutral-landing";
import { neutralThemePreset } from "@/config/presets/neutral-theme";
import type { SectionRecipe } from "@/config/schema/sections";
import type { LandingPageConfig } from "@/config/schema/shop";
import type { ThemeConfig } from "@/config/schema/theme";
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
    shopify: { enabled: boolean };
    speedInsights: { enabled: boolean };
    vercel: { enabled: boolean };
  };
  navigation: {
    /** Rendered when the Shopify menu named by `menuHandles.footer` is missing or empty. */
    footer: MenuItem[];
    /** Online Store > Navigation menu handles pulled from the merchant's own store. */
    menuHandles: { footer: string; nav: string };
    /** Rendered when the Shopify menu named by `menuHandles.nav` is missing or empty. */
    nav: MenuItem[];
  };
  pdp: {
    bundles: { enabled: boolean };
    complementaryProducts: { enabled: boolean };
    relatedProducts: { enabled: boolean };
  };
  recipes: { home: SectionRecipe; landing: Record<string, LandingPageConfig> };
  site: { name: string; socialLinks: SocialLink[]; url: string };
  theme: ThemeConfig;
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
    shopify: { enabled: process.env.NEXT_PUBLIC_SHOPIFY_ANALYTICS_ENABLED === "true" },
    speedInsights: { enabled: false },
    vercel: { enabled: false },
  },
  navigation: {
    footer: [],
    // Shopify's default handles. Point these at whichever menus the store publishes.
    menuHandles: { footer: "footer", nav: "main-menu" },
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
  recipes: {
    home: neutralHomeRecipe,
    landing: neutralLandingRecipes as Record<string, LandingPageConfig>,
  },
  site: {
    name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Your Store",
    socialLinks: [],
    url: trimTrailingSlash(process.env.NEXT_PUBLIC_BASE_URL || defaultUrl),
  },
  theme: neutralThemePreset,
} satisfies ShopConfig;
