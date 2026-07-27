"use client";

import { useTranslations } from "next-intl";

import { DiscountForm } from "@/components/cart/discount-form";
import type { StorefrontCart } from "@/components/cart/hydrogen";
import { useCart } from "@/components/cart/hydrogen";
import { CartNoteForm } from "@/components/cart/note-form";
import { hasUnavailableLines } from "@/components/cart/unavailable-lines";
import { cn, formatPrice } from "@/lib/utils";

function CheckoutLink({
  blocked,
  checkoutUrl,
  pending,
  checkoutText,
}: {
  blocked: boolean;
  checkoutUrl: string;
  pending: boolean;
  checkoutText: string;
}) {
  const baseClassName =
    "flex items-center justify-center w-full h-12 rounded-lg text-sm font-medium bg-primary text-primary-foreground transition-colors";

  return (
    <a
      href={checkoutUrl}
      aria-disabled={blocked || undefined}
      className={cn(
        baseClassName,
        "hover:bg-primary/90",
        pending && "opacity-70",
        blocked && "pointer-events-none opacity-50",
      )}
    >
      <span>{checkoutText}</span>
    </a>
  );
}

interface SummaryProps {
  /** Non-empty cart supplied by `CartView`, so the summary can never outlive the last line item. */
  cart: StorefrontCart;
  locale: string;
}

export function Summary({ cart, locale }: SummaryProps) {
  const t = useTranslations("cart");
  const tProduct = useTranslations("product");
  const blocked = hasUnavailableLines(cart);
  const pending = useCart(
    (state) =>
      state.pending.lines.size > 0 || state.pending.discountCodes.size > 0 || state.pending.note,
  );

  if (!cart.checkoutUrl) return null;

  return (
    <div className="space-y-5">
      <DiscountForm cart={cart} />
      <CartNoteForm note={cart.note} />
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-base text-muted-foreground">{t("estimatedTotal")}</span>
          <span className="text-xl font-medium text-foreground">
            <span className={cn(pending && "opacity-60")}>
              {formatPrice(cart.cost.totalAmount, locale)}
            </span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{t("taxesAndShippingNote")}</p>
      </div>

      {blocked ? (
        <p role="alert" className="text-xs text-destructive">
          {tProduct("outOfStock")}
        </p>
      ) : null}
      <CheckoutLink
        blocked={blocked}
        checkoutUrl={cart.checkoutUrl}
        pending={pending}
        checkoutText={t("completeCheckout")}
      />
    </div>
  );
}
