import { createHash } from "node:crypto";
import { extname } from "node:path";

const FILE_CATEGORIES = new Map([
  [".woff", "font-file"],
  [".woff2", "font-file"],
  [".ttf", "font-file"],
  [".otf", "font-file"],
  [".eot", "font-file"],
  [".avif", "media-file"],
  [".gif", "media-file"],
  [".jpg", "media-file"],
  [".jpeg", "media-file"],
  [".png", "media-file"],
  [".svg", "media-file"],
  [".webp", "media-file"],
  [".mp4", "media-file"],
  [".webm", "media-file"],
  [".js", "client-script-file"],
  [".mjs", "client-script-file"],
]);

export function buildThemeRightsInventory(theme) {
  const candidates = [];
  for (const file of theme.files ?? []) {
    const category = FILE_CATEGORIES.get(extname(file.path).toLowerCase());
    if (category) {
      candidates.push({
        category,
        reference: file.path,
        sourcePath: file.path,
        contentSha256: file.sha256,
        observation: "theme-file",
      });
    }
    const structure = file.structure ?? {};
    for (const appBlock of structure.appBlockTypes ?? []) {
      candidates.push({
        category: "app-block-output-reference",
        reference: appBlock,
        sourcePath: file.path,
        contentSha256: null,
        observation: "theme-json-structure",
      });
    }
    for (const font of structure.observations?.fonts ?? []) {
      candidates.push({
        category: "font-setting-reference",
        reference: font,
        sourcePath: file.path,
        contentSha256: null,
        observation: "bounded-theme-setting",
      });
    }
    for (const logo of structure.observations?.logos ?? []) {
      candidates.push({
        category: "media-setting-reference",
        reference: logo,
        sourcePath: file.path,
        contentSha256: null,
        observation: "bounded-theme-setting",
      });
    }
  }

  const items = deduplicate(candidates).map((candidate) => ({
    id: stableId(candidate),
    ...candidate,
    rightsStatus: "requires-merchant-license-review",
    downstreamUse: "not-determined",
    foundationRedistribution: false,
    copyAuthority: "none-from-automated-inspection",
  }));
  const categories = Object.fromEntries(
    [...new Set(items.map((item) => item.category))]
      .sort()
      .map((category) => [category, items.filter((item) => item.category === category).length]),
  );

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    themeSourceIdentity: theme.provenance?.sourceIdentity ?? theme.manifestSha256,
    themeManifestSha256: theme.manifestSha256,
    sourceRightsAssertion: {
      asserted: true,
      scope: "downstream-migration-source-inspection",
      grantsPerAssetRedistribution: false,
    },
    requiredDecisionId: items.length ? "theme-asset-rights-review" : null,
    items,
    summary: {
      itemCount: items.length,
      requiringReview: items.length,
      approvedForFoundationRedistribution: 0,
      categories,
    },
    policy: {
      rawAssetsIncluded: false,
      automaticCopyAllowed: false,
      foundationRedistributionAllowed: false,
      resolution:
        "Merchant reviews ownership, license, app terms and downstream use for every item before copying it.",
    },
  };
}

export function buildThemeRightsStatus(inventory, decisions = []) {
  const current = new Map(
    decisions
      .filter(
        (decision) =>
          decision.themeSourceIdentity === inventory.themeSourceIdentity &&
          decision.themeManifestSha256 === inventory.themeManifestSha256 &&
          validRightsOutcome(decision),
      )
      .map((decision) => [decision.itemId, decision]),
  );
  const items = inventory.items.map((item) => {
    const decision = current.get(item.id);
    return {
      id: item.id,
      category: item.category,
      status: decision?.status ?? "unresolved",
      basis: decision?.basis ?? null,
      decidedAt: decision?.recordedAt ?? null,
    };
  });
  const unresolved = items.filter((item) => item.status === "unresolved").length;
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    themeSourceIdentity: inventory.themeSourceIdentity,
    themeManifestSha256: inventory.themeManifestSha256,
    authority: "downstream-asset-use-review-only",
    foundationRedistribution: false,
    items,
    summary: {
      itemCount: items.length,
      unresolved,
      approvedDownstream: items.filter((item) => item.status === "approved-downstream").length,
      excluded: items.filter((item) => item.status === "excluded").length,
      complete: unresolved === 0,
    },
  };
}

function validRightsOutcome(decision) {
  if (decision.status === "excluded") return decision.basis === "excluded-from-migration";
  return (
    decision.status === "approved-downstream" &&
    ["merchant-owned", "license-reviewed", "app-terms-reviewed"].includes(decision.basis)
  );
}

function deduplicate(candidates) {
  const unique = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.category}\0${candidate.reference}\0${candidate.sourcePath}`;
    if (!unique.has(key)) unique.set(key, candidate);
  }
  return [...unique.values()].sort(
    (left, right) =>
      left.category.localeCompare(right.category) ||
      left.reference.localeCompare(right.reference) ||
      left.sourcePath.localeCompare(right.sourcePath),
  );
}

function stableId(candidate) {
  const digest = createHash("sha256")
    .update(`${candidate.category}\0${candidate.reference}\0${candidate.sourcePath}`)
    .digest("hex")
    .slice(0, 16);
  return `${candidate.category}-${digest}`;
}
