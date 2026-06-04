import { test, expect } from "@playwright/test";

test("hero image opens lightbox", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:4321/blog/how-i-got-here");
  const hero = page.locator("img.blog-hero-img").first();
  await hero.scrollIntoViewIfNeeded();
  await hero.click();

  const overlay = page.locator("#img-lightbox");
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveClass(/open/);

  await page.waitForTimeout(400);
  const info = await page.locator("#img-lightbox .lightbox-img").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { cx: Math.round(r.left + r.width / 2), vw: window.innerWidth };
  });
  expect(Math.abs(info.cx - info.vw / 2)).toBeLessThanOrEqual(2);
  await page.keyboard.press("Escape");
});

test("click image opens lightbox, Esc closes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:4321/blog/how-i-got-here");
  await page.waitForSelector(".prose img");

  const img = page.locator('.prose img[src*="amazon-chalkboard"]').first();
  await img.scrollIntoViewIfNeeded();
  const originalH = await img.evaluate((el) => (el as HTMLImageElement).getBoundingClientRect().height);
  await img.click();

  const overlay = page.locator("#img-lightbox");
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveClass(/open/);

  // Wait for the 320ms animation to settle
  await page.waitForTimeout(400);
  const info = await page.locator("#img-lightbox .lightbox-img").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      cx: Math.round(r.left + r.width / 2),
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
  // Image center should match viewport center (within 2px)
  expect(Math.abs(info.cx - info.vw / 2)).toBeLessThanOrEqual(2);
  // Image should have grown significantly from its original rendered size
  expect(info.h).toBeGreaterThan(originalH * 1.5);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await expect(overlay).toBeHidden();
});
