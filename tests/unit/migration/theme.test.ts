import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { inspectThemeSource } from "../../../migration/lib/theme.mjs";

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

  it("hashes zip files without extracting them", async () => {
    const root = await mkdtemp(join(tmpdir(), "theme-zip-"));
    const archive = join(root, "theme.zip");
    await writeFile(archive, "not executed or extracted");
    await expect(inspectThemeSource(archive)).resolves.toMatchObject({
      kind: "zip",
      requiresArchiveInspection: true,
    });
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
