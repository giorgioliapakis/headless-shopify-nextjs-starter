import { describe, expect, it } from "vitest";

import {
  buildBrandPack,
  buildIntegrationInventory,
  buildTemplateClusters,
  buildUnknownInventory,
} from "../../../migration/lib/reconstruction-artifacts.mjs";

const model = {
  source: { publicSnapshotId: "a".repeat(64), themeManifestSha256: "b".repeat(64) },
  routes: [
    {
      sourcePath: "/products/one",
      sourceType: "product",
      target: "app/products/[handle]/page.tsx",
      strategy: "commerce-core",
      status: "mapped",
    },
    {
      sourcePath: "/products/two",
      sourceType: "product",
      target: "app/products/[handle]/page.tsx",
      strategy: "commerce-core",
      status: "mapped",
    },
    {
      sourcePath: "/apps/unknown",
      sourceType: "other",
      target: "app/(merchant)/",
      strategy: "downstream-required",
      status: "unknown",
    },
  ],
  theme: {
    templates: [
      {
        sourcePath: "templates/index.json",
        parseStatus: "parsed-data-only",
        sectionTypes: ["image-banner"],
        appBlockTypes: ["shopify://apps/provider/blocks/widget/id"],
      },
      {
        sourcePath: "templates/page.about.json",
        parseStatus: "parsed-data-only",
        sectionTypes: ["image-banner"],
        appBlockTypes: ["shopify://apps/provider/blocks/widget/id"],
      },
    ],
    sections: [
      {
        sourcePath: "sections/novel.liquid",
        sourceType: "novel",
        status: "downstream-required",
      },
    ],
  },
  integrations: { appBlocks: ["shopify://apps/provider/blocks/widget/id"] },
  brand: {
    status: "observed-unmapped",
    colors: ["#112233"],
    fontCandidates: ["neutral_n4"],
    logoReferences: ["shopify://shop_images/logo.svg"],
    layoutCandidates: [{ sourcePath: "config/settings_data.json", key: "page_width", value: 1200 }],
  },
};

describe("bounded reconstruction artifacts", () => {
  it("clusters repeated route/template structures and keeps unknowns explicit", () => {
    const clusters = buildTemplateClusters(model);
    const unknowns = buildUnknownInventory(model);
    const integrations = buildIntegrationInventory(model);

    expect(clusters.summary).toMatchObject({
      routeClusters: 2,
      themeClusters: 1,
      unknownRouteClusters: 1,
      integrationClusters: 1,
    });
    expect(
      clusters.routeClusters.find((cluster) => cluster.sourceType === "product"),
    ).toMatchObject({
      routeCount: 2,
      sourcePaths: ["/products/one", "/products/two"],
    });
    expect(unknowns.summary).toEqual({ routes: 1, sections: 1, integrations: 1, total: 3 });
    expect(integrations.items[0]).toMatchObject({
      provider: "provider",
      observedBehavior: "not-executed-not-inferred",
      foundationBundled: false,
    });
  });

  it("keeps observed, semantic and component layers separate", () => {
    const brand = buildBrandPack(model);

    expect(brand).toMatchObject({
      status: "requires-semantic-mapping",
      layers: {
        observed: { immutable: true, colors: ["#112233"], fonts: ["neutral_n4"] },
        semantic: {
          status: "merchant-review-required",
          colorRoles: { background: null, foreground: null, primary: null },
        },
        componentVariants: {
          status: "use-registered-variants-only",
          registry: "components/sections/registry.tsx",
          overrides: [],
        },
      },
      rules: {
        sourceSettingsAreNotSemanticTokens: true,
        noAutomaticAssetCopy: true,
        merchantValuesStayDownstream: true,
      },
    });
  });
});
