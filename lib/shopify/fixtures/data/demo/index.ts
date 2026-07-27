/**
 * The `demo` dataset — a rich, brand-neutral storefront that renders every UI
 * surface with zero Shopify credentials. Unlike `neutral` it pins no operation
 * overrides: it runs entirely on the shared resolver's real query semantics.
 */

import type { FixtureDataset, FixtureProduct } from "../../types";
import {
  demoArticles,
  demoBlogs,
  demoCollections,
  DEMO_FIXTURE_DOMAIN,
  demoMenus,
  demoPages,
  demoPolicies,
} from "./content";
import { demoProducts } from "./products";

export const DEMO_FIXTURE_TOKEN = "demo-public-token";
export { DEMO_FIXTURE_DOMAIN };

/** Honest local destination instead of a dead external checkout domain. */
export const DEMO_CHECKOUT_PATH = "/demo-checkout";

function membership(products: FixtureProduct[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const collection of demoCollections) map[collection.handle] = [];
  for (const product of products) {
    for (const edge of product.collections.edges) {
      (map[edge.node.handle] ??= []).push(product.handle);
    }
  }
  return map;
}

export const demoFixtureDataset: FixtureDataset = {
  articles: demoArticles,
  blogs: demoBlogs,
  cart: {
    checkoutUrl: DEMO_CHECKOUT_PATH,
    idFor: (sequence) => `gid://shopify/Cart/demo-cart-${sequence}`,
    lineIdFor: (index) => `gid://shopify/CartLine/demo-line-${index + 1}`,
    productType: "Demo",
    quantityAvailable: 25,
    skuFor: (variant) => `DEMO-${variant.id.split("/").pop() ?? "0"}`,
    updatedAtFor: (revision) =>
      new Date(Date.UTC(2026, 0, 1) + revision * 1000).toISOString().replace(".000Z", "Z"),
  },
  collectionProducts: membership(demoProducts),
  collections: demoCollections,
  currencyCode: "USD",
  cursorFor: (product) => `demo:${product.handle}`,
  menus: demoMenus,
  mode: "demo",
  overrides: {},
  pages: demoPages,
  policies: demoPolicies,
  products: demoProducts,
  shopId: "gid://shopify/Shop/7000",
};
