/**
 * BadgeMilestones — checks whether the player has met badge conditions.
 *
 * Badges are NOT auto-awarded. The player must talk to KOSTAS in the gym
 * to receive them (CHAMPION is given by MEW). This module only detects
 * WHEN a condition is first met and queues a notification.
 *
 * Call `checkBadges()` after every collection event (item pickup, Pokedex
 * registration, TM award, zone visit, gym clear, etc.).
 */

import {
  getSave,
  awardBadge,
  markBadgeNotified,
  type GameSave,
} from "./GameSave";
import {
  getItemsByPocket,
  ITEM_DEFINITIONS,
} from "@/game/data/itemDefinitions";
import { POKEDEX } from "@/game/data/pokemon";

// Count all openable URLs — items with a url field + Pokedex entries
// with a url field. Computed once at module load since both arrays
// are static data.
const TOTAL_OPENABLE_URLS =
  Object.values(ITEM_DEFINITIONS).filter((i) => i.url).length +
  POKEDEX.filter((p) => p.url).length;

export interface BadgeDef {
  id: string;
  name: string;
  /** Human-readable condition description. */
  hint: string;
  /** Returns true when the player has met this badge's condition. */
  condition: (save: GameSave) => boolean;
  /**
   * If true, the badge auto-awards the moment the condition is met —
   * no KOSTAS visit required. DEVOTED (opening every URL) and CHAMPION
   * (finding MEW) are the two auto badges; all others must be claimed
   * from KOSTAS in the gym.
   */
  auto?: boolean;
}

const TOTAL_PAPERS = getItemsByPocket("papers").length;
const TOTAL_BLOGS = getItemsByPocket("blogs").length;
const TOTAL_TMS = getItemsByPocket("tms").length;
const TOTAL_KEY_ITEMS = getItemsByPocket("keyItems").length;
const TOTAL_POKEDEX = POKEDEX.length;
/**
 * B7 — Badge IDs follow design doc `docs/plans/explore-mode-final.md`
 * §2. The 8 canonical badges are:
 *
 *   1. gym           — complete the gym puzzle
 *   2. publication   — collect all papers (6 gym + 4 route = 10 total)
 *   3. connected     — find all 7 key items (5 visible + 2 hidden)
 *   4. pokedex       — register all 30 Pokemon
 *   5. blogger       — collect all blog posts
 *   6. engineer      — collect all 20 TMs
 *   7. completionist — open every URL (papers, blogs, projects, items)
 *   8. champion      — find MEW beyond the eastern boundary
 *
 * Prior iteration used `phd / scholar / opensource / author / fullstack /
 * explorer / devoted / champion`. `explorer` had no design-doc equivalent
 * and is dropped; `connected` is the new badge in its slot. Old saves are
 * migrated in GameSave.loadFromStorage (see LEGACY_BADGE_ID_MAP).
 */
export const BADGES: BadgeDef[] = [
  {
    id: "gym",
    name: "GYM",
    hint: "Complete the GYM puzzle",
    condition: (s) => s.gymComplete,
  },
  {
    id: "publication",
    name: "PUBLICATION",
    hint: `Collect all ${TOTAL_PAPERS} papers`,
    // Per design doc §2: the PUBLICATION badge is collecting the
    // papers; the separate COMPLETIONIST badge handles "open every URL".
    // This matches what the explore-mode-final.md §2 table specifies.
    condition: (s) => s.papersCollected.length >= TOTAL_PAPERS,
  },
  {
    id: "connected",
    name: "CONNECTED",
    hint: `Find all ${TOTAL_KEY_ITEMS} key items`,
    // Key items = GITHUB.URL, LINKEDIN.URL, SCHOLAR.URL, HUGGINGFACE.URL,
    // RESUME.PDF, DISSERTATION.PDF, PHONE.NUMBER (5 visible + 2 hidden).
    // The final count lives in itemDefinitions.ts under pocket "keyItems".
    condition: (s) => s.keyItemsCollected.length >= TOTAL_KEY_ITEMS,
  },
  {
    id: "pokedex",
    name: "POKEDEX",
    hint: `Register all ${TOTAL_POKEDEX} Pokemon`,
    condition: (s) => s.pokedexSeen.length >= TOTAL_POKEDEX,
  },
  {
    id: "blogger",
    name: "BLOGGER",
    hint: `Collect all ${TOTAL_BLOGS} blog posts`,
    condition: (s) => s.blogsCollected.length >= TOTAL_BLOGS,
  },
  {
    id: "engineer",
    name: "ENGINEER",
    hint: `Collect all ${TOTAL_TMS} TMs`,
    condition: (s) => s.tmsCollected.length >= TOTAL_TMS,
  },
  {
    id: "completionist",
    name: "COMPLETIONIST",
    hint: "Open every URL from your BAG and POKeDEX",
    // Auto-awarded the moment the last URL is opened — no KOSTAS
    // visit needed. See the `auto: true` flag below.
    condition: (s) => s.urlsOpened.length >= TOTAL_OPENABLE_URLS,
    auto: true,
  },
  {
    id: "champion",
    name: "CHAMPION",
    hint: "Find MEW beyond the water boundary",
    // Auto-awarded the moment MEW hands the player the PHONE.NUMBER
    // (stored as the `key_phone_number` id in keyItemsCollected).
    // The legacy check for the display name "PHONE.NUMBER" is kept
    // as a second branch so any pre-migration save that stored the
    // raw name still flips champion on load.
    condition: (s) =>
      s.keyItemsCollected.includes("key_phone_number") ||
      s.keyItemsCollected.includes("PHONE.NUMBER"),
    auto: true,
  },
];

