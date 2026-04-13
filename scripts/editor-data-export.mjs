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

// Map MovementBehavior enum keys to their actual string values
const MOVE_ENUM_MAP = {
  STATIONARY: "stationary", WANDER_LEFT_RIGHT: "wander_left_right",
  WANDER_UP_DOWN: "wander_up_down", WANDER_AREA: "wander_area",
  PACE_HORIZONTAL: "pace_horizontal", PACE_VERTICAL: "pace_vertical",
  RUN_HORIZONTAL: "run_horizontal", RUN_VERTICAL: "run_vertical",
  LOOK_AROUND: "look_around",
};

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

// ── Resolve dialog variable references ───────────────────────────
// When dialog: SOME_CONSTANT, find the constant's definition in the
// live NPC source files and extract the string literals from it.
const dialogVarCache = new Map();
function resolveDialogVar(varName) {
  if (dialogVarCache.has(varName)) return dialogVarCache.get(varName);
  const liveDir = resolve(ROOT, "src/game/npcs/live");
  const files = ["github.ts", "spotify.ts", "strava.ts", "pypi.ts", "steps.ts"];
  for (const f of files) {
    try {
      const text = readFileSync(resolve(liveDir, f), "utf-8");
      const re = new RegExp(`export\\s+const\\s+${varName}[^=]*=\\s*\\[([\\s\\S]*?)\\];`);
      const m = text.match(re);
      if (m) {
        const lines = [];
        const lineRe = /"([^"]*)"/g;
        let lm;
        while ((lm = lineRe.exec(m[1])) !== null) lines.push(lm[1]);
        dialogVarCache.set(varName, lines);
        return lines;
      }
    } catch {}
  }
  dialogVarCache.set(varName, []);
  return [];
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
      const afterDialog = slice.substring(dlgStart + 7).trimStart();
      if (afterDialog.startsWith("[")) {
        // Inline array: dialog: ["line1", "line2"]
        const bracketStart = slice.indexOf("[", dlgStart);
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
      } else {
        // Variable reference: dialog: SOME_FALLBACK_LINES,
        const varMatch = afterDialog.match(/^([A-Z_][A-Z0-9_]*)/);
        if (varMatch) {
          dialog = resolveDialogVar(varMatch[1]);
        }
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
      movementBehavior: MOVE_ENUM_MAP[movM?.[1]] || movM?.[1] || "stationary",
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

// ── Extract Pokedex species mapping ──────────────────────────────
function buildPokedexMap(pokemonText) {
  const map = {};
  const re = /number:\s*(\d+)[^}]*pokemon:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(pokemonText)) !== null) {
    map[parseInt(m[1], 10)] = m[2].toLowerCase();
  }
  return map;
}

// ── Extract wild Pokemon ─────────────────────────────────────────
function extractWildPokemon(text, pokedexMap) {
  const re = /wild\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const dexNum = parseInt(m[1], 10);
    const species = pokedexMap[dexNum] || null;
    out.push({
      type: "wild-pokemon",
      id: `wild_dex${m[1]}`,
      pokedexNumber: dexNum,
      speciesName: species,
      iconKey: species ? `pkmn_icon_${species}` : null,
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

// ── Extract item definitions ────────────────────────────────────
function extractItemDefinitions(text) {
  // ITEM_DEFINITIONS is a Record<string, ItemDef> — find each block by id field
  const startMarker = "ITEM_DEFINITIONS";
  const recStart = text.indexOf(startMarker);
  if (recStart === -1) return [];
  const afterRec = text.substring(recStart);

  const out = [];
  const idRe = /id:\s*"([^"]+)"/g;
  const idMatches = [];
  let m;
  while ((m = idRe.exec(afterRec)) !== null) idMatches.push({ id: m[1], idx: m.index });

  for (let i = 0; i < idMatches.length; i++) {
    const start = idMatches[i].idx;
    const end = i + 1 < idMatches.length ? idMatches[i + 1].idx : afterRec.length;
    const slice = afterRec.slice(start, end);
    const nameM = slice.match(/name:\s*"([^"]+)"/);
    const pocketM = slice.match(/pocket:\s*"([^"]+)"/);
    const urlM = slice.match(/url:\s*"([^"]+)"/);
    const iconM = slice.match(/icon:\s*"([^"]+)"/);
    // Description can be multi-line with string concatenation — capture all quoted segments
    const descParts = [];
    const descStart = slice.indexOf("description:");
    if (descStart !== -1) {
      const descSlice = slice.substring(descStart, descStart + 300);
      const descLineRe = /"([^"]*)"/g;
      let dm;
      // Stop after hitting url: or icon: or pocket: or the closing }
      const nextField = descSlice.search(/\b(url|icon|pocket)\s*:/);
      const descRegion = nextField > 0 ? descSlice.substring(0, nextField) : descSlice;
      while ((dm = descLineRe.exec(descRegion)) !== null) descParts.push(dm[1]);
    }
    out.push({
      id: idMatches[i].id,
      name: nameM?.[1] || "",
      pocket: pocketM?.[1] || "",
      description: descParts.join("\n"),
      url: urlM?.[1] || "",
      icon: iconM?.[1] || "",
    });
  }
  return out;
}

