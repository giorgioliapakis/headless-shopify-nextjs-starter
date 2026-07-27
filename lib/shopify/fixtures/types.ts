/**
 * Shared shapes for the credential-free Storefront fixture datasets.
 *
 * A dataset only describes catalogue *data*. All query semantics (lookup,
 * pagination, sorting, filtering, search matching, cart state) live in
 * `resolver.ts` and are shared by every mode.
 */

export interface FixtureMoney {
  amount: string;
  currencyCode: string;
}

export interface FixtureImage {
  altText: string | null;
  height: number;
  url: string;
  width: number;
}

export interface FixtureSelectedOption {
  name: string;
  value: string;
}

export interface FixtureSellingPlanAllocation {
  priceAdjustments: Array<{
    compareAtPrice: FixtureMoney;
    perDeliveryPrice: FixtureMoney;
    price: FixtureMoney;
  }>;
  sellingPlan: {
    description: string | null;
    id: string;
    name: string;
    options: Array<{ name: string | null; value: string | null }>;
    recurringDeliveries: boolean;
  };
}

export interface FixtureVariant {
  availableForSale: boolean;
  compareAtPrice: FixtureMoney | null;
  id: string;
  image: FixtureImage | null;
  price: FixtureMoney;
  selectedOptions: FixtureSelectedOption[];
  sellingPlanAllocations?: { nodes: FixtureSellingPlanAllocation[] };
  title: string;
}

export interface FixtureOptionValue {
  firstSelectableVariant: { image: FixtureImage | null } | null;
  id: string;
  name: string;
  swatch: { color: string | null; image: { previewImage: { url: string } } | null } | null;
}

export interface FixtureOption {
  id: string;
  name: string;
  optionValues: FixtureOptionValue[];
}

export interface FixtureMediaNode {
  image?: FixtureImage | null;
  mediaContentType: "IMAGE";
}

export interface FixturePriceRange {
  maxVariantPrice: FixtureMoney;
  minVariantPrice: FixtureMoney;
}

export interface FixtureProduct {
  availableForSale: boolean;
  category: { ancestors: Array<{ id: string; name: string }>; id: string; name: string } | null;
  collections: { edges: Array<{ node: { handle: string } }> };
  compareAtPriceRange: FixturePriceRange | null;
  description: string;
  descriptionHtml: string;
  encodedVariantAvailability: string | null;
  encodedVariantExistence: string | null;
  featuredImage: FixtureImage | null;
  handle: string;
  id: string;
  media: { edges: Array<{ node: FixtureMediaNode }> };
  options: FixtureOption[];
  priceRange: FixturePriceRange;
  productType?: string;
  requiresSellingPlan?: boolean;
  selectedOrFirstAvailableVariant: FixtureVariant;
  seo: { description: string | null; title: string | null };
  tags: string[];
  title: string;
  updatedAt: string;
  variants: { edges: Array<{ node: FixtureVariant }> };
  variantsCount: { count: number };
  vendor: string;
}

export interface FixtureProductCard {
  availableForSale: boolean;
  compareAtPriceRange: FixturePriceRange | null;
  featuredImage: FixtureImage | null;
  handle: string;
  id: string;
  priceRange: FixturePriceRange;
  selectedOrFirstAvailableVariant: FixtureVariant;
  title: string;
  vendor: string;
}

export interface FixtureCollection {
  description: string;
  handle: string;
  id: string;
  image: FixtureImage | null;
  seo: { description: string | null; title: string | null };
  title: string;
  updatedAt: string;
}

export interface FixtureBlog {
  handle: string;
  id: string;
  seo: { description: string | null; title: string | null };
  title: string;
}

export interface FixtureArticle {
  authorV2: { name: string } | null;
  blog: { handle: string; title: string };
  contentHtml: string;
  excerpt: string;
  handle: string;
  id: string;
  image: FixtureImage | null;
  publishedAt: string;
  seo: { description: string | null; title: string | null };
  tags: string[];
  title: string;
}

export interface FixturePage {
  body: string;
  bodySummary: string;
  handle: string;
  seo: { description: string | null; title: string | null };
  title: string;
  updatedAt: string;
}

export interface FixturePolicy {
  body: string;
  handle: string;
  title: string;
}

export type FixturePolicyKey =
  | "contactInformation"
  | "legalNotice"
  | "privacyPolicy"
  | "refundPolicy"
  | "shippingPolicy"
  | "termsOfSale"
  | "termsOfService";

export interface FixtureMenuItem {
  id: string;
  items: FixtureMenuItem[];
  resource: { handle?: string } | null;
  tags: string[];
  title: string;
  type: string;
  url: string | null;
}

export interface FixtureMenu {
  handle: string;
  id: string;
  items: FixtureMenuItem[];
  title: string;
}

export interface FixtureCartConfig {
  /** Absolute or app-relative destination used for `cart.checkoutUrl`. */
  checkoutUrl: string;
  /** Stable id handed out by `cartCreate` (a counter suffix keeps demo carts distinct). */
  idFor: (sequence: number) => string;
  /** Line id assigned to a freshly created line. */
  lineIdFor: (index: number) => string;
  /** `merchandise.product.productType` fallback for products without one. */
  productType: string;
  /** `merchandise.quantityAvailable`. */
  quantityAvailable: number;
  /** Line-item SKU. */
  skuFor: (variant: FixtureVariant) => string;
  /**
   * When true, a `Cart` query for an id the store has never seen synthesises the
   * legacy single-line cart instead of returning `null`. Only `neutral` needs it.
   */
  synthesizeUnknown?: (id: string) => boolean;
  /** Monotonic `updatedAt` stamp. Frozen modes return a constant. */
  updatedAtFor: (revision: number) => string;
}

/** Response payloads a mode pins verbatim, bypassing the shared resolver. */
export type FixtureOverride = (
  variables: Record<string, unknown>,
) => Record<string, unknown> | null;

export interface FixtureDataset {
  articles: FixtureArticle[];
  blogs: FixtureBlog[];
  cart: FixtureCartConfig;
  /** Opaque pagination cursor for a catalogue position. */
  cursorFor: (product: FixtureProduct, index: number) => string;
  /** Collection handle -> ordered product handles. */
  collectionProducts: Record<string, string[]>;
  collections: FixtureCollection[];
  currencyCode: string;
  menus: Record<string, FixtureMenu>;
  mode: string;
  overrides: Record<string, FixtureOverride>;
  pages: FixturePage[];
  policies: Partial<Record<FixturePolicyKey, FixturePolicy>>;
  products: FixtureProduct[];
  shopId: string;
}
