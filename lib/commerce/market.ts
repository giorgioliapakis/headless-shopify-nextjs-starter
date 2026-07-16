import {
  enabledLocales,
  getCountryCode,
  getEnabledLocaleOptions,
  isEnabledLocale,
  type Locale,
} from "@/lib/i18n";

export interface StorefrontMarket {
  countryCode: string;
  label: string;
  locale: Locale;
}

export const storefrontMarkets: readonly StorefrontMarket[] = getEnabledLocaleOptions();

export function resolveStorefrontMarket(locale: string): StorefrontMarket | null {
  if (!isEnabledLocale(locale)) return null;
  return storefrontMarkets.find((market) => market.locale === locale) ?? null;
}

export function marketCacheKey(locale: string): string {
  const market = resolveStorefrontMarket(locale);
  if (!market) throw new Error("Unsupported storefront market");
  return `${market.locale}:${getCountryCode(market.locale)}`;
}

export function buildMarketReturnTo(pathname: string, search = ""): string {
  const safePathname = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
  const safeSearch = search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${safePathname}${safeSearch}`;
}

export function isMarketSwitchingEnabled(): boolean {
  return enabledLocales.length > 1;
}
