import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(resolve(path), "utf8");
}

describe("Hydrogen cart UI contract", () => {
  it("derives one typed React binding from the server handlers", async () => {
    const binding = await source("components/cart/hydrogen.ts");
    expect(binding).toContain("createCartComponents<typeof hydrogenCartHandlers>()");
    expect(binding).toContain("useCartForm");
  });

  it("loads Shopify Standard Actions once with WebMCP disabled", async () => {
    const [layout, runtime] = await Promise.all([
      source("app/layout.tsx"),
      source("components/shopify/runtime.tsx"),
    ]);
    expect(layout.match(/<ShopifyRuntime/g)).toHaveLength(1);
    expect(runtime).toContain("<ShopifyScripts");
    expect(runtime).toContain("webMcp={false}");
    expect(runtime).toContain("routes={shopifyRouteTemplates}");
  });

  it("uses Hydrogen forms and server-provided money on every cart surface", async () => {
    const paths = [
      "components/cart/discount-form.tsx",
      "components/cart/overlay-item.tsx",
      "components/cart/overlay-summary.tsx",
      "components/cart-page/summary.tsx",
      "components/product-detail/buy-buttons.tsx",
    ];
    const sources = await Promise.all(paths.map(source));
    expect(sources.join("\n")).toContain("useCartForm");
    expect(sources.join("\n")).not.toMatch(/parseFloat\(|Number\([^)]*amount/);
    expect(sources.join("\n")).toContain("formatPrice(cart.cost.totalAmount, locale)");
    expect(sources.join("\n")).toContain("<ShopPayButton");
  });

  it("has no second app-owned browser cart store", async () => {
    await expect(access(resolve("components/cart/context.tsx"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(access(resolve("components/cart/context-sync.tsx"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
