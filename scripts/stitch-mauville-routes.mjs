/**
 * Stitches Mauville City with all 4 connecting routes (deeper slices):
 *   Route111 (north), Route110 (south), Route117 (west), Route118 (east)
 *
 * Takes ROUTE_DEPTH tiles of each route and combines them into a single
 * stitched map.bin. Routes 110/111/117/118 all share Mauville's tileset,
 * so no tileset remapping is needed.
 *
 * The 4 corner regions (NW, NE, SW, SE) are filled with a solid
 * impassable tree-wall metatile so there are no visible black boxes.
 *
 * All route slices are clamped so the map can't grow past the available
 * route data on any side.
 *
 * Run: node scripts/stitch-mauville-routes.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Depth from Mauville edge for each route slice. 50 is a balance
// between enough exploration area and keeping the map manageable;
// slicing can still cut features mid-way but 50 is wide enough to
// include most natural borders of each route.
const ROUTE_DEPTH_N = 50; // bottom 50 rows of Route 111 (140 tall)
const ROUTE_DEPTH_S = 50; // top 50 rows of Route 110 (100 tall)
const ROUTE_DEPTH_W = 50; // rightmost 50 cols of Route 117 (60 wide)
const ROUTE_DEPTH_E = 50; // leftmost 50 cols of Route 118 (80 wide)

// Route map sizes (from layouts.json)
const MAUVILLE_W = 40, MAUVILLE_H = 20;
const R110_W = 40, R110_H = 100;  // south
const R111_W = 40, R111_H = 140;  // north
const R117_W = 60, R117_H = 20;   // west
const R118_W = 80, R118_H = 20;   // east

// Output stitched dimensions
const OUT_W = ROUTE_DEPTH_W + MAUVILLE_W + ROUTE_DEPTH_E; // 90
const OUT_H = ROUTE_DEPTH_N + MAUVILLE_H + ROUTE_DEPTH_S; // 70

// Origin of Mauville in the stitched map
const MAUVILLE_OX = ROUTE_DEPTH_W;
const MAUVILLE_OY = ROUTE_DEPTH_N;

// ─── Gap Fill ───────────────────────────────────────────────────────────────
// The 4 corners outside the routes + Mauville are filled with one of
// TWO impassable metatiles based on which neighboring routes are nearby:
//   - Tree wall (198) near forest/cliff routes (R111 north, R117 west)
//   - Deep water (368) near water routes (R118 east, R110 south)
//
// Each corner picks its fill metatile by looking at which route sides
// are adjacent. We DON'T try to mix metatiles within a corner — caves
// and water shores have specific transition metatiles that can't be
// picked randomly, so we stay with a single self-tiling metatile per
// region. Deep water (368) was verified to self-tile from Route 110's
// cycling-road water region where it appears in large contiguous blocks.
const GAP_TREE = 198;  // Tree wall (self-tiles)
const GAP_WATER = 368; // Deep ocean water (self-tiles)

/**
 * Decide gap-fill metatile at stitched coord (x, y).
 * Only called for cells that aren't already a real route/Mauville tile.
 *
 * Layout recap:
 *   cols:  0..49 = Route 117 (west) | 50..89 = Mauville | 90..139 = Route 118 (east)
 *   rows:  0..49 = Route 111 (north) | 50..69 = Mauville | 70..119 = Route 110 (south)
 *
 * Corner regions:
 *   NW (y<50, x<50):     adjacent to R111 + R117 — forest routes → TREES
 *   NE (y<50, x>=90):    adjacent to R111 + R118 — R118 is coastal → WATER
 *   SW (y>=70, x<50):    adjacent to R117 + R110 — R110 is cycling road water → WATER
 *   SE (y>=70, x>=90):   adjacent to R118 + R110 — both watery → WATER
 */
function gapFillMetatile(x, y) {
  const inNorthRow = y < 50;
  const inSouthRow = y >= 70;
  const inWestCol = x < 50;
  const inEastCol = x >= 90;
  if (inNorthRow && inWestCol) return GAP_TREE;    // NW — forest
  if (inNorthRow && inEastCol) return GAP_WATER;   // NE — ocean
  if (inSouthRow && inWestCol) return GAP_WATER;   // SW — cycling-road water
  if (inSouthRow && inEastCol) return GAP_WATER;   // SE — ocean
  return GAP_TREE;  // shouldn't happen, safe default
}

/** Wrap a metatile id into a map.bin word with the collision bit set. */
function blockedWord(metatileId) {
  return metatileId | (1 << 10);
}

