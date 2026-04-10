/**
 * compose-metatiles.mjs
 *
 * Takes raw Pokemon Emerald tileset data from pret/pokeemerald decompilation
 * and produces:
 *   1. Bottom-layer tileset PNG (public/game/tilesets/mauville_bottom.png)
 *   2. Top-layer tileset PNG (public/game/tilesets/mauville_top.png)
 *   3. Composed reference tileset PNG (public/game/tilesets/mauville_composed.png)
 *   4. A Tiled-format JSON map of Mauville City (public/game/maps/mauville.json)
 *      with Ground, Above, and Collision layers for pseudo-3D rendering
 *
 * Binary format references:
 *   - Metatile entry: 16 bytes = 8 tile refs (2 bytes each), bottom-layer[4] + top-layer[4]
 *   - Tile ref word: bits 0-9 = tile index, bit 10 = xflip, bit 11 = yflip, bits 12-15 = palette
 *   - Map entry: 2 bytes, bits 0-9 = metatile ID, bits 10-11 = collision, bits 12-15 = elevation
 *   - JASC palette: 16 colors, index 0 = transparent
 *
 * Run: node scripts/compose-metatiles.mjs
 */
import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RAW = resolve(ROOT, "public/game/tilesets/emerald-raw");

// ─── Configuration ───────────────────────────────────────────────────────────

const TILE_PX = 8; // Raw tile size (8x8 pixels)
const META_PX = 16; // Metatile size (16x16 = 2x2 tiles)
const TILES_PER_ROW_IN_PNG = 16; // 128px / 8px per tile
const COMPOSED_COLUMNS = 16; // Metatiles per row in output tileset

const MAP_WIDTH = 140;  // 50 (route117) + 40 (mauville) + 50 (route118)
const MAP_HEIGHT = 120; // 50 (route111) + 20 (mauville) + 50 (route110)

// Tileset extrusion: number of pixels added around each metatile to prevent
// texture bleeding at tile boundaries when rendered at non-integer zoom.
// With EXTRUDE=1: margin=1, spacing=2, each metatile sits in a (META_PX+2) cell.
const EXTRUDE = 1;
const CELL_PX = META_PX + 2 * EXTRUDE;   // 18 pixels per metatile cell
const TS_MARGIN = EXTRUDE;                // 1 pixel outer margin
const TS_SPACING = 2 * EXTRUDE;           // 2 pixels between metatiles

// ─── Palette Loading ─────────────────────────────────────────────────────────

/**
 * Parse a JASC-PAL file into an array of 16 [R, G, B] triples.
 */
function loadPalette(path) {
  const lines = readFileSync(path, "utf-8").split("\n").map((l) => l.trim());
  // Format: JASC-PAL / 0100 / 16 / then 16 lines of "R G B"
  if (lines[0] !== "JASC-PAL") {
    throw new Error(`Invalid JASC palette: ${path}`);
  }
  const count = parseInt(lines[2], 10);
  const colors = [];
  for (let i = 0; i < count; i++) {
    const parts = lines[3 + i].split(/\s+/).map(Number);
    colors.push([parts[0], parts[1], parts[2]]);
  }
  return colors;
}

/**
 * Load all 16 palettes from a directory (00.pal through 15.pal).
 */
function loadPalettes(dir) {
  const palettes = [];
  for (let i = 0; i < 16; i++) {
    const fname = i.toString().padStart(2, "0") + ".pal";
    palettes.push(loadPalette(resolve(dir, fname)));
  }
  return palettes;
}

console.log("Loading palettes...");
const generalPalettes = loadPalettes(resolve(RAW, "general_palettes"));
const mauvillePalettes = loadPalettes(resolve(RAW, "mauville_palettes"));

// ─── Tile Pixel Index Extraction ─────────────────────────────────────────────

/**
 * The PNG tiles are 4-bit indexed with a grayscale ramp palette:
 *   index 0 = (255,255,255), index 15 = (0,0,0)
 * We reverse-map the decoded RGB back to palette indices (0-15).
 */
const GRAY_VALUES = [
  255, 238, 222, 205, 189, 172, 156, 139, 115, 98, 82, 65, 49, 32, 16, 0,
];
const grayToIndex = new Map();
GRAY_VALUES.forEach((v, i) => grayToIndex.set(v, i));

