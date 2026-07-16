import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("release contract", () => {
  it("keeps local release and migration evidence untracked", async () => {
    const ignore = await readFile(".gitignore", "utf8");
    expect(ignore).toContain(".migration/");
    expect(ignore).toContain(".release/");
  });

  it("uses a clean tracked Git archive and emits source/SBOM evidence", async () => {
    const script = await readFile("scripts/release/verify.mjs", "utf8");
    expect(script).toContain('git(["status", "--porcelain"])');
    expect(script).toContain('git(["archive", "--format=tar"');
    expect(script).toContain('"sbom.cdx.json"');
    expect(script).toContain('signature: "unsigned-local-evidence"');
    expect(script).toContain('path !== ".env.example"');
  });

  it("documents every exact lifecycle-script exception", async () => {
    const allowlist = JSON.parse(
      await readFile("config/supply-chain/lifecycle-allowlist.json", "utf8"),
    );
    expect(allowlist.schemaVersion).toBe(1);
    expect(allowlist.packages.length).toBeGreaterThan(0);
    for (const entry of allowlist.packages) {
      expect(entry.name).toBeTruthy();
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(Object.keys(entry.scripts)).not.toHaveLength(0);
      expect(entry.reason.length).toBeGreaterThan(20);
    }
  });

  it("defines fail-closed merchant ownership for downstream updates", async () => {
    const config = JSON.parse(await readFile("config/foundation-update.json", "utf8"));
    expect(config).toMatchObject({ schemaVersion: 1, conflictPolicy: "fail-closed" });
    expect(config.merchantOwned).toContain("config/presets/");
    expect(config.merchantOwned).toContain("public/merchant/");
  });
});
