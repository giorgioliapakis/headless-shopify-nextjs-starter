"use client";

import { AlertCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Rendered when the Storefront cart lookup failed. This must stay distinct from the empty state:
 * telling a shopper their cart is empty during an outage loses the order.
 */
export function CartUnavailable() {
  const t = useTranslations("common");
  const tCart = useTranslations("cart");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <EmptyState
      className="px-5 py-10"
      role="alert"
      icon={AlertCircleIcon}
      title={t("errorDesc")}
      action={
        <>
          <Button
            onClick={() => startTransition(() => router.refresh())}
            disabled={pending}
            className="h-12 px-8"
          >
            {pending ? tCart("updatingCart") : t("tryAgain")}
          </Button>
          <Button variant="outline" className="h-12 px-8" render={<Link href="/" />}>
            {tCart("continueShopping")}
          </Button>
        </>
      }
    />
  );
}
