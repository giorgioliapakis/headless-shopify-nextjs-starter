import { beforeEach, describe, expect, it } from "vitest";

import { decodeEncodedVariant } from "@/lib/shopify/encoded-variants";
import { renderDemoArtwork } from "@/lib/shopify/fixtures/artwork";
import { resetFixtureCarts } from "@/lib/shopify/fixtures/cart";
import { demoFixtureDataset } from "@/lib/shopify/fixtures/data/demo";
import { encodeVariantTrie } from "@/lib/shopify/fixtures/data/demo/build";
import {
  demoStorefrontFixtureData as data,
  demoStorefrontFixtureFetch,
  resolveStorefrontFixtureFetch,
} from "@/lib/shopify/fixtures/fetch";
import type { StorefrontEnvironment } from "@/lib/shopify/hydrogen/env";

const environment: StorefrontEnvironment = {
  apiVersion: "2026-07",
  publicStorefrontToken: "demo-public-token",
  storefrontId: "0",
  storeDomain: "demo-fixture.myshopify.com",
  usedLegacyAliases: [],
};

type Card = { availableForSale: boolean; handle: string; vendor: string };
type Edges = { edges: Array<{ cursor: string; node: Card }>; pageInfo: Record<string, unknown> };

function search(variables: Record<string, unknown>): Edges {
  return (data("searchProducts", variables) as { search: Edges }).search;
}

