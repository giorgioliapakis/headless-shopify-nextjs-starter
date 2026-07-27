"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type CartDrawerContextValue = {
  closeCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  setOpen: (open: boolean) => void;
};

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

/**
 * `window.Shopify.actions.openCart.configure()` is a one-time registration with no undo API, so the
 * handler must stay stable for the page lifetime. It reads this module-level slot instead of closing
 * over a React state setter that can go stale across remounts and HMR.
 */
let activeOpenCart: (() => void) | null = null;
let openCartActionConfigured = false;
let openCartActionRetryQueued = false;

const RETRY_INTERVAL_MS = 100;
const RETRY_TIMEOUT_MS = 15_000;

function configureOpenCartActionNow(): boolean {
  const openCart = typeof window === "undefined" ? undefined : window.Shopify?.actions?.openCart;
  if (!openCart) return false;
  openCart.configure({
    handler: async () => {
      activeOpenCart?.();
    },
  });
  openCartActionConfigured = true;
  return true;
}

/**
 * Standard Actions is loaded by `ShopifyScripts` asynchronously, so it is usually not on
 * `window` yet when this provider first mounts. Poll for a bounded window instead of giving up —
 * otherwise `window.Shopify.actions.openCart()` keeps the default handler and navigates to `/cart`
 * instead of opening the drawer.
 */
export function configureOpenCartAction(): void {
  if (typeof document === "undefined" || openCartActionConfigured || openCartActionRetryQueued) {
    return;
  }
  if (configureOpenCartActionNow()) return;

  openCartActionRetryQueued = true;
  const deadline = Date.now() + RETRY_TIMEOUT_MS;
  const timer = setInterval(() => {
    if (configureOpenCartActionNow() || Date.now() > deadline) {
      clearInterval(timer);
      openCartActionRetryQueued = false;
    }
  }, RETRY_INTERVAL_MS);
}

export function CartDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);

  useEffect(() => {
    activeOpenCart = openCart;
    configureOpenCartAction();
    return () => {
      if (activeOpenCart === openCart) activeOpenCart = null;
    };
  }, [openCart]);

  const value = useMemo(
    () => ({ closeCart, isOpen, openCart, setOpen }),
    [closeCart, isOpen, openCart],
  );

  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>;
}

export function useCartDrawer() {
  const context = useContext(CartDrawerContext);
  if (!context) throw new Error("useCartDrawer must be used within CartDrawerProvider");
  return context;
}
