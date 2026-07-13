import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("platform contract", () => {
  it("pins stable runtime channels and excludes optional preview surfaces", async () => {
    const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
    const dependencies = packageJson.dependencies as Record<string, string>;

    expect(dependencies.next).toBe("16.2.10");
    expect(dependencies.react).toBe("19.2.7");
    expect(dependencies["@base-ui/react"]).toBe("1.6.0");
    expect(dependencies["@shopify/hydrogen"]).toBeUndefined();
    expect(dependencies["@ai-sdk/react"]).toBeUndefined();
    expect(
      Object.values(dependencies).some((version) => /canary|preview|unstable/i.test(version)),
    ).toBe(false);
  });
});
