import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/** Vertical rhythm between section bands. Driven by `theme.layout.density`. */
export function Sections({ children, className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div className={cn("grid gap-section-gap", className)} {...props}>
      {children}
    </div>
  );
}
