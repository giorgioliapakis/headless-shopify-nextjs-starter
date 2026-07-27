import type * as React from "react";

import { cn } from "@/lib/utils";

interface DiscountBadgeProps extends React.ComponentProps<"span"> {
  percent: number;
  variant?: "positive" | "info";
}

export function DiscountBadge({
  percent,
  variant = "positive",
  className,
  ...props
}: DiscountBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium tabular-nums",
        variant === "positive" && "bg-positive/15 text-positive",
        variant === "info" && "bg-info/15 text-info",
        className,
      )}
      {...props}
    >
      {percent}% OFF
    </span>
  );
}
