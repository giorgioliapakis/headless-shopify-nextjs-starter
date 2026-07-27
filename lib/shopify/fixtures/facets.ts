/**
 * Builds Storefront `filters` / `productFilters` payloads from a product set so
 * the collection and search facet sidebars render against fixture data.
 */

import type { FixtureProduct } from "./types";

interface FacetValue {
  count: number;
  id: string;
  input: string;
  label: string;
  swatch?: { color: string | null; image: { previewImage: { url: string } } | null } | null;
}

interface Facet {
  id: string;
  label: string;
  presentation?: "IMAGE" | "SWATCH" | "TEXT";
  type: "BOOLEAN" | "LIST" | "PRICE_RANGE";
  values: FacetValue[];
}

function amount(product: FixtureProduct): number {
  return Number.parseFloat(product.priceRange.minVariantPrice.amount);
}

function optionSwatch(products: FixtureProduct[], optionName: string, value: string) {
  for (const product of products) {
    for (const option of product.options) {
      if (option.name.toLowerCase() !== optionName.toLowerCase()) continue;
      const match = option.optionValues.find((entry) => entry.name === value);
      if (match?.swatch) return match.swatch;
    }
  }
  return null;
}

function priceFacet(products: FixtureProduct[]): Facet | null {
  if (products.length === 0) return null;
  const amounts = products.map(amount);
  const min = Math.floor(Math.min(...amounts));
  const max = Math.ceil(Math.max(...amounts));
  return {
    id: "filter.v.price",
    label: "Price",
    type: "PRICE_RANGE",
    values: [
      {
        count: products.length,
        id: "filter.v.price",
        input: JSON.stringify({ price: { max, min } }),
        label: "Price",
      },
    ],
  };
}

function availabilityFacet(products: FixtureProduct[]): Facet | null {
  const inStock = products.filter((product) => product.availableForSale).length;
  const outOfStock = products.length - inStock;
  if (inStock === 0 || outOfStock === 0) return null;
  return {
    id: "filter.v.availability",
    label: "Availability",
    presentation: "TEXT",
    type: "LIST",
    values: [
      {
        count: inStock,
        id: "filter.v.availability.1",
        input: JSON.stringify({ available: true }),
        label: "In stock",
      },
      {
        count: outOfStock,
        id: "filter.v.availability.0",
        input: JSON.stringify({ available: false }),
        label: "Out of stock",
      },
    ],
  };
}

function optionFacets(products: FixtureProduct[]): Facet[] {
  const names: string[] = [];
  for (const product of products) {
    for (const option of product.options) {
      if (option.name === "Title") continue;
      if (!names.includes(option.name)) names.push(option.name);
    }
  }

  return names
    .map((name): Facet => {
      const counts = new Map<string, number>();
      for (const product of products) {
        const values = new Set<string>();
        for (const edge of product.variants.edges) {
          for (const selected of edge.node.selectedOptions) {
            if (selected.name === name) values.add(selected.value);
          }
        }
        for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      const slug = name.toLowerCase();
      const values = [...counts.entries()].map(([value, count]): FacetValue => {
        const swatch = optionSwatch(products, name, value);
        return {
          count,
          id: `filter.v.option.${slug}.${value.toLowerCase().replace(/\s+/g, "-")}`,
          input: JSON.stringify({ variantOption: { name: slug, value } }),
          label: value,
          ...(swatch ? { swatch } : {}),
        };
      });
      return {
        id: `filter.v.option.${slug}`,
        label: name,
        presentation: values.some((value) => value.swatch?.color) ? "SWATCH" : "TEXT",
        type: "LIST",
        values,
      };
    })
    .filter((facet) => facet.values.length > 0);
}

function scalarFacet(
  products: FixtureProduct[],
  options: { field: "productType" | "productVendor"; id: string; label: string },
): Facet | null {
  const counts = new Map<string, number>();
  for (const product of products) {
    const value = options.field === "productVendor" ? product.vendor : (product.productType ?? "");
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return {
    id: options.id,
    label: options.label,
    presentation: "TEXT",
    type: "LIST",
    values: [...counts.entries()].map(([value, count]) => ({
      count,
      id: `${options.id}.${value.toLowerCase().replace(/\s+/g, "-")}`,
      input: JSON.stringify({ [options.field]: value }),
      label: value,
    })),
  };
}

export function buildFacets(products: FixtureProduct[]): Facet[] {
  const facets: Array<Facet | null> = [
    priceFacet(products),
    availabilityFacet(products),
    ...optionFacets(products),
    scalarFacet(products, { field: "productVendor", id: "filter.p.vendor", label: "Brand" }),
    scalarFacet(products, {
      field: "productType",
      id: "filter.p.product_type",
      label: "Product type",
    }),
  ];
  return facets.filter((facet): facet is Facet => facet !== null);
}
