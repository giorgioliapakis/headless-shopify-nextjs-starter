import { beforeEach, describe, expect, it } from "vitest";

import { resetFixtureCarts } from "@/lib/shopify/fixtures/cart";
import {
  neutralStorefrontFixtureData,
  neutralStorefrontFixtureFetch,
  resolveNeutralStorefrontFixtureFetch,
} from "@/lib/shopify/fixtures/fetch";
import type { StorefrontEnvironment } from "@/lib/shopify/hydrogen/env";

import baseline from "./neutral-fixture-baseline.json" with { type: "json" };

const environment: StorefrontEnvironment = {
  apiVersion: "2026-07",
  publicStorefrontToken: "fixture-public-token",
  storefrontId: "0",
  storeDomain: "neutral-fixture.myshopify.com",
  usedLegacyAliases: [],
};

const OPERATION_VARIABLES: Record<string, Record<string, unknown>> = {
  "0:searchProducts": { first: 50, query: "*" },
  "1:searchProducts": { after: "fixture-product", first: 12, query: "neutral" },
  "2:searchProducts": { first: 12, query: "collection:'missing'" },
  "3:catalogProducts": { first: 50, query: undefined, sortKey: "BEST_SELLING" },
  "4:catalogProducts": { first: 8, query: "collection:'all'" },
  "5:catalogProducts": { first: 8, query: "collection:'neutral-collection'" },
  "6:searchFacets": { query: "*" },
  "7:searchFacets": { query: "collection:'neutral-collection'" },
  "8:collectionProducts": { first: 50, handle: "neutral-collection" },
  "9:collectionProducts": { first: 50, handle: "all" },
  "10:collectionProducts": { first: 50, handle: "missing" },
  "11:collectionProducts": { collection: "missing", first: 50 },
  "12:getCollections": { first: 250 },
  "13:getCollectionsWithFeaturedImage": { first: 250 },
  "14:getProductsByHandles": { first: 1, query: "handle:neutral-product" },
  "15:getCollection": { handle: "neutral-collection" },
  "16:getCollection": { handle: "nope" },
  "17:getProductByHandle": { handle: "neutral-product" },
  "18:getProductByHandle": { handle: "nope" },
  "19:getProductByHandleWithBundles": { handle: "neutral-product" },
  "20:getProductWithVariants": { handle: "neutral-product" },
  "21:getProductById": { id: "gid://shopify/Product/1000" },
  "22:getProductById": { id: "gid://shopify/Product/9999" },
  "23:getProductVariant": { handle: "neutral-product", selectedOptions: [] },
  "24:getProductVariantWithBundles": { handle: "neutral-product", selectedOptions: [] },
  "25:getProductsByIds": { ids: ["gid://shopify/Product/1000"] },
  "26:nodeHandles": { ids: ["gid://shopify/Product/1000"] },
  "27:complementaryProducts": { handle: "neutral-product" },
  "28:relatedProducts": { handle: "neutral-product" },
  "29:getMenu": { handle: "main-menu" },
  "30:getPage": { handle: "about" },
  "31:getBlogs": { first: 50 },
  "32:getBlog": { first: 24, handle: "journal" },
  "33:getBlog": { first: 24, handle: "nope" },
  "34:getArticle": { articleHandle: "neutral-article", blogHandle: "journal" },
  "35:getArticle": { articleHandle: "nope", blogHandle: "journal" },
  "36:getArticle": { articleHandle: "neutral-article", blogHandle: "nope" },
  "37:getBlogSitemap": { first: 250 },
  "38:getArticleSitemap": { first: 250 },
  "39:getShopPolicies": {},
  "40:shopAnalytics": {},
  "41:predictiveSearch": { limit: 4, query: "neu" },
  "42:getSitemapPagesCount": { type: "PRODUCT" },
  "43:getSitemapPage": { page: 1, type: "PRODUCT" },
  "44:getCart": {},
  "45:getCartDeliveryOptions": {},
  "46:getCartSelectableAddresses": {},
};

