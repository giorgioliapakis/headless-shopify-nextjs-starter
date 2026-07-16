import { describe, expect, it } from "vitest";

import {
  buildThemeRightsInventory,
  buildThemeRightsStatus,
} from "../../../migration/lib/theme-rights.mjs";

describe("theme asset rights inventory", () => {
  it("classifies risky files and observed external references without granting copy rights", () => {
    const report = buildThemeRightsInventory({
      manifestSha256: "a".repeat(64),
      provenance: { sourceIdentity: "b".repeat(64) },
      files: [
        { path: "assets/brand.woff2", sha256: "1".repeat(64) },
        { path: "assets/hero.webp", sha256: "2".repeat(64) },
        { path: "assets/vendor.js", sha256: "3".repeat(64) },
        {
          path: "config/settings_data.json",
          sha256: "4".repeat(64),
          structure: {
            observations: {
              fonts: ["licensed_font_n4"],
              logos: ["shopify://shop_images/logo.svg"],
            },
          },
        },
        {
          path: "templates/index.json",
          sha256: "5".repeat(64),
          structure: { appBlockTypes: ["shopify://apps/provider/blocks/widget/example"] },
        },
      ],
    });

    expect(report).toMatchObject({
      requiredDecisionId: "theme-asset-rights-review",
      summary: {
        itemCount: 6,
        requiringReview: 6,
        approvedForFoundationRedistribution: 0,
        categories: {
          "app-block-output-reference": 1,
          "client-script-file": 1,
          "font-file": 1,
          "font-setting-reference": 1,
          "media-file": 1,
          "media-setting-reference": 1,
        },
      },
      policy: {
        rawAssetsIncluded: false,
        automaticCopyAllowed: false,
        foundationRedistributionAllowed: false,
      },
    });
    expect(report.items.every((item) => item.foundationRedistribution === false)).toBe(true);
    expect(JSON.stringify(report)).not.toContain("synthetic source file contents");
  });

  it("does not require a rights decision when no risky asset or reference is observed", () => {
    const report = buildThemeRightsInventory({
      manifestSha256: "a".repeat(64),
      provenance: { sourceIdentity: "b".repeat(64) },
      files: [{ path: "sections/hero.liquid", sha256: "1".repeat(64) }],
    });
    expect(report.requiredDecisionId).toBeNull();
    expect(report.items).toEqual([]);
  });

  it("binds per-item outcomes to the exact theme identity and leaves stale decisions unresolved", () => {
    const inventory = buildThemeRightsInventory({
      manifestSha256: "a".repeat(64),
      provenance: { sourceIdentity: "b".repeat(64) },
      files: [{ path: "assets/brand.woff2", sha256: "1".repeat(64) }],
    });
    const item = inventory.items[0];
    const current = buildThemeRightsStatus(inventory, [
      {
        itemId: item.id,
        status: "approved-downstream",
        basis: "license-reviewed",
        recordedAt: "2026-07-17T00:00:00.000Z",
        themeSourceIdentity: inventory.themeSourceIdentity,
        themeManifestSha256: inventory.themeManifestSha256,
      },
    ]);
    const stale = buildThemeRightsStatus(inventory, [
      {
        itemId: item.id,
        status: "approved-downstream",
        basis: "license-reviewed",
        recordedAt: "2026-07-17T00:00:00.000Z",
        themeSourceIdentity: "c".repeat(64),
        themeManifestSha256: inventory.themeManifestSha256,
      },
    ]);
    const invalid = buildThemeRightsStatus(inventory, [
      {
        itemId: item.id,
        status: "approved-downstream",
        basis: "excluded-from-migration",
        recordedAt: "2026-07-17T00:00:00.000Z",
        themeSourceIdentity: inventory.themeSourceIdentity,
        themeManifestSha256: inventory.themeManifestSha256,
      },
    ]);

    expect(current.summary).toMatchObject({ complete: true, approvedDownstream: 1, unresolved: 0 });
    expect(stale.summary).toMatchObject({ complete: false, approvedDownstream: 0, unresolved: 1 });
    expect(invalid.summary).toMatchObject({
      complete: false,
      approvedDownstream: 0,
      unresolved: 1,
    });
  });
});
