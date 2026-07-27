import { recipeSectionTypes, sectionRecipeSchema } from "@/config/schema/sections";

/**
 * One instance of every registered section type, with sample content, for `/styleguide`.
 *
 * `tests/unit/sections/registry.test.ts` asserts this recipe covers `recipeSectionTypes` exactly,
 * so adding a section type without giving it a visual example fails the suite.
 */
export const styleguideSectionRecipe = sectionRecipeSchema.parse({
  schemaVersion: 1,
  name: "Styleguide sections",
  sections: [
    {
      id: "sg-announcement",
      type: "announcement",
      message: "Announcement bar: one short line, one optional link.",
      link: { href: "/collections/all", label: "Shop all" },
    },
    {
      id: "sg-banner",
      type: "banner",
      headingLevel: "h2",
      eyebrow: "Banner",
      headline: "Full-bleed media banner",
      subheadline:
        "Renders video, a still image, or this placeholder. Copy sits on the overlay token pair, not on a literal white.",
      action: { href: "/collections/all", label: "Primary action" },
      align: "center",
      height: "compact",
    },
    {
      id: "sg-hero",
      type: "hero",
      variant: "split",
      eyebrow: "Hero",
      heading: "Typographic hero, no media",
      body: "The split variant puts the actions beside the copy on large screens and stacks them below on small ones.",
      primaryAction: { href: "/collections/all", label: "Primary" },
      secondaryAction: { href: "/pages/about", label: "Secondary" },
    },
    {
      id: "sg-trust-strip",
      type: "trust-strip",
      tone: "muted",
      items: ["Free returns", "Carbon-neutral delivery", "Secure checkout"],
    },
    {
      id: "sg-product-carousel",
      type: "product-carousel",
      heading: "Product carousel",
      collectionHandle: "all",
      limit: 4,
    },
    {
      id: "sg-collection-grid",
      type: "collection-grid",
      heading: "Collection grid",
      columns: 3,
      aspect: "portrait",
      collections: [
        { title: "Everyday", body: "Card with media slot.", href: "/collections/all" },
        { title: "Workwear", body: "Card with media slot.", href: "/collections/all" },
        { title: "Outdoors", body: "Card with media slot.", href: "/collections/all" },
      ],
    },
    {
      id: "sg-media-text",
      type: "media-text",
      tone: "muted",
      heading: "Media and text",
      body: "One image, one paragraph, one action. The media side flips with mediaPosition.",
      action: { href: "/pages/about", label: "Read more" },
      mediaPosition: "start",
    },
    {
      id: "sg-editorial-grid",
      type: "editorial-grid",
      heading: "Editorial grid",
      aspect: "landscape",
      readMoreLabel: "Read more",
      items: [
        { title: "First article", body: "Card with media slot.", href: "/blogs/journal" },
        { title: "Second article", body: "Card with media slot.", href: "/blogs/journal" },
        { title: "Third article", body: "Card with media slot.", href: "/blogs/journal" },
      ],
    },
    {
      id: "sg-rich-text",
      type: "rich-text",
      align: "center",
      heading: "Rich text",
      body: "A centred prose band for the copy a hero cannot carry.\n\nBlank lines are preserved so short paragraphs work without rich text.",
    },
    {
      id: "sg-logo-list",
      type: "logo-list",
      tone: "muted",
      heading: "Logo list",
      logos: ["Northgate", "Marlow & Co", "Fieldhouse", "Ninth Street"],
    },
    {
      id: "sg-testimonials",
      type: "testimonials",
      heading: "Testimonials",
      items: [
        { quote: "Short quote, one attribution.", attribution: "Verified customer" },
        { quote: "Second quote in the row.", attribution: "Verified customer" },
        { quote: "Third quote in the row.", attribution: "Verified customer" },
      ],
    },
    {
      id: "sg-faq",
      type: "faq",
      heading: "FAQ",
      items: [
        {
          question: "Does this work without JavaScript?",
          answer: "Yes — it is a native details/summary disclosure with no client bundle.",
        },
        {
          question: "Is the answer text length bounded?",
          answer: "The schema caps answers at 1600 characters.",
        },
      ],
    },
    {
      id: "sg-newsletter",
      type: "newsletter",
      tone: "muted",
      heading: "Newsletter",
      body: "With no action configured the section renders the unavailable note instead of a dead form.",
      action: null,
    },
  ],
});

/** Every section type the styleguide renders, in registry order. */
export const styleguideSectionTypes = recipeSectionTypes;
