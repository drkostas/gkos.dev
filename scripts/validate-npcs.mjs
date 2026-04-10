/**
 * Reads the stitched map.bin and validates that every NPC position in
 * src/game/data/npcs.ts is on a walkable tile. Flags any NPC placed on
 * a collision tile (building wall, tree, water, etc.) so they can be
 * moved before being added to the scene.
 *
 * Usage: node scripts/validate-npcs.mjs
 *
 * We parse the TypeScript NPC file with a tiny regex extractor rather
 * than running it through a TS compiler — the file follows a very
 * consistent format so this is reliable enough.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Load stitched map and metatile attributes ──────────────────────
const mapBin = readFileSync(resolve(ROOT, "public/game/maps/emerald-raw/MauvilleStitched/map.bin"));
const MAP_W = 140;
const MAP_H = 120;

const genAttrs = readFileSync(resolve(ROOT, "public/game/tilesets/emerald-raw/general_metatile_attributes.bin"));
const mauAttrs = readFileSync(resolve(ROOT, "public/game/tilesets/emerald-raw/mauville_metatile_attributes.bin"));
const behaviors = new Array(1022).fill(0);
for (let i = 0; i < genAttrs.length / 2; i++) {
  behaviors[i] = genAttrs.readUInt16LE(i * 2) & 0xff;
}
for (let i = 0; i < mauAttrs.length / 2; i++) {
  behaviors[512 + i] = mauAttrs.readUInt16LE(i * 2) & 0xff;
}

function isWater(b) {
  if (b >= 0x10 && b <= 0x15) return true;
  if (b >= 0x18 && b <= 0x1a) return true;
  return false;
}

/** True if the player can stand on this tile. */
function isWalkable(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  const word = mapBin.readUInt16LE((y * MAP_W + x) * 2);
  const metatileId = word & 0x3ff;
  const collision = (word >> 10) & 0x3;
  if (collision !== 0) return false;
  if (isWater(behaviors[metatileId])) return false;
  return true;
}

// ── Parse NPC data file ────────────────────────────────────────────
const npcFile = readFileSync(resolve(ROOT, "src/game/data/npcs.ts"), "utf-8");

/**
 * Extract NPC entries from the file. We look for `id: "..."` followed
 * by `position: { x: N, y: N }` within the same block. We also grab
 * whether the block is inside ROUTE_NPCS or MAUVILLE_NPCS_RAW so we
 * can apply the Mauville offset to raw entries.
 */
function extractNpcs(text, arrayName, applyOffset) {
  const start = text.indexOf(`const ${arrayName}`);
  if (start === -1) return [];
  // Find the `= [` which starts the array (skip `NPCDefinition[]` in type).
  const eqMatch = text.slice(start).match(/=\s*\[/);
  if (!eqMatch) return [];
  const contentStart = start + eqMatch.index + eqMatch[0].length;
  // Find the closing `];` — track bracket depth.
  let depth = 0;
  let end = contentStart;
  for (let i = contentStart; i < text.length; i++) {
    const c = text[i];
    if (c === "[") depth++;
    else if (c === "]") {
      if (depth === 0) { end = i; break; }
      depth--;
    }
  }
  const body = text.slice(contentStart, end);

  // Find id/position pairs independently — each id line is followed
  // somewhere by a position line. Use line-based matching.
  const npcs = [];
  const idRe = /id:\s*"([^"]+)"/g;
  const posRe = /position:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}/g;

  // Scan all id matches and find the next position match after each.
  const idMatches = [];
  let m;
  while ((m = idRe.exec(body)) !== null) {
    idMatches.push({ id: m[1], idx: m.index });
  }
  const posMatches = [];
  while ((m = posRe.exec(body)) !== null) {
    posMatches.push({ x: parseInt(m[1], 10), y: parseInt(m[2], 10), idx: m.index });
  }
  // Pair each id with the first position after it
  for (const idm of idMatches) {
    const pos = posMatches.find((p) => p.idx > idm.idx);
    if (!pos) continue;
    let x = pos.x, y = pos.y;
    if (applyOffset) { x += 50; y += 50; }
    npcs.push({ id: idm.id, x, y });
  }
  return npcs;
}

const mauvilleNpcs = extractNpcs(npcFile, "MAUVILLE_NPCS_RAW", true);
const routeNpcs = extractNpcs(npcFile, "ROUTE_NPCS", false);
const allNpcs = [...mauvilleNpcs, ...routeNpcs];

// ── Validate each NPC ──────────────────────────────────────────────
console.log(`Validating ${allNpcs.length} NPCs against ${MAP_W}x${MAP_H} map...`);
console.log();

let invalid = 0;
const bad = [];
for (const npc of allNpcs) {
  const ok = isWalkable(npc.x, npc.y);
  if (!ok) {
    invalid++;
    bad.push(npc);
    const word = mapBin.readUInt16LE((npc.y * MAP_W + npc.x) * 2);
    const mtId = word & 0x3ff;
    const col = (word >> 10) & 0x3;
    const beh = behaviors[mtId];
    const reason = col !== 0 ? `collision=1` : `water(beh=0x${beh.toString(16)})`;
    console.log(`  ✗ ${npc.id.padEnd(28)} (${npc.x.toString().padStart(3)}, ${npc.y.toString().padStart(3)})  ${reason} metatile=${mtId}`);
  }
}

console.log();
console.log(`${allNpcs.length - invalid} / ${allNpcs.length} walkable. ${invalid} invalid.`);

if (invalid > 0) {
  console.log();
  console.log("Nearest walkable suggestions (within 5 tiles):");
  for (const npc of bad) {
    let best = null;
    for (let dy = -5; dy <= 5 && !best; dy++) {
      for (let dx = -5; dx <= 5 && !best; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (isWalkable(npc.x + dx, npc.y + dy)) {
          best = { x: npc.x + dx, y: npc.y + dy, dist: Math.abs(dx) + Math.abs(dy) };
        }
      }
    }
    if (best) {
      console.log(`  ${npc.id} (${npc.x},${npc.y}) -> (${best.x},${best.y})`);
    } else {
      console.log(`  ${npc.id} (${npc.x},${npc.y}) -> (no walkable within 5)`);
    }
  }
}