// ── Extract step milestones (TM shop) ───────────────────────────
function extractStepMilestones(text) {
  const body = sliceArrayBody(text, "STEP_MILESTONES");
  if (!body) return [];
  const out = [];
  const re = /steps:\s*(\d+)[^}]*itemId:\s*"([^"]+)"[^}]*tm:\s*"([^"]+)"[^}]*description:\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({
      steps: parseInt(m[1], 10),
      itemId: m[2],
      tm: m[3],
      description: m[4],
    });
  }
  return out;
}

// ── Extract full pokedex ────────────────────────────────────────
function extractFullPokedex(text) {
  const body = sliceArrayBody(text, "POKEDEX");
  if (!body) return [];
  const out = [];
  // Split by number: field to get each entry
  const re = /number:\s*(\d+)[^}]*name:\s*"([^"]+)"[^}]*level:\s*(\d+)[^}]*types:\s*\["([^"]+)",\s*"([^"]+)"\][^}]*status:\s*"([^"]+)"[^}]*pokemon:\s*"([^"]+)"[^}]*description:\s*"([^"]*)"(?:[^}]*url:\s*"([^"]*)")?/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({
      number: parseInt(m[1], 10),
      name: m[2],
      level: parseInt(m[3], 10),
      types: [m[4], m[5]],
      status: m[6],
      pokemon: m[7],
      description: m[8],
      url: m[9] || "",
    });
  }
  return out;
}

// ── Extract party pokemon ───────────────────────────────────────
function extractParty(text) {
  const body = sliceArrayBody(text, "ALL_PARTY");
  if (!body) return [];
  const out = [];
  const idRe = /id:\s*"([^"]+)"/g;
  const idMatches = [];
  let m;
  while ((m = idRe.exec(body)) !== null) idMatches.push({ id: m[1], idx: m.index });

  for (let i = 0; i < idMatches.length; i++) {
    const start = idMatches[i].idx;
    const end = i + 1 < idMatches.length ? idMatches[i + 1].idx : body.length;
    const slice = body.slice(start, end);
    const nickM = slice.match(/nickname:\s*"([^"]+)"/);
    const specM = slice.match(/species:\s*"([^"]+)"/);
    const lvlM = slice.match(/level:\s*(\d+)/);
    const hpM = slice.match(/hp:\s*(\d+)/);
    const maxHpM = slice.match(/maxHp:\s*(\d+)/);
    const projM = slice.match(/projectName:\s*"([^"]+)"/);
    const urlM = slice.match(/url:\s*"([^"]+)"/);
    const descM = slice.match(/description:\s*"([^"]*)"/);
    const dexM = slice.match(/dexNo:\s*(\d+)/);
    // Extract moves array
    const moves = [];
    const moveRe = /name:\s*"([^"]+)"[^}]*type:\s*"([^"]+)"[^}]*pp:\s*(\d+)[^}]*maxPp:\s*(\d+)[^}]*description:\s*"([^"]*)"/g;
    const movesStart = slice.indexOf("moves:");
    if (movesStart !== -1) {
      const movesSlice = slice.substring(movesStart);
      let mm;
      while ((mm = moveRe.exec(movesSlice)) !== null) {
        moves.push({ name: mm[1], type: mm[2], pp: parseInt(mm[3], 10), maxPp: parseInt(mm[4], 10), description: mm[5] });
      }
    }
    out.push({
      id: idMatches[i].id,
      nickname: nickM?.[1] || "",
      species: specM?.[1] || "",
      level: lvlM ? parseInt(lvlM[1], 10) : 1,
      hp: hpM ? parseInt(hpM[1], 10) : 1,
      maxHp: maxHpM ? parseInt(maxHpM[1], 10) : 1,
      projectName: projM?.[1] || "",
      url: urlM?.[1] || "",
      description: descM?.[1] || "",
      dexNo: dexM ? parseInt(dexM[1], 10) : 0,
      moves,
    });
  }
  return out;
}

