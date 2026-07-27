"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/hydrogen";
import { formatPrice } from "@/lib/utils";

/**
 * Screen-reader announcement for cart quantity/total changes.
 *
 * The region stays empty until the cart has settled once, for two reasons. A live region should
 * announce what changed, not read the cart out on every page load. And the browser store is
 * already populated from the cart cookie during hydration, so rendering its value immediately
 * disagrees with the server's empty render and trips a hydration mismatch.
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

  const value = pending
    ? t("updatingCart")
    : loading
      ? ""
      : `${t("itemCount", { count: totalQuantity })}. ${t("cartTotalIs")} ${formatPrice(totalAmount, locale)}`;

  // The first settled value is the cart as the page was loaded with it, so it is never spoken.
  const [initialValue, setInitialValue] = useState<string | null>(null);
  useEffect(() => {
    if (initialValue === null && !loading && !pending) setInitialValue(value);
  }, [initialValue, loading, pending, value]);

  const message = initialValue === null || value === initialValue ? "" : value;

  return (
    <p aria-live="polite" role="status" className="sr-only">
      {message}
    </p>
  );
}