/**
 * Flip bit layout in the 16-bit map word:
 *   bits  0-9:  metatile id
 *   bits 10-11: collision
 *   bit 14:     horizontal (X) flip   ← custom, repurposed from elevation
 *   bit 15:     vertical   (Y) flip   ← custom, repurposed from elevation
 * The original Pokemon Emerald format used bits 12-15 for elevation,
 * which we don't use in this project, so they're free for our flip flags.
 */
const FLIP_X_BIT = 1 << 14;
const FLIP_Y_BIT = 1 << 15;

function readMapBin(path) {
  return readFileSync(path);
}

function getWord(buf, x, y, w) {
  return buf.readUInt16LE((y * w + x) * 2);
}

const mauvilleBin = readMapBin(resolve(ROOT, "public/game/maps/emerald-raw/MauvilleCity/map.bin"));
const r110 = readMapBin(resolve(ROOT, "public/game/maps/emerald-raw/Route110/map.bin"));
const r111 = readMapBin(resolve(ROOT, "public/game/maps/emerald-raw/Route111/map.bin"));
const r117 = readMapBin(resolve(ROOT, "public/game/maps/emerald-raw/Route117/map.bin"));
const r118 = readMapBin(resolve(ROOT, "public/game/maps/emerald-raw/Route118/map.bin"));

// Build output: flat array of 16-bit words, OUT_W x OUT_H
const out = new Uint16Array(OUT_W * OUT_H);

// Fill every cell with an impassable gap metatile first. Any cell that
// turns out to be a real route/Mauville tile is overwritten below.
// The gap metatile is chosen per-corner based on adjacent routes:
// tree wall for forest-side corners, deep water for coastal-side.
for (let y = 0; y < OUT_H; y++) {
  for (let x = 0; x < OUT_W; x++) {
    out[y * OUT_W + x] = blockedWord(gapFillMetatile(x, y));
  }
}

// Copy Mauville into center
for (let y = 0; y < MAUVILLE_H; y++) {
  for (let x = 0; x < MAUVILLE_W; x++) {
    const ox = MAUVILLE_OX + x;
    const oy = MAUVILLE_OY + y;
    out[oy * OUT_W + ox] = getWord(mauvilleBin, x, y, MAUVILLE_W);
  }
}

// Route 111 (north) — take the BOTTOM ROUTE_DEPTH_N rows of Route 111
// and place them above Mauville. Only the 40 cols that Mauville spans.
for (let y = 0; y < ROUTE_DEPTH_N; y++) {
  for (let x = 0; x < MAUVILLE_W; x++) {
    const srcY = R111_H - ROUTE_DEPTH_N + y;
    const srcX = x;
    const ox = MAUVILLE_OX + x;
    const oy = y;
    out[oy * OUT_W + ox] = getWord(r111, srcX, srcY, R111_W);
  }
}

// Route 110 (south) — take the TOP ROUTE_DEPTH_S rows of Route 110
// and place them below Mauville.
for (let y = 0; y < ROUTE_DEPTH_S; y++) {
  for (let x = 0; x < MAUVILLE_W; x++) {
    const srcY = y;
    const srcX = x;
    const ox = MAUVILLE_OX + x;
    const oy = MAUVILLE_OY + MAUVILLE_H + y;
    out[oy * OUT_W + ox] = getWord(r110, srcX, srcY, R110_W);
  }
}

// Route 117 (west) — take the RIGHTMOST ROUTE_DEPTH_W columns and place
// them to the left of Mauville (20 rows, aligned with Mauville vertically).
for (let y = 0; y < MAUVILLE_H; y++) {
  for (let x = 0; x < ROUTE_DEPTH_W; x++) {
    const srcX = R117_W - ROUTE_DEPTH_W + x;
    const srcY = y;
    const ox = x;
    const oy = MAUVILLE_OY + y;
    out[oy * OUT_W + ox] = getWord(r117, srcX, srcY, R117_W);
  }
}

// Route 118 (east) — take the LEFTMOST ROUTE_DEPTH_E columns and place
// them to the right of Mauville.
for (let y = 0; y < MAUVILLE_H; y++) {
  for (let x = 0; x < ROUTE_DEPTH_E; x++) {
    const srcX = x;
    const srcY = y;
    const ox = MAUVILLE_OX + MAUVILLE_W + x;
    const oy = MAUVILLE_OY + y;
    out[oy * OUT_W + ox] = getWord(r118, srcX, srcY, R118_W);
  }
}

// Corners (NW, NE, SW, SE) are left filled with CORNER_WORD from the
// initial fill — they represent impassable forest between the routes.

// Snapshot the post-stitch, pre-patch state so the `reset` patch type
// can restore specific tiles back to their original values.
const originalOut = new Uint16Array(out);

