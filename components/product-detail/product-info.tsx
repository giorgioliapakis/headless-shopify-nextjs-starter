import type * as React from "react";

import type { SelectedOptions } from "@/lib/product";
import { getOptionValueStates } from "@/lib/shopify/encoded-variants";
import type { ProductOption } from "@/lib/types";

import { AboutItem } from "./about-item";
import { ColorPicker, type ProductTranslator } from "./color-picker";
import { OptionPicker } from "./option-picker";

interface ProductInfoOptionsProps extends React.ComponentProps<"div"> {
  encodedVariantExistence: string | undefined;
  encodedVariantAvailability: string | undefined;
  options: ProductOption[];
  selectedOptions: SelectedOptions;
  handle: string;
  t: ProductTranslator;
  hideImages?: boolean;
}

function ProductInfoOptions({
  encodedVariantExistence,
  encodedVariantAvailability,
  options,
  selectedOptions,
  handle,
  t,
  hideImages,
  className,
  ...props
}: ProductInfoOptionsProps) {
  const isColorOption = (opt: ProductOption) =>
    opt.values.some((v) => v.swatch?.color || v.swatch?.image) ||
    opt.name.toLowerCase().includes("color");
  // Shopify emits a synthetic Title/Default Title option for products with no variant axes — hide it.
  const isShopifyDefaultOption = (opt: ProductOption) =>
    opt.name === "Title" && opt.values.length === 1 && opt.values[0]?.name === "Default Title";
  const isSingleValueOption = (opt: ProductOption) => opt.values.length === 1;

  const valueStates = getOptionValueStates(
    options,
    selectedOptions,
    encodedVariantExistence,
    encodedVariantAvailability,
  );

  const renderable = options.filter((opt) => !isShopifyDefaultOption(opt));
  const singleValueOptions = renderable.filter(isSingleValueOption);
  const colorOptions = renderable.filter((opt) => !isSingleValueOption(opt) && isColorOption(opt));
  const otherOptions = renderable.filter((opt) => !isSingleValueOption(opt) && !isColorOption(opt));

  if (singleValueOptions.length === 0 && colorOptions.length === 0 && otherOptions.length === 0)
    return null;

  return (
    <div data-slot="product-info-options" className={className} {...props}>
      <div className="grid gap-5">
        {singleValueOptions.map((option) => (
          <p key={option.id} className="text-sm font-medium text-muted-foreground">
            {option.name}: <span className="text-foreground">{option.values[0]?.name}</span>
          </p>
        ))}

        {colorOptions.map((colorOption) => (
          <ColorPicker
            key={colorOption.id}
            option={colorOption}
            selectedValue={selectedOptions[colorOption.name] ?? ""}
            valueStates={valueStates.get(colorOption.name)}
            handle={handle}
            selectedOptions={selectedOptions}
            t={t}
            hideImages={hideImages}
          />
        ))}

        {otherOptions.map((option) => (
          <OptionPicker
            key={option.id}
            option={option}
            selectedValue={selectedOptions[option.name] ?? ""}
            valueStates={valueStates.get(option.name)}
            handle={handle}
            selectedOptions={selectedOptions}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

interface ProductInfoDescriptionProps extends React.ComponentProps<"div"> {
  descriptionHtml: string;
}

function ProductInfoDescription({
  descriptionHtml,
  className,
  ...props
}: ProductInfoDescriptionProps) {
  if (!descriptionHtml) return null;
  return (
    <div data-slot="product-info-description" className={className} {...props}>
      <AboutItem descriptionHtml={descriptionHtml} />
    </div>
  );
}

export { ProductInfoDescription, ProductInfoOptions };
