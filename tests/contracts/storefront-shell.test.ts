import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(resolve(path), "utf8");
}

async function missing(path: string) {
  await expect(access(resolve(path))).rejects.toMatchObject({ code: "ENOENT" });
}

describe("navigation is driven by the merchant's Shopify menus", () => {
  it("reads nav and footer links from getMenu with the configured handles", async () => {
    const [nav, footer, config] = await Promise.all([
      source("components/nav/index.tsx"),
      source("components/footer/index.tsx"),
      source("shop.config.ts"),
    ]);

    for (const consumer of [nav, footer]) {
      expect(consumer).toContain("getMenuItems");
      expect(consumer).toContain("shopConfig.navigation.menuHandles");
    }
    expect(nav).toContain("shopConfig.navigation.nav");
    expect(footer).toContain("shopConfig.navigation.footer");
    expect(config).toContain("menuHandles");
  });

  it("keeps the shopify.menus capability pointed at its real consumers", async () => {
    const capabilities = await source("lib/commerce/capabilities.ts");
    expect(capabilities).toContain(
      'core("shopify.menus", ["components/nav/index.tsx", "components/footer/index.tsx"])',
    );
  });
});

describe("cart shell", () => {
  it("mounts exactly one CartProvider, in the root layout, with server initial data", async () => {
    const appFiles: string[] = [];
    async function walk(directory: string) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await walk(path);
        else if (/\.tsx?$/.test(entry.name)) appFiles.push(path);
      }
    }
    await walk(resolve("app"));
    await walk(resolve("components"));

    const providers: string[] = [];
    for (const file of appFiles) {
      const contents = await readFile(file, "utf8");
      if (/<CartProvider\b/.test(contents)) providers.push(file);
    }

    expect(providers.map((path) => path.replace(`${resolve(".")}/`, ""))).toEqual([
      "app/layout.tsx",
    ]);
    // Server snapshots reach the store's consumers inside their own Suspense boundaries, so the
    // root layout never reads `headers()` and every route keeps its static shell.
    expect(await source("components/nav/cart.tsx")).toContain("loadCartEnvelope()");
    expect(await source("components/nav/cart-client.tsx")).toContain("initialQuantity");
    expect(await source("app/layout.tsx")).not.toContain("loadCartEnvelope");
  });

  it("distinguishes a failed cart lookup from an empty cart", async () => {
    const [server, page] = await Promise.all([
      source("lib/shopify/hydrogen/cart-server.ts"),
      source("app/cart/page.tsx"),
    ]);
    expect(server).toContain('status: "unavailable"');
    expect(server).toContain("data.errors?.length");
    expect(page).toContain('result.status === "unavailable"');
    expect(page).toContain("<CartUnavailable");
  });

  it("derives the /cart empty state from the live cart store, not the SSR snapshot", async () => {
    const view = await source("components/cart-page/cart-view.tsx");
    expect(view).toContain("useCart((state) => state.data)");
    expect(view).toContain("<EmptyCart />");
    // The summary may only render for a cart that still has lines.
    expect(view).toContain("<Summary cart={activeCart}");
    expect(await source("components/cart-page/summary.tsx")).toContain("cart: StorefrontCart");
  });

  it("keeps /cart reachable from the header without JavaScript", async () => {
    const [trigger, fallback] = await Promise.all([
      source("components/nav/cart-client.tsx"),
      source("components/nav/cart.tsx"),
    ]);
    expect(trigger).toMatch(/href="\/cart"/);
    expect(fallback).toMatch(/href="\/cart"/);
    expect(trigger).toContain("hasHydrated");
  });

  it("wires window.Shopify.actions.openCart() to the drawer", async () => {
    const drawer = await source("components/cart/drawer-context.tsx");
    expect(drawer).toContain("window.Shopify?.actions?.openCart");
    expect(drawer).toContain("openCart.configure(");
    expect(drawer).toContain("RETRY_TIMEOUT_MS");
  });

  it("scopes cart form ids per instance so the drawer can open on top of /cart", async () => {
    for (const path of ["components/cart/note-form.tsx", "components/cart/discount-form.tsx"]) {
      const contents = await source(path);
      expect(contents).toContain("useId()");
      expect(contents).not.toContain('id="cart-note"');
      expect(contents).toContain("aria-describedby");
      expect(contents).toContain("aria-invalid");
    }
  });

  it("queries and handles in-cart availability", async () => {
    const [handlers, item] = await Promise.all([
      source("lib/shopify/hydrogen/cart-handlers.ts"),
      source("components/cart/overlay-item.tsx"),
    ]);
    expect(handlers).toContain("availableForSale");
    expect(handlers).toContain("quantityAvailable");
    expect(item).toContain("availableForSale === false");
    expect(item).toContain("atQuantityCap");
    expect(item).toMatch(/min=\{1\}/);
    expect(item).toContain("max={quantityAvailable");
  });

  it("reflects add-to-cart pending state instead of disabling unrelated controls", async () => {
    const buy = await source("components/product-detail/buy-buttons.tsx");
    expect(buy).toContain('tCart("adding")');
    expect(buy).toContain('tCart("addedToCart")');
    expect(buy).toContain("aria-busy={pending");
    expect(buy).not.toContain('<fieldset className="grid gap-2" disabled={pending}>');
    expect(buy).toContain('t("quantity")');
    expect(buy).toContain("variants={[{ id: selectedVariant.id, quantity }]}");
  });
});

