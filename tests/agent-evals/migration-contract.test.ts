import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { MigrationCommandError, formatFailure, parseArguments } from "../../migration/cli.mjs";

describe("agent migration contract", () => {
  it("rejects secret-bearing CLI flags before dispatch", () => {
    expect(() => parseArguments(["doctor", "--storefront-token", "shpat_example"])).toThrow(
      /forbidden/,
    );
    expect(() => parseArguments(["snapshot", "--api-key=value"])).toThrow(/forbidden/);
  });

  it("turns a seeded setup failure into a bounded recovery report", () => {
    const report = formatFailure(
      new MigrationCommandError("PREFLIGHT_FAILED", "Preflight failed: pnpm", {
        checks: [
          {
            id: "pnpm",
            status: "fail",
            expected: "11.5.0",
            observed: "unavailable",
            remediation: "Activate exact pnpm 11.5.0 through Corepack, then rerun the same command",
          },
        ],
      }),
    );
    expect(report).toMatchObject({
      ok: false,
      error: {
        code: "PREFLIGHT_FAILED",
        details: { checks: [{ status: "fail", expected: "11.5.0" }] },
      },
    });
    expect(JSON.stringify(report)).not.toMatch(/token|password|secret/i);
  });

  it("requires an explicit downstream-only theme rights assertion", () => {
    const source = readFile("migration/cli.mjs", "utf8");
    return expect(source).resolves.toContain('"THEME_RIGHTS_REQUIRED"');
  });

  it("binds review decisions to immutable public snapshot identities", async () => {
    const source = await readFile("migration/cli.mjs", "utf8");
    expect(source).toContain("sourceSnapshotId: snapshot.snapshotId");
    expect(source).toContain("stale-source-drift");
  });

  it("publishes every implemented command without granting launch authority", async () => {
    const workflow = await readFile("agent-workflows/canonical/migrate-storefront.md", "utf8");
    for (const command of [
      "doctor",
      "preflight",
      "capability",
      "snapshot",
      "status",
      "review",
      "rights",
      "decision",
      "verify",
      "resume",
    ]) {
      expect(workflow).toContain(`pnpm migrate ${command}`);
    }
    expect(workflow).not.toMatch(/pnpm migrate (?:deploy|launch|cutover)/);
    expect(workflow).toContain("untrusted");
    expect(workflow).toContain("human");
  });

  it("keeps migration schemas versioned", async () => {
    for (const file of [
      "run-state.schema.json",
      "ledger-entry.schema.json",
      "foundation-identity.schema.json",
      "foundation-drift.schema.json",
      "public-snapshot.schema.json",
      "decision.schema.json",
      "decision-validity.schema.json",
      "reconstruction-plan.schema.json",
      "capture-manifest.schema.json",
      "review-package.schema.json",
      "source-drift.schema.json",
      "theme-inventory.schema.json",
      "theme-rights-inventory.schema.json",
      "theme-rights-decision.schema.json",
      "theme-rights-status.schema.json",
    ]) {
      const schema = JSON.parse(await readFile(`migration/schemas/${file}`, "utf8"));
      expect(schema.$schema).toContain("2020-12");
      expect(schema.$id).toContain("v1");
    }
  });

  it("pre-registers bounded compatibility and non-advisable outcomes", async () => {
    const map = JSON.parse(await readFile("agent-workflows/capability-map.json", "utf8"));
    const envelope = await readFile(map.compatibilityEnvelope, "utf8");
    for (const outcome of [
      "compatible",
      "compatible-with-downstream-work",
      "blocked",
      "not-advisable",
    ]) {
      expect(envelope).toContain(`\`${outcome}\``);
    }
    for (const bound of ["5,000", "50 MiB", "500", "250/product", "10/product", "3 levels"]) {
      expect(envelope).toContain(bound);
    }
    expect(envelope).toContain("Technical compatibility is not migration advice");
  });
});
