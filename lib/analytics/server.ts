import "server-only";
import { gql, type ShopAnalytics } from "@shopify/hydrogen";
import { cacheLife, cacheTag } from "next/cache";

import { getCountryCode, getLanguageCode } from "@/lib/i18n";
import { assertStorefrontOk } from "@/lib/shopify/errors";
import { resolveStorefrontEnvironment } from "@/lib/shopify/hydrogen/env";
import { storefront } from "@/lib/shopify/storefront";

const SHOP_ANALYTICS_QUERY = gql(`
  query shopAnalytics($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop { id }
    localization { country { currency { isoCode } } }
  }
`);

export async function getShopAnalytics(locale: string): Promise<ShopAnalytics> {
  "use cache: remote";
  cacheLife("max");
  cacheTag("shop", "analytics-shop");

  const country = getCountryCode(locale);
  const language = getLanguageCode(locale);
  const response = await storefront.request<{
    localization: { country: { currency: { isoCode: string } } };
    shop: { id: string };
  }>(SHOP_ANALYTICS_QUERY, { variables: { country, language } });
  assertStorefrontOk(response, "shopAnalytics");

  return {
    acceptedLanguage: language,
    currency: response.data.localization.country.currency.isoCode,
    hydrogenSubchannelId: resolveStorefrontEnvironment().storefrontId,
    shopId: response.data.shop.id,
  };
}
