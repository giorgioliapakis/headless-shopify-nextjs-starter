"use client";

import { useTranslations } from "next-intl";

import { useCart } from "@/components/cart/hydrogen";
import { formatPrice } from "@/lib/utils";

/**
 * Screen-reader announcement for cart quantity/total changes. `aria-live` regions only announce
 * on content change, so rendering the current values unconditionally is correct — the initial
 * render is silent and every later mutation is spoken.
 */
export function CartLiveRegion({ locale }: { locale: string }) {
  const t = useTranslations("cart");
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const totalAmount = useCart((state) => state.data.cost.totalAmount);
  const loading = useCart((state) => state.loading);
  const pending = useCart(
    (state) =>
      state.pending.lines.size > 0 || state.pending.discountCodes.size > 0 || state.pending.note,
  );

  const message = pending
    ? t("updatingCart")
    : loading
      ? ""
      : `${t("itemCount", { count: totalQuantity })}. ${t("cartTotalIs")} ${formatPrice(totalAmount, locale)}`;

  return (
    <p aria-live="polite" role="status" className="sr-only">
      {message}
    </p>
  );
}
