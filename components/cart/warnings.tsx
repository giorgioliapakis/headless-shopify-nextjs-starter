"use client";

import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useCart } from "@/components/cart/hydrogen";

import { collectOrphanedLineMessages, isBannerDismissed } from "./warnings-model";

export function CartWarnings() {
  const cartErrors = useCart((state) => state.errors.cart);
  const networkErrors = useCart((state) => state.errors.network);
  const lineErrors = useCart((state) => state.errors.lines);
  const lines = useCart((state) => state.data.lines.nodes);
  const lastUpdatedAt = useCart((state) => state.errors.lastUpdatedAt);
  const [dismissedAt, setDismissedAt] = useState(0);
  const t = useTranslations("cart");
  const messages = [
    ...cartErrors.userErrors.map((error) => error.message),
    ...cartErrors.warnings.map((warning) => warning.message),
    ...networkErrors.map((error) => error.message),
    ...collectOrphanedLineMessages(lineErrors, lines, t("orphanedLineError")),
  ];

  if (messages.length === 0 || isBannerDismissed(lastUpdatedAt, dismissedAt)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 rounded-md px-3 py-2.5 text-sm text-amber-900 dark:text-amber-100"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 grid gap-1">
          <p className="font-medium">{t("warningsTitle")}</p>
          <ul className="grid gap-0.5 text-amber-800 dark:text-amber-200/90">
            {messages.map((message, index) => (
              <li key={`${index}:${message}`}>{message}</li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setDismissedAt(lastUpdatedAt)}
          aria-label={t("dismissWarnings")}
          className="shrink-0 -m-1 rounded-sm p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
