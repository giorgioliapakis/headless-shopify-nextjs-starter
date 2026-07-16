import { z } from "zod";

import { featureConfigSchema } from "./features";
import { sectionRecipeSchema } from "./sections";
import { themeConfigSchema } from "./theme";

export const landingPageConfigSchema = z
  .object({
    description: z.string().trim().min(1).max(320),
    index: z.boolean().default(true),
    recipe: sectionRecipeSchema,
    title: z.string().trim().min(1).max(140),
  })
  .strict();

export const landingPageHandleSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

export const customizableShopConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    features: featureConfigSchema,
    recipes: z
      .object({
        home: sectionRecipeSchema,
        landing: z.record(landingPageHandleSchema, landingPageConfigSchema),
      })
      .strict(),
    theme: themeConfigSchema,
  })
  .strict();

export type CustomizableShopConfig = z.infer<typeof customizableShopConfigSchema>;
export type LandingPageConfig = z.infer<typeof landingPageConfigSchema>;
