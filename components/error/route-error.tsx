"use client";

import { useTranslations } from "next-intl";

import { ErrorBoundaryContent } from "@/components/ui/error-boundary-content";

/**
 * Shared route error boundary body. Surfacing `error.digest` is what lets a shopper quote a
 * reference that support can match against the server logs for a redacted production error.
 */
export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  return (
    <>
      <ErrorBoundaryContent reset={reset} />
      {error.digest ? (
        <p className="pb-10 text-center font-mono text-xs text-muted-foreground">
          {t("errorReference", { digest: error.digest })}
        </p>
      ) : null}
    </>
  );
}
