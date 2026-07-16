import { describe, expect, it } from "vitest";

import { ShopifyUserError, unwrapCartMutation } from "@/lib/shopify/errors";
import { transformShopifyCart, type ShopifyCart } from "@/lib/shopify/transforms/cart";

const money = (amount: string) => ({ amount, currencyCode: "AUD" });

function cartFixture(): ShopifyCart {
  return {
    appliedGiftCards: [
      { amountUsed: money("5.00"), balance: money("15.00"), id: "gift-1", lastCharacters: "1234" },
    ],
    checkoutUrl: "https://neutral-fixture.myshopify.com/checkouts/fixture",
    cost: { subtotalAmount: money("40.00"), totalAmount: money("35.00") },
    deliveryGroups: {
      nodes: [
        { selectedDeliveryOption: { estimatedCost: money("4.00"), title: "Standard" } },
        { selectedDeliveryOption: { estimatedCost: money("3.00"), title: "Second shipment" } },
      ],
    },
    discountAllocations: [
      {
        __typename: "CartAutomaticDiscountAllocation",
        discountedAmount: money("5.00"),
        title: "Fixture promotion",
      },
    ],
    discountCodes: [{ applicable: true, code: "NEUTRAL10" }],
    id: "gid://shopify/Cart/fixture",
    lines: {
      nodes: [
        {
          cost: { totalAmount: money("40.00") },
          discountAllocations: [],
          id: "line-1",
          lineComponents: [],
          merchandise: {
            id: "variant-1",
            image: null,
            price: money("20.00"),
            product: {
              featuredImage: null,
              handle: "neutral-product",
              id: "product-1",
              title: "Neutral Product",
            },
            selectedOptions: [{ name: "Size", value: "M" }],
            title: "M",
          },
          quantity: 2,
        },
      ],
    },
    note: "Leave safely",
    totalQuantity: 2,
  };
}

describe("Cart behavior contract", () => {
  it("preserves checkout, line editability, discounts, gift cards and aggregate shipping", () => {
    const cart = transformShopifyCart(cartFixture());

    expect(cart).toMatchObject({
      checkoutUrl: "https://neutral-fixture.myshopify.com/checkouts/fixture",
      discountCodes: [{ applicable: true, code: "NEUTRAL10" }],
      lines: [
        {
          canRemove: true,
          canUpdateQuantity: true,
          components: [],
          merchandise: { product: { handle: "neutral-product" } },
          quantity: 2,
        },
      ],
      note: "Leave safely",
      shippingCost: money("7"),
      totalQuantity: 2,
    });
    expect(cart.appliedGiftCards[0]?.lastCharacters).toBe("1234");
    expect(cart.discountAllocations[0]).toMatchObject({
      kind: "automatic",
      title: "Fixture promotion",
    });
  });

  it("keeps an empty cart valid and does not invent shipping", () => {
    const fixture = cartFixture();
    fixture.lines.nodes = [];
    fixture.totalQuantity = 0;
    fixture.deliveryGroups = { nodes: [{ selectedDeliveryOption: null }] };

    expect(transformShopifyCart(fixture)).toMatchObject({
      lines: [],
      shippingCost: null,
      totalQuantity: 0,
    });
  });

  it("surfaces Shopify cart user errors and rejects a missing cart", () => {
    expect(() =>
      unwrapCartMutation(
        { cart: null, userErrors: [{ field: ["lines"], message: "Variant is unavailable" }] },
        "cartLinesAdd",
      ),
    ).toThrow(ShopifyUserError);

    expect(() => unwrapCartMutation({ cart: null, userErrors: [] }, "cartLinesUpdate")).toThrow(
      "Shopify cartLinesUpdate: cart missing from response",
    );
  });
});
