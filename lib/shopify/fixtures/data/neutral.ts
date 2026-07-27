/**
 * The `neutral` dataset — a frozen determinism contract.
 *
 * `scripts/verify/production.mjs`, `scripts/verify/browser-server.mjs`, the
 * bundle budget and the Playwright suite all assert against this exact output,
 * so the payloads below must not change. Operations whose original stub predates
 * the shared resolver's real query semantics are pinned through `overrides`;
 * everything else (lookup, recommendations, policies, analytics, cart state)
 * flows through the same resolver the `demo` dataset uses.
 */

import type {
  FixtureArticle,
  FixtureBlog,
  FixtureCollection,
  FixtureDataset,
  FixtureProduct,
  FixtureProductCard,
  FixtureVariant,
} from "../types";

export const NEUTRAL_FIXTURE_DOMAIN = "neutral-fixture.myshopify.com";
export const NEUTRAL_FIXTURE_TOKEN = "fixture-public-token";

const PAGE_INFO = {
  endCursor: null,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
};
const MONEY = { amount: "24.00", currencyCode: "USD" };
const NEUTRAL_VARIANT: FixtureVariant = {
  availableForSale: true,
  compareAtPrice: null,
  id: "gid://shopify/ProductVariant/1001",
  image: null,
  price: MONEY,
  selectedOptions: [{ name: "Title", value: "Default Title" }],
  title: "Default Title",
};
const NEUTRAL_PRODUCT: FixtureProduct = {
  availableForSale: true,
  category: null,
  collections: { edges: [{ node: { handle: "neutral-collection" } }] },
  compareAtPriceRange: null,
  description: "A neutral synthetic product used only for deterministic platform verification.",
  descriptionHtml:
    "<p>A neutral synthetic product used only for deterministic platform verification.</p>",
  encodedVariantAvailability: null,
  encodedVariantExistence: null,
  featuredImage: null,
  handle: "neutral-product",
  id: "gid://shopify/Product/1000",
  media: { edges: [] },
  options: [
    {
      id: "gid://shopify/ProductOption/1002",
      name: "Title",
      optionValues: [
        {
          firstSelectableVariant: { image: null },
          id: "gid://shopify/ProductOptionValue/1003",
          name: "Default Title",
          swatch: null,
        },
      ],
    },
  ],
  priceRange: { maxVariantPrice: MONEY, minVariantPrice: MONEY },
  selectedOrFirstAvailableVariant: NEUTRAL_VARIANT,
  seo: { description: null, title: null },
  tags: [],
  title: "Neutral Product",
  updatedAt: "2026-01-01T00:00:00Z",
  variants: { edges: [{ node: NEUTRAL_VARIANT }] },
  variantsCount: { count: 1 },
  vendor: "Fixture Supply",
};
const NEUTRAL_PRODUCT_CARD: FixtureProductCard = {
  availableForSale: NEUTRAL_PRODUCT.availableForSale,
  compareAtPriceRange: NEUTRAL_PRODUCT.compareAtPriceRange,
  featuredImage: NEUTRAL_PRODUCT.featuredImage,
  handle: NEUTRAL_PRODUCT.handle,
  id: NEUTRAL_PRODUCT.id,
  priceRange: NEUTRAL_PRODUCT.priceRange,
  selectedOrFirstAvailableVariant: NEUTRAL_VARIANT,
  title: NEUTRAL_PRODUCT.title,
  vendor: NEUTRAL_PRODUCT.vendor,
};
const NEUTRAL_COLLECTION: FixtureCollection = {
  description: "A neutral synthetic collection for deterministic verification.",
  handle: "neutral-collection",
  id: "gid://shopify/Collection/200",
  image: null,
  seo: { description: null, title: null },
  title: "Neutral Collection",
  updatedAt: "2026-01-01T00:00:00Z",
};
const NEUTRAL_BLOG: FixtureBlog = {
  handle: "journal",
  id: "gid://shopify/Blog/2000",
  seo: { description: "Neutral fixture articles.", title: "Journal" },
  title: "Journal",
};
const NEUTRAL_ARTICLE: FixtureArticle = {
  authorV2: { name: "Fixture Editor" },
  blog: { handle: NEUTRAL_BLOG.handle, title: NEUTRAL_BLOG.title },
  contentHtml: "<p>Neutral fixture article content.</p>",
  excerpt: "A neutral synthetic article used for deterministic verification.",
  handle: "neutral-article",
  id: "gid://shopify/Article/2001",
  image: null,
  publishedAt: "2026-01-01T00:00:00Z",
  seo: { description: null, title: null },
  tags: [],
  title: "Neutral Article",
};