/**
 * Extract all 8x8 tile pixel indices from a tiles PNG.
 * Returns an array of tiles, each tile is a Uint8Array of 64 palette indices.
 */
async function extractTileIndices(pngPath) {
  const { data, info } = await sharp(pngPath).raw().toBuffer({
    resolveWithObject: true,
  });

  const imgW = info.width;
  const channels = info.channels;
  const tilesX = imgW / TILE_PX;
  const tilesY = info.height / TILE_PX;
  const totalTiles = tilesX * tilesY;

  const tiles = [];
  for (let t = 0; t < totalTiles; t++) {
    const tileCol = t % tilesX;
    const tileRow = Math.floor(t / tilesX);
    const indices = new Uint8Array(64);

    for (let py = 0; py < TILE_PX; py++) {
      for (let px = 0; px < TILE_PX; px++) {
        const imgX = tileCol * TILE_PX + px;
        const imgY = tileRow * TILE_PX + py;
        const offset = (imgY * imgW + imgX) * channels;
        const gray = data[offset]; // R channel (grayscale)
        const idx = grayToIndex.get(gray);
        if (idx === undefined) {
          // Nearest match fallback
          let best = 0;
          let bestDist = 999;
          for (let i = 0; i < GRAY_VALUES.length; i++) {
            const d = Math.abs(gray - GRAY_VALUES[i]);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          }
          indices[py * TILE_PX + px] = best;
        } else {
          indices[py * TILE_PX + px] = idx;
        }
      }
    }
    tiles.push(indices);
  }

  console.log(
    `  Extracted ${tiles.length} tiles from ${pngPath.split("/").pop()} (${tilesX}x${tilesY} grid)`,
  );
  return tiles;
}

console.log("Extracting tile indices from PNGs...");
const generalTiles = await extractTileIndices(
  resolve(RAW, "general_tiles.png"),
);
const mauvilleTiles = await extractTileIndices(
  resolve(RAW, "mauville_tiles.png"),
);

// ─── Metatile Parsing ────────────────────────────────────────────────────────

/**
 * Parse metatile binary data.
 * Each metatile = 16 bytes = 8 tile references (2 bytes each).
 * Returns array of metatiles, each with bottomLayer[4] and topLayer[4].
 * Each tile ref = { tileIndex, xflip, yflip, palette }
 *
 * Layer layout (each 2x2):
 *   [0] = top-left, [1] = top-right, [2] = bottom-left, [3] = bottom-right
 */
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
      if (i < 4) {
        bottomLayer.push(ref);
      } else {
        topLayer.push(ref);
      }
    }

    metatiles.push({ bottomLayer, topLayer });
  }

  console.log(
    `  Parsed ${count} metatiles from ${binPath.split("/").pop()}`,
  );
  return metatiles;
}

console.log("Parsing metatile data...");
const generalMetatiles = parseMetatiles(
  resolve(RAW, "general_metatiles.bin"),
);
const mauvilleMetatiles = parseMetatiles(
  resolve(RAW, "mauville_metatiles.bin"),
);

// Combined metatile list: general (0-511) + mauville (512-1021)
const allMetatiles = [...generalMetatiles, ...mauvilleMetatiles];
console.log(`  Total metatiles: ${allMetatiles.length}`);

// ─── Metatile Attributes (behavior + layerType) ─────────────────────────────
// 2 bytes per metatile in pret's extracted format:
//   bits  0-7:  behavior (walkability/interaction type)
//   bits 12-15: layerType (0 = top renders above player, 1 = below)
//
// Behavior constants from pokeemerald's metatile_behaviors.h:
//   0x10 MB_POND_WATER                  — impassable without surf
//   0x11 MB_INTERIOR_DEEP_WATER         — impassable
//   0x12 MB_DEEP_WATER                  — impassable
//   0x13 MB_WATERFALL                   — impassable
//   0x14 MB_SOOTOPOLIS_DEEP_WATER       — impassable
//   0x15 MB_OCEAN_WATER                 — impassable
//   0x16 MB_PUDDLE                      — WALKABLE (splash effect)
//   0x17 MB_SHALLOW_WATER               — WALKABLE (ankle-deep)
//   0x18 MB_UNUSED_SOOTOPOLIS_DEEP_WATER — impassable
//   0x19 MB_NO_SURFACING                — impassable (water-visual)
//   0x1A MB_UNUSED_SOOTOPOLIS_DEEP_WATER_2 — impassable
// Our "no surf" game blocks everything in the water range EXCEPT
// puddles (0x16) and shallow water (0x17).
const genAttrsBuf = readFileSync(resolve(RAW, "general_metatile_attributes.bin"));
const mauAttrsBuf = readFileSync(resolve(RAW, "mauville_metatile_attributes.bin"));
const metatileBehaviors = new Array(allMetatiles.length).fill(0);
for (let i = 0; i < genAttrsBuf.length / 2; i++) {
  metatileBehaviors[i] = genAttrsBuf.readUInt16LE(i * 2) & 0xff;
}
for (let i = 0; i < mauAttrsBuf.length / 2; i++) {
  metatileBehaviors[512 + i] = mauAttrsBuf.readUInt16LE(i * 2) & 0xff;
}

