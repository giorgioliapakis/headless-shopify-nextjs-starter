import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { SECTION_REGISTRY_VERSION, sectionRegistry } from "@/components/sections/registry";
import { neutralHomeRecipe } from "@/config/presets/neutral-home";
import { neutralLandingRecipes } from "@/config/presets/neutral-landing";
import { styleguideSectionRecipe } from "@/config/presets/styleguide-sections";
import { recipeSectionTypes, sectionRecipeSchema } from "@/config/schema/sections";

describe("section registry", () => {
  it("registers every recipe section plus global header and footer", () => {
    expect(SECTION_REGISTRY_VERSION).toBe(1);
    expect(Object.keys(sectionRegistry).sort()).toEqual(
      [...recipeSectionTypes, "header", "footer"].sort(),
    );
    for (const registration of Object.values(sectionRegistry)) {
      expect(registration.source).toMatch(/^components\//);
      expect(registration.accessibility.length).toBeGreaterThan(0);
      expect(registration.anatomy.length).toBeGreaterThan(0);
      expect(registration.variants.length).toBeGreaterThan(0);
      expect(registration.allowedSlots.length).toBeGreaterThan(0);
    }
  });

  it("keeps every section server-rendered except the one that opts into media playback", () => {
    const clientSections = Object.entries(sectionRegistry)
      .filter(([, registration]) => registration.clientJavaScript)
      .map(([id]) => id);
    // The banner ships client JS only for autoplaying video, which needs an intersection observer
    // and a reduced-motion check. Everything else must stay a server component.
    expect(clientSections).toEqual(["banner"]);
  });

  it("gives the orphaned banner a full registration entry", () => {
    const banner = sectionRegistry.banner;
    expect(banner.source).toBe("components/sections/banner-section.tsx");
    expect(recipeSectionTypes).toContain("banner");
    expect(banner.dataNeeds.length).toBeGreaterThan(0);
    expect(banner.performanceCost).toBe("moderate");
    expect(banner.accessibility.join(" ")).toContain("scrim");
  });

  it("parses the neutral recipe with stable defaults", () => {
    expect(sectionRecipeSchema.parse(neutralHomeRecipe)).toEqual(neutralHomeRecipe);
    expect(neutralHomeRecipe.sections.every((section) => section.enabled)).toBe(true);
  });

  it("ships default recipes that exercise the registry rather than two sections", () => {
    const used = new Set([
      ...neutralHomeRecipe.sections.map((section) => section.type),
      ...Object.values(neutralLandingRecipes).flatMap((landing) =>
        landing.recipe.sections.map((section) => section.type),
      ),
    ]);
    expect([...used].sort()).toEqual([...recipeSectionTypes].sort());
  });

  it("keeps a styleguide specimen for every registered section type", () => {
    expect(styleguideSectionRecipe.sections.map((section) => section.type).sort()).toEqual(
      [...recipeSectionTypes].sort(),
    );
  });

  it("accepts card media on the grid sections", () => {
    const parsed = sectionRecipeSchema.parse({
      schemaVersion: 1,
      name: "Media cards",
      sections: [
        {
          id: "grid",
          type: "collection-grid",
          heading: "With media",
          aspect: "square",
          collections: [
            {
              title: "Everyday",
              media: { alt: "", height: 800, src: "/media/everyday.jpg", width: 800 },
            },
          ],
        },
      ],
    });
    const [section] = parsed.sections;
    expect(section?.type).toBe("collection-grid");
    if (section?.type === "collection-grid") {
      expect(section.collections[0]?.media?.src).toBe("/media/everyday.jpg");
      expect(section.aspect).toBe("square");
    }
  });

  it("keeps remote media out of the recipe surface", () => {
    expect(
      sectionRecipeSchema.safeParse({
        schemaVersion: 1,
        name: "Remote",
        sections: [
          {
            id: "grid",
            type: "collection-grid",
            heading: "Remote",
            collections: [
              {
                title: "Everyday",
                media: { alt: "", height: 1, src: "https://example.com/a.jpg", width: 1 },
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("makes newsletter and editorial chrome configurable instead of hard-coded English", () => {
    const parsed = sectionRecipeSchema.parse({
      schemaVersion: 1,
      name: "Localised",
      sections: [
        {
          id: "signup",
          type: "newsletter",
          heading: "Bleib in Kontakt",
          action: null,
          emailLabel: "E-Mail-Adresse",
          emailPlaceholder: "du@beispiel.de",
          submitLabel: "Abonnieren",
          unavailableNote: "Newsletter-Anbieter verbinden, um die Anmeldung zu aktivieren.",
        },
        {
          id: "journal",
          type: "editorial-grid",
          heading: "Aus dem Journal",
          readMoreLabel: "Weiterlesen",
          items: [{ title: "Erster Beitrag", href: "/blogs/journal" }],
        },
      ],
    });

    const [newsletter, editorial] = parsed.sections;
    if (newsletter?.type === "newsletter") expect(newsletter.submitLabel).toBe("Abonnieren");
    if (editorial?.type === "editorial-grid") {
      expect(editorial.readMoreLabel).toBe("Weiterlesen");
    }
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

describe("ui primitive inventory", () => {
  it("leaves no component in components/ui unused and undocumented", async () => {
    const root = resolve("components/ui");
    const files = (await readdir(root)).filter((name) => name.endsWith(".tsx"));

    const searchRoots = ["app", "components", "hooks", "lib"];
    const sources: string[] = [];
    async function collect(directory: string): Promise<void> {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) await collect(path);
        else if (/\.tsx?$/.test(entry.name) && !path.startsWith(root)) {
          sources.push(await readFile(path, "utf8"));
        }
      }
    }
    await Promise.all(searchRoots.map((directory) => collect(resolve(directory))));
    const haystack = sources.join("\n");

    const orphans = files
      .map((file) => file.replace(/\.tsx$/, ""))
      .filter((name) => !haystack.includes(`@/components/ui/${name}`));

    expect(orphans).toEqual([]);
  });
});
