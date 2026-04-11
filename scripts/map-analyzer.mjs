#!/usr/bin/env node
/**
 * scripts/map-analyzer.mjs
 *
 * Reachability + safe-placement analyzer for the stitched Mauville
 * overworld (140x120 tiles). Reads the Collision layer from
 * `public/game/maps/mauville.json`, parses NPC / wild-Pokemon / sign /
 * hidden-item positions from the TypeScript data files, then runs a
 * flood-fill from the player spawn with Grid-Engine-accurate NPC
 * blocking (NPCs and wild Pokemon are characters with collisionGroups,
 * they are NOT in the tilemap — we have to add them to the BFS wall
 * set manually).
 *
 * Produces:
 *
 *   1. game-map-data.json   machine-readable report at repo root
 *   2. map-analyzer.txt     full ASCII visualization of the map
 *   3. stdout summary       at-a-glance report for terminal use
 *
 * What it identifies:
 *
 *   - Per-zone reachability (e.g. Route 110 is 74 % reachable).
 *   - Entities on unreachable tiles (NPC / Pokemon / sign / hidden item),
 *     tagged with whether they're terrain-blocked (behind water/cliffs,
 *     usually by design) or NPC-blocked (cut off by another character,
 *     usually a bug or intentional formation like the Aqua/Magma group).
 *   - NPCs placed on collision tiles (shouldn't happen, always a bug).
 *   - Articulation points — tiles that, if blocked by a future NPC,
 *     would disconnect part of the reachable world (chokepoints).
 *   - Distances between named landmarks (spawn, gym door, mart door…).
 *   - The full set of "safe" tiles for new content placement:
 *       reachable ∧ walkable ∧ not on an entity ∧ not a warp ∧
 *       not an articulation point ∧ not the spawn tile.
 *
 * Usage:
 *
 *   node scripts/map-analyzer.mjs
 *       Full report (JSON + ASCII + stdout summary).
 *
 *   node scripts/map-analyzer.mjs --test X,Y
 *       Placement simulation: adds a virtual NPC at (X,Y), re-runs the
 *       BFS, and reports exactly which tiles and entities would become
 *       unreachable vs. the baseline. Use this BEFORE adding an NPC to
 *       verify the placement doesn't disconnect anything.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── CLI args ───────────────────────────────────────────────────────
// --test X,Y        → simulate placing a 1×1 NPC at (X,Y).
// --test X,Y,W,H    → simulate a multi-tile footprint (W wide, H tall,
//                     anchor at (X,Y) → blocked tiles span
//                     [X, X+W) × [Y, Y+H), matching addFootprint).
// Either form diffs the resulting reachable set against the baseline
// and short-circuits the normal report with an impact summary.
//
// --quiet           → suppress the stdout summary in the full-report
//                     path. Files (game-map-data.json, map-analyzer.txt)
//                     are still written. Useful when driving --test in
//                     a loop or piping only the JSON.
const QUIET = process.argv.includes("--quiet");
let testTile = null;
{
  const i = process.argv.indexOf("--test");
  if (i !== -1 && process.argv[i + 1]) {
    const raw = process.argv[i + 1];
    const parts = raw.split(",").map((s) => parseInt(s.trim(), 10));
    if ((parts.length !== 2 && parts.length !== 4) || parts.some(Number.isNaN)) {
      console.error(`ERROR: --test expects "X,Y" or "X,Y,W,H" (got "${raw}")`);
      process.exit(1);
    }
    testTile = {
      x: parts[0],
      y: parts[1],
      tileWidth: parts.length === 4 ? parts[2] : 1,
      tileHeight: parts.length === 4 ? parts[3] : 1,
    };
    if (testTile.tileWidth < 1 || testTile.tileHeight < 1) {
      console.error(`ERROR: --test footprint W,H must be ≥ 1 (got ${testTile.tileWidth}×${testTile.tileHeight})`);
      process.exit(1);
    }
  }
}

// ── Configuration ──────────────────────────────────────────────────
const SPAWN = { x: 72, y: 58 };

/**
 * Named locations used for distance computations. Some landmarks
 * (gym door, PC door, mart door) sit on BLOCKED warp tiles — the
 * player walks into them to trigger a warp. For those we compute
 * distance-to-the-nearest-reachable-neighbor as the "anchor".
 */
const LANDMARKS = [
  { id: "spawn",          name: "Player Spawn",        x: 72, y: 58 },
  { id: "gym_door_L",     name: "Gym door (L)",        x: 58, y: 55 },
  { id: "gym_door_R",     name: "Gym door (R)",        x: 59, y: 55 },
  { id: "pc_door_L",      name: "Pokemon Center (L)",  x: 72, y: 55 },
  { id: "pc_door_R",      name: "Pokemon Center (R)",  x: 73, y: 55 },
  { id: "mart_door_L",    name: "Mart door (L)",       x: 73, y: 64 },
  { id: "mart_door_R",    name: "Mart door (R)",       x: 74, y: 64 },
  { id: "route117_entry", name: "Route 117 entrance",  x: 49, y: 58 },
  { id: "route118_entry", name: "Route 118 entrance",  x: 90, y: 58 },
  { id: "route110_entry", name: "Route 110 entrance",  x: 62, y: 70 },
  { id: "route111_entry", name: "Route 111 entrance",  x: 62, y: 49 },
  { id: "day_care_man",   name: "Day Care Man",        x: 37, y: 54 },
];

/**
 * Zone definitions mirrored from `src/game/data/zones.ts`. Kept inline
 * so this script has no import dependency on the TS source.
 */
const ZONES = [
  { id: "mauville", name: "MAUVILLE CITY", contains: (x, y) => x >= 50 && x < 90 && y >= 50 && y < 70 },
  { id: "route117", name: "ROUTE 117",     contains: (x, y) => x < 50 && y >= 50 && y < 70 },
  { id: "route118", name: "ROUTE 118",     contains: (x, y) => x >= 90 && y >= 50 && y < 70 },
  { id: "route110", name: "ROUTE 110",     contains: (x, y) => y >= 70 },
  { id: "route111", name: "ROUTE 111",     contains: (x, y) => y < 50 },
];

function getZoneAt(x, y) {
  return ZONES.find((z) => z.contains(x, y));
}

// ── Load collision layer from mauville.json ────────────────────────
const mapJson = JSON.parse(
  readFileSync(resolve(ROOT, "public/game/maps/mauville.json"), "utf-8"),
);
const MAP_W = mapJson.width;
const MAP_H = mapJson.height;
const collisionLayer = mapJson.layers.find((l) => l.name === "Collision");
if (!collisionLayer) {
  console.error("ERROR: Collision layer not found in mauville.json");
  process.exit(1);
}
// In Tiled, gid 0 = empty, any non-zero gid = tile placed. Any tile on
// the Collision layer is a wall (the layer has ge_collide:true and the
// only tile in it is the collision marker, so non-zero ⇒ blocked).
const blocked = new Uint8Array(MAP_W * MAP_H);
for (let i = 0; i < collisionLayer.data.length; i++) {
  blocked[i] = collisionLayer.data[i] > 0 ? 1 : 0;
}

// ── Helpers (index / bounds / walkability) ─────────────────────────
function idx(x, y) { return y * MAP_W + x; }
function inBounds(x, y) { return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H; }
function isCollision(x, y) { return !inBounds(x, y) || blocked[idx(x, y)] === 1; }
function isWalkableCollision(x, y) { return inBounds(x, y) && blocked[idx(x, y)] === 0; }

// ── Entity extraction (TypeScript source files, regex-based) ───────
/**
 * Pull out a top-level `const NAME` array block from a TS source file
 * and return the body text between its enclosing brackets. Used by the
 * helpers below — mirrors validate-npcs.mjs exactly.
 */