/** True if this metatile is water that the player shouldn't walk on. */
function isWaterBehavior(behavior) {
  if (behavior >= 0x10 && behavior <= 0x15) return true;
  if (behavior >= 0x18 && behavior <= 0x1a) return true;
  return false;
}

/**
 * Ledge behavior → direction the player can hop OFF the ledge.
 * From pokeemerald's metatile_behaviors.h:
 *   0x38 MB_JUMP_EAST   → hop east (player walks right off the ledge)
 *   0x39 MB_JUMP_WEST   → hop west
 *   0x3a MB_JUMP_NORTH  → hop north
 *   0x3b MB_JUMP_SOUTH  → hop south
 */
const LEDGE_BEHAVIORS = {
  0x38: "right",
  0x39: "left",
  0x3a: "up",
  0x3b: "down",
};

// Pre-compute the set of water metatile IDs so the map parser can mark them.
const waterMetatiles = new Set();
for (let m = 0; m < allMetatiles.length; m++) {
  if (isWaterBehavior(metatileBehaviors[m])) waterMetatiles.add(m);
}
console.log(`  Water metatiles: ${waterMetatiles.size}`);

// Pre-compute the ledge metatile → direction map.
const ledgeMetatileDirection = {};
for (let m = 0; m < allMetatiles.length; m++) {
  const dir = LEDGE_BEHAVIORS[metatileBehaviors[m]];
  if (dir) ledgeMetatileDirection[m] = dir;
}
console.log(`  Ledge metatiles: ${Object.keys(ledgeMetatileDirection).length}`);

// Grass metatiles — MB_TALL_GRASS (0x02), MB_LONG_GRASS (0x03),
// MB_SHORT_GRASS (0x07). Player walking into these tiles triggers a
// brief rustle animation in OverworldScene.
const GRASS_BEHAVIORS = new Set([0x02, 0x03, 0x07, 0x09]);
const grassMetatiles = new Set();
for (let m = 0; m < allMetatiles.length; m++) {
  if (GRASS_BEHAVIORS.has(metatileBehaviors[m])) grassMetatiles.add(m);
}
console.log(`  Grass metatiles: ${grassMetatiles.size}`);

// ─── Metatile Rendering ──────────────────────────────────────────────────────

/**
 * Render a single 8x8 tile with the given palette onto an RGBA buffer.
 * Handles x/y flipping.
 */
function renderTile(
  outBuf,
  outWidth,
  destX,
  destY,
  tileIndices,
  palette,
  xflip,
  yflip,
) {
  for (let py = 0; py < TILE_PX; py++) {
    for (let px = 0; px < TILE_PX; px++) {
      const srcX = xflip ? TILE_PX - 1 - px : px;
      const srcY = yflip ? TILE_PX - 1 - py : py;
      const colorIdx = tileIndices[srcY * TILE_PX + srcX];

      // Skip transparent (palette index 0)
      if (colorIdx === 0) continue;

      const [r, g, b] = palette[colorIdx];
      const outOffset = ((destY + py) * outWidth + (destX + px)) * 4;
      outBuf[outOffset] = r;
      outBuf[outOffset + 1] = g;
      outBuf[outOffset + 2] = b;
      outBuf[outOffset + 3] = 255;
    }
  }
}

/**
 * Render a single metatile (16x16) into an RGBA buffer at the given position.
 * Composites bottom layer first, then top layer on top.
 *
 * @param metatileIndex - index into allMetatiles array, used to select
 *   whether tiles come from general or mauville tileset
 */