/**
 * Migration table for saves created under the prior badge ID scheme.
 * Exported so GameSave's loader can rewrite any legacy `badges` array
 * during hydration. Entries not in this map are assumed to already be
 * new-style ids (or noise that should be dropped on load).
 *
 * The dropped `explorer` badge (visit 5 zones) has no new-scheme
 * equivalent — it maps to `undefined` and is filtered out.
 */
export const LEGACY_BADGE_ID_MAP: Record<string, string | undefined> = {
  phd: "gym",
  scholar: "publication",
  opensource: "pokedex",
  author: "blogger",
  fullstack: "engineer",
  explorer: undefined, // dropped — no design-doc equivalent
  devoted: "completionist",
  champion: "champion",
};

// ── Pending notification ─────────────────────────────────

let pendingBadgeNotification: BadgeDef | null = null;

export function getPendingBadgeNotification(): BadgeDef | null {
  return pendingBadgeNotification;
}

export function clearPendingBadgeNotification(): void {
  pendingBadgeNotification = null;
}

/**
 * Check all badge conditions against the current save.
 *
 * Two paths:
 *  - Auto badges (COMPLETIONIST, CHAMPION): condition met → badge
 *    awarded immediately via `awardBadge()`. No KOSTAS visit required.
 *  - KOSTAS badges: condition met → queue a "go see KOSTAS"
 *    notification exactly ONCE per badge per save (via `badgesNotified`).
 *
 * Call this after any state mutation that could unlock a badge —
 * item pickup, Pokedex registration, TM award, zone visit, gym clear,
 * URL open, etc.
 *
 * We split the loop into two passes so that when a player
 * simultaneously triggers a KOSTAS badge AND an auto badge in the same
 * frame, BOTH happen: the KOSTAS badge is queued as a notification
 * (only one queue slot at a time) AND the auto badge is still awarded.
 * The previous single-loop-with-break was dropping the auto badge if
 * a KOSTAS badge came earlier in the BADGES array.
 */
export function checkBadges(): void {
  // Pass 1 — auto badges first. These can never conflict with each
  // other and don't consume the single notification slot.
  let save = getSave();
  for (const badge of BADGES) {
    if (!badge.auto) continue;
    if (save.badges.includes(badge.id)) continue;
    if (!badge.condition(save)) continue;
    awardBadge(badge.id);
  }

  // Re-read: awardBadge above mutated the save. Subsequent KOSTAS
  // checks read the freshest state.
  save = getSave();

  // Pass 2 — first eligible KOSTAS badge claims the notification slot.
  for (const badge of BADGES) {
    if (badge.auto) continue;
    if (save.badges.includes(badge.id)) continue;
    if (!badge.condition(save)) continue;
    if (save.badgesNotified.includes(badge.id)) continue;
    if (!pendingBadgeNotification) {
      pendingBadgeNotification = badge;
      markBadgeNotified(badge.id);
    }
    break;
  }
}

/** Get badge status for display (e.g. TrainerCard badge case). */
export function getBadgeStatuses(): {
  badge: BadgeDef;
  earned: boolean;
  conditionMet: boolean;
}[] {
  const save = getSave();
  return BADGES.map((b) => ({
    badge: b,
    earned: save.badges.includes(b.id),
    conditionMet: b.condition(save),
  }));
}
