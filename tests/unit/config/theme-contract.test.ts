import { describe, expect, it } from "vitest";

import { neutralThemePreset } from "@/config/presets/neutral-theme";
import { contrastRatio, themeConfigSchema, themeToCssVariables } from "@/config/schema/theme";

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
        primary: "#ffffff",
        primaryForeground: "#eeeeee",
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["colors", "primaryForeground"],
      });
      expect(result.error.issues[0]?.message).toContain("4.5:1");
    }
  });

  it("uses WCAG relative luminance for token checks", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
  });
});