function renderMetatile(outBuf, outWidth, destX, destY, metatileIndex) {
  const meta = allMetatiles[metatileIndex];
  if (!meta) return;

  // Determine which tile set and palette set to use
  // General metatiles (0-511) use general tiles + general palettes
  // Mauville metatiles (512+) use mauville tiles + mauville palettes
  //
  // HOWEVER: tile indices within metatile entries reference the combined
  // tileset. In Emerald, the secondary tileset's tiles start after the
  // primary's 512 tiles. So tile indices 0-511 = general, 512+ = mauville (offset by 512).
  //
  // The palettes work similarly: primary metatiles can use palettes 0-5 (from general),
  // secondary metatiles can use palettes 6-11 (from mauville), but in practice
  // the palette index in the tile ref maps to the respective palette set.
  //
  // Actually in Emerald, palettes 0-6 come from the primary tileset and
  // palettes 7-12 from the secondary. Both palette sets have slots 0-15,
  // but the primary "owns" the first 7 and the secondary "owns" the next 6.
  // For our purposes, palettes 0-6 use general_palettes, 7-12 use mauville_palettes.
  //
  // But actually the .pal files we have are the full 16 palettes for each tileset.
  // In the GBA, both tilesets share a single 16-palette space. The primary tileset
  // provides palettes 0-6, and the secondary provides palettes 7-12.
  // Palettes 13-15 are typically for special use.
  //
  // So we build a combined palette array:
  //   Slots 0-6: from general_palettes
  //   Slots 7-12: from mauville_palettes
  //   Slots 13-15: from mauville_palettes (or general, varies)

  const layers = [meta.bottomLayer, meta.topLayer];

  for (const layer of layers) {
    // 2x2 layout: [0]=TL, [1]=TR, [2]=BL, [3]=BR
    const positions = [
      [0, 0], // top-left
      [TILE_PX, 0], // top-right
      [0, TILE_PX], // bottom-left
      [TILE_PX, TILE_PX], // bottom-right
    ];

    for (let i = 0; i < 4; i++) {
      const ref = layer[i];
      const [offX, offY] = positions[i];

      // Get the actual tile pixel data
      let tilePixels;
      if (ref.tileIndex < generalTiles.length) {
        tilePixels = generalTiles[ref.tileIndex];
      } else {
        // Secondary tileset tiles start at index 512
        const secIdx = ref.tileIndex - generalTiles.length;
        if (secIdx >= 0 && secIdx < mauvilleTiles.length) {
          tilePixels = mauvilleTiles[secIdx];
        } else {
          // Out of range, skip
          continue;
        }
      }

      // Get the palette
      const pal = combinedPalettes[ref.palette];
      if (!pal) continue;

      renderTile(
        outBuf,
        outWidth,
        destX + offX,
        destY + offY,
        tilePixels,
        pal,
        ref.xflip,
        ref.yflip,
      );
    }
  }
}

// Build the combined palette (primary palettes 0-6, secondary palettes 7-12)
const combinedPalettes = [];
for (let i = 0; i < 16; i++) {
  if (i <= 6) {
    combinedPalettes.push(generalPalettes[i]);
  } else if (i <= 12) {
    combinedPalettes.push(mauvillePalettes[i]);
  } else {
    // Palettes 13-15: use whichever set has them
    // In practice these are rarely used; use mauville's
    combinedPalettes.push(mauvillePalettes[i]);
  }
}

// ─── Render Individual Layers ────────────────────────────────────────────────

/**
 * Render ONE layer (bottom or top) of a metatile into an RGBA buffer.
 * @param {"bottom"|"top"} which — which layer to render
 */
function renderMetatileLayer(outBuf, outWidth, destX, destY, metatileIndex, which) {
  const meta = allMetatiles[metatileIndex];
  if (!meta) return;

  const layer = which === "bottom" ? meta.bottomLayer : meta.topLayer;

  const positions = [
    [0, 0],
    [TILE_PX, 0],
    [0, TILE_PX],
    [TILE_PX, TILE_PX],
  ];

  for (let i = 0; i < 4; i++) {
    const ref = layer[i];
    const [offX, offY] = positions[i];

    let tilePixels;
    if (ref.tileIndex < generalTiles.length) {
      tilePixels = generalTiles[ref.tileIndex];
    } else {
      const secIdx = ref.tileIndex - generalTiles.length;
      if (secIdx >= 0 && secIdx < mauvilleTiles.length) {
        tilePixels = mauvilleTiles[secIdx];
      } else {
        continue;
      }
    }

    const pal = combinedPalettes[ref.palette];
    if (!pal) continue;

    renderTile(
      outBuf,
      outWidth,
      destX + offX,
      destY + offY,
      tilePixels,
      pal,
      ref.xflip,
      ref.yflip,
    );
  }
}

