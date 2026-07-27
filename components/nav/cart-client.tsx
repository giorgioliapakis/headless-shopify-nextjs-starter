"use client";

import { HandbagIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useCartDrawer } from "@/components/cart/drawer-context";
import { useCart } from "@/components/cart/hydrogen";

const TRIGGER_CLASS =
  "flex items-center justify-center gap-1.5 text-foreground transition-colors hover:text-foreground/80";

/** Two digits max keeps the badge from shifting the header layout. */
function formatBadgeCount(quantity: number): string {
  return quantity > 99 ? "99+" : String(quantity);
}

function TriggerContents({ label, quantity }: { label: string; quantity: number }) {
  return (
    <>
      <span className="relative">
        <HandbagIcon className="size-5" aria-hidden="true" />
        {quantity > 0 && (
          <span className="absolute -top-2 -right-1 flex size-4 items-center justify-center rounded-full bg-foreground text-xxs leading-none text-background">
            {formatBadgeCount(quantity)}
          </span>
        )}
      </span>
      <span className="sr-only">{label}</span>
    </>
  );
}

export function CartIconClient({
  initialQuantity = 0,
  label,
}: {
  initialQuantity?: number;
  label: string;
}) {
  const storeQuantity = useCart((state) => state.data.totalQuantity);
  const storeSettled = useCart((state) => !state.loading);
  const quantity = storeSettled ? storeQuantity : initialQuantity;
  const { openCart } = useCartDrawer();
  // Pre-hydration the trigger must be a real link so `/cart` stays reachable without JavaScript.
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => setHasHydrated(true), []);

  if (!hasHydrated) {
    return (
      <Link href="/cart" prefetch={false} className={TRIGGER_CLASS}>
        <TriggerContents label={label} quantity={quantity} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={openCart}
      className={`${TRIGGER_CLASS} cursor-pointer`}
    >
      <TriggerContents label={label} quantity={quantity} />
    </button>
  );
}
