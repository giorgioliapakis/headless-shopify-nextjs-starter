"use client";

import { ShopPayButton } from "@shopify/hydrogen/react";
import { useTranslations } from "next-intl";

import { useCartDrawer } from "@/components/cart/drawer-context";
import { useCart, useCartForm } from "@/components/cart/hydrogen";
import { Button } from "@/components/ui/button";
import type { Image, Money, SelectedOption } from "@/lib/types";

// Keep bundle relationship arrays server-side; the client only needs their gating boolean.
export interface BuyButtonVariant {
  availableForSale: boolean;
  id: string;
  image: Image | null;
  price: Money;
  requiresBundleConfiguration: boolean;
  selectedOptions: SelectedOption[];
  title: string;
}

export function BuyButtons({
  selectedVariant,
  availableForSale = true,
}: {
  selectedVariant: BuyButtonVariant | undefined;
  availableForSale?: boolean;
}) {
  const t = useTranslations("product");
  const { formProps, register } = useCartForm();
  const { openCart } = useCartDrawer();
  const pending = useCart((state) => state.pending.lines.size > 0);

  if (!selectedVariant) {
    return null;
  }

  const requiresBundleConfiguration = selectedVariant.requiresBundleConfiguration;
  const isOutOfStock = !selectedVariant.availableForSale;

  const getButtonText = () => {
    if (requiresBundleConfiguration) return t("bundleConfigurationRequired");
    if (isOutOfStock) return t("outOfStock");
    return t("addToCart");
  };

  return (
    <form {...formProps({ afterSubmit: openCart })} className="grid grid-cols-2 gap-2.5">
      <input type="hidden" {...register("merchandiseId", { value: selectedVariant.id })} />
      <input type="hidden" {...register("quantity", { value: 1 })} />
      <ShopPayButton
        variants={[{ id: selectedVariant.id, quantity: 1 }]}
        channel="hydrogen"
        disabled={!availableForSale || isOutOfStock || requiresBundleConfiguration || pending}
        width="100%"
        borderRadius="8px"
        style={{ minHeight: 48 }}
      />
      <Button
        type="submit"
        disabled={isOutOfStock || requiresBundleConfiguration}
        {...register("add")}
        className="flex-1 justify-center h-12"
      >
        {getButtonText()}
      </Button>
    </form>
  );
}
