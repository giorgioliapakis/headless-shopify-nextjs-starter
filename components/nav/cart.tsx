import { HandbagIcon } from "lucide-react";
import Link from "next/link";

import { loadCartEnvelope } from "@/lib/shopify/hydrogen/cart-server";

import { CartIconClient } from "./cart-client";

/**
 * Rendered inside the nav's Suspense boundary, so reading the cart here is a dynamic hole in the
 * static shell rather than a whole-app deopt — and the badge server-renders instead of flashing 0→n.
 */
export async function CartIcon({ label }: { label: string }) {
  const result = await loadCartEnvelope();
  return <CartIconClient initialQuantity={result.data.cart?.totalQuantity ?? 0} label={label} />;
}

export function CartIconFallback({ label }: { label: string }) {
  return (
    <Link
      href="/cart"
      prefetch={false}
      className="flex items-center justify-center gap-1.5 text-foreground transition-colors hover:text-foreground/80"
    >
      <HandbagIcon className="size-5" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
