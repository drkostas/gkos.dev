/**
 * Stress test: repeatedly press switches while crackles are active
 * and audit frame/texture consistency. This is the tightest window
 * for the stale-frame bug because a tile swap can happen mid-crackle
 * when the sprite is on gym_top_frame1.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots", "gym-crackle-stress");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "gym-stress-"));
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

  // Force a crackle on every beam, then press a switch mid-crackle,
  // then audit. Repeat for each switch.
  let totalMismatches = 0;
  for (const id of [1, 2, 3, 4]) {
    const result = await page.evaluate((sid) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      // Force all beams into an active crackle state RIGHT NOW
      for (const beam of scene.gymBeams ?? []) {
        for (const spr of beam) {
          spr.setTexture("gym_top_frame1", spr.frame.name);
        }
        scene.gymActiveCrackles.push({ beam, remainingMs: 120 });
      }
      // Immediately press a switch — the swap happens while every
      // beam sprite is on gym_top_frame1.
      scene.pressGymSwitch(sid);
      // Audit
      const mismatches = [];
      for (const key of scene.gymPuzzlePositions ?? []) {
        const [xs, ys] = key.split(",");
        const x = Number(xs);
        const y = Number(ys);
        const ground = scene.gymGroundLayer?.getTileAt(x, y);
        if (!ground) continue;
        const expectedFrame = `gym_top_${ground.index - 1}`;
        const sprite = scene.gymFgSprites?.get(key);
        if (!sprite) continue;
        const tex = scene.textures?.get(sprite.texture?.key);
        const hasFrame = !!tex && tex.has?.(sprite.frame?.name);
        if (sprite.frame?.name !== expectedFrame || !hasFrame) {
          mismatches.push({
            pos: key,
            expected: expectedFrame,
            actualFrame: sprite.frame?.name,
            actualTex: sprite.texture?.key,
            texHasFrame: hasFrame,
          });
        }
      }
      return {
        total: [...scene.gymPuzzlePositions].length,
        mismatches,
      };
    }, id);

    console.log(
      `\n[mid-crackle switch ${id}] audited ${result.total} positions`,
    );
    if (result.mismatches.length === 0) {
      console.log("  ✅ no stale frames");
    } else {
      console.log(`  ❌ ${result.mismatches.length} mismatches:`);
      for (const m of result.mismatches.slice(0, 10)) console.log("   ", m);
      totalMismatches += result.mismatches.length;
    }

    await wait(300);
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, `after-switch${id}.png`),
      clip: { x: 0, y: 0, width: 960, height: 640 },
    });
  }

  await context.close();
  if (totalMismatches > 0) {
    console.log(`\n❌ ${totalMismatches} stale frames found across all presses`);
    process.exit(1);
  } else {
    console.log("\n✅ Stress test passed: no stale frames under mid-crackle swap");
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
