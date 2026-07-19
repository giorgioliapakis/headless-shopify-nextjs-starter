"use client";

import type { I18nConfig } from "@shopify/hydrogen";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { getCountryCode, getLanguageCode } from "@/lib/i18n";
import { shopifyRouteTemplates } from "@/lib/shopify/routing/templates";

export function ShopifyRuntime({ locale }: { locale: string }) {
  const router = useRouter();
  const navigate = useCallback((url: string) => router.push(url), [router]);

  return (
    <ShopifyScripts
      i18n={{
        country: getCountryCode(locale) as I18nConfig["country"],
        language: getLanguageCode(locale) as I18nConfig["language"],
      }}
      navigate={navigate}
      routes={shopifyRouteTemplates}
      webMcp={false}
    />
  );
}
