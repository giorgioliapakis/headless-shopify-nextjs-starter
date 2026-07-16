import { z } from "zod";

import { featureConfigSchema } from "./features";
import { sectionRecipeSchema } from "./sections";
import { themeConfigSchema } from "./theme";

export const customizableShopConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    features: featureConfigSchema,
    recipes: z.object({ home: sectionRecipeSchema }).strict(),
    theme: themeConfigSchema,
  })
  .strict();

export type CustomizableShopConfig = z.infer<typeof customizableShopConfigSchema>;
