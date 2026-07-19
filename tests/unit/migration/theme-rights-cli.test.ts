import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  buildThemeRightsInventory,
  buildThemeRightsStatus,
} from "../../../migration/lib/theme-rights.mjs";
import {
  createRun,
  recordArtifact,
  updateState,
  writeJsonAtomic,
} from "../../../migration/lib/workspace.mjs";

const execFileAsync = promisify(execFile);

describe("theme rights CLI", () => {
  it("records one bounded decision and updates the source-bound completion report", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "theme-rights-cli-"));
    const run = await createRun({
      cwd,
      storeUrl: "https://example.myshopify.com/",
      themeSource: join(cwd, "theme.zip"),
    });
    const inventory = buildThemeRightsInventory({
      manifestSha256: "a".repeat(64),
      provenance: { sourceIdentity: "b".repeat(64) },
      files: [{ path: "assets/brand.woff2", sha256: "1".repeat(64) }],
    });
    const inventoryPath = join(run.runDirectory, "reports", "theme-rights-inventory-v1.json");
    const statusPath = join(run.runDirectory, "reports", "theme-rights-status-v1.json");
    await writeJsonAtomic(inventoryPath, inventory);
    await writeJsonAtomic(statusPath, buildThemeRightsStatus(inventory));
    let state = await updateState(run.runDirectory, run.state, {
      phases: {
        ...run.state.phases,
        preflight: { status: "completed", updatedAt: "2026-07-17T00:00:00.000Z" },
      },
    });
    state = await recordArtifact(run.runDirectory, state, {
      id: "theme-rights-inventory",
      path: inventoryPath,
      kind: "report",
    });
    state = await recordArtifact(run.runDirectory, state, {
      id: "theme-rights-status",
      path: statusPath,
      kind: "report",
    });

    const cli = resolve("migration/cli.mjs");
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        cli,
        "rights",
        "--item",
        inventory.items[0].id,
        "--status",
        "approved-downstream",
        "--basis",
        "license-reviewed",
        "--summary",
        "Merchant confirmed the downstream font license",
        "--json",
      ],
      { cwd, encoding: "utf8" },
    );
    const result = JSON.parse(stdout);
    const report = JSON.parse(await readFile(statusPath, "utf8"));

    expect(result).toMatchObject({
      ok: true,
      decision: {
        itemId: inventory.items[0].id,
        status: "approved-downstream",
        basis: "license-reviewed",
        foundationRedistribution: false,
      },
      summary: { complete: true, unresolved: 0, approvedDownstream: 1 },
    });
    expect(report.summary).toMatchObject({ complete: true, unresolved: 0 });
  });

  it("refuses incompatible status/basis pairs", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "theme-rights-invalid-"));
    const run = await createRun({
      cwd,
      storeUrl: "https://example.myshopify.com/",
      themeSource: join(cwd, "theme.zip"),
    });
    const inventory = buildThemeRightsInventory({
      manifestSha256: "a".repeat(64),
      provenance: { sourceIdentity: "b".repeat(64) },
      files: [{ path: "assets/brand.woff2", sha256: "1".repeat(64) }],
    });
    const inventoryPath = join(run.runDirectory, "reports", "theme-rights-inventory-v1.json");
    await writeJsonAtomic(inventoryPath, inventory);
    let state = await updateState(run.runDirectory, run.state, {
      phases: {
        ...run.state.phases,
        preflight: { status: "completed", updatedAt: "2026-07-17T00:00:00.000Z" },
      },
    });
    state = await recordArtifact(run.runDirectory, state, {
      id: "theme-rights-inventory",
      path: inventoryPath,
      kind: "report",
    });
    expect(state.artifacts).toHaveLength(1);

    const cli = resolve("migration/cli.mjs");
    await expect(
      execFileAsync(
        process.execPath,
        [
          cli,
          "rights",
          "--item",
          inventory.items[0].id,
          "--status",
          "excluded",
          "--basis",
          "merchant-owned",
          "--summary",
          "Invalid pair",
          "--json",
        ],
        { cwd, encoding: "utf8" },
      ),
    ).rejects.toMatchObject({ code: 1 });
  });
});
