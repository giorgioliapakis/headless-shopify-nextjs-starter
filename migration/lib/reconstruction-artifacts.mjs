import { createHash } from "node:crypto";

const COLOR_ROLES = [
  "background",
  "foreground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "border",
  "focusRing",
];

export function buildTemplateClusters(model) {
  const routeGroups = groupBy(model.routes ?? [], (route) =>
    [route.sourceType, route.target, route.strategy, route.status].join("\0"),
  );
  const routeClusters = [...routeGroups.values()]
    .map((routes) => ({
      id: stableId(`route:${routes[0].sourceType}:${routes[0].target}:${routes[0].strategy}`),
      sourceType: routes[0].sourceType,
      target: routes[0].target,
      strategy: routes[0].strategy,
      status: routes[0].status,
      routeCount: routes.length,
      sourcePaths: routes.map((route) => route.sourcePath).sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const templateGroups = groupBy(model.theme?.templates ?? [], (template) =>
    JSON.stringify({
      sections: [...(template.sectionTypes ?? [])].sort(),
      appBlocks: [...(template.appBlockTypes ?? [])].sort(),
      parseStatus: template.parseStatus,
    }),
  );
  const themeClusters = [...templateGroups.entries()]
    .map(([signature, templates]) => ({
      id: stableId(`theme:${signature}`),
      parseStatus: templates[0].parseStatus,
      sectionTypes: [...(templates[0].sectionTypes ?? [])].sort(),
      appBlockTypes: [...(templates[0].appBlockTypes ?? [])].sort(),
      templateCount: templates.length,
      sourcePaths: templates.map((template) => template.sourcePath).sort(),
      mappingStatus: templates[0].appBlockTypes?.length
        ? "requires-integration-review"
        : "candidate",
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: model.source,
    evidenceTrust: "untrusted-source-derived-bounded-model",
    routeClusters,
    themeClusters,
    summary: {
      routeClusters: routeClusters.length,
      themeClusters: themeClusters.length,
      unknownRouteClusters: routeClusters.filter((cluster) => cluster.status === "unknown").length,
      integrationClusters: themeClusters.filter(
        (cluster) => cluster.mappingStatus === "requires-integration-review",
      ).length,
    },
  };
}

export function buildIntegrationInventory(model) {
  const items = (model.integrations?.appBlocks ?? []).map((reference) => ({
    id: stableId(reference),
    kind: "shopify-theme-app-block",
    reference,
    provider: parseAppProvider(reference),
    observedBehavior: "not-executed-not-inferred",
    targetCapability: "integrations.commerce-apps",
    status: "requires-provider-adapter-and-parity-proof",
    foundationBundled: false,
  }));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: model.source,
    evidenceTrust: "theme-structure-reference-only",
    items,
    summary: {
      observed: items.length,
      requiringAdapter: items.length,
      foundationBundled: 0,
    },
  };
}

export function buildUnknownInventory(model) {
  const routes = (model.routes ?? [])
    .filter((route) => route.status === "unknown")
    .map((route) => ({
      kind: "route",
      sourcePath: route.sourcePath,
      sourceType: route.sourceType,
      requiredAction: "classify-and-implement-downstream",
    }));
  const sections = (model.theme?.sections ?? [])
    .filter((section) => section.status === "downstream-required")
    .map((section) => ({
      kind: "section",
      sourcePath: section.sourcePath,
      sourceType: section.sourceType,
      requiredAction: "map-or-implement-downstream",
    }));
  const integrations = (model.integrations?.appBlocks ?? []).map((reference) => ({
    kind: "integration",
    reference,
    requiredAction: "inventory-behavior-and-prove-adapter",
  }));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: model.source,
    launchPolicy: "every-revenue-critical-unknown-must-be-resolved-or-explicitly-excluded",
    routes,
    sections,
    integrations,
    summary: {
      routes: routes.length,
      sections: sections.length,
      integrations: integrations.length,
      total: routes.length + sections.length + integrations.length,
    },
  };
}

export function buildBrandPack(model) {
  const observed = {
    colors: [...(model.brand?.colors ?? [])],
    fonts: [...(model.brand?.fontCandidates ?? [])],
    logoReferences: [...(model.brand?.logoReferences ?? [])],
    layout: [...(model.brand?.layoutCandidates ?? [])],
  };
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: model.source,
    status:
      model.brand?.status === "observed-unmapped" ? "requires-semantic-mapping" : "not-observed",
    layers: {
      observed: {
        trust: "untrusted-bounded-theme-observations",
        immutable: true,
        ...observed,
      },
      semantic: {
        schemaVersion: 1,
        status: "merchant-review-required",
        colorRoles: Object.fromEntries(COLOR_ROLES.map((role) => [role, null])),
        typography: { heading: null, body: null },
        layout: { container: null, spacing: null, radius: null, grid: null },
        candidateReferences: {
          colors: observed.colors,
          fonts: observed.fonts,
          layout: observed.layout,
        },
      },
      componentVariants: {
        schemaVersion: 1,
        status: "use-registered-variants-only",
        themeContract: "config/schema/theme.ts",
        sectionContract: "config/schema/sections.ts",
        registry: "components/sections/registry.tsx",
        overrides: [],
      },
    },
    rules: {
      sourceSettingsAreNotSemanticTokens: true,
      noAutomaticAssetCopy: true,
      contrastValidationRequired: true,
      visualReviewRequired: true,
      merchantValuesStayDownstream: true,
    },
  };
}

function groupBy(values, keyFor) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFor(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return groups;
}

function stableId(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function parseAppProvider(reference) {
  const match = /^shopify:\/\/apps\/([^/]+)/.exec(reference);
  return match?.[1] ?? "unknown";
}