describe("browse resilience", () => {
  it("recovers from a failed load-more instead of dead-ending", async () => {
    const grid = await source("components/collections/infinite-product-grid.tsx");
    expect(grid).toContain("} catch (error) {");
    expect(grid).toContain("setHasError(true)");
    expect(grid).toContain('tCommon("tryAgain")');
    expect(grid).toContain('aria-live="polite"');
    expect(grid).toContain("useNextPageHref");
  });

  it("serves the crawlable ?after= cursor from the server", async () => {
    const [collections, search] = await Promise.all([
      source("lib/collections/server.ts"),
      source("components/search/results.tsx"),
    ]);
    expect(collections).toContain("parseCursorParam");
    expect(collections).toContain("cursor: after");
    expect(search).toContain("cursor: after");
  });

  it("announces filter and sort result changes", async () => {
    const announcer = await source("components/collections/results-announcer.tsx");
    expect(announcer).toContain('aria-live="polite"');
    for (const path of [
      "components/collections/results-grid.tsx",
      "components/search/results.tsx",
    ]) {
      expect(await source(path)).toContain("<ResultsAnnouncer");
    }
  });
});

describe("route and error coverage", () => {
  it("lists the store's blogs", async () => {
    await expect(access(resolve("app/blogs/page.tsx"))).resolves.toBeUndefined();
    expect(await source("app/blogs/page.tsx")).toContain("getBlogs");
  });

  it("gives every content route an error boundary that surfaces the support digest", async () => {
    const boundaries = [
      "app/error.tsx",
      "app/blogs/error.tsx",
      "app/cart/error.tsx",
      "app/collections/error.tsx",
      "app/collections/[handle]/error.tsx",
      "app/landing/error.tsx",
      "app/pages/error.tsx",
      "app/policies/error.tsx",
      "app/products/[handle]/error.tsx",
      "app/search/error.tsx",
    ];
    for (const path of boundaries) {
      const contents = await source(path);
      expect(contents, path).toContain("<RouteError error={error} reset={reset} />");
    }
    expect(await source("components/error/route-error.tsx")).toContain("error.digest");
    expect(await source("app/global-error.tsx")).toContain("error.digest");
  });

  it("renders the breadcrumb trail that BreadcrumbSchema already claims", async () => {
    for (const path of [
      "components/product-detail/product-detail-section.tsx",
      "components/collections/collection-page.tsx",
    ]) {
      const contents = await source(path);
      expect(contents, path).toContain("<BreadcrumbTrail");
      expect(contents, path).toContain("<BreadcrumbSchema");
    }
  });
});

describe("dead code", () => {
  it("does not ship unreferenced upstream residue", async () => {
    await Promise.all(
      [
        "app/api/draft/route.ts",
        "components/nav/search-client.tsx",
        "components/action-bar/predictive-search-results.tsx",
        "lib/shopify/discovery.ts",
        "components/product/products-slider.tsx",
        "hooks/use-scroll-contain.ts",
        "hooks/use-media-query.ts",
        "hooks/use-controllable-state.ts",
      ].map(missing),
    );
    expect(await source("components/product-detail/product-info.tsx")).not.toContain(
      "ProductInfoHeader",
    );
    expect(await source("components/cart/discount-form.tsx")).not.toContain("locale?: string");
  });
});
