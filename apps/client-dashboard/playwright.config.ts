import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: {
    // Global expect timeout
    timeout: 10000,
    // Threshold for visual comparisons
    threshold: 0.3,
    toHaveScreenshot: {
      // Make visual tests more stable
      threshold: 0.3,
      animations: "disabled",
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Include E2E tests for Command Center
    {
      name: "command-center-e2e",
      testDir: "./e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 1024 },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 1024 },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 1024 },
      },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
