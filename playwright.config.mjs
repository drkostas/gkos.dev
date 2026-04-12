import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — two test buckets:
 *
 *   1. Visual regression (existing, `tests/visual-regression.spec.mjs`).
 *      Runs ONLY in the `visual-regression` project. No viewport
 *      override — takes what the individual tests set.
 *
 *   2. Game e2e (`tests/e2e/**`). Runs in THREE viewport projects
 *      so every game-flow test executes on desktop 1440x900, mobile
 *      landscape 852x393, and mobile portrait 393x852. These match
 *      the completion criteria's "three viewport categories".
 *
 * `webServer.reuseExistingServer: true` means tests use whatever dev
 * server is already running (`npm run dev` in another terminal), or
 * spin one up if none is. That's the common ralph-loop local workflow.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://localhost:4321",
    // Accept vite dev-server self-signed SSL and slower HMR responses.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
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

  projects: [
    // ── Visual regression (legacy) ──────────────────────────────
    {
      name: "visual-regression",
      testMatch: "visual-regression.spec.mjs",
    },

    // ── Game e2e across three viewport categories ──────────────
    //
    // All three projects use Desktop Chrome under the hood so we
    // don't require Playwright's WebKit install. Only the viewport
    // differs — that's what matters for the responsive-layout
    // regressions we're guarding against (Birch text oversized,
    // dialog box height, fullscreen button occlusion).
    {
      name: "e2e-desktop-1440",
      testMatch: "e2e/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "e2e-mobile-landscape-852",
      testMatch: "e2e/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 852, height: 393 },
        // Emulate touch so `?touch=1` is still a valid detection
        // signal; also reflects the real device category.
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "e2e-mobile-portrait-393",
      testMatch: "e2e/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 393, height: 852 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
