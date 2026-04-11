/**
 * PartySystem — runtime state for the player's party of 1-6 Pokemon.
 *
 * The static catalog of every possible member lives in
 * `src/game/data/party.ts`. This file wires that catalog to the
 * mutable save (`partyMemberIds` + `fieldMoves`) and exposes a
 * small read/write API for:
 *
 *   - rendering the party menu (PartyMenu.tsx → getActiveParty)
 *   - wild-encounter joins  (NPCSystem → addToParty)
 *   - badge-award teaching  (interiors KOSTAS → teachFieldMove)
 *   - gate clearance checks (GateSystem → findPokemonWithMove)
 *
 * Every function defends against unknown ids with a console.warn so
 * content-phase typos surface immediately during testing.
 */

import {
  ALL_PARTY,
  PARTY_BY_ID,
  type ActivePartyMember,
} from "@/game/data/party";
import { getSave, updateSave } from "./GameSave";

/**
 * Return the player's current party, decorated with any field moves
 * each member has learned. Unknown ids in the save (stale data,
 * content bugs) are skipped with a warning — they don't crash the
 * party menu.
 */
export function getActiveParty(): ActivePartyMember[] {
  const save = getSave();
  const out: ActivePartyMember[] = [];
  for (const id of save.partyMemberIds) {
    const base = PARTY_BY_ID[id];
    if (!base) {
      console.warn(`[PartySystem] Unknown party member id: ${id}`);
      continue;
    }
    out.push({ ...base, fieldMoves: save.fieldMoves[id] ?? [] });
  }
  return out;
}

/**
 * Add a Pokemon to the party. Returns false if:
 *  - the id is unknown in ALL_PARTY
 *  - the Pokemon is already in the party
 *  - the party is already full (6)
 *
 * Full-party failures log a warning — content-phase sequencing
 * should make them unreachable, so if one fires it signals a data bug.
 */
export function addToParty(id: string): boolean {
  if (!PARTY_BY_ID[id]) {
    console.warn(`[PartySystem] addToParty: unknown id ${id}`);
    return false;
  }
  const save = getSave();
  if (save.partyMemberIds.includes(id)) return false;
  if (save.partyMemberIds.length >= 6) {
    console.warn(`[PartySystem] addToParty: party full, refused ${id}`);
    return false;
  }
  updateSave({ partyMemberIds: [...save.partyMemberIds, id] });
  return true;
}

/**
 * Teach a field move to a specific party Pokemon. Idempotent —
 * no-op if the id is unknown or the move is already known. No side
 * effects beyond the save mutation (no notification emit — the
 * caller decides how to surface the reward).
 */
export function teachFieldMove(id: string, moveName: string): void {
  if (!PARTY_BY_ID[id]) {
    console.warn(`[PartySystem] teachFieldMove: unknown id ${id}`);
    return;
  }
  const save = getSave();
  const existing = save.fieldMoves[id] ?? [];
  if (existing.includes(moveName)) return;
  updateSave({
    fieldMoves: { ...save.fieldMoves, [id]: [...existing, moveName] },
  });
}

/**
 * Find the first party Pokemon that knows `moveName`. Returns the
 * full `ActivePartyMember` so callers can read `.nickname` for gate
 * dialog and `.species` for future visual effects without a
 * re-lookup. Returns `null` if nobody in the party knows the move.
 */
export function findPokemonWithMove(
  moveName: string,
): ActivePartyMember | null {
  for (const pm of getActiveParty()) {
    if (pm.fieldMoves.includes(moveName)) return pm;
  }
  return null;
}

// ── Dev helper ────────────────────────────────────────────────────
//
// Exposes the core API on `window.partySystem` so console testing
// doesn't have to fight dynamic imports or vite module specifiers.
// Only attached in development builds — stripped from production.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { partySystem: Record<string, unknown> }).partySystem = {
    ALL_PARTY,
    getActiveParty,
    addToParty,
    teachFieldMove,
    findPokemonWithMove,
  };
}