// ─── Compose Tileset PNGs ────────────────────────────────────────────────────

console.log("Composing metatile tileset PNGs (bottom + top layers)...");

const totalMetatiles = allMetatiles.length;
const rows = Math.ceil(totalMetatiles / COMPOSED_COLUMNS);
const tilesetWidth = COMPOSED_COLUMNS * META_PX;
const tilesetHeight = rows * META_PX;

// Extruded dimensions (1 px extrusion around each metatile).
// Layout:  [margin=1] [meta][ext=1][ext=1][meta][ext=1][ext=1][meta] ... [margin=1]
// Effective cell stride = META_PX + TS_SPACING = 18, with one outer margin.
const extrudedWidth = TS_MARGIN + COMPOSED_COLUMNS * META_PX + (COMPOSED_COLUMNS - 1) * TS_SPACING + TS_MARGIN;
const extrudedHeight = TS_MARGIN + rows * META_PX + (rows - 1) * TS_SPACING + TS_MARGIN;

console.log(
  `  Tileset dimensions (raw): ${tilesetWidth}x${tilesetHeight} (${COMPOSED_COLUMNS} columns, ${rows} rows, ${totalMetatiles} metatiles)`,
);
console.log(
  `  Tileset dimensions (extruded): ${extrudedWidth}x${extrudedHeight} (margin=${TS_MARGIN}, spacing=${TS_SPACING})`,
);

/**
 * For a metatile at (col, row) in the atlas grid, compute the pixel
 * coordinates of its top-left corner inside the EXTRUDED tileset image.
 */
function extrudedPos(col, row) {
  return {
    x: TS_MARGIN + col * (META_PX + TS_SPACING),
    y: TS_MARGIN + row * (META_PX + TS_SPACING),
  };
}

/**
 * After rendering all metatiles into their center positions inside an
 * extruded buffer, copy each metatile's edge pixels outward into the
 * surrounding EXTRUDE-pixel border. This prevents texture bleeding at
 * tile boundaries when rendered at non-integer camera positions or zoom.
 *
 * Only copies edges INTO THE EXTRUDED BORDER of the SAME metatile —
 * never into a neighbor's space (spacing=2 guarantees 1px on each side
 * is the current metatile's own extruded edge).
 */
function extrudeEdges(buf, bufW) {
  const write = (dstX, dstY, srcX, srcY) => {
    const sO = (srcY * bufW + srcX) * 4;
    const dO = (dstY * bufW + dstX) * 4;
    buf[dO] = buf[sO];
    buf[dO + 1] = buf[sO + 1];
    buf[dO + 2] = buf[sO + 2];
    buf[dO + 3] = buf[sO + 3];
  };

  for (let m = 0; m < totalMetatiles; m++) {
    const col = m % COMPOSED_COLUMNS;
    const row = Math.floor(m / COMPOSED_COLUMNS);
    const { x: cx, y: cy } = extrudedPos(col, row);
    // top edge
    for (let px = 0; px < META_PX; px++) {
      for (let i = 1; i <= EXTRUDE; i++) {
        write(cx + px, cy - i, cx + px, cy);
      }
    }
    // bottom edge
    for (let px = 0; px < META_PX; px++) {
      for (let i = 1; i <= EXTRUDE; i++) {
        write(cx + px, cy + META_PX - 1 + i, cx + px, cy + META_PX - 1);
      }
    }
    // left edge
    for (let py = 0; py < META_PX; py++) {
      for (let i = 1; i <= EXTRUDE; i++) {
        write(cx - i, cy + py, cx, cy + py);
      }
    }
    // right edge
    for (let py = 0; py < META_PX; py++) {
      for (let i = 1; i <= EXTRUDE; i++) {
        write(cx + META_PX - 1 + i, cy + py, cx + META_PX - 1, cy + py);
      }
    }
    // corners
    for (let i = 1; i <= EXTRUDE; i++) {
      for (let j = 1; j <= EXTRUDE; j++) {
        write(cx - i, cy - j, cx, cy);                                           // top-left
        write(cx + META_PX - 1 + i, cy - j, cx + META_PX - 1, cy);               // top-right
        write(cx - i, cy + META_PX - 1 + j, cx, cy + META_PX - 1);               // bottom-left
        write(cx + META_PX - 1 + i, cy + META_PX - 1 + j, cx + META_PX - 1, cy + META_PX - 1); // bottom-right
      }
    }
  }
}

