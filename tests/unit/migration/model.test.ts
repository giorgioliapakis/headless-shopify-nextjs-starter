import { describe, expect, it } from "vitest";

import { buildReconstructionModel, mapSectionName } from "../../../migration/lib/model.mjs";

describe("reconstruction model", () => {
  it.each([
    ["image-banner", "hero"],
    ["rich-text", "rich-text"],
    ["featured-collection", "product-carousel"],
    ["collapsible-content", "faq"],
    ["novel-orbit", null],
  ])("maps %s to %s", (source, target) => expect(mapSectionName(source)).toBe(target));

  it("maps core routes and leaves novel/app behavior explicitly downstream", () => {
    const model = buildReconstructionModel({
      snapshot: {
        pages: [
          {
            url: "https://example.com/",
            path: "/",
            type: "home",
            bodySha256: "a".repeat(64),
          },
          {
            url: "https://example.com/products/a",
            path: "/products/a",
            type: "product",
            bodySha256: "b".repeat(64),
          },
          {
            url: "https://example.com/apps/novel",
            path: "/apps/novel",
            type: "other",
            bodySha256: "c".repeat(64),
          },
        ],
      },
      theme: {
        kind: "directory",
        manifestSha256: "d".repeat(64),
        files: [
          { path: "sections/image-banner.liquid", sha256: "e".repeat(64) },
          { path: "sections/novel-orbit.liquid", sha256: "f".repeat(64) },
          {
            path: "templates/index.json",
            sha256: "1".repeat(64),
            structure: {
              parseStatus: "parsed-data-only",
              sectionTypes: ["image-banner"],
              appBlockTypes: ["shopify://apps/synthetic/blocks/widget/id"],
            },
          },
        ],
      },
      capabilityMap: {
        capabilities: [{ id: "integrations.commerce-apps", status: "unsupported" }],
      },
    });
    expect(model.summary).toMatchObject({
      mappedRoutes: 2,
      unknownRoutes: 1,
      candidateSections: 1,
      unknownSections: 1,
      appBlockCount: 1,
    });
    expect(model.routes[0]).toMatchObject({
      target: "app/page.tsx",
      strategy: "section-recipe",
    });
    expect(model.integrations).toMatchObject({ status: "unsupported" });
    expect(model.rules).toMatchObject({ copySourceCode: false, merchantReviewRequired: true });
  });
});
