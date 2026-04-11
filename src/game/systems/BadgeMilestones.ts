/**
 * BadgeMilestones — checks whether the player has met badge conditions.
 *
 * Badges are NOT auto-awarded (except CHAMPION). The player must talk to
 * KOSTAS in the gym to receive them. This module only detects WHEN a
 * condition is first met and queues a notification.
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
import { getItemsByPocket } from "@/game/data/itemDefinitions";
import { POKEDEX } from "@/game/data/pokemon";
import { STEP_MILESTONES } from "./StepMilestones";

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
const TOTAL_TMS = STEP_MILESTONES.length;
const TOTAL_POKEDEX = POKEDEX.length;
const TOTAL_KEY_ITEMS = getItemsByPocket("keyItems").length;

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
    hint: `Collect all ${TOTAL_PAPERS} papers`,
    condition: (s) => s.papersCollected.length >= TOTAL_PAPERS,
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
    id: "devoted",
    name: "DEVOTED",
    hint: `Collect all ${TOTAL_KEY_ITEMS} key items`,
    condition: (s) => s.keyItemsCollected.length >= TOTAL_KEY_ITEMS,
  },
  {
    id: "champion",
    name: "CHAMPION",
    hint: "Earn all 7 other badges",
    condition: (s) => s.badges.length >= 7,
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
 * CHAMPION is auto-awarded. All others require KOSTAS to give.
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

    // CHAMPION is auto-awarded (given by the game, not KOSTAS)
    if (badge.id === "champion") {
      awardBadge("champion");
    }

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
