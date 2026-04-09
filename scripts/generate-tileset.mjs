/**
 * generate-tileset.mjs
 *
 * Creates a 32x16 PNG with 2 tiles (each 16x16):
 *   Tile 1 (index 1): green grass   — #4CAF50
 *   Tile 2 (index 2): dark gray wall — #424242
 *
 * Output: public/game/tilesets/placeholder-tiles.png
 */
import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(
  __dirname,
  "../public/game/tilesets/placeholder-tiles.png",
);

const TILE = 16;

// Create raw pixel buffer: 2 tiles side by side (32x16), 4 channels (RGBA)
const width = TILE * 2;
const height = TILE;
const buf = Buffer.alloc(width * height * 4);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    if (x < TILE) {
      // Tile 1: grass green
      buf[idx] = 0x4c; // R
      buf[idx + 1] = 0xaf; // G
      buf[idx + 2] = 0x50; // B
      buf[idx + 3] = 0xff; // A
    } else {
      // Tile 2: dark gray wall
      buf[idx] = 0x42;
      buf[idx + 1] = 0x42;
      buf[idx + 2] = 0x42;
      buf[idx + 3] = 0xff;
    }
  }
}

await sharp(buf, { raw: { width, height, channels: 4 } })
  .png()
  .toFile(outPath);

console.log(`Tileset written to ${outPath} (${width}x${height})`);
