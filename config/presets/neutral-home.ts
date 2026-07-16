import { sectionRecipeSchema } from "@/config/schema/sections";

export const neutralHomeRecipe = sectionRecipeSchema.parse({
  schemaVersion: 1,
  name: "Neutral home",
  sections: [
    {
      id: "welcome",
      type: "hero",
      heading: "A storefront ready to make your own.",
      body: "Connect Shopify, replace this neutral recipe with your approved content, and keep the commerce foundation intact.",
      primaryAction: { href: "/collections/all", label: "Shop all" },
    },
    {
      id: "featured-products",
      type: "product-carousel",
      heading: "Featured products",
      collectionHandle: "all",
      limit: 8,
    },
  ],
});