function sliceArrayBody(text, arrayName) {
  const start = text.indexOf(`const ${arrayName}`);
  if (start === -1) return null;
  const eqMatch = text.slice(start).match(/=\s*\[/);
  if (!eqMatch) return null;
  const contentStart = start + eqMatch.index + eqMatch[0].length;
  let depth = 0;
  for (let i = contentStart; i < text.length; i++) {
    const c = text[i];
    if (c === "[") depth++;
    else if (c === "]") {
      if (depth === 0) return text.slice(contentStart, i);
      depth--;
    }
  }
  return null;
}

/**
 * Extract { id, position, tileWidth, tileHeight } records from an NPC
 * array body. Each NPC entry is identified by `id: "…"`; we slice the
 * body between successive id markers so fields belonging to different
 * NPCs never bleed across. Multi-tile NPCs (tileWidth/tileHeight > 1)
 * have their entire footprint added to the blocker set later.
 */
function extractNpcs(body, applyOffset) {
  if (!body) return [];
  const idRe = /id:\s*"([^"]+)"/g;
  const idMatches = [];
  let m;
  while ((m = idRe.exec(body)) !== null) idMatches.push({ id: m[1], idx: m.index });
  const out = [];
  for (let i = 0; i < idMatches.length; i++) {
    const start = idMatches[i].idx;
    const end = i + 1 < idMatches.length ? idMatches[i + 1].idx : body.length;
    const slice = body.slice(start, end);
    const posM = slice.match(/position:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}/);
    if (!posM) continue;
    const twM = slice.match(/tileWidth:\s*(\d+)/);
    const thM = slice.match(/tileHeight:\s*(\d+)/);
    let x = parseInt(posM[1], 10);
    let y = parseInt(posM[2], 10);
    if (applyOffset) { x += 50; y += 50; }
    out.push({
      id: idMatches[i].id,
      x,
      y,
      tileWidth: twM ? parseInt(twM[1], 10) : 1,
      tileHeight: thM ? parseInt(thM[1], 10) : 1,
    });
  }
  return out;
}

/** Fetch a top-level array by name and hand it to extractNpcs. */
function extractNpcsFromTopLevel(text, arrayName, applyOffset) {
  const body = sliceArrayBody(text, arrayName);
  if (!body) return [];
  return extractNpcs(body, applyOffset);
}

/**
 * Signs in npcs.ts don't have an `id:` field — just `position: {...}`
 * followed by `text: [...]`. So we grab every position match inside the
 * array body and synthesise an id.
 */
function extractSigns(text, arrayName, applyOffset) {
  const body = sliceArrayBody(text, arrayName);
  if (!body) return [];
  const posRe = /position:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}/g;
  const out = [];
  let m, i = 0;
  while ((m = posRe.exec(body)) !== null) {
    let x = parseInt(m[1], 10), y = parseInt(m[2], 10);
    if (applyOffset) { x += 50; y += 50; }
    out.push({ id: `${arrayName}_${i++}`, x, y });
  }
  return out;
}

/** Match every `wild(dexNum, X, Y)` factory call in wild-pokemon.ts. */
function extractWildPokemon(text) {
  const re = /wild\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({
      id: `wild_dex${m[1]}`,
      pokedexNumber: parseInt(m[1], 10),
      x: parseInt(m[2], 10),
      y: parseInt(m[3], 10),
    });
  }
  return out;
}

/** Pull overworld hidden items out of hiddenItems.ts. */
function extractHiddenItems(text) {
  const re = /\{\s*id:\s*"([^"]+)"[^}]*?map:\s*"([^"]+)"[^}]*?x:\s*(\d+),\s*y:\s*(\d+)[^}]*?itemId:\s*"([^"]+)"/gs;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[2] !== "overworld") continue;
    out.push({
      id: m[1],
      x: parseInt(m[3], 10),
      y: parseInt(m[4], 10),
      itemId: m[5],
    });
  }
  return out;
}

const npcsText   = readFileSync(resolve(ROOT, "src/game/data/npcs.ts"), "utf-8");
const wildText   = readFileSync(resolve(ROOT, "src/game/data/wild-pokemon.ts"), "utf-8");
const hiddenText = readFileSync(resolve(ROOT, "src/game/data/hiddenItems.ts"), "utf-8");

const mauvilleNpcs  = extractNpcsFromTopLevel(npcsText, "MAUVILLE_NPCS_RAW", true);
const routeNpcs     = extractNpcsFromTopLevel(npcsText, "ROUTE_NPCS", false);
const allNpcs       = [...mauvilleNpcs, ...routeNpcs];

const wildPokemon   = extractWildPokemon(wildText);

const mauvilleSigns = extractSigns(npcsText, "MAUVILLE_SIGNS_RAW", true);
const routeSigns    = extractSigns(npcsText, "ROUTE_SIGNS", false);
const allSigns      = [...mauvilleSigns, ...routeSigns];

const hiddenItems   = extractHiddenItems(hiddenText);

// ── Build Grid Engine blocker set ──────────────────────────────────
// Collision tiles + every NPC footprint + every wild Pokemon. Signs
// do NOT block (the player interacts with them from an adjacent tile
// by pressing A, they don't exist as characters in Grid Engine).
// Hidden items are metadata and never block. Multi-tile NPCs expand
// from (x,y) to (x+tw-1, y+th-1) so their whole footprint is walled
// off during BFS — this future-proofs the script for Grid Engine's
// multi-tile character support even though no NPCs use it today.
function addFootprint(set, n) {
  const tw = n.tileWidth || 1;
  const th = n.tileHeight || 1;
  for (let dy = 0; dy < th; dy++) {
    for (let dx = 0; dx < tw; dx++) {
      set.add(`${n.x + dx},${n.y + dy}`);
    }
  }
}
const npcBlockedSet = new Set();
for (const n of allNpcs)     addFootprint(npcBlockedSet, n);
for (const w of wildPokemon) addFootprint(npcBlockedSet, w);

function isBlockedForBfs(x, y) {
  return isCollision(x, y) || npcBlockedSet.has(`${x},${y}`);
}

// Count total collision-walkable tiles as the headline denominator.
let totalWalkable = 0;
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (isWalkableCollision(x, y)) totalWalkable++;
  }
}

// ── BFS helper ─────────────────────────────────────────────────────
/**
 * Flood-fill from (sx,sy) through any tile that passes `isBlockedFn`.
 * Returns the reached-set (Uint8Array), live reached count, and an
 * optional distance map when `{ withDist: true }` is passed.
 */
function runBfs(sx, sy, isBlockedFn, { withDist = false } = {}) {
  const reached = new Uint8Array(MAP_W * MAP_H);
  const dist = withDist ? new Int32Array(MAP_W * MAP_H).fill(-1) : null;
  if (!inBounds(sx, sy) || isBlockedFn(sx, sy)) {
    return { reached, count: 0, dist };
  }
  reached[idx(sx, sy)] = 1;
  if (dist) dist[idx(sx, sy)] = 0;
  let count = 1;
  const q = [[sx, sy]];
  let h = 0;
  while (h < q.length) {
    const [cx, cy] = q[h++];
    const cd = dist ? dist[idx(cx, cy)] : 0;
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      if (!inBounds(nx, ny)) continue;
      if (reached[idx(nx, ny)]) continue;
      if (isBlockedFn(nx, ny)) continue;
      reached[idx(nx, ny)] = 1;
      if (dist) dist[idx(nx, ny)] = cd + 1;
      count++;
      q.push([nx, ny]);
    }
  }
  return { reached, count, dist };
}

