/**
 * Reproduce: enter mart, try to walk up from doormat.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "mart-walk");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "mart-walk-"));
const URL = "http://localhost:4323/explore";
const chromiumPath =
  "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

  // Enter mart fresh
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    game.scene.getScene("OverworldScene").scene.start("InteriorScene", {
      interiorKey: "mart",
      returnPos: { x: 73, y: 65, facing: "down" },
      spawnTile: { x: 3, y: 7 },
      spawnFacing: "up",
    });
  });
  await wait(2000);
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, "01-spawn.png"),
    clip: { x: 0, y: 0, width: 960, height: 640 },
  });

  // Dump collision + ground info around the spawn
  const diag = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene) return { ok: false };
    const pos = scene.gridEngine.getPosition("player");
    const ground = scene.gymGroundLayer; // same field name used for all interiors
    const coll = scene.gymCollisionLayer;
    const around = [];
    for (let dy = -5; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        const gt = ground?.getTileAt(x, y);
        const ct = coll?.getTileAt(x, y);
        around.push({
          pos: `${x},${y}`,
          groundIdx: gt?.index,
          collIdx: ct?.index,
          collProps: ct?.properties,
        });
      }
    }
    return {
      ok: true,
      pos,
      interiorKey: scene.interiorKey,
      around,
    };
  });
  console.log("Spawn diag:", JSON.stringify(diag.pos), "interior:", diag.interiorKey);

  // Print tiles in a grid relative to spawn
  console.log("\nAround spawn (ground.coll):");
  const map = new Map();
  for (const t of diag.around) map.set(t.pos, t);
  for (let dy = -5; dy <= 1; dy++) {
    let row = `dy=${dy.toString().padStart(2)}: `;
    for (let dx = -2; dx <= 2; dx++) {
      const t = map.get(`${diag.pos.x + dx},${diag.pos.y + dy}`);
      const g = t?.groundIdx ?? "-";
      const c = t?.collIdx ?? "-";
      row += `${String(g).padStart(3)}.${String(c).padStart(3)} `;
    }
    console.log(row);
  }

  // Diagnose grid-engine's view of the world
  const ge = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    const pos = scene.gridEngine.getPosition("player");
    const facing = scene.gridEngine.getFacingDirection("player");
    const isMoving = scene.gridEngine.isMoving("player");
    // Check what grid-engine thinks about blocking at each tile
    // above the player
    const blocks = [];
    for (let dy = -4; dy <= 0; dy++) {
      const y = pos.y + dy;
      const tile = { x: pos.x, y };
      let blocked = null;
      try {
        blocked = scene.gridEngine.isBlocked(tile, undefined);
      } catch (e) {
        blocked = `err: ${e.message}`;
      }
      blocks.push({ tile: `${tile.x},${tile.y}`, blocked });
    }
    return { pos, facing, isMoving, blocks };
  });
  console.log("\nGridEngine state:", JSON.stringify(ge, null, 2));

  // Try driving through the scene's update loop by simulating input.
  console.log("\nAttempting UP moves through scene update:");
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      scene.gridEngine.move("player", "up");
    });
    // Wait for the move animation
    await wait(500);
    const p = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      return {
        pos: scene.gridEngine.getPosition("player"),
        facing: scene.gridEngine.getFacingDirection("player"),
        isMoving: scene.gridEngine.isMoving("player"),
      };
    });
    console.log(`  move ${i + 1}:`, JSON.stringify(p));
  }
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, "02-after-walks.png"),
    clip: { x: 0, y: 0, width: 960, height: 640 },
  });

  await context.close();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
