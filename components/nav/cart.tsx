import { HandbagIcon } from "lucide-react";

import { CartIconClient } from "./cart-client";

export async function CartIcon() {
  return <CartIconClient />;
}

export function CartIconFallback() {
  return (
    <span className="flex items-center justify-center gap-1.5 text-foreground">
      <HandbagIcon className="size-5" />
      <span className="sr-only">Cart</span>
    </span>
  );
}
