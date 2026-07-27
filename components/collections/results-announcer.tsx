"use client";

import { useTranslations } from "next-intl";

import { useFilterPending } from "./filter-pending-context";

/**
 * Announces filter/sort result changes. Filter navigation runs inside a transition, so this node is
 * reconciled in place rather than remounted — which is what makes the live region actually speak.
 */
export function ResultsAnnouncer({ count }: { count: number }) {
  const t = useTranslations("search");
  const pending = useFilterPending();

  return (
    <p aria-live="polite" role="status" className="sr-only">
      {pending ? t("loadingMore") : t("pagination.totalResults", { totalResults: String(count) })}
    </p>
  );
}
