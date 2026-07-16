import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  buildReviewManifest,
  escapeHtml,
  renderReviewHtml,
} from "../../../migration/lib/review-package.mjs";
import {
  createRun,
  recordArtifact,
  updateState,
  writeJsonAtomic,
} from "../../../migration/lib/workspace.mjs";

const execFileAsync = promisify(execFile);

const state = {
  runId: "2026-07-17-example",
  storeUrl: "https://example.myshopify.com/",
  updatedAt: "2026-07-17T00:00:00.000Z",
};

const model = {
  schemaVersion: 1,
  routes: [
    {
      sourcePath: "/products/<unsafe>",
      sourceType: "product",
      target: "app/products/[handle]/page.tsx",
      strategy: "commerce-core",
      status: "mapped",
    },
  ],
  theme: {
    sections: [
      {
        sourcePath: "sections/image-banner.liquid",
        sourceType: "image-banner",
        registeredSection: "hero",
        status: "candidate",
        confidence: "heuristic",
      },
    ],
  },
  integrations: { appBlocks: [], status: "not-observed", action: null },
  brand: {
    status: "observed-unmapped",
    colors: ["#fff"],
    fontCandidates: ["body_font"],
    logoReferences: ["<img onerror=alert(1)>"],
    layoutCandidates: [],
    rules: { valuesRequireVisualReview: true },
  },
};

const readiness = {
  schemaVersion: 1,
  status: "needs-review",
  blockers: [],
  decisions: [{ code: "REVIEW_HEURISTIC_SECTION_MAPPINGS", count: 1 }],
  nextActions: ["Review every mapping"],
};

const captureManifest = {
  schemaVersion: 1,
  routes: [
    {
      id: "product-1",
      sourcePath: "/products/example",
      sourceType: "product",
      mappingStatus: "mapped",
      captureStatus: "pending",
      states: ["default", "variant-selected"],
      viewports: [{ id: "mobile" }, { id: "desktop" }],
      preferences: [{ reducedMotion: false }, { reducedMotion: true }],
    },
  ],
};

describe("local migration review package", () => {
  it("summarizes bounded models and integrity without claiming launch readiness", () => {
    const report = buildReviewManifest({
      state,
      model,
      readiness,
      captureManifest,
      decisions: [],
      artifactIntegrity: [{ id: "model", kind: "model", path: "model.json", status: "mismatch" }],
    });

    expect(report).toMatchObject({
      scope: "local-only-migration-review",
      productionExposure: false,
      launchAuthority: "none-review-is-not-production-approval",
      summary: { launchReady: false, staleArtifactCount: 1 },
      stateSignals: { stale: { status: "detected" } },
      provenance: { rawEvidenceIncluded: false, editorialCopyIncluded: false },
    });
    expect(report.captures[0].scenarioCount).toBe(8);
  });

  it("renders a script-free, CSP-locked and HTML-escaped report", () => {
    const report = buildReviewManifest({
      state,
      model,
      readiness,
      captureManifest,
      decisions: [
        {
          id: "brand-review",
          status: "pending",
          summary: "Check <script>alert(1)</script>",
          recordedAt: "2026-07-17T00:00:00.000Z",
        },
      ],
      artifactIntegrity: [],
    });
    const html = renderReviewHtml(report);

    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("default-src 'none'");
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;img onerror=alert(1)&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("not a deploy, DNS, cutover or launch approval");
  });

  it("escapes every HTML metacharacter", () => {
    expect(escapeHtml(`<a title="x">'&`)).toBe("&lt;a title=&quot;x&quot;&gt;&#39;&amp;");
  });

  it("generates ignored review artifacts through the public CLI command", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "migration-review-"));
    const run = await createRun({
      cwd,
      storeUrl: state.storeUrl,
      themeSource: join(cwd, "theme.zip"),
    });
    let runState = await updateState(run.runDirectory, run.state, {
      phases: {
        ...run.state.phases,
        preflight: { status: "completed", updatedAt: state.updatedAt },
      },
    });
    const inputs = [
      ["model/reconstruction-plan-v1.json", model, "reconstruction-plan", "model"],
      ["reports/reconstruction-readiness-v1.json", readiness, "reconstruction-readiness", "report"],
      ["model/capture-manifest-v1.json", captureManifest, "capture-manifest", "model"],
    ] as const;
    for (const [relativePath, value, id, kind] of inputs) {
      const path = join(run.runDirectory, relativePath);
      await writeJsonAtomic(path, value);
      runState = await recordArtifact(run.runDirectory, runState, { id, kind, path });
    }
    runState = await updateState(run.runDirectory, runState, {
      artifacts: [
        ...runState.artifacts,
        {
          id: "tampered-path",
          kind: "model",
          path: "../../outside-run.json",
          sha256: "0".repeat(64),
          recordedAt: state.updatedAt,
        },
      ],
    });

    const cli = resolve("migration/cli.mjs");
    const { stdout } = await execFileAsync(process.execPath, [cli, "review", "--json"], {
      cwd,
      encoding: "utf8",
    });
    const result = JSON.parse(stdout);
    const html = await readFile(join(run.runDirectory, result.report), "utf8");

    expect(result).toMatchObject({
      ok: true,
      summary: {
        launchReady: false,
        readinessStatus: "needs-review",
        staleArtifactCount: 1,
      },
      report: "review/index.html",
    });
    expect(html).toContain("Filter routes by mapping status");
    expect(html).not.toMatch(/<script\b/i);
  });
});
