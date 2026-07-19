"use client";

import { useTranslations } from "next-intl";

import { useCart } from "@/components/cart/hydrogen";
import { OverlayItem } from "@/components/cart/overlay-item";

interface CartItemsListProps {
  locale: string;
}

export function CartItemsList({ locale }: CartItemsListProps) {
  const lines = useCart((state) => state.data.lines.nodes);
  const t = useTranslations("cart");

  return lines.length === 0 ? (
    <div className="text-center py-10">
      <p className="text-muted-foreground">{t("empty")}</p>
    </div>
  ) : (
    <ul className="space-y-5" aria-label={t("cartItemsLabel")}>
      {lines.map((item) => (
        <OverlayItem key={item.id} item={item} locale={locale} />
      ))}
    </ul>
  );
}
