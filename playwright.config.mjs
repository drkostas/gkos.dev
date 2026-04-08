import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "visual-regression.spec.mjs",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://localhost:4321",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 0,
    },
  },
  webServer: {
    command: "npm run dev",
    port: 4321,
    reuseExistingServer: true,
  },
});
