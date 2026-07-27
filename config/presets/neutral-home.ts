import { sectionRecipeSchema } from "@/config/schema/sections";

/**
 * Default home recipe.
 *
 * Deliberately exercises most of the section registry so every section type has production
 * coverage the moment a merchant clones the starter — an unused section is an untested section.
 * All copy is neutral placeholder text: no brand names, no claims, no committed imagery.
 */
export const neutralHomeRecipe = sectionRecipeSchema.parse({
  schemaVersion: 1,
  name: "Neutral home",
  sections: [
    {
      id: "shipping-note",
      type: "announcement",
      message: "Replace this announcement with your own shipping or promotion message.",
      link: { href: "/pages/shipping", label: "Shipping details" },
    },
    {
      id: "welcome",
      type: "banner",
      headingLevel: "h1",
      eyebrow: "New season",
      headline: "A storefront ready to make your own.",
      subheadline:
        "Add an image or video to this banner, or leave it empty for a plain colour band. Every section on this page is defined in shop.config.ts.",
      action: { href: "/collections/all", label: "Shop all" },
      align: "center",
      height: "standard",
    },
    {
      id: "trust",
      type: "trust-strip",
      tone: "muted",
      items: [
        "Free returns within 30 days",
        "Carbon-neutral delivery",
        "Secure Shopify checkout",
        "Support in three languages",
      ],
    },
    {
      id: "featured-products",
      type: "product-carousel",
      heading: "Featured products",
      collectionHandle: "all",
      limit: 8,
    },
    {
      id: "shop-by-category",
      type: "collection-grid",
      heading: "Shop by category",
      columns: 3,
      aspect: "portrait",
      collections: [
        {
          title: "Everyday",
          body: "The pieces you reach for without thinking.",
          href: "/collections/all",
        },
        {
          title: "Workwear",
          body: "Built for long days and short notice.",
          href: "/collections/all",
        },
        {
          title: "Outdoors",
          body: "Weather-ready layers for the shoulder seasons.",
          href: "/collections/all",
        },
      ],
    },
    {
      id: "our-approach",
      type: "media-text",
      tone: "muted",
      heading: "Made to be kept",
      body: "Describe how your products are made, who makes them and why that matters. This section pairs a single image with a short piece of copy and one call to action, which is usually enough.",
      action: { href: "/pages/about", label: "Read our story" },
      mediaPosition: "start",
    },
    {
      id: "journal",
      type: "editorial-grid",
      heading: "From the journal",
      aspect: "landscape",
      readMoreLabel: "Read more",
      items: [
        {
          title: "How we choose materials",
          body: "A short primer on the fibres we use and the ones we avoid.",
          href: "/blogs/journal",
        },
        {
          title: "Caring for knitwear",
          body: "Washing, drying and storing so a garment lasts a decade.",
          href: "/blogs/journal",
        },
        {
          title: "Inside the workshop",
          body: "A walk through the studio where each order is packed.",
          href: "/blogs/journal",
        },
      ],
    },
    {
      id: "as-seen-in",
      type: "logo-list",
      tone: "muted",
      heading: "Stocked by",
      logos: ["Northgate", "Marlow & Co", "Fieldhouse", "Ninth Street", "Atlas Supply"],
    },
    {
      id: "what-people-say",
      type: "testimonials",
      heading: "What people say",
      items: [
        {
          quote: "The fit was right first time and the returns process was genuinely painless.",
          attribution: "Verified customer",
        },
        {
          quote: "Two years in and it still looks like it did the week it arrived.",
          attribution: "Verified customer",
        },
        {
          quote: "Ordered on a Tuesday, wearing it on the Thursday. No notes.",
          attribution: "Verified customer",
        },
      ],
    },
    {
      id: "questions",
      type: "faq",
      heading: "Questions, answered",
      items: [
        {
          question: "How long does delivery take?",
          answer: "Replace this answer with your own fulfilment times for each region you ship to.",
        },
        {
          question: "Can I return or exchange an order?",
          answer:
            "Replace this answer with your returns window, the condition requirements and who pays for return postage.",
        },
        {
          question: "Do you ship internationally?",
          answer:
            "Replace this answer with the markets you sell into and how duties and taxes are handled at checkout.",
        },
      ],
    },
    {
      id: "keep-in-touch",
      type: "newsletter",
      tone: "muted",
      heading: "Keep in touch",
      body: "One email a month, no more. Unsubscribe whenever you like.",
      action: null,
    },
  ],
});
