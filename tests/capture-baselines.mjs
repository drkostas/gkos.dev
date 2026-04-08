import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE_URL = process.argv[2] || "http://localhost:3000";
const OUTPUT_DIR = process.argv[3] || "tests/baselines";

const PAGES = [
  { name: "home", path: "/" },
  { name: "about", path: "/about" },
  { name: "blog", path: "/blog" },
  { name: "projects", path: "/projects" },
  { name: "toolbox", path: "/toolbox" },
  { name: "speaking", path: "/speaking" },
  { name: "changelog", path: "/changelog" },
];

const VIEWPORTS = [
  { name: "375w", width: 375, height: 812 },
  { name: "768w", width: 768, height: 1024 },
  { name: "1024w", width: 1024, height: 768 },
  { name: "1440w", width: 1440, height: 900 },
];

// Init script that runs BEFORE any page scripts.
// - Math.random returns 0 → deterministic "random" picks
// - Date.now returns a fixed timestamp → deterministic calendar/greetings
// This ensures ProfilePicture picks the same image, PhotoGallery uses the same
// rotations, CalendarBento renders the same month, etc.
const INIT_SCRIPT = `
  Math.random = () => 0;
  const FIXED_DATE = new Date('2026-04-08T12:00:00Z').getTime();
  const _Date = Date;
  globalThis.Date = class extends _Date {
    constructor(...args) {
      if (args.length === 0) return new _Date(FIXED_DATE);
      return new _Date(...args);
    }
    static now() { return FIXED_DATE; }
  };
  Object.setPrototypeOf(globalThis.Date, _Date);
`;

mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch();

for (const page of PAGES) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    await context.addInitScript(INIT_SCRIPT);
    const tab = await context.newPage();

    const url = `${BASE_URL}${page.path}`;
    console.log(`Capturing ${page.name} @ ${vp.name} — ${url}`);

    try {
      await tab.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      // Wait for fonts + Framer Motion entrance animations to fully complete.
      // Braydon's longest animation is PhotoGallery with stagger delays up to 1.1s,
      // plus animation durations ~0.6s. 3.5s is safely past all animations.
      await tab.waitForTimeout(3500);

      const filename = `${OUTPUT_DIR}/${page.name}-${vp.name}.png`;
      await tab.screenshot({ path: filename, fullPage: true });
      console.log(`  → ${filename}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }

    await context.close();
  }
}

await browser.close();
console.log("\nDone! Baselines saved to", OUTPUT_DIR);