// ── Baseline BFS from spawn ────────────────────────────────────────
if (isBlockedForBfs(SPAWN.x, SPAWN.y)) {
  console.error(`ERROR: spawn (${SPAWN.x}, ${SPAWN.y}) is blocked (collision or NPC).`);
  process.exit(1);
}

const baseline = runBfs(SPAWN.x, SPAWN.y, isBlockedForBfs, { withDist: true });
const reachable = baseline.reached;
const distFromSpawn = baseline.dist;
const reachableCount = baseline.count;

// Terrain-only BFS — ignores NPC blockers. Used to classify whether
// an unreachable entity is walled off by map geometry (water/cliffs,
// usually by design) or by another NPC character (usually a bug or
// an intentional formation that should be flagged explicitly).
const terrainOnly = runBfs(SPAWN.x, SPAWN.y, isCollision);

// ── --test X,Y placement simulation ────────────────────────────────
// Add a virtual NPC at (X,Y), re-run BFS, diff against baseline, and
// report exactly what would break. Short-circuits the rest of the
// report so authors can iterate quickly on placement candidates.
if (testTile) {
  const { x: tx, y: ty, tileWidth: tw, tileHeight: th } = testTile;
  const sizeLabel = tw === 1 && th === 1 ? "" : ` (${tw}×${th})`;
  console.log("=".repeat(68));
  console.log(`PLACEMENT SIMULATION — test tile (${tx}, ${ty})${sizeLabel}`);
  console.log("=".repeat(68));

  // Build the set of tiles the simulated NPC would occupy. Matches
  // the footprint semantics of addFootprint: [x, x+tw) × [y, y+th).
  const footprint = [];
  for (let dy = 0; dy < th; dy++) {
    for (let dx = 0; dx < tw; dx++) {
      footprint.push([tx + dx, ty + dy]);
    }
  }
  const footprintSet = new Set(footprint.map(([x, y]) => `${x},${y}`));

  for (const [fx, fy] of footprint) {
    if (!inBounds(fx, fy)) {
      console.log(`✗ Footprint tile (${fx},${fy}) is out of bounds (${MAP_W}×${MAP_H}).`);
      process.exit(1);
    }
    if (isCollision(fx, fy)) {
      console.log(`✗ Footprint tile (${fx},${fy}) is already a collision tile.`);
      process.exit(1);
    }
    if (!reachable[idx(fx, fy)]) {
      console.log(`✗ Footprint tile (${fx},${fy}) is already unreachable from spawn.`);
      process.exit(1);
    }
    if (fx === SPAWN.x && fy === SPAWN.y) {
      console.log(`✗ Footprint tile (${fx},${fy}) is the player spawn.`);
      process.exit(1);
    }
    if (npcBlockedSet.has(`${fx},${fy}`)) {
      console.log(`✗ Footprint tile (${fx},${fy}) already has an NPC/Pokemon on it.`);
      process.exit(1);
    }
  }

  // Simulated BFS — existing blockers PLUS the candidate footprint.
  const simBlocked = (x, y) =>
    isBlockedForBfs(x, y) || footprintSet.has(`${x},${y}`);
  const sim = runBfs(SPAWN.x, SPAWN.y, simBlocked);

  const lost = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (reachable[idx(x, y)] && !sim.reached[idx(x, y)]) {
        lost.push({ x, y });
      }
    }
  }

  console.log(`Baseline reachable:   ${reachableCount}`);
  console.log(`Simulated reachable:  ${sim.count}`);
  console.log(`Delta:                ${sim.count - reachableCount}  (${lost.length} tiles lost)`);
  console.log();

  if (lost.length === 0) {
    console.log(`✓ SAFE — placing an NPC at (${tx},${ty})${sizeLabel} does not disconnect any tiles.`);
    process.exit(0);
  }

  // The footprint tiles themselves will show up in the "lost" set
  // because the BFS no longer walks onto them. That's expected — the
  // "collateral damage" view strips them out so the designer only
  // sees genuinely disconnected tiles.
  const collateral = lost.filter((t) => !footprintSet.has(`${t.x},${t.y}`));
  const losesOnlyItself = collateral.length === 0;

  if (losesOnlyItself) {
    const word = tw === 1 && th === 1 ? "tile itself" : "footprint";
    console.log(`✓ SAFE — only the NPC ${word} becomes unreachable.`);
    console.log(`  No articulation impact; this placement is not a chokepoint.`);
    process.exit(0);
  }

  console.log(`✗ UNSAFE — placing an NPC at (${tx},${ty})${sizeLabel} would cut off ${collateral.length} tiles.`);
  console.log();

  // Group lost tiles by zone.
  const lostByZone = {};
  for (const z of ZONES) lostByZone[z.id] = 0;
  for (const t of collateral) {
    const z = getZoneAt(t.x, t.y);
    if (z) lostByZone[z.id]++;
  }
  console.log("TILES LOST BY ZONE");
  for (const z of ZONES) {
    if (lostByZone[z.id] > 0) console.log(`  ${z.name.padEnd(15)} ${lostByZone[z.id]}`);
  }
  console.log();

  // Which entities would become unreachable?
  function wasReachable(x, y) {
    if (reachable[idx(x, y)]) return true;
    return (
      (inBounds(x + 1, y) && reachable[idx(x + 1, y)]) ||
      (inBounds(x - 1, y) && reachable[idx(x - 1, y)]) ||
      (inBounds(x, y + 1) && reachable[idx(x, y + 1)]) ||
      (inBounds(x, y - 1) && reachable[idx(x, y - 1)])
    );
  }
  function isReachableSim(x, y) {
    if (sim.reached[idx(x, y)]) return true;
    return (
      (inBounds(x + 1, y) && sim.reached[idx(x + 1, y)]) ||
      (inBounds(x - 1, y) && sim.reached[idx(x - 1, y)]) ||
      (inBounds(x, y + 1) && sim.reached[idx(x, y + 1)]) ||
      (inBounds(x, y - 1) && sim.reached[idx(x, y - 1)])
    );
  }

  const cutoffEntities = [];
  const scan = (list, label) => {
    for (const e of list) {
      if (wasReachable(e.x, e.y) && !isReachableSim(e.x, e.y)) {
        cutoffEntities.push(`${label}: ${e.id || `#${e.pokedexNumber}`} at (${e.x},${e.y})`);
      }
    }
  };
  scan(allNpcs, "NPC");
  scan(wildPokemon, "POKEMON");
  scan(allSigns, "SIGN");
  scan(hiddenItems, "HIDDEN ITEM");

  if (cutoffEntities.length > 0) {
    console.log("ENTITIES CUT OFF");
    for (const line of cutoffEntities) console.log(`  ⚠ ${line}`);
    console.log();
  }

  // Show the first handful of lost tiles as example coordinates.
  const preview = collateral.slice(0, 12);
  console.log("SAMPLE LOST TILES");
  for (const t of preview) {
    const z = getZoneAt(t.x, t.y);
    console.log(`  (${String(t.x).padStart(3)},${String(t.y).padStart(3)})  ${z ? z.name : "-"}`);
  }
  if (collateral.length > preview.length) {
    console.log(`  … and ${collateral.length - preview.length} more`);
  }

  process.exit(2);
}

function isReachable(x, y) {
  return inBounds(x, y) && reachable[idx(x, y)] === 1;
}
/** Entity is "interactable" if its tile OR any 4-neighbor is reachable. */
function isReachableOrAdjacent(x, y) {
  if (isReachable(x, y)) return true;
  return (
    isReachable(x + 1, y) || isReachable(x - 1, y) ||
    isReachable(x, y + 1) || isReachable(x, y - 1)
  );
}

