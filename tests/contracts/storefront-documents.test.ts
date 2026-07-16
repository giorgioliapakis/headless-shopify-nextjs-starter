import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  COLLECTION_FIELDS_FRAGMENT,
  PRODUCT_FRAGMENT,
  PURCHASABLE_PRODUCT_VARIANT_FRAGMENT,
} from "@/lib/shopify/fragments";

function fragmentNames(document: string): string[] {
  return [...document.matchAll(/\bfragment\s+(\w+)\s+on\b/g)].map((match) => match[1]);
}

describe("Hydrogen Storefront document contract", () => {
  it.each([
    ["product", PRODUCT_FRAGMENT],
    ["purchasable variant", PURCHASABLE_PRODUCT_VARIANT_FRAGMENT],
  ])("composes %s fragments without duplicate definitions", (_name, document) => {
    const names = fragmentNames(document);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it("leaves no legacy raw documents or deprecated product lookup fields", async () => {
    const paths = [
      "lib/shopify/fetch.ts",
      "lib/shopify/fragments.ts",
      "lib/shopify/operations/collections.ts",
      "lib/shopify/operations/menu.ts",
      "lib/shopify/operations/pages.ts",
      "lib/shopify/operations/policies.ts",
      "lib/shopify/operations/products.ts",
      "lib/shopify/operations/search.ts",
      "lib/shopify/operations/sitemap.ts",
    ];
    const sources = await Promise.all(paths.map((path) => readFile(resolve(path), "utf8")));

    expect(sources.join("\n")).not.toContain("`#graphql");
    expect(sources.join("\n")).not.toMatch(/\bproductByHandle\s*\(handle:/);
  });

  it("removes network schema codegen after bundled-schema validation takes ownership", async () => {
    const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));

    expect(packageJson.dependencies["@graphql-codegen/cli"]).toBeUndefined();
    expect(packageJson.dependencies["@shopify/api-codegen-preset"]).toBeUndefined();
    expect(packageJson.devDependencies["gql.tada"]).toBe("1.11.2");
    await expect(access(resolve(".graphqlrc.ts"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(access(resolve("lib/shopify/types/generated"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("keeps Shopify resource IDs required by standard analytics events", () => {
    expect(COLLECTION_FIELDS_FRAGMENT).toMatch(/fragment CollectionFields[\s\S]*\bid\b/);
    expect(PRODUCT_FRAGMENT).toMatch(/fragment ProductFields[\s\S]*\bid\b/);
  });
});
