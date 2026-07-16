import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  captureFoundationIdentity,
  compareFoundationIdentity,
} from "../../../migration/lib/foundation-identity.mjs";
import { createRun, updateState } from "../../../migration/lib/workspace.mjs";

const execFileAsync = promisify(execFile);

describe("migration foundation identity", () => {
  it("detects foundation contract changes without including merchant-owned paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "foundation-identity-"));
    await writeFile(join(root, "package.json"), '{"version":"1.0.0"}\n');
    const first = await captureFoundationIdentity(root);
    await writeFile(join(root, "merchant-note.txt"), "merchant change");
    const merchantOnly = await captureFoundationIdentity(root);
    await writeFile(join(root, "package.json"), '{"version":"1.0.1"}\n');
    const changed = await captureFoundationIdentity(root);

    expect(first.status).toBe("incomplete");
    expect(merchantOnly.sha256).toBe(first.sha256);
    expect(compareFoundationIdentity(first, merchantOnly).status).toBe("incomplete");
    expect(compareFoundationIdentity(first, changed)).toMatchObject({
      status: "changed",
      changedPaths: ["package.json"],
      invalidates: ["reconstruction", "verification", "review"],
    });
  });

  it("invalidates downstream phases for legacy runs with no recorded identity", async () => {
    const root = await mkdtemp(join(tmpdir(), "foundation-legacy-"));
    const current = await captureFoundationIdentity(root);
    expect(compareFoundationIdentity(null, current)).toMatchObject({
      status: "not-recorded",
      invalidates: ["reconstruction", "verification", "review"],
    });
  });

  it("reconciles foundation drift through resume and resets only downstream phases", async () => {
    const root = await mkdtemp(join(tmpdir(), "foundation-resume-"));
    await writeFile(join(root, "package.json"), '{"version":"1.0.0"}\n');
    const run = await createRun({
      cwd: root,
      storeUrl: "https://example.myshopify.com/",
      themeSource: join(root, "theme.zip"),
    });
    const completedAt = "2026-07-17T00:00:00.000Z";
    await updateState(run.runDirectory, run.state, {
      phases: {
        ...run.state.phases,
        preflight: { status: "completed", updatedAt: completedAt },
        "public-snapshot": { status: "completed", updatedAt: completedAt },
        reconstruction: { status: "completed", updatedAt: completedAt },
        verification: { status: "completed", updatedAt: completedAt },
        review: { status: "completed", updatedAt: completedAt },
      },
    });
    await writeFile(join(root, "package.json"), '{"version":"1.0.1"}\n');

    const { stdout } = await execFileAsync(
      process.execPath,
      [resolve("migration/cli.mjs"), "resume", "--json"],
      { cwd: root, encoding: "utf8" },
    );
    const context = JSON.parse(stdout);

    expect(context.foundation).toMatchObject({
      status: "changed",
      changedPaths: ["package.json"],
    });
    expect(context.phases).toMatchObject({
      preflight: "completed",
      "public-snapshot": "completed",
      reconstruction: "pending",
      verification: "pending",
      review: "pending",
      launch: "blocked",
    });
  });
});