// ── Per-zone reachability stats ────────────────────────────────────
const zoneStats = {};
for (const z of ZONES) {
  zoneStats[z.id] = { name: z.name, totalWalkable: 0, reachable: 0, percent: 0 };
}
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (!isWalkableCollision(x, y)) continue;
    const z = getZoneAt(x, y);
    if (!z) continue;
    zoneStats[z.id].totalWalkable++;
    if (isReachable(x, y)) zoneStats[z.id].reachable++;
  }
}
for (const id in zoneStats) {
  const s = zoneStats[id];
  s.percent = s.totalWalkable === 0 ? 0 : Math.round((s.reachable / s.totalWalkable) * 1000) / 10;
}

// ── Landmark anchors (nearest reachable tile, ring search) ─────────
function nearestReachable(x, y, maxRadius = 4) {
  if (isReachable(x, y)) return { x, y, dist: 0 };
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue;
        const nx = x + dx, ny = y + dy;
        if (isReachable(nx, ny)) return { x: nx, y: ny, dist: r };
      }
    }
  }
  return null;
}

const landmarkInfo = LANDMARKS.map((l) => {
  const anchor = nearestReachable(l.x, l.y, 4);
  return {
    id: l.id,
    name: l.name,
    x: l.x,
    y: l.y,
    onReachableTile: isReachable(l.x, l.y),
    anchor: anchor || null,
  };
});

// ── Distances between landmarks (BFS per landmark anchor) ──────────
// Reuses runBfs with an inverted predicate: "blocked = NOT in the
// baseline reachable set". This walks the pre-computed reachable
// subgraph instead of the raw collision data, so distances are
// shortest paths the player can actually travel. Keeping all BFS
// traversals on a single primitive means neighbor-logic changes only
// need to happen in one place.
function bfsDistanceMap(sx, sy) {
  return runBfs(sx, sy, (x, y) => !isReachable(x, y), { withDist: true }).dist;
}

const distances = {};
const reachableLandmarks = landmarkInfo.filter((l) => l.anchor);
for (const a of reachableLandmarks) {
  const dmap = bfsDistanceMap(a.anchor.x, a.anchor.y);
  for (const b of reachableLandmarks) {
    if (a.id >= b.id) continue;
    const d = dmap[idx(b.anchor.x, b.anchor.y)];
    distances[`${a.id} -> ${b.id}`] = d === -1 ? null : d;
  }
}

// ── Articulation points (Tarjan, iterative) ────────────────────────
// Any tile that, when removed from the reachable subgraph, disconnects
// some other tile from spawn. We flag these so we never place an NPC
// on a chokepoint that would cut off part of a route.
const reachableNodes = [];
const nodeIndex = new Map();
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (reachable[idx(x, y)]) {
      nodeIndex.set(`${x},${y}`, reachableNodes.length);
      reachableNodes.push({ x, y });
    }
  }
}
const N_NODES = reachableNodes.length;

function neighborNodes(i) {
  const { x, y } = reachableNodes[i];
  const out = [];
  for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
    const ni = nodeIndex.get(`${nx},${ny}`);
    if (ni !== undefined) out.push(ni);
  }
  return out;
}

const disc   = new Int32Array(N_NODES).fill(-1);
const low    = new Int32Array(N_NODES).fill(-1);
const parent = new Int32Array(N_NODES).fill(-1);
const isArtic = new Uint8Array(N_NODES);
let timer = 0;

const spawnI = nodeIndex.get(`${SPAWN.x},${SPAWN.y}`);
if (spawnI !== undefined) {
  disc[spawnI] = low[spawnI] = timer++;
  // Iterative DFS; each stack frame tracks which neighbor we're on
  // and how many DFS tree children we've emitted (for the root rule).
  const stack = [{ u: spawnI, iter: 0, childCount: 0 }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    const u = frame.u;
    const ns = neighborNodes(u);
    if (frame.iter < ns.length) {
      const v = ns[frame.iter++];
      if (disc[v] === -1) {
        parent[v] = u;
        disc[v] = low[v] = timer++;
        frame.childCount++;
        stack.push({ u: v, iter: 0, childCount: 0 });
      } else if (v !== parent[u]) {
        if (disc[v] < low[u]) low[u] = disc[v];
      }
    } else {
      // Finished u — propagate low[u] to parent and test articulation.
      stack.pop();
      const p = parent[u];
      if (p !== -1) {
        if (low[u] < low[p]) low[p] = low[u];
        // Non-root rule: p has a child u with low[u] >= disc[p] ⇒ p is
        // an articulation point (its subtree has no back-edge above p).
        if (low[u] >= disc[p] && parent[p] !== -1) {
          isArtic[p] = 1;
        }
      } else {
        // Root rule: spawn is an articulation point iff it has >1
        // DFS tree children.
        if (frame.childCount > 1) isArtic[u] = 1;
      }
    }
  }
}

let articulationCount = 0;
for (let i = 0; i < N_NODES; i++) if (isArtic[i]) articulationCount++;

function isArticulationAt(x, y) {
  const ni = nodeIndex.get(`${x},${y}`);
  return ni !== undefined && isArtic[ni] === 1;
}

// ── Corridor width pass ────────────────────────────────────────────
// For every reachable tile, compute width = min(horizontal run of
// reachable tiles through this point, vertical run through this
// point). A width-1 tile is a dead-end or already-articulation; a
// width-2 tile is a 2-wide corridor where placing any NPC narrows it
// to a 1-wide chokepoint and probably creates a new articulation
// point. We flag width ≤ 2 tiles so gate/puzzle design can use them
// deliberately — and avoid them accidentally.
const corridorWidth = new Int16Array(MAP_W * MAP_H);
function scanRun(x, y, dx, dy) {
  let n = 0;
  let cx = x + dx, cy = y + dy;
  while (inBounds(cx, cy) && isReachable(cx, cy)) {
    n++;
    cx += dx;
    cy += dy;
  }
  return n;
}
let width1Count = 0;
let width2Count = 0;
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (!isReachable(x, y)) continue;
    const h = 1 + scanRun(x, y, 1, 0) + scanRun(x, y, -1, 0);
    const v = 1 + scanRun(x, y, 0, 1) + scanRun(x, y, 0, -1);
    const w = Math.min(h, v);
    corridorWidth[idx(x, y)] = w;
    if (w === 1) width1Count++;
    else if (w === 2) width2Count++;
  }
}
function corridorWidthAt(x, y) {
  return inBounds(x, y) ? corridorWidth[idx(x, y)] : 0;
}

// ── Interior scene analyzer ────────────────────────────────────────
// Each building (pokecenter / mart / gym) has its own tilemap JSON
// with a Collision layer, plus NPCs defined in `interiors.ts`. This
// pass runs the same reachability + collision-tile check on each
// interior so we catch misplaced NPCs inside rooms — something the
// overworld BFS can't see. The interior spawn is the first exit-warp
// tile (which is the doormat the player lands on when entering).

/** Slice the body of a named sub-object inside an interior definition. */
function sliceObjectField(body, fieldName) {
  const fieldRe = new RegExp(`${fieldName}\\s*:\\s*\\[`, "m");
  const m = body.match(fieldRe);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 0;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (c === "[") depth++;
    else if (c === "]") {
      if (depth === 0) return body.slice(start, i);
      depth--;
    }
  }
  return null;
}

/** Slice a named interior object out of the INTERIORS record. */
function sliceInteriorBlock(text, key) {
  const re = new RegExp(`^ {2}${key}\\s*:\\s*\\{`, "m");
  const m = text.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") {
      if (depth === 0) return text.slice(start, i);
      depth--;
    }
  }
  return null;
}

function extractExitWarpTiles(body) {
  return extractTileList(body, "exitWarpTiles");
}

/**
 * Extract a `<fieldName>: [{ x, y }, ...]` list from an interior
 * block body. Returns [] if the field is missing. Used for
 * exitWarpTiles, pcTiles, and questionnaireTiles.
 */
