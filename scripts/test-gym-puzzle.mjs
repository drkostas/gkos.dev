/**
 * Gym puzzle test — verifies the puzzle is fully solvable by:
 *   1. Entering the gym
 *   2. Testing all 4 switches
 *   3. Using BFS to compute reachability from spawn to Wattson (5,2)
 *   4. Screenshotting each state
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "gym-test-"));
const URL = "http://localhost:4323/explore";

function findChromium() {
  return "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(page, name) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

/** Get the full gym ground layer tile map. */
async function getGymTilemap(page) {
  return page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene || !scene.gymGroundLayer) return null;
    const layer = scene.gymGroundLayer;
    const w = layer.tilemap.width;
    const h = layer.tilemap.height;
    const tiles = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        const t = layer.getTileAt(x, y);
        row.push(t ? t.index : 0);
      }
      tiles.push(row);
    }
    return { w, h, tiles };
  });
}

/** BFS from (sx, sy) — returns set of reachable tiles and whether target was reached. */
async function runBfsInGym(page, sx, sy, tx, ty) {
  return page.evaluate(
    ({ sx, sy, tx, ty }) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      if (!scene || !scene.gymGroundLayer) return null;
      const layer = scene.gymGroundLayer;
      const w = layer.tilemap.width;
      const h = layer.tilemap.height;
      const blocking = new Set([36, 37, 38, 39, 58, 59, 60, 61, 65, 66, 71, 72]);
      // Also block collision-layer tiles (walls, furniture)
      const collLayer = scene.gymGroundLayer.tilemap.getLayer("Collision");
      const isBlocked = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return true;
        const t = layer.getTileAt(x, y);
        if (t && blocking.has(t.index)) return true;
        if (collLayer) {
          const ct = collLayer.tilemapLayer.getTileAt(x, y);
          if (ct && ct.index > 0) return true;
        }
        return false;
      };
      const visited = new Set();
      const q = [[sx, sy]];
      visited.add(`${sx},${sy}`);
      let reached = false;
      while (q.length) {
        const [x, y] = q.shift();
        if (x === tx && y === ty) { reached = true; break; }
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const nx = x + dx, ny = y + dy;
          if (visited.has(`${nx},${ny}`)) continue;
          if (isBlocked(nx, ny)) continue;
          visited.add(`${nx},${ny}`);
          q.push([nx, ny]);
        }
      }
      return { reached, visitedCount: visited.size };
    },
    { sx, sy, tx, ty },
  );
}

/** Dispatch a switch press by calling the scene method directly. */
async function pressSwitch(page, switchId) {
  return page.evaluate((id) => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene || typeof scene.pressGymSwitch !== "function") return false;
    scene.pressGymSwitch(id);
    return true;
  }, switchId);
}

async function main() {
  console.log("Launching Chromium…");
  const context = await chromium.launchPersistentContext(PROFILE, {
    executablePath: findChromium(),
    headless: false,
    viewport: { width: 960, height: 640 },
    deviceScaleFactor: 1,
    args: ["--no-sandbox"],
  });
  const page = context.pages()[0] ?? (await context.newPage());

  console.log(`Opening ${URL}…`);
  await page.goto(URL, { waitUntil: "networkidle" });
  await wait(1200);
  await page.click("body");
  await wait(300);

  // Clear localStorage
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("gkos:explore:")) localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await wait(1200);
  await page.click("body");
  await wait(300);

  // Jump straight into the gym scene
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
  await wait(2500);
  await shoot(page, "01-initial");

  // Record the initial state
  const state0 = await getGymTilemap(page);
  console.log(`Initial gym: ${state0.w}×${state0.h}`);

  // Target: Wattson at (5, 2)
  const spawn = { x: 4, y: 19 };
  const target = { x: 5, y: 2 };

  // BFS from spawn in the initial state
  const r0 = await runBfsInGym(page, spawn.x, spawn.y, target.x, target.y);
  console.log(`Initial: reached Wattson? ${r0.reached}, visited ${r0.visitedCount} tiles`);

  // Test each switch combination
  for (let i = 1; i <= 4; i++) {
    console.log(`\n>> Pressing switch ${i}`);
    await pressSwitch(page, i);
    await wait(200);
    await shoot(page, `0${i + 1}-switch${i}`);
    const r = await runBfsInGym(page, spawn.x, spawn.y, target.x, target.y);
    console.log(`  After switch ${i}: reached Wattson? ${r.reached}, visited ${r.visitedCount} tiles`);
  }

  console.log("\n✅ Done.");
  await wait(2000);
  await context.close();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
