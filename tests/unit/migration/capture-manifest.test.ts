import { describe, expect, it } from "vitest";

import {
  buildCaptureManifest,
  buildReconstructionReadiness,
} from "../../../migration/lib/capture-manifest.mjs";

describe("migration capture and readiness model", () => {
  const model = {
    routes: [
      {
        sourceUrl: "https://example.com/products/neutral",
        sourcePath: "/products/neutral",
        sourceType: "product",
        target: "app/products/[handle]/page.tsx",
        status: "mapped",
      },
    ],
    summary: {
      appBlockCount: 1,
      brandObservationSources: 1,
      candidateSections: 2,
      routeCount: 1,
      themeSectionCount: 3,
      unknownRoutes: 0,
      unknownSections: 1,
      passwordGatedPages: 1,
    },
  };

  it("creates bounded deterministic route scenarios without automatic masks", () => {
    const first = buildCaptureManifest(model);
    const second = buildCaptureManifest(model);
    expect(first.routes[0]).toMatchObject({
      id: second.routes[0].id,
      states: ["default", "alternate-media", "variant-selected", "cart-confirmation"],
      dynamicMasks: [],
      dynamicMasksRequireReview: true,
      consentStates: ["default", "accepted", "rejected"],
      inputs: [
        { id: "variant", valueRule: "source-observed-available-value" },
        { id: "quantity", valueRule: "bounded-positive-integer" },
        { id: "selling-plan", valueRule: "source-observed-when-required" },
      ],
      sourceBreakpointCandidates: [],
      sourceBreakpointsRequireReview: true,
    });
    expect(first.summary).toMatchObject({ routeCount: 1, scenarioCount: 12 });
    expect(first.routes[0].scenarios).toHaveLength(12);
    expect(first.routes[0].scenarios).toContainEqual(
      expect.objectContaining({ consent: "rejected", viewport: "desktop" }),
    );
  });

  it("keeps unknown source behavior blocking and browser proof pending", () => {
    const capture = buildCaptureManifest(model);
    const readiness = buildReconstructionReadiness(model, capture);
    expect(readiness).toMatchObject({ status: "blocked", launchReady: false });
    expect(readiness.blockers.map((blocker) => blocker.code)).toEqual([
      "SOURCE_PASSWORD_GATED",
      "UNKNOWN_SECTIONS",
      "APP_BLOCKS_REQUIRE_ADAPTER",
    ]);
    expect(readiness.decisions.map((decision) => decision.code)).toContain(
      "CAPTURE_SOURCE_AND_PREVIEW",
    );
  });
});
