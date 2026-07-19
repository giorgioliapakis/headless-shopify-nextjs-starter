"use client";

import { HandbagIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCartDrawer } from "@/components/cart/drawer-context";
import { useCart } from "@/components/cart/hydrogen";

export function CartIconClient() {
  const quantity = useCart((state) => state.data.totalQuantity);
  const { openCart } = useCartDrawer();
  const t = useTranslations("nav");

  return (
    <button
      onClick={openCart}
      className="flex items-center justify-center gap-1.5 text-foreground hover:text-foreground/80 transition-colors"
      type="button"
    >
      <span className="relative">
        <HandbagIcon className="size-5" />
        {quantity > 0 && (
          <span className="absolute -top-2 -right-1 flex size-4 items-center justify-center rounded-full bg-foreground text-xxs leading-none text-background">
            {quantity}
          </span>
        )}
      </span>
      <span className="sr-only">{t("cart")}</span>
    </button>
  );
}
