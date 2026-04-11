/**
 * Gym animation test: captures a screenshot for each animation
 * frame by pausing Phaser's global clock, manually stepping the
 * scene update loop one frame at a time, and shooting between steps.
 *
 * Outputs to .test-screenshots/anim-NN.png with monotonic numbering.
 * Additionally captures 2 "warm-up" frames before the first visible
 * animation tick and 2 "tail" frames after it.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = resolve(__dirname, "..", ".test-screenshots");
try { rmSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PROFILE = mkdtempSync(join(tmpdir(), "gym-anim-"));
const URL = "http://localhost:4323/explore";

function findChromium() {
  return "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(page, name) {
  const p = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: p, clip: { x: 0, y: 0, width: 960, height: 640 } });
  console.log(`  📸 ${name}.png`);
}

async function main() {
  console.log("Launching Chromium…");
  const context = await chromium.launchPersistentContext(PROFILE, {
    executablePath: findChromium(),
    headless: false,
    viewport: { width: 960, height: 640 },
    deviceScaleFactor: 1,
    args: ["--no-sandbox"],
  });
  const page = context.pages()[0] ?? (await context.newPage());

  page.on("console", (m) => {
    if (m.type() === "error") console.log(`  [err] ${m.text()}`);
  });

  console.log(`Opening ${URL}…`);
  await page.goto(URL, { waitUntil: "networkidle" });
  await wait(1200);
  await page.click("body");
  await wait(300);

  // Clear saved state and jump straight into the gym
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
    const overworld = game.scene.getScene("OverworldScene");
    overworld.scene.start("InteriorScene", {
      interiorKey: "gym",
      returnPos: { x: 58, y: 56, facing: "down" },
      spawnTile: { x: 4, y: 19 },
      spawnFacing: "up",
    });
  });
  await wait(2500);

  // Sanity check: scene is active and has animated sprites registered
  const sanity = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game.scene.scenes.find(
      (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
    );
    if (!scene) return { ok: false, reason: "no active InteriorScene" };
    return {
      ok: true,
      animatedCount: scene.gymAnimatedFgSprites?.length ?? 0,
      timerMs: scene.gymAnimTimerMs,
      frame: scene.gymAnimFrame,
    };
  });
  console.log("Sanity:", JSON.stringify(sanity));

  if (!sanity.ok || sanity.animatedCount === 0) {
    console.error("No animated sprites registered — aborting.");
    await context.close();
    process.exit(1);
  }

  // Pause the Phaser game loop so we can step it manually
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    game.loop.sleep(); // stop the main loop
  });

  // Step function: force a delta of ~16.67ms (one 60fps frame)
  // by directly calling the active scene's update() and repainting.
  const stepFrame = async (deltaMs = 16.67) => {
    await page.evaluate((delta) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      if (!scene) return;
      scene.update(performance.now(), delta);
      // Force a repaint — Phaser's renderer is tied to the loop
      // which we've stopped. Manually call the render path.
      game.renderer.preRender();
      const sceneMgr = game.scene;
      // Re-render each active scene's sys.displayList
      for (const s of sceneMgr.scenes) {
        if (s.scene.isVisible()) {
          game.renderer.render(
            s,
            s.children,
            s.cameras.main,
          );
        }
      }
      game.renderer.postRender();
    }, deltaMs);
  };

  // Read the current animation state
  const readAnimState = async () => {
    return page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      return {
        timerMs: scene.gymAnimTimerMs,
        frame: scene.gymAnimFrame,
      };
    });
  };

  // ── Step through frames around an animation swap ──
  // Initial: shoot baseline
  await shoot(page, "anim-00-initial");
  console.log("State:", JSON.stringify(await readAnimState()));

  // Warm-up: step a few 16.67ms frames (won't trigger swap yet since
  // the 33.33ms threshold hasn't been reached)
  for (let i = 1; i <= 3; i++) {
    await stepFrame(16.67);
    await shoot(page, `anim-${String(i).padStart(2, "0")}-warmup`);
    console.log(`Frame ${i}:`, JSON.stringify(await readAnimState()));
  }

  // The 3rd warmup should cross the 33ms threshold and flip the frame.
  // Continue stepping to capture several swaps.
  for (let i = 4; i <= 12; i++) {
    await stepFrame(16.67);
    await shoot(page, `anim-${String(i).padStart(2, "0")}-step`);
    console.log(`Frame ${i}:`, JSON.stringify(await readAnimState()));
  }

  console.log("\n✅ Done. Screenshots in .test-screenshots/");
  await wait(1500);
  await context.close();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
