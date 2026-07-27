/**
 * Expands compact demo product specs into full Storefront product shapes.
 *
 * Keeping the spec compact is what makes a believable multi-option catalogue
 * reviewable: option matrices, variant ids, encoded availability tries, price
 * ranges and media are all derived here rather than hand-written per product.
 */

import { demoImage } from "../../images";
import type {
  FixtureMoney,
  FixtureOption,
  FixtureOptionValue,
  FixtureProduct,
  FixtureSellingPlanAllocation,
  FixtureVariant,
} from "../../types";

export interface DemoColor {
  hex: string;
  name: string;
}

export interface DemoProductSpec {
  category?: string;
  collections: string[];
  colors?: DemoColor[];
  compareAt?: number;
  description: string;
  handle: string;
  images?: number;
  price: number;
  sellingPlan?: { name: string; percentOff: number };
  sizes?: string[];
  /** Variant titles that are out of stock. `"*"` sells the whole product out. */
  soldOut?: string[];
  tags: string[];
  title: string;
  type: string;
  vendor: string;
}

const CURRENCY = "USD";
const PRODUCT_IMAGE_WIDTH = 800;
const PRODUCT_IMAGE_HEIGHT = 1000;

function money(amount: number): FixtureMoney {
  return { amount: amount.toFixed(2), currencyCode: CURRENCY };
}

function combine(
  spec: DemoProductSpec,
): Array<{ options: Array<{ name: string; value: string }> }> {
  const axes: Array<{ name: string; values: string[] }> = [];
  if (spec.colors?.length) axes.push({ name: "Color", values: spec.colors.map((c) => c.name) });
  if (spec.sizes?.length) axes.push({ name: "Size", values: spec.sizes });
  if (axes.length === 0) return [{ options: [{ name: "Title", value: "Default Title" }] }];

  let rows: Array<Array<{ name: string; value: string }>> = [[]];
  for (const axis of axes) {
    rows = rows.flatMap((row) => axis.values.map((value) => [...row, { name: axis.name, value }]));
  }
  return rows.map((options) => ({ options }));
}

/**
 * Encodes Shopify's option-value trie (`v1_` prefix). One option encodes as a
 * flat index list; two options encode as `parent:child child,parent:child`.
 */
export function encodeVariantTrie(combinations: number[][]): string {
  if (combinations.length === 0) return "";
  if (combinations[0]?.length === 1) {
    return `v1_${combinations.map((entry) => entry[0]).join(" ")}`;
  }
  const grouped = new Map<number, number[]>();
  for (const [parent, child] of combinations) {
    const bucket = grouped.get(parent as number) ?? [];
    bucket.push(child as number);
    grouped.set(parent as number, bucket);
  }
  return `v1_${[...grouped.entries()]
    .map(([parent, children]) => `${parent}:${children.join(" ")}`)
    .join(",")}`;
}

function sellingPlanAllocations(
  spec: DemoProductSpec,
  price: number,
): { nodes: FixtureSellingPlanAllocation[] } | undefined {
  if (!spec.sellingPlan) return undefined;
  const discounted = price * (1 - spec.sellingPlan.percentOff / 100);
  return {
    nodes: [
      {
        priceAdjustments: [
          {
            compareAtPrice: money(price),
            perDeliveryPrice: money(discounted),
            price: money(discounted),
          },
        ],
        sellingPlan: {
          description: `Delivered on a repeating schedule. Save ${spec.sellingPlan.percentOff}% on every order.`,
          id: `gid://shopify/SellingPlan/${spec.handle}`,
          name: spec.sellingPlan.name,
          options: [{ name: "Delivery every", value: spec.sellingPlan.name }],
          recurringDeliveries: true,
        },
      },
    ],
  };
}

