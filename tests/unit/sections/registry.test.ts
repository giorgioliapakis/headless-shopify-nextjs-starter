import { describe, expect, it } from "vitest";

import { SECTION_REGISTRY_VERSION, sectionRegistry } from "@/components/sections/registry";
import { neutralHomeRecipe } from "@/config/presets/neutral-home";
import { recipeSectionTypes, sectionRecipeSchema } from "@/config/schema/sections";

describe("section registry", () => {
  it("registers every recipe section plus global header and footer", () => {
    expect(SECTION_REGISTRY_VERSION).toBe(1);
    expect(Object.keys(sectionRegistry).sort()).toEqual(
      [...recipeSectionTypes, "header", "footer"].sort(),
    );
    for (const registration of Object.values(sectionRegistry)) {
      expect(registration.source).toMatch(/^components\//);
      expect(registration.clientJavaScript).toBe(false);
      expect(registration.accessibility.length).toBeGreaterThan(0);
    }
  });

  it("parses the neutral recipe with stable defaults", () => {
    expect(sectionRecipeSchema.parse(neutralHomeRecipe)).toEqual(neutralHomeRecipe);
    expect(neutralHomeRecipe.sections.every((section) => section.enabled)).toBe(true);
  });

  it("rejects duplicate IDs and unknown section types", () => {
    const duplicate = sectionRecipeSchema.safeParse({
      schemaVersion: 1,
      name: "Duplicate",
      sections: [
        { id: "same", type: "rich-text", body: "One" },
        { id: "same", type: "rich-text", body: "Two" },
      ],
    });
    expect(duplicate.success).toBe(false);
    if (!duplicate.success) expect(duplicate.error.issues[0]?.path).toEqual(["sections", 1, "id"]);

    expect(
      sectionRecipeSchema.safeParse({
        schemaVersion: 1,
        name: "Unknown",
        sections: [{ id: "unknown", type: "magic" }],
      }).success,
    ).toBe(false);
  });
});