// --- Bottom-layer tileset (extruded) ---
const bottomBuf = Buffer.alloc(extrudedWidth * extrudedHeight * 4, 0);
for (let m = 0; m < totalMetatiles; m++) {
  const col = m % COMPOSED_COLUMNS;
  const row = Math.floor(m / COMPOSED_COLUMNS);
  const { x, y } = extrudedPos(col, row);
  renderMetatileLayer(bottomBuf, extrudedWidth, x, y, m, "bottom");
}
extrudeEdges(bottomBuf, extrudedWidth);

const bottomOutPath = resolve(ROOT, "public/game/tilesets/mauville_bottom.png");
await sharp(bottomBuf, {
  raw: { width: extrudedWidth, height: extrudedHeight, channels: 4 },
})
  .png()
  .toFile(bottomOutPath);
console.log(`  Written: ${bottomOutPath}`);

// --- Top-layer tileset (extruded) ---
const topBuf = Buffer.alloc(extrudedWidth * extrudedHeight * 4, 0);
for (let m = 0; m < totalMetatiles; m++) {
  const col = m % COMPOSED_COLUMNS;
  const row = Math.floor(m / COMPOSED_COLUMNS);
  const { x, y } = extrudedPos(col, row);
  renderMetatileLayer(topBuf, extrudedWidth, x, y, m, "top");
}
extrudeEdges(topBuf, extrudedWidth);

const topOutPath = resolve(ROOT, "public/game/tilesets/mauville_top.png");
await sharp(topBuf, {
  raw: { width: extrudedWidth, height: extrudedHeight, channels: 4 },
})
  .png()
  .toFile(topOutPath);
console.log(`  Written: ${topOutPath}`);

// --- Composed tileset (both layers merged, extruded, for reference) ---
const composedBuf = Buffer.alloc(extrudedWidth * extrudedHeight * 4, 0);
for (let m = 0; m < totalMetatiles; m++) {
  const col = m % COMPOSED_COLUMNS;
  const row = Math.floor(m / COMPOSED_COLUMNS);
  const { x, y } = extrudedPos(col, row);
  renderMetatile(composedBuf, extrudedWidth, x, y, m);
}
extrudeEdges(composedBuf, extrudedWidth);

const composedOutPath = resolve(ROOT, "public/game/tilesets/mauville_composed.png");
await sharp(composedBuf, {
  raw: { width: extrudedWidth, height: extrudedHeight, channels: 4 },
})
  .png()
  .toFile(composedOutPath);
console.log(`  Written: ${composedOutPath}`);

// ─── Parse Map Layout ────────────────────────────────────────────────────────

console.log("Parsing map layout...");

const mapBin = readFileSync(
  resolve(ROOT, "public/game/maps/emerald-raw/MauvilleStitched/map.bin"),
);

const mapData = []; // metatile IDs
const collisionData = []; // 0 or 1
const flipData = []; // 0..3 (bit 0 = xflip, bit 1 = yflip)

// Custom repurposed bits (elevation was never used):
//   bit 14 = horizontal flip
//   bit 15 = vertical   flip
const FLIP_X_BIT = 1 << 14;
const FLIP_Y_BIT = 1 << 15;

for (let i = 0; i < mapBin.length; i += 2) {
  const word = mapBin.readUInt16LE(i);
  const metatileId = word & 0x3ff;
  const collision = (word >> 10) & 0x3;
  const flipX = (word & FLIP_X_BIT) !== 0;
  const flipY = (word & FLIP_Y_BIT) !== 0;

  mapData.push(metatileId);
  // Base collision from the map.bin bits, OR the metatile is water
  // (which is walkable via surf in the original game but we force
  // impassable because our game has no surf).
  const isWater = waterMetatiles.has(metatileId);
  collisionData.push(collision !== 0 || isWater ? 1 : 0);
  flipData.push((flipX ? 1 : 0) | (flipY ? 2 : 0));
}

