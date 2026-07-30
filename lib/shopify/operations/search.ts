import { gql } from "@shopify/hydrogen";

import { defaultLocale, getCountryCode, getLanguageCode } from "@/lib/i18n";
import type { PredictiveSearchResult } from "@/lib/types";

import { assertStorefrontOk } from "../errors";
import { IMAGE_FRAGMENT, MONEY_FRAGMENT } from "../fragments";
import { storefront } from "../storefront";
import {
  type ShopifyPredictiveSearchResult,
  transformPredictiveSearchResult,
} from "../transforms/search";

const PREDICTIVE_SEARCH_QUERY = gql(
  `
  query predictiveSearch($query: String!, $limit: Int!, $limitScope: PredictiveSearchLimitScope, $types: [PredictiveSearchType!], $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    predictiveSearch(
      query: $query
      limit: $limit
      limitScope: $limitScope
      types: $types
    ) {
      products {
        id
        title
        handle
        vendor
        availableForSale
        trackingParameters
        featuredImage {
          ...ImageFields
        }
        priceRange {
          minVariantPrice {
            ...MoneyFields
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            ...MoneyFields
          }
        }
      }
      collections {
        handle
        title
        trackingParameters
      }
      queries {
        text
        styledText
        trackingParameters
      }
    }
  }
`,
  [IMAGE_FRAGMENT, MONEY_FRAGMENT],
);

export async function predictiveSearch({
  limit = 4,
  locale = defaultLocale,
  query,
}: {
  limit?: number;
  locale?: string;
  query: string;
}): Promise<PredictiveSearchResult> {
  const country = getCountryCode(locale);
  const language = getLanguageCode(locale);

  const response = await storefront.request<{
    predictiveSearch: ShopifyPredictiveSearchResult;
  }>(PREDICTIVE_SEARCH_QUERY, {
    variables: {
      query,
      limit,
      limitScope: "EACH",
      types: ["PRODUCT", "COLLECTION", "QUERY"],
      country,
      language,
    },
  });
  assertStorefrontOk(response, "predictiveSearch");
  const { data } = response;

  if (!data.predictiveSearch) {
    return { products: [], collections: [], queries: [] };
  }

  return transformPredictiveSearchResult(data.predictiveSearch, query);
}