// ── Extract badges ──────────────────────────────────────────────
function extractBadges(text) {
  const body = sliceArrayBody(text, "BADGES");
  if (!body) return [];
  const out = [];
  const idRe = /id:\s*"([^"]+)"/g;
  const idMatches = [];
  let m;
  while ((m = idRe.exec(body)) !== null) idMatches.push({ id: m[1], idx: m.index });

  for (let i = 0; i < idMatches.length; i++) {
    const start = idMatches[i].idx;
    const end = i + 1 < idMatches.length ? idMatches[i + 1].idx : body.length;
    const slice = body.slice(start, end);
    const nameM = slice.match(/name:\s*"([^"]+)"/);
    const hintM = slice.match(/hint:\s*"([^"]+)"/);
    const autoM = slice.match(/auto:\s*(true|false)/);
    out.push({
      id: idMatches[i].id,
      name: nameM?.[1] || "",
      hint: hintM?.[1] || "",
      auto: autoM?.[1] === "true",
      hasCondition: /condition\s*:/.test(slice),
    });
  }
  return out;
}

// ── Extract field move awards ───────────────────────────────────
function extractFieldMoveAwards(text) {
  const body = sliceArrayBody(text, "FIELD_MOVE_AWARDS");
  if (!body) return [];
  const out = [];
  const re = /badgeId:\s*"([^"]+)"[^}]*pokemonId:\s*"([^"]+)"[^}]*moveName:\s*"([^"]+)"[^}]*learnMessage:\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({ badgeId: m[1], pokemonId: m[2], moveName: m[3], learnMessage: m[4] });
  }
  return out;
}

