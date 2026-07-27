import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Page-width band. Width comes from `theme.layout.container` and the horizontal inset from the
 * `gutter` step of the rhythm scale, so neither is hard-coded per section.
 */
export function Container({ children, className, ...props }: ComponentPropsWithRef<"section">) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-[var(--merchant-container)] px-gutter lg:px-[calc(var(--spacing-gutter)*2)]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
