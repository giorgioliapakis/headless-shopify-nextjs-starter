"use client";

import { useTranslations } from "next-intl";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import { useCartDrawer } from "./drawer-context";
import { useCart } from "./hydrogen";
import { OverlayContent } from "./overlay-content";

function CartCountBadge() {
  const count = useCart((state) => state.data.totalQuantity);
  if (count === 0) return null;
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-xs text-background">
      {count}
    </span>
  );
}

interface CartOverlayProps {
  locale: string;
}

export function CartOverlay({ locale }: CartOverlayProps) {
  const { isOpen, setOpen } = useCartDrawer();
  const t = useTranslations("cart");

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="p-0 gap-0">
        <div className="flex h-16 shrink-0 items-center gap-2 px-5">
          <SheetTitle className="text-lg font-semibold">{t("shoppingCart")}</SheetTitle>
          <CartCountBadge />
        </div>
        <SheetDescription className="sr-only">{t("reviewCartDescription")}</SheetDescription>
        <OverlayContent locale={locale} />
      </SheetContent>
    </Sheet>
  );
}
