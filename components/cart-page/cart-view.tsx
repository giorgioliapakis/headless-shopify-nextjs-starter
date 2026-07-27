"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { StorefrontCart } from "@/components/cart/hydrogen";
import { useCart } from "@/components/cart/hydrogen";
import { CartLiveRegion } from "@/components/cart/live-region";
import { OverlayItem } from "@/components/cart/overlay-item";
import { CartWarnings } from "@/components/cart/warnings";
import { Container } from "@/components/ui/container";
import { Page } from "@/components/ui/page";
import { Sections } from "@/components/ui/sections";
import { useMounted } from "@/hooks/use-mounted";

import { EmptyCart } from "./empty-cart";
import { Header } from "./header";
import { Summary } from "./summary";

interface CartViewProps {
  /** SSR snapshot, so `/cart` renders real line items before hydration and without JavaScript. */
  initialCart: StorefrontCart | null;
  locale: string;
  relatedProducts?: ReactNode;
}

export function CartView({ initialCart, locale, relatedProducts }: CartViewProps) {
  const t = useTranslations("cart");
  const storeCart = useCart((state) => state.data);
  const storeSettled = useCart((state) => !state.loading);

  // The SSR snapshot owns the markup until after mount, so hydration compares like with like.
  const mounted = useMounted();

  const cart = mounted && storeSettled ? storeCart : initialCart;
  const lines = cart?.lines.nodes ?? [];
  // A cart with lines always has an id/checkoutUrl, but narrow explicitly for the summary.
  const activeCart = lines.length > 0 && cart ? cart : null;

  return (
    <Page>
      <Container>
        <Sections>
          <Header initialTotalQuantity={initialCart?.totalQuantity ?? 0} />
          <CartWarnings />
          <CartLiveRegion locale={locale} />
          {activeCart ? (
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-8 xl:col-span-9">
                <ul className="space-y-5" aria-label={t("cartItemsLabel")}>
                  {lines.map((item) => (
                    <OverlayItem key={item.id} item={item} locale={locale} />
                  ))}
                </ul>
              </div>
              <aside className="lg:col-span-4 xl:col-span-3">
                <div className="lg:sticky lg:top-20">
                  <Summary cart={activeCart} locale={locale} />
                </div>
              </aside>
            </div>
          ) : (
            <EmptyCart />
          )}
          {activeCart ? relatedProducts : null}
        </Sections>
      </Container>
    </Page>
  );
}
