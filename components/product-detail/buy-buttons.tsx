"use client";

import { ShopPayButton } from "@shopify/hydrogen/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useCartDrawer } from "@/components/cart/drawer-context";
import { useCart, useCartForm } from "@/components/cart/hydrogen";
import { Price } from "@/components/product/price";
import { Button } from "@/components/ui/button";
import type { Image, Money, SelectedOption, SellingPlanAllocation } from "@/lib/types";

// Keep bundle relationship arrays server-side; the client only needs their gating boolean.
export interface BuyButtonVariant {
  availableForSale: boolean;
  id: string;
  image: Image | null;
  price: Money;
  requiresBundleConfiguration: boolean;
  selectedOptions: SelectedOption[];
  sellingPlanAllocations: SellingPlanAllocation[];
  title: string;
}

export function BuyButtons({
  selectedVariant,
  availableForSale = true,
  locale,
  requiresSellingPlan = false,
}: {
  locale: string;
  requiresSellingPlan?: boolean;
  selectedVariant: BuyButtonVariant | undefined;
  availableForSale?: boolean;
}) {
  const t = useTranslations("product");
  const { formProps, register } = useCartForm();
  const { openCart } = useCartDrawer();
  const pending = useCart((state) => state.pending.lines.size > 0);
  const firstSellingPlan = selectedVariant?.sellingPlanAllocations[0];
  const [sellingPlanId, setSellingPlanId] = useState(
    requiresSellingPlan ? (firstSellingPlan?.id ?? "") : "",
  );

  if (!selectedVariant) {
    return null;
  }

  const requiresBundleConfiguration = selectedVariant.requiresBundleConfiguration;
  const isOutOfStock = !selectedVariant.availableForSale;
  const missingRequiredSellingPlan = requiresSellingPlan && !sellingPlanId;

  const getButtonText = () => {
    if (requiresBundleConfiguration) return t("bundleConfigurationRequired");
    if (missingRequiredSellingPlan) return "Purchase option unavailable";
    if (isOutOfStock) return t("outOfStock");
    return t("addToCart");
  };

  return (
    <form {...formProps({ afterSubmit: openCart })} className="grid gap-4">
      <input type="hidden" {...register("merchandiseId", { value: selectedVariant.id })} />
      <input type="hidden" {...register("quantity", { value: 1 })} />
      {selectedVariant.sellingPlanAllocations.length > 0 ? (
        <fieldset className="grid gap-2" disabled={pending}>
          <legend className="mb-1 text-sm font-medium">Purchase options</legend>
          {!requiresSellingPlan ? (
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3">
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={sellingPlanId === ""}
                  onChange={() => setSellingPlanId("")}
                  {...register("sellingPlanId", { value: "" })}
                />
                <span className="text-sm font-medium">One-time purchase</span>
              </span>
              <Price
                amount={selectedVariant.price.amount}
                currencyCode={selectedVariant.price.currencyCode}
                locale={locale}
                className="text-sm"
              />
            </label>
          ) : null}
          {selectedVariant.sellingPlanAllocations.map((allocation) => (
            <label
              key={allocation.id}
              className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3"
            >
              <span className="flex items-start gap-2">
                <input
                  type="radio"
                  checked={sellingPlanId === allocation.id}
                  onChange={() => setSellingPlanId(allocation.id)}
                  {...register("sellingPlanId", { value: allocation.id })}
                />
                <span className="grid gap-0.5 text-sm">
                  <span className="font-medium">{allocation.name}</span>
                  {allocation.description ? (
                    <span className="text-muted-foreground">{allocation.description}</span>
                  ) : null}
                </span>
              </span>
              <Price
                amount={allocation.price.amount}
                currencyCode={allocation.price.currencyCode}
                locale={locale}
                className="text-sm"
              />
            </label>
          ))}
        </fieldset>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5">
        <ShopPayButton
          variants={[{ id: selectedVariant.id, quantity: 1 }]}
          channel="hydrogen"
          disabled={
            !availableForSale ||
            isOutOfStock ||
            requiresBundleConfiguration ||
            pending ||
            Boolean(sellingPlanId) ||
            requiresSellingPlan
          }
          width="100%"
          borderRadius="8px"
          style={{ minHeight: 48 }}
        />
        <Button
          type="submit"
          disabled={isOutOfStock || requiresBundleConfiguration || missingRequiredSellingPlan}
          {...register("add")}
          className="flex-1 justify-center h-12"
        >
          {getButtonText()}
        </Button>
      </div>
    </form>
  );
}
