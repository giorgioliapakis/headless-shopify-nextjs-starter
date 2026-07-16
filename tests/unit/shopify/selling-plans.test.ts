import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { transformVariant, type ShopifyVariant } from "@/lib/shopify/transforms/product";

const money = (amount: string) => ({ amount, currencyCode: "AUD" });

function variantWithPlan(): ShopifyVariant {
  return {
    availableForSale: true,
    compareAtPrice: null,
    id: "gid://shopify/ProductVariant/1",
    image: null,
    price: money("20.00"),
    selectedOptions: [{ name: "Title", value: "Default Title" }],
    sellingPlanAllocations: {
      nodes: [
        {
          priceAdjustments: [
            {
              compareAtPrice: money("20.00"),
              perDeliveryPrice: money("18.00"),
              price: money("18.00"),
            },
          ],
          sellingPlan: {
            description: "Delivered monthly",
            id: "gid://shopify/SellingPlan/10",
            name: "Monthly",
            options: [{ name: "Delivery", value: "Monthly" }],
            recurringDeliveries: true,
          },
        },
      ],
    },
    title: "Default Title",
  };
}

describe("Shopify native selling plans", () => {
  it("normalizes selected-variant allocation pricing and plan details", () => {
    expect(transformVariant(variantWithPlan()).sellingPlanAllocations[0]).toEqual({
      compareAtPrice: money("20.00"),
      description: "Delivered monthly",
      id: "gid://shopify/SellingPlan/10",
      name: "Monthly",
      options: [{ name: "Delivery", value: "Monthly" }],
      perDeliveryPrice: money("18.00"),
      price: money("18.00"),
      recurringDeliveries: true,
    });
  });

  it("wires sellingPlanId through the progressive Hydrogen form", async () => {
    const source = await readFile("components/product-detail/buy-buttons.tsx", "utf8");
    expect(source).toContain('register("sellingPlanId"');
    expect(source).toContain("requiresSellingPlan");
  });
});
