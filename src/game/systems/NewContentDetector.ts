import { POKEDEX } from "@/game/data/pokemon";
import { getItemsByPocket } from "@/game/data/itemDefinitions";
import { getSave, updateSave, type GameSave } from "./GameSave";
import { showNotification } from "@/game/EventBridge";

/**
 * NewContentDetector — on boot, compares the current totals for each
 * content category (Pokedex entries, papers, blog posts, TMs) against
 * the snapshot stored in `save.lastKnownCounts`. If any category has
 * more content than the last time the player booted, fire a
 * non-blocking "New discoveries await!" banner and refresh the
 * snapshot so the same additions don't re-trigger on the next boot.
 *
 * Categories use different sources of truth:
 *   - `pokedex` → length of POKEDEX in `src/game/data/pokemon.ts`
 *   - `papers`, `blogs`, `tms` → count of ItemDefs filtered by pocket
 *     in `src/game/data/itemDefinitions.ts`
 *
 * First-time boot: `lastKnownCounts` is undefined, so every non-zero
 * total shows up as "new". Rather than spamming the player on the
 * very first launch, we SILENTLY seed the snapshot to the current
 * totals without firing a banner — new content is only announced on
 * subsequent boots after additions have landed.
 */

interface ContentCounts {
  pokedex: number;
  papers: number;
  blogs: number;
  tms: number;
}

interface ContentDeltas extends ContentCounts {
  hasNew: boolean;
}

/** Read the current totals from the data modules. */
export function getCurrentContentCounts(): ContentCounts {
  return {
    pokedex: POKEDEX.length,
    papers: getItemsByPocket("papers").length,
    blogs: getItemsByPocket("blogs").length,
    tms: getItemsByPocket("tms").length,
  };
}

/**
 * Compute per-category deltas vs the save snapshot. If no snapshot
 * exists yet, every delta is zero and `hasNew` is false (see first
 * -time boot handling in `detectNewContent`).
 */
export function computeDeltas(
  current: ContentCounts,
  previous: ContentCounts | undefined,
): ContentDeltas {
  if (!previous) {
    return { pokedex: 0, papers: 0, blogs: 0, tms: 0, hasNew: false };
  }
  const deltas = {
    pokedex: Math.max(0, current.pokedex - previous.pokedex),
    papers: Math.max(0, current.papers - previous.papers),
    blogs: Math.max(0, current.blogs - previous.blogs),
    tms: Math.max(0, current.tms - previous.tms),
  };
  return {
    ...deltas,
    hasNew:
      deltas.pokedex + deltas.papers + deltas.blogs + deltas.tms > 0,
  };
}

/**
 * Boot-time detection. Call once after the game has loaded so the
 * notification banner has a live event listener to receive the
 * message.
 *
 * - First boot (no snapshot): silently seed the snapshot, no banner.
 * - Later boots: if any category gained content, fire a single
 *   notification banner and then refresh the snapshot.
 * - No change: no-op.
 */
export function detectNewContent(): ContentDeltas {
  const save = getSave();
  const current = getCurrentContentCounts();
  const previous = save.lastKnownCounts;

  if (!previous) {
    // First boot for this save: seed the snapshot silently.
    updateSave({ lastKnownCounts: current });
    return { pokedex: 0, papers: 0, blogs: 0, tms: 0, hasNew: false };
  }

  const deltas = computeDeltas(current, previous);
  if (!deltas.hasNew) return deltas;

  showNotification("New discoveries await!", "★");
  updateSave({ lastKnownCounts: current });
  return deltas;
}

/**
 * Manually reset the snapshot (useful for testing or a "what's new"
 * button that makes the banner fire again).
 */
export function clearLastKnownCounts(): void {
  const save = getSave() as GameSave;
  const { lastKnownCounts: _dropped, ...rest } = save;
  updateSave(rest);
}
