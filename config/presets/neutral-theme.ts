import { themeConfigSchema } from "@/config/schema/theme";

/**
 * Deliberately neutral reference palette: greyscale surfaces, a single achromatic primary and three
 * status hues. Every pair here clears the contract's contrast gates in both schemes, so a merchant
 * who edits one token gets a validation error rather than a broken storefront.
 *
 * Keep `app/globals.css` `:root` in sync with these values — `tests/unit/config/theme-contract.test.ts`
 * enforces it so a static (pre-hydration) paint never disagrees with the configured theme.
 */
export const neutralThemePreset = themeConfigSchema.parse({
  schemaVersion: 1,
  name: "Neutral",
  colors: {
    light: {
      accent: "#efefef",
      accentForeground: "#171717",
      background: "#ffffff",
      border: "#c8c8c8",
      card: "#ffffff",
      cardForeground: "#171717",
      destructive: "#cc0001",
      destructiveForeground: "#ffffff",
      foreground: "#171717",
      info: "#1d4ed8",
      infoForeground: "#ffffff",
      input: "#ececec",
      muted: "#e9e9e9",
      mutedForeground: "#595959",
      overlay: "#171717",
      overlayForeground: "#ffffff",
      popover: "#ffffff",
      popoverForeground: "#171717",
      positive: "#0f7a41",
      positiveForeground: "#ffffff",
      primary: "#000000",
      primaryForeground: "#ffffff",
      ring: "#5a5a5a",
      secondary: "#e9e9e9",
      secondaryForeground: "#171717",
    },
    dark: {
      accent: "#2e2e33",
      accentForeground: "#fafafa",
      background: "#0a0a0a",
      border: "#33333a",
      card: "#131314",
      cardForeground: "#fafafa",
      destructive: "#ef4444",
      destructiveForeground: "#0a0a0a",
      foreground: "#fafafa",
      info: "#60a5fa",
      infoForeground: "#0a0a0a",
      input: "#24242a",
      muted: "#26262a",
      mutedForeground: "#a1a1aa",
      overlay: "#000000",
      overlayForeground: "#fafafa",
      popover: "#18181b",
      popoverForeground: "#fafafa",
      positive: "#34d399",
      positiveForeground: "#0a0a0a",
      primary: "#fafafa",
      primaryForeground: "#0a0a0a",
      ring: "#a1a1aa",
      secondary: "#26262a",
      secondaryForeground: "#fafafa",
    },
  },
  layout: { container: "standard", density: "comfortable" },
  motion: { duration: "standard" },
  shape: { borderWidth: "1px", radius: "0.625rem" },
  typography: { body: "system", heading: "system", scale: "standard" },
});
