import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { classifyShopifyProxyRoute } from "@/lib/shopify/routing/policy";

const appDirectory = fileURLToPath(new URL("../../../app", import.meta.url));

/**
 * Route segments that are deliberately left out of the application manifest so
 * a merchant-configured Shopify URL redirect can claim them. Empty today: every
 * route under `app/` is a live page, and the repo policy is that known
 * application routes take only the local header path. Add a segment here only
 * with a comment explaining why a Shopify redirect should shadow it.
 */
const REDIRECT_ELIGIBLE_SEGMENTS: readonly string[] = [];

function isRouteDirectory(name: string): boolean {
  // Route groups `(group)` and private folders `_internal` do not create URL
  // segments, so they cannot collide with Shopify URL redirects.
  return !name.startsWith("(") && !name.startsWith("_");
}

function toSampleSegment(segment: string): string {
  // Dynamic segments such as `[handle]` or `[...slug]` match any value.
  return segment.startsWith("[") ? "example" : segment;
}

/** URL paths for every `route.ts` under `app/api` (e.g. `/api/health`). */
function collectApiRoutePaths(directory: string, urlPath: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && isRouteDirectory(entry.name)) {
      paths.push(
        ...collectApiRoutePaths(
          path.join(directory, entry.name),
          `${urlPath}/${toSampleSegment(entry.name)}`,
        ),
      );
    } else if (entry.isFile() && /^route\.(?:ts|tsx|dev\.ts)$/.test(entry.name)) {
      paths.push(urlPath);
    }
  }
  return paths;
}

describe("application route manifest", () => {
  const topLevelSegments = readdirSync(appDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isRouteDirectory(entry.name))
    .map((entry) => entry.name);

  it("covers every user-facing route segment under app/ (staleness guard)", () => {
    for (const segment of topLevelSegments) {
      if (REDIRECT_ELIGIBLE_SEGMENTS.includes(segment)) continue;
      const samplePaths =
        segment === "api"
          ? collectApiRoutePaths(path.join(appDirectory, "api"), "/api")
          : [`/${segment}`, `/${segment}/${toSampleSegment("[handle]")}`];
      for (const pathname of samplePaths) {
        // "next" means the request stays on the local application path and no
        // Storefront redirect lookup can shadow the live page.
        expect(classifyShopifyProxyRoute(pathname), pathname).toBe("next");
      }
    }
  });

  it("keeps the allowlist honest: listed segments must actually be redirect-eligible", () => {
    for (const segment of REDIRECT_ELIGIBLE_SEGMENTS) {
      expect(topLevelSegments, segment).toContain(segment);
      expect(classifyShopifyProxyRoute(`/${segment}`), segment).toBe("redirect-candidate");
    }
  });

  it.each(["/landing/summer", "/styleguide", "/demo-checkout", "/demo-image/foo.png"])(
    "classifies %s as an application route with no redirect lookup",
    (pathname) => {
      expect(classifyShopifyProxyRoute(pathname)).toBe("next");
    },
  );
});
