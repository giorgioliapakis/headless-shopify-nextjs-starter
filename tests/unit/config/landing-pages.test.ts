import { describe, expect, it } from "vitest";

import { neutralHomeRecipe } from "@/config/presets/neutral-home";
import { landingPageConfigSchema, landingPageHandleSchema } from "@/config/schema/shop";

describe("landing page configuration", () => {
  it("validates metadata, indexing and a reusable section recipe", () => {
    expect(
      landingPageConfigSchema.parse({
        title: "Synthetic campaign",
        description: "A neutral test-only landing page configuration.",
        index: false,
        recipe: neutralHomeRecipe,
      }),
    ).toMatchObject({ title: "Synthetic campaign", index: false, recipe: neutralHomeRecipe });
  });

  it.each(["UPPERCASE", "spaces are invalid", "../escape", ""])(
    "rejects unsafe handle %s",
    (handle) => {
      expect(landingPageHandleSchema.safeParse(handle).success).toBe(false);
    },
  );
});
