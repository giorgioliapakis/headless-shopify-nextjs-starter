import { z } from "zod";

export const featureConfigSchema = z
  .object({
    accounts: z.object({ hosted: z.boolean(), url: z.string().url().nullable() }).strict(),
    analytics: z.object({ shopify: z.boolean() }).strict(),
    markets: z.object({ enabled: z.boolean() }).strict(),
    pdp: z
      .object({
        bundles: z.boolean(),
        complementaryProducts: z.boolean(),
        relatedProducts: z.boolean(),
      })
      .strict(),
    webhooks: z.object({ enabled: z.boolean() }).strict(),
  })
  .strict();

export type FeatureConfig = z.infer<typeof featureConfigSchema>;

export function validateFeatureConfig(value: unknown): FeatureConfig {
  return featureConfigSchema.parse(value);
}
