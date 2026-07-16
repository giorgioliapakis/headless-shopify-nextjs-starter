"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type CartDrawerContextValue = {
  closeCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  setOpen: (open: boolean) => void;
};

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

export function CartDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);
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
