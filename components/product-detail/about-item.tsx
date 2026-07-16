import type * as React from "react";

import { sanitizeShopifyHtml } from "@/lib/security/html";
import { cn } from "@/lib/utils";

interface AboutItemProps extends React.ComponentProps<"div"> {
  descriptionHtml: string;
}

export function AboutItem({ descriptionHtml, className, ...props }: AboutItemProps) {
  if (!descriptionHtml) return null;

  return (
    <div
      className={cn("prose prose-sm text-foreground/80", className)}
      // oxlint-disable-next-line react/no-danger -- reconstructed through the local rich-text allowlist.
      dangerouslySetInnerHTML={{ __html: sanitizeShopifyHtml(descriptionHtml) }}
      {...props}
    />
  );
}
