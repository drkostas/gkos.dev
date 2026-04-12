#!/usr/bin/env node
/**
 * scripts/editor-data-export.mjs
 *
 * Generates editor-data.json from TypeScript source files.
 * Used by the /editor dev route to populate the visual map editor.
 *
 * Reads all game data files using regex extraction (same approach as
 * map-analyzer.mjs) and produces a flat JSON with every entity's
 * serializable fields.
 *
 * Usage: node scripts/editor-data-export.mjs
 * Output: editor-data.json at repo root
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Utility: slice an array body from TS source ──────────────────
function sliceArrayBody(text, arrayName) {
  const re = new RegExp(`(?:const|export const)\\s+${arrayName}[^=]*=\\s*\\[`);
  const m = text.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 1, i = start;
  while (i < text.length && depth > 0) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") depth--;
    i++;
  }
  return text.slice(start, i - 1);
}

// ── Extract NPC fields (expanded from map-analyzer) ──────────────
function extractFullNpcs(body, applyOffset, sourceFile) {
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

    let x = parseInt(posM[1], 10), y = parseInt(posM[2], 10);
    if (applyOffset) { x += 50; y += 50; }

    // Extract all serializable fields
    const spriteM = slice.match(/spriteKey:\s*"([^"]+)"/);
    const facingM = slice.match(/facingDirection:\s*(?:Direction\.)?(\w+)/);
    const movM = slice.match(/movementBehavior:\s*MovementBehavior\.(\w+)/);
    const rxM = slice.match(/movementRangeX:\s*(\d+)/);
    const ryM = slice.match(/movementRangeY:\s*(\d+)/);
    const speakerM = slice.match(/speakerName:\s*"([^"]+)"/);
    const animM = slice.match(/animated:\s*(true|false)/);
    const twM = slice.match(/tileWidth:\s*(\d+)/);
    const thM = slice.match(/tileHeight:\s*(\d+)/);

    // Dialog lines — use a bracket-depth parser instead of greedy regex
    let dialog = [];
    const dlgStart = slice.indexOf("dialog:");
    if (dlgStart !== -1) {
      const bracketStart = slice.indexOf("[", dlgStart);
      if (bracketStart !== -1) {
        let depth = 1, j = bracketStart + 1;
        while (j < slice.length && depth > 0) {
          if (slice[j] === "[") depth++;
          else if (slice[j] === "]") depth--;
          j++;
        }
        const dlgBody = slice.slice(bracketStart + 1, j - 1);
        const lineRe = /"([^"]*)"/g;
        let lm;
        while ((lm = lineRe.exec(dlgBody)) !== null) dialog.push(lm[1]);
      }
    }

    // AutoGive — simple field extraction, no greedy regex
    let autoGive = null;
    if (slice.includes("autoGive:")) {
      const agItemM = slice.match(/itemId:\s*"([^"]+)"/);
      const agAsideM = slice.match(/asidePosition:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}/);
      if (agItemM) {
        autoGive = { itemId: agItemM[1] };
        if (agAsideM) {
          let ax = parseInt(agAsideM[1], 10), ay = parseInt(agAsideM[2], 10);
          if (applyOffset) { ax += 50; ay += 50; }
          autoGive.asideX = ax;
          autoGive.asideY = ay;
        }
      }
    }

    // Pickup
    let pickup = null;
    if (slice.includes("pickup:")) {
      const pickupIdM = slice.match(/itemId:\s*"([^"]+)"/);
      if (pickupIdM && !autoGive) pickup = { itemId: pickupIdM[1] };
    }

    // Pokemon
    let pokemon = null;
    const pkDexM = slice.match(/pokedexNumber:\s*(\d+)/);
    if (pkDexM) {
      const pkNameM = slice.match(/speciesName:\s*"([^"]+)"/);
      const pkProjM = slice.match(/projectName:\s*"([^"]+)"/);
      pokemon = {
        pokedexNumber: parseInt(pkDexM[1], 10),
        speciesName: pkNameM?.[1] || "",
        projectName: pkProjM?.[1] || "",
      };
    }

    // Has dialogFn? (read-only indicator)
    const hasDialogFn = /dialogFn\s*:/.test(slice);
    const hasSpawnCondition = /spawnCondition\s*:/.test(slice);

    out.push({
      type: pokemon ? "pokemon-npc" : pickup ? "pickup" : "npc",
      id: idMatches[i].id,
      x, y,
      spriteKey: spriteM?.[1] || "unknown",
      facingDirection: facingM?.[1]?.toLowerCase() || "down",
      movementBehavior: movM?.[1] || "STATIONARY",
      movementRangeX: rxM ? parseInt(rxM[1], 10) : 0,
      movementRangeY: ryM ? parseInt(ryM[1], 10) : 0,
      dialog,
      speakerName: speakerM?.[1] || "",
      animated: animM?.[1] === "true",
      tileWidth: twM ? parseInt(twM[1], 10) : 1,
      tileHeight: thM ? parseInt(thM[1], 10) : 1,
      autoGive,
      pickup,
      pokemon,
      hasDialogFn,
      hasSpawnCondition,
      sourceFile,
      sourceOffset: applyOffset,
    });
  }
  return out;
}

function extractFullNpcsFromTopLevel(text, arrayName, applyOffset, sourceFile) {
  const body = sliceArrayBody(text, arrayName);
  return extractFullNpcs(body, applyOffset, sourceFile);
}

// ── Extract signs ────────────────────────────────────────────────
function extractSigns(text, arrayName, applyOffset) {
  const body = sliceArrayBody(text, arrayName);
  if (!body) return [];
  // Split by position markers and extract text arrays
  const entries = [];
  const posRe = /position:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}/g;
  let m, idx = 0;
  while ((m = posRe.exec(body)) !== null) {
    let x = parseInt(m[1], 10), y = parseInt(m[2], 10);
    if (applyOffset) { x += 50; y += 50; }
    // Find the text array after this position
    const afterPos = body.slice(m.index + m[0].length, m.index + m[0].length + 500);
    const textM = afterPos.match(/text:\s*\[([\s\S]*?)\]/);
    let text = [];
    if (textM) {
      text = [...textM[1].matchAll(/"([^"]*?)"/g)].map(m => m[1]);
    }
    entries.push({
      type: "sign",
      id: `${arrayName}_${idx++}`,
      x, y,
      text,
      sourceFile: "npcs.ts",
      sourceOffset: applyOffset,
    });
  }
  return entries;
}

// ── Extract wild Pokemon ─────────────────────────────────────────
function extractWildPokemon(text) {
  const re = /wild\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({
      type: "wild-pokemon",
      id: `wild_dex${m[1]}`,
      pokedexNumber: parseInt(m[1], 10),
      x: parseInt(m[2], 10),
      y: parseInt(m[3], 10),
      sourceFile: "wild-pokemon.ts",
    });
  }
  return out;
}

// ── Extract hidden items ─────────────────────────────────────────
function extractHiddenItems(text) {
  // Use a simpler per-block approach instead of greedy cross-field regex
  const re = /id:\s*"([^"]+)"[\s\S]{0,200}?map:\s*"([^"]+)"[\s\S]{0,100}?x:\s*(\d+)[\s\S]{0,20}?y:\s*(\d+)[\s\S]{0,100}?itemId:\s*"([^"]+)"[\s\S]{0,100}?difficulty:\s*"([^"]+)"[\s\S]{0,100}?placement:\s*"([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({
      type: "hidden-item",
      id: m[1],
      map: m[2],
      x: parseInt(m[3], 10),
      y: parseInt(m[4], 10),
      itemId: m[5],
      difficulty: m[6],
      placement: m[7],
      sourceFile: "hiddenItems.ts",
    });
  }
  return out;
}

// ── Extract warps ────────────────────────────────────────────────
function extractWarps(text) {
  const re = /overworldTile:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}[^}]*?targetMap:\s*"([^"]+)"[^}]*?spawnTile:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}[^}]*?spawnFacing:\s*"([^"]+)"/gs;
  const out = [];
  let m, i = 0;
  while ((m = re.exec(text)) !== null) {
    out.push({
      type: "warp",
      id: `warp_${i++}`,
      x: parseInt(m[1], 10),
      y: parseInt(m[2], 10),
      targetMap: m[3],
      spawnX: parseInt(m[4], 10),
      spawnY: parseInt(m[5], 10),
      spawnFacing: m[6],
      sourceFile: "warps.ts",
    });
  }
  return out;
}

// ── Extract gates ────────────────────────────────────────────────
function extractGates(text) {
  const body = sliceArrayBody(text, "GATES");
  if (!body) return [];
  // Collect all id positions first, then slice between them
  const idRe = /id:\s*"([^"]+)"/g;
  const idMatches = [];
  let m;
  while ((m = idRe.exec(body)) !== null) {
    idMatches.push({ id: m[1], idx: m.index });
  }
  const out = [];
  for (let i = 0; i < idMatches.length; i++) {
    const start = idMatches[i].idx;
    const end = i + 1 < idMatches.length ? idMatches[i + 1].idx : body.length;
    const slice = body.slice(start, end);
    const typeM = slice.match(/type:\s*"([^"]+)"/);
    const moveM = slice.match(/requiredMove:\s*"([^"]+)"/);
    const npcIdM = slice.match(/npcId:\s*"([^"]+)"/);
    out.push({
      type: "gate",
      id: idMatches[i].id,
      gateType: typeM?.[1] || "terrain",
      requiredMove: moveM?.[1] || "",
      npcId: npcIdM?.[1],
      sourceFile: "gates.ts",
    });
  }
  return out;
}

// ── Main ─────────────────────────────────────────────────────────
const npcsText = readFileSync(resolve(ROOT, "src/game/data/npcs.ts"), "utf-8");
const wildText = readFileSync(resolve(ROOT, "src/game/data/wild-pokemon.ts"), "utf-8");
const hiddenText = readFileSync(resolve(ROOT, "src/game/data/hiddenItems.ts"), "utf-8");
const warpsText = readFileSync(resolve(ROOT, "src/game/data/warps.ts"), "utf-8");
const gatesText = readFileSync(resolve(ROOT, "src/game/data/gates.ts"), "utf-8");

const mauvilleNpcs = extractFullNpcsFromTopLevel(npcsText, "MAUVILLE_NPCS_RAW", true, "npcs.ts");
const routeNpcs = extractFullNpcsFromTopLevel(npcsText, "ROUTE_NPCS", false, "npcs.ts");
const wildPokemon = extractWildPokemon(wildText);
const mauvilleSigns = extractSigns(npcsText, "MAUVILLE_SIGNS_RAW", true);
const routeSigns = extractSigns(npcsText, "ROUTE_SIGNS", false);
const hiddenItems = extractHiddenItems(hiddenText);
const warps = extractWarps(warpsText);
const gates = extractGates(gatesText);

const allEntities = [
  ...mauvilleNpcs,
  ...routeNpcs,
  ...wildPokemon,
  ...mauvilleSigns,
  ...routeSigns,
  ...hiddenItems,
  ...warps,
  ...gates,
];

const data = {
  generatedAt: new Date().toISOString(),
  entityCount: allEntities.length,
  byType: {
    npc: allEntities.filter(e => e.type === "npc").length,
    "pokemon-npc": allEntities.filter(e => e.type === "pokemon-npc").length,
    pickup: allEntities.filter(e => e.type === "pickup").length,
    "wild-pokemon": wildPokemon.length,
    sign: mauvilleSigns.length + routeSigns.length,
    "hidden-item": hiddenItems.length,
    warp: warps.length,
    gate: gates.length,
  },
  entities: allEntities,
  mapSize: { width: 140, height: 120 },
  spawn: { x: 72, y: 58 },
  mauvilleOrigin: { x: 50, y: 50 },
};

const outPath = resolve(ROOT, "editor-data.json");
writeFileSync(outPath, JSON.stringify(data, null, 2));

console.log(`editor-data.json generated: ${allEntities.length} entities`);
console.log(`  NPCs: ${data.byType.npc}, Pokemon NPCs: ${data.byType["pokemon-npc"]}, Pickups: ${data.byType.pickup}`);
console.log(`  Wild Pokemon: ${data.byType["wild-pokemon"]}, Signs: ${data.byType.sign}`);
console.log(`  Hidden Items: ${data.byType["hidden-item"]}, Warps: ${data.byType.warp}, Gates: ${data.byType.gate}`);
