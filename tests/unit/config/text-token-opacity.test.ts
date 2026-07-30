import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const componentsDirectory = fileURLToPath(new URL("../../../components", import.meta.url));

/**
 * Opacity-modified text tokens such as `text-foreground/50` bypass the theme contract: the palette
 * validator in `config/schema/theme.ts` proves `foreground` and `muted-foreground` hold WCAG AA on
 * their surfaces, but an arbitrary alpha knocks that guarantee out (dark-mode prose shipped at
 * 1.1–1.9:1 this way). Secondary copy must use the semantic token that already encodes the muted
 * treatment — `text-muted-foreground` — so the contrast validator keeps covering it.
 *
 * State-variant styling (`hover:`, `disabled:`, `group-hover:` …) is exempt: the base state carries
 * the accessible colour, and disabled states are exempt from WCAG contrast requirements.
 */
const OPACITY_MODIFIED_TEXT_TOKEN =
  /(^|[^:\w-])(text-(?:foreground|muted-foreground|primary|secondary-foreground|card-foreground)\/\d+)/g;

/**
 * Deliberate exceptions, one entry per file/class pair, each with a reason. Add here only when the
 * opacity is intentional styling for a non-interactive or disabled treatment, never for regular
 * secondary copy.
 */
const ALLOWLIST: readonly { file: string; token: string; reason: string }[] = [
  {
    file: "product-detail/option-picker.tsx",
    token: "text-muted-foreground/50",
    // Option values that do not exist in the variant matrix render as non-interactive, dashed,
    // `cursor-not-allowed` pills — a disabled treatment, which WCAG exempts from contrast minimums.
    reason: "disabled styling for nonexistent variant combinations",
  },
];

function collectComponentFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectComponentFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(entryPath);
    }
  }
  return files;
}

describe("text token opacity guard", () => {
  const files = collectComponentFiles(componentsDirectory);

  it("finds the component tree it is guarding", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("keeps text colour tokens un-diluted so the theme contrast contract stays true", () => {
    const violations: string[] = [];

    for (const file of files) {
      const relative = path.relative(componentsDirectory, file);
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        for (const match of line.matchAll(OPACITY_MODIFIED_TEXT_TOKEN)) {
          const token = match[2] as string;
          const allowed = ALLOWLIST.some(
            (entry) => entry.file === relative && entry.token === token,
          );
          if (!allowed) {
            violations.push(`components/${relative}:${index + 1} uses \`${token}\``);
          }
        }
      });
    }

    expect(
      violations,
      [
        "Opacity-modified text tokens escape the theme contrast validator. Use the semantic token",
        "instead (secondary copy: `text-muted-foreground`; primary copy: `text-foreground`), or —",
        "for a deliberate disabled/non-interactive treatment — add a commented entry to the",
        "ALLOWLIST in tests/unit/config/text-token-opacity.test.ts.",
        ...violations,
      ].join("\n"),
    ).toEqual([]);
  });

  it("keeps the allowlist honest: every entry must still exist in its file", () => {
    for (const entry of ALLOWLIST) {
      const source = readFileSync(path.join(componentsDirectory, entry.file), "utf8");
      expect(source, `${entry.file} no longer contains ${entry.token}`).toContain(entry.token);
    }
  });
});
