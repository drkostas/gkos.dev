/**
 * gen-water-anim.mjs
 *
 * Post-processing script that generates animated water metatile variants
 * and appends them to the existing bottom tileset. Run AFTER compose-metatiles.mjs.
 *
 * How OG Emerald water animation works:
 *   - The primary tileset has 512 tiles (8x8 sub-tiles)
 *   - Water animation replaces 30 sub-tiles starting at index 448
 *     (= NUM_TILES_IN_PRIMARY - 64, the "animation area")
 *   - 8 frames cycle at ~267ms each (16 game frames at 60fps)
 *   - Frame data is in anim/water/0.png through 7.png (each 16x120 = 30 sub-tiles)
 *
 * What this script does:
 *   1. Identifies water metatiles that use animated sub-tiles (indices 448-477)
 *   2. For each such metatile, renders 7 extra frame variants (frame 0 = existing)
 *   3. Appends the variants as extra rows in mauville_bottom.png
 *   4. Updates mauville.json tileset dimensions and tilecount
 *   5. Outputs water_anim.json for runtime GID swapping
 *
 * Run: node scripts/gen-water-anim.mjs
 */
import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RAW = resolve(ROOT, "public/game/tilesets/emerald-raw");
const ANIM = resolve(ROOT, "public/game/tilesets/anim");
const MAPS = resolve(ROOT, "public/game/maps");
const TILESETS = resolve(ROOT, "public/game/tilesets");

const TILE_PX = 8;
const META_PX = 16;
const COMPOSED_COLUMNS = 16;
const EXTRUDE = 1;
const TS_SPACING = 2 * EXTRUDE;
const TS_MARGIN = EXTRUDE;
const CELL_PX = META_PX + 2 * EXTRUDE;

const MAP_WIDTH = 140;
const MAP_HEIGHT = 120;

// OG animated sub-tile ranges (from tileset_anims.c):
//   Water:         tiles 432-461 (30 tiles), 8 frames (anim/water/0-7.png)
//   SandWaterEdge: tiles 464-473 (10 tiles), 8 frames (anim/sand_water_edge/0-6.png, seq has 8 entries)
//   LandWaterEdge: tiles 480-489 (10 tiles), 4 frames (anim/land_water_edge/0-3.png)
//   Waterfall:     tiles 496-501 (6 tiles),  4 frames (anim/waterfall/0-3.png)
//
// We combine all ranges into one set: any metatile using sub-tiles in
// these ranges gets animated variants generated.

const ANIM_RANGES = [
  { start: 432, count: 30, frames: 8, dir: "water" },
  { start: 464, count: 10, frames: 8, dir: "sand_water_edge" },  // 7 PNGs + seq repeats frame 0
  { start: 480, count: 10, frames: 4, dir: "land_water_edge" },
  { start: 496, count: 6,  frames: 4, dir: "waterfall" },
];

// Union of all animated sub-tile indices
const ANIM_TILE_SET = new Set();
for (const r of ANIM_RANGES) {
  for (let i = r.start; i < r.start + r.count; i++) ANIM_TILE_SET.add(i);
}

// Max frames across all ranges (water and sand_water_edge have 8)
const NUM_FRAMES = 8;

// ─── Palette Loading ────────────────────────────────────────────────

function loadPalette(path) {
  const lines = readFileSync(path, "utf-8").split("\n").map(l => l.trim());
  const count = parseInt(lines[2], 10);
  const colors = [];
  for (let i = 0; i < count; i++) {
    const parts = lines[3 + i].split(/\s+/).map(Number);
    colors.push([parts[0], parts[1], parts[2]]);
  }
  return colors;
}

function loadPalettes(dir) {
  const palettes = [];
  for (let i = 0; i < 16; i++) {
    palettes.push(loadPalette(resolve(dir, i.toString().padStart(2, "0") + ".pal")));
  }
  return palettes;
}

const generalPalettes = loadPalettes(resolve(RAW, "general_palettes"));
const mauvillePalettes = loadPalettes(resolve(RAW, "mauville_palettes"));
const combinedPalettes = [];
for (let i = 0; i < 16; i++) {
  combinedPalettes.push(i <= 6 ? generalPalettes[i] : mauvillePalettes[i]);
}

