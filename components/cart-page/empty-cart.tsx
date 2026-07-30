"use client";

import { ShoppingCartIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Body-only empty state — the page heading is owned by `Header` so `/cart` keeps a single `h1`. */
export function EmptyCart() {
  const t = useTranslations("cart");

  return (
    <EmptyState
      className="px-5 py-10"
      icon={ShoppingCartIcon}
      title={t("empty")}
      action={
        <Button className="h-12 px-8" render={<Link href="/" />}>
          {t("continueShopping")}
        </Button>
      }
    />
  );
}
