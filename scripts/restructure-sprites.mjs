/**
 * restructure-sprites.mjs
 *
 * Converts 9-frame row spritesheets (144x32, 16x32 frames) into 12-frame
 * grid spritesheets (48x128, 3 columns x 4 rows) for Grid Engine's native
 * walkingAnimationMapping: 0 format.
 *
 * Input layout (144x32 — 9 frames in a single row):
 *   [down-walk1, down-stand, down-walk2, up-walk1, up-stand, up-walk2, left-walk1, left-stand, left-walk2]
 *
 * Output layout (48x128 — 3 cols x 4 rows):
 *   Row 0 (frames 0-2):  down   — walk1, stand, walk2
 *   Row 1 (frames 3-5):  left   — walk1, stand, walk2
 *   Row 2 (frames 6-8):  right  — walk1, stand, walk2 (= horizontally flipped left)
 *   Row 3 (frames 9-11): up     — walk1, stand, walk2
 *
 * Also handles special sizes:
 *   - 144x16 sprites (little_boy, little_girl): 16x16 frames -> output 48x64
 *   - 64x32 sprites (nurse): 4 frames only (down only) — skip
 *   - 48x32 sprites (old_man, wattson): 3 frames only (down only) — skip
 *   - 16x16 sprites (item_ball): single frame — skip
 *
 * Run: node scripts/restructure-sprites.mjs
 */
import sharp from "sharp";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { readdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SPRITES_DIR = resolve(ROOT, "public/game/sprites/emerald");

const FRAME_W = 16;

async function restructureSprite(filePath) {
  const name = basename(filePath);
  const meta = await sharp(filePath).metadata();
  const { width, height } = meta;

  const frameH = height; // 32 for most, 16 for little_boy/little_girl

  // Only process 9-frame row sprites (144xH)
  const expectedWidth = FRAME_W * 9; // 144
  if (width !== expectedWidth) {
    console.log(`  SKIP ${name} (${width}x${height} — not a 9-frame row sprite)`);
    return false;
  }

  // Read the raw pixel data
  const { data } = await sharp(filePath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const channels = 4; // RGBA
  const outW = FRAME_W * 3; // 48
  const outH = frameH * 4; // 128 (or 64 for 16px-tall sprites)
  const outBuf = Buffer.alloc(outW * outH * channels, 0);

  /**
   * Copy a single frame from input to output.
   * @param srcFrameIdx — frame index in the input row (0-8)
   * @param dstRow — destination row (0-3)
   * @param dstCol — destination column (0-2)
   * @param flipX — horizontally flip the frame
   */
  function copyFrame(srcFrameIdx, dstRow, dstCol, flipX = false) {
    const srcX0 = srcFrameIdx * FRAME_W;
    const dstX0 = dstCol * FRAME_W;
    const dstY0 = dstRow * frameH;

    for (let py = 0; py < frameH; py++) {
      for (let px = 0; px < FRAME_W; px++) {
        const sx = flipX ? (srcX0 + FRAME_W - 1 - px) : (srcX0 + px);
        const sy = py;

        const srcOff = (sy * width + sx) * channels;
        const dstOff = ((dstY0 + py) * outW + (dstX0 + px)) * channels;

        outBuf[dstOff] = data[srcOff];
        outBuf[dstOff + 1] = data[srcOff + 1];
        outBuf[dstOff + 2] = data[srcOff + 2];
        outBuf[dstOff + 3] = data[srcOff + 3];
      }
    }
  }

  // Input: frames 0-2 = down, 3-5 = up, 6-8 = left
  // Output rows: 0 = down, 1 = left, 2 = right (flipped left), 3 = up

  // Row 0: down (frames 0, 1, 2)
  copyFrame(0, 0, 0);
  copyFrame(1, 0, 1);
  copyFrame(2, 0, 2);

  // Row 1: left (frames 6, 7, 8)
  copyFrame(6, 1, 0);
  copyFrame(7, 1, 1);
  copyFrame(8, 1, 2);

  // Row 2: right (frames 6, 7, 8 flipped horizontally)
  copyFrame(6, 2, 0, true);
  copyFrame(7, 2, 1, true);
  copyFrame(8, 2, 2, true);

  // Row 3: up (frames 3, 4, 5)
  copyFrame(3, 3, 0);
  copyFrame(4, 3, 1);
  copyFrame(5, 3, 2);

  // Write back to the same file (overwrite)
  await sharp(outBuf, {
    raw: { width: outW, height: outH, channels },
  })
    .png()
    .toFile(filePath);

  console.log(`  OK   ${name}: ${width}x${height} -> ${outW}x${outH}`);
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log("Restructuring sprites for Grid Engine native animation...\n");

const files = readdirSync(SPRITES_DIR).filter((f) => f.endsWith(".png"));
let converted = 0;
let skipped = 0;

for (const file of files) {
  const ok = await restructureSprite(resolve(SPRITES_DIR, file));
  if (ok) converted++;
  else skipped++;
}

console.log(`\nDone! Converted: ${converted}, Skipped: ${skipped}`);
