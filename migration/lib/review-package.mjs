const ISSUE_LABELS = {
  SOURCE_PASSWORD_GATED: "Source storefront is password-gated",
  UNKNOWN_ROUTES: "Routes need downstream implementation",
  UNKNOWN_SECTIONS: "Theme sections need downstream implementation",
  APP_BLOCKS_REQUIRE_ADAPTER: "App blocks need provider adapters",
  REVIEW_HEURISTIC_SECTION_MAPPINGS: "Heuristic section mappings need review",
  MAP_AND_VERIFY_BRAND_OBSERVATIONS: "Brand observations need mapping and visual review",
  CAPTURE_SOURCE_AND_PREVIEW: "Source and preview captures are pending",
  SOURCE_DRIFT_REVIEW: "Observed source drift needs review",
  THEME_ASSET_RIGHTS_REVIEW: "Theme asset licenses and downstream use need review",
};
const RESOLVABLE_REVIEW_DECISIONS = { SOURCE_DRIFT_REVIEW: "source-drift-review" };

export function buildReviewManifest({
  state,
  model,
  readiness,
  captureManifest,
  decisions,
  sourceDrift,
  decisionValidity,
  artifactIntegrity,
}) {
  const validity = new Map(
    (decisionValidity?.decisions ?? []).map((decision) => [decision.id, decision.validity]),
  );
  const recordedDecisions = decisions.map((decision) => ({
    ...decision,
    validity: validity.get(decision.id) ?? "not-evaluated",
  }));
  const currentAcceptedDecisions = new Set(
    recordedDecisions
      .filter(
        (decision) => decision.status === "accepted" && decision.validity === "current-review-only",
      )
      .map((decision) => decision.id),
  );
  const blockers = enrichIssues(readiness.blockers, readiness.nextActions);
  const requiredReviews = enrichIssues(
    readiness.decisions,
    readiness.nextActions,
    readiness.blockers?.length ?? 0,
  ).filter(
    (issue) =>
      !issue.resolutionDecisionId || !currentAcceptedDecisions.has(issue.resolutionDecisionId),
  );
  const routes = (model.routes ?? []).map((route) => ({
    sourcePath: route.sourcePath,
    sourceType: route.sourceType,
    target: route.target,
    strategy: route.strategy,
    status: route.status,
  }));
  const sections = (model.theme?.sections ?? []).map((section) => ({
    sourcePath: section.sourcePath,
    sourceType: section.sourceType,
    registeredSection: section.registeredSection,
    status: section.status,
    confidence: section.confidence,
  }));
  const captures = (captureManifest.routes ?? []).map((route) => ({
    id: route.id,
    sourcePath: route.sourcePath,
    sourceType: route.sourceType,
    mappingStatus: route.mappingStatus,
    captureStatus: route.captureStatus,
    scenarioCount:
      route.scenarios?.length ??
      (route.states?.length ?? 0) *
        (route.viewports?.length ?? 0) *
        (route.preferences?.length ?? 1),
  }));
  const staleArtifacts = artifactIntegrity.filter((artifact) => artifact.status !== "current");
  const pendingDecisions = decisions.filter((decision) => decision.status === "pending").length;
  const staleDecisions = recordedDecisions.filter(
    (decision) => decision.validity === "stale-source-drift",
  ).length;

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    runId: state.runId,
    scope: "local-only-migration-review",
    productionExposure: false,
    evidenceTrust: "bounded-source-derived-models-only",
    launchAuthority: "none-review-is-not-production-approval",
    source: {
      storeUrl: state.storeUrl,
      stateUpdatedAt: state.updatedAt,
      modelSchemaVersion: model.schemaVersion,
      readinessSchemaVersion: readiness.schemaVersion,
      captureSchemaVersion: captureManifest.schemaVersion,
    },
    summary: {
      readinessStatus: blockers.length
        ? "blocked"
        : requiredReviews.length
          ? "needs-review"
          : "ready-for-reconstruction",
      launchReady: false,
      routeCount: routes.length,
      mappedRoutes: routes.filter((route) => route.status === "mapped").length,
      sectionCount: sections.length,
      blockerCount: blockers.length,
      requiredReviewCount: requiredReviews.length,
      recordedDecisionCount: decisions.length,
      pendingDecisionCount: pendingDecisions,
      staleDecisionCount: staleDecisions,
      staleArtifactCount: staleArtifacts.length,
    },
    stateSignals: {
      stale: {
        status: staleArtifacts.length ? "detected" : "none-detected",
        artifacts: staleArtifacts,
      },
      conflicts: {
        status: "not-evaluated",
        reason: "No generated downstream workspace is attached to this review package.",
      },
      sourceDrift: sourceDrift
        ? {
            status: sourceDrift.status,
            previousSnapshotId: sourceDrift.previousSnapshotId,
            currentSnapshotId: sourceDrift.currentSnapshotId,
            affectedPaths: sourceDrift.affectedPaths,
          }
        : { status: "not-evaluated", affectedPaths: [] },
    },
    blockers,
    requiredReviews,
    recordedDecisions,
    routes,
    sections,
    integrations: model.integrations,
    brand: {
      status: model.brand?.status ?? "not-observed",
      colorCandidates: model.brand?.colors ?? [],
      fontCandidates: model.brand?.fontCandidates ?? [],
      logoReferences: model.brand?.logoReferences ?? [],
      layoutCandidateCount: model.brand?.layoutCandidates?.length ?? 0,
      rules: model.brand?.rules ?? {},
    },
    captures,
    provenance: {
      artifacts: artifactIntegrity,
      rawEvidenceIncluded: false,
      sourceCodeIncluded: false,
      editorialCopyIncluded: false,
    },
    nextActions: readiness.nextActions ?? [],
  };
}

