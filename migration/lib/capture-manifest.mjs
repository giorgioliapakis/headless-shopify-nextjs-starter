import { createHash } from "node:crypto";

const VIEWPORTS = [
  { id: "mobile", width: 375, height: 812, deviceScaleFactor: 1 },
  { id: "tablet", width: 768, height: 1024, deviceScaleFactor: 1 },
  { id: "desktop", width: 1440, height: 900, deviceScaleFactor: 1 },
];

const STATES = {
  home: ["default", "navigation-open"],
  "collection-index": ["default"],
  product: ["default", "alternate-media", "variant-selected", "cart-confirmation"],
  collection: ["default", "filters-open", "sort-changed", "paginated"],
  search: ["default", "results", "filters-open", "empty-results"],
  blog: ["default", "paginated"],
  article: ["default"],
  page: ["default"],
  landing: ["default"],
  policy: ["default"],
  cart: ["default", "quantity-changed", "discount-applied", "note-entered", "checkout-handoff"],
  account: ["hosted-handoff"],
  checkout: ["hosted-handoff"],
  other: ["default"],
};
const INPUTS = {
  product: [
    { id: "variant", valueRule: "source-observed-available-value" },
    { id: "quantity", valueRule: "bounded-positive-integer" },
    { id: "selling-plan", valueRule: "source-observed-when-required" },
  ],
  collection: [
    { id: "filters", valueRule: "source-observed-valid-filter" },
    { id: "sort", valueRule: "source-observed-valid-sort" },
    { id: "cursor", valueRule: "source-observed-next-page" },
  ],
  search: [
    { id: "query", valueRule: "non-sensitive-source-representative-query" },
    { id: "filters", valueRule: "source-observed-valid-filter" },
    { id: "sort", valueRule: "source-observed-valid-sort" },
  ],
  cart: [
    { id: "quantity", valueRule: "bounded-positive-integer" },
    { id: "discount", valueRule: "merchant-provided-non-production-fixture" },
    { id: "note", valueRule: "synthetic-non-sensitive-text" },
  ],
};
const PREFERENCES = [
  { colorScheme: "light", reducedMotion: false },
  { colorScheme: "light", reducedMotion: true },
];
const CONSENT_STATES = ["default", "accepted", "rejected"];

export function buildCaptureManifest(model) {
  const routes = (model.routes ?? []).map((route) => {
    const states = STATES[route.sourceType] ?? STATES.other;
    return {
      id: stableId(route.sourcePath),
      sourceUrl: route.sourceUrl,
      sourcePath: route.sourcePath,
      sourceType: route.sourceType,
      target: route.target,
      mappingStatus: route.status,
      states,
      viewports: VIEWPORTS,
      locales: ["source-default"],
      preferences: PREFERENCES,
      consentStates: CONSENT_STATES,
      inputs: INPUTS[route.sourceType] ?? [],
      sourceBreakpointCandidates: [],
      sourceBreakpointsRequireReview: true,
      scenarios: buildPairwiseScenarios(route.sourcePath, states),
      dynamicMasks: [],
      dynamicMasksRequireReview: true,
      captureStatus: "pending",
    };
  });
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    evidenceTrust: "source-derived-capture-instructions",
    rules: {
      freshCredentialFreeBrowser: true,
      sourceAndPreviewUseSeparateContexts: true,
      animationsDisabledOnlyThroughReducedMotion: true,
      automaticDynamicMasking: false,
      screenshotsRemainOutsideFoundation: true,
    },
    routes,
    summary: {
      routeCount: routes.length,
      mappedRoutes: routes.filter((route) => route.mappingStatus === "mapped").length,
      scenarioCount: routes.reduce((count, route) => count + route.scenarios.length, 0),
      pendingRoutes: routes.length,
    },
  };
}

function buildPairwiseScenarios(path, states) {
  const scenarios = [];
  function add(state, viewport, preference, consent) {
    const value = { state, viewport, preference, consent, locale: "source-default" };
    scenarios.push({ id: stableId(`${path}:${JSON.stringify(value)}`), ...value });
  }
  for (const viewport of VIEWPORTS) add(states[0], viewport.id, "default", "default");
  add(states[0], "desktop", "reduced-motion", "default");
  add(states[0], "desktop", "default", "accepted");
  add(states[0], "desktop", "default", "rejected");
  for (const state of states.slice(1)) {
    add(state, "mobile", "default", "default");
    add(state, "desktop", "default", "default");
  }
  return scenarios;
}

export function buildReconstructionReadiness(model, captureManifest) {
  const blockers = [];
  if (model.summary.passwordGatedPages) {
    blockers.push({ code: "SOURCE_PASSWORD_GATED", count: model.summary.passwordGatedPages });
  }
  if (model.summary.unknownRoutes) {
    blockers.push({ code: "UNKNOWN_ROUTES", count: model.summary.unknownRoutes });
  }
  if (model.summary.unknownSections) {
    blockers.push({ code: "UNKNOWN_SECTIONS", count: model.summary.unknownSections });
  }
  if (model.summary.appBlockCount) {
    blockers.push({ code: "APP_BLOCKS_REQUIRE_ADAPTER", count: model.summary.appBlockCount });
  }
  const decisions = [
    ...(model.summary.candidateSections
      ? [{ code: "REVIEW_HEURISTIC_SECTION_MAPPINGS", count: model.summary.candidateSections }]
      : []),
    ...(model.summary.brandObservationSources
      ? [
          {
            code: "MAP_AND_VERIFY_BRAND_OBSERVATIONS",
            count: model.summary.brandObservationSources,
          },
        ]
      : []),
    ...(captureManifest.summary.pendingRoutes
      ? [{ code: "CAPTURE_SOURCE_AND_PREVIEW", count: captureManifest.summary.pendingRoutes }]
      : []),
  ];
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: blockers.length
      ? "blocked"
      : decisions.length
        ? "needs-review"
        : "ready-for-reconstruction",
    launchReady: false,
    blockers,
    decisions,
    evidence: {
      routeCount: model.summary.routeCount,
      themeSectionCount: model.summary.themeSectionCount,
      scenarioCount: captureManifest.summary.scenarioCount,
    },
    nextActions: [
      ...blockers.map((blocker) => actionFor(blocker.code)),
      ...decisions.map((decision) => actionFor(decision.code)),
    ],
  };
}

function stableId(path) {
  const slug = path.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-") || "home";
  const suffix = createHash("sha256").update(path).digest("hex").slice(0, 8);
  return `${slug.slice(0, 60)}-${suffix}`;
}

function actionFor(code) {
  const actions = {
    UNKNOWN_ROUTES: "Classify and implement each unknown route in merchant-owned files",
    SOURCE_PASSWORD_GATED:
      "Obtain an approved credential-free source capture path before reconstruction",
    UNKNOWN_SECTIONS: "Map or implement each unknown section downstream",
    APP_BLOCKS_REQUIRE_ADAPTER:
      "Inventory app behavior and prove a provider-specific downstream adapter",
    REVIEW_HEURISTIC_SECTION_MAPPINGS:
      "Review every heuristic section mapping against source evidence",
    MAP_AND_VERIFY_BRAND_OBSERVATIONS:
      "Map observations to semantic tokens and visually verify them",
    CAPTURE_SOURCE_AND_PREVIEW: "Run the approved source/preview browser capture manifest",
  };
  return actions[code];
}
