import { getItemDef, type BagPocketId, type ItemDef } from "@/game/data/itemDefinitions";
import { STARTING_PARTY_IDS } from "@/game/data/party";
import {
  trackPaperCollected,
  trackBlogCollected,
  trackBadgeEarned,
} from "./Analytics";

/**
 * GameSave — the canonical save structure for the explore mode.
 *
 * Everything that "the player has collected" lives here as arrays of
 * item ids keyed by pocket. Single source of truth so every caller
 * (BagMenu, pickup flows, step milestones, NPC gifts) reads and
 * writes the same shape.
 *
 * The save is persisted to `localStorage["gkos:explore:save"]`. On
 * read, we shallow-merge the stored blob over the defaults so adding
 * new fields in future versions is safe.
 */

const STORAGE_KEY = "gkos:explore:save";

export interface GameSave {
  papersCollected: string[];
  blogsCollected: string[];
  keyItemsCollected: string[];
  tmsCollected: string[];
  /** Pokedex numbers the player has discovered (encounter flash). */
  pokedexSeen: number[];
  /**
   * Pokedex numbers the player has actually encountered in the
   * overworld (wild-encounter flash). A subset of `pokedexSeen`.
   * Pokemon that end up in the Pokedex ONLY because they're already
   * in the party get added to `pokedexSeen` but NOT `pokedexCaught`,
   * which lets the Pokedex UI show a distinct outline ball for them
   * versus the filled ball on true overworld catches.
   */
  pokedexCaught: number[];
  /** Zone ids the player has visited. */
  zonesVisited: string[];
  /** Badge ids awarded by KOSTAS (or auto-awarded for CHAMPION). */
  badges: string[];
  /** Whether the gym puzzle is fully completed. */
  gymComplete: boolean;
  /** NPC ids the player has talked to at least once. */
  npcsTalkedTo: string[];
  /**
   * Badge ids for which the "condition met → go see KOSTAS" dialog
   * has already been shown. These are NOT yet in `badges` (only
   * KOSTAS can grant the actual badge — or CHAMPION auto-awards)
   * but we still need to remember we notified the player so the
   * same "EXPLORER milestone!" dialog doesn't re-fire on every
   * subsequent `checkBadges()` call.
   */
  badgesNotified: string[];
  /**
   * URL-open keys (`"<pocket>:<itemName>"` or `"pokedex:<entryId>"`)
   * the player has activated via the Bag's USE action or the
   * Pokedex's VIEW PROJECT action. The Bag and Pokedex use this to
   * render a ✓ checkmark next to rows whose link has been opened,
   * and badge-check hooks use the total count for the DEVOTED badge.
   */
  urlsOpened: string[];
  /**
   * Snapshot of per-category content totals at the time of the last
   * "New discoveries await!" boot notification. On each boot the
   * current totals are compared against this snapshot; any positive
   * delta triggers the banner and then the snapshot is refreshed.
   *
   * Missing (older save) → treated as all zeros, so every category
   * shows up as "new" on the first boot after the save is created.
   */
  lastKnownCounts?: {
    pokedex: number;
    papers: number;
    blogs: number;
    tms: number;
  };
  /** Player name set during Birch intro. Empty = first visit. */
  playerName: string;
  /** Player gender set during Birch intro. */
  playerGender: "boy" | "girl";
  /** Cumulative time spent in the explore mode, in seconds. */
  playTimeSeconds: number;
  /**
   * Gate ids the player has cleared with a field move. Gate data
   * lives in `src/game/data/gates.ts`; runtime wiring is in
   * `GateSystem.ts`. Cleared terrain gates don't re-spawn their
   * blocker characters on next scene load; cleared NPC gates use
   * `spawnCondition: () => !isGateCleared(id)` so the NPC never
   * spawns again.
   */
  gatesCleared: string[];
  /**
   * Field moves each party Pokemon has learned, keyed by the party
   * member id (e.g. `"medic"`, `"fleetsmart"` — see `ALL_PARTY` in
   * `src/game/data/party.ts`). Taught by KOSTAS on badge award and
   * read by `GateSystem` via `PartySystem.findPokemonWithMove`.
   * Move names are custom strings — NOT standard Pokemon moves.
   */
  fieldMoves: Record<string, string[]>;
  /**
   * Ordered list of party member ids currently in the player's
   * party. Initialized from `STARTING_PARTY_IDS` and mutated at
   * runtime by `PartySystem.addToParty`. Capped at 6 members. See
   * `getActiveParty()` for the resolved `PartyMember[]` view.
   */
  partyMemberIds: string[];
}