console.log(
  `  Map: ${MAP_WIDTH}x${MAP_HEIGHT} = ${mapData.length} entries`,
);

// Verify dimensions
if (mapData.length !== MAP_WIDTH * MAP_HEIGHT) {
  console.warn(
    `  WARNING: Expected ${MAP_WIDTH * MAP_HEIGHT} entries, got ${mapData.length}`,
  );
}

// Log some stats
const metatileIdSet = new Set(mapData);
const maxMetatile = Math.max(...mapData);
const collisionCount = collisionData.filter((c) => c !== 0).length;
console.log(`  Unique metatile IDs: ${metatileIdSet.size}`);
console.log(`  Max metatile ID: ${maxMetatile}`);
console.log(
  `  Collision tiles: ${collisionCount}/${mapData.length} (${((collisionCount / mapData.length) * 100).toFixed(1)}%)`,
);

// ─── Generate Tiled JSON Map ─────────────────────────────────────────────────

console.log("Generating Tiled JSON map...");

// Tiled uses 1-based GIDs (global tile IDs). GID 0 = empty.
//
// We define TWO tilesets:
//   1. "mauville_bottom" — firstgid = 1          (metatile N -> GID N+1)
//   2. "mauville_top"    — firstgid = totalMetatiles + 1
//      (metatile N -> GID totalMetatiles + N + 1)
//
// Layers:
//   "Ground"    — bottom tileset, all metatile IDs
//   "Above"     — top tileset, all metatile IDs (transparent where top layer is empty)
//   "Collision" — bottom tileset, collision markers

const BOTTOM_FIRSTGID = 1;
const TOP_FIRSTGID = totalMetatiles + 1;

// Tiled flip-bit encoding in 32-bit GIDs (Phaser respects these):
//   0x80000000 = flipped horizontally
//   0x40000000 = flipped vertically
//   0x20000000 = flipped diagonally (unused here)
const TILED_FLIP_H = 0x80000000;
const TILED_FLIP_V = 0x40000000;

const groundLayerData = mapData.map((id, i) => {
  let gid = id + BOTTOM_FIRSTGID;
  const f = flipData[i];
  if (f & 1) gid |= TILED_FLIP_H;
  if (f & 2) gid |= TILED_FLIP_V;
  return gid;
});

// Determine which metatiles have non-transparent top layers by checking rendered pixels.
// A metatile's top layer is "empty" if all 16x16 pixels are fully transparent (alpha=0).
// Use the extruded buffer; skip the 1px extrusion border when sampling.
const metatileTopHasContent = new Set();
for (let m = 0; m < totalMetatiles; m++) {
  const col = m % COMPOSED_COLUMNS;
  const row = Math.floor(m / COMPOSED_COLUMNS);
  const { x: baseX, y: baseY } = extrudedPos(col, row);
  let hasOpaque = false;
  for (let py = 0; py < META_PX && !hasOpaque; py++) {
    for (let px = 0; px < META_PX && !hasOpaque; px++) {
      const off = ((baseY + py) * extrudedWidth + (baseX + px)) * 4;
      if (topBuf[off + 3] > 0) hasOpaque = true;
    }
  }
  if (hasOpaque) metatileTopHasContent.add(m);
}
console.log(`  Metatiles with visible top layer: ${metatileTopHasContent.size}/${totalMetatiles}`);

// Above layer: only include GIDs for metatiles whose top layer has actual content.
// Use 0 (no tile) for empty/transparent top layers.
const aboveLayerData = mapData.map((id) =>
  metatileTopHasContent.has(id) ? id + TOP_FIRSTGID : 0
);

// For collision layer, use a non-zero GID where collision exists.
// We use GID 1 (the first tile in the bottom tileset) as a marker for collision tiles.
// Grid Engine reads the ge_collide property to know this layer defines collision.
const collisionLayerData = collisionData.map((c) => (c !== 0 ? BOTTOM_FIRSTGID : 0));

// Stitched map: just use the original map.bin collision bits.
// No extra border or rooftop blocking — routes now surround Mauville.
console.log(`  Total collision: ${collisionLayerData.filter(c => c > 0).length}/${mapData.length}`);

