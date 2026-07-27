import { z } from "zod";

/**
 * The merchant theme contract.
 *
 * Every semantic colour a component in this repository can reach for is declared here, for both the
 * light and the dark palette. If a token is not in `paletteSchema` it must not appear in
 * `app/globals.css`, and if it appears in `app/globals.css` it must be here — the styleguide route
 * (`/styleguide`) renders the whole set so drift is visible.
 */

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hexadecimal color such as #171717");

const paletteSchema = z
  .object({
    accent: hexColorSchema,
    accentForeground: hexColorSchema,
    background: hexColorSchema,
    border: hexColorSchema,
    card: hexColorSchema,
    cardForeground: hexColorSchema,
    destructive: hexColorSchema,
    destructiveForeground: hexColorSchema,
    foreground: hexColorSchema,
    info: hexColorSchema,
    infoForeground: hexColorSchema,
    input: hexColorSchema,
    muted: hexColorSchema,
    mutedForeground: hexColorSchema,
    /** Scrim behind dialogs, sheets and media overlays. Always applied at partial alpha. */
    overlay: hexColorSchema,
    /** Ink for copy that sits on top of a scrim, which never follows the page background. */
    overlayForeground: hexColorSchema,
    popover: hexColorSchema,
    popoverForeground: hexColorSchema,
    positive: hexColorSchema,
    positiveForeground: hexColorSchema,
    primary: hexColorSchema,
    primaryForeground: hexColorSchema,
    ring: hexColorSchema,
    secondary: hexColorSchema,
    secondaryForeground: hexColorSchema,
  })
  .strict();

export type Palette = z.infer<typeof paletteSchema>;
export type PaletteToken = keyof Palette;
export type ColorScheme = "light" | "dark";

/** Pairs that render text on a fill. WCAG 2.2 AA body text. */
export const TEXT_CONTRAST_PAIRS = [
  ["background", "foreground"],
  ["card", "cardForeground"],
  ["popover", "popoverForeground"],
  ["primary", "primaryForeground"],
  ["secondary", "secondaryForeground"],
  ["muted", "mutedForeground"],
  ["accent", "accentForeground"],
  ["destructive", "destructiveForeground"],
  ["positive", "positiveForeground"],
  ["info", "infoForeground"],
  ["overlay", "overlayForeground"],
] as const satisfies readonly (readonly [PaletteToken, PaletteToken])[];

/**
 * Surfaces sit *in* the background family. A merchant who picks a dark background but leaves cards,
 * hover states or form fields near-white gets a broken storefront, so every surface has to stay
 * within 3:1 of the background it is painted on.
 */
export const SURFACE_TOKENS = [
  "card",
  "popover",
  "secondary",
  "muted",
  "accent",
  "input",
] as const satisfies readonly PaletteToken[];

export const TEXT_CONTRAST_MINIMUM = 4.5;
export const SURFACE_CONTRAST_MAXIMUM = 3;
/** WCAG 2.2 SC 1.4.11 non-text contrast for the focus indicator. */
export const FOCUS_CONTRAST_MINIMUM = 3;
export const BORDER_CONTRAST_MINIMUM = 1.2;

function validatePalette(
  palette: Palette,
  scheme: ColorScheme,
  context: z.RefinementCtx,
  path: readonly (string | number)[],
): void {
  const fail = (token: PaletteToken, message: string) => {
    context.addIssue({ code: "custom", message: `${scheme}: ${message}`, path: [...path, token] });
  };

  for (const [surface, text] of TEXT_CONTRAST_PAIRS) {
    const ratio = contrastRatio(palette[surface], palette[text]);
    if (ratio < TEXT_CONTRAST_MINIMUM) {
      fail(
        text,
        `${surface} and ${text} need at least ${TEXT_CONTRAST_MINIMUM}:1 contrast; received ${ratio.toFixed(2)}:1`,
      );
    }
  }

  for (const surface of SURFACE_TOKENS) {
    const ratio = contrastRatio(palette.background, palette[surface]);
    if (ratio > SURFACE_CONTRAST_MAXIMUM) {
      fail(
        surface,
        `${surface} must stay within ${SURFACE_CONTRAST_MAXIMUM}:1 of background so surfaces read as surfaces, not as text; received ${ratio.toFixed(2)}:1`,
      );
    }
  }

  const ringRatio = contrastRatio(palette.background, palette.ring);
  if (ringRatio < FOCUS_CONTRAST_MINIMUM) {
    fail(
      "ring",
      `ring needs at least ${FOCUS_CONTRAST_MINIMUM}:1 against background for a visible focus indicator; received ${ringRatio.toFixed(2)}:1`,
    );
  }

  const borderRatio = contrastRatio(palette.background, palette.border);
  if (borderRatio < BORDER_CONTRAST_MINIMUM) {
    fail(
      "border",
      `border needs at least ${BORDER_CONTRAST_MINIMUM}:1 against background to be visible; received ${borderRatio.toFixed(2)}:1`,
    );
  } else if (borderRatio > SURFACE_CONTRAST_MAXIMUM) {
    fail(
      "border",
      `border must stay within ${SURFACE_CONTRAST_MAXIMUM}:1 of background so hairlines do not read as text; received ${borderRatio.toFixed(2)}:1`,
    );
  }
}

export const themeConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().trim().min(1).max(80),
    colors: z.object({ dark: paletteSchema, light: paletteSchema }).strict(),
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
        body: z.enum(["brand", "system"]),
        heading: z.enum(["brand", "system"]),
        scale: z.enum(["compact", "standard", "display"]),
      })
      .strict(),
  })
  .strict()
  .superRefine((theme, context) => {
    validatePalette(theme.colors.light, "light", context, ["colors", "light"]);
    validatePalette(theme.colors.dark, "dark", context, ["colors", "dark"]);
  });

