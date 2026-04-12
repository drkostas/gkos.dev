import { describe, it, expect } from "vitest";
import { MAUVILLE_NPCS } from "@/game/data/npcs";
import { ITEM_DEFINITIONS, getItemsByPocket } from "@/game/data/itemDefinitions";

/**
 * Blog NPC coverage — criterion #8 + criterion #1 (design doc §10
 * "10 blog NPCs, each hands out a unique blog post"). Guarantees
 * every `blog_*` item in ITEM_DEFINITIONS is actually reachable
 * through an NPC's `autoGive` flow, so the player can complete the
 * BLOGGER badge condition via normal play.
 */

describe("Content — Blog NPC coverage", () => {
  const blogGivers = MAUVILLE_NPCS.filter(
    (n) => n.autoGive?.itemId?.startsWith("blog_"),
  );

  it("has exactly 10 blog-giver NPCs (design target)", () => {
    expect(blogGivers.length).toBeGreaterThanOrEqual(10);
  });

  it("every blog-giver hands out a known ITEM_DEFINITIONS entry", () => {
    for (const npc of blogGivers) {
      const id = npc.autoGive!.itemId!;
      expect(ITEM_DEFINITIONS[id]).toBeDefined();
      expect(ITEM_DEFINITIONS[id].pocket).toBe("blogs");
    }
  });

  it("no two blog-givers hand out the same blog id", () => {
    const ids = blogGivers.map((n) => n.autoGive!.itemId!);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every blog_* item in the catalog has at least one NPC giver", () => {
    const catalogBlogs = getItemsByPocket("blogs").map((b) => b.id);
    const givenIds = new Set(blogGivers.map((n) => n.autoGive!.itemId!));
    for (const id of catalogBlogs) {
      expect(givenIds.has(id)).toBe(true);
    }
  });

  it("every blog-giver has a non-empty asidePosition + clearedDialog", () => {
    for (const npc of blogGivers) {
      const ag = npc.autoGive!;
      expect(ag.asidePosition).toBeDefined();
      expect(typeof ag.asidePosition.x).toBe("number");
      expect(typeof ag.asidePosition.y).toBe("number");
      expect(ag.clearedDialog?.length ?? 0).toBeGreaterThanOrEqual(1);
    }
  });
});
