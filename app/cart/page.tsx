import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CartItemsList } from "@/components/cart-page/cart-items-list";
import { Empty } from "@/components/cart-page/empty-cart";
import { Header } from "@/components/cart-page/header";
import { PageSkeleton } from "@/components/cart-page/skeletons";
import { Summary } from "@/components/cart-page/summary";
import { CartProvider } from "@/components/cart/hydrogen";
import { CartWarnings } from "@/components/cart/warnings";
import { RelatedProductsSection } from "@/components/product/related-products-section";
import { Container } from "@/components/ui/container";
import { Page } from "@/components/ui/page";
import { Sections } from "@/components/ui/sections";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/params";
import { buildAlternates } from "@/lib/seo";
import { withFallback } from "@/lib/shopify/errors";
import { getHydrogenCartEnvelope } from "@/lib/shopify/hydrogen/cart-server";
import { shopConfig } from "@/shop.config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return {
    title: t("title"),
    alternates: buildAlternates({ pathname: "/cart" }),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function CartPage() {
  const locale = await getLocale();

  return (
    <main>
      <Suspense fallback={<PageSkeleton />}>
        <CartContent locale={locale} />
      </Suspense>
    </main>
  );
}

async function CartContent({ locale }: { locale: Locale }) {
  const [cartData, messages] = await Promise.all([
    withFallback(getHydrogenCartEnvelope(), { cart: null }),
    getMessages(),
  ]);
  const cart = cartData.cart;

  return (
    <NextIntlClientProvider messages={{ cart: messages.cart }}>
      <CartProvider initialData={cartData}>
        {!cart || cart.totalQuantity === 0 ? (
          <Empty />
        ) : (
          <Page>
            <Container>
              <Sections>
                <Header />
                <CartWarnings />
                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="lg:col-span-8 xl:col-span-9">
                    <CartItemsList locale={locale} />
                  </div>
                  <aside className="lg:col-span-4 xl:col-span-3">
                    <div className="lg:sticky lg:top-20">
                      <Summary locale={locale} />
                    </div>
                  </aside>
                </div>
                {shopConfig.pdp.relatedProducts.enabled &&
                cart.lines.nodes[0]?.merchandise?.product.handle ? (
                  <RelatedProductsSection
                    handle={cart.lines.nodes[0].merchandise.product.handle}
                    limit={4}
                    locale={locale}
                  />
                ) : null}
              </Sections>
            </Container>
          </Page>
        )}
      </CartProvider>
    </NextIntlClientProvider>
  );
}
