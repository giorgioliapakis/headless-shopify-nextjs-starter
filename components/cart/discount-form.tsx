"use client";

import type { CartData } from "@shopify/hydrogen";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useCart, useCartForm } from "./hydrogen";

interface DiscountFormProps {
  cart: CartData;
  locale?: string;
}

export function DiscountForm({ cart }: DiscountFormProps) {
  const t = useTranslations("cart");
  const { formProps, register } = useCartForm();
  const pendingCodes = useCart((state) => state.pending.discountCodes);
  const discountErrors = useCart((state) => state.errors.discountCodes);
  const messages = [...discountErrors.values()].flatMap((group) => [
    ...group.userErrors,
    ...group.warnings,
  ]);

  return (
    <div className="grid gap-2.5">
      <form {...formProps()} className="flex gap-2.5">
        <Input
          type="text"
          {...register("discountCode", { defaultValue: "" })}
          placeholder={t("discountCode")}
          aria-label={t("discountCode")}
          autoComplete="off"
          spellCheck={false}
          className="flex-1"
        />
        <Button type="submit" {...register("discount-apply")}>
          {t("applyDiscount")}
        </Button>
      </form>

      {messages.length > 0 ? (
        <p role="alert" className="text-xs text-destructive">
          {messages.map((message) => message.message).join(" ")}
        </p>
      ) : null}

      {cart.discountCodes.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("discount")}>
          {cart.discountCodes.map((d) => (
            <li key={d.code}>
              <form
                {...formProps()}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
                  pendingCodes.has(d.code) && "opacity-60",
                  d.applicable
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground border border-input",
                )}
              >
                <span className={cn(!d.applicable && "line-through")}>{d.code}</span>
                {!d.applicable ? (
                  <span className="text-xs uppercase tracking-wide">
                    {t("discountNotApplicable")}
                  </span>
                ) : null}
                <button
                  type="submit"
                  {...register("discount-remove")}
                  aria-label={`${t("removeDiscount")}: ${d.code}`}
                  className={cn(
                    "ml-0.5 inline-flex size-4 items-center justify-center rounded-sm cursor-pointer disabled:cursor-not-allowed",
                    d.applicable ? "hover:bg-primary-foreground/15" : "hover:bg-foreground/10",
                  )}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
                <input type="hidden" {...register("discountCode", { value: d.code })} />
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
