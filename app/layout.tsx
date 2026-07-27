import "./globals.css";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AnalyticsComponents } from "@/components/analytics";
import { CartDrawerProvider } from "@/components/cart/drawer-context";
import { CartProvider } from "@/components/cart/hydrogen";
import { CartOverlay } from "@/components/cart/overlay";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { SiteSchema } from "@/components/schema/site-schema";
import { ShopifyAnalyticsBoundary } from "@/components/shopify/analytics-boundary";
import { ShopifyRuntime } from "@/components/shopify/runtime";
import { themeInitScript, themeStyleSheet } from "@/config/schema/theme";
import { getLocale } from "@/lib/params";
import { buildAlternates } from "@/lib/seo";
import { shopConfig } from "@/shop.config";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, messages, t] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("accessibility"),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Merchant theme tokens for both colour schemes. Validated hex/enum values only. */}
        <style>{themeStyleSheet(shopConfig.theme)}</style>
        {/* Resolves the scheme before first paint so there is no flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-background focus:px-5 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-foreground focus:outline-none"
        >
          {t("skipToContent")}
        </a>
        <SiteSchema locale={locale} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/*
            The single browser cart store for the whole app. It stays free of `initialData` on
            purpose: the envelope needs `headers()`, and reading that outside a Suspense boundary
            would make the entire layout — every route's static shell — dynamic. Server snapshots
            are handed to the surfaces that need them (`CartIcon`, `/cart`), each inside its own
            Suspense boundary, and the store reconciles on hydration.
          */}
          <CartProvider>
            <CartDrawerProvider>
              <Nav locale={locale} />
              <main
                id="main-content"
                className="flex min-h-[calc(100dvh-var(--header-height))] min-w-0 flex-1 flex-col"
              >
                {children}
              </main>
              <Footer locale={locale} />
              <Suspense>
                <CartOverlay locale={locale} />
              </Suspense>
              {shopConfig.analytics.shopify.enabled ? (
                <Suspense>
                  <ShopifyAnalyticsBoundary locale={locale} />
                </Suspense>
              ) : null}
            </CartDrawerProvider>
          </CartProvider>
        </NextIntlClientProvider>
        <ShopifyRuntime locale={locale} />
        <AnalyticsComponents />
      </body>
    </html>
  );
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("seo");

  return {
    alternates: buildAlternates({ pathname: "/" }),
    description: t("defaultDescription", { name: shopConfig.site.name }),
    generator: shopConfig.site.name,
    metadataBase: new URL(shopConfig.site.url),
    openGraph: {
      images: [{ url: "/og-default.png", width: 1200, height: 630 }],
    },
    title: {
      default: shopConfig.site.name,
      template: `%s | ${shopConfig.site.name}`,
    },
  };
};