// ── Extract research log ────────────────────────────────────────
function extractResearchLog(text) {
  const body = sliceArrayBody(text, "LOG_ENTRIES");
  if (!body) return [];
  const out = [];
  const numRe = /number:\s*(\d+)/g;
  const numMatches = [];
  let m;
  while ((m = numRe.exec(body)) !== null) numMatches.push({ num: parseInt(m[1], 10), idx: m.index });

  for (let i = 0; i < numMatches.length; i++) {
    const start = numMatches[i].idx;
    const end = i + 1 < numMatches.length ? numMatches[i + 1].idx : body.length;
    const slice = body.slice(start, end);
    const titleM = slice.match(/title:\s*"([^"]+)"/);
    const threshM = slice.match(/threshold:\s*(\d+)/);
    // Extract text array
    const textLines = [];
    const textStart = slice.indexOf("text:");
    if (textStart !== -1) {
      const bracketStart = slice.indexOf("[", textStart);
      if (bracketStart !== -1) {
        let depth = 1, j = bracketStart + 1;
        while (j < slice.length && depth > 0) {
          if (slice[j] === "[") depth++;
          else if (slice[j] === "]") depth--;
          j++;
        }
        const textBody = slice.slice(bracketStart + 1, j - 1);
        const lineRe = /"([^"]*)"/g;
        let lm;
        while ((lm = lineRe.exec(textBody)) !== null) textLines.push(lm[1]);
      }
    }
    out.push({
      number: numMatches[i].num,
      title: titleM?.[1] || "",
      threshold: threshM ? parseInt(threshM[1], 10) : 0,
      text: textLines,
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
const pokemonText = readFileSync(resolve(ROOT, "src/game/data/pokemon.ts"), "utf-8");

const itemDefsText = readFileSync(resolve(ROOT, "src/game/data/itemDefinitions.ts"), "utf-8");
const stepMilestonesText = readFileSync(resolve(ROOT, "src/game/systems/StepMilestones.ts"), "utf-8");
const partyText = readFileSync(resolve(ROOT, "src/game/data/party.ts"), "utf-8");
const badgesText = readFileSync(resolve(ROOT, "src/game/systems/BadgeMilestones.ts"), "utf-8");
const fmaText = readFileSync(resolve(ROOT, "src/game/data/fieldMoveAwards.ts"), "utf-8");
const researchLogText = readFileSync(resolve(ROOT, "src/game/data/researchLog.ts"), "utf-8");

const pokedexMap = buildPokedexMap(pokemonText);
const mauvilleNpcs = extractFullNpcsFromTopLevel(npcsText, "MAUVILLE_NPCS_RAW", true, "npcs.ts");
const routeNpcs = extractFullNpcsFromTopLevel(npcsText, "ROUTE_NPCS", false, "npcs.ts");
const wildPokemon = extractWildPokemon(wildText, pokedexMap);
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

// ── Extract interior data ────────────────────────────────────────
const interiorsText = readFileSync(resolve(ROOT, "src/game/data/interiors.ts"), "utf-8");
function extractInteriors(text) {
  const interiors = {};
  // Extract each interior block
  for (const key of ["pokecenter", "mart", "gym"]) {
    const start = text.indexOf(`${key}: {`);
    if (start === -1) continue;

    const npcs = [];
    const exitWarps = [];
    const pcTiles = [];

    // Extract NPCs by finding id: "..." patterns
    const blockStart = start;
    const blockEnd = Math.min(text.indexOf("\n  },", blockStart + 100) + 5, text.length);
    const block = text.substring(blockStart, blockEnd > blockStart ? blockEnd : blockStart + 3000);

    // NPC extraction — use ID-based block slicing for full field extraction
    const npcBlock = block.substring(block.indexOf("npcs:"));
    const idRe = /id:\s*"([^"]+)"/g;
    const idMatches = [];
    let m;
    while ((m = idRe.exec(npcBlock)) !== null) idMatches.push({ id: m[1], idx: m.index });

    for (let ni = 0; ni < idMatches.length; ni++) {
      const nStart = idMatches[ni].idx;
      const nEnd = ni + 1 < idMatches.length ? idMatches[ni + 1].idx : npcBlock.length;
      const slice = npcBlock.slice(nStart, nEnd);
      const posM = slice.match(/position:\s*\{\s*x:\s*(\d+)\s*,\s*y:\s*(\d+)\s*\}/);
      if (!posM) continue;
      const facingM = slice.match(/facingDirection:\s*"([^"]+)"/);
      const spriteM = slice.match(/spriteKey:\s*"([^"]+)"/);
      const speakerM = slice.match(/speakerName:\s*"([^"]+)"/);
      const movM = slice.match(/movementBehavior:\s*(?:MovementBehavior\.)?(?:")?(\w+)(?:")?/);
      const rxM = slice.match(/movementRangeX:\s*(\d+)/);
      const ryM = slice.match(/movementRangeY:\s*(\d+)/);
      const hasDialogFn = /dialogFn\s*:/.test(slice);
      // Extract autoGive
      let autoGive = null;
      if (slice.includes("autoGive:")) {
        const agItemM = slice.match(/itemId:\s*"([^"]+)"/);
        if (agItemM) {
          autoGive = { itemId: agItemM[1] };
          const asideM = slice.match(/asidePosition:\s*\{\s*x:\s*(\d+)\s*,\s*y:\s*(\d+)\s*\}/);
          if (asideM) {
            autoGive.asideX = parseInt(asideM[1], 10);
            autoGive.asideY = parseInt(asideM[2], 10);
          }
          const clearedDlgM = slice.match(/clearedDialog:\s*\[([\s\S]*?)\]/);
          if (clearedDlgM) {
            const lines = [];
            const lineRe = /"([^"]*)"/g;
            let m2;
            while ((m2 = lineRe.exec(clearedDlgM[1])) !== null) lines.push(m2[1]);
            if (lines.length) autoGive.clearedDialog = lines;
          }
        }
      }
      // Extract dialog lines
      let dialog = [];
      const dlgStart = slice.indexOf("dialog:");
      if (dlgStart !== -1) {
        const afterDlg = slice.substring(dlgStart + 7).trimStart();
        if (afterDlg.startsWith("[")) {
          const bracketStart = slice.indexOf("[", dlgStart);
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
        } else {
          const varMatch = afterDlg.match(/^([A-Z_][A-Z0-9_]*)/);
          if (varMatch) dialog = resolveDialogVar(varMatch[1]);
        }
      }
      npcs.push({
        type: "npc",
        id: idMatches[ni].id,
        x: parseInt(posM[1], 10),
        y: parseInt(posM[2], 10),
        facingDirection: facingM?.[1] || "down",
        spriteKey: spriteM?.[1] || undefined,
        movementBehavior: MOVE_ENUM_MAP[movM?.[1]] || movM?.[1] || "stationary",
        movementRangeX: rxM ? parseInt(rxM[1], 10) : 0,
        movementRangeY: ryM ? parseInt(ryM[1], 10) : 0,
        speakerName: speakerM?.[1] || "",
        dialog,
        hasDialogFn,
        autoGive,
        sourceFile: "interiors.ts",
        interior: key,
      });
    }

    // Exit warp tiles
    const warpRe = /exitWarpTiles:\s*\[([\s\S]*?)\]/;
    const warpMatch = warpRe.exec(block);
    if (warpMatch) {
      const coordRe = /x:\s*(\d+)\s*,\s*y:\s*(\d+)/g;
      let wm;
      let wi = 0;
      while ((wm = coordRe.exec(warpMatch[1])) !== null) {
        exitWarps.push({ type: "warp", id: `${key}_exit_${wi}`, x: parseInt(wm[1], 10), y: parseInt(wm[2], 10), interior: key });
        wi++;
      }
    }

    // PC tiles
    const pcRe = /pcTiles:\s*\[([\s\S]*?)\]/;
    const pcMatch = pcRe.exec(block);
    if (pcMatch) {
      const coordRe = /x:\s*(\d+)\s*,\s*y:\s*(\d+)/g;
      let pm;
      let pi = 0;
      while ((pm = coordRe.exec(pcMatch[1])) !== null) {
        pcTiles.push({ type: "special", id: `${key}_pc_${pi}`, x: parseInt(pm[1], 10), y: parseInt(pm[2], 10), specialType: "pc", interior: key });
        pi++;
      }
    }

    // Add gym switches
    const switches = [];
    if (key === "gym") {
      switches.push(
        { type: "special", id: "gym_switch_1", x: 0, y: 15, specialType: "switch", interior: "gym" },
        { type: "special", id: "gym_switch_2", x: 4, y: 12, specialType: "switch", interior: "gym" },
        { type: "special", id: "gym_switch_3", x: 3, y: 9, specialType: "switch", interior: "gym" },
        { type: "special", id: "gym_switch_4", x: 8, y: 9, specialType: "switch", interior: "gym" },
      );
    }
    // Add gym puzzle solution
    const puzzleSolution = key === "gym" ? {
      switchOrder: [1, 3, 2, 4],
      description: "Press switches in order: #1 (0,15) → #3 (3,9) → #2 (4,12) → #4 (8,9) to reach KOSTAS at (5,2)",
      path: "Entrance (7,20) → Switch 1 → North → Switch 3 → East → Switch 2 → North → Switch 4 → KOSTAS",
    } : null;
    interiors[key] = { npcs, exitWarps, pcTiles, switches, puzzleSolution };
  }
  return interiors;
}

