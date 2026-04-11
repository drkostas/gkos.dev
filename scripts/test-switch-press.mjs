/**
 * Verify switch press visual feedback. Teleport to a switch, take
 * a before-press screenshot, call pressGymSwitch, then a second
 * screenshot. The pressed switch should visibly differ.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "switch-press");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "switch-test-"));
const URL = "http://localhost:4323/explore";
const chromiumPath =
  "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(page, name) {
  const p = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({
    path: p,
    clip: { x: 0, y: 0, width: 960, height: 640 },
  });
  console.log(`  📸 ${name}.png`);
}

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
  await wait(1000);
  await page.click("body");
  await wait(300);

  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("gkos:explore:")) localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await wait(1200);
  await page.click("body");
  await wait(300);

  // Start gym scene
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const overworld = game.scene.getScene("OverworldScene");
    overworld.scene.start("InteriorScene", {
      interiorKey: "gym",
      returnPos: { x: 58, y: 56, facing: "down" },
      spawnTile: { x: 4, y: 19 },
      spawnFacing: "up",
    });
  });
  await wait(2000);

  // Zoom in on switch (4, 12) while keeping the player away from it
  // so the sprite doesn't obscure the switch visuals.
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene) return;
    scene.playerSprite.setVisible(false);
    for (const sprite of scene.npcSprites.values()) sprite.setVisible(false);
    scene.cameras.main.centerOn(4 * 16 + 8, 12 * 16 + 8);
    scene.cameras.main.setZoom(6);
  });
  await wait(300);

  await shoot(page, "01-before-press");

  // Press switch 2 (at x=4, y=12)
  const result = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene) return { ok: false };
    // Capture tile states at all 4 switch positions before + after
    const switches = [
      { id: 1, x: 0, y: 15 },
      { id: 2, x: 4, y: 12 },
      { id: 3, x: 3, y: 9 },
      { id: 4, x: 8, y: 9 },
    ];
    const before = switches.map((s) => {
      const t = scene.gymGroundLayer.getTileAt(s.x, s.y);
      return { ...s, tileIdx: t ? t.index : -1 };
    });
    scene.pressGymSwitch(2);
    const after = switches.map((s) => {
      const t = scene.gymGroundLayer.getTileAt(s.x, s.y);
      return { ...s, tileIdx: t ? t.index : -1 };
    });
    return { ok: true, before, after };
  });
  console.log("switch tiles:", JSON.stringify(result, null, 2));
  await wait(300);
  await shoot(page, "02-after-press-switch2");

  // Press switch 3 → switch 2 should reset
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.pressGymSwitch(3);
  });
  await wait(300);
  await shoot(page, "03-after-press-switch3");

  await context.close();
  console.log(`\n✅ Screenshots in ${SCREENSHOT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
