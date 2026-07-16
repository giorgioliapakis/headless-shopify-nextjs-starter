const ROUTE_TARGETS = {
  home: {
    target: "app/page.tsx",
    strategy: "section-recipe",
    defaults: ["hero", "product-carousel"],
  },
  product: { target: "app/products/[handle]/page.tsx", strategy: "commerce-core", defaults: [] },
  collection: {
    target: "app/collections/[handle]/page.tsx",
    strategy: "commerce-core",
    defaults: [],
  },
  search: { target: "app/search/page.tsx", strategy: "commerce-core", defaults: [] },
  blog: {
    target: "app/blogs/[handle]/page.tsx",
    strategy: "content-core",
    defaults: ["editorial-grid"],
  },
  article: {
    target: "app/blogs/[handle]/[article]/page.tsx",
    strategy: "content-core",
    defaults: ["rich-text"],
  },
  page: {
    target: "app/pages/[handle]/page.tsx",
    strategy: "content-core",
    defaults: ["rich-text"],
  },
  landing: {
    target: "app/landing/[handle]/page.tsx",
    strategy: "section-recipe",
    defaults: [],
  },
  policy: {
    target: "app/policies/[handle]/page.tsx",
    strategy: "content-core",
    defaults: ["rich-text"],
  },
  other: { target: "app/(merchant)/", strategy: "downstream-required", defaults: [] },
};

const SECTION_HEURISTICS = [
  [/image-banner|banner|slideshow|hero/, "hero"],
  [/rich[-_ ]?text/, "rich-text"],
  [/image[-_ ]?with[-_ ]?text|media[-_ ]?text/, "media-text"],
  [/logo/, "logo-list"],
  [/collection[-_ ]?list|multicolumn/, "collection-grid"],
  [/featured[-_ ]?(?:collection|product)|product[-_ ]?(?:grid|carousel)/, "product-carousel"],
  [/blog|article|editorial/, "editorial-grid"],
  [/testimonial|review/, "testimonials"],
  [/faq|collapsible/, "faq"],
  [/newsletter|email/, "newsletter"],
  [/trust|icon[-_ ]?with[-_ ]?text/, "trust-strip"],
  [/announcement/, "announcement"],
];

export function buildReconstructionModel({ snapshot, theme, capabilityMap }) {
  const capabilities = new Map(
    (capabilityMap.capabilities ?? []).map((entry) => [entry.id, entry.status]),
  );
  const routes = (snapshot.pages ?? []).map((page) => {
    const contract = ROUTE_TARGETS[page.type] ?? ROUTE_TARGETS.other;
    return {
      sourceUrl: page.url,
      sourcePath: page.path,
      sourceType: page.type,
      sourceSha256: page.bodySha256 ?? null,
      target: contract.target,
      strategy: contract.strategy,
      suggestedSections: contract.defaults,
      status: contract.strategy === "downstream-required" ? "unknown" : "mapped",
    };
  });
  const themeSections = (theme.files ?? [])
    .filter((file) => /^sections\/[^/]+\.liquid$/i.test(file.path))
    .map((file) => {
      const sourceType = file.path.replace(/^sections\//, "").replace(/\.liquid$/i, "");
      const registeredSection = mapSectionName(sourceType);
      return {
        sourcePath: file.path,
        sourceType,
        sourceSha256: file.sha256,
        registeredSection,
        status: registeredSection ? "candidate" : "downstream-required",
        confidence: registeredSection ? "heuristic" : "unknown",
      };
    });
  const templates = (theme.files ?? [])
    .filter((file) => /^templates\/[^/]+\.json$/i.test(file.path))
    .map((file) => ({
      sourcePath: file.path,
      sourceSha256: file.sha256,
      sectionTypes: file.structure?.sectionTypes ?? [],
      appBlockTypes: file.structure?.appBlockTypes ?? [],
      parseStatus: file.structure?.parseStatus ?? "not-inspected",
    }));
  const appBlocks = [...new Set(templates.flatMap((template) => template.appBlockTypes))].sort();
  const unknownRoutes = routes.filter((route) => route.status === "unknown").length;
  const unknownSections = themeSections.filter(
    (section) => section.status === "downstream-required",
  ).length;
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    evidenceTrust: "untrusted-source-derived-bounded-model",
    rules: {
      mappingsAreSuggestions: true,
      copySourceCode: false,
      unknownPatternsStayDownstream: true,
      merchantReviewRequired: true,
    },
    routes,
    theme: {
      kind: theme.kind,
      manifestSha256: theme.manifestSha256 ?? theme.sha256,
      sections: themeSections,
      templates,
    },
    integrations: {
      appBlocks,
      status: appBlocks.length
        ? (capabilities.get("integrations.commerce-apps") ?? "unsupported")
        : "not-observed",
      action: appBlocks.length
        ? "Inventory provider behavior and implement a conditional downstream pack"
        : null,
    },
    summary: {
      routeCount: routes.length,
      mappedRoutes: routes.length - unknownRoutes,
      unknownRoutes,
      themeSectionCount: themeSections.length,
      candidateSections: themeSections.length - unknownSections,
      unknownSections,
      appBlockCount: appBlocks.length,
    },
  };
}

export function mapSectionName(name) {
  const normalized = name.toLowerCase();
  return SECTION_HEURISTICS.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}
