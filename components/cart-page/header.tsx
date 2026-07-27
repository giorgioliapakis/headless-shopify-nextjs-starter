"use client";

import { useTranslations } from "next-intl";

import { useCart } from "@/components/cart/hydrogen";
import { useMounted } from "@/hooks/use-mounted";

export function Header({ initialTotalQuantity = 0 }: { initialTotalQuantity?: number }) {
  const t = useTranslations("cart");
  const storeCount = useCart((state) => state.data.totalQuantity);
  const storeSettled = useCart((state) => !state.loading);
  const mounted = useMounted();
  const count = mounted && storeSettled ? storeCount : initialTotalQuantity;

  return (
    <div className="flex items-center gap-2.5">
      <h1 className="text-3xl sm:text-4xl md:text-5xl">{t("shoppingCart")}</h1>
      {count > 0 && (
        <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-sm text-background">
          {count}
        </span>
      )}
    </div>
  );
}
