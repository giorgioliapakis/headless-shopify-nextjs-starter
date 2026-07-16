"use client";

import {
  AnalyticsEvent,
  createStorefrontAnalytics,
  type ShopAnalytics,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let analytics: StorefrontAnalytics | null = null;
let configuredShop: ShopAnalytics | null = null;
let configuredKey = "";

export function configureAnalytics(shop: ShopAnalytics): void {
  const nextKey = JSON.stringify(shop);
  if (configuredKey && configuredKey !== nextKey) {
    analytics?.destroy();
    analytics = null;
  }
  configuredKey = nextKey;
  configuredShop = shop;
}

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined" || !configuredShop) return null;
  analytics ??= createStorefrontAnalytics({
    consent: { mode: "default-banner" },
    shop: configuredShop,
  });
  return analytics;
}