// ─── Post-Processing Patches ────────────────────────────────────────────────
// Declarative list of tile-copy operations applied AFTER the initial
// stitch. Each patch copies metatile data from a source region to a
// target region — used to fix visual gaps where the default fill
// produced abrupt boundaries.
//
// Patch types:
//   copyColToLeft  — for each (srcX, y) in [yStart..yEnd], copy that
//                    cell's word to all (x, y) in [dstXStart..dstXEnd].
//   copyRowUp      — copy the row at srcY (cols xStart..xEnd) upward
//                    to every row in [dstYStart..dstYEnd].
//   copyRowDown    — same as copyRowUp but for rows below.
//   stamp          — copy a single source tile (srcX, srcY) to every
//                    tile in the destination rectangle [dstX1..dstX2,
//                    dstY1..dstY2] inclusive. Optional flipX/flipY
//                    flags toggle the corresponding flip bits on the
//                    destination tiles.
//   copyRect       — copy a source rectangle [sx1..sx2, sy1..sy2] to
//                    the destination rectangle starting at (dx1, dy1).
//                    The rectangles must be the same size.
//   tilePattern    — tile (repeat) a source rectangle to fill a
//                    destination rectangle of any size. The source
//                    wraps around modulo its width/height, producing
//                    the visual appearance of a repeated pattern.
//   reset          — restore the tiles in a rectangle [x1..x2, y1..y2]
//                    to their ORIGINAL values (the route/Mauville data
//                    that was stitched in before any patches ran).
const PATCHES = [
  // User request: extend the column at x=50, rows 70..75 leftward
  // to cover all tiles from x=0..49 on the same rows.
  { type: "copyColToLeft", srcX: 50, yStart: 70, yEnd: 75, dstXStart: 0, dstXEnd: 49 },
  // User request: copy row y=50, cols 91..112 all the way up to
  // rows 0..49 on those same columns.
  { type: "copyRowUp", srcY: 50, xStart: 91, xEnd: 112, dstYStart: 0, dstYEnd: 49 },
  // User request: copy row y=50, cols 115..132 all the way up to
  // rows 0..49 on those same columns.
  { type: "copyRowUp", srcY: 50, xStart: 115, xEnd: 132, dstYStart: 0, dstYEnd: 49 },
  // User request: stamp tile (65, 90) across row y=75, cols 0..49.
  { type: "stamp", srcX: 65, srcY: 90, dstX1: 0, dstY1: 75, dstX2: 49, dstY2: 75 },
  // User request: copy tile (50, 50) to (50, 48) and (50, 49).
  { type: "stamp", srcX: 50, srcY: 50, dstX1: 50, dstY1: 48, dstX2: 50, dstY2: 49 },
  // User request: extend the column at x=50, rows 42..48 leftward
  // to cover all tiles from x=0..49 on the same rows.
  { type: "copyColToLeft", srcX: 50, yStart: 42, yEnd: 48, dstXStart: 0, dstXEnd: 49 },
  // User request: tile the horizontal pair (50,49)-(51,49) leftward
  // across rows 48-49, filling x=0..49. The top row (y=48) takes the
  // content of (50, 49) and the bottom row (y=49) takes (51, 49).
  { type: "stamp", srcX: 50, srcY: 49, dstX1: 0, dstY1: 48, dstX2: 49, dstY2: 48 },
  { type: "stamp", srcX: 51, srcY: 49, dstX1: 0, dstY1: 49, dstX2: 49, dstY2: 49 },
  // User request: copy column (91, 47..49) to (90, 47..49).
  { type: "copyRect", sx1: 91, sy1: 47, sx2: 91, sy2: 49, dx1: 90, dy1: 47 },
  // User request: stamp tile (49, 49) across row y=48, cols 0..49.
  { type: "stamp", srcX: 49, srcY: 49, dstX1: 0, dstY1: 48, dstX2: 49, dstY2: 48 },
  // User request: stamp tile (54, 6) across the top-left block
  // cols 0..49, rows 0..39. Achieved in one step because every cell
  // ends up being the same tile anyway.
  { type: "stamp", srcX: 54, srcY: 6, dstX1: 0, dstY1: 0, dstX2: 49, dstY2: 39 },
  // User request: tile the horizontal pair (50,40)-(51,40) leftward
  // across row 40, filling x=0..49. Because the pattern stride is 2,
  // the original x=50,51 columns align with every even/odd x.
  { type: "tilePattern", sx1: 50, sy1: 40, sx2: 51, sy2: 40, dx1: 0, dy1: 40, dx2: 49, dy2: 40 },
  // User request: flip (89, 37) horizontally and put it at (90, 37).
  // (User originally said "vertically" but meant horizontally.)
  { type: "stamp", srcX: 89, srcY: 37, dstX1: 90, dstY1: 37, dstX2: 90, dstY2: 37, flipX: true },
  // User request: flip (34, 54) vertically and put it at (36, 49).
  // (User originally said "horizontally" but meant vertically.)
  { type: "stamp", srcX: 34, srcY: 54, dstX1: 36, dstY1: 49, dstX2: 36, dstY2: 49, flipY: true },
  // User request: flip (32, 54) vertically and put it at (33, 49).
  { type: "stamp", srcX: 32, srcY: 54, dstX1: 33, dstY1: 49, dstX2: 33, dstY2: 49, flipY: true },
  // User request: flip (33, 54) vertically and put it at (34, 49) and (35, 49).
  { type: "stamp", srcX: 33, srcY: 54, dstX1: 34, dstY1: 49, dstX2: 35, dstY2: 49, flipY: true },
  // User request: copy column (27, 49..52) to (0, 49..52).
  { type: "copyRect", sx1: 27, sy1: 49, sx2: 27, sy2: 52, dx1: 0, dy1: 49 },
  // User request: copy (86, 37), flip it left↔right, put it at (90, 36).
  { type: "stamp", srcX: 86, srcY: 37, dstX1: 90, dstY1: 36, dstX2: 90, dstY2: 36, flipX: true },
  // User request: stamp tile (20, 51) across row y=49, cols 0..27.
  { type: "stamp", srcX: 20, srcY: 51, dstX1: 0, dstY1: 49, dstX2: 27, dstY2: 49 },
  // User request: stamp tile (61, 44) across row y=48, cols 0..27.
  { type: "stamp", srcX: 61, srcY: 44, dstX1: 0, dstY1: 48, dstX2: 27, dstY2: 48 },
  // User request: stamp (90, 36) as a staircase diagonal from (90, 35)
  // up to the top, where the x decreases by 1 every 2 rows.
  //   row 35: x=90,  rows 34,33: x=89,  rows 32,31: x=88,  ...
  //   row 0:  x=72
  ...(() => {
    const out = [];
    for (let y = 35; y >= 0; y--) {
      const x = 90 - Math.ceil((35 - y) / 2);
      out.push({ type: "stamp", srcX: 90, srcY: 36, dstX1: x, dstY1: y, dstX2: x, dstY2: y });
    }
    return out;
  })(),
  // User request: copy (86, 36), flip it left↔right, put it at (91, 36).
  { type: "stamp", srcX: 86, srcY: 36, dstX1: 91, dstY1: 36, dstX2: 91, dstY2: 36, flipX: true },
  // User request: copy tile (90, 35) all the way up (col 90, rows 0..34).
  { type: "stamp", srcX: 90, srcY: 35, dstX1: 90, dstY1: 0, dstX2: 90, dstY2: 34 },
  // User request: stamp (87, 29) at column 87, rows 31..33.
  { type: "stamp", srcX: 87, srcY: 29, dstX1: 87, dstY1: 31, dstX2: 87, dstY2: 33 },
  // User request: stamp (88, 30) at multiple positions.
  // (88, 30) → col 88 rows 31..35
  { type: "stamp", srcX: 88, srcY: 30, dstX1: 88, dstY1: 31, dstX2: 88, dstY2: 35 },
  // (88, 30) → col 89 rows 33..35
  { type: "stamp", srcX: 88, srcY: 30, dstX1: 89, dstY1: 33, dstX2: 89, dstY2: 35 },
  // (88, 30) → (87, 33)
  { type: "stamp", srcX: 88, srcY: 30, dstX1: 87, dstY1: 33, dstX2: 87, dstY2: 33 },
  // User request: slide the 2-wide pair (84, 18)-(85, 18) down, starting
  // at row 20 in cols 84-85 and ending at row 28 in cols 85-86.
  // Rows 20-27: cols 84-85; row 28: cols 85-86.
  { type: "stamp", srcX: 84, srcY: 18, dstX1: 84, dstY1: 20, dstX2: 84, dstY2: 27 },
  { type: "stamp", srcX: 85, srcY: 18, dstX1: 85, dstY1: 20, dstX2: 85, dstY2: 27 },
  { type: "stamp", srcX: 84, srcY: 18, dstX1: 85, dstY1: 28, dstX2: 85, dstY2: 28 },
  { type: "stamp", srcX: 85, srcY: 18, dstX1: 86, dstY1: 28, dstX2: 86, dstY2: 28 },
  // User request: copy (86, 28) to its immediate left neighbor (85, 28)
  // and all its upper tiles (col 86, rows 0..27).
  { type: "stamp", srcX: 86, srcY: 28, dstX1: 85, dstY1: 28, dstX2: 85, dstY2: 28 },
  { type: "stamp", srcX: 86, srcY: 28, dstX1: 86, dstY1: 0, dstX2: 86, dstY2: 27 },
  // User request: copy (91, 36) to everything upwards of it (col 91, rows 0..35).
  { type: "stamp", srcX: 91, srcY: 36, dstX1: 91, dstY1: 0, dstX2: 91, dstY2: 35 },
  // User request: reset specific tiles back to their ORIGINAL values
  // (the route/Mauville stitched data before any patches).
  { type: "reset", x1: 80, y1: 16, x2: 80, y2: 16 },
  { type: "reset", x1: 81, y1: 17, x2: 81, y2: 17 },
  { type: "reset", x1: 80, y1: 17, x2: 80, y2: 17 },
  { type: "reset", x1: 82, y1: 19, x2: 82, y2: 19 },
  { type: "reset", x1: 82, y1: 20, x2: 82, y2: 20 },
  { type: "reset", x1: 83, y1: 22, x2: 83, y2: 22 },
  // User request: reset row 28 from col 0 to col 84 back to original values.
  { type: "reset", x1: 0, y1: 28, x2: 84, y2: 28 },
  // User request: reset (81, 20) to original.
  { type: "reset", x1: 81, y1: 20, x2: 81, y2: 20 },
  // User request: copy (86, 29) to (87, 29) and (88, 29).
  { type: "stamp", srcX: 86, srcY: 29, dstX1: 87, dstY1: 29, dstX2: 88, dstY2: 29 },
  // User request: copy (86, 30) to (87, 30), (87, 31), (87, 32).
  { type: "stamp", srcX: 86, srcY: 30, dstX1: 87, dstY1: 30, dstX2: 87, dstY2: 32 },
  // User request: copy (84, 29), flip left↔right, put at (89, 29).
  { type: "stamp", srcX: 84, srcY: 29, dstX1: 89, dstY1: 29, dstX2: 89, dstY2: 29, flipX: true },
  // User request: copy (84, 28), flip left↔right, put at (89, 28).
  { type: "stamp", srcX: 84, srcY: 28, dstX1: 89, dstY1: 28, dstX2: 89, dstY2: 28, flipX: true },
  // User request: copy (89, 28) all the way up (col 89, rows 0..27).
  // Reads the already-patched value at (89, 28), which preserves the
  // flipX bit from the preceding patch.
  { type: "stamp", srcX: 89, srcY: 28, dstX1: 89, dstY1: 0, dstX2: 89, dstY2: 27 },
  // User request: reset (81, 18) to original.
  { type: "reset", x1: 81, y1: 18, x2: 81, y2: 18 },
  // User request: stamp (84, 28) over the rect (87..88, 30..36).
  { type: "stamp", srcX: 84, srcY: 28, dstX1: 87, dstY1: 30, dstX2: 88, dstY2: 36 },
  // User request: copy (86, 30) to col 87, rows 30..36.
  { type: "stamp", srcX: 86, srcY: 30, dstX1: 87, dstY1: 30, dstX2: 87, dstY2: 36 },
  // User request: copy (89, 37) to (88, 37). Read BEFORE the (87, 29)
  // overwrite below.
  { type: "stamp", srcX: 89, srcY: 37, dstX1: 88, dstY1: 37, dstX2: 88, dstY2: 37 },
  // User request: copy (89, 35) to (89, 36).
  { type: "stamp", srcX: 89, srcY: 35, dstX1: 89, dstY1: 36, dstX2: 89, dstY2: 36 },
  // User request: copy (87, 29) to (89, 37).
  { type: "stamp", srcX: 87, srcY: 29, dstX1: 89, dstY1: 37, dstX2: 89, dstY2: 37 },
  // User request: copy (88, 29) and everything above it (col 88, rows 0..29)
  // one tile to the right (col 89, rows 0..29).
  { type: "copyRect", sx1: 88, sy1: 0, sx2: 88, sy2: 29, dx1: 89, dy1: 0 },
  // User request: copy (87, 30..37) one tile to the right (col 88 rows 30..37).
  { type: "copyRect", sx1: 87, sy1: 30, sx2: 87, sy2: 37, dx1: 88, dy1: 30 },
  // User request: copy (87, 37) to (89, 37).
  { type: "stamp", srcX: 87, srcY: 37, dstX1: 89, dstY1: 37, dstX2: 89, dstY2: 37 },
  // User request: (84, 29) flipped left↔right → (90, 29).
  { type: "stamp", srcX: 84, srcY: 29, dstX1: 90, dstY1: 29, dstX2: 90, dstY2: 29, flipX: true },
  // User request: copy (89, 30) to col 90, rows 30..39.
  { type: "stamp", srcX: 89, srcY: 30, dstX1: 90, dstY1: 30, dstX2: 90, dstY2: 39 },
  // User request: copy (90, 37) to (90, 40).
  { type: "stamp", srcX: 90, srcY: 37, dstX1: 90, dstY1: 40, dstX2: 90, dstY2: 40 },
  // User request: copy (90, 36) to (90, 38) and (90, 39).
  { type: "stamp", srcX: 90, srcY: 36, dstX1: 90, dstY1: 38, dstX2: 90, dstY2: 39 },
  // User request: copy (86, 43), flip left↔right, put at (90, 44).
  { type: "stamp", srcX: 86, srcY: 43, dstX1: 90, dstY1: 44, dstX2: 90, dstY2: 44, flipX: true },
  // User request: copy (90, 44) to (90, 40). Reads the already-patched
  // value at (90, 44), preserving the flipX bit set above.
  { type: "stamp", srcX: 90, srcY: 44, dstX1: 90, dstY1: 40, dstX2: 90, dstY2: 40 },
  // User request: copy (91, 36) to col 91 rows 37..39.
  { type: "stamp", srcX: 91, srcY: 36, dstX1: 91, dstY1: 37, dstX2: 91, dstY2: 39 },
  // User request: copy (90, 44) to (91, 40).
  { type: "stamp", srcX: 90, srcY: 44, dstX1: 91, dstY1: 40, dstX2: 91, dstY2: 40 },
  // User request: copy (89, 40) to (90, 40).
  { type: "stamp", srcX: 89, srcY: 40, dstX1: 90, dstY1: 40, dstX2: 90, dstY2: 40 },
  // User request: copy (86, 37), flip left↔right, put at (90, 43).
  { type: "stamp", srcX: 86, srcY: 37, dstX1: 90, dstY1: 43, dstX2: 90, dstY2: 43, flipX: true },
  // User request: copy (88, 40), flip left↔right, put at (91, 40).
  { type: "stamp", srcX: 88, srcY: 40, dstX1: 91, dstY1: 40, dstX2: 91, dstY2: 40, flipX: true },
  // User request: copy (91, 40) to (90, 43).
  { type: "stamp", srcX: 91, srcY: 40, dstX1: 90, dstY1: 43, dstX2: 90, dstY2: 43 },
  // User request: copy (91, 39) to (90, 41) and (90, 42).
  { type: "stamp", srcX: 91, srcY: 39, dstX1: 90, dstY1: 41, dstX2: 90, dstY2: 42 },
  // User request: copy column (88, 44..46) to the two columns on its right.
  { type: "copyRect", sx1: 88, sy1: 44, sx2: 88, sy2: 46, dx1: 89, dy1: 44 },
  { type: "copyRect", sx1: 88, sy1: 44, sx2: 88, sy2: 46, dx1: 90, dy1: 44 },
  // User request: (90, 41) → (92, 41), (90, 42) → (92, 42), (89, 43) → (92, 43).
  { type: "stamp", srcX: 90, srcY: 41, dstX1: 92, dstY1: 41, dstX2: 92, dstY2: 41 },
  { type: "stamp", srcX: 90, srcY: 42, dstX1: 92, dstY1: 42, dstX2: 92, dstY2: 42 },
  { type: "stamp", srcX: 89, srcY: 43, dstX1: 92, dstY1: 43, dstX2: 92, dstY2: 43 },
  // User request: copy column (89, 41..43) to the two columns on its
  // right (cols 90 and 91, same rows).
  { type: "copyRect", sx1: 89, sy1: 41, sx2: 89, sy2: 43, dx1: 90, dy1: 41 },
  { type: "copyRect", sx1: 89, sy1: 41, sx2: 89, sy2: 43, dx1: 91, dy1: 41 },
  // User request: copy (92, 42) to everything above it (col 92, rows 0..41).
  { type: "stamp", srcX: 92, srcY: 42, dstX1: 92, dstY1: 0, dstX2: 92, dstY2: 41 },
  // User request: (79, 39) flipped left↔right → (93, 42).
  { type: "stamp", srcX: 79, srcY: 39, dstX1: 93, dstY1: 42, dstX2: 93, dstY2: 42, flipX: true },
  // User request: (86, 43) flipped left↔right → (93, 43).
  { type: "stamp", srcX: 86, srcY: 43, dstX1: 93, dstY1: 43, dstX2: 93, dstY2: 43, flipX: true },
  // User request: copy (91, 40) to (92, 42). Reads the already-patched
  // value at (91, 40), preserving its flipX bit.
  { type: "stamp", srcX: 91, srcY: 40, dstX1: 92, dstY1: 42, dstX2: 92, dstY2: 42 },
  // User request: copy (93, 42) to everything above it (col 93, rows 0..41).
  // Reads (93, 42) which was set above with flipX from (79, 39).
  { type: "stamp", srcX: 93, srcY: 42, dstX1: 93, dstY1: 0, dstX2: 93, dstY2: 41 },
  // User request: copy (91, 41) to (92, 42) and everything above it
  // (col 92 rows 0..42).
  { type: "stamp", srcX: 91, srcY: 41, dstX1: 92, dstY1: 0, dstX2: 92, dstY2: 42 },
  // User request: copy column (90, 44..46) to the 3 columns on its right
  // (cols 91, 92, 93 — rows 44..46 each).
  { type: "stamp", srcX: 90, srcY: 44, dstX1: 91, dstY1: 44, dstX2: 93, dstY2: 44 },
  { type: "stamp", srcX: 90, srcY: 45, dstX1: 91, dstY1: 45, dstX2: 93, dstY2: 45 },
  { type: "stamp", srcX: 90, srcY: 46, dstX1: 91, dstY1: 46, dstX2: 93, dstY2: 46 },
  // User request: copy col 93 (rows 0..43) to col 94 (same rows).
  // Done BEFORE the col 93 modifications below so col 94 captures the
  // current state of col 93.
  { type: "copyRect", sx1: 93, sy1: 0, sx2: 93, sy2: 43, dx1: 94, dy1: 0 },
  // User request: copy (91, 40) to (93, 43). Reads current value at
  // (91, 40), preserving any flipX bit.
  { type: "stamp", srcX: 91, srcY: 40, dstX1: 93, dstY1: 43, dstX2: 93, dstY2: 43 },
  // User request: copy (91, 39) to (93, 42) and everything above it.
  { type: "stamp", srcX: 91, srcY: 39, dstX1: 93, dstY1: 0, dstX2: 93, dstY2: 42 },
  // User request: copy (93, 42) to (94, 46).
  { type: "stamp", srcX: 93, srcY: 42, dstX1: 94, dstY1: 46, dstX2: 94, dstY2: 46 },
  // User request: copy (94, 42) to (93, 42).
  { type: "stamp", srcX: 94, srcY: 42, dstX1: 93, dstY1: 42, dstX2: 93, dstY2: 42 },
  // User request: copy (94, 40) to (94, 42), (94, 43), (94, 44).
  { type: "stamp", srcX: 94, srcY: 40, dstX1: 94, dstY1: 42, dstX2: 94, dstY2: 44 },
  // User request: copy (93, 41) to (93, 42) and (94, 41) to (94, 42).
  { type: "stamp", srcX: 93, srcY: 41, dstX1: 93, dstY1: 42, dstX2: 93, dstY2: 42 },
  { type: "stamp", srcX: 94, srcY: 41, dstX1: 94, dstY1: 42, dstX2: 94, dstY2: 42 },
  // User request: copy (93, 43) to (94, 45).
  { type: "stamp", srcX: 93, srcY: 43, dstX1: 94, dstY1: 45, dstX2: 94, dstY2: 45 },
  // User request: (82, 46) flipped left↔right → (94, 46).
  { type: "stamp", srcX: 82, srcY: 46, dstX1: 94, dstY1: 46, dstX2: 94, dstY2: 46, flipX: true },
  // User request: copy (89, 47) to row 47 cols 90..93.
  { type: "stamp", srcX: 89, srcY: 47, dstX1: 90, dstY1: 47, dstX2: 93, dstY2: 47 },
  // User request: (91, 40) flipped left↔right → (94, 45).
  { type: "stamp", srcX: 91, srcY: 40, dstX1: 94, dstY1: 45, dstX2: 94, dstY2: 45, flipX: true },
  // User request: tile the 2-wide pair (92, 48)-(93, 48) across the
  // 5 tiles immediately to its left (cols 87..91).
  { type: "tilePattern", sx1: 92, sy1: 48, sx2: 93, sy2: 48, dx1: 87, dy1: 48, dx2: 91, dy2: 48 },
  // User request: copy row (87..89, 50) to row 49 (each tile moves up
  // one). copyRect of a 3-wide row.
  { type: "copyRect", sx1: 87, sy1: 50, sx2: 89, sy2: 50, dx1: 87, dy1: 49 },
  // User request: copy (93, 47) to (94, 47).
  { type: "stamp", srcX: 93, srcY: 47, dstX1: 94, dstY1: 47, dstX2: 94, dstY2: 47 },
  // User request: copy (50, 28) to everything to the LEFT on row 28
  // (cols 0..49).
  { type: "stamp", srcX: 50, srcY: 28, dstX1: 0, dstY1: 28, dstX2: 49, dstY2: 28 },
  // User request: copy (132, 49) to all tiles to its right and above
  // — fills the rectangle (132..139, 0..49).
  { type: "stamp", srcX: 132, srcY: 49, dstX1: 132, dstY1: 0, dstX2: 139, dstY2: 49 },
  // User request: (50, 35) → row 35 cols 0..49.
  { type: "stamp", srcX: 50, srcY: 35, dstX1: 0, dstY1: 35, dstX2: 49, dstY2: 35 },
  // User request: (50, 38) → row 38 cols 0..49.
  { type: "stamp", srcX: 50, srcY: 38, dstX1: 0, dstY1: 38, dstX2: 49, dstY2: 38 },
];

