"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

/** Body-only empty state — the page heading is owned by `Header` so `/cart` keeps a single `h1`. */
export function EmptyCart() {
  const t = useTranslations("cart");

  return (
    <div className="flex flex-col items-center justify-center gap-5 px-5 py-10 text-center">
      <p className="text-lg text-muted-foreground">{t("empty")}</p>
      <Link
        href="/"
        className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t("continueShopping")}
      </Link>
    </div>
  );
}
