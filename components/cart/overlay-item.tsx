"use client";

import type { CartLine } from "@shopify/hydrogen";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";

import { useCart, useCartForm } from "./hydrogen";

interface OverlayItemProps {
  item: CartLine;
  locale: string;
}

export function OverlayItem({ item, locale }: OverlayItemProps) {
  const { formProps, register } = useCartForm();
  const pending = useCart((state) => state.pending.lines.has(item.id));
  const errors = useCart((state) => state.errors.lines.get(item.id));
  const t = useTranslations("cart");
  const merchandise = item.merchandise;
  const productTitle = merchandise?.product.title ?? merchandise?.title ?? t("cartItemsLabel");
  const productHref = merchandise?.product.handle
    ? `/products/${merchandise.product.handle}`
    : undefined;
  const image = merchandise?.image;

  return (
    <li
      className={cn("flex gap-2.5 transition-opacity", pending && "opacity-60")}
      aria-label={`${productTitle} - ${formatPrice(item.cost.totalAmount, locale)}`}
    >
      {productHref ? (
        <Link
          href={productHref}
          className="shrink-0 relative w-16 h-16 bg-muted overflow-hidden hover:opacity-80 transition-opacity"
        >
          {image ? (
            <Image
              src={image.url}
              alt={image.altText ?? productTitle}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : null}
        </Link>
      ) : (
        <div className="shrink-0 relative w-16 h-16 bg-muted" aria-hidden="true" />
      )}

      <div className="flex-1 min-w-0 flex flex-col gap-2 py-0.5">
        <div>
          {productHref ? (
            <Link href={productHref} className="hover:opacity-70 transition-opacity">
              <h3 className="font-medium text-sm text-foreground line-clamp-2">{productTitle}</h3>
            </Link>
          ) : (
            <h3 className="font-medium text-sm text-foreground line-clamp-2">{productTitle}</h3>
          )}

          {(merchandise?.selectedOptions?.length ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {merchandise?.selectedOptions?.map((option) => option.value).join(" / ")}
            </p>
          )}
        </div>

        <form {...formProps()} className="flex items-center gap-1.5">
          <button {...register("set")} />
          <input type="hidden" {...register("lineId", { value: item.id })} />
          <Button
            type="submit"
            variant="secondary"
            size="icon"
            className="size-7 rounded-full"
            disabled={item.quantity <= 1}
            aria-label={t("decreaseQuantity")}
            {...register("decrease")}
          >
            <MinusIcon className="size-3" />
          </Button>

          <input
            {...register("quantity", { interactive: true, value: item.quantity })}
            aria-label={t("itemQuantity")}
            className="inline-flex rounded-full bg-muted w-10.5 h-7 px-2 text-center text-xs font-medium text-foreground"
          />

          <Button
            type="submit"
            variant="secondary"
            size="icon"
            className="size-7 rounded-full"
            aria-label={t("increaseQuantity")}
            {...register("increase")}
          >
            <PlusIcon className="size-3" />
          </Button>

          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            aria-label={t("removeItem")}
            {...register("remove")}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </form>
        {errors && (errors.userErrors.length > 0 || errors.warnings.length > 0) ? (
          <p role="alert" className="text-xs text-destructive">
            {[...errors.userErrors, ...errors.warnings].map((error) => error.message).join(" ")}
          </p>
        ) : null}
      </div>

      <div className="text-sm font-medium text-foreground self-start py-0.5">
        {formatPrice(item.cost.totalAmount, locale)}
      </div>
    </li>
  );
}
