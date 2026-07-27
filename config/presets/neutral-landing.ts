import { landingPageConfigSchema } from "@/config/schema/shop";

/**
 * Worked example of `shopConfig.recipes.landing`, reachable at `/landing/new-arrivals`.
 *
 * It uses the section types the home recipe does not lean on — the `split` hero and the centred
 * `rich-text` band — so between the two presets every registered section renders in production.
 * `index: false` keeps a placeholder campaign page out of search results until a merchant edits it.
 */
export const neutralLandingRecipes = {
  "new-arrivals": landingPageConfigSchema.parse({
    title: "New arrivals",
    description:
      "An example campaign landing page. Replace the copy and imagery, then set index to true.",
    index: false,
    recipe: {
      schemaVersion: 1,
      name: "New arrivals",
      sections: [
        {
          id: "campaign-hero",
          type: "hero",
          variant: "split",
          eyebrow: "Just landed",
          heading: "New arrivals, added weekly.",
          body: "Landing pages share the same section registry as the home page, so anything you can build here you can build anywhere.",
          primaryAction: { href: "/collections/all", label: "Shop the drop" },
          secondaryAction: { href: "/pages/about", label: "How we make it" },
        },
        {
          id: "campaign-products",
          type: "product-carousel",
          heading: "In the drop",
          collectionHandle: "all",
          limit: 4,
        },
        {
          id: "campaign-note",
          type: "rich-text",
          tone: "muted",
          align: "center",
          heading: "Why this drop is small",
          body: "Use this band for the longer-form explanation a hero cannot carry. Line breaks are preserved, so you can write two or three short paragraphs without reaching for rich text.\n\nEverything here is plain text validated by the section schema, which means an agent can rewrite it safely.",
        },
        {
          id: "campaign-grid",
          type: "collection-grid",
          heading: "Pairs well with",
          columns: 2,
          aspect: "landscape",
          collections: [
            { title: "Accessories", body: "Small things, long lives.", href: "/collections/all" },
            { title: "Last chance", body: "Final pieces, final sizes.", href: "/collections/all" },
          ],
        },
        {
          id: "campaign-signup",
          type: "newsletter",
          heading: "Hear about the next one first",
          body: "We announce each drop by email a day before it goes live.",
          action: null,
        },
      ],
    },
  }),
};