function extractTileList(body, fieldName) {
  const listBody = sliceObjectField(body, fieldName);
  if (!listBody) return [];
  // questionnaireTiles entries have extra fields (id, iconUrl…) in
  // between the position pair — the regex just scans x/y pairs in
  // order and tolerates whatever sits between them.
  const posRe = /x:\s*(\d+),\s*y:\s*(\d+)/g;
  const out = [];
  let m, i = 0;
  while ((m = posRe.exec(listBody)) !== null) {
    out.push({
      id: `${fieldName}_${i++}`,
      x: parseInt(m[1], 10),
      y: parseInt(m[2], 10),
    });
  }
  return out;
}

const interiorsText = readFileSync(resolve(ROOT, "src/game/data/interiors.ts"), "utf-8");
const INTERIOR_KEYS = ["pokecenter", "mart", "gym"];

// Interiors whose NPCs can legitimately be unreachable from the entry
// warp in the static collision layer, because a dynamic puzzle gates
// them. For these we downgrade unreachable-NPC findings from a
// warning to an informational "[puzzle-gated]" tag so the author can
// tell intentional gating apart from a real bug.
const PUZZLE_INTERIORS = new Set(["gym"]);

/** Load + analyze one interior. Returns a per-interior report. */
function analyzeInterior(key) {
  const block = sliceInteriorBlock(interiorsText, key);
  if (!block) return { key, error: "interior block not found in interiors.ts" };

  const exits = extractExitWarpTiles(block);
  const npcsBody = sliceObjectField(block, "npcs");
  const intNpcs = npcsBody ? extractNpcs(npcsBody, false) : [];
  // Interactive tiles that aren't NPCs but still need to be reachable
  // from spawn: PC terminals and questionnaire/letter pickups.
  const pcTiles = extractTileList(block, "pcTiles");
  const questionnaireTiles = extractTileList(block, "questionnaireTiles");

  // Load the interior tilemap.
  let map;
  try {
    map = JSON.parse(readFileSync(resolve(ROOT, `public/game/maps/${key}.json`), "utf-8"));
  } catch (e) {
    return { key, error: `could not read public/game/maps/${key}.json: ${e.message}` };
  }
  const W = map.width;
  const H = map.height;
  const collLayer = map.layers.find((l) => l.name === "Collision");
  if (!collLayer) return { key, error: "Collision layer not found" };

  const iBlocked = new Uint8Array(W * H);
  for (let i = 0; i < collLayer.data.length; i++) {
    iBlocked[i] = collLayer.data[i] > 0 ? 1 : 0;
  }
  const iIdx = (x, y) => y * W + x;
  const iIn  = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const iCol = (x, y) => !iIn(x, y) || iBlocked[iIdx(x, y)] === 1;
  const iWalk = (x, y) => iIn(x, y) && iBlocked[iIdx(x, y)] === 0;

  const iBlockerSet = new Set();
  for (const n of intNpcs) addFootprint(iBlockerSet, n);
  const iBlockedBfs = (x, y) => iCol(x, y) || iBlockerSet.has(`${x},${y}`);

  // Spawn: first exit warp tile. If it's somehow blocked (shouldn't
  // be — exit warps are floor mats), report the interior as broken.
  if (exits.length === 0) {
    return { key, error: "no exitWarpTiles defined" };
  }
  const spawnTile = exits[0];
  if (iBlockedBfs(spawnTile.x, spawnTile.y)) {
    return { key, error: `exit warp tile (${spawnTile.x},${spawnTile.y}) is blocked` };
  }

  // BFS from spawn.
  const iReached = new Uint8Array(W * H);
  iReached[iIdx(spawnTile.x, spawnTile.y)] = 1;
  const q = [[spawnTile.x, spawnTile.y]];
  let h2 = 0;
  let iReachCount = 1;
  while (h2 < q.length) {
    const [cx, cy] = q[h2++];
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      if (!iIn(nx, ny)) continue;
      if (iReached[iIdx(nx, ny)]) continue;
      if (iBlockedBfs(nx, ny)) continue;
      iReached[iIdx(nx, ny)] = 1;
      iReachCount++;
      q.push([nx, ny]);
    }
  }

  let iTotalWalkable = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (iWalk(x, y)) iTotalWalkable++;
    }
  }

  // Classify each interior NPC. Reachability has two layers:
  //  1. Normal adjacency — player stands on a 4-neighbor of the NPC.
  //  2. Counter-reach — the classic Pokemon Center / Mart / Gym
  //     pattern where the NPC stands on an isolated tile surrounded
  //     by counter tiles, and the player talks to them by pressing A
  //     one tile back while facing the counter. In pokeemerald this
  //     is encoded as METATILE_ATTR_BEHAVIOR_COUNTER; we approximate
  //     it here by allowing reach if the tile two steps away in a
  //     cardinal direction is reachable AND the intermediate tile is
  //     blocked (i.e. a counter / gym platform / other ledge).
  function interiorReach(n) {
    if (iIn(n.x, n.y) && iReached[iIdx(n.x, n.y)]) return true;
    const neighbors = [
      [n.x + 1, n.y], [n.x - 1, n.y],
      [n.x, n.y + 1], [n.x, n.y - 1],
    ];
    for (const [ax, ay] of neighbors) {
      if (iIn(ax, ay) && iReached[iIdx(ax, ay)]) return true;
    }
    // Counter-reach: 2 steps cardinal, intermediate blocked.
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      const mx = n.x + dx, my = n.y + dy;
      const fx = n.x + 2 * dx, fy = n.y + 2 * dy;
      if (!iIn(fx, fy)) continue;
      if (!iCol(mx, my)) continue; // intermediate must be a counter (blocked)
      if (iReached[iIdx(fx, fy)]) return true;
    }
    return false;
  }

  const iNpcReport = intNpcs.map((n) => ({
    ...n,
    reachable: interiorReach(n),
    onWalkableTile: iWalk(n.x, n.y),
  }));

  // Interactive tiles use the same counter-reach rule as NPCs —
  // questionnaire pickups sit on blocked tiles (rocks/letters on a
  // desk) and the player interacts from a neighbor; PC tiles likewise
  // sit on the terminal and are talked to from one step below.
  const iPcReport = pcTiles.map((t) => ({
    ...t,
    reachable: interiorReach(t),
    onWalkableTile: iWalk(t.x, t.y),
  }));
  const iQuestionnaireReport = questionnaireTiles.map((t) => ({
    ...t,
    reachable: interiorReach(t),
    onWalkableTile: iWalk(t.x, t.y),
  }));

  const puzzleGated = PUZZLE_INTERIORS.has(key);
  const iWarnings = [];
  const iInfo = [];
  for (const n of iNpcReport) {
    if (!n.reachable) {
      const line = `UNREACHABLE NPC: ${n.id} at (${n.x},${n.y})`;
      if (puzzleGated) iInfo.push(`${line} [puzzle-gated]`);
      else iWarnings.push(line);
    } else if (!n.onWalkableTile) {
      iWarnings.push(`NPC ON COLLISION TILE: ${n.id} at (${n.x},${n.y})`);
    }
  }
  for (const t of iPcReport) {
    if (!t.reachable) iWarnings.push(`UNREACHABLE PC TILE: ${t.id} at (${t.x},${t.y})`);
  }
  for (const t of iQuestionnaireReport) {
    if (!t.reachable) iWarnings.push(`UNREACHABLE QUESTIONNAIRE TILE: ${t.id} at (${t.x},${t.y})`);
  }

  return {
    key,
    width: W,
    height: H,
    totalTiles: W * H,
    walkableTiles: iTotalWalkable,
    reachableTiles: iReachCount,
    reachabilityPercent: iTotalWalkable === 0
      ? 0
      : Math.round((iReachCount / iTotalWalkable) * 1000) / 10,
    spawnTile,
    puzzleGated,
    npcs: iNpcReport,
    pcTiles: iPcReport,
    questionnaireTiles: iQuestionnaireReport,
    warnings: iWarnings,
    info: iInfo,
  };
}