// ─── Tile Index Extraction ──────────────────────────────────────────

const GRAY_VALUES = [255,238,222,205,189,172,156,139,115,98,82,65,49,32,16,0];
const grayToIndex = new Map();
GRAY_VALUES.forEach((v, i) => grayToIndex.set(v, i));

async function extractTileIndices(pngPath) {
  const { data, info } = await sharp(pngPath).raw().toBuffer({ resolveWithObject: true });
  const imgW = info.width;
  const ch = info.channels;
  const tilesX = imgW / TILE_PX;
  const tilesY = info.height / TILE_PX;
  const tiles = [];
  for (let t = 0; t < tilesX * tilesY; t++) {
    const col = t % tilesX;
    const row = Math.floor(t / tilesX);
    const indices = new Uint8Array(64);
    for (let py = 0; py < TILE_PX; py++) {
      for (let px = 0; px < TILE_PX; px++) {
        const offset = ((row * TILE_PX + py) * imgW + (col * TILE_PX + px)) * ch;
        const gray = data[offset];
        let idx = grayToIndex.get(gray);
        if (idx === undefined) {
          let best = 0, bestD = 999;
          for (let i = 0; i < GRAY_VALUES.length; i++) {
            const d = Math.abs(gray - GRAY_VALUES[i]);
            if (d < bestD) { bestD = d; best = i; }
          }
          idx = best;
        }
        indices[py * TILE_PX + px] = idx;
      }
    }
    tiles.push(indices);
  }
  return tiles;
}

/**
 * Extract sub-tiles from a COLORED animation frame PNG (P mode → RGBA).
 * Returns array of 8x8 RGBA buffers (each 256 bytes = 64 pixels × 4 channels).
 *
 * Palette index 0 is treated as transparent (alpha=0) — on the GBA,
 * index 0 means "show the background layer through." When compositing
 * animation frames onto a static base, transparent pixels keep the
 * static tile's content.
 */
