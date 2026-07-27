"use client";

import type { CartData } from "@shopify/hydrogen";
import { useTranslations } from "next-intl";

import { DiscountForm } from "@/components/cart/discount-form";
import { CartNoteForm } from "@/components/cart/note-form";
import { Price } from "@/components/product/price";
import { cn } from "@/lib/utils";

interface OverlaySummaryProps {
  cart: CartData;
  locale: string;
  pending: boolean;
}

export function OverlaySummary({ cart, locale, pending }: OverlaySummaryProps) {
  const t = useTranslations("cart");

  return (
    <div className="grid gap-2.5">
      <DiscountForm cart={cart} />
      <CartNoteForm note={cart.note} />
      <div aria-label={t("estimatedTotal")}>
        <div className="flex items-baseline justify-between">
          <span className="text-base text-muted-foreground">{t("estimatedTotal")}</span>
          <Price
            amount={cart.cost.totalAmount.amount}
            currencyCode={cart.cost.totalAmount.currencyCode}
            locale={locale}
            className={cn("text-xl font-medium text-foreground", pending && "opacity-60")}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{t("taxesAndShippingNote")}</p>
      </div>
    </div>
  );
}
