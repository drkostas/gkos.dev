/**
 * Exhaustive verification of gym switch visual state across every
 * meaningful scenario:
 *
 *   1. Fresh enter → all 4 switches raised
 *   2. Walk onto each switch in turn (1, 2, 3, 4) — after each press,
 *      the one we pressed must be HIDDEN and the other 3 visible
 *   3. Press same switch twice (guard) — visual must stay correct
 *   4. Press switch, refresh page — visual state must be restored
 *   5. Press switch via movement (checkGymSwitch flow, not direct
 *      pressGymSwitch call) — visual must update
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "gym-all-switches");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "all-switches-"));
const URL = "http://localhost:4323/explore";
const chromiumPath =
  "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SWITCHES = [
  { id: 1, x: 0, y: 15 },
  { id: 2, x: 4, y: 12 },
  { id: 3, x: 3, y: 9 },
  { id: 4, x: 8, y: 9 },
];

async function dumpSwitchStates(page) {
  return page.evaluate((switches) => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene) return null;
    const out = {};
    for (const sw of switches) {
      const t = scene.gymGroundLayer?.getTileAt(sw.x, sw.y);
      const fg = scene.gymFgSprites?.get(`${sw.x},${sw.y}`);
      out[`switch${sw.id}`] = {
        pos: `${sw.x},${sw.y}`,
        groundIdx: t?.index,
        fgVisible: fg?.visible,
        fgFrame: fg?.frame?.name,
        expected:
          t?.index === 8
            ? "PRESSED (fg hidden)"
            : t?.index === 7
              ? "RAISED (fg visible)"
              : "?",
      };
    }
    out.gymPressedSwitch = scene.gymPressedSwitch;
    return out;
  }, SWITCHES);
}

function assertSwitchVisuals(states, pressedId, label) {
  let failures = 0;
  for (const sw of SWITCHES) {
    const s = states[`switch${sw.id}`];
    const shouldBePressed = sw.id === pressedId;
    const groundOk = shouldBePressed ? s.groundIdx === 8 : s.groundIdx === 7;
    const fgOk = shouldBePressed ? !s.fgVisible : s.fgVisible;
    if (!groundOk || !fgOk) {
      console.log(
        `  ❌ [${label}] switch${sw.id}@${s.pos}: expected ${shouldBePressed ? "PRESSED" : "RAISED"}, got groundIdx=${s.groundIdx} fgVisible=${s.fgVisible}`,
      );
      failures++;
    }
  }
  if (failures === 0) console.log(`  ✅ [${label}] all switches correct`);
  return failures;
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

async function shoot(page, name) {
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, `${name}.png`),
    clip: { x: 0, y: 0, width: 960, height: 640 },
  });
}

async function pressSwitchByTeleport(page, id, x, y) {
  // Teleport adjacent to the switch, then issue a move toward it
  // so positionChangeFinished fires and the REAL checkGymSwitch flow
  // runs (not a direct pressGymSwitch call).
  await page.evaluate(
    ({ x, y }) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      // Find a passable neighbor
      const ground = scene.gymGroundLayer;
      const BLOCKERS = new Set([
        36, 37, 38, 39, 58, 59, 60, 61, 65, 66, 71,
      ]);
      const neighbors = [
        { dx: 0, dy: 1, d: "up" },
        { dx: 0, dy: -1, d: "down" },
        { dx: 1, dy: 0, d: "left" },
        { dx: -1, dy: 0, d: "right" },
      ];
      for (const { dx, dy, d } of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        const t = ground.getTileAt(nx, ny);
        if (!t || BLOCKERS.has(t.index)) continue;
        // Stand one tile past the switch, clear gymLastPlayerTile
        // so the edge detector fires on arrival.
        scene.gridEngine.setPosition("player", { x: nx, y: ny });
        scene.gymLastPlayerTile = null;
        scene.gridEngine.move("player", d);
        return { ok: true };
      }
      return { ok: false };
    },
    { x, y },
  );
  await wait(400);
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

  let totalFailures = 0;

  // ── Scenario 1: Fresh state, all raised ─────────────────
  console.log("\n=== 1. Fresh gym entry ===");
  await enterGym(page);
  await shoot(page, "01-fresh");
  let states = await dumpSwitchStates(page);
  console.log("  Switch states:", JSON.stringify(states, null, 2));
  totalFailures += assertSwitchVisuals(states, 0, "fresh");

  // ── Scenario 2: Press each switch and verify ─────────────
  console.log("\n=== 2. Press each switch in turn ===");
  for (const sw of SWITCHES) {
    console.log(`\n  --- Pressing switch ${sw.id} at (${sw.x},${sw.y}) via pressGymSwitch ---`);
    await page.evaluate((id) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      scene.pressGymSwitch(id);
    }, sw.id);
    await wait(200);
    await shoot(page, `02-after-press-${sw.id}`);
    states = await dumpSwitchStates(page);
    totalFailures += assertSwitchVisuals(states, sw.id, `after press ${sw.id}`);
  }

  // ── Scenario 3: Press same switch twice ─────────────────
  console.log("\n=== 3. Double-press guard ===");
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    // Press 1 twice in a row
    scene.pressGymSwitch(1);
  });
  await wait(100);
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.pressGymSwitch(1);
  });
  await wait(100);
  states = await dumpSwitchStates(page);
  totalFailures += assertSwitchVisuals(states, 1, "double press 1");
  await shoot(page, "03-double-press-1");

  // ── Scenario 4: Refresh while a switch is pressed ───────
  console.log("\n=== 4. Refresh with switch 3 pressed ===");
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    scene.pressGymSwitch(3);
  });
  await wait(300);
  await shoot(page, "04a-before-refresh");
  states = await dumpSwitchStates(page);
  console.log("  Pre-refresh:", JSON.stringify(states.switch3));
  totalFailures += assertSwitchVisuals(states, 3, "pre-refresh");

  await page.reload({ waitUntil: "networkidle" });
  await wait(2500);
  await page.click("body");
  await wait(500);

  await shoot(page, "04b-after-refresh");
  states = await dumpSwitchStates(page);
  console.log("  Post-refresh:", JSON.stringify(states, null, 2));
  totalFailures += assertSwitchVisuals(states, 3, "post-refresh");

  // ── Scenario 5: Walk onto switch via real movement ──────
  console.log("\n=== 5. Walk onto each switch (real movement) ===");
  // Clear and re-enter fresh
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("gkos:explore:")) localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await wait(1500);
  await page.click("body");
  await wait(300);
  await enterGym(page);

  for (const sw of SWITCHES) {
    console.log(`\n  --- Walking onto switch ${sw.id} at (${sw.x},${sw.y}) ---`);
    await pressSwitchByTeleport(page, sw.id, sw.x, sw.y);
    states = await dumpSwitchStates(page);
    totalFailures += assertSwitchVisuals(states, sw.id, `walked onto ${sw.id}`);
    // Zoom in on the just-pressed switch for a clean visual check
    await page.evaluate(
      ({ x, y }) => {
        const game = window.__PHASER_GAME__;
        const scene = game.scene.scenes.find(
          (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
        );
        scene.playerSprite.setVisible(false);
        for (const sp of scene.npcSprites.values()) sp.setVisible(false);
        scene.cameras.main.centerOn(x * 16 + 8, y * 16 + 8);
        scene.cameras.main.setZoom(8);
      },
      { x: sw.x, y: sw.y },
    );
    await wait(200);
    await shoot(page, `05-walked-${sw.id}-zoomed`);
    // Restore zoom/visibility
    await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      scene.playerSprite.setVisible(true);
      for (const sp of scene.npcSprites.values()) sp.setVisible(true);
      scene.cameras.main.setZoom(1);
    });
    await wait(100);
  }

  await context.close();
  if (totalFailures > 0) {
    console.log(`\n❌ ${totalFailures} total switch visual failures`);
    process.exit(1);
  } else {
    console.log("\n✅ All switch scenarios passed");
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