function defaults(): GameSave {
  return {
    papersCollected: [],
    blogsCollected: [],
    keyItemsCollected: [],
    tmsCollected: [],
    pokedexSeen: [],
    pokedexCaught: [],
    zonesVisited: [],
    badges: [],
    gymComplete: false,
    npcsTalkedTo: [],
    badgesNotified: [],
    urlsOpened: [],
    playerName: "",
    playerGender: "boy",
    playTimeSeconds: 0,
    gatesCleared: [],
    fieldMoves: {},
    partyMemberIds: [...STARTING_PARTY_IDS],
  };
}

function readSave(): GameSave {
  if (typeof localStorage === "undefined") return defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<GameSave>;
    return { ...defaults(), ...parsed };
  } catch {
    return defaults();
  }
}

function writeSave(save: GameSave): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // ignore
  }
}

/** Read the full save. */
export function getSave(): GameSave {
  return readSave();
}

/** Merge a partial save and persist. Returns the new save. */
export function updateSave(partial: Partial<GameSave>): GameSave {
  const next = { ...readSave(), ...partial };
  writeSave(next);
  return next;
}

/** Wipe all game state (preserves settings like text speed / frame style). */
export function clearSave(): void {
  if (typeof localStorage === "undefined") return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith("gkos:explore:"));
  for (const k of keys) {
    if (k === "gkos:explore:settings") continue;
    localStorage.removeItem(k);
  }
}

/**
 * Map a pocket id to the array key inside GameSave that stores the
 * collected item ids for that pocket. Narrow literal union instead
 * of `keyof GameSave` so TypeScript can prove `save[key]` is string[]
 * at call sites.
 */
type PocketArrayKey =
  | "papersCollected"
  | "blogsCollected"
  | "keyItemsCollected"
  | "tmsCollected";

function pocketArrayKey(pocket: BagPocketId): PocketArrayKey {
  switch (pocket) {
    case "papers":
      return "papersCollected";
    case "blogs":
      return "blogsCollected";
    case "keyItems":
      return "keyItemsCollected";
    case "tms":
      return "tmsCollected";
  }
}

/** Does the player already have this item id? */
export function hasItem(itemId: string): boolean {
  const def = getItemDef(itemId);
  if (!def) return false;
  const save = readSave();
  const arr = save[pocketArrayKey(def.pocket)];
  return arr.includes(itemId);
}

/**
 * Add an item to the save's collected list for its pocket. This is
 * a pure state mutation — the side effects (sfx, dialog) are handled
 * by ItemGift.give() so every caller gets the same UX.
 *
 * Returns the ItemDef on success, `null` if the item id is unknown
 * or if the player already has it (duplicates are no-ops).
 */
export function giveItem(itemId: string): ItemDef | null {
  const def = getItemDef(itemId);
  if (!def) return null;
  const save = readSave();
  const key = pocketArrayKey(def.pocket);
  if (save[key].includes(itemId)) return null;
  const next: GameSave = {
    ...save,
    [key]: [...save[key], itemId],
  };
  writeSave(next);
  // Analytics — centralized here so every giveItem caller is tracked
  // without needing to remember at each site. Only papers and blogs
  // are tracked per spec; TMs and key items intentionally omitted.
  if (def.pocket === "papers") {
    trackPaperCollected(def.name);
  } else if (def.pocket === "blogs") {
    trackBlogCollected(def.name);
  }
  return def;
}

/** Convenience: full ItemDef list for a pocket based on the save. */
export function getCollectedByPocket(pocket: BagPocketId): ItemDef[] {
  const save = readSave();
  const ids = save[pocketArrayKey(pocket)];
  return ids
    .map((id) => getItemDef(id))
    .filter((d): d is ItemDef => d !== undefined);
}

// ── Pokedex / zones / badges helpers ─────────────────────

/** Record a Pokemon as seen in the Pokedex. */
export function markPokedexSeenInSave(pokedexNumber: number): void {
  const save = readSave();
  if (save.pokedexSeen.includes(pokedexNumber)) return;
  writeSave({ ...save, pokedexSeen: [...save.pokedexSeen, pokedexNumber] });
}

/** Has this Pokemon been seen? */
export function isPokedexSeenInSave(pokedexNumber: number): boolean {
  return readSave().pokedexSeen.includes(pokedexNumber);
}

/**
 * Record a Pokemon as CAUGHT (actually encountered in the overworld).
 * Caught implies seen, so this also adds the number to `pokedexSeen`
 * if it's missing.
 */
