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
  // ── Route 117 (west) — 5 Pokemon ───────────────────────
  wild(1,   3,  52),  // MEDiC → Latias
  wild(6,  19,  65),  // Soma → Medicham
  wild(8,  30,  53),  // HGG in RS → Camerupt
  wild(12,  8,  65),  // YAML Configs → Seviper
  wild(22, 40,  51),  // HF Datasets → Flygon

  // ── Route 118 (east) — 5 Pokemon ───────────────────────
  wild(2,  103, 57),  // FleetSmart.ai → Kyogre
  wild(31,  94, 60),  // Portfolio v2 → Blaziken
  wild(11,  96, 59),  // Cloud-DevOps → Swellow
  wild(14, 130, 59),  // Cross-Fetch → Wailord
  wild(16, 108, 55),  // CloudStore → Pelipper

  // ── Route 110 (south) — 6 Pokemon ──────────────────────
  wild(4,   55, 95),  // XpensAI → Manectric
  wild(3,   67, 109), // ShiftMD → Breloom
  wild(10,  54, 100), // ACUTE → Glalie
  wild(18,  63, 89),  // Email Sender → Delcatty
  wild(19,  78, 95),  // Accident Bot → Mawile
  wild(20,  62, 105), // Insta Bot → Sableye

  // ── Route 111 (north) — 5 Pokemon ──────────────────────
  wild(5,   66, 21),  // MaskDistill → Absol
  wild(7,   73, 15),  // Cross-Scale MAE → Salamence
  wild(9,   70, 30),  // 3D Fused LSGAN → Banette
  wild(13,  62, 15),  // Termcolor → Torkoal
  wild(24,  78, 40),  // DSE 512 → Solrock

  // ── Mauville City — 2 Pokemon ──────────────────────────
  wild(15,  80, 66),  // ElasticDB → Aggron
  wild(23,  55, 55),  // Py Template → Trapinch
];

/** Species names used by wild Pokemon — for sprite preloading. */
export const WILD_POKEMON_SPECIES = [
  ...new Set(WILD_POKEMON.map((w) => w.spriteKey.replace("pkmn_", ""))),
];
