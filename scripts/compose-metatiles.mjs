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

const MAP_WIDTH = 40;
const MAP_HEIGHT = 20;

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

console.log(
  `  Tileset dimensions: ${tilesetWidth}x${tilesetHeight} (${COMPOSED_COLUMNS} columns, ${rows} rows, ${totalMetatiles} metatiles)`,
);

// --- Bottom-layer tileset ---
const bottomBuf = Buffer.alloc(tilesetWidth * tilesetHeight * 4, 0);
for (let m = 0; m < totalMetatiles; m++) {
  const col = m % COMPOSED_COLUMNS;
  const row = Math.floor(m / COMPOSED_COLUMNS);
  renderMetatileLayer(bottomBuf, tilesetWidth, col * META_PX, row * META_PX, m, "bottom");
}

const bottomOutPath = resolve(ROOT, "public/game/tilesets/mauville_bottom.png");
await sharp(bottomBuf, {
  raw: { width: tilesetWidth, height: tilesetHeight, channels: 4 },
})
  .png()
  .toFile(bottomOutPath);
console.log(`  Written: ${bottomOutPath}`);

// --- Top-layer tileset ---
const topBuf = Buffer.alloc(tilesetWidth * tilesetHeight * 4, 0);
for (let m = 0; m < totalMetatiles; m++) {
  const col = m % COMPOSED_COLUMNS;
  const row = Math.floor(m / COMPOSED_COLUMNS);
  renderMetatileLayer(topBuf, tilesetWidth, col * META_PX, row * META_PX, m, "top");
}

const topOutPath = resolve(ROOT, "public/game/tilesets/mauville_top.png");
await sharp(topBuf, {
  raw: { width: tilesetWidth, height: tilesetHeight, channels: 4 },
})
  .png()
  .toFile(topOutPath);
console.log(`  Written: ${topOutPath}`);

// --- Composed tileset (both layers merged, for reference) ---
const composedBuf = Buffer.alloc(tilesetWidth * tilesetHeight * 4, 0);
for (let m = 0; m < totalMetatiles; m++) {
  const col = m % COMPOSED_COLUMNS;
  const row = Math.floor(m / COMPOSED_COLUMNS);
  renderMetatile(composedBuf, tilesetWidth, col * META_PX, row * META_PX, m);
}

const composedOutPath = resolve(ROOT, "public/game/tilesets/mauville_composed.png");
await sharp(composedBuf, {
  raw: { width: tilesetWidth, height: tilesetHeight, channels: 4 },
})
  .png()
  .toFile(composedOutPath);
console.log(`  Written: ${composedOutPath}`);

// ─── Parse Map Layout ────────────────────────────────────────────────────────

console.log("Parsing map layout...");

const mapBin = readFileSync(
  resolve(ROOT, "public/game/maps/emerald-raw/MauvilleCity/map.bin"),
);

const mapData = []; // metatile IDs
const collisionData = []; // 0 or 1
const elevationData = []; // 0-15

