import type * as React from "react";

import { cn } from "@/lib/utils";

/** Top-level page padding. Uses the shared rhythm scale rather than a fixed `pt-10`. */
export function Page({ children, className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("pt-section", className)} {...props}>
      {children}
    </div>
  );
}
