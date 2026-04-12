/**
 * Wild Pokemon placements on the overworld.
 *
 * Each entry places a Pokemon NPC on the map. First encounter triggers
 * a flash + dialog + Pokedex registration. Repeat encounters show
 * shorter dialog.
 */

import { Direction } from "grid-engine";
import { MovementBehavior, type NPCDefinition } from "@/game/types/npc";
import { POKEDEX } from "@/game/data/pokemon";

/** Build a wild Pokemon NPC from a Pokedex entry number + map position. */
function wild(
  pokedexNum: number,
  x: number,
  y: number,
  repeatDialog?: string[],
): NPCDefinition {
  const entry = POKEDEX.find((p) => p.number === pokedexNum)!;
  const species = entry.pokemon;
  return {
    id: `wild_${species.toLowerCase()}`,
    spriteKey: `pkmn_${species.toLowerCase()}`,
    position: { x, y },
    facingDirection: Direction.DOWN,
    movementBehavior: MovementBehavior.STATIONARY,
    movementRangeX: 0,
    movementRangeY: 0,
    dialog: [],
    animated: false,
    pokemon: {
      pokedexNumber: entry.number,
      speciesName: species.toUpperCase(),
      projectName: entry.name,
      projectDescription: entry.description,
      projectUrl: entry.url,
      repeatDialog,
    },
  };
}

/**
 * All wild Pokemon NPC definitions.
 * Positions are in stitched-map coordinates. All verified walkable.
 */
export const WILD_POKEMON: NPCDefinition[] = [
  // ── Route 117 (west) — 7 Pokemon ───────────────────────
  // All positions validated via map-analyzer --test X,Y (2026-04-12)
  wild(1,   27, 59),  // MEDiC → Latias (was 3,52 — unreachable)
  wild(6,   19, 65),  // Soma → Medicham (reachable ✓)
  wild(8,   25, 60),  // Dementia AI → Camerupt (was 30,53 — unreachable)
  wild(12,  41, 60),  // YAML Configs → Seviper (was 8,65 — unreachable)
  wild(22,  46, 62),  // HF Datasets → Flygon (was 40,51 — unreachable)
  wild(17,  40, 61),  // MySQL Wrapper → Lairon (was 14,53 — unreachable)
  wild(25,  34, 63),  // Colorized KNN → Claydol (reachable ✓)

  // ── Route 118 (east) — 7 Pokemon ───────────────────────
  wild(2,  103, 57),  // FleetSmart.ai → Kyogre (reachable ✓)
  wild(31,  94, 60),  // Portfolio v2 → Blaziken (reachable ✓)
  wild(11,  96, 59),  // Cloud-DevOps → Swellow (reachable ✓)
  wild(14, 104, 60),  // Cross-Fetch → Wailord (was 130,59 — unreachable)
  wild(16, 100, 61),  // CloudStore → Pelipper (was 108,55 — unreachable)
  wild(21, 102, 65),  // Onoma Bot → Shedinja (was 118,57 — unreachable)
  wild(29, 105, 64),  // Eye in the Sky → Altaria (was 125,55 — unreachable)

  // ── Route 110 (south) — 8 Pokemon ──────────────────────
  wild(4,   55, 95),  // XpensAI → Manectric (reachable ✓)
  wild(3,   63, 81),  // ShiftMD → Breloom (was 67,109 — unreachable)
  wild(10,  54, 100), // ExPLoRe → Glalie (reachable ✓)
  wild(18,  63, 89),  // Email Sender → Delcatty (reachable ✓)
  wild(19,  57, 86),  // Accident Bot → Mawile (was 78,95 — unreachable)
  wild(20,  56, 87),  // Insta Bot → Sableye (was 62,105 — unreachable)
  wild(26,  66, 88),  // RL Grid World → Plusle (was 72,97 — unreachable)
  wild(28,  53, 92),  // iOS MovieDB → Volbeat (was 57,107 — unreachable)

  // ── Route 111 (north) — 7 Pokemon ──────────────────────
  wild(5,   82, 25),  // MaskDistill → Absol (was 66,21 — unreachable)
  wild(7,   73, 15),  // Cross-Scale MAE → Salamence (reachable ✓)
  wild(9,   70, 30),  // Koopman KTD → Banette (reachable ✓)
  wild(13,  62, 15),  // Termcolor → Torkoal (reachable ✓)
  wild(24,  78, 40),  // DSE 512 → Solrock (reachable ✓)
  wild(27,  71, 34),  // Stereo Depth → Vibrava (was 75,25 — unreachable)
  wild(30,  73, 39),  // Face Detector → Kirlia (was 64,35 — unreachable)

  // ── Mauville City — 2 Pokemon ──────────────────────────
  wild(15,  80, 66),  // ElasticDB → Aggron (reachable ✓)
  wild(23,  55, 55),  // Py Template → Trapinch (reachable ✓)
];

/** Species names used by wild Pokemon — for sprite preloading. */
export const WILD_POKEMON_SPECIES = [
  ...new Set(WILD_POKEMON.map((w) => w.spriteKey.replace("pkmn_", ""))),
];
