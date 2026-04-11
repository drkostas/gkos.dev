/**
 * Reproduce the user's exact scenario: enter the gym fresh, walk
 * directly onto switch (3, 9) WITHOUT pressing any other switch
 * first, and verify the visual correctly reflects the pressed state.
 *
 * Captures before/after screenshots at 6x zoom centered on (3, 9).
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "switch-walk");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "switch-walk-"));
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
      if (!scene) return null;
      const ground = scene.gymGroundLayer.getTileAt(tx, ty);
      const fg = scene.gymFgSprites?.get(`${tx},${ty}`);
      return {
        groundIdx: ground?.index,
        fgDepth: fg?.depth,
        fgVisible: fg?.visible,
        fgFrame: fg?.frame?.name,
        gymPressedSwitch: scene.gymPressedSwitch,
      };
    },
    { tx: x, ty: y },
  );
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

  // Enter gym fresh
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    game.scene.getScene("OverworldScene").scene.start("InteriorScene", {
      interiorKey: "gym",
      returnPos: { x: 58, y: 56, facing: "down" },
      spawnTile: { x: 4, y: 19 },
      spawnFacing: "up",
    });
  });
  await wait(2000);

  // Check initial state at (3, 9)
  const initial = await stateAt(page, 3, 9);
  console.log("(3,9) initial state:", JSON.stringify(initial));

  // Zoom the camera onto (3, 9), hide player to see switch clearly
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.playerSprite.setVisible(false);
    for (const sprite of scene.npcSprites.values()) sprite.setVisible(false);
    scene.cameras.main.centerOn(3 * 16 + 8, 9 * 16 + 8);
    scene.cameras.main.setZoom(6);
  });
  await wait(300);
  await shoot(page, "01-before-walk-3-9");

  // Walk onto (3, 9) by setting gridEngine position (teleport) —
  // this does NOT trigger positionChangeFinished so checkGymSwitch
  // won't fire. We explicitly call checkGymSwitch as if the player
  // arrived via movement.
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    // Simulate the actual walk-onto-switch flow: set position + fire
    // the same check the update loop would fire.
    scene.gridEngine.setPosition("player", { x: 3, y: 9 });
    if (typeof scene.checkGymSwitch === "function") {
      scene.checkGymSwitch({ x: 3, y: 9 });
    } else {
      // Fallback: call pressGymSwitch directly (what the update
      // loop ultimately does)
      scene.pressGymSwitch(3);
    }
  });
  await wait(400);

  const after = await stateAt(page, 3, 9);
  console.log("(3,9) after walk state:", JSON.stringify(after));
  await shoot(page, "02-after-walk-3-9");

  // Also screenshot the whole gym so we can see the other switches
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.cameras.main.setZoom(1);
    scene.cameras.main.centerOn(5 * 16 + 8, 10 * 16 + 8);
  });
  await wait(200);
  await shoot(page, "03-whole-gym-after");

  // Final state report for all 4 switches
  const finalStates = {};
  for (const sw of [
    { id: 1, x: 0, y: 15 },
    { id: 2, x: 4, y: 12 },
    { id: 3, x: 3, y: 9 },
    { id: 4, x: 8, y: 9 },
  ]) {
    finalStates[`switch${sw.id}@${sw.x},${sw.y}`] = await stateAt(
      page,
      sw.x,
      sw.y,
    );
  }
  console.log("All switches final state:", JSON.stringify(finalStates, null, 2));

  await context.close();
  console.log(`\n✅ Screenshots in ${SCREENSHOT_DIR}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
