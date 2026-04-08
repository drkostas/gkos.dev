import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
await ctx.addInitScript(`
  Math.random = () => 0;
  const FIXED_DATE = new Date('2026-04-08T12:00:00Z').getTime();
  const _Date = Date;
  globalThis.Date = class extends _Date {
    constructor(...args) { if (args.length === 0) return new _Date(FIXED_DATE); return new _Date(...args); }
    static now() { return FIXED_DATE; }
  };
  Object.setPrototypeOf(globalThis.Date, _Date);
`);
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

// Scroll to make calendar visible
const cal = await page.locator('text="Book a call with me"').first();
await cal.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const box = await cal.boundingBox();
console.log("Calendar box:", box);
if (box) {
  await page.screenshot({
    path: "tests/braydon-calendar-crop.png",
    clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 20), width: 700, height: 500 },
  });
  console.log("Saved tests/braydon-calendar-crop.png");
}

// Also crop changelog
const cl = await page.locator('text="Changelog"').nth(0);
await cl.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const clBox = await cl.boundingBox();
console.log("Changelog box:", clBox);
if (clBox) {
  await page.screenshot({
    path: "tests/braydon-changelog-crop.png",
    clip: { x: Math.max(0, clBox.x - 40), y: Math.max(0, clBox.y - 260), width: 500, height: 380 },
  });
  console.log("Saved tests/braydon-changelog-crop.png");
}

await browser.close();
