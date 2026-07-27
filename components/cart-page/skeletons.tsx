import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Page } from "@/components/ui/page";
import { Sections } from "@/components/ui/sections";

export function ItemsSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-border p-5 lg:p-5 animate-pulse">
          <div className="flex gap-5 lg:gap-5">
            <div className="w-20 lg:w-24 h-20 lg:h-24 bg-accent rounded-md shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="h-4 bg-accent rounded w-3/4 mb-3" />
              <div className="h-3 bg-accent rounded w-1/2 mb-4" />
              <div className="h-4 bg-accent rounded w-1/4" />
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="h-8 bg-accent rounded w-20" />
              <div className="h-4 bg-accent rounded w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div className="border border-border p-5 animate-pulse sticky top-10">
      <div className="space-y-2.5 mb-6 pb-5 border-b border-border">
        {[1, 2].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 bg-accent rounded w-1/3" />
            <div className="h-3 bg-accent rounded w-1/4" />
          </div>
        ))}
      </div>

      <div className="flex justify-between mb-6">
        <div className="h-4 bg-accent rounded w-1/4" />
        <div className="h-4 bg-accent rounded w-1/4" />
      </div>

      <div className="h-12 bg-accent rounded w-full" />

      <div className="mt-6 pt-5 border-t border-border">
        <div className="h-4 bg-accent rounded w-1/2 mb-3" />
        <div className="h-32 bg-accent rounded" />
      </div>
    </div>
  );
}

/**
 * The cart is per-shopper, so it is always streamed in behind this fallback. `cacheComponents`
 * requires that dynamic read to sit in a Suspense boundary, and the swap from fallback to content
 * is driven by an inline script — which means that with JavaScript disabled this fallback is the
 * final render. It therefore has to be a real page with a heading and a way out, not bare
 * shimmer, and it says so in a `<noscript>`.
 */
export async function PageSkeleton() {
  const t = await getTranslations("cart");

  return (
    <Page>
      <Container>
        <Sections>
          <h1 className="text-3xl sm:text-4xl md:text-5xl">{t("shoppingCart")}</h1>
          <noscript>
            <p className="text-muted-foreground">
              {t("requiresJavaScript")}{" "}
              <Link href="/collections/all" className="underline">
                {t("continueShopping")}
              </Link>
            </p>
          </noscript>
          <div className="grid gap-5 lg:grid-cols-12" aria-hidden>
            <div className="lg:col-span-8 xl:col-span-9">
              <ItemsSkeleton />
            </div>
            <div className="lg:col-span-4 xl:col-span-3">
              <SummarySkeleton />
            </div>
          </div>
        </Sections>
      </Container>
    </Page>
  );
}