describe("neutral Storefront fixture", () => {
  beforeEach(() => {
    resetFixtureCarts();
  });

  it("is explicit and refuses to mask real merchant configuration", () => {
    expect(resolveNeutralStorefrontFixtureFetch(environment, {})).toBeUndefined();
    expect(
      resolveNeutralStorefrontFixtureFetch(environment, { SHOPIFY_STOREFRONT_FIXTURE: "neutral" }),
    ).toBe(neutralStorefrontFixtureFetch);
    expect(() =>
      resolveNeutralStorefrontFixtureFetch(
        { ...environment, storeDomain: "merchant.myshopify.com" },
        { SHOPIFY_STOREFRONT_FIXTURE: "neutral" },
      ),
    ).toThrow("documented fixture domain");
    expect(() =>
      resolveNeutralStorefrontFixtureFetch(
        { ...environment, publicStorefrontToken: "shpat_real_looking_token" },
        { SHOPIFY_STOREFRONT_FIXTURE: "neutral" },
      ),
    ).toThrow("documented fixture domain");
    expect(() =>
      resolveNeutralStorefrontFixtureFetch(
        { ...environment, privateStorefrontToken: "shpat_private" },
        { SHOPIFY_STOREFRONT_FIXTURE: "neutral" },
      ),
    ).toThrow("no private token");
    expect(() =>
      resolveNeutralStorefrontFixtureFetch(environment, { SHOPIFY_STOREFRONT_FIXTURE: "yolo" }),
    ).toThrow("SHOPIFY_STOREFRONT_FIXTURE must be one of");
  });

  // The production build, browser-server, bundle budget and Playwright gates all
  // assert against these exact payloads. Any drift here is a breaking change.
  it("reproduces the frozen determinism contract byte for byte", () => {
    const recorded = baseline as Record<string, unknown>;
    expect(Object.keys(OPERATION_VARIABLES)).toEqual(Object.keys(recorded));
    for (const [key, variables] of Object.entries(OPERATION_VARIABLES)) {
      const operation = key.slice(key.indexOf(":") + 1);
      expect(
        JSON.stringify(neutralStorefrontFixtureData(operation, variables)),
        `${key} drifted`,
      ).toBe(JSON.stringify(recorded[key]));
    }
  });

  it("returns deterministic empty catalogue shapes and rejects unknown operations", async () => {
    const catalog = await neutralStorefrontFixtureFetch("https://fixture.invalid", {
      method: "POST",
      body: JSON.stringify({
        query: "query catalogProducts { products { edges { node { id } } } }",
      }),
    });
    const catalogBody = (await catalog.json()) as {
      data: { products: { edges: Array<{ node: { handle: string } }>; pageInfo: unknown } };
    };
    expect(catalogBody.data.products.edges).toHaveLength(1);
    expect(catalogBody.data.products.edges[0]?.node.handle).toBe("neutral-product");

    const unknown = await neutralStorefrontFixtureFetch("https://fixture.invalid", {
      method: "POST",
      body: JSON.stringify({ query: "query unknownOperation { shop { name } }" }),
    });
    expect(unknown.status).toBe(501);
  });

  it("implements Hydrogen's credential-free cart mutation contract", async () => {
    const create = await neutralStorefrontFixtureFetch("https://fixture.invalid", {
      method: "POST",
      body: JSON.stringify({
        query:
          "mutation CartCreate($input: CartInput!) { cartCreate(input: $input) { cart { id totalQuantity updatedAt } } }",
        variables: {
          input: {
            lines: [{ merchandiseId: "gid://shopify/ProductVariant/1001", quantity: 2 }],
          },
        },
      }),
    });
    const body = (await create.json()) as {
      data: { cartCreate: { cart: { id: string; totalQuantity: number; updatedAt: string } } };
    };

    expect(create.status).toBe(200);
    expect(body.data.cartCreate.cart).toMatchObject({
      id: "gid://shopify/Cart/fixture-cart",
      totalQuantity: 2,
      updatedAt: "2026-01-01T00:00:00Z",
    });
  });

  it("keeps the single-line default for a cart the store has never seen", () => {
    const fresh = neutralStorefrontFixtureData("Cart", { id: "gid://shopify/Cart/fixture-cart" });
    expect(fresh).toEqual({
      cart: expect.objectContaining({
        checkoutUrl: "https://neutral-fixture.myshopify.com/checkouts/fixture",
        id: "gid://shopify/Cart/fixture-cart",
        totalQuantity: 1,
        updatedAt: "2026-01-01T00:00:00Z",
      }),
    });
    expect(neutralStorefrontFixtureData("Cart", { id: "gid://shopify/Cart/other" })).toEqual({
      cart: null,
    });
  });
});