const interiorReports = INTERIOR_KEYS.map(analyzeInterior);

// ── Entity reachability report ─────────────────────────────────────
/**
 * For an unreachable entity, decide whether it's blocked by terrain
 * (water, cliffs, map edge — the entity is on an island no amount of
 * NPC-shuffling can save) or by another NPC character (removing the
 * blocking NPC would make it reachable, i.e. an intentional formation
 * or a placement bug).
 */
function classifyBlocker(e) {
  // If the entity's tile OR any 4-neighbor is reachable in the
  // terrain-only flood fill, then terrain DOES connect to it and the
  // only thing stopping BFS is an NPC sitting between spawn and the
  // entity.
  const adj = [[e.x, e.y], [e.x + 1, e.y], [e.x - 1, e.y], [e.x, e.y + 1], [e.x, e.y - 1]];
  for (const [ax, ay] of adj) {
    if (!inBounds(ax, ay)) continue;
    if (terrainOnly.reached[idx(ax, ay)]) return "npc";
  }
  return "terrain";
}

/**
 * Steps-from-spawn for an entity. If the entity sits on a reachable
 * tile we use that tile's BFS distance directly; if it's on a blocked
 * tile (signs, counter NPCs, hidden items) we take the minimum of the
 * 4-neighbors because the player interacts from whichever adjacent
 * tile is closest to spawn. Returns null for entities that aren't
 * adjacent to any reachable tile.
 */
function entityDistFromSpawn(e) {
  if (inBounds(e.x, e.y) && distFromSpawn[idx(e.x, e.y)] >= 0) {
    return distFromSpawn[idx(e.x, e.y)];
  }
  let best = Infinity;
  for (const [nx, ny] of [[e.x + 1, e.y], [e.x - 1, e.y], [e.x, e.y + 1], [e.x, e.y - 1]]) {
    if (!inBounds(nx, ny)) continue;
    const d = distFromSpawn[idx(nx, ny)];
    if (d >= 0 && d < best) best = d;
  }
  return best === Infinity ? null : best;
}

function reportEntity(e, extra = {}) {
  const reach = isReachableOrAdjacent(e.x, e.y);
  const zone = getZoneAt(e.x, e.y);
  return {
    ...e,
    ...extra,
    zone: zone ? zone.id : null,
    reachable: reach,
    onWalkableTile: isWalkableCollision(e.x, e.y),
    blockedBy: reach ? null : classifyBlocker(e),
    distFromSpawn: entityDistFromSpawn(e),
  };
}

const npcReport  = allNpcs.map((e) => reportEntity(e));
const wildReport = wildPokemon.map((e) => reportEntity(e));
const signReport = allSigns.map((e) => reportEntity(e));
const itemReport = hiddenItems.map((e) => reportEntity(e));

// ── Warp set (shared between warnings and safe placement) ─────────
// BLOCKED door tiles that trigger transitions to interiors. Nothing
// else is allowed to sit on them — not NPCs, not signs, not items.
const warpSet = new Set([
  "58,55", "59,55", "72,55", "73,55", "73,64", "74,64",
]);

// ── Warnings ───────────────────────────────────────────────────────
const warnings = [];
const tag = (e) => `[${e.blockedBy}-blocked]`;
for (const n of npcReport) {
  if (!n.reachable) warnings.push(`UNREACHABLE NPC: ${n.id} at (${n.x},${n.y}) ${tag(n)}`);
  else if (!n.onWalkableTile) warnings.push(`NPC ON COLLISION TILE: ${n.id} at (${n.x},${n.y})`);
}
for (const w of wildReport) {
  if (!w.reachable) warnings.push(`UNREACHABLE POKEMON: #${w.pokedexNumber} at (${w.x},${w.y}) ${tag(w)}`);
  else if (!w.onWalkableTile) warnings.push(`POKEMON ON COLLISION TILE: #${w.pokedexNumber} at (${w.x},${w.y})`);
}
for (const s of signReport) {
  if (!s.reachable) warnings.push(`UNREACHABLE SIGN: ${s.id} at (${s.x},${s.y}) ${tag(s)}`);
}
for (const i of itemReport) {
  if (!i.reachable) warnings.push(`UNREACHABLE HIDDEN ITEM: ${i.id} at (${i.x},${i.y}) ${tag(i)}`);
}

// Entity overlap: two entities on the exact same tile. Grid Engine
// will render both sprites on top of each other and the A-press
// handler will only fire the first one it finds — so the second is
// effectively invisible. This catches copy-paste duplicates in the
// data files as well as accidental coordinate swaps. We scan every
// entity bucket together so NPC-on-sign and sign-on-sign both show.
const tileOccupancy = new Map(); // key -> [{ kind, id, x, y }, ...]
const registerOccupant = (kind, e) => {
  const key = `${e.x},${e.y}`;
  const label = e.id != null ? e.id : `#${e.pokedexNumber}`;
  const record = { kind, label, x: e.x, y: e.y };
  const existing = tileOccupancy.get(key);
  if (existing) existing.push(record);
  else tileOccupancy.set(key, [record]);
};
for (const n of allNpcs)      registerOccupant("NPC",    n);
for (const w of wildPokemon)  registerOccupant("POKEMON", w);
for (const s of allSigns)     registerOccupant("SIGN",   s);
for (const i of hiddenItems)  registerOccupant("ITEM",   i);

const overlaps = [];
for (const [key, occ] of tileOccupancy) {
  if (occ.length < 2) continue;
  overlaps.push({ tile: key, entities: occ });
  const parts = occ.map((o) => `${o.kind} ${o.label}`).join(" + ");
  warnings.push(`ENTITY OVERLAP at (${key}): ${parts}`);
}

// Entity on a warp door tile: the door is a warp trigger, nothing
// else can live there. Any NPC, sign, or item on a warp tile will
// make the warp unreachable (NPC) or never fire (sign/item).
for (const [key, occ] of tileOccupancy) {
  if (!warpSet.has(key)) continue;
  for (const o of occ) {
    warnings.push(`${o.kind} ON WARP TILE: ${o.label} at (${key})`);
  }
}

// Entity on the player spawn tile — the player would be standing on
// it at load, which is never intentional.
{
  const key = `${SPAWN.x},${SPAWN.y}`;
  const occ = tileOccupancy.get(key);
  if (occ) {
    for (const o of occ) {
      warnings.push(`${o.kind} ON SPAWN TILE: ${o.label} at (${key})`);
    }
  }
}

// ── Density / spacing check ────────────────────────────────────────
// Goal: catch accidental clustering of content without drowning the
// report in N² pair warnings. We build a proximity graph — edge
// between any two entities strictly closer than MIN_SPACING — then
// union-find the connected components. Each multi-entity component
// gets reported ONCE as a cluster, with a bounding box and a member
// list, so a 20-NPC grunt formation shows as a single finding
// instead of 190 pair warnings.
//
// Clusters where EVERY member is unreachable from spawn are skipped:
// the player can't see them, so their tightness is by design
// (cutscene blocks) and not a gameplay issue.
const MIN_SPACING = 3;

const flatEntities = [
  ...npcReport.map((e)  => ({ kind: "NPC",     label: e.id, x: e.x, y: e.y, reachable: e.reachable })),
  ...wildReport.map((e) => ({ kind: "POKEMON", label: `#${e.pokedexNumber}`, x: e.x, y: e.y, reachable: e.reachable })),
  ...signReport.map((e) => ({ kind: "SIGN",    label: e.id, x: e.x, y: e.y, reachable: e.reachable })),
  ...itemReport.map((e) => ({ kind: "ITEM",    label: e.id, x: e.x, y: e.y, reachable: e.reachable })),
];

