/**
 * Party data for the Pokemon party menu.
 *
 * Each party member maps to one of Kostas's top projects,
 * represented as a Pokemon with stats, moves, and types.
 * "Moves" = key technologies/skills used in the project.
 */

export type Gender = "male" | "female" | "none";

/** Pokemon type names matching the OG type icon filenames in /game/ui/types/ */
export type PokeType =
  | "normal" | "fire" | "water" | "grass" | "electric" | "ice"
  | "fight" | "poison" | "ground" | "flying" | "psychic"
  | "bug" | "rock" | "ghost" | "steel" | "dragon" | "dark";

export interface Move {
  name: string;
  type: PokeType;
  pp: number;
  maxPp: number;
  description: string;
}

export interface PartyMember {
  /**
   * Stable save-state id. Slug, never changes once chosen.
   * Used by `save.partyMemberIds` and `save.fieldMoves` keys.
   */
  id: string;
  nickname: string;
  species: string;
  level: number;
  hp: number;
  maxHp: number;
  gender: Gender;
  projectName: string;
  url?: string;
  /** Pokedex number for the summary screen */
  dexNo: number;
  /** Up to 4 "moves" = project technologies */
  moves: Move[];
  /** Short project description */
  description: string;
}

/**
 * Party member decorated with runtime field-move state. Returned by
 * `getActiveParty()` so callers don't have to read the save themselves.
 */
export interface ActivePartyMember extends PartyMember {
  /** Field moves this Pokemon has learned (see PartySystem). */
  fieldMoves: string[];
}

/**
 * Every possible party member. The `save.partyMemberIds` array
 * selects which subset is currently active — see `getActiveParty()`
 * in `src/game/systems/PartySystem.ts`.
 */
