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

type FixtureCartLineInput = { id?: string; merchandiseId?: string; quantity?: number };

function neutralCartLine(input: FixtureCartLineInput = {}) {
  const quantity = Math.max(1, input.quantity ?? 1);
  return {
    cost: {
      amountPerQuantity: MONEY,
      compareAtAmountPerQuantity: null,
      subtotalAmount: { amount: (24 * quantity).toFixed(2), currencyCode: "USD" },
      totalAmount: { amount: (24 * quantity).toFixed(2), currencyCode: "USD" },
    },
    id: input.id ?? "gid://shopify/CartLine/fixture-line",
    merchandise: {
      id: input.merchandiseId ?? NEUTRAL_VARIANT.id,
      image: null,
      product: {
        handle: NEUTRAL_PRODUCT.handle,
        id: NEUTRAL_PRODUCT.id,
        productType: "Fixture",
        title: NEUTRAL_PRODUCT.title,
        vendor: NEUTRAL_PRODUCT.vendor,
      },
      quantityAvailable: 99,
      selectedOptions: NEUTRAL_VARIANT.selectedOptions,
      sku: "FIXTURE-001",
      title: NEUTRAL_VARIANT.title,
    },
    parentRelationship: null,
    quantity,
  };
}

function neutralCart(
  options: {
    discountCodes?: string[];
    lines?: FixtureCartLineInput[];
    note?: string | null;
  } = {},
) {
  const lines = (options.lines ?? [undefined]).map((line) => neutralCartLine(line));
  const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);
  const total = { amount: (totalQuantity * 24).toFixed(2), currencyCode: "USD" };
  return {
    checkoutUrl: "https://neutral-fixture.myshopify.com/checkouts/fixture",
    cost: { checkoutChargeAmount: total, subtotalAmount: total, totalAmount: total },
    discountCodes: (options.discountCodes ?? []).map((code) => ({ applicable: true, code })),
    id: "gid://shopify/Cart/fixture-cart",
    lines: { nodes: lines },
    note: options.note ?? null,
    totalQuantity,
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function cartMutationPayload(cart: ReturnType<typeof neutralCart>) {
  return { cart, userErrors: [], warnings: [] };
}

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
    case "shopAnalytics":
      return {
        localization: { country: { currency: { isoCode: "USD" } } },
        shop: { id: "gid://shopify/Shop/100" },
      };
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
    case "Cart":
      return {
        cart: String(variables.id ?? "").includes("fixture-cart") ? neutralCart() : null,
      };
    case "CartCreate": {
      const input = (variables.input ?? {}) as { lines?: FixtureCartLineInput[]; note?: string };
      return {
        cartCreate: cartMutationPayload(
          neutralCart({ lines: input.lines?.length ? input.lines : [], note: input.note }),
        ),
      };
    }
    case "CartLinesAdd": {
      const lines = (variables.lines ?? []) as FixtureCartLineInput[];
      return { cartLinesAdd: cartMutationPayload(neutralCart({ lines })) };
    }
    case "CartLinesUpdate": {
      const lines = (variables.lines ?? []) as FixtureCartLineInput[];
      return { cartLinesUpdate: cartMutationPayload(neutralCart({ lines })) };
    }
    case "CartLinesRemove":
      return { cartLinesRemove: cartMutationPayload(neutralCart({ lines: [] })) };
    case "CartDiscountCodesUpdate": {
      const discountCodes = (variables.discountCodes ?? []) as string[];
      return {
        cartDiscountCodesUpdate: cartMutationPayload(neutralCart({ discountCodes })),
      };
    }
    case "CartNoteUpdate":
      return {
        cartNoteUpdate: cartMutationPayload(
          neutralCart({ note: typeof variables.note === "string" ? variables.note : null }),
        ),
      };
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
