import "server-only";
import { isIP } from "node:net";

import { createShopifyRequestContext, type I18nConfig } from "@shopify/hydrogen";

import { defaultLocale, getCountryCode, getLanguageCode } from "@/lib/i18n";

export function storefrontI18n(
  locale: string = defaultLocale,
  overrides?: Partial<Pick<I18nConfig, "country" | "language">>,
) {
  return {
    country: overrides?.country ?? (getCountryCode(locale) as I18nConfig["country"]),
    language: overrides?.language ?? (getLanguageCode(locale) as I18nConfig["language"]),
  };
}

export function createStaticShopifyRequestContext(
  locale: string = defaultLocale,
  i18n?: Partial<Pick<I18nConfig, "country" | "language">>,
) {
  return createShopifyRequestContext({
    request: { headers: new Headers() },
    i18n: storefrontI18n(locale, i18n),
  });
}

export function createIncomingShopifyRequestContext(
  request: Request,
  locale: string = defaultLocale,
) {
  return createShopifyRequestContext({ request, i18n: storefrontI18n(locale) });
}

export function resolveTrustedBuyerIp(
  headers: Headers,
  options: { isVercel?: boolean } = {},
): string | undefined {
  if (!options.isVercel) return undefined;
  const candidate = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return candidate && isIP(candidate) ? candidate : undefined;
}
