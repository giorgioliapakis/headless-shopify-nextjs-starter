import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const scanner = resolve("scripts/security/repo-scan.mjs");
const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function syntheticRepository(files: Record<string, string>, { track = true } = {}) {
  const workspace = await mkdtemp(resolve(tmpdir(), "repo-scan-test-"));
  workspaces.push(workspace);

  const git = (...args: string[]) => spawnSync("git", args, { cwd: workspace, encoding: "utf8" });
  git("init", "--quiet");

  for (const [name, contents] of Object.entries(files)) {
    await writeFile(resolve(workspace, name), contents);
  }
  if (track) git("add", "--force", ".");

  return workspace;
}

function scan(workspace: string) {
  return spawnSync("node", [scanner], { cwd: workspace, encoding: "utf8" });
}

describe("repository scan", () => {
  it("rejects a tracked secret-bearing file", async () => {
    const secret = ["shpat", "1234567890abcdefghijklmnop"].join("_");
    const workspace = await syntheticRepository({ "leak.txt": `${secret}\n` });

    const result = scan(workspace);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("possible Shopify private token");
  });

  it("rejects a tracked dotenv file but allows .env.example", async () => {
    const workspace = await syntheticRepository({
      ".env.local": "PUBLIC_STORE_DOMAIN=example.myshopify.com\n",
      ".env.example": "PUBLIC_STORE_DOMAIN=your-store.myshopify.com\n",
    });

    const result = scan(workspace);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".env.local: sensitive path must not be tracked");
    expect(result.stderr).not.toContain(".env.example");
  });

  it("ignores untracked working-tree files so local setup never fails the gate", async () => {
    const secret = ["shpat", "1234567890abcdefghijklmnop"].join("_");
    const workspace = await syntheticRepository(
      { ".env.local": `PRIVATE_STOREFRONT_API_TOKEN=${secret}\n` },
      { track: false },
    );

    const result = scan(workspace);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Repository scan passed");
  });

  it("rejects an unreviewed binary asset", async () => {
    const workspace = await syntheticRepository({ "logo.png": "not-really-a-png" });

    const result = scan(workspace);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("binary asset is not in the audited allowlist");
  });
});
