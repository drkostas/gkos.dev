import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest config for unit tests.
 *
 * - `happy-dom` gives us `window`, `document`, `localStorage`, and
 *   `CustomEvent` without the heavy jsdom footprint. All engine
 *   systems we need to test (DialogSystem, GameSave, BadgeMilestones,
 *   Settings) only touch these globals.
 * - `src/**` alias matches tsconfig paths so `@/` imports work.
 * - `tests/unit/` is the root — Playwright tests live in `tests/`
 *   (not under /unit) so they're naturally excluded.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts"],
    globals: false,
    // Fresh module state per test file so cached module-level variables
    // (e.g. GameSave.cache) don't bleed between tests.
    isolate: true,
  },
});
