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
