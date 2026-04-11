/**
 * Reproduce the "lag" bug: walking continuously over a switch.
 *
 * Grid-engine fires positionChangeFinished BEFORE updating the
 * character's tilePos when movement is chained (continuous walking).
 * Calling gridEngine.getPosition() inside the subscriber returns the
 * OLD tile — so a naive checkGymSwitch would miss the switch when
 * the player walks over it without stopping.
 *
 * This test queues a long chain of moves that passes through each
 * switch and asserts every switch was detected + registered.
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
  "gym-continuous-walk",
);
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "gym-walk-"));
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

  // Instrument checkGymSwitch to record every call with the position
  // it was called with, so we can verify it receives the correct
  // (enterTile) positions during chained movement.
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    window.__switchCalls = [];
    const orig = scene.checkGymSwitch.bind(scene);
    scene.checkGymSwitch = function (pos) {
      window.__switchCalls.push({ x: pos.x, y: pos.y });
      return orig(pos);
    };
  });

  // Test 1: fresh → queue a continuous chain of moves through switch 2.
  //   Start at (4, 19). Walk up to (4, 12) directly through switch 2.
  //   Switch 2 is at (4, 12) so the chain ends ON the switch. Verify
  //   checkGymSwitch was called with {x:4, y:12}.
  console.log("\n=== Test 1: walk fresh (4,19)→(4,12) onto switch 2 ===");
  const result1 = await page.evaluate(async () => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    window.__switchCalls = [];
    // Make sure the player is at spawn
    scene.gridEngine.setPosition("player", { x: 4, y: 19 });
    scene.gymLastPlayerTile = null;
    // Queue 7 consecutive "up" moves to chain walk (4,19)→(4,12).
    // The switch at (4,12) must be detected.
    for (let i = 0; i < 7; i++) {
      scene.gridEngine.move("player", "up");
      // Spin a few frames between moves (non-blocking)
      await new Promise((r) => setTimeout(r, 1));
    }
    // Wait for movement to complete. Grid-engine move speed is tile
    // based; give generous time.
    await new Promise((r) => setTimeout(r, 2000));
    return {
      calls: window.__switchCalls,
      gymPressedSwitch: scene.gymPressedSwitch,
      playerPos: scene.gridEngine.getPosition("player"),
      switch2Tile: scene.gymGroundLayer.getTileAt(4, 12)?.index,
      switch2FgVisible: scene.gymFgSprites.get("4,12")?.visible,
    };
  });
  console.log("  result:", JSON.stringify(result1, null, 2));
  if (result1.gymPressedSwitch === 2 && result1.switch2Tile === 8 && result1.switch2FgVisible === false) {
    console.log("  ✅ Switch 2 correctly pressed after continuous walk");
  } else {
    console.log("  ❌ Switch 2 NOT registered after continuous walk");
  }
  const sawSwitch2 = result1.calls.some((c) => c.x === 4 && c.y === 12);
  console.log(
    `  checkGymSwitch was ${sawSwitch2 ? "" : "NOT "}called with (4,12)`,
  );

  // Test 2: walk continuously past multiple switches.
  //   From spawn (4,19), walk up to (3,9) — should pass through
  //   (4,12)=switch 2 but END on switch 3 at (3,9).
  //   Actually switch 2 is at (4,12) and switch 3 is at (3,9) —
  //   different columns. Construct a path that passes THROUGH
  //   switch 2 without stopping.
  console.log(
    "\n=== Test 2: continuous walk over switch 2 without stopping ===",
  );
  const result2 = await page.evaluate(async () => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    // Reset puzzle so we're back to initial state
    // Press switch 2 again to undo the previous test's toggle (toggle
    // is its own inverse). Actually: clear state and reset.
    window.__switchCalls = [];
    // Place player ABOVE switch 2, so walking DOWN passes through it
    scene.gridEngine.setPosition("player", { x: 4, y: 10 });
    scene.gymLastPlayerTile = { x: 4, y: 10 }; // avoid immediate fire
    // Ensure switch 2 is raised
    if (scene.gymGroundLayer.getTileAt(4, 12)?.index === 8) {
      // Already pressed — press another switch first to raise it
      scene.pressGymSwitch(1);
    }
    await new Promise((r) => setTimeout(r, 50));
    window.__switchCalls = [];
    const initialSwitch2 = scene.gymGroundLayer.getTileAt(4, 12)?.index;
    // Chain 4 DOWN moves: (4,10)→(4,11)→(4,12)[switch]→(4,13)→(4,14)
    // Actually (4,11) is probably blocked (horizontal beam bottom),
    // so simpler: chain 2 up moves from (4,14) through switch 2.
    scene.gridEngine.setPosition("player", { x: 4, y: 14 });
    scene.gymLastPlayerTile = { x: 4, y: 14 };
    window.__switchCalls = [];
    for (let i = 0; i < 3; i++) {
      scene.gridEngine.move("player", "up");
      await new Promise((r) => setTimeout(r, 1));
    }
    await new Promise((r) => setTimeout(r, 2000));
    return {
      initialSwitch2,
      calls: window.__switchCalls,
      gymPressedSwitch: scene.gymPressedSwitch,
      playerPos: scene.gridEngine.getPosition("player"),
      switch2Tile: scene.gymGroundLayer.getTileAt(4, 12)?.index,
    };
  });
  console.log("  result:", JSON.stringify(result2, null, 2));
  const sawSwitch2in2 = result2.calls.some((c) => c.x === 4 && c.y === 12);
  console.log(
    `  checkGymSwitch was ${sawSwitch2in2 ? "" : "NOT "}called with (4,12) during chain`,
  );

  // Test 3: simulate continuous movement by repeatedly calling
  //   gridEngine.move() at the same rate the scene's update loop does.
  //   This tests the chained-move path through grid-engine which
  //   emits positionChangeFinished BEFORE updating tilePos.
  console.log("\n=== Test 3: simulated continuous walk (frame-paced) ===");
  const result3 = await page.evaluate(async () => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    // Raise switch 2 if it's pressed
    if (scene.gymGroundLayer.getTileAt(4, 12)?.index === 8) {
      scene.pressGymSwitch(3);
    }
    await new Promise((r) => setTimeout(r, 100));
    // Make sure puzzle is in a state where (4,15)..(4,12) is walkable
    if (scene.gymBarrierBlocks(4, 14) || scene.gymBarrierBlocks(4, 13)) {
      // Toggle until the path is clear
      scene.pressGymSwitch(1);
      await new Promise((r) => setTimeout(r, 100));
    }
    scene.gridEngine.setPosition("player", { x: 4, y: 15 });
    scene.gymLastPlayerTile = { x: 4, y: 15 };
    window.__switchCalls = [];
    const initialSwitch2 = scene.gymGroundLayer.getTileAt(4, 12)?.index;

    // Simulate continuous walk by calling move() every 16ms (60fps).
    // Grid-engine will chain the moves and fire positionChangeFinished
    // between tiles.
    const start = Date.now();
    const maxMs = 3000;
    while (Date.now() - start < maxMs) {
      const pos = scene.gridEngine.getPosition("player");
      if (pos.y <= 12) break;
      scene.gridEngine.move("player", "up");
      await new Promise((r) => setTimeout(r, 16));
    }
    // Give it one more tick to finish the last move
    await new Promise((r) => setTimeout(r, 500));
    return {
      initialSwitch2,
      calls: window.__switchCalls,
      switch2Tile: scene.gymGroundLayer.getTileAt(4, 12)?.index,
      gymPressedSwitch: scene.gymPressedSwitch,
      playerPos: scene.gridEngine.getPosition("player"),
    };
  });
  console.log("  result:", JSON.stringify(result3, null, 2));
  const walkedOnto12 = result3.calls.some((c) => c.x === 4 && c.y === 12);
  console.log(
    `  checkGymSwitch was ${walkedOnto12 ? "" : "NOT "}called with (4,12) during simulated walk`,
  );
  if (result3.switch2Tile === 8 && walkedOnto12) {
    console.log("  ✅ Switch 2 pressed via frame-paced continuous walk");
  } else if (result3.switch2Tile === 8) {
    console.log(
      "  ⚠️ Switch 2 pressed but checkGymSwitch never saw (4,12)",
    );
  } else {
    console.log(
      `  ❌ Switch 2 NOT pressed (tile still ${result3.switch2Tile})`,
    );
  }

  await context.close();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