for (let i = 0; i < mapBin.length; i += 2) {
  const word = mapBin.readUInt16LE(i);
  const metatileId = word & 0x3ff;
  const collision = (word >> 10) & 0x3;
  const elevation = (word >> 12) & 0xf;

  mapData.push(metatileId);
  collisionData.push(collision !== 0 ? 1 : 0);
  elevationData.push(elevation);
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

const groundLayerData = mapData.map((id) => id + BOTTOM_FIRSTGID);

// Determine which metatiles have non-transparent top layers by checking rendered pixels.
// A metatile's top layer is "empty" if all 16x16 pixels are fully transparent (alpha=0).
const metatileTopHasContent = new Set();
for (let m = 0; m < totalMetatiles; m++) {
  const col = m % COMPOSED_COLUMNS;
  const row = Math.floor(m / COMPOSED_COLUMNS);
  const baseX = col * META_PX;
  const baseY = row * META_PX;
  let hasOpaque = false;
  for (let py = 0; py < META_PX && !hasOpaque; py++) {
    for (let px = 0; px < META_PX && !hasOpaque; px++) {
      const off = ((baseY + py) * tilesetWidth + (baseX + px)) * 4;
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

// ── Unblock sign tiles ──
// Signs are walkable in the original game — the collision bit is a marker
// that the game code treats specially. We unblock them so the player can
// walk past and interact by facing them.
const eventsPath = resolve(ROOT, "public/game/maps/emerald-raw/MauvilleCity/events.json");
try {
  const events = JSON.parse(readFileSync(eventsPath, "utf8"));
  const signs = events.bg_events?.filter((e) => e.type === "sign") ?? [];
  for (const s of signs) {
    collisionLayerData[s.y * MAP_WIDTH + s.x] = 0;
  }
  console.log(`  Unblocked ${signs.length} sign tiles`);
} catch {
  console.warn("  Could not read events.json to unblock signs");
}

// ── Extra collision: borders + unreachable rooftop areas ──
// The original game prevents access to these via adjacent route maps.
// Since we don't have route transitions yet, we block them explicitly.
let extraCollision = 0;

// Block all 4 borders
for (let x = 0; x < MAP_WIDTH; x++) {
  if (!collisionLayerData[x]) { collisionLayerData[x] = BOTTOM_FIRSTGID; extraCollision++; }
  const bot = (MAP_HEIGHT - 1) * MAP_WIDTH + x;
  if (!collisionLayerData[bot]) { collisionLayerData[bot] = BOTTOM_FIRSTGID; extraCollision++; }
}
for (let y = 0; y < MAP_HEIGHT; y++) {
  if (!collisionLayerData[y * MAP_WIDTH]) { collisionLayerData[y * MAP_WIDTH] = BOTTOM_FIRSTGID; extraCollision++; }
  const right = y * MAP_WIDTH + MAP_WIDTH - 1;
  if (!collisionLayerData[right]) { collisionLayerData[right] = BOTTOM_FIRSTGID; extraCollision++; }
}

// Block rows 0-4 (north rooftops, unreachable without Route 111)
for (let y = 0; y <= 4; y++) {
  for (let x = 0; x < MAP_WIDTH; x++) {
    const idx = y * MAP_WIDTH + x;
    if (!collisionLayerData[idx]) { collisionLayerData[idx] = BOTTOM_FIRSTGID; extraCollision++; }
  }
}

// Block rows 11-12 (south building rooftops, unreachable from the road)
for (let y = 11; y <= 12; y++) {
  for (let x = 0; x < MAP_WIDTH; x++) {
    const idx = y * MAP_WIDTH + x;
    if (!collisionLayerData[idx]) { collisionLayerData[idx] = BOTTOM_FIRSTGID; extraCollision++; }
  }
}

console.log(`  Extra collision tiles added: ${extraCollision}`);
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
      data: aboveLayerData,
      height: MAP_HEIGHT,
      id: 2,
      name: "Above",
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
      id: 3,
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
  nextlayerid: 4,
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
      imageheight: tilesetHeight,
      imagewidth: tilesetWidth,
      margin: 0,
      name: "mauville_bottom",
      spacing: 0,
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
    {
      columns: COMPOSED_COLUMNS,
      firstgid: TOP_FIRSTGID,
      image: "../tilesets/mauville_top.png",
      imageheight: tilesetHeight,
      imagewidth: tilesetWidth,
      margin: 0,
      name: "mauville_top",
      spacing: 0,
      tilecount: totalMetatiles,
      tileheight: META_PX,
      tilewidth: META_PX,
    },
  ],
  type: "map",
  version: "1.10",
  width: MAP_WIDTH,
};

const mapOutPath = resolve(ROOT, "public/game/maps/mauville.json");
writeFileSync(mapOutPath, JSON.stringify(tiledMap, null, 2));
console.log(`  Written: ${mapOutPath}`);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("\nDone!");
console.log(`  Bottom tileset: ${bottomOutPath}`);
console.log(`  Top tileset:    ${topOutPath}`);
console.log(`  Composed:       ${composedOutPath}`);
console.log(`  Map:            ${mapOutPath}`);
console.log(
  `  Tileset size: ${tilesetWidth}x${tilesetHeight} (${totalMetatiles} metatiles in ${COMPOSED_COLUMNS}x${rows} grid)`,
);
console.log(`  Map size: ${MAP_WIDTH}x${MAP_HEIGHT} metatiles (${MAP_WIDTH * META_PX}x${MAP_HEIGHT * META_PX} pixels)`);
