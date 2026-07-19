"use client";

import type {
  CollectionViewPayload,
  ProductViewPayload,
  SearchViewPayload,
} from "@shopify/hydrogen";
import { useEffect } from "react";

import {
  publishCollectionView,
  publishProductView,
  publishSearchView,
} from "@/lib/analytics/client";

type RouteAnalyticsEventProps =
  | { event: "collection"; payload: Omit<CollectionViewPayload, "url"> }
  | { event: "product"; payload: Omit<ProductViewPayload, "url"> }
  | { event: "search"; payload: Omit<SearchViewPayload, "url"> };

export function RouteAnalyticsEvent({ event, payload }: RouteAnalyticsEventProps) {
  const eventKey = JSON.stringify([event, payload]);
  useEffect(() => {
    const withUrl = { ...payload, url: window.location.href };
    if (event === "product") publishProductView(withUrl as ProductViewPayload);
    else if (event === "collection") publishCollectionView(withUrl as CollectionViewPayload);
    else publishSearchView(withUrl as SearchViewPayload);
  }, [event, eventKey, payload]);
  return null;
}
