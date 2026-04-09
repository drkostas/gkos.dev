/**
 * generate-player.mjs
 *
 * Creates a spritesheet PNG for Grid Engine's walkingAnimationMapping.
 *
 * Grid Engine with `walkingAnimationMapping: 0` expects a spritesheet laid out as:
 *   Row 0 (frames 0-2):   facing down  — stand, walk-left, walk-right
 *   Row 1 (frames 3-5):   facing left  — stand, walk-left, walk-right
 *   Row 2 (frames 6-8):   facing right — stand, walk-left, walk-right
 *   Row 3 (frames 9-11):  facing up    — stand, walk-left, walk-right
 *
 * That's 3 columns x 4 rows = 12 frames, each 16x16.
 * Total image: 48x64 pixels.
 *
 * Each direction has a unique body color; walk frames shift the "feet"
 * marker left/right to give a visible walk cycle.
 *
 * Output: public/game/sprites/player.png
 */
import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../public/game/sprites/player.png");

const TILE = 16;
const COLS = 3; // stand, walk-left, walk-right
const ROWS = 4; // down, left, right, up
const width = TILE * COLS; // 48
const height = TILE * ROWS; // 64

// Colors per direction: body (lower) and head (upper)
const dirColors = [
  { body: [0x21, 0x96, 0xf3], head: [0x64, 0xb5, 0xf6] }, // down  — blue
  { body: [0xf4, 0x43, 0x36], head: [0xef, 0x9a, 0x9a] }, // left  — red
  { body: [0xff, 0x98, 0x00], head: [0xff, 0xcc, 0x80] }, // right — orange
  { body: [0x9c, 0x27, 0xb0], head: [0xce, 0x93, 0xd8] }, // up    — purple
];

const buf = Buffer.alloc(width * height * 4);

for (let row = 0; row < ROWS; row++) {
  const { body, head } = dirColors[row];

  for (let col = 0; col < COLS; col++) {
    const xOff = col * TILE;
    const yOff = row * TILE;

    // Foot offset: stand=center, walk-left=shift left, walk-right=shift right
    const footShift = col === 0 ? 0 : col === 1 ? -2 : 2;

    for (let ly = 0; ly < TILE; ly++) {
      for (let lx = 0; lx < TILE; lx++) {
        const px = xOff + lx;
        const py = yOff + ly;
        const idx = (py * width + px) * 4;

        // 1px transparent border
        if (lx === 0 || lx === TILE - 1 || ly === 0 || ly === TILE - 1) {
          buf[idx] = 0;
          buf[idx + 1] = 0;
          buf[idx + 2] = 0;
          buf[idx + 3] = 0;
          continue;
        }

        // Head: rows 1-5, Body: rows 6-14
        const color = ly < 6 ? head : body;
        buf[idx] = color[0];
        buf[idx + 1] = color[1];
        buf[idx + 2] = color[2];
        buf[idx + 3] = 0xff;

        // Draw a small "foot" marker on the bottom 2 rows to visualise walk cycle
        if (ly >= 13 && ly <= 14) {
          const footCenter = 7 + footShift;
          if (lx >= footCenter - 1 && lx <= footCenter + 1) {
            // Darken the foot area
            buf[idx] = Math.max(0, color[0] - 0x40);
            buf[idx + 1] = Math.max(0, color[1] - 0x40);
            buf[idx + 2] = Math.max(0, color[2] - 0x40);
          }
        }
      }
    }
  }
}

await sharp(buf, { raw: { width, height, channels: 4 } })
  .png()
  .toFile(outPath);

console.log(`Player spritesheet written to ${outPath} (${width}x${height}, ${COLS}x${ROWS} frames)`);
