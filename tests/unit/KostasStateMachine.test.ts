import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { resolveKostasPriority } from "@/game/data/interiors";
import {
  getSave,
  updateSave,
  clearSave,
} from "@/game/systems/GameSave";
import { getItemsByPocket, ITEM_DEFINITIONS } from "@/game/data/itemDefinitions";
import { POKEDEX } from "@/game/data/pokemon";

/**
 * KOSTAS state machine — 7 priority fixture tests (criterion #9).
 *
 * Each test seeds a GameSave fixture representing the player state
 * right BEFORE they would trigger that KOSTAS branch, then asserts
 * that `resolveKostasPriority(save)` returns the expected discriminant.
 * This directly satisfies the criterion's "tested with save fixtures
 * for each priority branch" requirement.
 */

// happy-dom localStorage stub (same pattern as GameSave.test.ts)
beforeAll(() => {
  const store = new Map<string, string>();
  const mockLs: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
  };
  vi.stubGlobal("localStorage", mockLs);
  Object.defineProperty(window, "localStorage", {
    value: mockLs,
    configurable: true,
  });
});

describe("KOSTAS state machine — 7 priority branches", () => {
  beforeEach(() => {
    clearSave();
  });

  // Helper fixtures — produce specific save states.
  const allPaperIds = getItemsByPocket("papers").map((p) => p.id);
  const allKeyItemIds = getItemsByPocket("keyItems").map((k) => k.id);
  const allBlogIds = getItemsByPocket("blogs").map((b) => b.id);
  const allTmIds = getItemsByPocket("tms").map((t) => t.id);
  const allPokemonNumbers = POKEDEX.map((p) => p.number);
  const totalOpenableUrls =
    Object.values(ITEM_DEFINITIONS).filter((i) => i.url).length +
    POKEDEX.filter((p) => p.url).length;
  const allUrlKeys = Array.from(
    { length: totalOpenableUrls },
    (_, i) => `dummy:${i}`,
  );

  describe("Priority 7 — fallback hint (no badge eligible)", () => {
    it("empty save returns hint for GYM (next unearned)", () => {
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("hint");
      if (p.kind === "hint") {
        expect(p.nextBadgeId).toBe("gym");
        expect(p.nextBadgeName).toBe("GYM");
        expect(p.nextHint.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Priority 1 — GYM badge (gymComplete)", () => {
    it("when gymComplete=true, awards GYM", () => {
      updateSave({ gymComplete: true });
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("award");
      if (p.kind === "award") {
        expect(p.badgeId).toBe("gym");
        expect(p.badgeName).toBe("GYM");
      }
    });
  });

  describe("Priority 2 — PUBLICATION badge (all papers collected)", () => {
    it("gym already earned + all papers → awards PUBLICATION", () => {
      updateSave({
        gymComplete: true,
        badges: ["gym"],
        papersCollected: allPaperIds,
      });
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("award");
      if (p.kind === "award") {
        expect(p.badgeId).toBe("publication");
      }
    });

    it("gym earned + only 9 of 10 papers → hint for PUBLICATION", () => {
      updateSave({
        gymComplete: true,
        badges: ["gym"],
        papersCollected: allPaperIds.slice(0, -1),
      });
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("hint");
      if (p.kind === "hint") {
        expect(p.nextBadgeId).toBe("publication");
      }
    });
  });

  describe("Priority 3 — CONNECTED badge (all key items)", () => {
    it("gym + publication earned + all key items → awards CONNECTED", () => {
      updateSave({
        gymComplete: true,
        badges: ["gym", "publication"],
        papersCollected: allPaperIds,
        keyItemsCollected: allKeyItemIds,
      });
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("award");
      if (p.kind === "award") {
        expect(p.badgeId).toBe("connected");
      }
    });
  });

  describe("Priority 4 — POKEDEX badge (all 30 Pokemon seen)", () => {
    it("first 3 earned + full pokedex → awards POKEDEX", () => {
      updateSave({
        gymComplete: true,
        badges: ["gym", "publication", "connected"],
        papersCollected: allPaperIds,
        keyItemsCollected: allKeyItemIds,
        pokedexSeen: allPokemonNumbers,
      });
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("award");
      if (p.kind === "award") {
        expect(p.badgeId).toBe("pokedex");
      }
    });
  });

  describe("Priority 5 — BLOGGER badge (all blogs)", () => {
    it("first 4 earned + all blogs → awards BLOGGER", () => {
      updateSave({
        gymComplete: true,
        badges: ["gym", "publication", "connected", "pokedex"],
        papersCollected: allPaperIds,
        keyItemsCollected: allKeyItemIds,
        pokedexSeen: allPokemonNumbers,
        blogsCollected: allBlogIds,
      });
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("award");
      if (p.kind === "award") {
        expect(p.badgeId).toBe("blogger");
      }
    });
  });

  describe("Priority 6 — ENGINEER badge (all 20 TMs)", () => {
    it("first 5 earned + all TMs → awards ENGINEER", () => {
      updateSave({
        gymComplete: true,
        badges: ["gym", "publication", "connected", "pokedex", "blogger"],
        papersCollected: allPaperIds,
        keyItemsCollected: allKeyItemIds,
        pokedexSeen: allPokemonNumbers,
        blogsCollected: allBlogIds,
        tmsCollected: allTmIds,
      });
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("award");
      if (p.kind === "award") {
        expect(p.badgeId).toBe("engineer");
      }
    });
  });

  describe("Priority 0 — CHAMPION endgame (all badges earned)", () => {
    it("all 8 badges earned → champion end speech", () => {
      updateSave({
        gymComplete: true,
        badges: [
          "gym",
          "publication",
          "connected",
          "pokedex",
          "blogger",
          "engineer",
          "completionist",
          "champion",
        ],
        papersCollected: allPaperIds,
        keyItemsCollected: [...allKeyItemIds, "PHONE.NUMBER"],
        pokedexSeen: allPokemonNumbers,
        blogsCollected: allBlogIds,
        tmsCollected: allTmIds,
        urlsOpened: allUrlKeys,
      });
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("champion");
    });
  });

  describe("Out-of-order badges", () => {
    it("player who completed PUBLICATION but not GYM → still awarded PUBLICATION", () => {
      // The state machine doesn't enforce order; it hands out any
      // unearned badge whose condition is met. This keeps the loop
      // flexible for players who finish publications early.
      updateSave({
        gymComplete: false, // GYM not yet
        papersCollected: allPaperIds,
      });
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("award");
      if (p.kind === "award") {
        expect(p.badgeId).toBe("publication");
      }
    });

    it("BLOGGER eligible before GYM → awards BLOGGER", () => {
      updateSave({
        gymComplete: false,
        blogsCollected: allBlogIds,
      });
      const p = resolveKostasPriority(getSave());
      expect(p.kind).toBe("award");
      if (p.kind === "award") {
        expect(p.badgeId).toBe("blogger");
      }
    });
  });

  describe("Auto badges are never awarded by KOSTAS", () => {
    it("COMPLETIONIST condition met but KOSTAS only considers non-auto badges", () => {
      // Player has met only the completionist condition. KOSTAS has
      // nothing to award, so returns a hint for the next badge.
      updateSave({
        urlsOpened: allUrlKeys,
      });
      const p = resolveKostasPriority(getSave());
      // completionist is auto-awarded → KOSTAS ignores it entirely.
      expect(p.kind).toBe("hint");
      if (p.kind === "hint") {
        expect(p.nextBadgeId).not.toBe("completionist");
        expect(p.nextBadgeId).not.toBe("champion");
      }
    });
  });
});
