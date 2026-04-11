/**
 * compose-party-bg.mjs
 *
 * Composes the Pokemon Emerald party menu background from the pret/pokeemerald
 * decompilation assets:
 *
 *   Input:
 *     - /tmp/pokeemerald/graphics/party_menu/bg.png    (64×64, 8-bit tileset)
 *     - /tmp/pokeemerald/graphics/party_menu/bg.bin    (32×32 GBA tilemap, 2 bytes/entry)
 *
 *   Output:
 *     - public/game/ui/party/bg.png   (240×160 composed background)
 *
 * Run: node scripts/compose-party-bg.mjs
 */
import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "public/game/ui/party");

const POKE_SRC = "/tmp/pokeemerald/graphics/party_menu";
const TILE_PX = 8;
const SCREEN_W = 240; // GBA width in pixels
const SCREEN_H = 160; // GBA height in pixels
const TILES_X = SCREEN_W / TILE_PX; // 30 visible tile columns
const TILES_Y = SCREEN_H / TILE_PX; // 20 visible tile rows
const MAP_STRIDE = 32; // GBA tilemap is always 32 tiles wide

mkdirSync(OUT, { recursive: true });

async function main() {
  // ── 1. Load the tileset PNG as raw RGBA pixel data ──────────────────
  const tilesetMeta = await sharp(resolve(POKE_SRC, "bg.png")).metadata();
  const tilesetW = tilesetMeta.width;  // 64
  const tilesetH = tilesetMeta.height; // 64
  const tilesetCols = tilesetW / TILE_PX; // 8 tile columns

  const tilesetRaw = await sharp(resolve(POKE_SRC, "bg.png"))
    .ensureAlpha()
    .raw()
    .toBuffer();

  console.log(`Tileset: ${tilesetW}×${tilesetH}, ${tilesetCols} tile columns`);

  // ── 2. Parse the GBA tilemap (bg.bin) ───────────────────────────────
  const mapBin = readFileSync(resolve(POKE_SRC, "bg.bin"));
  console.log(`Tilemap: ${mapBin.length} bytes (${mapBin.length / 2} entries)`);

  // ── 3. Compose the 240×160 background ───────────────────────────────
  const outBuf = Buffer.alloc(SCREEN_W * SCREEN_H * 4); // RGBA

  for (let ty = 0; ty < TILES_Y; ty++) {
    for (let tx = 0; tx < TILES_X; tx++) {
      const mapIdx = ty * MAP_STRIDE + tx;
      const entry = mapBin.readUInt16LE(mapIdx * 2);

      const tileIdx = entry & 0x3FF;
      const hFlip = (entry >> 10) & 1;
      const vFlip = (entry >> 11) & 1;
      // palette bits 12-15 ignored for 8-bit colormap PNG

      // Source tile position in the tileset
      const srcTileX = (tileIdx % tilesetCols) * TILE_PX;
      const srcTileY = Math.floor(tileIdx / tilesetCols) * TILE_PX;

      // Copy 8×8 tile with optional flipping
      for (let py = 0; py < TILE_PX; py++) {
        for (let px = 0; px < TILE_PX; px++) {
          const sx = hFlip ? (TILE_PX - 1 - px) : px;
          const sy = vFlip ? (TILE_PX - 1 - py) : py;

          const srcOff = ((srcTileY + sy) * tilesetW + (srcTileX + sx)) * 4;
          const dstOff = ((ty * TILE_PX + py) * SCREEN_W + (tx * TILE_PX + px)) * 4;

          outBuf[dstOff + 0] = tilesetRaw[srcOff + 0]; // R
          outBuf[dstOff + 1] = tilesetRaw[srcOff + 1]; // G
          outBuf[dstOff + 2] = tilesetRaw[srcOff + 2]; // B
          outBuf[dstOff + 3] = 255; // Full alpha
        }
      }
    }
  }

  // Write the composed background
  await sharp(outBuf, { raw: { width: SCREEN_W, height: SCREEN_H, channels: 4 } })
    .png()
    .toFile(resolve(OUT, "bg.png"));

  console.log(`✓ Wrote ${OUT}/bg.png (${SCREEN_W}×${SCREEN_H})`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
