/**
 * Gate system — clearable obstacles that require a field move to clear.
 *
 * A gate represents an obstacle somewhere on the map (a Snorlax asleep
 * on a path, a tinted tree, a special fence) that blocks the player
 * until a party Pokemon knows the required "field move." Field moves
 * are custom-named abilities taught by KOSTAS on badge award (Task
 * 28). Matching is exact string comparison — names like "TERRAFORM",
 * "DECONSTRUCT", "FORCE PUSH" are chosen during the content phase.
 *
 * Two gate types:
 *
 *   "terrain" — a free-standing obstacle. Each tile in `tiles` is
 *               registered as a Grid Engine blocker character with a
 *               decorative sprite. Clearing the gate removes the
 *               characters and destroys the sprites. The player sees
 *               `lockedMessage` if no party Pokemon knows the move.
 *
 *   "npc"     — an existing NPC defined in `npcs.ts` acts as the
 *               obstacle. The gated NPC uses `spawnCondition:
 *               () => !isGateCleared("…")` so it simply doesn't spawn
 *               on next load after clearing. The NPC's own dialog is
 *               the locked message (matching OG Pokemon: once you
 *               have the Poke Flute you never see the Snorlax dialog
 *               again). `lockedMessage` is ignored for NPC gates.
 *
 * Gate definitions live here; save state lives in GameSave's
 * `gatesCleared: string[]`. GateSystem.ts is the runtime wiring.
 *
 * The GATES array ships empty — specific gate definitions are added
 * during the content phase. The engine must handle zero gates with
 * no crashes or wasted cycles.
 */

export interface GateDefinition {
  /** Unique id, used as the key in save.gatesCleared. */
  id: string;
  /** Human-readable description (dev tooling and analyzer only). */
  description: string;
  /** "npc" = attached to an existing NPC. "terrain" = free-standing obstacle. */
  type: "npc" | "terrain";
  /** "overworld" or an interior key. */
  map: "overworld" | string;

  // ── What opens ─────────────────────────────────────────
  /** For NPC gates: the NPC id bound to this gate. */
  npcId?: string;
  /** For terrain gates: the tiles the gate character footprint covers. */
  tiles?: { x: number; y: number }[];
  /**
   * For terrain gates: Phaser texture key for the sprite. Defaults
   * to "placeholder_gate" (a generated hot-pink 16×16 square) if
   * omitted, so dev-time gates are visible without art assets.
   */
  spriteKey?: string;

  // ── When it opens ──────────────────────────────────────
  /**
   * Field move name required to clear this gate. Matched exactly
   * against each party member's `save.fieldMoves[id]` list (keyed by
   * party member id like "medic", NOT species like "latias").
   * Move names are custom (NOT standard Pokemon moves like CUT or
   * SURF). Examples: "TERRAFORM", "DECONSTRUCT", "FORCE PUSH".
   */
  requiredMove: string;

  // ── Player-facing messages ─────────────────────────────
  /**
   * Shown when a party Pokemon knows the required move. Use the
   * `{POKEMON}` placeholder — GateSystem replaces it with the
   * Pokemon's nickname.
   */
  clearMessage: string;
  /**
   * Shown when no party Pokemon knows the move. REQUIRED for
   * terrain gates, IGNORED for NPC gates (the NPC's own dialog is
   * the locked message).
   */
  lockedMessage?: string;
}

/**
 * All gate definitions on every map. Empty by default — specific
 * gates are added during the content phase.
 */
export const GATES: GateDefinition[] = [
  // Snorlax blocks the northern corridor on Route 111. Cleared by
  // FleetSmart (Kyogre) using FORCE PUSH, taught on POKEDEX badge.
  {
    id: "snorlax_gate",
    description: "Snorlax blocking the Route 111 northern path",
    type: "npc",
    map: "overworld",
    npcId: "npc_snorlax",
    requiredMove: "FORCE PUSH",
    clearMessage: "{POKEMON} used FORCE PUSH!\nSNORLAX woke up and lumbered away!",
  },
  // Tinted tree on Route 111 upper area. Cleared by MaskDistill
  // (Absol) using CUT, taught on PUBLICATION badge.
  {
    id: "tree_gate",
    description: "Tinted tree blocking Route 111 upper passage",
    type: "terrain",
    map: "overworld",
    tiles: [{ x: 66, y: 20 }],
    spriteKey: "placeholder_gate",
    requiredMove: "CUT",
    clearMessage: "{POKEMON} used CUT!\nThe tree was cut down!",
    lockedMessage: "This tree looks like it can be\ncut down. You need a Pokemon\nthat knows CUT.",
  },
];
