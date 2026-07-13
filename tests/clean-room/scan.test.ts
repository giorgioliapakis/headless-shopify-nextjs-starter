import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("clean-room scan", () => {
  it("rejects a secret-bearing file in a synthetic repository", async () => {
    const workspace = await mkdtemp(resolve(tmpdir(), "clean-room-test-"));
    workspaces.push(workspace);
    const syntheticSecret = ["shpat", "1234567890abcdefghijklmnop"].join("_");
    await writeFile(resolve(workspace, "leak.txt"), `${syntheticSecret}\n`);

    const result = spawnSync("node", [resolve("scripts/clean-room/scan.mjs")], {
      cwd: workspace,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("possible Shopify private token");
  });
});
