import "server-only";
import type { StorefrontEnvironment } from "@/lib/shopify/hydrogen/env";

const FIXTURE_DOMAIN = "neutral-fixture.myshopify.com";
const FIXTURE_TOKEN = "fixture-public-token";
const PAGE_INFO = {
  endCursor: null,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
};
const MONEY = { amount: "24.00", currencyCode: "USD" };
const NEUTRAL_VARIANT = {
  availableForSale: true,
  compareAtPrice: null,
  id: "gid://shopify/ProductVariant/1001",
  image: null,
  price: MONEY,
  selectedOptions: [{ name: "Title", value: "Default Title" }],
  title: "Default Title",
};
const NEUTRAL_PRODUCT = {
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
const NEUTRAL_PRODUCT_CARD = {
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
const NEUTRAL_COLLECTION = {
  description: "A neutral synthetic collection for deterministic verification.",
  handle: "neutral-collection",
  image: null,
  seo: { description: null, title: null },
  title: "Neutral Collection",
  updatedAt: "2026-01-01T00:00:00Z",
};

function operationName(query: string): string {
  return query.match(/\b(?:query|mutation)\s+(\w+)/)?.[1] ?? "anonymous";
}

function emptyShopPolicies() {
  return {
    contactInformation: null,
    legalNotice: null,
    privacyPolicy: null,
    refundPolicy: null,
    shippingPolicy: null,
    termsOfSale: null,
    termsOfService: null,
  };
}

export function neutralStorefrontFixtureData(
  operation: string,
  variables: Record<string, unknown> = {},
): Record<string, unknown> | null {
  switch (operation) {
    case "searchProducts":
      return {
        search: {
          edges: [{ cursor: "fixture-product", node: NEUTRAL_PRODUCT_CARD }],
          pageInfo: PAGE_INFO,
          totalCount: 1,
        },
      };
    case "catalogProducts":
      return {
        products: {
          edges: [{ cursor: "fixture-product", node: NEUTRAL_PRODUCT_CARD }],
          pageInfo: PAGE_INFO,
        },
      };
    case "searchFacets":
      return {
        search: { nodes: [NEUTRAL_PRODUCT_CARD], productFilters: [], totalCount: 1 },
      };
    case "collectionProducts":
      return {
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
      };
    case "getCollections":
      return { collections: { edges: [{ node: NEUTRAL_COLLECTION }] } };
    case "getCollectionsWithFeaturedImage":
      return {
        collections: {
          edges: [
            {
              node: {
                ...NEUTRAL_COLLECTION,
                products: { edges: [{ node: { featuredImage: null, id: NEUTRAL_PRODUCT.id } }] },
              },
            },
          ],
        },
      };
    case "getProductsByHandles":
      return { products: { edges: [{ node: NEUTRAL_PRODUCT_CARD }] } };
    case "getCollection":
      return {
        collection: variables.handle === NEUTRAL_COLLECTION.handle ? NEUTRAL_COLLECTION : null,
      };
    case "getProductByHandle":
    case "getProductByHandleWithBundles":
    case "getProductWithVariants":
      return {
        productByHandle: variables.handle === NEUTRAL_PRODUCT.handle ? NEUTRAL_PRODUCT : null,
      };
    case "getProductById":
    case "getProductVariant":
    case "getProductVariantWithBundles":
      return { node: variables.id === NEUTRAL_PRODUCT.id ? NEUTRAL_PRODUCT : null };
    case "getProductsByIds":
    case "nodeHandles":
      return { nodes: [] };
    case "complementaryProducts":
    case "relatedProducts":
      return { productRecommendations: [] };
    case "getMenu":
      return { menu: null };
    case "getPage":
      return { page: null };
    case "getShopPolicies":
      return { shop: emptyShopPolicies() };
    case "predictiveSearch":
      return {
        predictiveSearch: { articles: [], collections: [], pages: [], products: [], queries: [] },
      };
    case "getSitemapPagesCount":
      return { sitemap: { pagesCount: { count: 0 } } };
    case "getSitemapPage":
      return { sitemap: { resources: { hasNextPage: false, items: [] } } };
    case "getCart":
    case "getCartDeliveryOptions":
    case "getCartSelectableAddresses":
      return { cart: null };
    default:
      return null;
  }
}

export const neutralStorefrontFixtureFetch: typeof globalThis.fetch = async (_input, init) => {
  let query = "";
  let variables: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(String(init?.body)) as { query?: unknown; variables?: unknown };
    if (typeof parsed.query === "string") query = parsed.query;
    if (parsed.variables && typeof parsed.variables === "object") {
      variables = parsed.variables as Record<string, unknown>;
    }
  } catch {
    // The explicit error response below makes malformed fixture requests visible.
  }

  const operation = operationName(query);
  const data = neutralStorefrontFixtureData(operation, variables);
  return Response.json(
    data ? { data } : { errors: [{ message: `Neutral fixture does not implement ${operation}` }] },
    {
      status: data ? 200 : 501,
      headers: {
        "cache-control": "no-store",
        "x-shopify-api-version": "2026-07",
        "x-request-id": `fixture-${operation}`,
      },
    },
  );
};

export function resolveNeutralStorefrontFixtureFetch(
  environment: StorefrontEnvironment,
  source: Readonly<Record<string, string | undefined>> = process.env,
): typeof globalThis.fetch | undefined {
  const mode = source.SHOPIFY_STOREFRONT_FIXTURE;
  if (!mode) return undefined;
  if (mode !== "neutral") throw new Error("SHOPIFY_STOREFRONT_FIXTURE must be 'neutral' when set");
  if (
    environment.storeDomain !== FIXTURE_DOMAIN ||
    environment.publicStorefrontToken !== FIXTURE_TOKEN ||
    environment.privateStorefrontToken
  ) {
    throw new Error(
      "Neutral fixture mode requires the documented fixture domain/public token and no private token",
    );
  }
  return neutralStorefrontFixtureFetch;
}