export function markPokedexCaughtInSave(pokedexNumber: number): void {
  const save = readSave();
  const nextSeen = save.pokedexSeen.includes(pokedexNumber)
    ? save.pokedexSeen
    : [...save.pokedexSeen, pokedexNumber];
  if (save.pokedexCaught.includes(pokedexNumber)) {
    if (nextSeen !== save.pokedexSeen) {
      writeSave({ ...save, pokedexSeen: nextSeen });
    }
    return;
  }
  writeSave({
    ...save,
    pokedexSeen: nextSeen,
    pokedexCaught: [...save.pokedexCaught, pokedexNumber],
  });
}

/** Has this Pokemon been CAUGHT in the overworld? */
export function isPokedexCaughtInSave(pokedexNumber: number): boolean {
  return readSave().pokedexCaught.includes(pokedexNumber);
}

/** Record a zone visit. */
export function markZoneVisited(zoneId: string): void {
  const save = readSave();
  if (save.zonesVisited.includes(zoneId)) return;
  writeSave({ ...save, zonesVisited: [...save.zonesVisited, zoneId] });
}

/** Add a badge. Returns false if already owned. */
export function awardBadge(badgeId: string): boolean {
  const save = readSave();
  if (save.badges.includes(badgeId)) return false;
  writeSave({ ...save, badges: [...save.badges, badgeId] });
  // Analytics — trackBadgeEarned also emits the dedicated
  // `champion-badge` event for the final badge.
  trackBadgeEarned(badgeId);
  return true;
}

/** Check if player has a badge. */
export function hasBadge(badgeId: string): boolean {
  return readSave().badges.includes(badgeId);
}

/**
 * Record that a "badge milestone met" notification was already
 * shown for this badge. Prevents the dialog from re-firing on every
 * subsequent checkBadges() call while the player hasn't yet visited
 * KOSTAS to claim it. Returns true the first time, false on repeats.
 */
export function markBadgeNotified(badgeId: string): boolean {
  const save = readSave();
  if (save.badgesNotified.includes(badgeId)) return false;
  writeSave({
    ...save,
    badgesNotified: [...save.badgesNotified, badgeId],
  });
  return true;
}

/** Has the "condition met" dialog already been shown for this badge? */
export function hasBadgeBeenNotified(badgeId: string): boolean {
  return readSave().badgesNotified.includes(badgeId);
}

/** Mark an NPC as talked-to. */
export function markNPCTalkedTo(npcId: string): void {
  const save = readSave();
  if (save.npcsTalkedTo.includes(npcId)) return;
  writeSave({ ...save, npcsTalkedTo: [...save.npcsTalkedTo, npcId] });
}

/** Has the player talked to this NPC before? */
export function hasNPCTalkedTo(npcId: string): boolean {
  return readSave().npcsTalkedTo.includes(npcId);
}

// ── URL-open tracking ────────────────────────────────────

/**
 * Mark a URL as opened. The `key` is a namespaced string so rows
 * from different sources don't collide:
 *   - Bag items:     `"<pocketId>:<itemName>"` (e.g. `"keyItems:GITHUB.URL"`)
 *   - Pokedex rows:  `"pokedex:<entryId>"`
 *   - Trainer badges:`"badge:<badgeId>"`
 *
 * Returns `true` the first time, `false` if already marked.
 */
export function markUrlOpened(key: string): boolean {
  const save = readSave();
  if (save.urlsOpened.includes(key)) return false;
  writeSave({ ...save, urlsOpened: [...save.urlsOpened, key] });
  return true;
}

/** Has this URL key been opened before? */
export function hasUrlOpened(key: string): boolean {
  return readSave().urlsOpened.includes(key);
}

/** Total number of distinct URLs the player has opened. */
export function getUrlsOpenedCount(): number {
  return readSave().urlsOpened.length;
}

// ── Gate clearing ────────────────────────────────────────

/**
 * Has the player cleared this gate? Gate data is defined in
 * `src/game/data/gates.ts`; runtime wiring is in `GateSystem.ts`.
 */
export function isGateCleared(gateId: string): boolean {
  return readSave().gatesCleared.includes(gateId);
}

/**
 * Mark a gate as cleared. Idempotent — subsequent calls with the
 * same id are no-ops. Called by `GateSystem.clearGate()` after the
 * Grid Engine characters have been removed.
 */
export function markGateCleared(gateId: string): void {
  const save = readSave();
  if (save.gatesCleared.includes(gateId)) return;
  writeSave({ ...save, gatesCleared: [...save.gatesCleared, gateId] });
}

// DEVOTED and CHAMPION auto-award logic now lives in
// BadgeMilestones.checkBadges() — the single entry point for all
// badge evaluation. See the `auto: true` flag on those badge defs.
