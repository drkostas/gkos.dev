/**
 * Hunt for stale beam fragments after switch toggles.
 *
 * After pressing a switch, every puzzle foreground sprite must have
 * its CURRENT texture + frame matching what the Ground layer says.
 * If a sprite's texture is still one of the animation-frame textures
 * (gym_top_frame0 / gym_top_frame1) with a frame that doesn't exist
 * there, Phaser silently renders the previous frame — that's the
 * "stale cyan beam fragment" bug.
 *
 * We press each switch in turn and assert:
 *   1. Every gymFgSprite at a puzzle position has a frame name that
 *      matches "gym_top_<tileIdx>" derived from its ground tile.
 *   2. The sprite's active texture has the frame it's using.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "gym-stale-beams");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "gym-stale-"));
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

async function auditSprites(page) {
  return page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene) return { ok: false, reason: "no scene" };
    const mismatches = [];
    const puzzlePositions = [...(scene.gymPuzzlePositions ?? [])];
    for (const key of puzzlePositions) {
      const [xs, ys] = key.split(",");
      const x = Number(xs);
      const y = Number(ys);
      const ground = scene.gymGroundLayer?.getTileAt(x, y);
      if (!ground) continue;
      const expectedIdx = ground.index - 1;
      const expectedFrame = `gym_top_${expectedIdx}`;
      const sprite = scene.gymFgSprites?.get(key);
      if (!sprite) continue;
      const actualFrame = sprite.frame?.name;
      const actualTex = sprite.texture?.key;
      // Also assert the active texture has the expected frame.
      const tex = scene.textures?.get(actualTex);
      const hasFrame = !!tex && tex.has?.(actualFrame);
      if (actualFrame !== expectedFrame || !hasFrame) {
        mismatches.push({
          pos: key,
          expectedFrame,
          actualFrame,
          actualTex,
          texHasFrame: hasFrame,
        });
      }
    }
    return { ok: true, total: puzzlePositions.length, mismatches };
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

  // Enter gym
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

  let failures = 0;

  async function check(label) {
    const result = await auditSprites(page);
    console.log(
      `\n[${label}] audited ${result.total} puzzle positions:`,
    );
    if (result.mismatches.length === 0) {
      console.log("  ✅ every foreground sprite matches its ground tile");
    } else {
      failures += result.mismatches.length;
      console.log(`  ❌ ${result.mismatches.length} mismatches:`);
      for (const m of result.mismatches.slice(0, 10)) {
        console.log(
          `    ${m.pos}: ground→${m.expectedFrame}, sprite→${m.actualFrame} on ${m.actualTex} (tex has frame: ${m.texHasFrame})`,
        );
      }
    }
  }

  await check("initial");
  await shoot(page, "01-initial");

  for (const id of [1, 2, 3, 4]) {
    await page.evaluate((sid) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      scene.pressGymSwitch(sid);
    }, id);
    await wait(150);
    await check(`after switch ${id}`);
    // Let one full crackle cycle elapse so any stale frame would
    // manifest — push wait a few seconds and re-audit.
    await wait(1200);
    await check(`after switch ${id} + 1.2s (crackle window)`);
    await shoot(page, `02-after-switch${id}`);
  }

  await context.close();
  if (failures > 0) {
    console.log(`\n❌ Total ${failures} stale-frame mismatches found`);
    process.exit(1);
  } else {
    console.log(`\n✅ No stale frames across all switch presses`);
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
