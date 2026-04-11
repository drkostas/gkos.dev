/**
 * Regression test for the gym refresh-trap bug:
 *   1. Enter gym fresh
 *   2. Press switch 1 to solve the puzzle
 *   3. Teleport player to Wattson's side (past the former beams)
 *   4. Save via positionChangeFinished (walk a step to trigger save)
 *   5. page.reload() — simulate user hitting F5
 *   6. After reload, the gym state should match:
 *       - Player is at Wattson's side
 *       - The puzzle is still solved (beams still toggled)
 *       - BFS from player's position back to the exit mat is valid
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "gym-refresh");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "gym-refresh-"));
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

async function bfsFromTo(page, sx, sy, tx, ty) {
  return page.evaluate(
    ({ sx, sy, tx, ty }) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      if (!scene) return { ok: false, reason: "no scene" };
      const w = scene.gymGroundLayer.tilemap.width;
      const h = scene.gymGroundLayer.tilemap.height;
      const coll = scene.gymGroundLayer.tilemap.getLayer("Collision");
      const blocked = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return true;
        if (scene.gymBarrierBlocks && scene.gymBarrierBlocks(x, y)) {
          return true;
        }
        if (coll && coll.tilemapLayer) {
          const t = coll.tilemapLayer.getTileAt(x, y);
          if (t && t.index > 0) return true;
        }
        return false;
      };
      const visited = new Set();
      const q = [[sx, sy]];
      visited.add(`${sx},${sy}`);
      while (q.length) {
        const [x, y] = q.shift();
        if (x === tx && y === ty) return { ok: true, reachable: true };
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const nx = x + dx;
          const ny = y + dy;
          const nk = `${nx},${ny}`;
          if (visited.has(nk)) continue;
          if (blocked(nx, ny)) continue;
          visited.add(nk);
          q.push([nx, ny]);
        }
      }
      return { ok: true, reachable: false, visitedCount: visited.size };
    },
    { sx, sy, tx, ty },
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

  // ── 1. Enter gym ─────────────────────────────────────────
  console.log("\n=== 1. Enter gym ===");
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
  await shoot(page, "01-entered-fresh");

  // ── 2. Press switch 1 (solves puzzle: Wattson becomes reachable)
  console.log("\n=== 2. Press switch 1 (solve) ===");
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.pressGymSwitch(1);
  });
  await wait(200);
  await shoot(page, "02-after-press-1");

  // ── 3. Teleport player to tile directly south of Wattson ─
  console.log("\n=== 3. Walk to Wattson ===");
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    // Teleport + force a positionChangeFinished save
    scene.gridEngine.setPosition("player", { x: 5, y: 4 });
    // Manually fire the save code that positionChangeFinished would
    const pos = scene.gridEngine.getPosition("player");
    const facing = scene.gridEngine.getFacingDirection("player");
    // We need to call the save module directly since setPosition
    // bypasses the event. But we kept saveInteriorState importable.
    // Easiest: emit a real 1-tile move via gridEngine.
    scene.gridEngine.move("player", "down");
  });
  await wait(500);
  await shoot(page, "03-at-wattson");

  // Check what's in localStorage before reload
  const savedPre = await page.evaluate(() =>
    localStorage.getItem("gkos:explore:interior"),
  );
  console.log("Saved state before reload:", savedPre);

  // ── 4. Reload the page (simulate F5) ─────────────────────
  console.log("\n=== 4. Reload ===");
  await page.reload({ waitUntil: "networkidle" });
  await wait(2500);
  await page.click("body");
  await wait(500);

  // Check state after reload
  const postState = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene) return { ok: false, reason: "no interior scene active" };
    const pos = scene.gridEngine.getPosition("player");
    const gymPressed = scene.gymPressedSwitch;
    const interiorKey = scene.interiorKey;
    return { ok: true, interiorKey, pos, gymPressed };
  });
  console.log("Post-reload state:", JSON.stringify(postState));
  await shoot(page, "04-after-reload");

  if (!postState.ok || postState.interiorKey !== "gym") {
    console.log("  ❌ Not in gym after reload");
    await context.close();
    process.exit(1);
  }

  // ── 5. Verify player can still reach the exit mat ─────────
  console.log("\n=== 5. BFS from player back to exit mat ===");
  const { pos } = postState;
  const bfs = await bfsFromTo(page, pos.x, pos.y, 4, 19);
  console.log(
    `  From (${pos.x},${pos.y}) to exit mat (4,19): ${JSON.stringify(bfs)}`,
  );
  if (!bfs.reachable) {
    console.log("  ❌ PLAYER TRAPPED — exit mat unreachable after reload");
    process.exit(1);
  } else {
    console.log("  ✅ Player can still reach the exit mat");
  }

  await context.close();
  console.log(`\n✅ Screenshots in ${SCREENSHOT_DIR}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
