import { gql } from "@shopify/hydrogen";
import { cacheLife, cacheTag } from "next/cache";

import { assertStorefrontOk, withFallback } from "../errors";
import { storefront } from "../storefront";
import { type ShopifyMenuResponse, transformShopifyMenu } from "../transforms/menu";
import type { Menu, MenuItem } from "../types/menu";

const MENU_ITEM_FIELDS_FRAGMENT = gql(`
  fragment MenuItemFields on MenuItem {
    id
    title
    url
    type
    tags
    resource {
      ... on Collection { handle }
      ... on Product { handle }
      ... on Page { handle }
    }
  }
`);

const GET_MENU_QUERY = gql(
  `
  query getMenu($handle: String!) {
    menu(handle: $handle) {
      id
      handle
      title
      items {
        ...MenuItemFields
        items {
          ...MenuItemFields
          items {
            ...MenuItemFields
          }
        }
      }
    }
  }
`,
  [MENU_ITEM_FIELDS_FRAGMENT],
);

export async function getMenu({ handle }: { handle: string }): Promise<Menu | null> {
  "use cache: remote";
  cacheLife("max");
  cacheTag("menus");

  const response = await storefront.request<ShopifyMenuResponse>(GET_MENU_QUERY, {
    variables: { handle },
  });
  assertStorefrontOk(response, "getMenu");

  return transformShopifyMenu(response.data.menu);
}

/** A menu that exists but has no items is as useless as a missing one — both fall back. */
export function resolveMenuItems(menu: Menu | null, fallback: MenuItem[]): MenuItem[] {
  return menu && menu.items.length > 0 ? menu.items : fallback;
}

/**
 * Resolves the merchant's own Shopify menu, falling back to the statically configured
 * items when the store has no menu under `handle` (or the Storefront API is unavailable).
 * This is what makes "point it at your store" surface the merchant's navigation.
 */
export async function getMenuItems({
  fallback,
  handle,
}: {
  fallback: MenuItem[];
  handle: string;
}): Promise<MenuItem[]> {
  return resolveMenuItems(await withFallback(getMenu({ handle }), null), fallback);
}
