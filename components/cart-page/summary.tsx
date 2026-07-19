"use client";

import { useTranslations } from "next-intl";

import { DiscountForm } from "@/components/cart/discount-form";
import { useCart } from "@/components/cart/hydrogen";
import { CartNoteForm } from "@/components/cart/note-form";
import { cn, formatPrice } from "@/lib/utils";

function CheckoutLink({
  checkoutUrl,
  demo,
  pending,
  checkoutText,
}: {
  checkoutUrl: string;
  demo: boolean;
  pending: boolean;
  checkoutText: string;
}) {
  const baseClassName =
    "flex items-center justify-center w-full h-12 rounded-lg text-sm font-medium bg-primary text-primary-foreground transition-colors";

  if (demo) {
    return (
      <span aria-disabled="true" className={cn(baseClassName, "cursor-not-allowed opacity-60")}>
        {checkoutText}
      </span>
    );
  }

  return (
    <a
      href={checkoutUrl}
      className={cn(baseClassName, "hover:bg-primary/90", pending && "opacity-70")}
    >
      <span>{checkoutText}</span>
    </a>
  );
}

interface SummaryProps {
  demo: boolean;
  locale: string;
}

export function Summary({ demo, locale }: SummaryProps) {
  const t = useTranslations("cart");
  const cart = useCart((state) => state.data);
  const pending = useCart(
    (state) =>
      state.pending.lines.size > 0 || state.pending.discountCodes.size > 0 || state.pending.note,
  );

  if (!cart.id) return null;

  return (
    <div className="space-y-5">
      <DiscountForm cart={cart} locale={locale} />
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

      <CheckoutLink
        checkoutUrl={cart.checkoutUrl}
        demo={demo}
        pending={pending}
        checkoutText={demo ? t("demoCheckoutDisabled") : t("completeCheckout")}
      />
    </div>
  );
}
