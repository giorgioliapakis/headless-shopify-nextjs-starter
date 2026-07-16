import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hexadecimal color such as #171717");

const themeColorsSchema = z
  .object({
    background: hexColorSchema,
    border: hexColorSchema,
    foreground: hexColorSchema,
    muted: hexColorSchema,
    mutedForeground: hexColorSchema,
    primary: hexColorSchema,
    primaryForeground: hexColorSchema,
  })
  .strict();

export const themeConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().trim().min(1).max(80),
    colors: themeColorsSchema,
    layout: z
      .object({
        container: z.enum(["narrow", "standard", "wide"]),
        density: z.enum(["compact", "comfortable", "spacious"]),
      })
      .strict(),
    motion: z
      .object({
        duration: z.enum(["none", "fast", "standard"]),
      })
      .strict(),
    shape: z
      .object({
        borderWidth: z.enum(["0px", "1px", "2px"]),
        radius: z.enum(["0px", "0.375rem", "0.625rem", "1rem"]),
      })
      .strict(),
    typography: z
      .object({
        body: z.enum(["geist", "system"]),
        heading: z.enum(["geist", "system"]),
        scale: z.enum(["compact", "standard", "display"]),
      })
      .strict(),
  })
  .strict()
  .superRefine((theme, context) => {
    for (const pair of [
      ["background", "foreground"],
      ["primary", "primaryForeground"],
      ["muted", "mutedForeground"],
    ] as const) {
      const ratio = contrastRatio(theme.colors[pair[0]], theme.colors[pair[1]]);
      if (ratio < 4.5) {
        context.addIssue({
          code: "custom",
          message: `${pair[0]} and ${pair[1]} need at least 4.5:1 contrast; received ${ratio.toFixed(2)}:1`,
          path: ["colors", pair[1]],
        });
      }
    }
  });

export type ThemeConfig = z.infer<typeof themeConfigSchema>;

const CONTAINER_WIDTHS = { narrow: "64rem", standard: "96rem", wide: "120rem" } as const;
const SECTION_GAPS = { compact: "1.5rem", comfortable: "2.5rem", spacious: "4rem" } as const;
const MOTION_DURATIONS = { none: "0ms", fast: "120ms", standard: "200ms" } as const;
const TYPE_SCALES = { compact: "0.9375", standard: "1", display: "1.0625" } as const;

export function themeToCssVariables(theme: ThemeConfig): Record<`--${string}`, string> {
  return {
    "--background": theme.colors.background,
    "--border": theme.colors.border,
    "--foreground": theme.colors.foreground,
    "--merchant-container": CONTAINER_WIDTHS[theme.layout.container],
    "--merchant-font-body":
      theme.typography.body === "geist" ? "var(--font-geist-sans)" : "system-ui, sans-serif",
    "--merchant-font-heading":
      theme.typography.heading === "geist" ? "var(--font-geist-sans)" : "system-ui, sans-serif",
    "--merchant-motion-duration": MOTION_DURATIONS[theme.motion.duration],
    "--merchant-section-gap": SECTION_GAPS[theme.layout.density],
    "--merchant-type-scale": TYPE_SCALES[theme.typography.scale],
    "--muted": theme.colors.muted,
    "--muted-foreground": theme.colors.mutedForeground,
    "--primary": theme.colors.primary,
    "--primary-foreground": theme.colors.primaryForeground,
    "--radius": theme.shape.radius,
    "--merchant-border-width": theme.shape.borderWidth,
  };
}

export function contrastRatio(first: string, second: string): number {
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function relativeLuminance(color: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
  const [red = 0, green = 0, blue = 0] = channels.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
