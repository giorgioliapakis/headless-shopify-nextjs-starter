import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { inspectThemeSource } from "../../../migration/lib/theme.mjs";
import { writeStoredZip } from "../../helpers/zip";

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
    expect(first.provenance).toMatchObject({
      kind: "merchant-supplied-directory",
      immutableSourceMatch: "file-manifest-only-no-vcs-commit",
    });
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
    const fixtureRoot = "tests/fixtures/migration/theme";
    const paths = [
      "config/settings_data.json",
      "sections/image-banner.liquid",
      "sections/novel-orbit.liquid",
      "templates/index.json",
    ];
    await writeStoredZip(
      archive,
      await Promise.all(
        paths.map(async (name) => ({ name, data: await readFile(join(fixtureRoot, name)) })),
      ),
    );
    const theme = await inspectThemeSource(archive);
    expect(theme).toMatchObject({
      kind: "zip",
      fileCount: 4,
      requiresArchiveInspection: false,
      inspection: "read-only-lazy-entry-inventory",
      provenance: { immutableSourceMatch: "archive-sha256-and-entry-manifest" },
    });
    const template = theme.files?.find((file) => file.path === "templates/index.json");
    expect(template?.structure?.appBlockTypes).toHaveLength(1);
  });

  it("binds a clean local Git theme to its exact commit without trusting repository config", async () => {
    const root = await createGitTheme();
    const theme = await inspectThemeSource(root);
    const { stdout: commit } = await execFileAsync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
    });

    expect(theme.provenance).toMatchObject({
      kind: "local-git-worktree",
      commit: commit.trim(),
      immutableSourceMatch: "clean-worktree-head-and-file-manifest",
      hooks: "disabled",
      filters: "rejected",
      submodules: "rejected",
      credentialHelpers: "unavailable",
      network: "not-invoked",
    });
  });

  it("rejects dirty, nested and executable-driver Git sources", async () => {
    const dirty = await createGitTheme();
    await writeFile(join(dirty, "sections", "hero.liquid"), "changed");
    await expect(inspectThemeSource(dirty)).rejects.toThrow(/match HEAD exactly/);

    const nested = await createGitTheme();
    await mkdir(join(nested, "sections", "nested", ".git"), { recursive: true });
    await expect(inspectThemeSource(nested)).rejects.toThrow(/nested Git repository/);

    const filtered = await createGitTheme();
    await writeFile(join(filtered, ".gitattributes"), "*.liquid filter=merchant-command\n");
    await expect(inspectThemeSource(filtered)).rejects.toThrow(/executable attribute drivers/);
  });

  it("rejects submodule and worktree-indirection Git metadata", async () => {
    const submodule = await createGitTheme();
    await writeFile(join(submodule, ".gitmodules"), '[submodule "unsafe"]\n');
    await expect(inspectThemeSource(submodule)).rejects.toThrow(/unsupported metadata/);

    const gitlink = await createGitTheme();
    const { stdout: commit } = await execFileAsync("git", ["-C", gitlink, "rev-parse", "HEAD"], {
      encoding: "utf8",
    });
    await execFileAsync("git", [
      "-C",
      gitlink,
      "update-index",
      "--add",
      "--cacheinfo",
      `160000,${commit.trim()},vendor/unsafe`,
    ]);
    await expect(inspectThemeSource(gitlink)).rejects.toThrow(/submodule entry/);

    const indirection = await mkdtemp(join(tmpdir(), "theme-git-indirection-"));
    await mkdir(join(indirection, "sections"));
    await writeFile(join(indirection, "sections", "hero.liquid"), "synthetic");
    await writeFile(join(indirection, ".git"), "gitdir: /tmp/untrusted\n");
    await expect(inspectThemeSource(indirection)).rejects.toThrow(/not a link or indirection file/);
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
    await writeStoredZip(archive, [
      { name: "linked.liquid", data: "target.liquid", unixMode: 0o120777 },
    ]);
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
    const settings = theme.files?.find((file) => file.path === "config/settings_data.json");
    expect(settings?.structure?.observations).toMatchObject({
      colors: ["#336699", "rgb(250, 250, 248)"],
      fonts: ["source_sans_pro_n4", "work_sans_n6"],
      logos: ["shopify://shop_images/synthetic-logo.svg"],
      layout: [
        { key: "current.page_width", value: 1280 },
        { key: "current.buttons_radius", value: "4px" },
      ],
    });
    expect(JSON.stringify(settings?.structure)).not.toContain("editorial copy");
  });
});

async function createGitTheme() {
  const root = await mkdtemp(join(tmpdir(), "theme-git-"));
  await mkdir(join(root, "sections"));
  await writeFile(join(root, "sections", "hero.liquid"), "synthetic theme source");
  await execFileAsync("git", ["init", "--quiet", "--initial-branch=main", root]);
  await execFileAsync("git", ["-C", root, "add", "sections/hero.liquid"]);
  await execFileAsync(
    "git",
    [
      "-C",
      root,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "--no-gpg-sign",
      "-m",
      "fixture",
    ],
    { env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } },
  );
  return root;
}
