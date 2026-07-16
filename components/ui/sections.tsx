import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

export function Sections({ children, className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div className={cn("grid gap-[var(--merchant-section-gap)]", className)} {...props}>
      {children}
    </div>
  );
}
