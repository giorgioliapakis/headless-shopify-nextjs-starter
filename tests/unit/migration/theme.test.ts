import { execFile } from "node:child_process";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { inspectThemeSource } from "../../../migration/lib/theme.mjs";

const execFileAsync = promisify(execFile);

describe("theme source inventory", () => {
  it("creates a deterministic read-only inventory", async () => {
    const root = await mkdtemp(join(tmpdir(), "theme-inventory-"));
    await mkdir(join(root, "sections"));
    await writeFile(join(root, "sections", "hero.liquid"), "<h1>Hello</h1>");
    const first = await inspectThemeSource(root);
    const second = await inspectThemeSource(root);
    expect(first).toMatchObject({
      kind: "directory",
      fileCount: 1,
      requiresArchiveInspection: false,
    });
    expect(first.manifestSha256).toBe(second.manifestSha256);
    expect(first.files?.[0].path).toBe("sections/hero.liquid");
  });

  it("rejects symlinks and enforced size bounds", async () => {
    const root = await mkdtemp(join(tmpdir(), "theme-boundary-"));
    await writeFile(join(root, "outside"), "outside");
    await symlink(join(root, "outside"), join(root, "linked"));
    await expect(inspectThemeSource(root)).rejects.toThrow(/symbolic link/);
    const clean = await mkdtemp(join(tmpdir(), "theme-size-"));
    await writeFile(join(clean, "large.liquid"), "12345");
    await expect(inspectThemeSource(clean, { maxBytes: 4 })).rejects.toThrow(/byte limit/);
  });

  it("lazily inventories zip files without extracting them", async () => {
    const root = await mkdtemp(join(tmpdir(), "theme-zip-"));
    const archive = join(root, "theme.zip");
    await execFileAsync("zip", ["-q", "-r", archive, "sections", "templates"], {
      cwd: "tests/fixtures/migration/theme",
    });
    const theme = await inspectThemeSource(archive);
    expect(theme).toMatchObject({
      kind: "zip",
      fileCount: 3,
      requiresArchiveInspection: false,
      inspection: "read-only-lazy-entry-inventory",
    });
    const template = theme.files?.find((file) => file.path === "templates/index.json");
    expect(template?.structure?.appBlockTypes).toHaveLength(1);
  });

  it("rejects malformed and symlink-bearing archives", async () => {
    const malformedRoot = await mkdtemp(join(tmpdir(), "theme-malformed-"));
    const malformed = join(malformedRoot, "theme.zip");
    await writeFile(malformed, "not a zip archive");
    await expect(inspectThemeSource(malformed)).rejects.toThrow();

    const root = await mkdtemp(join(tmpdir(), "theme-zip-link-"));
    await writeFile(join(root, "target.liquid"), "synthetic");
    await symlink("target.liquid", join(root, "linked.liquid"));
    const archive = join(root, "linked.zip");
    await execFileAsync("zip", ["-q", "-y", archive, "linked.liquid"], { cwd: root });
    await expect(inspectThemeSource(archive)).rejects.toThrow(/symbolic link/);
  });

  it("extracts bounded JSON structure as data without executing theme code", async () => {
    const theme = await inspectThemeSource("tests/fixtures/migration/theme");
    const template = theme.files?.find((file) => file.path === "templates/index.json");
    expect(template?.structure).toMatchObject({
      parseStatus: "parsed-data-only",
      sectionTypes: ["image-banner"],
    });
    expect(template?.structure?.appBlockTypes[0]).toContain("shopify://apps/synthetic-provider/");
  });
});
