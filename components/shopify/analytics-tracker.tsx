"use client";

import type {
  AnalyticsCart,
  AnalyticsCartLine,
  CartLine,
  CartLineMerchandise,
  MoneyV2,
  ShopAnalytics,
} from "@shopify/hydrogen";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { useCartDrawer } from "@/components/cart/drawer-context";
import { useCart } from "@/components/cart/hydrogen";
import { AnalyticsEvent, configureAnalytics, getAnalytics } from "@/lib/analytics/client";

type AnalyticsMerchandise = CartLineMerchandise & {
  price?: MoneyV2;
  sku?: string | null;
  product: CartLineMerchandise["product"] & {
    id?: string;
    productType?: string;
    vendor?: string;
  };
};

const LOCATION_EVENT = "storefront:location-change";
let historyInstrumented = false;

function instrumentHistory() {
  if (historyInstrumented) return;
  historyInstrumented = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method];
    window.history[method] = function (...args) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event(LOCATION_EVENT));
      return result;
    };
  }
}

function subscribeToLocation(listener: () => void) {
  instrumentHistory();
  window.addEventListener(LOCATION_EVENT, listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener(LOCATION_EVENT, listener);
    window.removeEventListener("popstate", listener);
  };
}

function getLocationSnapshot() {
  return `${window.location.pathname}${window.location.search}`;
}

function toAnalyticsCartLine(line: CartLine): AnalyticsCartLine | null {
  const merchandise = line.merchandise as AnalyticsMerchandise | undefined;
  const price = merchandise?.price;
  const product = merchandise?.product;
  if (!merchandise || !price || !product?.id || !product.title || !product.vendor) return null;
  return {
    id: line.id,
    merchandise: {
      id: merchandise.id,
      price,
      product: {
        handle: product.handle,
        id: String(product.id),
        productType: product.productType ? String(product.productType) : undefined,
        title: product.title,
        vendor: String(product.vendor),
      },
      sku: merchandise.sku ? String(merchandise.sku) : null,
      title: merchandise.title ?? product.title,
    },
    quantity: line.quantity,
  };
}

export function ShopifyAnalyticsTracker({ shop }: { shop: ShopAnalytics }) {
  const pathname = usePathname();
  const pageKey = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, () => "");
  const cart = useCart((state) => state.data);
  const pending = useCart(
    (state) =>
      state.loading ||
      state.pending.lines.size > 0 ||
      state.pending.discountCodes.size > 0 ||
      state.pending.note,
  );
  const { isOpen } = useCartDrawer();
  const lastCartView = useRef("");

  const analyticsCart = useMemo<AnalyticsCart | null>(() => {
    const lines = cart.lines.nodes
      .map(toAnalyticsCartLine)
      .filter((line): line is AnalyticsCartLine => line !== null);
    return cart.id && typeof cart.updatedAt === "string" && lines.length === cart.lines.nodes.length
      ? { id: cart.id, lines: { nodes: lines }, updatedAt: cart.updatedAt }
      : null;
  }, [cart]);

  useEffect(() => {
    configureAnalytics(shop);
    getAnalytics()?.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [pageKey, shop]);

  useEffect(() => {
    if (pending) return;
    getAnalytics()?.updateCart(analyticsCart);
  }, [analyticsCart, pending]);

  useEffect(() => {
    if (pending || (!isOpen && pathname !== "/cart")) return;
    const viewKey = `${pathname}:${isOpen}:${analyticsCart?.updatedAt ?? "empty"}`;
    if (lastCartView.current === viewKey) return;
    lastCartView.current = viewKey;
    getAnalytics()?.publish(AnalyticsEvent.CART_VIEWED, {
      cart: analyticsCart,
      prevCart: null,
    });
  }, [analyticsCart, isOpen, pathname, pending]);

  return null;
}
