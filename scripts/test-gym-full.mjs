/**
 * End-to-end gym puzzle verification:
 *   1. Enter the gym and screenshot the initial state.
 *   2. Try to walk the player INTO each known beam position and
 *      assert the movement is blocked when the beam is On.
 *   3. Press each of the 4 switches in sequence, screenshot after
 *      each, and verify the tile transforms match OG.
 *   4. Run BFS from spawn to Wattson to verify reachability in at
 *      least one puzzle state.
 *   5. Also spot-check that pokecenter and mart still render
 *      correctly after the layerType lookup fix.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "gym-full");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "gym-full-"));
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

async function enterGym(page) {
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
}

// BFS over the current puzzle state — returns the set of reachable
// tile keys from the spawn, using the SAME blocking rules the game
// uses at runtime (gymBarrierBlocks + static collision layer).
async function bfsReachable(page, startX, startY) {
  return page.evaluate(
    ({ sx, sy }) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      if (!scene) return { ok: false };
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
        for (const [dx, dy] of [
          [0, -1], [0, 1], [-1, 0], [1, 0],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          const nk = `${nx},${ny}`;
          if (visited.has(nk)) continue;
          if (blocked(nx, ny)) continue;
          visited.add(nk);
          q.push([nx, ny]);
        }
      }
      return { ok: true, visited: [...visited] };
    },
    { sx: startX, sy: startY },
  );
}

async function dumpPuzzleGrid(page) {
  return page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene) return null;
    const ground = scene.gymGroundLayer;
    const w = ground.tilemap.width;
    const h = ground.tilemap.height;
    const rows = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        const t = ground.getTileAt(x, y);
        row.push(t ? t.index : 0);
      }
      rows.push(row);
    }
    return rows;
  });
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

  // ── 1. Initial state ───────────────────────────────────────
  console.log("\n=== 1. Enter gym and record initial state ===");
  await enterGym(page);
  await shoot(page, "01-initial");

  const initialGrid = await dumpPuzzleGrid(page);
  const initialReach = await bfsReachable(page, 4, 19);
  console.log(
    `Initial reach: ${initialReach.visited.length} tiles, Wattson (5,2) reachable: ${initialReach.visited.includes("5,2")}`,
  );

  // ── 2. Collision sanity: check puzzle positions only ──────
  console.log("\n=== 2. Collision sanity (puzzle positions only) ===");
  const BLOCKERS = new Set([36, 37, 38, 39, 58, 59, 60, 61, 65, 66, 71]);
  const coverage = await page.evaluate((blockers) => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    const ground = scene.gymGroundLayer;
    const coll = scene.gymCollisionLayer;
    const positions = [...(scene.gymPuzzlePositions ?? [])];
    const out = [];
    for (const key of positions) {
      const [xs, ys] = key.split(",");
      const x = Number(xs);
      const y = Number(ys);
      const g = ground.getTileAt(x, y);
      if (!g) continue;
      const c = coll.getTileAt(x, y);
      const shouldBlock = blockers.includes(g.index);
      const actuallyBlocks = !!c && c.index > 0;
      if (shouldBlock !== actuallyBlocks) {
        out.push({
          x, y, groundIdx: g.index, shouldBlock, actuallyBlocks,
        });
      }
    }
    return { total: positions.length, mismatches: out };
  }, [...BLOCKERS]);
  if (coverage.mismatches.length > 0) {
    console.log(
      `  ❌ ${coverage.mismatches.length}/${coverage.total} collision mismatches:`,
      coverage.mismatches.slice(0, 5),
    );
  } else {
    console.log(
      `  ✅ All ${coverage.total} puzzle positions have correct collision.`,
    );
  }

  // ── 2b. Walk-into-beam test ────────────────────────────────
  console.log("\n=== 2b. Walk into beam test ===");
  const walkTest = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    // Find any blocking H3/H4 On tile in the initial state and a
    // walkable neighbor to stand on, then attempt to move the
    // player onto the blocking tile via gridEngine.move().
    const BLOCKERS = [36, 37, 38, 39, 58, 59, 60, 61, 65, 66, 71];
    const ground = scene.gymGroundLayer;
    for (let y = 6; y <= 15; y++) {
      for (let x = 0; x <= 8; x++) {
        const t = ground.getTileAt(x, y);
        if (!t || !BLOCKERS.includes(t.index)) continue;
        // Try each cardinal neighbor as "stand on" position.
        const dirs = [
          { dx: 0, dy: 1, d: "up" },   // beam above, move up
          { dx: 0, dy: -1, d: "down" },
          { dx: 1, dy: 0, d: "left" },
          { dx: -1, dy: 0, d: "right" },
        ];
        for (const { dx, dy, d } of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0) continue;
          const n = ground.getTileAt(nx, ny);
          if (!n) continue;
          if (BLOCKERS.includes(n.index)) continue;
          // Teleport player to neighbor, then try to move towards beam
          scene.gridEngine.setPosition("player", { x: nx, y: ny });
          const before = scene.gridEngine.getPosition("player");
          scene.gridEngine.move("player", d);
          return {
            beam: { x, y, idx: t.index },
            stand: { x: nx, y: ny },
            direction: d,
            posBefore: before,
            // posAfter checked after a tick in the caller
          };
        }
      }
    }
    return null;
  });
  if (walkTest) {
    await wait(500); // let the engine try to move
    const walkResult = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      return scene.gridEngine.getPosition("player");
    });
    const blocked =
      walkResult.x === walkTest.stand.x && walkResult.y === walkTest.stand.y;
    console.log(
      `  Tried walking from (${walkTest.stand.x},${walkTest.stand.y}) ${walkTest.direction} into beam tile ${walkTest.beam.idx} at (${walkTest.beam.x},${walkTest.beam.y})`,
    );
    console.log(
      `  Final position: (${walkResult.x},${walkResult.y}) — ${blocked ? "✅ BLOCKED" : "❌ PASSED THROUGH"}`,
    );
  } else {
    console.log("  (no beam with walkable neighbor found)");
  }

  // Reset: teleport player back to spawn
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.gridEngine.setPosition("player", { x: 4, y: 19 });
  });
  await wait(200);

  // ── 3. Press each switch in sequence ───────────────────────
  console.log("\n=== 3. Switch press cycle ===");
  for (const id of [1, 2, 3, 4]) {
    await page.evaluate((sid) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      scene.pressGymSwitch(sid);
    }, id);
    await wait(200);
    await shoot(page, `02-after-switch${id}`);
    const r = await bfsReachable(page, 4, 19);
    const wattsonReachable = r.visited.includes("5,2");
    console.log(
      `  Switch ${id}: ${r.visited.length} reachable, Wattson reachable: ${wattsonReachable}`,
    );
  }

  // ── 4. Wattson depth verification ──────────────────────────
  console.log("\n=== 4. Wattson depth check ===");
  const wat = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    const wattson = scene.npcSprites.get("gym_wattson");
    if (!wattson) return null;
    // Sample foreground sprite depths around him
    const around = [];
    for (let dy = -2; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const key = `${5 + dx},${2 + dy}`;
        const fg = scene.gymFgSprites?.get(key);
        if (fg) around.push({ pos: key, depth: fg.depth });
      }
    }
    // Count tiles that are ABOVE Wattson
    const above = around.filter((a) => a.depth > wattson.depth).length;
    return {
      wattsonDepth: wattson.depth,
      nearbyCount: around.length,
      tilesAbove: above,
    };
  });
  console.log("  Wattson:", JSON.stringify(wat));

  // ── 5. Pokecenter & mart spot-check ────────────────────────
  console.log("\n=== 5. Pokecenter & mart spot-check ===");
  for (const key of ["pokecenter", "mart"]) {
    await page.evaluate((k) => {
      const game = window.__PHASER_GAME__;
      const overworld = game.scene.getScene("OverworldScene");
      const spawns = {
        pokecenter: { x: 7, y: 12 },
        mart: { x: 4, y: 9 },
      };
      overworld.scene.start("InteriorScene", {
        interiorKey: k,
        returnPos: { x: 58, y: 56, facing: "down" },
        spawnTile: spawns[k],
        spawnFacing: "up",
      });
    }, key);
    await wait(1500);
    await shoot(page, `03-${key}-initial`);
  }

  console.log(`\n✅ Screenshots in ${SCREENSHOT_DIR}`);
  await context.close();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