export const neutralFixtureDataset: FixtureDataset = {
  articles: [NEUTRAL_ARTICLE],
  blogs: [NEUTRAL_BLOG],
  cart: {
    checkoutUrl: "https://neutral-fixture.myshopify.com/checkouts/fixture",
    idFor: () => "gid://shopify/Cart/fixture-cart",
    lineIdFor: (index) =>
      index === 0
        ? "gid://shopify/CartLine/fixture-line"
        : `gid://shopify/CartLine/fixture-line-${index}`,
    productType: "Fixture",
    quantityAvailable: 99,
    skuFor: () => "FIXTURE-001",
    synthesizeUnknown: (id) => id.includes("fixture-cart"),
    updatedAtFor: () => "2026-01-01T00:00:00Z",
  },
  collectionProducts: { "neutral-collection": [NEUTRAL_PRODUCT.handle] },
  collections: [NEUTRAL_COLLECTION],
  currencyCode: "USD",
  cursorFor: () => "fixture-product",
  menus: {},
  mode: "neutral",
  // Frozen stubs. Each predates the shared resolver's real query semantics and is
  // load-bearing for the production/browser/bundle verification gates.
  overrides: {
    catalogProducts: () => ({
      products: {
        edges: [{ cursor: "fixture-product", node: NEUTRAL_PRODUCT_CARD }],
        pageInfo: PAGE_INFO,
      },
    }),
    collectionProducts: (variables) => ({
      collection:
        variables.handle === "missing" || variables.collection === "missing"
          ? null
          : {
              products: {
                edges: [{ cursor: "fixture-product", node: NEUTRAL_PRODUCT_CARD }],
                filters: [],
                pageInfo: PAGE_INFO,
              },
            },
    }),
    getArticleSitemap: () => ({
      articles: {
        nodes: [
          {
            blog: { handle: NEUTRAL_BLOG.handle },
            handle: NEUTRAL_ARTICLE.handle,
            publishedAt: NEUTRAL_ARTICLE.publishedAt,
          },
        ],
        pageInfo: PAGE_INFO,
      },
    }),
    getBlog: (variables) => ({
      blog:
        variables.handle === NEUTRAL_BLOG.handle
          ? { ...NEUTRAL_BLOG, articles: { nodes: [NEUTRAL_ARTICLE], pageInfo: PAGE_INFO } }
          : null,
    }),
    getBlogSitemap: () => ({
      blogs: { nodes: [{ handle: NEUTRAL_BLOG.handle }], pageInfo: PAGE_INFO },
    }),
    getProductsByHandles: () => ({ products: { edges: [{ node: NEUTRAL_PRODUCT_CARD }] } }),
    getProductsByIds: () => ({ nodes: [] }),
    getProductVariant: (variables) => ({
      node: variables.id === NEUTRAL_PRODUCT.id ? NEUTRAL_PRODUCT : null,
    }),
    getProductVariantWithBundles: (variables) => ({
      node: variables.id === NEUTRAL_PRODUCT.id ? NEUTRAL_PRODUCT : null,
    }),
    getSitemapPage: () => ({ sitemap: { resources: { hasNextPage: false, items: [] } } }),
    getSitemapPagesCount: () => ({ sitemap: { pagesCount: { count: 0 } } }),
    nodeHandles: () => ({ nodes: [] }),
    predictiveSearch: () => ({
      predictiveSearch: { articles: [], collections: [], pages: [], products: [], queries: [] },
    }),
    searchFacets: () => ({
      search: { nodes: [NEUTRAL_PRODUCT_CARD], productFilters: [], totalCount: 1 },
    }),
    searchProducts: () => ({
      search: {
        edges: [{ cursor: "fixture-product", node: NEUTRAL_PRODUCT_CARD }],
        pageInfo: PAGE_INFO,
        totalCount: 1,
      },
    }),
  },
  pages: [],
  policies: {},
  products: [NEUTRAL_PRODUCT],
  shopId: "gid://shopify/Shop/100",
};