// Iterative path-halving union-find.
const uf = new Int32Array(flatEntities.length);
for (let i = 0; i < uf.length; i++) uf[i] = i;
function ufFind(i) {
  while (uf[i] !== i) {
    uf[i] = uf[uf[i]];
    i = uf[i];
  }
  return i;
}
function ufUnion(a, b) {
  const ra = ufFind(a);
  const rb = ufFind(b);
  if (ra !== rb) uf[ra] = rb;
}

for (let i = 0; i < flatEntities.length; i++) {
  for (let j = i + 1; j < flatEntities.length; j++) {
    const a = flatEntities[i];
    const b = flatEntities[j];
    const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (d === 0) continue; // caught by the overlap scan
    if (d >= MIN_SPACING) continue;
    ufUnion(i, j);
  }
}

const groups = new Map();
for (let i = 0; i < flatEntities.length; i++) {
  const r = ufFind(i);
  if (!groups.has(r)) groups.set(r, []);
  groups.get(r).push(i);
}

const clusters = [];
for (const members of groups.values()) {
  if (members.length < 2) continue;
  const entities = members.map((i) => flatEntities[i]);
  // Skip clusters where every member is unreachable — these are
  // typically scripted cutscene blocks the player never encounters.
  if (!entities.some((e) => e.reachable)) continue;
  const xs = entities.map((e) => e.x);
  const ys = entities.map((e) => e.y);
  clusters.push({
    size: entities.length,
    bboxMin: [Math.min(...xs), Math.min(...ys)],
    bboxMax: [Math.max(...xs), Math.max(...ys)],
    members: entities.map((e) => ({ kind: e.kind, label: e.label, x: e.x, y: e.y, reachable: e.reachable })),
  });
}
clusters.sort((a, b) => b.size - a.size);

for (const c of clusters) {
  const span = `(${c.bboxMin[0]}-${c.bboxMax[0]}, ${c.bboxMin[1]}-${c.bboxMax[1]})`;
  const sample = c.members
    .slice(0, 3)
    .map((m) => `${m.kind} ${m.label}`)
    .join(", ");
  const suffix = c.members.length > 3 ? `, … (+${c.members.length - 3})` : "";
  warnings.push(`CLUSTER of ${c.size} at ${span}: ${sample}${suffix}`);
}

const entitiesByZone = {};
for (const z of ZONES) {
  entitiesByZone[z.id] = {
    name: z.name,
    npcs: 0,
    pokemon: 0,
    signs: 0,
    items: 0,
    total: 0,
  };
}
function tallyZone(list, field) {
  for (const e of list) {
    const z = getZoneAt(e.x, e.y);
    if (!z) continue;
    entitiesByZone[z.id][field]++;
    entitiesByZone[z.id].total++;
  }
}
tallyZone(npcReport,  "npcs");
tallyZone(wildReport, "pokemon");
tallyZone(signReport, "signs");
tallyZone(itemReport, "items");

// ── Safe placement tiles ───────────────────────────────────────────
// reachable ∧ walkable ∧ not on an NPC/Pokemon ∧ not a warp door ∧
// not an articulation point ∧ not the spawn tile.
const safePlacementTiles = [];
const safeByZone = {};
for (const z of ZONES) safeByZone[z.id] = 0;
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (!isReachable(x, y)) continue;
    if (!isWalkableCollision(x, y)) continue;
    const key = `${x},${y}`;
    if (npcBlockedSet.has(key)) continue;
    if (warpSet.has(key)) continue;
    if (x === SPAWN.x && y === SPAWN.y) continue;
    if (isArticulationAt(x, y)) continue;
    safePlacementTiles.push([x, y]);
    const z = getZoneAt(x, y);
    if (z) safeByZone[z.id]++;
  }
}

// ── Build JSON output ──────────────────────────────────────────────
const reachabilityPercent =
  totalWalkable === 0 ? 0 : Math.round((reachableCount / totalWalkable) * 1000) / 10;

const output = {
  generatedAt: new Date().toISOString(),
  mapSize: { width: MAP_W, height: MAP_H },
  spawn: SPAWN,
  totalTiles: MAP_W * MAP_H,
  walkableTiles: totalWalkable,
  reachableTiles: reachableCount,
  reachabilityPercent,
  zoneStats,
  landmarks: landmarkInfo,
  distances,
  articulationPointCount: articulationCount,
  corridorWidth: {
    // tiles where width == 1 (dead-ends or existing chokepoints)
    width1TileCount: width1Count,
    // tiles where width == 2 (2-wide corridors — placing any NPC
    // here creates a new articulation point)
    width2TileCount: width2Count,
  },
  safePlacementTileCount: safePlacementTiles.length,
  safePlacementByZone: safeByZone,
  safePlacementTiles,
  density: {
    minSpacing: MIN_SPACING,
    clusters,
    entitiesByZone,
  },
  entities: {
    npcs: npcReport,
    wildPokemon: wildReport,
    signs: signReport,
    hiddenItems: itemReport,
  },
  warnings,
  interiors: interiorReports,
};

writeFileSync(
  resolve(ROOT, "game-map-data.json"),
  JSON.stringify(output, null, 2),
);

// ── ASCII visualization ────────────────────────────────────────────
//
// Legend:
//   @ spawn         L landmark        N npc           P wild pokemon
//   S sign          ! hidden item     * articulation  . reachable
//   o unreachable walkable            # collision / blocked
//
const glyph = new Array(MAP_W * MAP_H).fill(" ");
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    glyph[idx(x, y)] = isWalkableCollision(x, y)
      ? (isReachable(x, y) ? "." : "o")
      : "#";
  }
}
// Overlay articulation points first so entities still sit on top of
// them in the picture.
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (isArticulationAt(x, y)) glyph[idx(x, y)] = "*";
  }
}
for (const s of signReport) if (inBounds(s.x, s.y)) glyph[idx(s.x, s.y)] = "S";
for (const i of itemReport) if (inBounds(i.x, i.y)) glyph[idx(i.x, i.y)] = "!";
for (const n of npcReport)  if (inBounds(n.x, n.y)) glyph[idx(n.x, n.y)] = "N";
for (const w of wildReport) if (inBounds(w.x, w.y)) glyph[idx(w.x, w.y)] = "P";
for (const l of LANDMARKS)  if (inBounds(l.x, l.y)) glyph[idx(l.x, l.y)] = l.id === "spawn" ? "@" : "L";

const viz = [];
viz.push(`Map Analyzer Report — mauville.json (${MAP_W}x${MAP_H})`);
viz.push(`Generated: ${output.generatedAt}`);
viz.push("");
viz.push(`Spawn: (${SPAWN.x}, ${SPAWN.y})`);
viz.push(`Collision-walkable tiles: ${totalWalkable} / ${MAP_W * MAP_H}`);
viz.push(`Reachable from spawn:     ${reachableCount} / ${totalWalkable} (${reachabilityPercent}%)`);
viz.push(`Articulation points:      ${articulationCount}`);
viz.push(`Safe placement tiles:     ${safePlacementTiles.length}`);
viz.push("");
viz.push("Legend:");
viz.push("  @ spawn       L landmark     N npc      P wild pokemon");
viz.push("  S sign        ! hidden item  * chokepoint (articulation)");
viz.push("  . reachable   o orphaned walkable        # collision");
viz.push("");
// Column ruler
let colHeader = "     ";
for (let x = 0; x < MAP_W; x++) colHeader += x % 10 === 0 ? String(Math.floor(x / 10) % 10) : " ";
viz.push(colHeader);
let colTens = "     ";
for (let x = 0; x < MAP_W; x++) colTens += String(x % 10);
viz.push(colTens);
for (let y = 0; y < MAP_H; y++) {
  const row = [];
  for (let x = 0; x < MAP_W; x++) row.push(glyph[idx(x, y)]);
  viz.push(`${String(y).padStart(3)}: ${row.join("")}`);
}
writeFileSync(resolve(ROOT, "map-analyzer.txt"), viz.join("\n") + "\n");