const tiledMap = {
  compressionlevel: -1,
  height: MAP_HEIGHT,
  infinite: false,
  layers: [
    {
      data: groundLayerData,
      height: MAP_HEIGHT,
      id: 1,
      name: "Ground",
      opacity: 1,
      type: "tilelayer",
      visible: true,
      width: MAP_WIDTH,
      x: 0,
      y: 0,
    },
    {
      data: collisionLayerData,
      height: MAP_HEIGHT,
      id: 2,
      name: "Collision",
      opacity: 1,
      type: "tilelayer",
      visible: false,
      width: MAP_WIDTH,
      x: 0,
      y: 0,
      properties: [
        {
          name: "ge_collide",
          type: "bool",
          value: true,
        },
      ],
    },
  ],
  nextlayerid: 3,
  nextobjectid: 1,
  orientation: "orthogonal",
  renderorder: "right-down",
  tiledversion: "1.10.2",
  tileheight: META_PX,
  tilewidth: META_PX,
  tilesets: [
    {
      columns: COMPOSED_COLUMNS,
      firstgid: BOTTOM_FIRSTGID,
      image: "../tilesets/mauville_bottom.png",
      imageheight: extrudedHeight,
      imagewidth: extrudedWidth,
      margin: TS_MARGIN,
      name: "mauville_bottom",
      spacing: TS_SPACING,
      tilecount: totalMetatiles,
      tileheight: META_PX,
      tilewidth: META_PX,
      tiles: [
        {
          id: 0,
          properties: [
            { name: "ge_collide", type: "bool", value: true },
          ],
        },
      ],
    },
  ],
  type: "map",
  version: "1.10",
  width: MAP_WIDTH,
};

const mapOutPath = resolve(ROOT, "public/game/maps/mauville.json");
writeFileSync(mapOutPath, JSON.stringify(tiledMap, null, 2));
console.log(`  Written: ${mapOutPath}`);

// ─── Export Ledge Positions ───────────────────────────────────────────────
//
// Scan the stitched map for tiles whose metatile has a MB_JUMP_* behavior
// and export their positions + hop direction. OverworldScene loads this
// file and uses it to handle one-way ledge movement.
const ledges = [];
for (let y = 0; y < MAP_HEIGHT; y++) {
  for (let x = 0; x < MAP_WIDTH; x++) {
    const metatileId = mapData[y * MAP_WIDTH + x];
    const dir = ledgeMetatileDirection[metatileId];
    if (dir) ledges.push({ x, y, direction: dir });
  }
}
const ledgesPath = resolve(ROOT, "public/game/maps/ledges.json");
writeFileSync(ledgesPath, JSON.stringify(ledges, null, 2));
console.log(`  Ledges: ${ledges.length} in stitched map → ${ledgesPath}`);

// ─── Export Grass Positions ───────────────────────────────────────────────
// Positions of tall/long/short grass in the stitched map. OverworldScene
// uses these to trigger a rustle animation when the player walks onto
// one of these tiles.
const grassTiles = [];
for (let y = 0; y < MAP_HEIGHT; y++) {
  for (let x = 0; x < MAP_WIDTH; x++) {
    const metatileId = mapData[y * MAP_WIDTH + x];
    if (grassMetatiles.has(metatileId)) grassTiles.push({ x, y });
  }
}
const grassPath = resolve(ROOT, "public/game/maps/grass.json");
writeFileSync(grassPath, JSON.stringify(grassTiles, null, 2));
console.log(`  Grass tiles: ${grassTiles.length} → ${grassPath}`);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("\nDone!");
console.log(`  Bottom tileset: ${bottomOutPath}`);
console.log(`  Top tileset:    ${topOutPath}`);
console.log(`  Composed:       ${composedOutPath}`);
console.log(`  Map:            ${mapOutPath}`);
console.log(
  `  Tileset size (extruded): ${extrudedWidth}x${extrudedHeight} (${totalMetatiles} metatiles in ${COMPOSED_COLUMNS}x${rows} grid, margin=${TS_MARGIN}, spacing=${TS_SPACING})`,
);
console.log(`  Map size: ${MAP_WIDTH}x${MAP_HEIGHT} metatiles (${MAP_WIDTH * META_PX}x${MAP_HEIGHT * META_PX} pixels)`);