export type ThemeConfig = z.infer<typeof themeConfigSchema>;

const CONTAINER_WIDTHS = { narrow: "64rem", standard: "96rem", wide: "120rem" } as const;
const MOTION_DURATIONS = { none: "0ms", fast: "120ms", standard: "200ms" } as const;
const TYPE_SCALES = { compact: "0.9375", standard: "1", display: "1.0625" } as const;

/**
 * The documented spacing / rhythm scale. Sections compose from five rhythm tokens so a density
 * change moves the whole storefront instead of one hard-coded `py-10 sm:py-14`.
 *
 * - `gutter`  horizontal page inset (`px-gutter`)
 * - `section` vertical padding inside a section band (`py-section`)
 * - `gap`     distance between two section bands (`gap-section-gap`)
 * - `stack`   distance between blocks inside a section (`gap-stack`)
 * - `inline`  distance between sibling controls (`gap-inline`)
 */
export const RHYTHM = {
  compact: { gap: "1.5rem", gutter: "1rem", inline: "0.5rem", section: "2rem", stack: "1rem" },
  comfortable: {
    gap: "2.5rem",
    gutter: "1.25rem",
    inline: "0.75rem",
    section: "3.5rem",
    stack: "1.5rem",
  },
  spacious: { gap: "4rem", gutter: "2rem", inline: "1rem", section: "5rem", stack: "2rem" },
} as const;

export const PALETTE_VARIABLE_NAMES = {
  accent: "--accent",
  accentForeground: "--accent-foreground",
  background: "--background",
  border: "--border",
  card: "--card",
  cardForeground: "--card-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  foreground: "--foreground",
  info: "--info",
  infoForeground: "--info-foreground",
  input: "--input",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  overlay: "--overlay",
  overlayForeground: "--overlay-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  positive: "--positive",
  positiveForeground: "--positive-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  ring: "--ring",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
} as const satisfies Record<PaletteToken, `--${string}`>;

export function paletteToCssVariables(palette: Palette): Record<`--${string}`, string> {
  const variables: Record<`--${string}`, string> = {};
  for (const token of Object.keys(PALETTE_VARIABLE_NAMES) as PaletteToken[]) {
    variables[PALETTE_VARIABLE_NAMES[token]] = palette[token];
  }
  return variables;
}

/** Scheme-independent tokens: geometry, rhythm, motion and typography. */
export function themeToShellVariables(theme: ThemeConfig): Record<`--${string}`, string> {
  const rhythm = RHYTHM[theme.layout.density];
  return {
    "--merchant-border-width": theme.shape.borderWidth,
    "--merchant-container": CONTAINER_WIDTHS[theme.layout.container],
    "--merchant-font-body":
      theme.typography.body === "brand"
        ? "var(--font-brand-body, system-ui, sans-serif)"
        : "system-ui, sans-serif",
    "--merchant-font-heading":
      theme.typography.heading === "brand"
        ? "var(--font-brand-heading, system-ui, sans-serif)"
        : "system-ui, sans-serif",
    "--merchant-motion-duration": MOTION_DURATIONS[theme.motion.duration],
    "--merchant-section-gap": rhythm.gap,
    "--merchant-space-gutter": rhythm.gutter,
    "--merchant-space-inline": rhythm.inline,
    "--merchant-space-section": rhythm.section,
    "--merchant-space-stack": rhythm.stack,
    "--merchant-type-scale": TYPE_SCALES[theme.typography.scale],
    "--radius": theme.shape.radius,
  };
}

/**
 * Every CSS variable for one colour scheme. `themeToCssVariables(theme)` returns the light shell,
 * which is what a static (non-toggling) render needs.
 */
export function themeToCssVariables(
  theme: ThemeConfig,
  scheme: ColorScheme = "light",
): Record<`--${string}`, string> {
  return {
    ...paletteToCssVariables(theme.colors[scheme]),
    ...themeToShellVariables(theme),
  };
}

function declarations(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([name, value]) => `${name}:${value};`)
    .join("");
}

/**
 * A stylesheet the document can inline. `html:root` outranks the `:root` defaults in
 * `app/globals.css` regardless of where the browser encounters it, so the merchant theme always wins
 * without needing `!important` or a guaranteed load order.
 *
 * Dark mode resolves in three layers:
 * 1. the light palette is the base;
 * 2. `prefers-color-scheme: dark` applies the dark palette unless the visitor pinned light;
 * 3. an explicit `data-theme` attribute (set before first paint by `themeInitScript`) wins outright.
 *
 * Values come from the validated schema — hex colours and closed enums only — so nothing here can
 * carry merchant-authored CSS.
 */
export function themeStyleSheet(theme: ThemeConfig): string {
  const light = declarations({
    ...paletteToCssVariables(theme.colors.light),
    ...themeToShellVariables(theme),
    "color-scheme": "light",
  });
  const dark = declarations({
    ...paletteToCssVariables(theme.colors.dark),
    "color-scheme": "dark",
  });

  return [
    `html:root{${light}}`,
    `@media (prefers-color-scheme:dark){html:root:not([data-theme="light"]){${dark}}}`,
    `html:root[data-theme="dark"]{${dark}}`,
  ].join("");
}

export const THEME_STORAGE_KEY = "merchant-theme";

/**
 * Runs before first paint so the resolved scheme is on `<html>` when the first pixel lands: no
 * flash of the wrong theme, and no hydration mismatch because the attribute is not React-owned.
 * With JavaScript disabled the `prefers-color-scheme` block above still applies.
 */
export const themeInitScript =
  `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});` +
  `var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);` +
  `document.documentElement.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`;

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
