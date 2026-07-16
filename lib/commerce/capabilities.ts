import type { FeatureConfig } from "@/config/schema/features";
import { localeSwitchingEnabled } from "@/lib/i18n";
import { shopConfig } from "@/shop.config";

export type CapabilityStatus = "conditional" | "core" | "hosted" | "planned" | "unsupported";

export type CapabilityId =
  | "accounts.hosted"
  | "analytics.shopify"
  | "catalog.collections"
  | "catalog.products"
  | "catalog.variants"
  | "checkout.hosted"
  | "content.blogs"
  | "content.pages-policies"
  | "content.renderable-metaobjects"
  | "integrations.commerce-apps"
  | "markets"
  | "merchandising.bundles"
  | "merchandising.complementary-products"
  | "merchandising.recommendations"
  | "selling-plans"
  | "shopify.cart"
  | "shopify.menus"
  | "shopify.redirects"
  | "shopify.search"
  | "shopify.webhooks";

export interface CapabilityDescriptor {
  cacheClass: "none" | "private" | "shared";
  consumers: string[];
  enabled: boolean;
  id: CapabilityId;
  requiredEnvironment: string[];
  status: CapabilityStatus;
  unsupportedCases: string[];
}

export function resolveFeatureConfig(): FeatureConfig {
  return {
    accounts: { hosted: Boolean(shopConfig.accounts.url), url: shopConfig.accounts.url },
    analytics: { shopify: shopConfig.analytics.shopify.enabled },
    markets: { enabled: localeSwitchingEnabled },
    pdp: {
      bundles: shopConfig.pdp.bundles.enabled,
      complementaryProducts: shopConfig.pdp.complementaryProducts.enabled,
      relatedProducts: shopConfig.pdp.relatedProducts.enabled,
    },
    webhooks: { enabled: Boolean(process.env.SHOPIFY_WEBHOOK_SECRET) },
  };
}

export function getCapabilityManifest(
  features: FeatureConfig = resolveFeatureConfig(),
): CapabilityDescriptor[] {
  const core = (
    id: CapabilityId,
    consumers: string[],
    cacheClass: CapabilityDescriptor["cacheClass"] = "shared",
  ): CapabilityDescriptor => ({
    cacheClass,
    consumers,
    enabled: true,
    id,
    requiredEnvironment: ["PUBLIC_STORE_DOMAIN", "PUBLIC_STOREFRONT_API_TOKEN"],
    status: "core",
    unsupportedCases: [],
  });
  const conditional = (
    id: CapabilityId,
    enabled: boolean,
    consumers: string[],
    requiredEnvironment: string[] = [],
  ): CapabilityDescriptor => ({
    cacheClass: id === "analytics.shopify" ? "private" : "shared",
    consumers,
    enabled,
    id,
    requiredEnvironment,
    status: "conditional",
    unsupportedCases: [],
  });

  return [
    core("catalog.products", ["app/products/[handle]/page.tsx"]),
    core("catalog.variants", ["components/product-detail/product-detail-section.tsx"]),
    core("catalog.collections", ["app/collections/[handle]/page.tsx"]),
    core("shopify.search", ["app/search/page.tsx", "components/nav/search-modal.tsx"]),
    core("shopify.menus", ["components/nav/index.tsx", "components/footer/index.tsx"]),
    core("content.pages-policies", [
      "app/pages/[handle]/page.tsx",
      "app/policies/[handle]/page.tsx",
    ]),
    core("content.blogs", ["app/blogs/[handle]/page.tsx", "app/blogs/[handle]/[article]/page.tsx"]),
    core("shopify.cart", ["app/cart/page.tsx", "components/cart/overlay.tsx"], "private"),
    core("checkout.hosted", ["components/cart/overlay-content.tsx"], "private"),
    core("shopify.redirects", ["proxy.ts"], "private"),
    conditional(
      "shopify.webhooks",
      features.webhooks.enabled,
      ["app/api/webhooks/shopify/route.ts"],
      ["SHOPIFY_WEBHOOK_SECRET"],
    ),
    {
      cacheClass: "private",
      consumers: ["components/nav/index.tsx"],
      enabled: features.accounts.hosted,
      id: "accounts.hosted",
      requiredEnvironment: ["NEXT_PUBLIC_SHOPIFY_ACCOUNT_URL"],
      status: "hosted",
      unsupportedCases: ["Headless account sessions are a separate optional pack."],
    },
    conditional("markets", features.markets.enabled, ["components/commerce/market-selector.tsx"]),
    conditional("merchandising.bundles", features.pdp.bundles, [
      "components/product-detail/bundle-components.tsx",
    ]),
    conditional("merchandising.complementary-products", features.pdp.complementaryProducts, [
      "components/product-detail/complementary-products.tsx",
    ]),
    conditional("merchandising.recommendations", features.pdp.relatedProducts, [
      "components/product/related-products-section.tsx",
    ]),
    conditional(
      "analytics.shopify",
      features.analytics.shopify,
      ["components/shopify/analytics-tracker.tsx"],
      ["NEXT_PUBLIC_SHOPIFY_ANALYTICS_ENABLED"],
    ),
    {
      cacheClass: "shared",
      consumers: [],
      enabled: false,
      id: "selling-plans",
      requiredEnvironment: [],
      status: "planned",
      unsupportedCases: ["Subscription app contracts require a verified provider adapter."],
    },
    {
      cacheClass: "shared",
      consumers: [],
      enabled: false,
      id: "content.renderable-metaobjects",
      requiredEnvironment: [],
      status: "planned",
      unsupportedCases: ["No generic field schema is assumed for merchant metaobjects."],
    },
    {
      cacheClass: "none",
      consumers: [],
      enabled: false,
      id: "integrations.commerce-apps",
      requiredEnvironment: [],
      status: "unsupported",
      unsupportedCases: [
        "Reviews, loyalty, wishlists and app blocks require provider-specific parity evidence.",
      ],
    },
  ];
}

export function enabledCapabilityIds(features?: FeatureConfig): CapabilityId[] {
  return getCapabilityManifest(features)
    .filter((capability) => capability.enabled)
    .map((capability) => capability.id);
}
