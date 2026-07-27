"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ProductCardContent,
  ProductCardImage,
  ProductCardImageContainer,
  ProductCardPrice,
  ProductCardTitle,
  ProductCard as ProductCardRoot,
} from "@/components/product-card/components";
import { Button } from "@/components/ui/button";
import type { PageInfo, ProductCard } from "@/lib/types";

interface InfiniteProductGridProps<TParams> {
  initialProducts: ProductCard[];
  initialPageInfo: PageInfo;
  locale: string;
  outOfStockText: string;
  // Top-level "use server" action; passed by reference, no closure encryption.
  loadMore: (
    params: TParams & { cursor: string },
  ) => Promise<{ products: ProductCard[]; pageInfo: PageInfo }>;
  loadMoreParams: TParams;
  children: React.ReactNode;
}

/**
 * Crawlable "next page" URL. Without JavaScript — and for crawlers that never fire
 * IntersectionObserver — this is the only way past page 1.
 */
function useNextPageHref(endCursor: string | null | undefined): string | undefined {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (!endCursor) return undefined;
  const params = new URLSearchParams(searchParams.toString());
  params.set("after", endCursor);
  return `${pathname}?${params.toString()}`;
}

export function InfiniteProductGrid<TParams>({
  initialProducts,
  initialPageInfo,
  locale,
  outOfStockText,
  loadMore,
  loadMoreParams,
  children,
}: InfiniteProductGridProps<TParams>) {
  const t = useTranslations("search");
  const tCommon = useTranslations("common");
  const [additionalProducts, setAdditionalProducts] = useState<ProductCard[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>(initialPageInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  // Live cursor pages can re-emit a boundary product if the ranking shifts mid-scroll; skip ids already shown.
  const seenIdsRef = useRef<Set<string>>(new Set(initialProducts.map((product) => product.id)));

  useEffect(() => {
    setAdditionalProducts([]);
    setPageInfo(initialPageInfo);
    setIsLoading(false);
    setHasError(false);
    loadingRef.current = false;
    seenIdsRef.current = new Set(initialProducts.map((product) => product.id));
  }, [initialProducts, initialPageInfo]);

  const handleLoadMore = useCallback(async () => {
    if (loadingRef.current || !pageInfo.hasNextPage || !pageInfo.endCursor) return;
    loadingRef.current = true;
    setIsLoading(true);
    setHasError(false);

    try {
      const result = await loadMore({ ...loadMoreParams, cursor: pageInfo.endCursor });
      const fresh = result.products.filter((product) => !seenIdsRef.current.has(product.id));
      for (const product of fresh) seenIdsRef.current.add(product.id);
      setAdditionalProducts((prev) => [...prev, ...fresh]);
      setPageInfo(result.pageInfo);
    } catch (error) {
      // Without this the sentinel stays intersecting and IntersectionObserver never re-fires,
      // so the grid would dead-end silently.
      console.error("[collections] failed to load more products:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [pageInfo, loadMore, loadMoreParams]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    // Pause auto-loading while an error is showing so the retry button owns the next attempt.
    if (!sentinel || hasError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, hasError]);

  const loadedCount = initialProducts.length + additionalProducts.length;
  const nextPageHref = useNextPageHref(pageInfo.hasNextPage ? pageInfo.endCursor : null);

  return (
    <>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {children}
        {additionalProducts.map((product) => (
          <ClientProductCard
            key={product.id}
            product={product}
            locale={locale}
            outOfStockText={outOfStockText}
          />
        ))}
      </div>

      {/* Scroll-loading progress only; the initial/filtered count is owned by `ResultsAnnouncer`. */}
      <p aria-live="polite" role="status" className="sr-only">
        {isLoading
          ? t("loadingMore")
          : additionalProducts.length > 0
            ? t("pagination.totalResults", { totalResults: String(loadedCount) })
            : ""}
      </p>

      {pageInfo.hasNextPage && (
        <div ref={sentinelRef} className="flex flex-col items-center gap-2.5 py-10">
          {isLoading && <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />}
          {hasError && (
            <div role="alert" className="flex flex-col items-center gap-2.5 text-center">
              <p className="text-sm text-muted-foreground">{t("loadMoreFailed")}</p>
              <Button variant="outline" onClick={handleLoadMore}>
                {tCommon("tryAgain")}
              </Button>
            </div>
          )}
          {nextPageHref && (
            <Link
              href={nextPageHref}
              prefetch={false}
              // Crawlable fallback: keeps page 2+ reachable without JavaScript and for crawlers.
              className={hasError || isLoading ? "text-sm underline" : "sr-only"}
            >
              {t("pagination.next")}
            </Link>
          )}
        </div>
      )}
    </>
  );
}

function ClientProductCard({
  product,
  locale,
  outOfStockText,
}: {
  product: ProductCard;
  locale: string;
  outOfStockText: string;
}) {
  const href = product.defaultVariantNumericId
    ? `/products/${product.handle}?variant=${product.defaultVariantNumericId}`
    : `/products/${product.handle}`;

  return (
    <Link href={href} prefetch={false}>
      <ProductCardRoot>
        <ProductCardImageContainer>
          <ProductCardImage
            src={product.featuredImage?.url}
            alt={product.featuredImage?.altText || product.title}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            outOfStock={!product.availableForSale}
            outOfStockText={outOfStockText}
          />
          <ProductCardContent>
            <ProductCardTitle>{product.title}</ProductCardTitle>
            <ProductCardPrice
              amount={product.price.amount}
              currencyCode={product.price.currencyCode}
              maxAmount={product.maxPrice.amount}
              compareAtAmount={product.compareAtPrice?.amount}
              compareAtCurrencyCode={product.compareAtPrice?.currencyCode}
              locale={locale}
            />
          </ProductCardContent>
        </ProductCardImageContainer>
      </ProductCardRoot>
    </Link>
  );
}
