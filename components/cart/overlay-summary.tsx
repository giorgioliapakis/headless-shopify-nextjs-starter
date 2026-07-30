"use client";

import type { CartData } from "@shopify/hydrogen";
import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

import { DiscountForm } from "@/components/cart/discount-form";
import { CartNoteForm } from "@/components/cart/note-form";
import { Price } from "@/components/product/price";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import { useCart } from "./hydrogen";
import { isDiscountSectionActive, isNoteSectionActive } from "./summary-disclosures";

interface OverlaySummaryProps {
  cart: CartData;
  locale: string;
  pending: boolean;
}

/**
 * Collapsed by default to keep the drawer compact; auto-opens when the section
 * gains active content or an error, and never closes underneath the user.
 */
function SummaryDisclosure({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 py-1.5 text-sm text-muted-foreground transition-colors outline-none",
          "hover:text-foreground focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50",
          "[&[data-panel-open]>svg]:rotate-180",
        )}
      >
        {label}
        <ChevronDownIcon
          className="pointer-events-none size-4 shrink-0 transition-transform duration-200"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden">
        <div className="pt-1 pb-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function OverlaySummary({ cart, locale, pending }: OverlaySummaryProps) {
  const t = useTranslations("cart");
  const discountErrors = useCart((state) => state.errors.discountCodes);
  const noteErrors = useCart((state) => state.errors.note);
  const discountActive = isDiscountSectionActive(cart.discountCodes, discountErrors.values());
  const noteActive = isNoteSectionActive(cart.note, noteErrors);

  return (
    <div className="grid gap-2.5">
      <div className="grid divide-y divide-border border-y border-border">
        <SummaryDisclosure label={t("discountCode")} active={discountActive}>
          <DiscountForm cart={cart} />
        </SummaryDisclosure>
        <SummaryDisclosure label={t("orderNote")} active={noteActive}>
          <CartNoteForm note={cart.note} labelHidden />
        </SummaryDisclosure>
      </div>
      <div aria-label={t("estimatedTotal")}>
        <div className="flex items-baseline justify-between">
          <span className="text-base text-muted-foreground">{t("estimatedTotal")}</span>
          <Price
            amount={cart.cost.totalAmount.amount}
            currencyCode={cart.cost.totalAmount.currencyCode}
            locale={locale}
            className={cn("text-xl font-medium text-foreground", pending && "opacity-60")}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{t("taxesAndShippingNote")}</p>
      </div>
    </div>
  );
}
