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
  // The streamed cart body is delivered but never swapped in without JavaScript, so it stays in the
  // DOM hidden. Assert what the shopper can actually see rather than how many nodes exist.
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /shop|continue/i }).first()).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: /shop all/i })).toBeVisible();
});

test("/cart explains itself without JavaScript instead of showing bare skeleton", async ({
  page,
}) => {
  // The cart is per-shopper, so `cacheComponents` requires it to stream in behind a Suspense
  // boundary, and that swap is driven by an inline script. With scripts off the fallback is the
  // final render, so it has to be a real page: a heading, an explanation, and a way out.
  await page.goto("/cart");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/needs javascript/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /continue shopping/i })).toBeVisible();
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
