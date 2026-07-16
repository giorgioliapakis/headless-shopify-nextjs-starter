import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { parseArguments } from "../../migration/cli.mjs";

describe("agent migration contract", () => {
  it("rejects secret-bearing CLI flags before dispatch", () => {
    expect(() => parseArguments(["doctor", "--storefront-token", "shpat_example"])).toThrow(
      /forbidden/,
    );
    expect(() => parseArguments(["snapshot", "--api-key=value"])).toThrow(/forbidden/);
  });

  it("publishes every implemented command without granting launch authority", async () => {
    const workflow = await readFile("agent-workflows/canonical/migrate-storefront.md", "utf8");
    for (const command of [
      "doctor",
      "preflight",
      "capability",
      "snapshot",
      "status",
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
      "public-snapshot.schema.json",
      "decision.schema.json",
    ]) {
      const schema = JSON.parse(await readFile(`migration/schemas/${file}`, "utf8"));
      expect(schema.$schema).toContain("2020-12");
      expect(schema.$id).toContain("v1");
    }
  });
});
