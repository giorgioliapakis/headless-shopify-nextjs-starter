import { getPredictiveSearchItemUrl } from "@shopify/hydrogen";
import type {
  PredictiveSearchCollectionItem,
  PredictiveSearchProductItem,
  PredictiveSearchQueryItem,
} from "@shopify/hydrogen";

import type {
  PredictiveSearchCollection,
  PredictiveSearchProduct,
  PredictiveSearchResult,
  SearchSuggestion,
} from "@/lib/types";

import { shopifyRouteTemplates } from "../routing/templates";

interface ShopifyPredictiveImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

interface ShopifyPredictiveMoney {
  amount: string;
  currencyCode: string;
}

interface ShopifyPredictiveProduct {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  availableForSale: boolean;
  trackingParameters?: string | null;
  featuredImage: ShopifyPredictiveImage | null;
  priceRange: {
    minVariantPrice: ShopifyPredictiveMoney;
  };
  compareAtPriceRange: {
    minVariantPrice: ShopifyPredictiveMoney;
  } | null;
}

interface ShopifyPredictiveCollection {
  handle: string;
  title: string;
  trackingParameters?: string | null;
}

interface ShopifySearchQuerySuggestion {
  text: string;
  styledText: string;
  trackingParameters?: string | null;
}

export interface ShopifyPredictiveSearchResult {
  products: ShopifyPredictiveProduct[];
  collections: ShopifyPredictiveCollection[];
  queries: ShopifySearchQuerySuggestion[];
}

export function transformPredictiveSearchResult(
  data: ShopifyPredictiveSearchResult,
  term: string,
): PredictiveSearchResult {
  return {
    products: data.products.map((product) => transformPredictiveProduct(product, term)),
    collections: data.collections.map((collection) =>
      transformPredictiveCollection(collection, term),
    ),
    queries: data.queries.map(transformSearchSuggestion),
  };
}

function transformPredictiveProduct(
  product: ShopifyPredictiveProduct,
  term: string,
): PredictiveSearchProduct {
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    url: getPredictiveSearchItemUrl(
      {
        __typename: "Product",
        handle: product.handle,
        trackingParameters: product.trackingParameters ?? null,
      } as PredictiveSearchProductItem,
      { routes: shopifyRouteTemplates, term },
    ),
    featuredImage: product.featuredImage
      ? {
          url: product.featuredImage.url,
          altText: product.featuredImage.altText ?? "",
          width: product.featuredImage.width,
          height: product.featuredImage.height,
        }
      : null,
    price: product.priceRange.minVariantPrice,
    compareAtPrice: product.compareAtPriceRange?.minVariantPrice ?? undefined,
    vendor: product.vendor || undefined,
    availableForSale: product.availableForSale,
  };
}

function transformPredictiveCollection(
  collection: ShopifyPredictiveCollection,
  term: string,
): PredictiveSearchCollection {
  return {
    handle: collection.handle,
    title: collection.title,
    url: getPredictiveSearchItemUrl(
      {
        __typename: "Collection",
        handle: collection.handle,
        trackingParameters: collection.trackingParameters ?? null,
      } as PredictiveSearchCollectionItem,
      { routes: shopifyRouteTemplates, term },
    ),
  };
}

function transformSearchSuggestion(suggestion: ShopifySearchQuerySuggestion): SearchSuggestion {
  return {
    text: suggestion.text,
    styledText: suggestion.styledText,
    url: getPredictiveSearchItemUrl({
      __typename: "SearchQuerySuggestion",
      text: suggestion.text,
      trackingParameters: suggestion.trackingParameters ?? null,
    } as PredictiveSearchQueryItem),
  };
}
