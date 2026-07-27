import { getTranslations } from "next-intl/server";

import type { Locale } from "@/lib/i18n";
import {
  buildProductFiltersFromParams,
  fetchCollectionProducts,
  fetchSearchFacets,
  fetchSearchIndexProducts,
} from "@/lib/shopify/operations/products";
import type { ProductFilter } from "@/lib/shopify/types/filters";
import type { Collection, Filter, PriceRange } from "@/lib/types";
import { RESULTS_PER_PAGE, parseFiltersFromSearchParams } from "@/lib/utils";

// /collections/all is a local virtual collection with no Storefront API equivalent.
export const ALL_PRODUCTS_HANDLE = "all";

/** Storefront cursors are opaque base64; anything longer than this is not one. */
const MAX_CURSOR_LENGTH = 512;

export interface CollectionSearchState {
  activeFilters: Record<string, string | string[] | undefined>;
  /** Cursor from the crawlable `?after=` pagination fallback. */
  after?: string;
  sort?: string;
}

export interface CollectionResultsData {
  activeFilters: Record<string, string | string[] | undefined>;
  collection: string;
  sort?: string;
  filters: ProductFilter[];
  result: Awaited<ReturnType<typeof fetchCollectionProducts>>;
  transformedFilters: { filters: Filter[]; priceRange?: PriceRange };
}

export async function getCollectionSearchState(
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>,
): Promise<CollectionSearchState> {
  const searchParams = await searchParamsPromise;

  return {
    activeFilters: parseFiltersFromSearchParams(searchParams),
    after: parseCursorParam(searchParams.after),
    sort: getSingleSearchParam(searchParams.sort),
  };
}

export function parseCursorParam(value: string | string[] | undefined): string | undefined {
  const cursor = getSingleSearchParam(value);
  return cursor && cursor.length <= MAX_CURSOR_LENGTH ? cursor : undefined;
}

export async function getCollectionResultsData({
  handle,
  locale,
  searchStatePromise,
}: {
  handle: string;
  locale: Locale;
  searchStatePromise: Promise<CollectionSearchState>;
}): Promise<CollectionResultsData> {
  const { activeFilters, after, sort } = await searchStatePromise;
  const shopifyFilters = buildProductFiltersFromParams(activeFilters);
  const result = await fetchCollectionProducts({
    activeFilters,
    collection: handle,
    cursor: after,
    sortKey: sort,
    limit: RESULTS_PER_PAGE,
    filters: shopifyFilters,
    locale,
  });

  return {
    activeFilters,
    collection: handle,
    sort,
    filters: shopifyFilters,
    result,
    transformedFilters: { filters: result.filters, priceRange: result.priceRange },
  };
}

export function getExactCollectionResultCount({
  result,
}: {
  result: Awaited<ReturnType<typeof fetchCollectionProducts>>;
}): number | undefined {
  if (result.pageInfo.hasNextPage) {
    return undefined;
  }

  return result.products.length;
}

function getSingleSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function getAllProductsCollection(): Promise<Collection> {
  const t = await getTranslations("collections.all");
  const title = t("title");
  const description = t("description");
  return {
    handle: ALL_PRODUCTS_HANDLE,
    title,
    description,
    image: null,
    path: `/collections/${ALL_PRODUCTS_HANDLE}`,
    updatedAt: new Date(0).toISOString(),
    seo: { title, description },
  };
}

export async function getAllProductsResultsData({
  locale,
  searchStatePromise,
}: {
  locale: Locale;
  searchStatePromise: Promise<CollectionSearchState>;
}): Promise<CollectionResultsData> {
  const { activeFilters, after, sort } = await searchStatePromise;
  const shopifyFilters = buildProductFiltersFromParams(activeFilters);
  const [products, facets] = await Promise.all([
    fetchSearchIndexProducts({
      cursor: after,
      sortKey: sort,
      limit: RESULTS_PER_PAGE,
      filters: shopifyFilters,
      locale,
    }),
    fetchSearchFacets({ activeFilters, filters: shopifyFilters, locale }),
  ]);

  return {
    activeFilters,
    collection: ALL_PRODUCTS_HANDLE,
    sort,
    filters: shopifyFilters,
    result: {
      products: products.products,
      pageInfo: products.pageInfo,
      filters: facets.filters,
      priceRange: facets.priceRange,
    },
    transformedFilters: { filters: facets.filters, priceRange: facets.priceRange },
  };
}
