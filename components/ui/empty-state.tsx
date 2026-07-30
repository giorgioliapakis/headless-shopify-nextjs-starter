import type { LucideIcon } from "lucide-react";
import { createElement, isValidElement, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps extends Omit<ComponentProps<"div">, "title"> {
  /** A lucide icon component, or any ReactNode for full control. */
  icon?: LucideIcon | ReactNode;
  title: ReactNode;
  /** Element used for the title. Defaults to `p` so pages keep ownership of their heading levels. */
  titleAs?: "h2" | "h3" | "p";
  description?: ReactNode;
  /** Usually a `<Button render={<Link href=... />}>`; multiple actions wrap into a row. */
  action?: ReactNode;
}

/**
 * Centered empty / zero-result surface: optional icon in a muted disc, a foreground title,
 * muted supporting copy and an optional action row.
 */
export function EmptyState({
  icon,
  title,
  titleAs = "p",
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  // Lucide icons are components (functions or forwardRef/memo exotic objects); anything that is
  // already a valid element — or a plain node like a string — renders as-is.
  const isIconComponent =
    !isValidElement(icon) &&
    (typeof icon === "function" ||
      (typeof icon === "object" && icon !== null && "$$typeof" in icon));
  const iconNode = isIconComponent
    ? createElement(icon as LucideIcon, {
        className: "size-10 text-muted-foreground",
        "aria-hidden": true,
      })
    : icon;
  const TitleTag = titleAs;

  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-5 px-gutter py-section text-center",
        className,
      )}
      {...props}
    >
      {iconNode ? (
        <div data-slot="empty-state-icon" className="rounded-full bg-muted p-5">
          {iconNode}
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-2">
        <TitleTag data-slot="empty-state-title" className="text-lg text-foreground">
          {title}
        </TitleTag>
        {description ? (
          <p data-slot="empty-state-description" className="max-w-md text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div data-slot="empty-state-action" className="flex flex-col gap-inline sm:flex-row">
          {action}
        </div>
      ) : null}
    </div>
  );
}
