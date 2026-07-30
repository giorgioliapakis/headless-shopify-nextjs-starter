import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type * as React from "react";

import { Swatch } from "@/components/ui/swatch";
import { buildOptionUrl, type SelectedOptions } from "@/lib/product";
import type { OptionValueState } from "@/lib/shopify/encoded-variants";
import type { ProductOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ProductTranslator = Awaited<ReturnType<typeof getTranslations<"product">>>;

interface ColorPickerProps extends React.ComponentProps<"div"> {
  option: ProductOption;
  selectedValue: string;
  valueStates: Map<string, OptionValueState> | undefined;
  handle: string;
  selectedOptions: SelectedOptions;
  t: ProductTranslator;
  hideImages?: boolean;
}

const FAIL_OPEN: OptionValueState = { exists: true, available: true };

export function ColorPicker({
  option,
  selectedValue,
  valueStates,
  handle,
  selectedOptions,
  t,
  hideImages,
  className,
  ...props
}: ColorPickerProps) {
  return (
    <div className={cn("grid gap-2.5", className)} {...props}>
      <p className="text-sm font-medium text-muted-foreground">
        {option.name}: <span className="text-foreground">{selectedValue}</span>
      </p>
      <div className="flex flex-wrap gap-2.5">
        {option.values.map((value) => {
          const isSelected = selectedValue === value.name;
          const { exists, available } = valueStates?.get(value.name) ?? FAIL_OPEN;
          const isSoldOut = exists && !available;
          const imageUrl = hideImages ? undefined : value.swatch?.image || value.image;
          const href = buildOptionUrl(handle, selectedOptions, option.name, value.name);

          const swatch = (
            <Swatch
              color={value.swatch?.color}
              image={imageUrl}
              label={value.name}
              selected={isSelected}
            />
          );

          // The combination does not exist in the variant matrix — truly non-interactive.
          if (!exists) {
            return (
              <span
                key={value.id}
                className="block cursor-not-allowed opacity-40"
                aria-disabled="true"
                aria-label={t("unavailableVariantLabel", { name: option.name, value: value.name })}
              >
                {swatch}
              </span>
            );
          }

          // Sold-out combinations stay navigable so buyers can view the variant.
          return (
            <Link
              key={value.id}
              href={href}
              scroll={false}
              className={cn("block cursor-pointer", isSoldOut && "opacity-60")}
              aria-current={isSelected ? "true" : undefined}
              aria-label={
                isSoldOut
                  ? t("soldOutVariantLabel", { name: option.name, value: value.name })
                  : t("selectVariantLabel", { name: option.name, value: value.name })
              }
            >
              {swatch}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
