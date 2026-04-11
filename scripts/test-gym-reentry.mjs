/**
 * Regression test for the gym re-entry bug:
 *   1. Enter gym fresh
 *   2. Press switch 3 → (3, 9) becomes PRESSED
 *   3. Leave gym (start OverworldScene)
 *   4. Re-enter gym
 *   5. Walk onto (3, 9) — it should press and the visual should
 *      change to pressed (button disappears).
 *
 * Before the fix, step 5 hit an early-return guard because the
 * in-memory `gymPressedSwitch` was still 3 from step 2, even
 * though the map reloaded with (3, 9) as RAISED. Result: the
 * button looked raised but pressing it did nothing.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "gym-reentry");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "gym-reentry-"));
const URL = "http://localhost:4323/explore";
const chromiumPath =
  "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(page, name) {
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, `${name}.png`),
    clip: { x: 0, y: 0, width: 960, height: 640 },
  });
  console.log(`  📸 ${name}.png`);
}

async function stateAt(page, x, y) {
  return page.evaluate(
    ({ tx, ty }) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      if (!scene) return { active: false };
      const ground = scene.gymGroundLayer?.getTileAt(tx, ty);
      const fg = scene.gymFgSprites?.get(`${tx},${ty}`);
      return {
        active: true,
        groundIdx: ground?.index,
        fgVisible: fg?.visible,
        gymPressedSwitch: scene.gymPressedSwitch,
      };
    },
    { tx: x, ty: y },
  );
}

async function enterGym(page) {
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
  await wait(1800);
}

async function leaveGym(page) {
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.scene.start("OverworldScene");
  });
  await wait(1500);
}

async function zoomOnSwitch(page) {
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.playerSprite.setVisible(false);
    for (const sp of scene.npcSprites.values()) sp.setVisible(false);
    scene.cameras.main.setZoom(6);
    scene.cameras.main.centerOn(3 * 16 + 8, 9 * 16 + 8);
  });
  await wait(200);
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
  await wait(1200);
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

  // ── First visit ──────────────────────────────────────────
  console.log("\n=== First visit ===");
  await enterGym(page);
  console.log("After enter:", JSON.stringify(await stateAt(page, 3, 9)));
  await zoomOnSwitch(page);
  await shoot(page, "01-first-enter");

  // Press switch 3
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.pressGymSwitch(3);
  });
  await wait(200);
  console.log("After press 3:", JSON.stringify(await stateAt(page, 3, 9)));
  await shoot(page, "02-after-press-3");

  // ── Leave gym ────────────────────────────────────────────
  console.log("\n=== Leave gym ===");
  await leaveGym(page);
  await wait(300);

  // ── Second visit ─────────────────────────────────────────
  console.log("\n=== Second visit ===");
  await enterGym(page);
  const state2 = await stateAt(page, 3, 9);
  console.log("After re-enter:", JSON.stringify(state2));

  if (state2.groundIdx !== 7) {
    console.log(
      `  ❌ Expected (3,9) to reload as RAISED (groundIdx 7) but got ${state2.groundIdx}`,
    );
  } else if (state2.gymPressedSwitch !== 0) {
    console.log(
      `  ❌ Expected gymPressedSwitch reset to 0 but got ${state2.gymPressedSwitch}`,
    );
  } else {
    console.log("  ✅ Fresh puzzle state on re-entry.");
  }
  await zoomOnSwitch(page);
  await shoot(page, "03-second-enter");

  // Press switch 3 AGAIN on second visit
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.pressGymSwitch(3);
  });
  await wait(200);
  const state3 = await stateAt(page, 3, 9);
  console.log("After press 3 again:", JSON.stringify(state3));

  if (state3.groundIdx !== 8 || state3.fgVisible !== false) {
    console.log(
      `  ❌ Expected (3,9) PRESSED + fgVisible=false after press, got ${JSON.stringify(state3)}`,
    );
  } else {
    console.log("  ✅ Switch visibly depressed on second press.");
  }
  await shoot(page, "04-after-second-press-3");

  await context.close();
  console.log(`\n✅ Screenshots in ${SCREENSHOT_DIR}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
