import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const requiredRoutes = [
  "app/page.tsx",
  "app/products/[handle]/page.tsx",
  "app/collections/page.tsx",
  "app/collections/[handle]/page.tsx",
  "app/collections/all/page.tsx",
  "app/search/page.tsx",
  "app/pages/[handle]/page.tsx",
  "app/blogs/[handle]/page.tsx",
  "app/blogs/[handle]/[article]/page.tsx",
  "app/policies/[handle]/page.tsx",
  "app/cart/page.tsx",
  "app/not-found.tsx",
  "app/robots.ts",
  "app/sitemap.xml/route.ts",
] as const;

async function source(path: string) {
  return readFile(resolve(path), "utf8");
}

describe("Shopper route contract", () => {
  it("keeps every invariant commerce and SEO route present", async () => {
    await expect(Promise.all(requiredRoutes.map((path) => access(resolve(path))))).resolves.toEqual(
      requiredRoutes.map(() => undefined),
    );
  });

  it.each([
    "app/products/[handle]/page.tsx",
    "app/collections/[handle]/page.tsx",
    "app/pages/[handle]/page.tsx",
    "app/blogs/[handle]/page.tsx",
    "app/blogs/[handle]/[article]/page.tsx",
    "app/policies/[handle]/page.tsx",
  ])("keeps missing Shopify resources as hard 404s in %s", async (path) => {
    expect(await source(path)).toMatch(/notFound\(\)/);
  });

  it("keeps canonical metadata on indexable resource routes and cart out of the index", async () => {
    for (const path of [
      "app/products/[handle]/page.tsx",
      "app/collections/[handle]/page.tsx",
      "app/pages/[handle]/page.tsx",
      "app/blogs/[handle]/page.tsx",
      "app/blogs/[handle]/[article]/page.tsx",
      "app/policies/[handle]/page.tsx",
    ]) {
      expect(await source(path)).toContain("buildAlternates");
    }

    const cart = await source("app/cart/page.tsx");
    expect(cart).toMatch(/robots:\s*\{[\s\S]*index:\s*false/);
  });

  it("does not implement a local checkout route", async () => {
    await expect(access(resolve("app/checkout/page.tsx"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("keeps 404 rendering static and gates redirect lookup behind the app route manifest", async () => {
    const [notFound, proxy] = await Promise.all([source("app/not-found.tsx"), source("proxy.ts")]);
    expect(notFound).not.toMatch(/headers\(\)|cookies\(\)|resolveShopifyRedirect/);
    expect(proxy).toContain('route === "redirect-candidate"');
    expect(proxy).toContain("resolveShopifyRedirect");
  });
});
