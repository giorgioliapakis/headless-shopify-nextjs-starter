"use client";

import { ShopPayButton } from "@shopify/hydrogen/react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { useCartDrawer } from "@/components/cart/drawer-context";
import { useCart, useCartForm } from "@/components/cart/hydrogen";
import { Price } from "@/components/product/price";
import { Button } from "@/components/ui/button";
import type { Image, Money, SelectedOption, SellingPlanAllocation } from "@/lib/types";

const MAX_QUANTITY = 99;

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
  const tCart = useTranslations("cart");
  const { formProps, register } = useCartForm();
  const { openCart } = useCartDrawer();
  const pending = useCart((state) => state.pending.lines.size > 0);
  const firstSellingPlan = selectedVariant?.sellingPlanAllocations[0];
  const [sellingPlanId, setSellingPlanId] = useState(
    requiresSellingPlan ? (firstSellingPlan?.id ?? "") : "",
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const quantityId = useId();

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 4000);
    return () => clearTimeout(timer);
  }, [justAdded]);

  if (!selectedVariant) {
    return null;
  }

  const requiresBundleConfiguration = selectedVariant.requiresBundleConfiguration;
  const isOutOfStock = !selectedVariant.availableForSale;
  const missingRequiredSellingPlan = requiresSellingPlan && !sellingPlanId;

  const getButtonText = () => {
    if (requiresBundleConfiguration) return t("bundleConfigurationRequired");
    if (missingRequiredSellingPlan) return t("purchaseOptionUnavailable");
    if (isOutOfStock) return t("outOfStock");
    if (pending) return tCart("adding");
    return t("addToCart");
  };

  return (
    <form
      {...formProps({
        afterSubmit: () => {
          setJustAdded(true);
          openCart();
        },
      })}
      className="grid gap-4"
    >
      <input type="hidden" {...register("merchandiseId", { value: selectedVariant.id })} />
      {selectedVariant.sellingPlanAllocations.length > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">{t("purchaseOptions")}</legend>
          {!requiresSellingPlan ? (
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3">
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={sellingPlanId === ""}
                  onChange={() => setSellingPlanId("")}
                  {...register("sellingPlanId", { value: "" })}
                />
                <span className="text-sm font-medium">{t("oneTimePurchase")}</span>
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

      <div className="flex items-center gap-2.5">
        <label htmlFor={quantityId} className="text-sm font-medium">
          {t("quantity")}
        </label>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-9 rounded-full"
            disabled={quantity <= 1}
            aria-label={t("decreaseQuantity")}
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          >
            <span aria-hidden="true">&minus;</span>
          </Button>
          <input
            id={quantityId}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QUANTITY}
            step={1}
            {...register("quantity", { value: quantity })}
            value={quantity}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              setQuantity(Number.isFinite(next) ? Math.min(MAX_QUANTITY, Math.max(1, next)) : 1);
            }}
            className="h-9 w-14 rounded-lg border border-input bg-background px-2 text-center text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-9 rounded-full"
            disabled={quantity >= MAX_QUANTITY}
            aria-label={t("increaseQuantity")}
            onClick={() => setQuantity((current) => Math.min(MAX_QUANTITY, current + 1))}
          >
            <span aria-hidden="true">+</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <ShopPayButton
          variants={[{ id: selectedVariant.id, quantity }]}
          channel="hydrogen"
          disabled={
            !availableForSale ||
            isOutOfStock ||
            requiresBundleConfiguration ||
            Boolean(sellingPlanId) ||
            requiresSellingPlan
          }
          width="100%"
          borderRadius="8px"
          style={{ minHeight: 48 }}
        />
        <Button
          type="submit"
          disabled={
            isOutOfStock || requiresBundleConfiguration || missingRequiredSellingPlan || pending
          }
          aria-busy={pending || undefined}
          {...register("add")}
          className="flex-1 justify-center h-12"
        >
          {getButtonText()}
        </Button>
      </div>
      <p aria-live="polite" role="status" className="sr-only">
        {pending ? tCart("adding") : justAdded ? tCart("addedToCart") : ""}
      </p>
    </form>
  );
}
