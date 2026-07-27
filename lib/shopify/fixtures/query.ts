/**
 * Storefront query semantics shared by every fixture mode: Shopify search-syntax
 * parsing, `ProductFilter` matching, sort keys and relay cursor pagination.
 */

import type { FixtureDataset, FixtureProduct } from "./types";

export interface ProductFilterInput {
  available?: boolean;
  price?: { max?: number; min?: number };
  productMetafield?: { key: string; namespace: string; value: string };
  productType?: string;
  productVendor?: string;
  tag?: string;
  taxonomyMetafield?: { key: string; namespace: string; value: string };
  variantOption?: { name: string; value: string };
}

export interface ParsedProductQuery {
  available?: boolean;
  collections: string[];
  handles: string[];
  matchesEverything: boolean;
  priceMax?: number;
  priceMin?: number;
  productTypes: string[];
  tags: string[];
  terms: string[];
  vendors: string[];
}

const EMPTY_QUERY: ParsedProductQuery = {
  collections: [],
  handles: [],
  matchesEverything: true,
  productTypes: [],
  tags: [],
  terms: [],
  vendors: [],
};

function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quoted = false;
  let buffer = "";
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (character === "'" && value[index - 1] !== "\\") quoted = !quoted;
    if (!quoted) {
      if (character === "(") depth++;
      if (character === ")") depth--;
      if (depth === 0 && value.startsWith(separator, index)) {
        parts.push(buffer);
        buffer = "";
        index += separator.length - 1;
        continue;
      }
    }
    buffer += character;
  }
  parts.push(buffer);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 1) {
    return trimmed.slice(1, -1).replace(/\\'/g, "'");
  }
  return trimmed;
}

/**
 * Parses the subset of Shopify's product search syntax this starter emits:
 * `collection:'x'`, `handle:x`, `vendor:'x'`, `product_type:'x'`, `tag:'x'`,
 * `available_for_sale:true`, `variants.price:>=10`, free text, `AND` and `OR`.
 */
export function parseProductQuery(raw: string | undefined): ParsedProductQuery {
  const query = (raw ?? "").trim();
  if (!query || query === "*") return EMPTY_QUERY;

  const parsed: ParsedProductQuery = {
    collections: [],
    handles: [],
    matchesEverything: false,
    productTypes: [],
    tags: [],
    terms: [],
    vendors: [],
  };
  let recognised = false;

  for (const conjunct of splitTopLevel(query, " AND ")) {
    const stripped =
      conjunct.startsWith("(") && conjunct.endsWith(")") ? conjunct.slice(1, -1) : conjunct;
    for (const term of splitTopLevel(stripped, " OR ")) {
      const separator = term.indexOf(":");
      if (separator === -1) {
        parsed.terms.push(term.toLowerCase());
        continue;
      }
      const field = term.slice(0, separator).trim().toLowerCase();
      const value = unquote(term.slice(separator + 1));
      recognised = true;
      switch (field) {
        case "collection":
          parsed.collections.push(value.toLowerCase());
          break;
        case "handle":
          parsed.handles.push(value.toLowerCase());
          break;
        case "vendor":
          parsed.vendors.push(value.toLowerCase());
          break;
        case "product_type":
          parsed.productTypes.push(value.toLowerCase());
          break;
        case "tag":
          parsed.tags.push(value.toLowerCase());
          break;
        case "available_for_sale":
          parsed.available = value === "true";
          break;
        case "variants.price": {
          const bound = value.match(/^(>=|<=|>|<)?\s*([\d.]+)$/);
          if (!bound) break;
          const amount = Number.parseFloat(bound[2]);
          if (Number.isNaN(amount)) break;
          if (bound[1] === "<=" || bound[1] === "<") parsed.priceMax = amount;
          else parsed.priceMin = amount;
          break;
        }
        default:
          recognised = false;
          parsed.terms.push(term.toLowerCase());
      }
    }
  }

  if (!recognised && parsed.terms.length === 0) return EMPTY_QUERY;
  return parsed;
}

function price(product: FixtureProduct): number {
  return Number.parseFloat(product.priceRange.minVariantPrice.amount);
}

