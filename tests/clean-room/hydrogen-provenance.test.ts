import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const VERSION = "0.0.0-preview-8a708a8-20260708155454";
const INTEGRITY =
  "sha512-JNd3ZRaMvSZLKDBsPqMa1a0zsCBuLtaoedkzyUOyvXq6eTqSAVhClxpig+I6O9EFrY1cRKh9S43AeTqDBJ9fqQ==";

describe("Hydrogen supply-chain contract", () => {
  it("pins the package and lockfile to the ADR-authorized artifact", async () => {
    const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
    const lockfile = await readFile(resolve("pnpm-lock.yaml"), "utf8");
    const provenance = JSON.parse(
      await readFile(resolve("docs/provenance/hydrogen-sdk.json"), "utf8"),
    );
    const installed = JSON.parse(
      await readFile(resolve("node_modules/@shopify/hydrogen/package.json"), "utf8"),
    );

    expect(packageJson.dependencies["@shopify/hydrogen"]).toBe(VERSION);
    expect(lockfile).toContain(`'@shopify/hydrogen@${VERSION}':`);
    expect(lockfile).toContain(`resolution: {integrity: ${INTEGRITY}}`);
    expect(provenance).toMatchObject({
      expires: "2026-10-31",
      integrity: INTEGRITY,
      lifecycleScripts: [],
      license: "MIT",
      version: VERSION,
    });
    expect(installed.dependencies).toEqual(provenance.runtimeDependencies);
    expect(Object.keys(installed.exports).sort()).toEqual([...provenance.exports].sort());
    expect(installed.bin).toEqual(provenance.bin);
    expect(["preinstall", "install", "postinstall"].some((name) => installed.scripts?.[name])).toBe(
      false,
    );
  });

  it("vendors only the expected Shopify skill inventory", async () => {
    const manifest = JSON.parse(await readFile(resolve("agent-workflows/skills.json"), "utf8"));
    const hydrogen = manifest.packages?.find(
      (entry: { package?: string }) => entry.package === "@shopify/hydrogen",
    );

    expect(hydrogen).toBeDefined();
    expect(hydrogen.skills).toHaveLength(14);
    expect(hydrogen.skills.map((skill: { target: string }) => skill.target)).toEqual(
      expect.arrayContaining(["hydrogen-setup", "hydrogen-storefront-client", "hydrogen-routing"]),
    );
  });
});
