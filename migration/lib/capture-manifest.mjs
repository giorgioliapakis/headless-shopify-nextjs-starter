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
const MAX_SOURCE_BREAKPOINTS = 6;
const MIN_CAPTURE_WIDTH = 240;
const MAX_CAPTURE_WIDTH = 2560;

/**
 * @param {any} model
 * @param {any} [theme]
 */
export function buildCaptureManifest(model, theme = null) {
  const sourceBreakpointCandidates = buildSourceBreakpointCandidates(theme);
  const breakpointViewports = buildBreakpointViewports(sourceBreakpointCandidates);
  const viewports = [...VIEWPORTS, ...breakpointViewports];
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
      viewports,
      locales: ["source-default"],
      preferences: PREFERENCES,
      consentStates: CONSENT_STATES,
      inputs: INPUTS[route.sourceType] ?? [],
      sourceBreakpointCandidates,
      sourceBreakpointsRequireReview: true,
      scenarios: buildPairwiseScenarios(route.sourcePath, states, breakpointViewports),
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
      sourceBreakpointNormalization:
        "rem/em candidates use the CSS initial 16px value and require rendered source review",
      screenshotsRemainOutsideFoundation: true,
    },
    routes,
    summary: {
      routeCount: routes.length,
      mappedRoutes: routes.filter((route) => route.mappingStatus === "mapped").length,
      scenarioCount: routes.reduce((count, route) => count + route.scenarios.length, 0),
      sourceBreakpointCandidateCount: sourceBreakpointCandidates.length,
      sourceBreakpointViewportCount: breakpointViewports.length,
      pendingRoutes: routes.length,
    },
  };
}

function buildPairwiseScenarios(path, states, breakpointViewports = []) {
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
  for (const viewport of breakpointViewports) {
    add(states[0], viewport.id, "default", "default");
  }
  return scenarios;
}

/** @param {any} theme */
export function buildSourceBreakpointCandidates(theme) {
  const candidates = new Map();
  for (const file of theme?.files ?? []) {
    for (const breakpoint of file.style?.breakpoints ?? []) {
      const widthPx = Math.round(breakpoint.normalizedPx);
      if (widthPx < MIN_CAPTURE_WIDTH || widthPx > MAX_CAPTURE_WIDTH) continue;
      const key = String(widthPx);
      const current = candidates.get(key) ?? {
        id: `source-${widthPx}px`,
        widthPx,
        observedValues: new Map(),
        features: new Set(),
        occurrences: 0,
        sourceFiles: new Set(),
        reviewStatus: "requires-rendered-review",
      };
      current.observedValues.set(`${breakpoint.value}${breakpoint.unit}`, {
        value: breakpoint.value,
        unit: breakpoint.unit,
      });
      for (const feature of breakpoint.features ?? []) current.features.add(feature);
      current.occurrences += breakpoint.occurrences ?? 1;
      current.sourceFiles.add(file.path);
      candidates.set(key, current);
    }
  }
  return [...candidates.values()]
    .sort((left, right) => right.occurrences - left.occurrences || left.widthPx - right.widthPx)
    .slice(0, MAX_SOURCE_BREAKPOINTS)
    .sort((left, right) => left.widthPx - right.widthPx)
    .map((candidate) => ({
      id: candidate.id,
      widthPx: candidate.widthPx,
      observedValues: [...candidate.observedValues.values()].sort(
        (left, right) => left.value - right.value || left.unit.localeCompare(right.unit),
      ),
      features: [...candidate.features].sort(),
      occurrences: candidate.occurrences,
      sourceFiles: [...candidate.sourceFiles].sort().slice(0, 20),
      reviewStatus: candidate.reviewStatus,
    }));
}

function buildBreakpointViewports(candidates) {
  const viewports = new Map();
  for (const candidate of candidates) {
    for (const [position, width] of [
      ["below", candidate.widthPx - 1],
      ["at", candidate.widthPx],
      ["above", candidate.widthPx + 1],
    ]) {
      if (width < MIN_CAPTURE_WIDTH || width > MAX_CAPTURE_WIDTH) continue;
      const id = `${candidate.id}-${position}`;
      viewports.set(id, {
        id,
        width,
        height: width < 768 ? 900 : 1024,
        deviceScaleFactor: 1,
        sourceBreakpointId: candidate.id,
        position,
      });
    }
  }
  return [...viewports.values()];
}

/**
 * @param {any} model
 * @param {any} captureManifest
 * @param {any} [targetCoverage]
 */
export function buildReconstructionReadiness(model, captureManifest, targetCoverage = null) {
  const blockers = [];
  if (targetCoverage?.summary.blockedCount) {
    blockers.push({
      code: "MISSING_FOUNDATION_TARGETS",
      count: targetCoverage.summary.blockedCount,
    });
  }
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
    MISSING_FOUNDATION_TARGETS:
      "Restore or safely implement every missing mapped foundation route target",
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
