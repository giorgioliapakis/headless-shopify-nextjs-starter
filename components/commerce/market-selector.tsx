"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { buildMarketReturnTo, type StorefrontMarket } from "@/lib/commerce/market";
import { switchMarketAction } from "@/lib/commerce/market-action";

export function MarketSelector({
  currentLocale,
  markets,
}: {
  currentLocale: string;
  markets: readonly StorefrontMarket[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (markets.length < 2) return null;

  return (
    <form ref={formRef} action={switchMarketAction} className="flex items-center gap-2">
      <label htmlFor="storefront-market" className="text-sm text-muted-foreground">
        Country / region
      </label>
      <input
        type="hidden"
        name="returnTo"
        value={buildMarketReturnTo(pathname, searchParams.toString())}
      />
      <NativeSelect
        id="storefront-market"
        name="locale"
        size="sm"
        defaultValue={currentLocale}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {markets.map((market) => (
          <NativeSelectOption key={market.locale} value={market.locale}>
            {market.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </form>
  );
}
