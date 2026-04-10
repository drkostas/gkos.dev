/**
 * Regenerates the runtime map assets after compose-metatiles.mjs:
 *   - mauville_ground.png (ground tileset: layerType=1 merged, layerType=0 bottom only)
 *   - mauville_foreground.png (foreground image: layerType=0 top layers)
 *
 * This script reads FROM the extruded tilesets produced by
 * compose-metatiles.mjs (margin=1, spacing=2) and writes a NEW extruded
 * ground tileset that the game loads directly. The foreground output is
 * a flat per-tile image of the stitched map, so it doesn't need extrusion.
 *
 * Run after stitch-mauville-routes.mjs + compose-metatiles.mjs.
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const TILE = 16;

// Must match compose-metatiles.mjs
const EXTRUDE = 1;
const TS_MARGIN = EXTRUDE;
const TS_SPACING = 2 * EXTRUDE;
const COMPOSED_COLUMNS = 16;

// Stitched map dimensions (must match stitch-mauville-routes.mjs)
const MAP_W = 140;
const MAP_H = 120;

/** Convert (col, row) in the extruded atlas grid to pixel top-left. */
function extrudedPos(col, row) {
  return {
    x: TS_MARGIN + col * (TILE + TS_SPACING),
    y: TS_MARGIN + row * (TILE + TS_SPACING),
  };
}

// Load metatile attributes to get layerType for each metatile
const genAttrs = readFileSync(resolve(ROOT, "public/game/tilesets/emerald-raw/general_metatile_attributes.bin"));
const mauAttrs = readFileSync(resolve(ROOT, "public/game/tilesets/emerald-raw/mauville_metatile_attributes.bin"));
const layerTypes = [];
for (let i = 0; i < genAttrs.length; i += 2) {
  layerTypes.push((genAttrs.readUInt16LE(i) >> 12) & 0xF);
}
for (let i = 0; i < mauAttrs.length; i += 2) {
  layerTypes.push((mauAttrs.readUInt16LE(i) >> 12) & 0xF);
}

/**
 * Copy the 16x16 pixels of a metatile (plus its 1-px extruded border)
 * from a source extruded buffer to a dest extruded buffer.
 */
function copyMetatileCell(srcBuf, dstBuf, atlasW, col, row) {
  const { x, y } = extrudedPos(col, row);
  const cellSize = TILE + 2 * EXTRUDE;
  const x0 = x - EXTRUDE;
  const y0 = y - EXTRUDE;
  for (let py = 0; py < cellSize; py++) {
    for (let px = 0; px < cellSize; px++) {
      const off = ((y0 + py) * atlasW + (x0 + px)) * 4;
      dstBuf[off] = srcBuf[off];
      dstBuf[off + 1] = srcBuf[off + 1];
      dstBuf[off + 2] = srcBuf[off + 2];
      dstBuf[off + 3] = srcBuf[off + 3];
    }
  }
}

// ─── Build mauville_ground.png (extruded) ────────────────────
// For layerType=1 metatiles, use composed (both layers merged).
// For layerType=0 metatiles, use bottom only.
{
  const composedMeta = await sharp(resolve(ROOT, "public/game/tilesets/mauville_composed.png")).metadata();
  const composedBuf = await sharp(resolve(ROOT, "public/game/tilesets/mauville_composed.png")).ensureAlpha().raw().toBuffer();
  const bottomBuf = await sharp(resolve(ROOT, "public/game/tilesets/mauville_bottom.png")).ensureAlpha().raw().toBuffer();
  const W = composedMeta.width;
  const H = composedMeta.height;

  const outBuf = Buffer.alloc(W * H * 4, 0);
  for (let m = 0; m < layerTypes.length; m++) {
    const col = m % COMPOSED_COLUMNS;
    const row = Math.floor(m / COMPOSED_COLUMNS);
    const source = layerTypes[m] === 1 ? composedBuf : bottomBuf;
    copyMetatileCell(source, outBuf, W, col, row);
  }

  await sharp(outBuf, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(resolve(ROOT, "public/game/tilesets/mauville_ground.png"));
  console.log("Generated mauville_ground.png");
}

// ─── Build mauville_foreground.png ─────────────────────────────
// Full-map image: top layer content for each map tile, excluding layerType=1.
// The output is a flat per-tile image (not a tileset), so no extrusion.
{
  const mapBin = readFileSync(resolve(ROOT, "public/game/maps/emerald-raw/MauvilleStitched/map.bin"));
  const IMG_W = MAP_W * TILE;
  const IMG_H = MAP_H * TILE;

  const topMeta = await sharp(resolve(ROOT, "public/game/tilesets/mauville_top.png")).metadata();
  const topBuf = await sharp(resolve(ROOT, "public/game/tilesets/mauville_top.png")).ensureAlpha().raw().toBuffer();

  const outBuf = Buffer.alloc(IMG_W * IMG_H * 4, 0);
  let included = 0, excludedType1 = 0;

  const FLIP_X_BIT = 1 << 14;
  const FLIP_Y_BIT = 1 << 15;

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const word = mapBin.readUInt16LE((ty * MAP_W + tx) * 2);
      const metatileId = word & 0x3FF;
      const flipX = (word & FLIP_X_BIT) !== 0;
      const flipY = (word & FLIP_Y_BIT) !== 0;
      const layerType = layerTypes[metatileId] || 0;
      if (layerType === 1) { excludedType1++; continue; }

      const srcCol = metatileId % COMPOSED_COLUMNS;
      const srcRow = Math.floor(metatileId / COMPOSED_COLUMNS);
      const { x: srcX, y: srcY } = extrudedPos(srcCol, srcRow);

      let hasPixels = false;
      for (let py = 0; py < TILE; py++) {
        for (let px = 0; px < TILE; px++) {
          // Apply per-tile flip when sampling the source metatile.
          const sPx = flipX ? TILE - 1 - px : px;
          const sPy = flipY ? TILE - 1 - py : py;
          const srcOff = ((srcY + sPy) * topMeta.width + (srcX + sPx)) * 4;
          const alpha = topBuf[srcOff + 3];
          if (alpha === 0) continue;
          hasPixels = true;
          const dstOff = ((ty * TILE + py) * IMG_W + (tx * TILE + px)) * 4;
          outBuf[dstOff] = topBuf[srcOff];
          outBuf[dstOff + 1] = topBuf[srcOff + 1];
          outBuf[dstOff + 2] = topBuf[srcOff + 2];
          outBuf[dstOff + 3] = alpha;
        }
      }
      if (hasPixels) included++;
    }
  }

  await sharp(outBuf, { raw: { width: IMG_W, height: IMG_H, channels: 4 } })
    .png()
    .toFile(resolve(ROOT, "public/game/maps/mauville_foreground.png"));
  console.log(`Generated mauville_foreground.png (${included} tiles, ${excludedType1} excluded layerType=1)`);
}
