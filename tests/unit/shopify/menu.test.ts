import { describe, expect, it } from "vitest";

import { resolveMenuItems } from "@/lib/shopify/operations/menu";
import { transformShopifyMenu } from "@/lib/shopify/transforms/menu";
import type { MenuItem } from "@/lib/shopify/types/menu";
import { shopConfig } from "@/shop.config";

const fallback: MenuItem[] = [
  { id: "fallback", title: "Shop", url: "/collections/all", type: "HTTP", items: [] },
];

function storeMenu(items: Array<{ handle: string; title: string }>) {
  return transformShopifyMenu({
    id: "gid://shopify/Menu/1",
    handle: "main-menu",
    title: "Main menu",
    items: items.map((item, index) => ({
      id: `gid://shopify/MenuItem/${index}`,
      title: item.title,
      url: `https://store.myshopify.com/collections/${item.handle}`,
      type: "COLLECTION" as const,
      tags: [],
      resource: { handle: item.handle },
      items: [],
    })),
  });
}

describe("storefront menu resolution", () => {
  it("prefers the merchant's own Shopify menu over the configured fallback", () => {
    const menu = storeMenu([
      { handle: "new-in", title: "New in" },
      { handle: "sale", title: "Sale" },
    ]);

    expect(resolveMenuItems(menu, fallback).map((item) => item.title)).toEqual(["New in", "Sale"]);
  });

  it("falls back when the store has no menu under the configured handle", () => {
    expect(resolveMenuItems(null, fallback)).toEqual(fallback);
  });

  it("falls back when the menu exists but is empty", () => {
    expect(resolveMenuItems(storeMenu([]), fallback)).toEqual(fallback);
  });

  it("exposes both menu handles as configuration rather than hardcoding them", () => {
    expect(shopConfig.navigation.menuHandles.nav).toBeTypeOf("string");
    expect(shopConfig.navigation.menuHandles.footer).toBeTypeOf("string");
    expect(shopConfig.navigation.menuHandles.nav.length).toBeGreaterThan(0);
    expect(shopConfig.navigation.menuHandles.footer.length).toBeGreaterThan(0);
  });
});
