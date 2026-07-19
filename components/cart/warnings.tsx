"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCart } from "@/components/cart/hydrogen";

export function CartWarnings() {
  const cartErrors = useCart((state) => state.errors.cart);
  const networkErrors = useCart((state) => state.errors.network);
  const t = useTranslations("cart");
  const messages = [
    ...cartErrors.userErrors.map((error) => error.message),
    ...cartErrors.warnings.map((warning) => warning.message),
    ...networkErrors.map((error) => error.message),
  ];

  if (messages.length === 0) return null;

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
      </div>
    </div>
  );
}
