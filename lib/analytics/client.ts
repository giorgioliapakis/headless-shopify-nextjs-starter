"use client";

import {
  AnalyticsEvent,
  createStorefrontAnalytics,
  type CollectionViewPayload,
  type ProductViewPayload,
  type SearchViewPayload,
  type ShopAnalytics,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let analytics: StorefrontAnalytics | null = null;
let configuredShop: ShopAnalytics | null = null;
let configuredKey = "";
let pendingPublications: Array<(target: StorefrontAnalytics) => void> = [];

export function configureAnalytics(shop: ShopAnalytics): void {
  const nextKey = JSON.stringify(shop);
  if (configuredKey && configuredKey !== nextKey) {
    analytics?.destroy();
    analytics = null;
  }
  configuredKey = nextKey;
  configuredShop = shop;
  const target = getAnalytics();
  if (target) {
    const publications = pendingPublications;
    pendingPublications = [];
    for (const publish of publications) publish(target);
  }
}

export function publishProductView(payload: ProductViewPayload): void {
  publishWhenReady((target) => target.publish(AnalyticsEvent.PRODUCT_VIEWED, payload));
}

export function publishCollectionView(payload: CollectionViewPayload): void {
  publishWhenReady((target) => target.publish(AnalyticsEvent.COLLECTION_VIEWED, payload));
}

export function publishSearchView(payload: SearchViewPayload): void {
  publishWhenReady((target) => target.publish(AnalyticsEvent.SEARCH_VIEWED, payload));
}

function publishWhenReady(publication: (target: StorefrontAnalytics) => void): void {
  const target = getAnalytics();
  if (target) publication(target);
  else pendingPublications.push(publication);
}

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined" || !configuredShop) return null;
  analytics ??= createStorefrontAnalytics({
    consent: { mode: "default-banner" },
    shop: configuredShop,
  });
  return analytics;
}
