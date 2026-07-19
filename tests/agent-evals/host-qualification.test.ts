import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildMockMigrationPlan } from "../../scripts/agents/mock-host.mjs";
import { verifyQualification } from "../../scripts/agents/qualification.mjs";

describe("agent host qualification", () => {
  it("runs the deterministic PR protocol without privileged authority", async () => {
    const report = await verifyQualification();
    expect(report).toMatchObject({
      ok: true,
      deterministicMock: "passed",
      pendingHosts: ["codex", "claude-code"],
      alphaReady: false,
      authority: "qualification-evidence-only",
    });
    expect(
      buildMockMigrationPlan({
        storeUrl: "<STORE_URL>",
        themeSource: "<THEME_SOURCE>",
        seededSetupFailure: "pnpm-version",
      }).blockedActions,
    ).toEqual(["admin-write", "deploy", "dns", "cutover", "launch"]);
  });

  it("rejects merchant values and secrets in the mock host", () => {
    expect(() =>
      buildMockMigrationPlan({
        storeUrl: "https://merchant.example",
        themeSource: "/merchant/theme",
      }),
    ).toThrow(/placeholders only/);
    expect(() =>
      buildMockMigrationPlan({
        storeUrl: "<STORE_URL>",
        themeSource: "<THEME_SOURCE>",
        note: "Bearer fixture-secret-value",
      }),
    ).toThrow(/Secret-like/);
  });

  it("fails the alpha gate without protected evidence", async () => {
    await expect(verifyQualification({ mode: "alpha" })).rejects.toMatchObject({
      code: "AUTHENTICATED_EVIDENCE_REQUIRED",
    });
  });

  it("accepts exact, current evidence for both required hosts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "agent-qualification-"));
    const now = new Date("2026-07-17T00:00:00.000Z");
    for (const [host, adapterSha256] of [
      ["codex", "6a9e6f8ec1cc07f549297ed0b8dad40e677f38e402aa4a069ada523688f3c7b1"],
      ["claude-code", "1d3070f53db65773eb615c496e844b245b1627d05e4af76b50c12b9efbb76a70"],
    ]) {
      await writeFile(
        join(directory, `${host}.json`),
        JSON.stringify({
          schemaVersion: 1,
          host,
          modelId: `${host}-qualified-2026-07`,
          workflowSha256: "1b06d427909c03c03da468e0451cf3f61347d6127b54166c70a818abc06dccc8",
          skillManifestSha256: "4c668e92096740918cbe94d14626ac37fc59d3f9b657d430f332c5511f256c67",
          adapterSha256,
          testedAt: "2026-07-16T00:00:00.000Z",
          expiresAt: "2026-08-15T00:00:00.000Z",
          authentication: "protected-job-oidc",
          checks: Object.fromEntries(
            [
              "workflow-discovery",
              "seeded-setup-recovery",
              "interrupt-resume",
              "hostile-evidence-containment",
              "merchant-edit-preservation",
              "completion-report",
              "no-privileged-authority",
            ].map((check) => [check, "passed"]),
          ),
          attestation: {
            issuer: "https://token.actions.githubusercontent.com",
            workflowRef:
              "owner/repository/.github/workflows/agent-qualification.yml@refs/heads/main",
            subjectDigest: `sha256:${"a".repeat(64)}`,
          },
        }),
      );
    }
    await expect(
      verifyQualification({ mode: "alpha", evidenceDirectory: directory, now }),
    ).resolves.toMatchObject({ alphaReady: true, pendingHosts: [] });
  });
});
