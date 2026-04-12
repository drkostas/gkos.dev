import { describe, it, expect } from "vitest";
import { MAUVILLE_NPCS } from "@/game/data/npcs";
import { INTERIORS } from "@/game/data/interiors";
import { getItemsByPocket } from "@/game/data/itemDefinitions";

/**
 * Paper NPC coverage — every `paper_*` item in ITEM_DEFINITIONS
 * must be reachable through an NPC's `autoGive` flow somewhere
 * (gym interior or overworld routes) so the PUBLICATION badge
 * is completable. Without this test, orphaned papers silently
 * block badge progress.
 */

describe("Content — Paper NPC coverage", () => {
  // Collect all autoGive.itemId starting with "paper_" across
  // overworld NPCs AND gym interior trainers.
  const overworldPaperGivers = MAUVILLE_NPCS.filter(
    (n) => n.autoGive?.itemId?.startsWith("paper_"),
  );
  const gymNpcs = INTERIORS.gym.npcs.filter(
    (n) => n.autoGive?.itemId?.startsWith("paper_"),
  );
  const allPaperGiverIds = [
    ...overworldPaperGivers.map((n) => n.autoGive!.itemId!),
    ...gymNpcs.map((n) => n.autoGive!.itemId!),
  ];

  it("every paper_* item has at least one NPC giver", () => {
    const catalogPapers = getItemsByPocket("papers").map((p) => p.id);
    const givenSet = new Set(allPaperGiverIds);
    for (const id of catalogPapers) {
      expect(givenSet.has(id)).toBe(true);
    }
  });

  it("has exactly 10 paper-giver NPCs (6 gym + 4 route)", () => {
    expect(allPaperGiverIds.length).toBe(10);
  });

  it("no two paper-givers hand out the same paper", () => {
    const unique = new Set(allPaperGiverIds);
    expect(unique.size).toBe(allPaperGiverIds.length);
  });
});