export function buildDemoProduct(spec: DemoProductSpec, index: number): FixtureProduct {
  const productNumber = 5000 + index * 100;
  const rows = combine(spec);
  const soldOut = new Set(spec.soldOut ?? []);
  const everythingSoldOut = soldOut.has("*");
  const imageCount = spec.images ?? 3;
  const media = Array.from({ length: imageCount }, (_, position) => ({
    node: {
      image: demoImage(
        `product/${spec.handle}/${position + 1}`,
        `${spec.title} — view ${position + 1}`,
        PRODUCT_IMAGE_WIDTH,
        PRODUCT_IMAGE_HEIGHT,
      ),
      mediaContentType: "IMAGE" as const,
    },
  }));
  const featuredImage = media[0]?.node.image ?? null;

  const variants: FixtureVariant[] = rows.map((row, position) => {
    const title = row.options.map((option) => option.value).join(" / ");
    const colorName = row.options.find((option) => option.name === "Color")?.value;
    const colorIndex = spec.colors?.findIndex((color) => color.name === colorName) ?? -1;
    return {
      availableForSale: !everythingSoldOut && !soldOut.has(title),
      compareAtPrice: spec.compareAt ? money(spec.compareAt) : null,
      id: `gid://shopify/ProductVariant/${productNumber + position + 1}`,
      image:
        colorIndex >= 0
          ? (media[colorIndex % media.length]?.node.image ?? featuredImage)
          : featuredImage,
      price: money(spec.price),
      selectedOptions: row.options,
      ...(spec.sellingPlan
        ? { sellingPlanAllocations: sellingPlanAllocations(spec, spec.price) }
        : {}),
      title,
    };
  });

  const options: FixtureOption[] = [];
  if (spec.colors?.length) {
    options.push({
      id: `gid://shopify/ProductOption/${productNumber}-color`,
      name: "Color",
      optionValues: spec.colors.map(
        (color, position): FixtureOptionValue => ({
          firstSelectableVariant: {
            image: media[position % media.length]?.node.image ?? featuredImage,
          },
          id: `gid://shopify/ProductOptionValue/${productNumber}-color-${position}`,
          name: color.name,
          swatch: { color: color.hex, image: null },
        }),
      ),
    });
  }
  if (spec.sizes?.length) {
    options.push({
      id: `gid://shopify/ProductOption/${productNumber}-size`,
      name: "Size",
      optionValues: spec.sizes.map(
        (size, position): FixtureOptionValue => ({
          firstSelectableVariant: { image: featuredImage },
          id: `gid://shopify/ProductOptionValue/${productNumber}-size-${position}`,
          name: size,
          swatch: null,
        }),
      ),
    });
  }
  if (options.length === 0) {
    options.push({
      id: `gid://shopify/ProductOption/${productNumber}-title`,
      name: "Title",
      optionValues: [
        {
          firstSelectableVariant: { image: featuredImage },
          id: `gid://shopify/ProductOptionValue/${productNumber}-title-0`,
          name: "Default Title",
          swatch: null,
        },
      ],
    });
  }

  const axisSizes = options
    .filter((option) => option.name !== "Title")
    .map((option) => option.optionValues.length);
  const existence: number[][] = [];
  const availability: number[][] = [];
  variants.forEach((variant, position) => {
    if (axisSizes.length === 0) return;
    const coordinates =
      axisSizes.length === 1
        ? [position]
        : [Math.floor(position / (axisSizes[1] as number)), position % (axisSizes[1] as number)];
    existence.push(coordinates);
    if (variant.availableForSale) availability.push(coordinates);
  });

  const defaultVariant = variants.find((variant) => variant.availableForSale) ?? variants[0];
  if (!defaultVariant) throw new Error(`Demo product ${spec.handle} produced no variants`);

  return {
    availableForSale: variants.some((variant) => variant.availableForSale),
    category: spec.category
      ? {
          ancestors: [{ id: "gid://shopify/TaxonomyCategory/root", name: "Home & Living" }],
          id: `gid://shopify/TaxonomyCategory/${spec.handle}`,
          name: spec.category,
        }
      : null,
    collections: { edges: spec.collections.map((handle) => ({ node: { handle } })) },
    compareAtPriceRange: spec.compareAt
      ? { maxVariantPrice: money(spec.compareAt), minVariantPrice: money(spec.compareAt) }
      : null,
    description: spec.description,
    descriptionHtml: `<p>${spec.description}</p><p>Every demo product is synthetic sample data. Connect a Shopify store to replace it.</p>`,
    encodedVariantAvailability: axisSizes.length > 0 ? encodeVariantTrie(availability) : null,
    encodedVariantExistence: axisSizes.length > 0 ? encodeVariantTrie(existence) : null,
    featuredImage,
    handle: spec.handle,
    id: `gid://shopify/Product/${productNumber}`,
    media: { edges: media },
    options,
    priceRange: { maxVariantPrice: money(spec.price), minVariantPrice: money(spec.price) },
    productType: spec.type,
    requiresSellingPlan: false,
    selectedOrFirstAvailableVariant: defaultVariant,
    seo: { description: null, title: null },
    tags: spec.tags,
    title: spec.title,
    updatedAt: new Date(Date.UTC(2026, 0, 1) - index * 86_400_000).toISOString(),
    variants: { edges: variants.map((node) => ({ node })) },
    variantsCount: { count: variants.length },
    vendor: spec.vendor,
  };
}