for (const patch of PATCHES) {
  if (patch.type === "copyColToLeft") {
    for (let y = patch.yStart; y <= patch.yEnd; y++) {
      const srcWord = out[y * OUT_W + patch.srcX];
      for (let x = patch.dstXStart; x <= patch.dstXEnd; x++) {
        out[y * OUT_W + x] = srcWord;
      }
    }
  } else if (patch.type === "copyRowUp" || patch.type === "copyRowDown") {
    for (let dy = patch.dstYStart; dy <= patch.dstYEnd; dy++) {
      for (let x = patch.xStart; x <= patch.xEnd; x++) {
        out[dy * OUT_W + x] = out[patch.srcY * OUT_W + x];
      }
    }
  } else if (patch.type === "stamp") {
    // Start from the source word, then OR in any flip-bit toggles.
    let stampWord = out[patch.srcY * OUT_W + patch.srcX];
    if (patch.flipX) stampWord |= FLIP_X_BIT;
    if (patch.flipY) stampWord |= FLIP_Y_BIT;
    for (let y = patch.dstY1; y <= patch.dstY2; y++) {
      for (let x = patch.dstX1; x <= patch.dstX2; x++) {
        out[y * OUT_W + x] = stampWord;
      }
    }
  } else if (patch.type === "copyRect") {
    const w = patch.sx2 - patch.sx1 + 1;
    const h = patch.sy2 - patch.sy1 + 1;
    // Snapshot the source region first so we can copy safely even if
    // the destination overlaps the source.
    const buffer = new Array(w * h);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        buffer[dy * w + dx] = out[(patch.sy1 + dy) * OUT_W + (patch.sx1 + dx)];
      }
    }
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        out[(patch.dy1 + dy) * OUT_W + (patch.dx1 + dx)] = buffer[dy * w + dx];
      }
    }
  } else if (patch.type === "reset") {
    for (let y = patch.y1; y <= patch.y2; y++) {
      for (let x = patch.x1; x <= patch.x2; x++) {
        out[y * OUT_W + x] = originalOut[y * OUT_W + x];
      }
    }
  } else if (patch.type === "tilePattern") {
    const sw = patch.sx2 - patch.sx1 + 1;
    const sh = patch.sy2 - patch.sy1 + 1;
    // Snapshot the source so the destination can overlap it.
    const buffer = new Array(sw * sh);
    for (let dy = 0; dy < sh; dy++) {
      for (let dx = 0; dx < sw; dx++) {
        buffer[dy * sw + dx] = out[(patch.sy1 + dy) * OUT_W + (patch.sx1 + dx)];
      }
    }
    // Tile into the destination rect, wrapping coordinates modulo
    // the source dimensions. Alignment is anchored to the source so
    // the pattern is seamless with the source tiles.
    for (let y = patch.dy1; y <= patch.dy2; y++) {
      for (let x = patch.dx1; x <= patch.dx2; x++) {
        // Align pattern to the source position so ...abab[source:abab]abab...
        // remains visually continuous across the source boundary.
        const relX = ((x - patch.sx1) % sw + sw) % sw;
        const relY = ((y - patch.sy1) % sh + sh) % sh;
        out[y * OUT_W + x] = buffer[relY * sw + relX];
      }
    }
  }
}
console.log(`Applied ${PATCHES.length} post-processing patch(es).`);

// Write stitched map.bin
const outBuffer = Buffer.from(out.buffer);
const outPath = resolve(ROOT, "public/game/maps/emerald-raw/MauvilleStitched/map.bin");
const outDir = dirname(outPath);
import("fs").then(({ mkdirSync }) => {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, outBuffer);
  console.log(`Stitched map: ${OUT_W}x${OUT_H} (${out.length} tiles)`);
  console.log(`Mauville origin: (${MAUVILLE_OX}, ${MAUVILLE_OY})`);
  console.log(`Written: ${outPath}`);
});
