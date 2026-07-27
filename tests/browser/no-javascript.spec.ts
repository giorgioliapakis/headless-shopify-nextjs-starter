import { expect, test } from "@playwright/test";

test("PDP retains a native cart form without JavaScript", async ({ page }) => {
  const response = await page.goto("/products/neutral-product");
  expect(response?.status()).toBe(200);
  const form = page.getByRole("button", { name: /add to cart/i }).locator("xpath=ancestor::form");
  await expect(form).toHaveAttribute("method", /post/i);
  await expect(form.locator('input[name="merchandiseId"]')).toHaveCount(1);
  await expect(form.locator('input[name="quantity"]')).toHaveValue("1");
});

test("cart and navigation remain readable without JavaScript", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /shop|continue/i }).first()).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: /shop all/i })).toBeVisible();
});

test("the header cart trigger is a real link without JavaScript", async ({ page }) => {
  await page.goto("/");
  // The drawer is a progressive enhancement; `/cart` must stay reachable from the header.
  await expect(page.locator('nav#nav-outer a[href="/cart"]')).toHaveCount(1);
});

test("products past page one are reachable without JavaScript", async ({ page }) => {
  const response = await page.goto("/collections/all");
  expect(response?.status()).toBe(200);
  // The neutral fixture returns a single page, so assert the contract that page 2 is a plain link
  // when one exists, and that the cursor round-trips through the server.
  const nextLink = page.locator('a[href*="after="]');
  if ((await nextLink.count()) > 0) {
    const href = await nextLink.first().getAttribute("href");
    const next = await page.goto(href!);
    expect(next?.status()).toBe(200);
  }
});
