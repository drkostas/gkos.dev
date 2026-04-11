/**
 * Verify vertical beam color consistency across the press cycle.
 *
 * A vertical beam is a V1 tile (GV1_On=58 or RV1_On=59) directly above
 * a V2 tile (GV2_On=65 or RV2_On=66). The two halves must always be
 * the same color — mixing a Green V1 with a Red V2 (or vice versa)
 * means the FloorTile transform read the wrong state for (y-1).
 *
 * We walk the puzzle area after every switch press and assert every
 * vertical beam pair is monochromatic.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "gym-vbeams");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "vbeam-"));
const URL = "http://localhost:4323/explore";
const chromiumPath =
  "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// GID constants
const GV1_ON = 58;
const RV1_ON = 59;
const GV2_ON = 65;
const RV2_ON = 66;

async function auditVerticalBeams(page, label) {
  const result = await page.evaluate(
    ({ GV1_ON, RV1_ON, GV2_ON, RV2_ON }) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      if (!scene) return { ok: false, reason: "no scene" };
      const ground = scene.gymGroundLayer;
      const w = ground.tilemap.width;
      const h = ground.tilemap.height;
      const mismatches = [];
      // Also collect all V1/V2 positions for visibility
      const seen = { GV1: [], RV1: [], GV2: [], RV2: [] };
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w; x++) {
          const top = ground.getTileAt(x, y);
          const bot = ground.getTileAt(x, y + 1);
          if (!top || !bot) continue;
          const ti = top.index;
          const bi = bot.index;
          if (ti === GV1_ON) seen.GV1.push([x, y]);
          if (ti === RV1_ON) seen.RV1.push([x, y]);
          if (bi === GV2_ON) seen.GV2.push([x, y + 1]);
          if (bi === RV2_ON) seen.RV2.push([x, y + 1]);
          // Check mismatched pairs
          const topIsGreen = ti === GV1_ON;
          const topIsRed = ti === RV1_ON;
          const botIsGreen = bi === GV2_ON;
          const botIsRed = bi === RV2_ON;
          if (
            (topIsGreen && botIsRed) ||
            (topIsRed && botIsGreen)
          ) {
            mismatches.push({
              pos: `${x},${y}..${x},${y + 1}`,
              topIdx: ti,
              botIdx: bi,
            });
          }
        }
      }
      return { ok: true, mismatches, seen };
    },
    { GV1_ON, RV1_ON, GV2_ON, RV2_ON },
  );

  console.log(`\n[${label}]`);
  console.log(`  GV1 positions: ${result.seen.GV1.length}`);
  console.log(`  RV1 positions: ${result.seen.RV1.length}`);
  console.log(`  GV2 positions: ${result.seen.GV2.length}`);
  console.log(`  RV2 positions: ${result.seen.RV2.length}`);
  if (result.mismatches.length === 0) {
    console.log("  ✅ all vertical beams monochromatic");
  } else {
    console.log(`  ❌ ${result.mismatches.length} mismatched pair(s):`);
    for (const m of result.mismatches) console.log("   ", m);
  }
  return result.mismatches.length;
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

  let total = 0;
  total += await auditVerticalBeams(page, "initial");
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, "01-initial.png"),
    clip: { x: 0, y: 0, width: 960, height: 640 },
  });

  for (const id of [1, 2, 1, 2, 3, 4, 3, 4]) {
    await page.evaluate((sid) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      scene.pressGymSwitch(sid);
    }, id);
    await wait(150);
    total += await auditVerticalBeams(page, `after press ${id}`);
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, `02-after-${id}.png`),
      clip: { x: 0, y: 0, width: 960, height: 640 },
    });
  }

  await context.close();
  if (total > 0) {
    console.log(`\n❌ ${total} total vertical beam mismatches across the cycle`);
    process.exit(1);
  } else {
    console.log("\n✅ All vertical beams stayed monochromatic");
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
