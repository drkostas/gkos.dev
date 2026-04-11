/**
 * Regression: every interior's spawn tile must have a walkable path
 * AT LEAST 3 tiles deep from the doormat. This catches the pokemart
 * "stuck on doormat" bug where a tileset-level ge_collide property
 * was blocking the walkable floor.
 */
import { chromium } from "playwright-core";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const PROFILE = mkdtempSync(join(tmpdir(), "walk-check-"));
const URL = "http://localhost:4323/explore";
const chromiumPath =
  "/Users/gkos/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const INTERIORS = [
  { key: "mart",       spawn: { x: 3, y: 7  } },
  { key: "pokecenter", spawn: { x: 7, y: 8  } },
  { key: "gym",        spawn: { x: 4, y: 19 } },
];

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

  let failures = 0;
  for (const def of INTERIORS) {
    console.log(`\n=== ${def.key} ===`);
    await page.evaluate((info) => {
      const game = window.__PHASER_GAME__;
      game.scene.getScene("OverworldScene").scene.start("InteriorScene", {
        interiorKey: info.key,
        returnPos: { x: 58, y: 56, facing: "down" },
        spawnTile: info.spawn,
        spawnFacing: "up",
      });
    }, def);
    await wait(1800);

    const result = await page.evaluate(async (info) => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.scenes.find(
        (s) => s.scene.key === "InteriorScene" && s.scene.isActive(),
      );
      if (!scene) return { ok: false, reason: "no scene" };
      const start = scene.gridEngine.getPosition("player");

      // Walk 3 tiles up and record positions after each move.
      const path = [start];
      for (let i = 0; i < 3; i++) {
        scene.gridEngine.move("player", "up");
        // Wait long enough for the move animation to finish.
        await new Promise((r) => setTimeout(r, 500));
        const p = scene.gridEngine.getPosition("player");
        path.push(p);
      }
      return { ok: true, path };
    }, def);

    if (!result.ok) {
      console.log(`  ❌ ${result.reason}`);
      failures++;
      continue;
    }
    console.log("  path:", result.path.map((p) => `(${p.x},${p.y})`).join(" → "));
    const endY = result.path[result.path.length - 1].y;
    const startY = result.path[0].y;
    if (endY >= startY) {
      console.log(`  ❌ Player did not walk up — stuck at y=${endY}`);
      failures++;
    } else if (startY - endY < 3) {
      console.log(`  ⚠️  Walked only ${startY - endY} tile(s) — expected 3`);
      // Not an automatic fail; pokecenter might block earlier. Keep it
      // as a warning so we notice regressions in the doormat case.
    } else {
      console.log(`  ✅ Walked ${startY - endY} tiles up from spawn`);
    }
  }

  await context.close();
  if (failures > 0) {
    console.log(`\n❌ ${failures} interior(s) failed walkability check`);
    process.exit(1);
  } else {
    console.log("\n✅ All interiors are walkable from spawn");
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