const interiorData = extractInteriors(interiorsText);

// ── Extract KOSTAS_DIALOG structure ─────────────────────────────
function extractKostasDialog(text) {
  const result = { champion: [], badges: {}, received: "", hint: [] };
  // Champion lines
  const champMatch = text.match(/champion:\s*\[([\s\S]*?)\]/);
  if (champMatch) {
    const lineRe = /"([^"]*)"/g;
    let m;
    while ((m = lineRe.exec(champMatch[1])) !== null) result.champion.push(m[1]);
  }
  // Per-badge lines
  for (const badge of ["gym", "publication", "connected", "pokedex", "blogger", "engineer"]) {
    const re = new RegExp(`${badge}:\\s*\\[([\\s\\S]*?)\\]`);
    const m = text.match(re);
    if (m) {
      const lines = [];
      const lineRe = /"([^"]*)"/g;
      let lm;
      while ((lm = lineRe.exec(m[1])) !== null) lines.push(lm[1]);
      result.badges[badge] = lines;
    }
  }
  // Received line
  const recM = text.match(/received:\s*"([^"]+)"/);
  if (recM) result.received = recM[1];
  // Hint lines
  const hintM = text.match(/hint:\s*\[([\s\S]*?)\]/);
  if (hintM) {
    const lineRe = /"([^"]*)"/g;
    let m;
    while ((m = lineRe.exec(hintM[1])) !== null) result.hint.push(m[1]);
  }
  return result;
}
const kostasDialogStart = interiorsText.indexOf("KOSTAS_DIALOG");
const kostasDialog = kostasDialogStart !== -1 ? extractKostasDialog(interiorsText.substring(kostasDialogStart, kostasDialogStart + 2000)) : null;