describe("demo Storefront fixture", () => {
  beforeEach(() => {
    resetFixtureCarts();
  });

  it("applies the same fail-closed gate as the neutral mode", () => {
    expect(resolveStorefrontFixtureFetch(environment, {})).toBeUndefined();
    expect(resolveStorefrontFixtureFetch(environment, { SHOPIFY_STOREFRONT_FIXTURE: "demo" })).toBe(
      demoStorefrontFixtureFetch,
    );
    expect(() =>
      resolveStorefrontFixtureFetch(
        { ...environment, storeDomain: "merchant.myshopify.com" },
        { SHOPIFY_STOREFRONT_FIXTURE: "demo" },
      ),
    ).toThrow("documented fixture domain");
    expect(() =>
      resolveStorefrontFixtureFetch(
        { ...environment, publicStorefrontToken: "shpat_real_looking_token" },
        { SHOPIFY_STOREFRONT_FIXTURE: "demo" },
      ),
    ).toThrow("documented fixture domain");
    expect(() =>
      resolveStorefrontFixtureFetch(
        { ...environment, privateStorefrontToken: "shpat_private" },
        { SHOPIFY_STOREFRONT_FIXTURE: "demo" },
      ),
    ).toThrow("no private token");
    // The demo dataset must not answer for the neutral identity, or vice versa.
    expect(() =>
      resolveStorefrontFixtureFetch(
        { ...environment, storeDomain: "neutral-fixture.myshopify.com" },
        { SHOPIFY_STOREFRONT_FIXTURE: "demo" },
      ),
    ).toThrow("documented fixture domain");
  });

  it("ships a catalogue rich enough that no surface renders empty", () => {
    const { articles, blogs, collections, menus, pages, policies, products } = demoFixtureDataset;
    expect(products.length).toBeGreaterThan(40);
    expect(collections).toHaveLength(5);
    expect(articles).toHaveLength(6);
    expect(pages).toHaveLength(2);
    expect(blogs).toHaveLength(1);
    expect(Object.keys(policies).length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(menus).sort()).toEqual(["footer", "main-menu"]);

    const multiOption = products.filter(
      (product) =>
        product.options.some((option) => option.name === "Color") &&
        product.options.some((option) => option.name === "Size"),
    );
    expect(multiOption.length).toBeGreaterThanOrEqual(6);
    expect(products.filter((product) => product.compareAtPriceRange).length).toBeGreaterThanOrEqual(
      4,
    );
    expect(products.filter((product) => !product.availableForSale).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(
      products.filter((product) =>
        product.variants.edges.some((edge) => edge.node.sellingPlanAllocations),
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(products.every((product) => product.featuredImage?.url.startsWith("/demo-image/"))).toBe(
      true,
    );
    // Overlapping membership: collection sizes must exceed the product count.
    const memberships = Object.values(demoFixtureDataset.collectionProducts).flat();
    expect(memberships.length).toBeGreaterThan(products.length);
  });

  it("encodes option tries Hydrogen's decoder can read back", () => {
    const product = demoFixtureDataset.products.find(
      (candidate) => candidate.handle === "heavyweight-cotton-tee",
    );
    const existence = decodeEncodedVariant(product?.encodedVariantExistence ?? "");
    const availability = decodeEncodedVariant(product?.encodedVariantAvailability ?? "");
    expect(existence).toHaveLength(product?.variantsCount.count ?? 0);
    expect(availability.length).toBe(existence.length - 3);
    expect(
      encodeVariantTrie([
        [0, 0],
        [0, 1],
        [1, 2],
      ]),
    ).toBe("v1_0:0 1,1:2");
    expect(decodeEncodedVariant("v1_0:0 1,1:2")).toEqual([
      [0, 0],
      [0, 1],
      [1, 2],
    ]);
  });

  it("paginates the all-products view so hasNextPage actually fires", () => {
    const first = search({ first: 40, query: "*" });
    expect(first.edges).toHaveLength(40);
    expect(first.pageInfo.hasNextPage).toBe(true);

    const second = search({ after: first.pageInfo.endCursor, first: 40, query: "*" });
    expect(second.edges.length).toBeGreaterThan(0);
    expect(second.pageInfo.hasNextPage).toBe(false);
    expect(second.pageInfo.hasPreviousPage).toBe(true);
    const overlap = second.edges.filter((edge) =>
      first.edges.some((other) => other.node.handle === edge.node.handle),
    );
    expect(overlap).toHaveLength(0);
  });

  it("implements collection scoping, sorting, filtering and search matching", () => {
    const apparel = search({ first: 50, query: "collection:'apparel'" });
    expect(apparel.edges.length).toBeGreaterThan(4);
    expect(apparel.edges.every((edge) => edge.node.handle !== "oak-monitor-riser")).toBe(true);
    expect(search({ first: 50, query: "collection:'nope'" }).edges).toHaveLength(0);

    const cheapFirst = search({ first: 50, query: "*", sortKey: "PRICE" });
    const dear = search({ first: 50, query: "*", reverse: true, sortKey: "PRICE" });
    expect(cheapFirst.edges[0]?.node.handle).not.toBe(dear.edges[0]?.node.handle);

    const inStock = search({
      first: 50,
      productFilters: [{ available: true }],
      query: "*",
    });
    expect(inStock.edges.every((edge) => edge.node.availableForSale)).toBe(true);

    const byOption = search({
      first: 50,
      productFilters: [{ variantOption: { name: "color", value: "Moss" } }],
      query: "*",
    });
    expect(byOption.edges.length).toBeGreaterThan(2);

    const byVendor = search({ first: 50, query: "vendor:'Atlas Supply Co.'" });
    expect(byVendor.edges.every((edge) => edge.node.vendor === "Atlas Supply Co.")).toBe(true);

    const text = search({ first: 50, query: "lantern" });
    expect(text.edges[0]?.node.handle).toBe("halo-camp-lantern");
  });

  it("returns real facet payloads for the collection sidebar", () => {
    // `workspace` mixes in-stock and sold-out products plus Color and Size axes.
    const collection = data("collectionProducts", { first: 40, handle: "workspace" }) as {
      collection: { products: { filters: Array<{ id: string; values: unknown[] }> } };
    };
    const ids = collection.collection.products.filters.map((filter) => filter.id);
    expect(ids).toContain("filter.v.price");
    expect(ids).toContain("filter.v.availability");
    expect(ids).toContain("filter.v.option.color");
    expect(ids).toContain("filter.v.option.size");
    expect(ids).toContain("filter.p.vendor");

    const facets = data("searchFacets", { query: "*" }) as {
      search: { productFilters: unknown[]; totalCount: number };
    };
    expect(facets.search.productFilters.length).toBeGreaterThan(3);
    expect(facets.search.totalCount).toBe(demoFixtureDataset.products.length);
    expect(data("collectionProducts", { handle: "missing" })).toEqual({ collection: null });
  });

  it("resolves variants, recommendations, menus, pages and policies", () => {
    const variant = data("getProductVariant", {
      handle: "heavyweight-cotton-tee",
      selectedOptions: [
        { name: "Color", value: "Chalk" },
        { name: "Size", value: "L" },
      ],
    }) as { productByHandle: { selectedOrFirstAvailableVariant: { title: string } } };
    expect(variant.productByHandle.selectedOrFirstAvailableVariant.title).toBe("Chalk / L");

    const related = data("relatedProducts", { handle: "heavyweight-cotton-tee" }) as {
      productRecommendations: Card[];
    };
    expect(related.productRecommendations.length).toBeGreaterThan(2);
    expect(
      related.productRecommendations.every((card) => card.handle !== "heavyweight-cotton-tee"),
    ).toBe(true);

    const menu = data("getMenu", { handle: "main-menu" }) as {
      menu: { items: Array<{ items: unknown[] }> };
    };
    expect(menu.menu.items.length).toBeGreaterThan(3);
    expect(menu.menu.items[0]?.items.length).toBeGreaterThan(3);
    expect(data("getMenu", { handle: "nope" })).toEqual({ menu: null });

    expect((data("getPage", { handle: "about" }) as { page: { title: string } }).page.title).toBe(
      "About this demo",
    );
    const policies = data("getShopPolicies", {}) as { shop: Record<string, unknown> };
    expect(Object.values(policies.shop).filter(Boolean).length).toBeGreaterThanOrEqual(4);

    const predictive = data("predictiveSearch", { limit: 4, query: "tote" }) as {
      predictiveSearch: { products: Card[]; queries: unknown[] };
    };
    expect(predictive.predictiveSearch.products[0]?.handle).toBe("arc-everyday-tote");
    expect(predictive.predictiveSearch.queries.length).toBeGreaterThan(0);

    const blog = data("getBlog", { first: 24, handle: "journal" }) as {
      blog: { articles: { nodes: unknown[] } };
    };
    expect(blog.blog.articles.nodes).toHaveLength(6);
  });

  it("keeps cart state across add, update, remove, discount and note round-trips", () => {
    const created = (
      data("CartCreate", {
        input: { lines: [{ merchandiseId: "gid://shopify/ProductVariant/5001", quantity: 1 }] },
      }) as { cartCreate: { cart: { id: string; lines: { nodes: Array<{ id: string }> } } } }
    ).cartCreate.cart;
    expect(created.lines.nodes).toHaveLength(1);

    const added = (
      data("CartLinesAdd", {
        cartId: created.id,
        lines: [{ merchandiseId: "gid://shopify/ProductVariant/5101", quantity: 2 }],
      }) as { cartLinesAdd: { cart: { lines: { nodes: unknown[] }; totalQuantity: number } } }
    ).cartLinesAdd.cart;
    // The old fixture dropped the first line here.
    expect(added.lines.nodes).toHaveLength(2);
    expect(added.totalQuantity).toBe(3);

    const queried = (
      data("Cart", { id: created.id }) as {
        cart: {
          checkoutUrl: string;
          lines: { nodes: Array<{ id: string }> };
          totalQuantity: number;
        };
      }
    ).cart;
    expect(queried.totalQuantity).toBe(3);
    expect(queried.checkoutUrl).toBe("/demo-checkout");

    const secondLineId = queried.lines.nodes[1]?.id;
    const updated = (
      data("CartLinesUpdate", {
        cartId: created.id,
        lines: [{ id: secondLineId, quantity: 5 }],
      }) as { cartLinesUpdate: { cart: { totalQuantity: number } } }
    ).cartLinesUpdate.cart;
    expect(updated.totalQuantity).toBe(6);

    const discounted = (
      data("CartDiscountCodesUpdate", {
        cartId: created.id,
        discountCodes: ["DEMO10"],
      }) as {
        cartDiscountCodesUpdate: { cart: { discountCodes: unknown[]; totalQuantity: number } };
      }
    ).cartDiscountCodesUpdate.cart;
    expect(discounted.discountCodes).toEqual([{ applicable: true, code: "DEMO10" }]);
    expect(discounted.totalQuantity).toBe(6);

    const noted = (
      data("CartNoteUpdate", { cartId: created.id, note: "Leave at the door" }) as {
        cartNoteUpdate: { cart: { note: string; totalQuantity: number } };
      }
    ).cartNoteUpdate.cart;
    expect(noted.note).toBe("Leave at the door");

    const removed = (
      data("CartLinesRemove", { cartId: created.id, lineIds: [secondLineId] }) as {
        cartLinesRemove: { cart: { discountCodes: unknown[]; totalQuantity: number } };
      }
    ).cartLinesRemove.cart;
    // Removing one line must leave the other line and the discount intact.
    expect(removed.totalQuantity).toBe(1);
    expect(removed.discountCodes).toHaveLength(1);

    expect((data("Cart", { id: "gid://shopify/Cart/never-created" }) as { cart: null }).cart).toBe(
      null,
    );
  });

  it("renders deterministic, self-hosted artwork", () => {
    const first = renderDemoArtwork("product/arc-everyday-tote/1", 64, 80);
    const again = renderDemoArtwork("product/arc-everyday-tote/1", 64, 80);
    const other = renderDemoArtwork("product/ridge-roll-top-pack/1", 64, 80);
    expect(Buffer.from(first).equals(Buffer.from(again))).toBe(true);
    expect(Buffer.from(first).equals(Buffer.from(other))).toBe(false);
    expect([...first.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });
});
