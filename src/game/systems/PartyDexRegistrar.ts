import { PARTY_BY_ID } from "@/game/data/party";
import { POKEDEX } from "@/game/data/pokemon";
import {
  getSave,
  markPokedexSeenInSave,
  markPokedexCaughtInSave,
} from "./GameSave";
import { markPokedexSeen, isPokedexSeen } from "./PokedexStore";

/**
 * PartyDexRegistrar — on game init, registers every party Pokemon in
 * the Pokedex. Party members are already in the player's possession,
 * so they're marked as CAUGHT (filled ball) — not just seen.
 *
 * The party data (`src/game/data/party.ts`) uses national dex
 * numbers for `dexNo` (e.g. 380 for Latias), but the Pokedex list
 * viewer numbers entries sequentially 1..N. Those aren't the same
 * space, so we map by species name instead (`party.species` ⇄
 * `POKEDEX[].pokemon`, case-insensitive).
 *
 * The seen-but-not-caught visual state is reserved for Pokemon the
 * player has glimpsed in the overworld without catching — e.g. an
 * NPC-trainer's lead Pokemon in a future cutscene, or a Legendary
 * the player fled from. Party members never land in that state.
 */

const MIGRATION_FLAG_KEY = "gkos:explore:pokedex-caught-migrated";

/**
 * Map a species name to its POKEDEX entry number. Returns undefined
 * when no entry matches.
 */
function speciesToEntryNumber(species: string): number | undefined {
  const needle = species.trim().toLowerCase();
  for (const entry of POKEDEX) {
    if (entry.pokemon.trim().toLowerCase() === needle) {
      return entry.number;
    }
  }
  return undefined;
}

/**
 * Get the set of POKEDEX entry numbers currently owned by the
 * player's party, using the same species→entry mapping the
 * registrar uses at boot. Callers can subtract this from
 * `save.pokedexCaught` to compute "overworld-caught only" —
 * useful for discovery/research-log counters that should exclude
 * Pokemon the player started the game with.
 */
export function getPartyPokedexEntryNumbers(): Set<number> {
  const save = getSave();
  const set = new Set<number>();
  for (const id of save.partyMemberIds) {
    const member = PARTY_BY_ID[id];
    if (!member) continue;
    const entryNumber = speciesToEntryNumber(member.species);
    if (entryNumber !== undefined) set.add(entryNumber);
  }
  return set;
}

/**
 * Register every party member as CAUGHT in the Pokedex. Idempotent —
 * subsequent calls are no-ops for already-registered species.
 *
 * Returns the list of POKEDEX entry numbers that were newly added
 * to the "seen" set during this call.
 */
export function registerPartyInPokedex(): number[] {
  // One-time migration: preserve the legacy "seen = caught" state
  // for saves that pre-date the seen/caught split.
  maybeMigrateCaughtFromLegacy();

  // Walk the ACTIVE party from the save, not the full catalog — a
  // mid-game join (via `addToParty`) or MEW won't be in the player's
  // list yet, so we shouldn't pre-register them here. Their Pokedex
  // entries land through the normal wild-encounter flow.
  const save = getSave();
  const newly: number[] = [];
  for (const id of save.partyMemberIds) {
    const member = PARTY_BY_ID[id];
    if (!member) continue; // unknown id — skip silently (warning handled in PartySystem)
    const entryNumber = speciesToEntryNumber(member.species);
    if (entryNumber === undefined) continue;
    // Legacy PokedexStore — keeps the PokedexList UI working without
    // changing its data source until the UI is updated.
    if (!isPokedexSeen(entryNumber)) {
      markPokedexSeen(entryNumber);
      newly.push(entryNumber);
    }
    // New unified GameSave — mark as CAUGHT (not just seen) because
    // the player literally has this Pokemon in their party.
    // `markPokedexCaughtInSave` also implies seen, so no separate
    // seen call is required.
    markPokedexCaughtInSave(entryNumber);
  }
  return newly;
}

/** @deprecated Old name — prefer `registerPartyInPokedex`. */
export const registerPartyAsSeen = registerPartyInPokedex;

/**
 * Seed `save.pokedexCaught` from the legacy `pokedex-seen` store on
 * the first run of the new seen/caught split. Every number the
 * legacy store considered "seen" is treated as "caught" (so the
 * filled-ball UI state is preserved for pre-existing saves). Future
 * party-only additions will NOT be in the legacy store, so they
 * stay seen-but-not-caught. ✓
 *
 * Runs at most once per browser. Tracked via its own localStorage
 * key rather than a GameSave field so we don't need to extend the
 * GameSave type just for a migration bit.
 */
function maybeMigrateCaughtFromLegacy(): void {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === "1") return;

  let legacySeen: number[] = [];
  try {
    const raw = localStorage.getItem("gkos:explore:pokedex-seen");
    if (raw) legacySeen = JSON.parse(raw) as number[];
  } catch {
    legacySeen = [];
  }

  const save = getSave();
  const already = new Set(save.pokedexCaught);
  for (const n of legacySeen) {
    if (!already.has(n)) {
      markPokedexCaughtInSave(n);
    }
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, "1");
}