async function extractAnimTilesRGBA(pngPath, markPal0Transparent = false) {
  // First read as palette mode to find palette[0] color
  const rawPalette = await sharp(pngPath).raw().toBuffer({ resolveWithObject: true });
  // Read the palette from the PNG metadata
  const palMeta = await sharp(pngPath).metadata();
  // Get palette[0] RGB by reading the first pixel's color in P mode
  // Actually simpler: read full RGBA, then identify palette[0] pixels
  // by reading the indexed version and marking index-0 pixels transparent.

  // Read as indexed (grayscale of index values)
  const indexedBuf = await sharp(pngPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  // Read as RGBA for color data
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const imgW = info.width;
  const ch = 4;
  const tilesX = imgW / TILE_PX;
  const tilesY = info.height / TILE_PX;
  const tiles = [];
  for (let t = 0; t < tilesX * tilesY; t++) {
    const col = t % tilesX;
    const row = Math.floor(t / tilesX);
    const rgba = Buffer.alloc(64 * 4);
    for (let py = 0; py < TILE_PX; py++) {
      for (let px = 0; px < TILE_PX; px++) {
        const srcOff = ((row * TILE_PX + py) * imgW + (col * TILE_PX + px)) * ch;
        const idxOff = (row * TILE_PX + py) * indexedBuf.info.width + (col * TILE_PX + px);
        const dstOff = (py * TILE_PX + px) * 4;
        rgba[dstOff] = data[srcOff];
        rgba[dstOff + 1] = data[srcOff + 1];
        rgba[dstOff + 2] = data[srcOff + 2];
        // Mark palette index 0 as transparent. The greyscale conversion
        // maps palette index 0 to the darkest value. We detect it by
        // checking if the indexed pixel equals 0 (or very close).
        // Simpler: just check if RGB matches the known palette[0] colors.
        if (markPal0Transparent) {
          const r = data[srcOff], g = data[srcOff+1], b = data[srcOff+2];
          const isPal0 = (r === 24 && g === 41 && b === 82);
          rgba[dstOff + 3] = isPal0 ? 0 : 255;
        } else {
          rgba[dstOff + 3] = data[srcOff + 3];
        }
      }
    }
    tiles.push(rgba);
  }
  return tiles;
}

// ─── Metatile Parsing ───────────────────────────────────────────────

function parseMetatiles(binPath) {
  const buf = readFileSync(binPath);
  const count = buf.length / 16;
  const metatiles = [];
  for (let m = 0; m < count; m++) {
    const offset = m * 16;
    const bottomLayer = [];
    const topLayer = [];
    for (let i = 0; i < 8; i++) {
      const word = buf.readUInt16LE(offset + i * 2);
      const ref = {
        tileIndex: word & 0x3ff,
        xflip: (word >> 10) & 1,
        yflip: (word >> 11) & 1,
        palette: (word >> 12) & 0xf,
      };
      if (i < 4) bottomLayer.push(ref);
      else topLayer.push(ref);
    }
    metatiles.push({ bottomLayer, topLayer });
  }
  return metatiles;
}

// ─── Main ───────────────────────────────────────────────────────────

console.log("Loading data...");
const generalTiles = await extractTileIndices(resolve(RAW, "general_tiles.png"));
const mauvilleTiles = await extractTileIndices(resolve(RAW, "mauville_tiles.png"));

const generalMetatiles = parseMetatiles(resolve(RAW, "general_metatiles.bin"));
const mauvilleMetatiles = parseMetatiles(resolve(RAW, "mauville_metatiles.bin"));
const allMetatiles = [...generalMetatiles, ...mauvilleMetatiles];
const totalMetatiles = allMetatiles.length;

// Load animation frames for ALL ranges as RGBA sub-tiles.
// Each range has its own frame PNGs and sub-tile count.
// We build a map: sub-tile index → frame → RGBA buffer
console.log("Loading animation frames...");

// animTileFrames[subtileIdx][frameIdx] = Buffer(256) RGBA
const animTileFrames = {};

for (const range of ANIM_RANGES) {
  // Determine how many PNGs exist for this range
  const { readdirSync } = await import("fs");
  const pngs = readdirSync(resolve(ANIM, range.dir)).filter(f => f.endsWith(".png")).sort();
  const numPngs = pngs.length;

  // OG frame sequences (from tileset_anims.c):
  //   water: 8 frames, 8 PNGs
  //   sand_water_edge: 8-step sequence [f0,f1,f2,f3,f4,f5,f6,f0], 7 PNGs
  //   land_water_edge: 4 frames, 4 PNGs
  //   waterfall: 4 frames, 4 PNGs
  const frameSequence = [];
  if (range.dir === "sand_water_edge") {
    frameSequence.push(0, 1, 2, 3, 4, 5, 6, 0); // OG sequence
  } else {
    for (let i = 0; i < range.frames; i++) frameSequence.push(i);
  }

  // Load each PNG's sub-tiles
  const pngTiles = [];
  for (let p = 0; p < numPngs; p++) {
    const isSandEdge = range.dir === "sand_water_edge";
    pngTiles.push(await extractAnimTilesRGBA(resolve(ANIM, `${range.dir}/${p}.png`), isSandEdge));
  }

  // Map each sub-tile in this range to its animation frames
  for (let s = 0; s < range.count; s++) {
    const globalIdx = range.start + s;
    animTileFrames[globalIdx] = [];
    for (let f = 0; f < NUM_FRAMES; f++) {
      // For ranges with fewer frames than NUM_FRAMES, cycle
      const seqIdx = f % frameSequence.length;
      const pngIdx = frameSequence[seqIdx];
      if (pngIdx < pngTiles.length && s < pngTiles[pngIdx].length) {
        animTileFrames[globalIdx].push(pngTiles[pngIdx][s]);
      } else {
        // Fallback: use frame 0
        animTileFrames[globalIdx].push(pngTiles[0][s]);
      }
    }
  }

  console.log(`  ${range.dir}: ${numPngs} PNGs, ${range.count} sub-tiles, ${frameSequence.length}-step sequence`);
}

// Parse map to find which metatile IDs appear and use animated tiles
const mapBin = readFileSync(resolve(MAPS, "emerald-raw/MauvilleStitched/map.bin"));

// Find ALL metatiles that use ANY animated sub-tile (not just water-behavior ones)
const animMetaIds = new Set();
const mapMetaIds = [];
for (let i = 0; i < mapBin.length; i += 2) {
  const word = mapBin.readUInt16LE(i);
  const mid = word & 0x3ff;
  mapMetaIds.push(mid);
}

for (const mid of new Set(mapMetaIds)) {
  const meta = allMetatiles[mid];
  if (!meta) continue;
  // Check if ANY bottom or top layer tile uses animated sub-tile indices
  const allRefs = [...meta.bottomLayer, ...meta.topLayer];
  const hasAnim = allRefs.some(ref => ANIM_TILE_SET.has(ref.tileIndex));
  if (hasAnim) animMetaIds.add(mid);
}

console.log(`Metatiles with animated sub-tiles: ${animMetaIds.size} (water + shore + rocks)`);

// ─── Render metatile variants ───────────────────────────────────────

function renderTile(outBuf, outWidth, destX, destY, tileIndices, palette, xflip, yflip) {
  for (let py = 0; py < TILE_PX; py++) {
    for (let px = 0; px < TILE_PX; px++) {
      const srcX = xflip ? TILE_PX - 1 - px : px;
      const srcY = yflip ? TILE_PX - 1 - py : py;
      const colorIdx = tileIndices[srcY * TILE_PX + srcX];
      if (colorIdx === 0) continue;
      const [r, g, b] = palette[colorIdx];
      const off = ((destY + py) * outWidth + (destX + px)) * 4;
      outBuf[off] = r; outBuf[off+1] = g; outBuf[off+2] = b; outBuf[off+3] = 255;
    }
  }
}

function renderAnimTile(outBuf, outWidth, destX, destY, rgbaBuf, xflip, yflip) {
  for (let py = 0; py < TILE_PX; py++) {
    for (let px = 0; px < TILE_PX; px++) {
      const srcX = xflip ? TILE_PX - 1 - px : px;
      const srcY = yflip ? TILE_PX - 1 - py : py;
      const srcOff = (srcY * TILE_PX + srcX) * 4;
      const a = rgbaBuf[srcOff + 3];
      if (a === 0) continue;
      const off = ((destY + py) * outWidth + (destX + px)) * 4;
      outBuf[off] = rgbaBuf[srcOff];
      outBuf[off+1] = rgbaBuf[srcOff+1];
      outBuf[off+2] = rgbaBuf[srcOff+2];
      outBuf[off+3] = a;
    }
  }
}

/**
 * Render one sub-tile ref — either animated (from animTileFrames) or static.
 */
function renderSubTile(outBuf, outWidth, destX, destY, ref, frameIdx) {
  if (ANIM_TILE_SET.has(ref.tileIndex) && animTileFrames[ref.tileIndex]) {
    // Animated sub-tile: use the per-frame RGBA data
    const rgbaBuf = animTileFrames[ref.tileIndex][frameIdx];
    renderAnimTile(outBuf, outWidth, destX, destY, rgbaBuf, ref.xflip, ref.yflip);
  } else {
    // Static sub-tile
    let tilePixels;
    if (ref.tileIndex < generalTiles.length) {
      tilePixels = generalTiles[ref.tileIndex];
    } else {
      const secIdx = ref.tileIndex - generalTiles.length;
      tilePixels = mauvilleTiles[secIdx];
    }
    if (tilePixels) {
      const pal = combinedPalettes[ref.palette];
      if (pal) renderTile(outBuf, outWidth, destX, destY, tilePixels, pal, ref.xflip, ref.yflip);
    }
  }
}

// Sand/shore metatile IDs that need the two-pass approach (static base
// + animated overlay) because their sand_water_edge sub-tiles have
// palette[0] pixels that should show the sand, not render as dark blue.
const SAND_EDGE_RANGE = new Set(Array.from({length: 10}, (_, i) => 464 + i));
const SAND_SHORE_METAS = new Set();
for (const [mid, meta] of allMetatiles.entries()) {
  if (!meta) continue;
  const allRefs = [...meta.bottomLayer, ...meta.topLayer];
  if (allRefs.some(ref => SAND_EDGE_RANGE.has(ref.tileIndex))) {
    SAND_SHORE_METAS.add(mid);
  }
}
console.log(`Sand shore metatiles (two-pass render): ${SAND_SHORE_METAS.size}`);

/**
 * Render one metatile at a specific animation frame.
 *
 * Sand/shore metatiles get two-pass rendering:
 *   Pass 1: static base (all sub-tiles from palette data)
 *   Pass 2: overlay animated sub-tiles (palette[0] = dark navy is
 *           naturally overwritten by the static sand from pass 1)
 * All other metatiles: single-pass direct render (animated sub-tiles
 * replace static ones directly).
 */
function renderMetatileAnimFrame(outBuf, outWidth, destX, destY, metatileIndex, frameIdx) {
  const meta = allMetatiles[metatileIndex];
  if (!meta) return;

  const positions = [[0,0],[TILE_PX,0],[0,TILE_PX],[TILE_PX,TILE_PX]];

  if (SAND_SHORE_METAS.has(metatileIndex)) {
    // Two-pass: static base, then overlay animated sub-tiles
    // Pass 1: render ALL sub-tiles statically
    for (const layer of [meta.bottomLayer, meta.topLayer]) {
      for (let i = 0; i < 4; i++) {
        const ref = layer[i];
        const [offX, offY] = positions[i];
        let tilePixels;
        if (ref.tileIndex < generalTiles.length) {
          tilePixels = generalTiles[ref.tileIndex];
        } else {
          tilePixels = mauvilleTiles[ref.tileIndex - generalTiles.length];
        }
        if (tilePixels) {
          const pal = combinedPalettes[ref.palette];
          if (pal) renderTile(outBuf, outWidth, destX + offX, destY + offY, tilePixels, pal, ref.xflip, ref.yflip);
        }
      }
    }
    // Pass 2: overlay ONLY sand_water_edge animated sub-tiles
    // (their palette[0] dark navy pixels get overwritten by the sand from pass 1)
    for (const layer of [meta.bottomLayer, meta.topLayer]) {
      for (let i = 0; i < 4; i++) {
        const ref = layer[i];
        if (SAND_EDGE_RANGE.has(ref.tileIndex) && animTileFrames[ref.tileIndex]) {
          const [offX, offY] = positions[i];
          const rgbaBuf = animTileFrames[ref.tileIndex][frameIdx];
          renderAnimTile(outBuf, outWidth, destX + offX, destY + offY, rgbaBuf, ref.xflip, ref.yflip);
        }
      }
    }
  } else {
    // Single-pass: direct render (animated sub-tiles replace static ones)
    for (let i = 0; i < 4; i++) {
      const [offX, offY] = positions[i];
      renderSubTile(outBuf, outWidth, destX + offX, destY + offY, meta.bottomLayer[i], frameIdx);
    }
    for (let i = 0; i < 4; i++) {
      const [offX, offY] = positions[i];
      renderSubTile(outBuf, outWidth, destX + offX, destY + offY, meta.topLayer[i], frameIdx);
    }
  }
}

// ─── Generate variant metatiles ─────────────────────────────────────

const sortedAnimMetas = [...animMetaIds].sort((a, b) => a - b);
// Generate ALL 8 frames (including frame 0) so there's no flash when
// cycling back to the start — the static base tile looks different from
// the RGBA animation frames because of palette differences.
const numWaterVariants = sortedAnimMetas.length * NUM_FRAMES;

// Flower animation tiles: 3 frames (base, swayR, swayL).
// Place at indices 1022-1024 so they're right after the original tileset.
const FLOWER_BASE_IDX = 1022;  // GID 1023
const FLOWER_SWAY_R_IDX = 1023; // GID 1024
const FLOWER_SWAY_L_IDX = 1024; // GID 1025
const WATER_VARIANT_START = 1034; // safe gap after flower slots

const newTotalMetatiles = WATER_VARIANT_START + numWaterVariants;
console.log(`Generating ${numWaterVariants} water variant metatiles + 2 flower sway tiles`);

// Load existing GROUND tileset (the one the game actually uses)
const existingImg = await sharp(resolve(TILESETS, "mauville_ground.png")).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const existingW = existingImg.info.width;
const existingH = existingImg.info.height;

// New tileset dimensions
const newRows = Math.ceil(newTotalMetatiles / COMPOSED_COLUMNS);
const newH = TS_MARGIN + newRows * META_PX + (newRows - 1) * TS_SPACING + TS_MARGIN;
const newW = existingW;

console.log(`Tileset: ${existingW}x${existingH} → ${newW}x${newH}`);

// Create new buffer, copy existing data
const newBuf = Buffer.alloc(newW * newH * 4, 0);
existingImg.data.copy(newBuf, 0, 0, Math.min(existingImg.data.length, newBuf.length));

function extrudedPos(col, row) {
  return {
    x: TS_MARGIN + col * (META_PX + TS_SPACING),
    y: TS_MARGIN + row * (META_PX + TS_SPACING),
  };
}

// ── Render flower sway tiles ─────────────────────────────────────
// The flower sway PNGs have transparent pixels where the ground should
// show through. We first render the base flower metatile (index 4),
// then composite the sway frame on top — matching how the OG game
// replaces sub-tiles while keeping the unchanged ones intact.
console.log("Rendering flower sway tiles...");

// The base flower metatile is index 4 (GID 5). Copy its pixels from
// the existing ground tileset as the background for each sway variant.
const FLOWER_BASE_META = 4;
const baseCol = FLOWER_BASE_META % COMPOSED_COLUMNS;
const baseRow = Math.floor(FLOWER_BASE_META / COMPOSED_COLUMNS);
const { x: bx, y: by } = extrudedPos(baseCol, baseRow);

// All 3 flower frames: 0=base, 1=swayR, 2=swayL
for (const [fileIdx, metaIdx] of [[0, FLOWER_BASE_IDX], [1, FLOWER_SWAY_R_IDX], [2, FLOWER_SWAY_L_IDX]]) {
  const { data, info } = await sharp(resolve(ANIM, `flower/${fileIdx}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const col = metaIdx % COMPOSED_COLUMNS;
  const row = Math.floor(metaIdx / COMPOSED_COLUMNS);
  const { x: dx, y: dy } = extrudedPos(col, row);

  // Step 1: Copy base flower metatile pixels from ground tileset as background
  for (let py = 0; py < META_PX; py++) {
    for (let px = 0; px < META_PX; px++) {
      const srcOff = ((by + py) * existingW + (bx + px)) * 4;
      const dstOff = ((dy + py) * newW + (dx + px)) * 4;
      newBuf[dstOff] = existingImg.data[srcOff];
      newBuf[dstOff+1] = existingImg.data[srcOff+1];
      newBuf[dstOff+2] = existingImg.data[srcOff+2];
      newBuf[dstOff+3] = existingImg.data[srcOff+3];
    }
  }

  // Step 2: Composite flower frame on top (only opaque pixels overwrite)
  for (let py = 0; py < META_PX; py++) {
    for (let px = 0; px < META_PX; px++) {
      const srcOff = (py * info.width + px) * 4;
      const a = data[srcOff + 3];
      if (a === 0) continue;
      const dstOff = ((dy + py) * newW + (dx + px)) * 4;
      newBuf[dstOff] = data[srcOff];
      newBuf[dstOff+1] = data[srcOff+1];
      newBuf[dstOff+2] = data[srcOff+2];
      newBuf[dstOff+3] = a;
    }
  }
  console.log(`  flower/${fileIdx}.png → metatile index ${metaIdx} (GID ${metaIdx + 1})`);
}

// ── Render water animation variants ──────────────────────────────
const waterAnimMap = {};
let variantIdx = 0;

for (const metaId of sortedAnimMetas) {
  const frameGids = [];

  for (let f = 0; f < NUM_FRAMES; f++) {
    const newMetaIdx = WATER_VARIANT_START + variantIdx;
    const col = newMetaIdx % COMPOSED_COLUMNS;
    const row = Math.floor(newMetaIdx / COMPOSED_COLUMNS);
    const { x, y } = extrudedPos(col, row);

    renderMetatileAnimFrame(newBuf, newW, x, y, metaId, f);

    frameGids.push(newMetaIdx + 1); // 1-based GID
    variantIdx++;
  }

  waterAnimMap[metaId] = frameGids;
}

console.log(`Rendered ${variantIdx} water variant metatiles`);

// Extrude edges for the new tiles
function extrudeEdgesRange(buf, bufW, startMeta, count) {
  for (let v = 0; v < count; v++) {
    const m = startMeta + v;
    const col = m % COMPOSED_COLUMNS;
    const row = Math.floor(m / COMPOSED_COLUMNS);
    const { x: cx, y: cy } = extrudedPos(col, row);
    const write = (dx, dy, sx, sy) => {
      const sO = (sy * bufW + sx) * 4;
      const dO = (dy * bufW + dx) * 4;
      buf[dO]=buf[sO]; buf[dO+1]=buf[sO+1]; buf[dO+2]=buf[sO+2]; buf[dO+3]=buf[sO+3];
    };
    for (let px = 0; px < META_PX; px++) {
      for (let i = 1; i <= EXTRUDE; i++) { write(cx+px,cy-i,cx+px,cy); write(cx+px,cy+META_PX-1+i,cx+px,cy+META_PX-1); }
    }
    for (let py = 0; py < META_PX; py++) {
      for (let i = 1; i <= EXTRUDE; i++) { write(cx-i,cy+py,cx,cy+py); write(cx+META_PX-1+i,cy+py,cx+META_PX-1,cy+py); }
    }
    for (let i = 1; i <= EXTRUDE; i++) {
      for (let j = 1; j <= EXTRUDE; j++) {
        write(cx-i,cy-j,cx,cy);
        write(cx+META_PX-1+i,cy-j,cx+META_PX-1,cy);
        write(cx-i,cy+META_PX-1+j,cx,cy+META_PX-1);
        write(cx+META_PX-1+i,cy+META_PX-1+j,cx+META_PX-1,cy+META_PX-1);
      }
    }
  }
}

// Extrude edges for ALL new tiles (flower sway + water variants)
extrudeEdgesRange(newBuf, newW, totalMetatiles, newTotalMetatiles - totalMetatiles);

// Write new tileset (ground = the one the game loads)
const outPath = resolve(TILESETS, "mauville_ground.png");
await sharp(newBuf, { raw: { width: newW, height: newH, channels: 4 } }).png().toFile(outPath);
console.log(`Written: ${outPath} (${newW}x${newH})`);

// Update mauville.json tileset dimensions
const mapJson = JSON.parse(readFileSync(resolve(MAPS, "mauville.json"), "utf-8"));
const bottomTs = mapJson.tilesets.find(ts => ts.name === "mauville_bottom");
if (bottomTs) {
  bottomTs.imageheight = newH;
  bottomTs.tilecount = newTotalMetatiles;
  writeFileSync(resolve(MAPS, "mauville.json"), JSON.stringify(mapJson, null, 2));
  console.log(`Updated mauville.json: tilecount=${newTotalMetatiles}, imageheight=${newH}`);
}

// Write water animation mapping
// Build map positions for runtime: for each map tile that uses an animated metatile,
// store its (x, y) and the 8 GIDs to cycle through.
const waterAnimTiles = [];
for (let y = 0; y < MAP_HEIGHT; y++) {
  for (let x = 0; x < MAP_WIDTH; x++) {
    const mid = mapMetaIds[y * MAP_WIDTH + x];
    if (waterAnimMap[mid]) {
      waterAnimTiles.push({ x, y, frames: waterAnimMap[mid] });
    }
  }
}

const animOutPath = resolve(MAPS, "water_anim.json");
writeFileSync(animOutPath, JSON.stringify({
  frameCount: NUM_FRAMES,
  frameDelayMs: 267, // OG: 16 game frames at 60fps ≈ 267ms
  tiles: waterAnimTiles,
}, null, 2));
console.log(`Written: ${animOutPath} (${waterAnimTiles.length} animated tiles)`);
console.log("Done!");
