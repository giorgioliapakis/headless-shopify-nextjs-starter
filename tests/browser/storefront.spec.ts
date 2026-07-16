import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/collections/neutral-collection",
  "/products/neutral-product",
  "/search",
  "/cart",
];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const route of routes) {
  test(`${route} renders semantic, accessible production HTML`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
    await expect(page).toHaveTitle(/.+/);
    expect(await page.locator("h1").count()).toBe(1);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", /^https?:\/\//);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test("security headers and disabled browser-agent surface fail closed", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  const exposed = await page.evaluate(() => {
    const browserNavigator = navigator as Navigator & { modelContext?: unknown };
    return Boolean(browserNavigator.modelContext || Reflect.has(window, "webMCP"));
  });
  expect(exposed).toBe(false);
});

test("core PDP survives blocked third-party browser requests", async ({ page, baseURL }) => {
  const blocked: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(baseURL!).origin) await route.continue();
    else {
      blocked.push(url.origin);
      await route.abort("blockedbyclient");
    }
  });
  const response = await page.goto("/products/neutral-product");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("button", { name: /add to cart/i })).toBeVisible();
  expect(
    [...new Set(blocked)].every((origin) =>
      ["https://shop.app", "https://cdn.shopify.com"].includes(origin),
    ),
  ).toBe(true);
});
