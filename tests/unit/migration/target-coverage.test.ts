import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildTargetCoverage } from "../../../migration/lib/target-coverage.mjs";

describe("foundation target coverage", () => {
  it("binds mapped routes to regular files and explicit hosted handoffs", async () => {
    const root = await mkdtemp(join(tmpdir(), "target-coverage-"));
    await mkdir(join(root, "app", "products", "[handle]"), { recursive: true });
    await writeFile(join(root, "app", "products", "[handle]", "page.tsx"), "export default 1");

    const coverage = await buildTargetCoverage(
      {
        source: {
          publicSnapshotId: "a".repeat(64),
          themeManifestSha256: "b".repeat(64),
        },
        routes: [
          {
            sourcePath: "/products/neutral",
            sourceType: "product",
            target: "app/products/[handle]/page.tsx",
            strategy: "commerce-core",
          },
          {
            sourcePath: "/account",
            sourceType: "account",
            target: "configured-hosted-account",
            strategy: "hosted-handoff",
          },
          {
            sourcePath: "/apps/novel",
            sourceType: "other",
            target: "app/(merchant)/",
            strategy: "downstream-required",
          },
        ],
      },
      root,
    );

    expect(coverage).toMatchObject({
      status: "current",
      summary: { available: 1, hostedHandoffs: 1, downstreamRequired: 1, blockedCount: 0 },
    });
    expect(coverage.routes[0]).toMatchObject({ status: "available" });
    expect(coverage.routes[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("fails readiness evidence for missing, escaping, symlink and unregistered targets", async () => {
    const root = await mkdtemp(join(tmpdir(), "target-coverage-hostile-"));
    const outside = await mkdtemp(join(tmpdir(), "target-coverage-outside-"));
    await writeFile(join(root, "outside.tsx"), "outside");
    await writeFile(join(outside, "page.tsx"), "outside parent");
    await symlink(join(root, "outside.tsx"), join(root, "linked.tsx"));
    await symlink(outside, join(root, "linked-directory"));
    const routes = [
      ["missing.tsx", "commerce-core"],
      ["../escape.tsx", "commerce-core"],
      ["linked.tsx", "commerce-core"],
      ["linked-directory/page.tsx", "commerce-core"],
      ["unknown-handoff", "hosted-handoff"],
    ].map(([target, strategy], index) => ({
      sourcePath: `/route-${index}`,
      sourceType: "page",
      target,
      strategy,
    }));

    const coverage = await buildTargetCoverage({ routes }, root);
    expect(coverage).toMatchObject({
      status: "blocked",
      summary: { missing: 1, invalid: 4, blockedCount: 5 },
    });
  });
});
