import { test } from "@playwright/test";

const URL = "http://localhost:4321/changelog";

for (const [label, width, height] of [
  ["1440", 1440, 900],
  ["720", 720, 900],
  ["390", 390, 844],
] as const) {
  test(`changelog ${label}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(URL);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `.playwright-mcp/changelog-review-${label}.png`,
      fullPage: false,
    });
  });
}
