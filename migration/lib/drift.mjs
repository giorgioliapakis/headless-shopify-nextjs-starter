import { createHash } from "node:crypto";

export function attachSnapshotIdentity(snapshot) {
  return { ...snapshot, snapshotId: snapshotIdentity(snapshot) };
}

export function snapshotIdentity(snapshot) {
  const pages = (snapshot.pages ?? [])
    .map((page) => ({
      url: page.url,
      path: page.path,
      type: page.type,
      status: page.status,
      contentType: page.contentType ?? null,
      bytes: page.bytes ?? null,
      bodySha256: page.bodySha256 ?? null,
      title: page.title ?? null,
      description: page.description ?? null,
      headings: page.headings ?? [],
      canonical: page.canonical ?? null,
      robots: page.robots ?? null,
      hreflang: page.hreflang ?? [],
      structuredDataTypes: page.structuredDataTypes ?? [],
      accessState: page.accessState ?? null,
      error: page.error ?? null,
    }))
    .sort((left, right) => left.url.localeCompare(right.url));
  return createHash("sha256")
    .update(
      JSON.stringify({
        schemaVersion: snapshot.schemaVersion,
        source: snapshot.source,
        robots: snapshot.robots,
        sitemap: snapshot.sitemap,
        pages,
      }),
    )
    .digest("hex");
}

export function buildSourceDrift(previous, current) {
  if (!previous) return baselineDrift(current);
  const previousPages = new Map((previous.pages ?? []).map((page) => [page.url, page]));
  const currentPages = new Map((current.pages ?? []).map((page) => [page.url, page]));
  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  for (const [url, page] of currentPages) {
    const before = previousPages.get(url);
    if (!before) added.push(pageSummary(page));
    else {
      const fields = changedFields(before, page);
      if (fields.length) changed.push({ ...pageSummary(page), fields });
      else unchanged.push(page.path);
    }
  }
  for (const [url, page] of previousPages) {
    if (!currentPages.has(url)) removed.push(pageSummary(page));
  }
  const robotsChanged = stableJson(previous.robots) !== stableJson(current.robots);
  const sitemapChanged = stableJson(previous.sitemap) !== stableJson(current.sitemap);
  const sourceChanged = Boolean(
    added.length || removed.length || changed.length || robotsChanged || sitemapChanged,
  );
  return {
    schemaVersion: 1,
    comparedAt: new Date().toISOString(),
    status: sourceChanged ? "changed" : "unchanged",
    previousSnapshotId: previous.snapshotId ?? snapshotIdentity(previous),
    currentSnapshotId: current.snapshotId ?? snapshotIdentity(current),
    robotsChanged,
    sitemapChanged,
    added,
    removed,
    changed,
    unchangedCount: unchanged.length,
    affectedPaths: [...new Set([...added, ...removed, ...changed].map((page) => page.path))].sort(),
    invalidates: sourceChanged ? ["reconstruction", "verification", "review-decisions"] : [],
  };
}

function baselineDrift(current) {
  return {
    schemaVersion: 1,
    comparedAt: new Date().toISOString(),
    status: "baseline",
    previousSnapshotId: null,
    currentSnapshotId: current.snapshotId ?? snapshotIdentity(current),
    robotsChanged: false,
    sitemapChanged: false,
    added: [],
    removed: [],
    changed: [],
    unchangedCount: current.pages?.length ?? 0,
    affectedPaths: [],
    invalidates: [],
  };
}

function changedFields(before, after) {
  const fields = [
    "path",
    "type",
    "status",
    "contentType",
    "bytes",
    "bodySha256",
    "title",
    "description",
    "headings",
    "canonical",
    "robots",
    "hreflang",
    "structuredDataTypes",
    "accessState",
    "error",
  ];
  return fields.filter(
    (field) => stableJson(before[field] ?? null) !== stableJson(after[field] ?? null),
  );
}

function pageSummary(page) {
  return { url: page.url, path: page.path, type: page.type, status: page.status };
}

function stableJson(value) {
  return JSON.stringify(value);
}