function haystack(product: FixtureProduct): string {
  return [
    product.title,
    product.description,
    product.vendor,
    product.productType ?? "",
    product.handle.replace(/-/g, " "),
    ...product.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function inCollection(dataset: FixtureDataset, product: FixtureProduct, handle: string): boolean {
  if (handle === "all") return true;
  const members = dataset.collectionProducts[handle];
  if (members) return members.includes(product.handle);
  return product.collections.edges.some((edge) => edge.node.handle === handle);
}

export function matchesProductQuery(
  dataset: FixtureDataset,
  product: FixtureProduct,
  parsed: ParsedProductQuery,
): boolean {
  if (parsed.matchesEverything) return true;
  if (
    parsed.collections.length > 0 &&
    !parsed.collections.some((handle) => inCollection(dataset, product, handle))
  ) {
    return false;
  }
  if (parsed.handles.length > 0 && !parsed.handles.includes(product.handle.toLowerCase())) {
    return false;
  }
  if (parsed.vendors.length > 0 && !parsed.vendors.includes(product.vendor.toLowerCase())) {
    return false;
  }
  if (
    parsed.productTypes.length > 0 &&
    !parsed.productTypes.includes((product.productType ?? "").toLowerCase())
  ) {
    return false;
  }
  if (
    parsed.tags.length > 0 &&
    !parsed.tags.some((tag) => product.tags.some((value) => value.toLowerCase() === tag))
  ) {
    return false;
  }
  if (parsed.available !== undefined && product.availableForSale !== parsed.available) return false;
  if (parsed.priceMin !== undefined && price(product) < parsed.priceMin) return false;
  if (parsed.priceMax !== undefined && price(product) > parsed.priceMax) return false;
  if (parsed.terms.length > 0) {
    const text = haystack(product);
    if (!parsed.terms.every((term) => text.includes(term))) return false;
  }
  return true;
}

export function matchesProductFilters(
  product: FixtureProduct,
  filters: ProductFilterInput[],
): boolean {
  return filters.every((filter) => {
    if (filter.available !== undefined && product.availableForSale !== filter.available) {
      return false;
    }
    if (filter.price) {
      const amount = price(product);
      if (filter.price.min !== undefined && amount < filter.price.min) return false;
      if (filter.price.max !== undefined && amount > filter.price.max) return false;
    }
    if (
      filter.productVendor &&
      product.vendor.toLowerCase() !== filter.productVendor.toLowerCase()
    ) {
      return false;
    }
    if (
      filter.productType &&
      (product.productType ?? "").toLowerCase() !== filter.productType.toLowerCase()
    ) {
      return false;
    }
    if (
      filter.tag &&
      !product.tags.some((tag) => tag.toLowerCase() === filter.tag?.toLowerCase())
    ) {
      return false;
    }
    if (filter.variantOption) {
      const { name, value } = filter.variantOption;
      const matched = product.variants.edges.some((edge) =>
        edge.node.selectedOptions.some(
          (option) =>
            option.name.toLowerCase() === name.toLowerCase() &&
            option.value.toLowerCase() === value.toLowerCase(),
        ),
      );
      if (!matched) return false;
    }
    return true;
  });
}

export function readProductFilters(value: unknown): ProductFilterInput[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is ProductFilterInput => !!entry && typeof entry === "object");
}

type Comparator = (a: FixtureProduct, b: FixtureProduct) => number;

const COMPARATORS: Record<string, Comparator> = {
  BEST_SELLING: () => 0,
  COLLECTION_DEFAULT: () => 0,
  CREATED: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  CREATED_AT: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  ID: (a, b) => a.id.localeCompare(b.id),
  MANUAL: () => 0,
  PRICE: (a, b) => price(a) - price(b),
  PRODUCT_TYPE: (a, b) => (a.productType ?? "").localeCompare(b.productType ?? ""),
  RELEVANCE: () => 0,
  TITLE: (a, b) => a.title.localeCompare(b.title),
  UPDATED_AT: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  VENDOR: (a, b) => a.vendor.localeCompare(b.vendor),
};

export function sortProducts(
  products: FixtureProduct[],
  sortKey: unknown,
  reverse: unknown,
): FixtureProduct[] {
  const comparator = COMPARATORS[String(sortKey ?? "")] ?? COMPARATORS.RELEVANCE;
  const sorted = [...products];
  // A stable sort keeps equal keys in dataset order, matching Shopify's defaults.
  sorted.sort(comparator);
  return reverse === true ? sorted.reverse() : sorted;
}

export interface FixturePageInfo {
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
}

export interface PaginatedProducts {
  edges: Array<{ cursor: string; product: FixtureProduct }>;
  pageInfo: FixturePageInfo;
}

export function paginate(
  dataset: FixtureDataset,
  products: FixtureProduct[],
  variables: Record<string, unknown>,
): PaginatedProducts {
  const cursors = products.map((product, index) => ({
    cursor: dataset.cursorFor(product, index),
    product,
  }));
  const after = typeof variables.after === "string" ? variables.after : undefined;
  const start = after ? cursors.findIndex((entry) => entry.cursor === after) + 1 : 0;
  const requested = Number(variables.first);
  const first = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 50;
  const window = cursors.slice(start, start + first);

  return {
    edges: window,
    pageInfo: {
      endCursor: window.at(-1)?.cursor ?? null,
      hasNextPage: start + first < cursors.length,
      hasPreviousPage: start > 0,
      startCursor: window[0]?.cursor ?? null,
    },
  };
}
