import { themeConfigSchema } from "@/config/schema/theme";

export const neutralThemePreset = themeConfigSchema.parse({
  schemaVersion: 1,
  name: "Neutral",
  colors: {
    background: "#ffffff",
    border: "#c8c8c8",
    foreground: "#171717",
    muted: "#e9e9e9",
    mutedForeground: "#595959",
    primary: "#000000",
    primaryForeground: "#ffffff",
  },
  layout: { container: "standard", density: "comfortable" },
  motion: { duration: "standard" },
  shape: { borderWidth: "1px", radius: "0.625rem" },
  typography: { body: "system", heading: "system", scale: "standard" },
});
