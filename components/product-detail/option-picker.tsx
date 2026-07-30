import Link from "next/link";
import type * as React from "react";

import type { ProductTranslator } from "@/components/product-detail/color-picker";
import { buildOptionUrl, type SelectedOptions } from "@/lib/product";
import type { OptionValueState } from "@/lib/shopify/encoded-variants";
import type { ProductOption } from "@/lib/types";
import { cn } from "@/lib/utils";

interface OptionPickerProps extends React.ComponentProps<"div"> {
  option: ProductOption;
  selectedValue: string;
  valueStates: Map<string, OptionValueState> | undefined;
  handle: string;
  selectedOptions: SelectedOptions;
  t: ProductTranslator;
}

const FAIL_OPEN: OptionValueState = { exists: true, available: true };

export function OptionPicker({
  option,
  selectedValue,
  valueStates,
  handle,
  selectedOptions,
  t,
  className,
  ...props
}: OptionPickerProps) {
  return (
    <div className={cn("grid gap-2.5", className)} {...props}>
      <p className="text-sm font-medium text-muted-foreground">{option.name}</p>
      <div className="flex flex-wrap gap-2">
        {option.values.map((value) => {
          const isSelected = selectedValue === value.name;

          const { exists, available } = valueStates?.get(value.name) ?? FAIL_OPEN;
          const isSoldOut = exists && !available;

          const href = buildOptionUrl(handle, selectedOptions, option.name, value.name);

          const classes = cn(
            "grid px-5 py-2 text-center text-sm rounded-lg transition-all border",
            !exists
              ? "font-normal border-dashed border-border text-muted-foreground/50 cursor-not-allowed"
              : isSelected
                ? "font-medium border-foreground text-foreground starting:border-border starting:text-muted-foreground"
                : "font-normal border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            isSoldOut && "line-through",
          );

          // Invisible medium-weight twin reserves the bold width so pills don't shift on selection.
          const label = (
            <>
              <span className="col-start-1 row-start-1">{value.name}</span>
              <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-medium">
                {value.name}
              </span>
            </>
          );

          // The combination does not exist in the variant matrix — truly non-interactive.
          if (!exists) {
            return (
              <span key={value.id} aria-disabled="true" className={classes}>
                {label}
              </span>
            );
          }

          // Sold-out combinations stay navigable so buyers can view the variant.
          return (
            <Link
              key={value.id}
              href={href}
              scroll={false}
              className={classes}
              aria-current={isSelected ? "true" : undefined}
              aria-label={
                isSoldOut
                  ? t("soldOutVariantLabel", { name: option.name, value: value.name })
                  : undefined
              }
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
