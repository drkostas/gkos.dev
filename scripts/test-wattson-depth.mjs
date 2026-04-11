/**
 * Screenshot Wattson's position at high zoom so we can see whether
 * the podium tiles draw over him or behind him.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "wattson");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "wattson-"));
const URL = "http://localhost:4323/explore";
const chromiumPath =
  "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(page, name) {
  const p = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({
    path: p,
    clip: { x: 0, y: 0, width: 960, height: 640 },
  });
  console.log(`  📸 ${name}.png`);
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
  await wait(1000);
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

  // Start gym scene
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

  // Zoom in on Wattson at (5, 2), hide the player so nothing else overlaps
  const info = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene) return { ok: false };
    scene.playerSprite.setVisible(false);
    scene.cameras.main.centerOn(5 * 16 + 8, 2 * 16 + 8);
    scene.cameras.main.setZoom(6);

    // Dump Wattson's sprite depth vs the surrounding foreground
    // sprite depths so we can diagnose exactly what's on top of what.
    const wattson = scene.npcSprites.get("gym_wattson");
    const watInfo = wattson
      ? {
          x: wattson.x,
          y: wattson.y,
          depth: wattson.depth,
          visible: wattson.visible,
        }
      : null;

    // Foreground sprites at/around Wattson, with the corresponding
    // Ground layer tile.index so we can confirm our off-by-one.
    const nearby = [];
    for (let dy = -2; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const key = `${5 + dx},${2 + dy}`;
        const fg = scene.gymFgSprites?.get(key);
        const gt = scene.gymGroundLayer?.getTileAt(5 + dx, 2 + dy);
        if (fg || gt) {
          nearby.push({
            pos: key,
            fgDepth: fg?.depth,
            fgVisible: fg?.visible,
            groundIdx: gt?.index,
          });
        }
      }
    }
    // Also dump the tileset tiles with their properties to sanity-check
    // the layerType map.
    const ts = scene.gymGroundLayer?.tilemap.tilesets[0];
    const tsTiles = ts?.tileProperties
      ? Object.entries(ts.tileProperties)
          .slice(0, 5)
          .map(([k, v]) => ({ id: k, props: v }))
      : [];
    return { ok: true, wattson: watInfo, nearby, tsTiles };
  });
  console.log("Wattson state:", JSON.stringify(info, null, 2));

  await wait(300);
  await shoot(page, "01-wattson-zoomed");

  console.log(`\n✅ Screenshots in ${SCREENSHOT_DIR}`);
  await context.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
