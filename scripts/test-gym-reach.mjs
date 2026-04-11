/**
 * Gym reachability debug: dump the full collision + barrier state
 * and show the BFS frontier so we can see what's blocking the path.
 */
import { chromium } from "playwright-core";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const PROFILE = mkdtempSync(join(tmpdir(), "gym-reach-"));
const URL = "http://localhost:4323/explore";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function findChromium() {
  return "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
}

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE, {
    executablePath: findChromium(),
    headless: true,
    viewport: { width: 960, height: 640 },
    args: ["--no-sandbox"],
  });
  const page = context.pages()[0] ?? (await context.newPage());

  await page.goto(URL, { waitUntil: "networkidle" });
  await wait(1000);
  await page.click("body");
  await wait(300);

  // Jump straight to gym
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

  // Dump full tilemap + collision + BFS result for both puzzle states
  for (let state = 0; state < 2; state++) {
    if (state === 1) {
      await page.evaluate(() => {
        const game = window.__PHASER_GAME__;
        const scene = game.scene.scenes.find(
          (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
        );
        scene.pressGymSwitch(1);
      });
      await wait(200);
    }

    const info = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      const layer = scene.gymGroundLayer;
      const w = layer.tilemap.width;
      const h = layer.tilemap.height;
      const collLayer = layer.tilemap.getLayer("Collision");
      const blocking = new Set([36, 37, 38, 39, 58, 59, 60, 61, 65, 66, 71, 72]);

      const tiles = [];
      const blockGrid = [];
      for (let y = 0; y < h; y++) {
        const trow = [];
        const brow = [];
        for (let x = 0; x < w; x++) {
          const t = layer.getTileAt(x, y);
          trow.push(t ? t.index : 0);
          let blocked = false;
          if (t && blocking.has(t.index)) blocked = true;
          if (collLayer && collLayer.tilemapLayer) {
            const ct = collLayer.tilemapLayer.getTileAt(x, y);
            if (ct && ct.index > 0) blocked = true;
          }
          brow.push(blocked);
        }
        tiles.push(trow);
        blockGrid.push(brow);
      }

      // BFS from (4, 19)
      const visited = new Set();
      const q = [[4, 19]];
      visited.add("4,19");
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (visited.has(`${nx},${ny}`)) continue;
          if (blockGrid[ny][nx]) continue;
          visited.add(`${nx},${ny}`);
          q.push([nx, ny]);
        }
      }
      return { w, h, tiles, blockGrid, visited: [...visited] };
    });

    console.log(`\n===== STATE ${state} =====`);
    console.log("Block grid (X = blocked, . = passable, # = reached, S = spawn, W = wattson):");
    const visited = new Set(info.visited);
    for (let y = 0; y < info.h; y++) {
      let row = y.toString().padStart(2) + ": ";
      for (let x = 0; x < info.w; x++) {
        const key = `${x},${y}`;
        if (x === 4 && y === 19) row += "S ";
        else if (x === 5 && y === 2) row += "W ";
        else if (info.blockGrid[y][x]) row += "X ";
        else if (visited.has(key)) row += "# ";
        else row += ". ";
      }
      console.log(row);
    }
    console.log(`Reached ${info.visited.length} tiles. Wattson reachable: ${visited.has("5,2")}`);
  }

  await context.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
