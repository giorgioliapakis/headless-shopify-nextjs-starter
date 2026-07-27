"use client";

import { AlertCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

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
    <div
      className="flex flex-col items-center justify-center gap-5 px-5 py-10 text-center"
      role="alert"
    >
      <div className="rounded-full bg-muted p-5">
        <AlertCircleIcon className="size-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="max-w-md text-muted-foreground">{t("errorDesc")}</p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
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
      </div>
    </div>
  );
}