// ── Extract catalog data ─────────────────────────────────────────
const catalogItemDefs = extractItemDefinitions(itemDefsText);
const catalogMilestones = extractStepMilestones(stepMilestonesText);
const catalogPokedex = extractFullPokedex(pokemonText);
const catalogParty = extractParty(partyText);
const catalogBadges = extractBadges(badgesText);
const catalogFieldMoves = extractFieldMoveAwards(fmaText);
const catalogResearchLog = extractResearchLog(researchLogText);

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
  interiors: interiorData,
  kostasDialog: kostasDialog,
  // Catalog data for the Data Manager panel
  catalog: {
    itemDefinitions: catalogItemDefs,
    stepMilestones: catalogMilestones,
    pokedex: catalogPokedex,
    party: catalogParty,
    badges: catalogBadges,
    fieldMoveAwards: catalogFieldMoves,
    researchLog: catalogResearchLog,
  },
  mapSize: { width: 140, height: 120 },
  spawn: { x: 72, y: 58 },
  mauvilleOrigin: { x: 50, y: 50 },
};

// ── Scan available sprites ───────────────────────────────────────
import { readdirSync } from "fs";
const spriteDir = resolve(ROOT, "public/game/sprites/emerald");
const allNpcSprites = readdirSync(spriteDir)
  .filter(f => f.endsWith(".png"))
  .map(f => f.replace(".png", ""))
  .sort();
const pokemonOwDir = resolve(ROOT, "public/game/sprites/pokemon/overworld");
const allPokemonOw = readdirSync(pokemonOwDir).filter(f => f.endsWith(".png")).map(f => f.replace(".png", "")).sort();
const itemIconDir = resolve(ROOT, "public/game/ui/items");
const allItemIcons = readdirSync(itemIconDir).filter(f => f.endsWith(".png")).map(f => f.replace(".png", "")).sort();

data.availableSprites = {
  npcs: allNpcSprites,
  pokemonOverworld: allPokemonOw,
  itemIcons: allItemIcons,
};

const outPath = resolve(ROOT, "editor-data.json");
writeFileSync(outPath, JSON.stringify(data, null, 2));

console.log(`editor-data.json generated: ${allEntities.length} entities`);
console.log(`  NPCs: ${data.byType.npc}, Pokemon NPCs: ${data.byType["pokemon-npc"]}, Pickups: ${data.byType.pickup}`);
console.log(`  Wild Pokemon: ${data.byType["wild-pokemon"]}, Signs: ${data.byType.sign}`);
console.log(`  Hidden Items: ${data.byType["hidden-item"]}, Warps: ${data.byType.warp}, Gates: ${data.byType.gate}`);
console.log(`  Catalog: ${catalogItemDefs.length} items, ${catalogMilestones.length} TMs, ${catalogPokedex.length} pokedex, ${catalogParty.length} party, ${catalogBadges.length} badges, ${catalogFieldMoves.length} field moves, ${catalogResearchLog.length} log entries`);