export const ALL_PARTY: PartyMember[] = [
  {
    id: "medic",
    nickname: "MEDiC",
    species: "latias",
    dexNo: 380,
    level: 85,
    hp: 294,
    maxHp: 294,
    gender: "female",
    projectName: "MEDiC",
    url: "https://github.com/drkostas/MEDiC",
    description: "CLIP distillation framework for medical imaging.",
    moves: [
      { name: "CLIP DISTILL", type: "psychic", pp: 30, maxPp: 30, description: "Distills vision-language knowledge into compact medical models." },
      { name: "CONTRASTIVE", type: "dragon", pp: 25, maxPp: 25, description: "Contrastive learning aligns image and text embeddings." },
      { name: "FINE-TUNE", type: "fire", pp: 20, maxPp: 20, description: "Fine-tunes pretrained models on medical datasets." },
      { name: "ZERO-SHOT", type: "flying", pp: 15, maxPp: 15, description: "Zero-shot classification without task-specific training." },
    ],
  },
  {
    id: "fleetsmart",
    nickname: "FleetSmart",
    species: "kyogre",
    dexNo: 382,
    level: 72,
    hp: 268,
    maxHp: 268,
    gender: "none",
    projectName: "FleetSmart.ai",
    url: "https://fleetsmart.ai",
    description: "Maritime AI platform for fleet route optimization.",
    moves: [
      { name: "ROUTE OPTIM", type: "water", pp: 30, maxPp: 30, description: "Optimizes vessel routes using weather and current data." },
      { name: "FUEL PREDICT", type: "fire", pp: 25, maxPp: 25, description: "ML-based fuel consumption prediction for vessels." },
      { name: "RISK ASSESS", type: "dark", pp: 20, maxPp: 20, description: "Evaluates voyage risk from real-time maritime data." },
      { name: "FLEET DASH", type: "steel", pp: 15, maxPp: 15, description: "Real-time dashboard for fleet monitoring." },
    ],
  },
  {
    id: "maskdistill",
    nickname: "MaskDistill",
    species: "absol",
    dexNo: 359,
    level: 84,
    hp: 244,
    maxHp: 244,
    gender: "male",
    projectName: "MaskDistill-PyTorch",
    url: "https://github.com/drkostas/MaskDistill-PyTorch",
    description: "Knowledge distillation with attention masking.",
    moves: [
      { name: "KD MASKING", type: "dark", pp: 30, maxPp: 30, description: "Masks attention maps to guide knowledge transfer." },
      { name: "SELF-ATTN", type: "psychic", pp: 25, maxPp: 25, description: "Self-attention mechanism for feature selection." },
      { name: "AUGMENT", type: "normal", pp: 20, maxPp: 20, description: "Data augmentation pipeline for robust training." },
      { name: "BENCHMARK", type: "steel", pp: 15, maxPp: 15, description: "Evaluates on CIFAR, ImageNet, and medical datasets." },
    ],
  },
  {
    id: "xpensai",
    nickname: "XpensAI",
    species: "manectric",
    dexNo: 310,
    level: 75,
    hp: 232,
    maxHp: 232,
    gender: "male",
    projectName: "XpensAI",
    url: "https://github.com/drkostas/XpensAI",
    description: "AI-powered expense management with receipt scanning.",
    moves: [
      { name: "OCR SCAN", type: "electric", pp: 30, maxPp: 30, description: "Extracts text from receipt images using OCR." },
      { name: "CATEGORIZE", type: "normal", pp: 25, maxPp: 25, description: "Auto-categorizes expenses with ML classification." },
      { name: "DASHBOARD", type: "psychic", pp: 20, maxPp: 20, description: "Interactive analytics dashboard for spending." },
      { name: "EXPORT", type: "steel", pp: 15, maxPp: 15, description: "Exports reports to CSV, PDF, and cloud storage." },
    ],
  },
  {
    id: "shiftmd",
    nickname: "ShiftMD",
    species: "breloom",
    dexNo: 286,
    level: 68,
    hp: 218,
    maxHp: 218,
    gender: "male",
    projectName: "ShiftMD",
    url: "https://github.com/drkostas/ShiftMD",
    description: "Medical shift scheduling optimizer using constraint programming.",
    moves: [
      { name: "CONSTRAINT", type: "fight", pp: 30, maxPp: 30, description: "Constraint programming solver for shift rules." },
      { name: "OPTIMIZE", type: "psychic", pp: 25, maxPp: 25, description: "Multi-objective optimization for fair scheduling." },
      { name: "VALIDATE", type: "normal", pp: 20, maxPp: 20, description: "Validates schedules against hospital policies." },
      { name: "NOTIFY", type: "electric", pp: 15, maxPp: 15, description: "Sends shift notifications to medical staff." },
    ],
  },
  {
    id: "soma",
    nickname: "Soma",
    species: "medicham",
    dexNo: 308,
    level: 65,
    hp: 204,
    maxHp: 204,
    gender: "female",
    projectName: "Soma",
    url: "https://github.com/drkostas/Soma",
    description: "Health metrics dashboard aggregating fitness and wellness data.",
    moves: [
      { name: "AGGREGATE", type: "fight", pp: 30, maxPp: 30, description: "Aggregates data from Garmin, Apple Health, etc." },
      { name: "VISUALIZE", type: "psychic", pp: 25, maxPp: 25, description: "Interactive charts for health trend analysis." },
      { name: "SYNC API", type: "electric", pp: 20, maxPp: 20, description: "Real-time sync with fitness device APIs." },
      { name: "GOAL TRACK", type: "grass", pp: 15, maxPp: 15, description: "Tracks progress toward health and fitness goals." },
    ],
  },
];

/** Quick id → member lookup. */
export const PARTY_BY_ID: Record<string, PartyMember> =
  Object.fromEntries(ALL_PARTY.map((p) => [p.id, p]));

/**
 * Which party members the player starts with. Engine phase keeps all
 * 6 so nothing breaks; content phase drops this to the real 4-member
 * starter set plus the mid-game and endgame joins.
 */
export const STARTING_PARTY_IDS: string[] = ALL_PARTY.map((p) => p.id);

/**
 * @deprecated Use `ALL_PARTY` for the static catalog or
 * `getActiveParty()` for the player's current party. Kept as an
 * alias so type-only consumers (PokemonSummary) don't churn during
 * the migration. Remove once every consumer is migrated.
 */
export const PARTY = ALL_PARTY;
