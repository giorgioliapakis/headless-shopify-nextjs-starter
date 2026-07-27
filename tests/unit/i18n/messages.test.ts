import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE_ROOTS = ["app", "components", "config", "hooks", "lib"];
/** Referenced through a static option table rather than a literal `t("...")` call. */
const DYNAMIC_NAMESPACES = ["search.sort."];

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return [".ts", ".tsx"].includes(extname(entry.name)) ? Promise.resolve([path]) : [];
    }),
  );
  return nested.flat();
}

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("i18n message inventory", () => {
  it("has no orphaned keys and no dynamic key lookups that would hide one", async () => {
    const files = (await Promise.all(SOURCE_ROOTS.map(sourceFiles))).flat();
    const sources = await Promise.all(files.map((file) => readFile(file, "utf8")));
    const namespaces = new Set<string>();
    const referenced = new Set<string>();

    for (const contents of sources) {
      for (const match of contents.matchAll(
        /(?:useTranslations|getTranslations)(?:<[^>]*>)?\(\s*"([^"]+)"/g,
      )) {
        namespaces.add(match[1]!);
      }
      for (const match of contents.matchAll(/\bt[A-Za-z0-9_]*\(\s*"([^"]+)"/g)) {
        referenced.add(match[1]!);
      }
      // A computed key would make this whole audit unsound. Translator bindings in this repo are
      // named `t` or `tPascalCase`, so a backtick directly after the call parenthesis is the tell.
      expect(contents).not.toMatch(/(?:useTranslations|getTranslations)\(\s*`/);
      expect(contents).not.toMatch(/\bt(?:[A-Z][A-Za-z0-9]*)?\(\s*`/);
    }

    const messages = JSON.parse(await readFile(resolve("lib/i18n/messages/en.json"), "utf8"));
    const orphans = leafKeys(messages).filter((key) => {
      if (DYNAMIC_NAMESPACES.some((prefix) => key.startsWith(prefix))) return false;
      return ![...namespaces, ""].some((namespace) => {
        const prefix = namespace ? `${namespace}.` : "";
        return key.startsWith(prefix) && referenced.has(key.slice(prefix.length));
      });
    });

    expect(orphans).toEqual([]);
  });
});