export function renderReviewHtml(report) {
  const statusClass = report.summary.blockerCount ? "blocked" : "review";
  const routeRows = report.routes
    .map(
      (route) =>
        `<tr class="route-${escapeHtml(
          route.status,
        )}"><td><code>${escapeHtml(route.sourcePath)}</code></td><td>${escapeHtml(
          route.sourceType,
        )}</td><td><code>${escapeHtml(route.target)}</code></td><td>${badge(route.status)}</td></tr>`,
    )
    .join("");
  const sectionRows = report.sections
    .map(
      (section) =>
        `<tr><td><code>${escapeHtml(section.sourcePath)}</code></td><td>${escapeHtml(
          section.registeredSection ?? "Unmapped",
        )}</td><td>${badge(section.status)}</td><td>${escapeHtml(section.confidence)}</td></tr>`,
    )
    .join("");
  const artifactRows = report.provenance.artifacts
    .map(
      (artifact) =>
        `<tr><td><code>${escapeHtml(artifact.id)}</code></td><td>${escapeHtml(
          artifact.kind,
        )}</td><td><code>${escapeHtml(artifact.path)}</code></td><td>${badge(
          artifact.status,
        )}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'">
  <title>Migration review · ${escapeHtml(report.runId)}</title>
  <style>${REVIEW_CSS}</style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">Local-only migration review</p>
      <h1>Storefront reconstruction review</h1>
      <p class="lede">A bounded summary of discovered structure, proposed mappings, unresolved work and provenance. It contains no raw page evidence and grants no launch authority.</p>
      <div class="notice ${statusClass}"><strong>${escapeHtml(
        report.summary.readinessStatus,
      )}</strong><span>${report.summary.blockerCount} blockers · ${
        report.summary.requiredReviewCount
      } reviews · ${report.summary.staleArtifactCount} stale artifacts</span></div>
    </header>

    <section aria-labelledby="overview-heading">
      <h2 id="overview-heading">Overview</h2>
      <dl class="metrics">
        ${metric("Routes", report.summary.routeCount)}
        ${metric("Mapped routes", report.summary.mappedRoutes)}
        ${metric("Theme sections", report.summary.sectionCount)}
        ${metric("Recorded decisions", report.summary.recordedDecisionCount)}
      </dl>
      <p><strong>Source:</strong> <code>${escapeHtml(report.source.storeUrl)}</code></p>
      <p><strong>Run:</strong> <code>${escapeHtml(report.runId)}</code></p>
    </section>

    ${issueSection("Blockers", "blockers-heading", report.blockers, "No structural blockers detected.")}
    ${issueSection(
      "Required reviews",
      "reviews-heading",
      report.requiredReviews,
      "No required reviews recorded.",
    )}

    <section aria-labelledby="decisions-heading">
      <h2 id="decisions-heading">Merchant review decisions</h2>
      ${
        report.recordedDecisions.length
          ? `<ul class="stack">${report.recordedDecisions
              .map(
                (decision) =>
                  `<li><div>${badge(decision.status)} <strong>${escapeHtml(
                    decision.id,
                  )}</strong> ${badge(decision.validity)}</div><p>${escapeHtml(
                    decision.summary,
                  )}</p><small>${escapeHtml(
                    decision.recordedAt,
                  )} · review only, not production approval</small></li>`,
              )
              .join("")}</ul>`
          : '<p class="empty">No decisions have been recorded.</p>'
      }
    </section>

    ${routeTableSection(routeRows)}
    ${tableSection(
      "Theme section mappings",
      "sections-heading",
      ["Theme source", "Registered section", "Status", "Confidence"],
      sectionRows,
      "No theme sections were discovered.",
    )}

    <section aria-labelledby="brand-heading">
      <h2 id="brand-heading">Brand observations</h2>
      <p>Status: ${badge(report.brand.status)}. Values are observations, not approved semantic tokens.</p>
      ${compactList("Colour candidates", report.brand.colorCandidates)}
      ${compactList("Font candidates", report.brand.fontCandidates)}
      ${compactList("Logo references", report.brand.logoReferences)}
      <p><strong>Layout candidates:</strong> ${report.brand.layoutCandidateCount}</p>
    </section>

    <section aria-labelledby="capture-heading">
      <h2 id="capture-heading">Capture plan</h2>
      <p>${report.captures.length} routes · ${report.captures.reduce(
        (total, capture) => total + capture.scenarioCount,
        0,
      )} deterministic scenarios. Browser capture remains pending until an approved runner is selected.</p>
    </section>

    ${tableSection(
      "Artifact integrity and provenance",
      "provenance-heading",
      ["Artifact", "Kind", "Run-relative path", "Integrity"],
      artifactRows,
      "No artifacts were recorded.",
    )}

    <section aria-labelledby="state-heading">
      <h2 id="state-heading">Staleness and conflicts</h2>
      <p><strong>Staleness:</strong> ${badge(report.stateSignals.stale.status)}</p>
      <p><strong>Source drift:</strong> ${badge(
        report.stateSignals.sourceDrift.status,
      )} · ${report.stateSignals.sourceDrift.affectedPaths.length} affected paths</p>
      <p><strong>Stale decisions:</strong> ${report.summary.staleDecisionCount}</p>
      <p><strong>Conflicts:</strong> ${badge(report.stateSignals.conflicts.status)} ${escapeHtml(
        report.stateSignals.conflicts.reason,
      )}</p>
    </section>

    <section aria-labelledby="next-heading">
      <h2 id="next-heading">Next actions</h2>
      ${orderedList(report.nextActions, "No next actions were generated.")}
    </section>

    <footer>
      <p>Generated ${escapeHtml(report.generatedAt)}. Local-only, ignored by Git, excluded from production and not a deploy, DNS, cutover or launch approval.</p>
    </footer>
  </main>
</body>
</html>\n`;
}

function enrichIssues(issues = [], nextActions = [], actionOffset = 0) {
  return issues.map((issue, index) => ({
    code: issue.code,
    label: ISSUE_LABELS[issue.code] ?? issue.code,
    count: issue.count,
    action: nextActions[index + actionOffset] ?? "Review and resolve this item downstream.",
    resolutionDecisionId: RESOLVABLE_REVIEW_DECISIONS[issue.code] ?? null,
  }));
}

function issueSection(title, id, issues, empty) {
  return `<section aria-labelledby="${id}"><h2 id="${id}">${escapeHtml(title)}</h2>${
    issues.length
      ? `<ul class="stack">${issues
          .map(
            (issue) =>
              `<li><div><strong>${escapeHtml(issue.label)}</strong> <span class="count">${escapeHtml(
                issue.count,
              )}</span></div><p>${escapeHtml(issue.action)}</p><code>${escapeHtml(
                issue.code,
              )}</code></li>`,
          )
          .join("")}</ul>`
      : `<p class="empty">${escapeHtml(empty)}</p>`
  }</section>`;
}

function tableSection(title, id, headers, rows, empty) {
  return `<section aria-labelledby="${id}"><h2 id="${id}">${escapeHtml(title)}</h2>${
    rows
      ? `<div class="table-wrap"><table><thead><tr>${headers
          .map((header) => `<th scope="col">${escapeHtml(header)}</th>`)
          .join("")}</tr></thead><tbody>${rows}</tbody></table></div>`
      : `<p class="empty">${escapeHtml(empty)}</p>`
  }</section>`;
}

function routeTableSection(rows) {
  if (!rows) {
    return '<section aria-labelledby="routes-heading"><h2 id="routes-heading">Routes</h2><p class="empty">No routes were discovered.</p></section>';
  }
  return `<section aria-labelledby="routes-heading"><h2 id="routes-heading">Routes</h2>
    <div class="filter-set" role="group" aria-label="Filter routes by mapping status">
      <input class="route-filter" type="radio" name="route-filter" id="route-filter-all" checked>
      <label for="route-filter-all">All</label>
      <input class="route-filter" type="radio" name="route-filter" id="route-filter-mapped">
      <label for="route-filter-mapped">Mapped</label>
      <input class="route-filter" type="radio" name="route-filter" id="route-filter-unknown">
      <label for="route-filter-unknown">Unknown</label>
      <div class="table-wrap"><table><thead><tr><th scope="col">Source path</th><th scope="col">Type</th><th scope="col">Foundation target</th><th scope="col">Mapping</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>
  </section>`;
}

function compactList(label, values) {
  return `<div class="compact"><strong>${escapeHtml(label)}:</strong> ${
    values.length
      ? values.map((value) => `<code>${escapeHtml(value)}</code>`).join(" ")
      : '<span class="empty">none observed</span>'
  }</div>`;
}

function orderedList(values, empty) {
  return values.length
    ? `<ol>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ol>`
    : `<p class="empty">${escapeHtml(empty)}</p>`;
}

function metric(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function badge(value) {
  const text = String(value ?? "unknown");
  return `<span class="badge ${escapeHtml(text.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}">${escapeHtml(text)}</span>`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const REVIEW_CSS = `
:root{color-scheme:light;--ink:#17201c;--muted:#59635e;--paper:#f7f5ef;--card:#fff;--line:#d9ddd8;--accent:#176b4d;--warn:#945a00;--bad:#9f2d20}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:64px 0}header{padding:0 0 28px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.75rem;font-weight:800;color:var(--accent)}h1{font-size:clamp(2.3rem,7vw,5.5rem);line-height:.95;letter-spacing:-.055em;max-width:12ch;margin:.2em 0}.lede{max-width:68ch;color:var(--muted);font-size:1.1rem}section{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;margin:16px 0;box-shadow:0 2px 0 rgba(23,32,28,.05)}h2{margin-top:0;font-size:1.2rem}.notice{display:flex;justify-content:space-between;gap:16px;align-items:center;border:1px solid var(--warn);border-left-width:6px;background:#fff8e8;padding:16px;border-radius:10px}.notice.blocked{border-color:var(--bad);background:#fff2ef}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metrics div{border:1px solid var(--line);padding:14px;border-radius:10px}.metrics dt{color:var(--muted);font-size:.8rem}.metrics dd{font-size:1.8rem;font-weight:800;margin:0}.stack{list-style:none;padding:0}.stack li{border-top:1px solid var(--line);padding:14px 0}.stack li:first-child{border:0}.stack p{margin:.35rem 0;color:var(--muted)}.count{display:inline-grid;place-items:center;min-width:1.8rem;border-radius:99px;background:#ecefeb;font-weight:800}.badge{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:.15rem .55rem;font-size:.78rem;font-weight:750;background:#f2f4f2}.badge.mapped,.badge.current,.badge.none-detected{color:var(--accent);border-color:#88b8a4;background:#eaf7f1}.badge.blocked,.badge.failed,.badge.mismatch,.badge.missing{color:var(--bad);border-color:#e5a89e;background:#fff1ef}.badge.needs-review,.badge.pending,.badge.candidate,.badge.not-evaluated{color:var(--warn);border-color:#d8bd86;background:#fff8e8}.filter-set{display:flex;flex-wrap:wrap;gap:7px;align-items:center}.route-filter{position:absolute;inline-size:1px;block-size:1px;clip-path:inset(50%);overflow:hidden}.filter-set label{border:1px solid var(--line);border-radius:99px;padding:.3rem .75rem;font-size:.82rem;font-weight:750;cursor:pointer}.route-filter:focus-visible+label{outline:3px solid #77a8ff;outline-offset:2px}.route-filter:checked+label{color:#fff;background:var(--ink);border-color:var(--ink)}#route-filter-mapped:checked~.table-wrap tbody tr:not(.route-mapped),#route-filter-unknown:checked~.table-wrap tbody tr:not(.route-unknown){display:none}.table-wrap{overflow:auto;flex-basis:100%}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;border-bottom:1px solid var(--line);padding:11px 9px;vertical-align:top}th{color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.05em}code{font:85%/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}.compact{margin:.7rem 0}.compact code{display:inline-block;background:#f0f2ef;border-radius:5px;padding:.12rem .35rem;margin:.1rem}.empty,small,footer{color:var(--muted)}footer{padding:20px 4px;font-size:.85rem}@media(max-width:720px){main{padding:32px 0}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.notice{align-items:flex-start;flex-direction:column}section{padding:18px}}@media(prefers-reduced-motion:no-preference){a,button{transition:none}}`;
