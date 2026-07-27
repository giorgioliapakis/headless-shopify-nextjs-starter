"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useCartDrawer } from "./drawer-context";
import { useCart } from "./hydrogen";
import { CartLiveRegion } from "./live-region";
import { OverlayItem } from "./overlay-item";
import { OverlaySummary } from "./overlay-summary";
import { hasUnavailableLines } from "./unavailable-lines";
import { CartWarnings } from "./warnings";

interface OverlayContentProps {
  locale: string;
}

export function OverlayContent({ locale }: OverlayContentProps) {
  const router = useRouter();
  const cart = useCart((state) => state.data);
  const loading = useCart((state) => state.loading);
  const pending = useCart(
    (state) =>
      state.pending.lines.size > 0 || state.pending.discountCodes.size > 0 || state.pending.note,
  );
  const { closeCart } = useCartDrawer();
  const t = useTranslations("cart");
  const tProduct = useTranslations("product");
  const blocked = hasUnavailableLines(cart);

  if (loading && !cart.id) {
    return <div className="h-full animate-pulse bg-muted/30" aria-label={t("updatingCart")} />;
  }

  if (!cart.id || cart.lines.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-5 text-center">
        <h3 className="text-2xl mb-6">{t("empty")}</h3>
        <Button
          onClick={() => {
            closeCart();
            router.push("/");
          }}
          className="h-12 px-8"
        >
          {t("continueShopping")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <CartWarnings />
        <CartLiveRegion locale={locale} />
        <ul className="space-y-5" aria-label={t("cartItemsLabel")}>
          {cart.lines.nodes.map((item) => (
            <OverlayItem key={item.id} item={item} locale={locale} />
          ))}
        </ul>
      </div>

      <footer className="px-5 py-5 space-y-5">
        <OverlaySummary cart={cart} locale={locale} pending={pending} />

        {blocked ? (
          <p role="alert" className="text-xs text-destructive">
            {tProduct("outOfStock")}
          </p>
        ) : null}
        <Button
          render={<a href={cart.checkoutUrl ?? "/checkout"} />}
          className={cn(
            "w-full h-12 justify-center",
            pending && "opacity-70",
            blocked && "pointer-events-none opacity-50",
          )}
          aria-disabled={blocked || undefined}
          aria-label={t("proceedToCheckout")}
        >
          {t("completeCheckout")}
        </Button>
      </footer>
    </div>
  );
}
