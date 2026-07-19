import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  captureQualificationIdentity,
  compareQualificationIdentity,
} from "../../../migration/lib/qualification-identity.mjs";
import { createRun, updateState } from "../../../migration/lib/workspace.mjs";

describe("agent qualification identity", () => {
  it("binds the matrix, workflow, skills and host adapters", async () => {
    const root = await createQualificationFixture();
    const first = await captureQualificationIdentity(root);
    await writeFile(join(root, "merchant-note.txt"), "merchant-owned change");
    expect((await captureQualificationIdentity(root)).sha256).toBe(first.sha256);

    await writeFile(join(root, "AGENTS.md"), "updated adapter");
    const changed = await captureQualificationIdentity(root);
    expect(compareQualificationIdentity(first, changed)).toMatchObject({
      status: "changed",
      changedPaths: ["AGENTS.md"],
      invalidates: ["review"],
    });
  });

  it("selectively resets review through resume while preserving completed runtime work", async () => {
    const root = await createQualificationFixture();
    await writeFile(join(root, "package.json"), '{"version":"1.0.0"}\n');
    const run = await createRun({
      cwd: root,
      storeUrl: "https://example.myshopify.com/",
      themeSource: join(root, "theme.zip"),
    });
    const completedAt = "2026-07-17T00:00:00.000Z";
    await updateState(run.runDirectory, run.state, {
      phases: Object.fromEntries(
        Object.entries(run.state.phases).map(([id, phase]) => [
          id,
          id === "launch" ? phase : { status: "completed", updatedAt: completedAt },
        ]),
      ),
    });
    const matrixPath = join(root, "agent-workflows", "qualification-matrix.json");
    const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
    matrix.hosts[0].status = "awaiting-new-model-evidence";
    await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);

    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [resolve("migration/cli.mjs"), "resume", "--json"],
      { cwd: root, encoding: "utf8" },
    );
    const context = JSON.parse(stdout);
    expect(context.agentQualification).toMatchObject({
      status: "changed",
      changedPaths: ["agent-workflows/qualification-matrix.json"],
      invalidates: ["review"],
    });
    expect(context.phases).toMatchObject({
      preflight: "completed",
      "public-snapshot": "completed",
      reconstruction: "completed",
      verification: "completed",
      review: "pending",
      launch: "blocked",
    });
  });
});

async function createQualificationFixture() {
  const root = await mkdtemp(join(tmpdir(), "qualification-identity-"));
  await mkdir(join(root, "agent-workflows", "canonical"), { recursive: true });
  await writeFile(join(root, "agent-workflows", "canonical", "workflow.md"), "workflow");
  await writeFile(join(root, "agent-workflows", "skills.json"), "{}\n");
  await writeFile(join(root, "AGENTS.md"), "adapter");
  await writeFile(
    join(root, "agent-workflows", "qualification-matrix.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        bindings: {
          workflow: { path: "agent-workflows/canonical/workflow.md" },
          skills: { path: "agent-workflows/skills.json" },
        },
        hosts: [{ id: "codex", adapter: "AGENTS.md", status: "current" }],
      },
      null,
      2,
    )}\n`,
  );
  return root;
}
