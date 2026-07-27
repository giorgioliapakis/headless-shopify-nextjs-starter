import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CartUnavailable } from "@/components/cart-page/cart-unavailable";
import { CartView } from "@/components/cart-page/cart-view";
import { PageSkeleton } from "@/components/cart-page/skeletons";
import { RelatedProductsSection } from "@/components/product/related-products-section";
import { Container } from "@/components/ui/container";
import { Page } from "@/components/ui/page";
import { Sections } from "@/components/ui/sections";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/params";
import { buildAlternates } from "@/lib/seo";
import { loadCartEnvelope } from "@/lib/shopify/hydrogen/cart-server";
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
    <Suspense fallback={<PageSkeleton />}>
      <CartContent locale={locale} />
    </Suspense>
  );
}

async function CartContent({ locale }: { locale: Locale }) {
  const [result, t] = await Promise.all([loadCartEnvelope(), getTranslations("cart")]);

  // A failed lookup is not an empty cart — render an explicit error/retry surface instead.
  if (result.status === "unavailable") {
    return (
      <Page>
        <Container>
          <Sections>
            <h1 className="text-3xl sm:text-4xl md:text-5xl">{t("shoppingCart")}</h1>
            <CartUnavailable />
          </Sections>
        </Container>
      </Page>
    );
  }

  const cart = result.data.cart;
  const firstLineHandle = cart?.lines.nodes[0]?.merchandise?.product.handle;

  return (
    <CartView
      initialCart={cart}
      locale={locale}
      relatedProducts={
        shopConfig.pdp.relatedProducts.enabled && firstLineHandle ? (
          <RelatedProductsSection handle={firstLineHandle} limit={4} locale={locale} />
        ) : null
      }
    />
  );
}
