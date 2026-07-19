import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseQuarantineArguments, stageWorkspace } from "../../../scripts/security/quarantine.mjs";

const policy = {
  limits: { maxFiles: 20, maxTotalBytes: 10_000, maxFileBytes: 5_000 },
  ignoredDirectories: [".git", ".migration", "node_modules"],
  ignoredFiles: ["tsconfig.tsbuildinfo"],
  immutablePaths: ["package.json", "scripts/security"],
};

describe("generated code quarantine", () => {
  it("rejects secret-bearing CLI flags", () => {
    expect(() => parseQuarantineArguments(["--token", "example"])).toThrow(/Secret-bearing flag/);
  });

  it("stages regular files while excluding evidence and dependencies", async () => {
    const { foundation, workspace, destination } = await fixture();
    await writeFile(join(workspace, "app", "page.tsx"), "export default function Page() {}\n");
    await mkdir(join(workspace, ".migration"));
    await writeFile(join(workspace, ".migration", "evidence.json"), "untrusted");
    await mkdir(join(workspace, "node_modules"));
    await writeFile(join(workspace, "node_modules", "package.json"), "{}");

    const summary = await stageWorkspace({ workspace, foundation, destination, policy });

    expect(summary).toMatchObject({ ignored: 2 });
    expect(await readFile(join(destination, "app", "page.tsx"), "utf8")).toContain("Page");
    await expect(readFile(join(destination, ".migration", "evidence.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("fails closed on trust-anchor drift, sensitive files and symbolic links", async () => {
    const drift = await fixture();
    await writeFile(join(drift.workspace, "package.json"), '{"scripts":{"postinstall":"bad"}}');
    await expect(stageWorkspace({ ...drift, policy })).rejects.toMatchObject({
      code: "TRUSTED_INPUT_DRIFT",
    });

    const sensitive = await fixture();
    await writeFile(join(sensitive.workspace, ".env.local"), "SHOPIFY_SECRET=example");
    await expect(stageWorkspace({ ...sensitive, policy })).rejects.toMatchObject({
      code: "SENSITIVE_PATH",
    });

    const linked = await fixture();
    await symlink("package.json", join(linked.workspace, "escape"));
    await expect(stageWorkspace({ ...linked, policy })).rejects.toMatchObject({
      code: "SYMLINK_REJECTED",
    });
  });

  it("requires separate review for privileged patterns introduced by generated code", async () => {
    const generated = await fixture();
    await writeFile(
      join(generated.workspace, "app", "loader.ts"),
      'import { spawn } from "node:child_process";\nspawn("example");\n',
    );

    await expect(stageWorkspace({ ...generated, policy })).rejects.toMatchObject({
      code: "STATIC_REVIEW_REQUIRED",
      details: { findings: [{ path: "app/loader.ts", reason: "subprocess" }] },
    });
  });

  it("keeps the executable container boundary fail-closed", async () => {
    const [source, dockerfile, entrypoint, configured] = await Promise.all([
      readFile("scripts/security/quarantine.mjs", "utf8"),
      readFile("scripts/security/quarantine.Dockerfile", "utf8"),
      readFile("scripts/security/quarantine-entrypoint.sh", "utf8"),
      readFile("config/security/quarantine-policy.json", "utf8").then(JSON.parse),
    ]);

    expect(configured.baseImage).toMatch(/^node:24-.+@sha256:[a-f0-9]{64}$/);
    expect(source).toMatch(/"--network",\s*"none"/);
    for (const control of ["--read-only", "--cap-drop", "no-new-privileges", "--pids-limit"]) {
      expect(source).toContain(control);
    }
    expect(dockerfile).toContain("pnpm install --frozen-lockfile --ignore-scripts");
    expect(dockerfile).toContain("apt-get install --yes --no-install-recommends git");
    expect(configured.runtimeTools).toEqual(["git"]);
    expect(dockerfile).not.toMatch(/COPY\s+\.\s/);
    expect(entrypoint).not.toContain("pnpm check");
    expect(entrypoint).toContain("./node_modules/.bin/next build");
  });
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "quarantine-test-"));
  const foundation = join(root, "foundation");
  const workspace = join(root, "workspace");
  const destination = join(root, "staged");
  for (const path of [foundation, workspace, destination]) await mkdir(path);
  for (const path of [foundation, workspace]) {
    await mkdir(join(path, "scripts", "security"), { recursive: true });
    await mkdir(join(path, "app"));
    await writeFile(join(path, "package.json"), '{"name":"fixture"}\n');
    await writeFile(join(path, "scripts", "security", "verify.mjs"), "export {};\n");
  }
  return { foundation, workspace, destination };
}
