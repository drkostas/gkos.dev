/**
 * Research Log — unlockable journal entries about Kostas's journey.
 *
 * Each entry unlocks at a total discovery count threshold. "Discoveries"
 * = sum of pokedexSeen + papersCollected + blogsCollected + tmsCollected
 * + keyItemsCollected from GameSave.
 *
 * The RESEARCH LOG key item is auto-given when the first entry unlocks
 * (5 discoveries). The log viewer is opened from the Bag's USE action.
 */

import { getSave } from "@/game/systems/GameSave";
import { getPartyPokedexEntryNumbers } from "@/game/systems/PartyDexRegistrar";

export interface LogEntry {
  /** Entry number (1-based). */
  number: number;
  /** Title shown in the list. */
  title: string;
  /** Number of total discoveries needed to unlock this entry. */
  threshold: number;
  /** Full text shown when reading the entry (4-6 lines). */
  text: string[];
}

export const LOG_ENTRIES: LogEntry[] = [
  {
    number: 1,
    title: "Why I left Greece",
    threshold: 5,
    text: [
      "I grew up in Thessaloniki, Greece.",
      "Studied CS at the university there.",
      "But I wanted more — bigger challenges,",
      "cutting-edge research, a PhD.",
      "So I packed my bags and flew to",
      "Tennessee. Best decision of my life.",
    ],
  },
  {
    number: 2,
    title: "The first big rejection",
    threshold: 10,
    text: [
      "My first submission to a top conference was rejected.",
      "Three reviewers, three nos.",
      "I rewrote the paper from scratch.",
      "Added MEDiC's multi-objective framework.",
      "Resubmitted. This time: accepted.",
      "The lesson: persistence beats talent.",
    ],
  },
  {
    number: 3,
    title: "Building FleetSmart at 2 AM",
    threshold: 15,
    text: [
      "FleetSmart started as a PhD side project.",
      "Maritime AI — optimizing shipping routes.",
      "I coded the first prototype at 2 AM,",
      "fueled by Greek coffee and deadlines.",
      "Now it serves 40+ enterprise vessels.",
      "From dorm room to production.",
    ],
  },
  {
    number: 4,
    title: "The big-tech offer",
    threshold: 20,
    text: [
      "Applied Scientist at a big tech company.",
      "The interview was 5 rounds, 6 hours.",
      "System design, ML depth, coding, LP.",
      "When the offer came, I cried a little.",
      "From a small Greek town to Big Tech.",
      "Never stop reaching.",
    ],
  },
  {
    number: 5,
    title: "The followers, somehow",
    threshold: 25,
    text: [
      "I never chased GitHub followers.",
      "I just open-sourced everything I built.",
      "Templates, configs, wrappers, bots.",
      "One day I checked: people had been watching.",
      "Open source isn't about fame.",
      "It's about giving back what you got.",
    ],
  },
  {
    number: 6,
    title: "PhD defense day",
    threshold: 30,
    text: [
      "April 2026. The Bredesen Center.",
      "Dr. Hairong Qi in the front row.",
      "4 years of research in 45 minutes.",
      "MEDiC, MaskDistill, Cross-Scale MAE.",
      "They asked hard questions. I answered.",
      "Dr. Kostas Georgiou. Finally.",
    ],
  },
];

/**
 * Get total discovery count from save. Party Pokemon are
 * pre-registered in the Pokedex at boot (see PartyDexRegistrar)
 * because the player already has them — they don't count as
 * "discoveries." Only overworld-caught Pokemon (wild encounters
 * the player actively walked up to) contribute to this total,
 * alongside every collected item and key item.
 */
export function getTotalDiscoveries(): number {
  const save = getSave();
  const partyEntries = getPartyPokedexEntryNumbers();
  const overworldCaught = save.pokedexCaught.filter(
    (n) => !partyEntries.has(n),
  );
  return (
    overworldCaught.length +
    save.papersCollected.length +
    save.blogsCollected.length +
    save.tmsCollected.length +
    save.keyItemsCollected.length
  );
}

/** Get unlocked entries based on current discoveries. */
export function getUnlockedEntries(): LogEntry[] {
  const total = getTotalDiscoveries();
  return LOG_ENTRIES.filter((e) => total >= e.threshold);
}

/** Should the research log key item be awarded? */
export function shouldAwardResearchLog(): boolean {
  return getTotalDiscoveries() >= LOG_ENTRIES[0].threshold;
}
