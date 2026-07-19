import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  appendLedger,
  createRun,
  currentRun,
  recordArtifact,
  updateState,
  verifyLedger,
  withWorkspaceLock,
} from "../../../migration/lib/workspace.mjs";

describe("migration workspace", () => {
  it("persists resumable state and relative hashed artifacts", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "migration-state-"));
    const run = await createRun({
      cwd,
      storeUrl: "https://example.com/",
      themeSource: "/tmp/theme",
    });
    const artifact = join(run.runDirectory, "reports", "proof.txt");
    await writeFile(artifact, "proof").catch(async () => {
      const { mkdir } = await import("node:fs/promises");
      await mkdir(join(run.runDirectory, "reports"));
      await writeFile(artifact, "proof");
    });
    const state = await recordArtifact(run.runDirectory, run.state, {
      id: "proof",
      path: artifact,
      kind: "report",
    });
    expect(state.artifacts[0].path).toBe("reports/proof.txt");
    expect(state.revision).toBe(1);
    expect((await currentRun(cwd)).state.runId).toBe(run.state.runId);
  });

  it("redacts secrets from the append-only ledger", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "migration-ledger-"));
    const run = await createRun({
      cwd,
      storeUrl: "https://example.com/",
      themeSource: "/tmp/theme",
    });
    await appendLedger(run.runDirectory, {
      event: "test",
      details: { token: "shpat_visible", message: "Bearer abc.def" },
    });
    const ledger = await readFile(join(run.runDirectory, "ledger.jsonl"), "utf8");
    expect(ledger).not.toContain("shpat_visible");
    expect(ledger).not.toContain("abc.def");
    expect(ledger).toContain("[REDACTED]");
    const entries = verifyLedger(ledger);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({ sequence: 2, previousHash: entries[0].entryHash });
  });

  it("rejects stale state writers and tampered ledger history", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "migration-conflict-"));
    const run = await createRun({
      cwd,
      storeUrl: "https://example.com/",
      themeSource: "/tmp/theme",
    });
    const current = await updateState(run.runDirectory, run.state, { nextActions: ["first"] });
    await expect(
      updateState(run.runDirectory, run.state, { nextActions: ["stale overwrite"] }),
    ).rejects.toThrow(/state conflict/);
    expect(current.revision).toBe(1);

    const ledgerPath = join(run.runDirectory, "ledger.jsonl");
    const ledger = await readFile(ledgerPath, "utf8");
    await writeFile(ledgerPath, ledger.replace("run.created", "run.rewritten"));
    await expect(appendLedger(run.runDirectory, { event: "should-not-append" })).rejects.toThrow(
      /ledger integrity/,
    );
  });

  it("prevents concurrent writers", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "migration-lock-"));
    await withWorkspaceLock(cwd, "outer", async () => {
      await expect(withWorkspaceLock(cwd, "inner", async () => undefined)).rejects.toThrow(
        /locked/,
      );
    });
  });
});
