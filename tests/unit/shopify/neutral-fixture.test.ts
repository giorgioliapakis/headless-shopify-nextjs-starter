import { describe, expect, it } from "vitest";

import {
  neutralStorefrontFixtureFetch,
  resolveNeutralStorefrontFixtureFetch,
} from "@/lib/shopify/fixtures/fetch";
import type { StorefrontEnvironment } from "@/lib/shopify/hydrogen/env";

const environment: StorefrontEnvironment = {
  apiVersion: "2026-07",
  publicStorefrontToken: "fixture-public-token",
  storefrontId: "0",
  storeDomain: "neutral-fixture.myshopify.com",
  usedLegacyAliases: [],
};

describe("neutral Storefront fixture", () => {
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
});