// ── Stdout summary ─────────────────────────────────────────────────
// Gated on QUIET so `node scripts/map-analyzer.mjs --quiet` still
// writes both output files but skips the report. Useful for driving
// --test in a shell loop over placement candidates where you only
// want JSON diffs, not the full text summary each iteration.
if (QUIET) {
  process.exit(0);
}

const bar = (pct) => {
  const filled = Math.round(pct / 5); // 20 chars total
  return "█".repeat(filled) + "·".repeat(Math.max(0, 20 - filled));
};

console.log("=".repeat(68));
console.log("MAP ANALYZER REPORT");
console.log("=".repeat(68));
console.log(`Map:       ${MAP_W} × ${MAP_H}  (${MAP_W * MAP_H} tiles)`);
console.log(`Walkable:  ${totalWalkable}`);
console.log(`Reachable: ${reachableCount}  (${reachabilityPercent}% of walkable)`);
console.log();
console.log("PER-ZONE REACHABILITY");
for (const z of ZONES) {
  const s = zoneStats[z.id];
  console.log(
    `  ${z.name.padEnd(15)} ${String(s.reachable).padStart(5)}/${String(s.totalWalkable).padEnd(5)}  ${bar(s.percent)}  ${s.percent}%`,
  );
}
console.log();
console.log("LANDMARKS");
for (const l of landmarkInfo) {
  const a = l.anchor
    ? `anchor=(${l.anchor.x},${l.anchor.y}) d=${l.anchor.dist}`
    : "NO REACHABLE ANCHOR";
  console.log(`  ${l.name.padEnd(22)} (${String(l.x).padStart(3)},${String(l.y).padStart(3)})  ${a}`);
}
console.log();
console.log("DISTANCES FROM SPAWN");
const spawnAnchor = landmarkInfo.find((l) => l.id === "spawn")?.anchor;
if (spawnAnchor) {
  const dmap = bfsDistanceMap(spawnAnchor.x, spawnAnchor.y);
  for (const l of landmarkInfo) {
    if (l.id === "spawn" || !l.anchor) continue;
    const d = dmap[idx(l.anchor.x, l.anchor.y)];
    const label = l.name.padEnd(22);
    console.log(`  spawn → ${label} ${d === -1 ? "unreachable" : `${d} tiles`}`);
  }
}
console.log();
console.log("ENTITY TOTALS");
console.log(`  NPCs:           ${npcReport.length}`);
console.log(`  Wild Pokemon:   ${wildReport.length}`);
console.log(`  Signs:          ${signReport.length}`);
console.log(`  Hidden items:   ${itemReport.length}`);
console.log();
console.log(`PLACEMENT WARNINGS (${warnings.length})`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
if (warnings.length === 0) console.log("  (none — all entities are reachable)");
console.log();
console.log(`SAFE PLACEMENT TILES: ${safePlacementTiles.length}`);
for (const z of ZONES) {
  console.log(`  ${z.name.padEnd(15)} ${safeByZone[z.id]}`);
}
console.log();
console.log(`Articulation points (chokepoints): ${articulationCount}`);
console.log(`Corridor width ≤ 2 tiles: ${width1Count + width2Count}  (width=1: ${width1Count}, width=2: ${width2Count})`);
console.log();
console.log("ENTITY DENSITY BY ZONE");
for (const z of ZONES) {
  const s = entitiesByZone[z.id];
  console.log(
    `  ${z.name.padEnd(15)} total ${String(s.total).padStart(3)}   npcs ${String(s.npcs).padStart(3)}  pkmn ${String(s.pokemon).padStart(3)}  signs ${String(s.signs).padStart(3)}  items ${String(s.items).padStart(3)}`,
  );
}
if (clusters.length > 0) {
  console.log();
  console.log(`CLUSTERS (${clusters.length}, spacing < ${MIN_SPACING} tiles)`);
  for (const c of clusters) {
    const span = `(${c.bboxMin[0]}-${c.bboxMax[0]}, ${c.bboxMin[1]}-${c.bboxMax[1]})`;
    console.log(`  size=${String(c.size).padStart(2)}  ${span}`);
    for (const m of c.members) {
      console.log(`    ${m.kind.padEnd(8)} ${m.label.padEnd(28)} (${m.x},${m.y})${m.reachable ? "" : " [unreachable]"}`);
    }
  }
}
console.log();

// Encounter-order report — entities sorted by BFS distance from
// spawn, grouped into distance bands. Exposes the exploration curve
// at a glance ("first 10 steps = 5 content hits, next 20 = 12 hits,
// then a 30-step dead zone") so pacing gaps jump out.
const BANDS = [
  { id: "0-9",   max: 9,  hits: [] },
  { id: "10-19", max: 19, hits: [] },
  { id: "20-29", max: 29, hits: [] },
  { id: "30+",   max: Infinity, hits: [] },
];
function pushToBand(kind, e) {
  if (e.distFromSpawn == null) return;
  for (const b of BANDS) {
    if (e.distFromSpawn <= b.max) {
      b.hits.push({ kind, label: e.id || `#${e.pokedexNumber}`, x: e.x, y: e.y, d: e.distFromSpawn });
      return;
    }
  }
}
for (const e of npcReport)  pushToBand("NPC",    e);
for (const e of wildReport) pushToBand("POKEMON", e);
for (const e of signReport) pushToBand("SIGN",   e);
for (const e of itemReport) pushToBand("ITEM",   e);
for (const b of BANDS) b.hits.sort((a, b) => a.d - b.d);

console.log("ENCOUNTER ORDER (by BFS distance from spawn)");
for (const b of BANDS) {
  console.log(`  ${b.id.padEnd(6)} steps  (${b.hits.length} ${b.hits.length === 1 ? "entity" : "entities"})`);
  for (const h of b.hits) {
    console.log(`    d=${String(h.d).padStart(3)}  ${h.kind.padEnd(8)} ${h.label.padEnd(28)} (${h.x},${h.y})`);
  }
}
console.log();

console.log("INTERIORS");
for (const r of interiorReports) {
  if (r.error) {
    console.log(`  ${r.key.padEnd(12)} ERROR: ${r.error}`);
    continue;
  }
  const npcCount = r.npcs.length;
  const bad = r.warnings.length;
  const info = (r.info || []).length;
  const tagParts = [];
  if (bad > 0) tagParts.push(`⚠ ${bad} issue${bad === 1 ? "" : "s"}`);
  if (info > 0) tagParts.push(`ℹ ${info} info`);
  if (r.puzzleGated) tagParts.push("[puzzle]");
  const tag = tagParts.length ? ` ${tagParts.join(" ")}` : "";
  console.log(
    `  ${r.key.padEnd(12)} ${r.width}×${r.height}  reachable ${r.reachableTiles}/${r.walkableTiles} (${r.reachabilityPercent}%)  npcs ${npcCount}${tag}`,
  );
  for (const w of r.warnings)    console.log(`    ⚠ ${w}`);
  for (const l of (r.info || [])) console.log(`    ℹ ${l}`);
}
console.log();
console.log(`→ Wrote game-map-data.json`);
console.log(`→ Wrote map-analyzer.txt`);
