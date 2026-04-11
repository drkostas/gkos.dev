/**
 * Screenshot the trainer card at each badge count 0..8 to verify
 * every badge gets a visibly distinct card color.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(
  __dirname,
  "..",
  ".test-screenshots",
  "trainer-card-colors",
);
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "tc-colors-"));
const URL = "http://localhost:4323/explore";
const chromiumPath =
  "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const BADGE_IDS = [
  "phd",
  "scholar",
  "opensource",
  "author",
  "fullstack",
  "explorer",
  "devoted",
  "champion",
];

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE, {
    executablePath: chromiumPath,
    headless: true,
    viewport: { width: 960, height: 640 },
    args: ["--no-sandbox"],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`  [err] ${m.text()}`);
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  await wait(1200);
  await page.click("body");
  await wait(300);

  // For each badge count 0..8, write the save, open the trainer card,
  // screenshot, close.
  for (let n = 0; n <= 8; n++) {
    const badges = BADGE_IDS.slice(0, n);
    await page.evaluate((badges) => {
      // Write the save directly so we don't have to trigger the
      // gym leader dialog 8 times.
      const raw = localStorage.getItem("gkos:explore:save");
      const save = raw ? JSON.parse(raw) : {};
      save.badges = badges;
      localStorage.setItem("gkos:explore:save", JSON.stringify(save));
    }, badges);

    // Open trainer card via the start menu. Easier: just post the
    // event the menu uses, but simplest is to reload and open the menu.
    await page.reload({ waitUntil: "networkidle" });
    await wait(1000);
    await page.click("body");
    await wait(300);

    // Open the start menu via Escape key
    await page.keyboard.press("Escape");
    await wait(400);
    // MENU_ITEMS: [POKeDEX, POKeMON, BAG, KOSTAS, HELP, OPTION, EXIT]
    // KOSTAS is at index 3 — press DOWN 3 times then ENTER.
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("ArrowDown");
      await wait(80);
    }
    await page.keyboard.press("Enter");
    await wait(500);

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, `badges-${n}.png`),
      fullPage: false,
    });
    console.log(`  📸 badges-${n}.png (badges=${badges.join(",") || "none"})`);

    // Close the trainer card (B), then the start menu (Escape).
    await page.keyboard.press("Backspace");
    await wait(300);
    await page.keyboard.press("Escape");
    await wait(300);
  }

  await context.close();
  console.log(`\n✅ Screenshots in ${SCREENSHOT_DIR}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
