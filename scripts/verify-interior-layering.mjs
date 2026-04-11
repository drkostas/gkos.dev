/**
 * Visually verify foreground layering in all three interiors.
 *
 * For each interior, teleport the player to a set of positions that
 * sit next to known "foreground" tiles (counters, PCs, shelves,
 * statues, pole caps) and take a screenshot. The screenshots let us
 * confirm the player is drawn in front of COVERED tiles and behind
 * NORMAL tiles, matching OG Pokemon Emerald layerType semantics.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "layering");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "layer-verify-"));
const URL = "http://localhost:4323/explore";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const chromiumPath =
  "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

async function shoot(page, name) {
  const p = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({
    path: p,
    clip: { x: 0, y: 0, width: 960, height: 640 },
  });
  console.log(`  📸 ${name}.png`);
}

async function enterInterior(page, key) {
  await page.evaluate(
    ({ key }) => {
      const game = window.__PHASER_GAME__;
      const overworld = game.scene.getScene("OverworldScene");
      const spawnMap = {
        pokecenter: { x: 7, y: 12 },
        mart: { x: 4, y: 9 },
        gym: { x: 4, y: 19 },
      };
      overworld.scene.start("InteriorScene", {
        interiorKey: key,
        returnPos: { x: 58, y: 56, facing: "down" },
        spawnTile: spawnMap[key],
        spawnFacing: "up",
      });
    },
    { key },
  );
  await wait(1500);
}

async function teleport(page, x, y, facing = "up") {
  const result = await page.evaluate(
    ({ x, y, facing }) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      if (!scene) return { ok: false, reason: "no scene" };
      scene.gridEngine.setPosition("player", { x, y });
      if (facing) scene.gridEngine.turnTowards("player", facing);
      scene.playerSprite.setPosition(x * 16 + 8, y * 16 + 8);
      // Force the camera onto the player too, so the screenshot
      // actually shows the target tile.
      scene.cameras.main.centerOn(x * 16 + 8, y * 16 + 8);
      return {
        ok: true,
        gePos: scene.gridEngine.getPosition("player"),
        spriteXY: [scene.playerSprite.x, scene.playerSprite.y],
        cam: [scene.cameras.main.scrollX, scene.cameras.main.scrollY],
      };
    },
    { x, y, facing },
  );
  console.log(`    teleport(${x},${y},${facing}) →`, JSON.stringify(result));
  await wait(300);
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

  // ── POKECENTER ────────────────────────────────────────────
  console.log("\n=== POKECENTER ===");
  await enterInterior(page, "pokecenter");
  await shoot(page, "pokecenter-01-spawn");
  // Walk up to the counter (counter is around row 4-5, center around x=3-4)
  await teleport(page, 3, 5, "up");
  await shoot(page, "pokecenter-02-at-counter");
  // PC is on the right side
  await teleport(page, 10, 5, "up");
  await shoot(page, "pokecenter-03-at-pc");

  // ── MART ──────────────────────────────────────────────────
  console.log("\n=== MART ===");
  await enterInterior(page, "mart");
  await shoot(page, "mart-01-spawn");
  // Counter area
  await teleport(page, 3, 4, "up");
  await shoot(page, "mart-02-at-counter");
  // Shelves area
  await teleport(page, 6, 4, "up");
  await shoot(page, "mart-03-at-shelf");

  // ── GYM ───────────────────────────────────────────────────
  console.log("\n=== GYM ===");
  await enterInterior(page, "gym");
  await shoot(page, "gym-01-spawn");
  // Position next to a statue (known trouble spot)
  await teleport(page, 2, 19, "up");
  await shoot(page, "gym-02-near-statue-left");
  await teleport(page, 7, 19, "up");
  await shoot(page, "gym-03-near-statue-right");
  // Position at a switch
  await teleport(page, 0, 15, "up");
  await shoot(page, "gym-04-at-switch1");
  // Position next to a pole (known trouble spot)
  await teleport(page, 2, 14, "up");
  await shoot(page, "gym-05-near-pole");
  await teleport(page, 4, 12, "up");
  await shoot(page, "gym-06-at-switch2");

  console.log(`\n✅ Screenshots in ${SCREENSHOT_DIR}`);
  await context.close();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
