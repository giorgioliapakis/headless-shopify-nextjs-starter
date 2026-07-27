import Link from "next/link";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbTrailItem {
  name: string;
  path: string;
}

/**
 * Visible counterpart to `BreadcrumbSchema`. Both must be fed the same item list so the rendered
 * trail and the `BreadcrumbList` JSON-LD never disagree.
 */
export function BreadcrumbTrail({
  className,
  items,
}: {
  className?: string;
  items: BreadcrumbTrailItem[];
}) {
  if (items.length < 2) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.path}:${index}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={item.path} />}>{item.name}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {isLast ? null : <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
