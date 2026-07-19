import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: ".artifacts/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: ".artifacts/playwright-report", open: "never" }]]
    : "line",
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      testIgnore: /no-javascript\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      testIgnore: /no-javascript\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "chromium-no-javascript",
      testMatch: /no-javascript\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
    },
  ],
  webServer: {
    command: "node scripts/verify/browser-server.mjs",
    // Demo mode is intentionally not production-ready; health only proves the test server started.
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
