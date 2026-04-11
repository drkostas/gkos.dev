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
import { getItemDef, getItemsByPocket } from "@/game/data/itemDefinitions";
import { POKEDEX } from "@/game/data/pokemon";

export interface BadgeDef {
  id: string;
  name: string;
  /** Human-readable condition description. */
  hint: string;
  /** Returns true when the player has met this badge's condition. */
  condition: (save: GameSave) => boolean;
}

const TOTAL_PAPERS = getItemsByPocket("papers").length;
const TOTAL_BLOGS = getItemsByPocket("blogs").length;
const TOTAL_TMS = getItemsByPocket("tms").length;
const TOTAL_POKEDEX = POKEDEX.length;
export const BADGES: BadgeDef[] = [
  {
    id: "phd",
    name: "PhD",
    hint: "Complete the GYM puzzle",
    condition: (s) => s.gymComplete,
  },
  {
    id: "scholar",
    name: "SCHOLAR",
    hint: `Collect and read all ${TOTAL_PAPERS} papers`,
    // Collecting a paper isn't enough — the player must also open
    // every paper's URL from the Bag (USE action). Primes them for
    // the COMPLETIONIST badge later and matches the "knowledge is
    // consumed, not collected" beat in KOSTAS's gym dialog.
    //
    // BagMenu records URL opens as `${pocket}:${displayName}`
    // (BagMenu.tsx:130), NOT by item id, so we look up each paper's
    // display name via ITEM_DEFINITIONS rather than assuming a
    // format. If ITEM_DEFINITIONS loses an entry the missing paper
    // fails the check, which is the safe default.
    condition: (s) => {
      if (s.papersCollected.length < TOTAL_PAPERS) return false;
      return s.papersCollected.every((itemId) => {
        const def = getItemDef(itemId);
        if (!def) return false;
        return s.urlsOpened.includes(`papers:${def.name}`);
      });
    },
  },
  {
    id: "opensource",
    name: "OPEN SOURCE",
    hint: `Discover all ${TOTAL_POKEDEX} Pokemon`,
    condition: (s) => s.pokedexSeen.length >= TOTAL_POKEDEX,
  },
  {
    id: "author",
    name: "AUTHOR",
    hint: `Collect all ${TOTAL_BLOGS} blog posts`,
    condition: (s) => s.blogsCollected.length >= TOTAL_BLOGS,
  },
  {
    id: "fullstack",
    name: "FULL STACK",
    hint: `Earn all ${TOTAL_TMS} TMs`,
    condition: (s) => s.tmsCollected.length >= TOTAL_TMS,
  },
  {
    id: "explorer",
    name: "EXPLORER",
    hint: "Visit all 5 zones",
    condition: (s) => s.zonesVisited.length >= 5,
  },
  {
    id: "champion",
    name: "CHAMPION",
    hint: "Find MEW beyond the water boundary",
    condition: (s) => s.keyItemsCollected.includes("PHONE.NUMBER"),
  },
];

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
 * If a badge condition is newly met, queue the "go see KOSTAS"
 * notification exactly ONCE per badge per save. Subsequent calls
 * short-circuit via `badgesNotified` so the same milestone dialog
 * doesn't re-fire every time the player takes a step in a new zone
 * or picks up an item while the condition is already satisfied.
 *
 * CHAMPION is awarded by MEW's interaction code. All others require
 * KOSTAS in the gym to give.
 */
export function checkBadges(): void {
  const save = getSave();

  for (const badge of BADGES) {
    // Skip already-awarded badges
    if (save.badges.includes(badge.id)) continue;
    // Skip badges we've already announced — their "condition met"
    // dialog has been shown once and the player now needs to visit
    // KOSTAS. Re-firing would be spammy.
    if (save.badgesNotified.includes(badge.id)) continue;
    // Skip if condition not met
    if (!badge.condition(save)) continue;

    // Queue notification (only one at a time) and remember that we
    // notified this badge so it doesn't re-fire.
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
