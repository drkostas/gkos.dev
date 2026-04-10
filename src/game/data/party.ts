/**
 * Party data for the Pokemon party menu.
 *
 * Each party member maps to one of Kostas's top projects,
 * represented as a Pokemon with stats, moves, and types.
 */

export type Gender = "male" | "female" | "none";

export interface PartyMember {
  /** Species name (displayed) */
  nickname: string;
  /** Pokemon species (for icon sprite path) */
  species: string;
  /** Display level */
  level: number;
  /** Current HP */
  hp: number;
  /** Max HP */
  maxHp: number;
  /** Gender symbol */
  gender: Gender;
  /** Project this Pokemon represents */
  projectName: string;
  /** URL to the project */
  url?: string;
}

/**
 * Kostas's party — his 6 flagship projects as Pokemon.
 * Ordered by significance (lead = most important).
 */
export const PARTY: PartyMember[] = [
  {
    nickname: "MEDiC",
    species: "latias",
    level: 85,
    hp: 294,
    maxHp: 294,
    gender: "female",
    projectName: "MEDiC",
    url: "https://github.com/drkostas/MEDiC",
  },
  {
    nickname: "FleetSmart",
    species: "kyogre",
    level: 72,
    hp: 268,
    maxHp: 268,
    gender: "none",
    projectName: "FleetSmart.ai",
    url: "https://fleetsmart.ai",
  },
  {
    nickname: "MaskDistll",
    species: "absol",
    level: 84,
    hp: 244,
    maxHp: 244,
    gender: "male",
    projectName: "MaskDistill-PyTorch",
    url: "https://github.com/drkostas/MaskDistill-PyTorch",
  },
  {
    nickname: "XpensAI",
    species: "manectric",
    level: 75,
    hp: 232,
    maxHp: 232,
    gender: "male",
    projectName: "XpensAI",
    url: "https://github.com/drkostas/XpensAI",
  },
  {
    nickname: "ShiftMD",
    species: "breloom",
    level: 68,
    hp: 218,
    maxHp: 218,
    gender: "male",
    projectName: "ShiftMD",
    url: "https://github.com/drkostas/ShiftMD",
  },
  {
    nickname: "Soma",
    species: "medicham",
    level: 65,
    hp: 204,
    maxHp: 204,
    gender: "female",
    projectName: "Soma",
    url: "https://github.com/drkostas/Soma",
  },
];
