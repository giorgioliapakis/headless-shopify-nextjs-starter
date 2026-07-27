import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { neutralThemePreset } from "@/config/presets/neutral-theme";
import {
  contrastRatio,
  PALETTE_VARIABLE_NAMES,
  SURFACE_CONTRAST_MAXIMUM,
  SURFACE_TOKENS,
  TEXT_CONTRAST_MINIMUM,
  TEXT_CONTRAST_PAIRS,
  themeConfigSchema,
  themeInitScript,
  themeStyleSheet,
  themeToCssVariables,
  type ColorScheme,
  type PaletteToken,
} from "@/config/schema/theme";

const SCHEMES: ColorScheme[] = ["light", "dark"];

describe("merchant theme contract", () => {
  it("validates the neutral preset and emits deterministic semantic variables", () => {
    expect(themeConfigSchema.parse(neutralThemePreset)).toEqual(neutralThemePreset);
    expect(themeToCssVariables(neutralThemePreset)).toMatchObject({
      "--background": "#ffffff",
      "--foreground": "#171717",
      "--merchant-container": "96rem",
      "--merchant-font-body": "system-ui, sans-serif",
      "--merchant-font-heading": "system-ui, sans-serif",
      "--merchant-section-gap": "2.5rem",
      "--radius": "0.625rem",
    });
  });

  it("covers every semantic colour the components can reach for", () => {
    // The contract has to be at least as wide as the stylesheet, or a token becomes unthemeable.
    const previouslyUnreachable: PaletteToken[] = [
      "accent",
      "card",
      "input",
      "ring",
      "destructive",
      "popover",
      "secondary",
      "positive",
      "info",
      "overlay",
    ];
    for (const token of previouslyUnreachable) {
      expect(PALETTE_VARIABLE_NAMES[token]).toBeTruthy();
      for (const scheme of SCHEMES) {
        expect(neutralThemePreset.colors[scheme][token]).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("emits both palettes so a scheme switch never leaves a half-applied theme", () => {
    for (const scheme of SCHEMES) {
      const variables = themeToCssVariables(neutralThemePreset, scheme);
      for (const [token, name] of Object.entries(PALETTE_VARIABLE_NAMES)) {
        expect(variables[name as `--${string}`]).toBe(
          neutralThemePreset.colors[scheme][token as PaletteToken],
        );
      }
    }
  });

  it("exposes semantic local-font hooks without accepting a font URL", () => {
    const brandedTheme = themeConfigSchema.parse({
      ...neutralThemePreset,
      typography: { body: "brand", heading: "brand", scale: "standard" },
    });

    expect(themeToCssVariables(brandedTheme)).toMatchObject({
      "--merchant-font-body": "var(--font-brand-body, system-ui, sans-serif)",
      "--merchant-font-heading": "var(--font-brand-heading, system-ui, sans-serif)",
    });
  });

  it("rejects inaccessible semantic contrast pairs with an actionable path", () => {
    const result = themeConfigSchema.safeParse({
      ...neutralThemePreset,
      colors: {
        ...neutralThemePreset.colors,
        light: {
          ...neutralThemePreset.colors.light,
          primary: "#ffffff",
          primaryForeground: "#eeeeee",
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["colors", "light", "primaryForeground"],
      });
      expect(result.error.issues[0]?.message).toContain("4.5:1");
    }
  });

  it("catches a dark background left with light surfaces", () => {
    // The exact regression the previous seven-token contract could not see: a merchant flips the
    // background to near-black and keeps white cards, near-white hover states and form fields.
    const result = themeConfigSchema.safeParse({
      ...neutralThemePreset,
      colors: {
        ...neutralThemePreset.colors,
        light: {
          ...neutralThemePreset.colors.light,
          background: "#101010",
          foreground: "#f5f5f5",
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const flagged = new Set(result.error.issues.map((issue) => issue.path.at(-1)));
      expect(flagged).toContain("card");
      expect(flagged).toContain("accent");
      expect(flagged).toContain("input");
    }
  });

  it("requires a focus ring that meets non-text contrast", () => {
    const result = themeConfigSchema.safeParse({
      ...neutralThemePreset,
      colors: {
        ...neutralThemePreset.colors,
        light: { ...neutralThemePreset.colors.light, ring: "#fbfbfb" },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.at(-1) === "ring")).toBe(true);
    }
  });

  it("holds every contract invariant in both preset palettes", () => {
    for (const scheme of SCHEMES) {
      const palette = neutralThemePreset.colors[scheme];
      for (const [surface, text] of TEXT_CONTRAST_PAIRS) {
        expect(contrastRatio(palette[surface], palette[text])).toBeGreaterThanOrEqual(
          TEXT_CONTRAST_MINIMUM,
        );
      }
      for (const surface of SURFACE_TOKENS) {
        expect(contrastRatio(palette.background, palette[surface])).toBeLessThanOrEqual(
          SURFACE_CONTRAST_MAXIMUM,
        );
      }
    }
  });

  it("uses WCAG relative luminance for token checks", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
  });
});

describe("dark mode delivery", () => {
  it("emits a stylesheet covering the base, the OS preference and the explicit override", () => {
    const sheet = themeStyleSheet(neutralThemePreset);

    expect(sheet).toContain("html:root{");
    expect(sheet).toContain("@media (prefers-color-scheme:dark)");
    expect(sheet).toContain('html:root:not([data-theme="light"])');
    expect(sheet).toContain('html:root[data-theme="dark"]');
    expect(sheet).toContain("--background:#ffffff;");
    expect(sheet).toContain("--background:#0a0a0a;");
    expect(sheet).toContain("color-scheme:light;");
    expect(sheet).toContain("color-scheme:dark;");
  });

  it("only ever emits validated hex and enum values, never merchant CSS", () => {
    const sheet = themeStyleSheet(neutralThemePreset);
    expect(sheet).not.toMatch(/[<>]/);
    expect(sheet).not.toContain("expression(");
    expect(sheet).not.toContain("url(");
  });

  it("resolves the scheme before first paint and degrades without storage", () => {
    expect(themeInitScript).toContain("prefers-color-scheme: dark");
    expect(themeInitScript).toContain("data-theme");
    expect(themeInitScript).toContain("try{");
    expect(themeInitScript).toContain("catch(e){}");
  });
});

describe("static stylesheet parity", () => {
  it("keeps app/globals.css :root in sync with the neutral preset", async () => {
    // The static defaults are what paints before the merchant sheet applies. If they drift, a
    // visitor sees one theme flash into another.
    const css = await readFile(resolve("app/globals.css"), "utf8");
    const lightBlock = css.slice(css.indexOf(":root {"), css.indexOf("/* Dark palette"));
    const preferenceBlock = css.slice(
      css.indexOf("/* Dark palette"),
      css.indexOf("/* Explicit opt-in"),
    );
    const explicitBlock = css.slice(
      css.indexOf(':root[data-theme="dark"] {'),
      css.indexOf("@layer components"),
    );

    for (const [token, name] of Object.entries(PALETTE_VARIABLE_NAMES)) {
      expect(lightBlock, `${name} light default`).toContain(
        `${name}: ${neutralThemePreset.colors.light[token as PaletteToken]};`,
      );
      for (const block of [preferenceBlock, explicitBlock]) {
        expect(block, `${name} dark default`).toContain(
          `${name}: ${neutralThemePreset.colors.dark[token as PaletteToken]};`,
        );
      }
    }
  });

  it("declares colours in a single colour space", async () => {
    const css = await readFile(resolve("app/globals.css"), "utf8");
    const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("@layer components"));
    expect(rootBlock).not.toContain("oklch(");
    expect(rootBlock).not.toContain("rgb(");
    expect(rootBlock).not.toContain("hsl(");
  });

  it("ships a global reduced-motion policy rather than one opt-in rule", async () => {
    const css = await readFile(resolve("app/globals.css"), "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("transition-duration: 1ms !important;");
    expect(css).toContain("animation-duration: 1ms !important;");
  });

  it("wires the dead knobs into utilities instead of leaving them no-ops", async () => {
    const css = await readFile(resolve("app/globals.css"), "utf8");
    // motion.duration reaches every transition-* utility, not just one button.
    expect(css).toContain("--default-transition-duration: var(--merchant-motion-duration");
    // shape.borderWidth reaches every unqualified border utility.
    expect(css).toContain("border-width: var(--merchant-border-width, 1px);");
    // The rhythm scale is exposed as first-class Tailwind spacing keys.
    for (const key of ["gutter", "section", "section-gap", "stack", "inline"]) {
      expect(css).toContain(`--spacing-${key}:`);
    }
  });
});
