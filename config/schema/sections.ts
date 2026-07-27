import { z } from "zod";

export const recipeSectionTypes = [
  "announcement",
  "banner",
  "hero",
  "rich-text",
  "media-text",
  "logo-list",
  "collection-grid",
  "product-carousel",
  "editorial-grid",
  "testimonials",
  "faq",
  "newsletter",
  "trust-strip",
] as const;

const commonSectionShape = {
  enabled: z.boolean().default(true),
  id: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
  tone: z.enum(["default", "muted", "contrast"]).default("default"),
};

const linkSchema = z
  .object({ href: z.string().startsWith("/"), label: z.string().trim().min(1).max(80) })
  .strict();

/**
 * Media must be a local, repository-relative path. The repo scanner rejects committed binaries, so
 * a starter checkout ships with no media at all and every media slot degrades to a labelled
 * placeholder rather than a broken image.
 */
const localMediaSchema = z
  .object({
    alt: z.string().trim().max(240),
    height: z.number().int().positive().max(10_000),
    src: z.string().startsWith("/"),
    width: z.number().int().positive().max(10_000),
  })
  .strict();

const localVideoSchema = z
  .object({
    poster: z
      .object({ alt: z.string().trim().max(240), src: z.string().startsWith("/") })
      .strict()
      .optional(),
    src: z.string().startsWith("/"),
  })
  .strict();

const contentCardSchema = z
  .object({
    body: z.string().trim().max(500).optional(),
    href: z.string().startsWith("/").optional(),
    media: localMediaSchema.optional(),
    title: z.string().trim().min(1).max(120),
  })
  .strict();

export const sectionDefinitionSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...commonSectionShape,
      type: z.literal("announcement"),
      message: z.string().trim().min(1).max(180),
      link: linkSchema.optional(),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("banner"),
      eyebrow: z.string().trim().max(80).optional(),
      headline: z.string().trim().min(1).max(140),
      subheadline: z.string().trim().max(300).optional(),
      action: linkSchema.optional(),
      /** Still image behind the copy. Ignored when `video` is set. */
      image: localMediaSchema.optional(),
      video: localVideoSchema.optional(),
      align: z.enum(["start", "center"]).default("center"),
      height: z.enum(["compact", "standard", "tall"]).default("standard"),
      /** Renders the copy as an `h1`. Exactly one banner or hero per page should own the h1. */
      headingLevel: z.enum(["h1", "h2"]).default("h2"),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("hero"),
      eyebrow: z.string().trim().max(80).optional(),
      heading: z.string().trim().min(1).max(140),
      body: z.string().trim().max(400).optional(),
      primaryAction: linkSchema.optional(),
      secondaryAction: linkSchema.optional(),
      variant: z.enum(["centered", "split"]).default("centered"),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("rich-text"),
      heading: z.string().trim().max(140).optional(),
      body: z.string().trim().min(1).max(4000),
      align: z.enum(["left", "center"]).default("left"),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("media-text"),
      heading: z.string().trim().min(1).max(140),
      body: z.string().trim().min(1).max(1200),
      action: linkSchema.optional(),
      media: localMediaSchema.optional(),
      mediaPosition: z.enum(["start", "end"]).default("start"),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("logo-list"),
      heading: z.string().trim().max(140).optional(),
      logos: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("collection-grid"),
      heading: z.string().trim().min(1).max(140),
      collections: z.array(contentCardSchema).min(1).max(12),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
      /** Card media aspect ratio. `none` keeps the older text-only card. */
      aspect: z.enum(["none", "square", "portrait", "landscape"]).default("portrait"),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("product-carousel"),
      heading: z.string().trim().min(1).max(140),
      collectionHandle: z.string().trim().min(1).max(255).default("all"),
      limit: z.number().int().min(2).max(12).default(8),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("editorial-grid"),
      heading: z.string().trim().min(1).max(140),
      items: z.array(contentCardSchema).min(1).max(12),
      aspect: z.enum(["none", "square", "portrait", "landscape"]).default("landscape"),
      /** Chrome copy lives in the recipe so a merchant can localise it without a code change. */
      readMoreLabel: z.string().trim().min(1).max(60).default("Read more"),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("testimonials"),
      heading: z.string().trim().max(140).optional(),
      items: z
        .array(
          z
            .object({
              attribution: z.string().trim().min(1).max(120),
              quote: z.string().trim().min(1).max(600),
            })
            .strict(),
        )
        .min(1)
        .max(8),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("faq"),
      heading: z.string().trim().min(1).max(140),
      items: z
        .array(
          z
            .object({
              answer: z.string().trim().min(1).max(1600),
              question: z.string().trim().min(1).max(240),
            })
            .strict(),
        )
        .min(1)
        .max(20),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("newsletter"),
      heading: z.string().trim().min(1).max(140),
      body: z.string().trim().max(500).optional(),
      action: z.string().url().nullable(),
      /**
       * Form chrome. These are the only user-visible strings the section renders that do not come
       * from merchant content, so they are configurable here instead of hard-coded in English.
       */
      emailLabel: z.string().trim().min(1).max(80).default("Email address"),
      emailPlaceholder: z.string().trim().min(1).max(80).default("you@example.com"),
      submitLabel: z.string().trim().min(1).max(60).default("Subscribe"),
      unavailableNote: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .default("Connect an approved newsletter provider to enable signup."),
    })
    .strict(),
  z
    .object({
      ...commonSectionShape,
      type: z.literal("trust-strip"),
      items: z.array(z.string().trim().min(1).max(100)).min(1).max(8),
    })
    .strict(),
]);

export const sectionRecipeSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().trim().min(1).max(80),
    sections: z.array(sectionDefinitionSchema).max(40),
  })
  .strict()
  .superRefine((recipe, context) => {
    const seen = new Set<string>();
    recipe.sections.forEach((section, index) => {
      if (seen.has(section.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate section id: ${section.id}`,
          path: ["sections", index, "id"],
        });
      }
      seen.add(section.id);
    });
  });

export type LocalMedia = z.infer<typeof localMediaSchema>;
export type SectionDefinition = z.infer<typeof sectionDefinitionSchema>;
export type SectionRecipe = z.infer<typeof sectionRecipeSchema>;
export type SectionType = SectionDefinition["type"];
export type CardAspect = "none" | "square" | "portrait" | "landscape";
