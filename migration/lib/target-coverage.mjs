import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

const HOSTED_HANDOFFS = new Set(["configured-hosted-account", "shopify-hosted-checkout"]);

export async function buildTargetCoverage(model, root = process.cwd()) {
  const foundationRoot = await realpath(resolve(root));
  const routes = await Promise.all(
    (model.routes ?? []).map((route) => inspectRouteTarget(route, foundationRoot)),
  );
  const blockedCount = routes.filter((route) =>
    ["invalid", "missing"].includes(route.status),
  ).length;
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      publicSnapshotId: model.source?.publicSnapshotId ?? null,
      themeManifestSha256: model.source?.themeManifestSha256 ?? null,
    },
    policy: {
      mappedTargetsMustBeRegularFoundationFiles: true,
      symlinksAllowed: false,
      pathEscapeAllowed: false,
      hostedHandoffsMustBeRegistered: true,
      downstreamTargetsRemainMerchantOwned: true,
    },
    routes,
    summary: {
      routeCount: routes.length,
      available: routes.filter((route) => route.status === "available").length,
      hostedHandoffs: routes.filter((route) => route.status === "hosted-handoff").length,
      downstreamRequired: routes.filter((route) => route.status === "downstream-required").length,
      missing: routes.filter((route) => route.status === "missing").length,
      invalid: routes.filter((route) => route.status === "invalid").length,
      blockedCount,
    },
    status: blockedCount ? "blocked" : "current",
  };
}

async function inspectRouteTarget(route, foundationRoot) {
  const result = {
    sourcePath: route.sourcePath,
    sourceType: route.sourceType,
    target: route.target,
    strategy: route.strategy,
  };
  if (route.strategy === "downstream-required") {
    return { ...result, status: "downstream-required", sha256: null };
  }
  if (route.strategy === "hosted-handoff") {
    return {
      ...result,
      status: HOSTED_HANDOFFS.has(route.target) ? "hosted-handoff" : "invalid",
      sha256: null,
    };
  }
  if (typeof route.target !== "string" || !route.target || route.target.includes("\\")) {
    return { ...result, status: "invalid", sha256: null };
  }
  const absolute = resolve(foundationRoot, route.target);
  if (absolute !== foundationRoot && !absolute.startsWith(`${foundationRoot}${sep}`)) {
    return { ...result, status: "invalid", sha256: null };
  }
  const info = await lstat(absolute).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!info) return { ...result, status: "missing", sha256: null };
  if (info.isSymbolicLink() || !info.isFile()) {
    return { ...result, status: "invalid", sha256: null };
  }
  if ((await realpath(absolute)) !== absolute) {
    return { ...result, status: "invalid", sha256: null };
  }
  const sha256 = createHash("sha256")
    .update(await readFile(absolute))
    .digest("hex");
  return { ...result, status: "available", sha256 };
}
