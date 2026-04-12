import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import {
  BADGES,
  LEGACY_BADGE_ID_MAP,
  checkBadges,
  getBadgeStatuses,
  getPendingBadgeNotification,
  clearPendingBadgeNotification,
} from "@/game/systems/BadgeMilestones";
import {
  getSave,
  updateSave,
  clearSave,
} from "@/game/systems/GameSave";
import { getItemsByPocket, ITEM_DEFINITIONS } from "@/game/data/itemDefinitions";
import { POKEDEX } from "@/game/data/pokemon";

/**
 * BadgeMilestones tests — directly support completion criterion #9.
 *
 * The plan describes KOSTAS as having 7 priority branches (one per
 * KOSTAS-given badge); we verify each condition fires at the right
 * threshold, auto badges self-award, and the pendingBadgeNotification
 * queue works as expected.
 */

// happy-dom localStorage is flaky across tests — stub with an in-memory Map.
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

describe("BadgeMilestones", () => {
  beforeEach(() => {
    clearSave();
    clearPendingBadgeNotification();
  });

  describe("BADGES array — design doc §2 order + ids", () => {
    it("contains exactly 8 badges in design-doc slot order", () => {
      expect(BADGES.map((b) => b.id)).toEqual([
        "gym",
        "publication",
        "connected",
        "pokedex",
        "blogger",
        "engineer",
        "completionist",
        "champion",
      ]);
    });

    it("names match the canonical design doc labels", () => {
      expect(BADGES.map((b) => b.name)).toEqual([
        "GYM",
        "PUBLICATION",
        "CONNECTED",
        "POKEDEX",
        "BLOGGER",
        "ENGINEER",
        "COMPLETIONIST",
        "CHAMPION",
      ]);
    });

    it("only completionist and champion are auto-awarded", () => {
      const autos = BADGES.filter((b) => b.auto).map((b) => b.id);
      expect(autos.sort()).toEqual(["champion", "completionist"]);
    });
  });

  describe("Legacy badge id map", () => {
    it("maps every legacy id to a current id or undefined", () => {
      const legacy = Object.keys(LEGACY_BADGE_ID_MAP);
      expect(legacy).toEqual([
        "phd",
        "scholar",
        "opensource",
        "author",
        "fullstack",
        "explorer",
        "devoted",
        "champion",
      ]);
      expect(LEGACY_BADGE_ID_MAP.explorer).toBeUndefined();
    });
  });

  describe("GYM condition", () => {
    it("not met by default", () => {
      const gym = BADGES.find((b) => b.id === "gym")!;
      expect(gym.condition(getSave())).toBe(false);
    });

    it("met when gymComplete = true", () => {
      updateSave({ gymComplete: true });
      const gym = BADGES.find((b) => b.id === "gym")!;
      expect(gym.condition(getSave())).toBe(true);
    });
  });

  describe("PUBLICATION condition", () => {
    it("needs every paper in the pocket collected", () => {
      const pub = BADGES.find((b) => b.id === "publication")!;
      const allPapers = getItemsByPocket("papers").map((p) => p.id);
      updateSave({ papersCollected: allPapers });
      expect(pub.condition(getSave())).toBe(true);
    });

    it("one paper short fails the check", () => {
      const pub = BADGES.find((b) => b.id === "publication")!;
      const allPapers = getItemsByPocket("papers").map((p) => p.id);
      if (allPapers.length === 0) return; // guard: no papers in content yet
      updateSave({ papersCollected: allPapers.slice(0, -1) });
      expect(pub.condition(getSave())).toBe(false);
    });
  });

  describe("CONNECTED condition", () => {
    it("needs every key item in the pocket collected", () => {
      const conn = BADGES.find((b) => b.id === "connected")!;
      const allKeys = getItemsByPocket("keyItems").map((k) => k.id);
      updateSave({ keyItemsCollected: allKeys });
      expect(conn.condition(getSave())).toBe(true);
    });
  });

  describe("POKEDEX condition", () => {
    it("needs every Pokedex entry seen", () => {
      const dex = BADGES.find((b) => b.id === "pokedex")!;
      const allIds = POKEDEX.map((p) => p.number);
      updateSave({ pokedexSeen: allIds });
      expect(dex.condition(getSave())).toBe(true);
    });

    it("one Pokemon short fails the check", () => {
      const dex = BADGES.find((b) => b.id === "pokedex")!;
      const allIds = POKEDEX.map((p) => p.number);
      if (allIds.length === 0) return;
      updateSave({ pokedexSeen: allIds.slice(0, -1) });
      expect(dex.condition(getSave())).toBe(false);
    });
  });

  describe("BLOGGER condition", () => {
    it("needs every blog in the pocket collected", () => {
      const blog = BADGES.find((b) => b.id === "blogger")!;
      const allBlogs = getItemsByPocket("blogs").map((b) => b.id);
      updateSave({ blogsCollected: allBlogs });
      expect(blog.condition(getSave())).toBe(true);
    });
  });

  describe("ENGINEER condition", () => {
    it("needs every TM in the pocket collected", () => {
      const eng = BADGES.find((b) => b.id === "engineer")!;
      const allTms = getItemsByPocket("tms").map((t) => t.id);
      updateSave({ tmsCollected: allTms });
      expect(eng.condition(getSave())).toBe(true);
    });
  });

  describe("COMPLETIONIST condition", () => {
    it("needs urlsOpened length >= total openable URLs", () => {
      const comp = BADGES.find((b) => b.id === "completionist")!;
      const totalOpenableUrls =
        Object.values(ITEM_DEFINITIONS).filter((i) => i.url).length +
        POKEDEX.filter((p) => p.url).length;
      // Make dummy keys — condition only checks length.
      const fakeKeys = Array.from(
        { length: totalOpenableUrls },
        (_, i) => `dummy:${i}`,
      );
      updateSave({ urlsOpened: fakeKeys });
      expect(comp.condition(getSave())).toBe(true);
    });

    it("auto-awards when checkBadges() fires with the condition met", () => {
      const totalOpenableUrls =
        Object.values(ITEM_DEFINITIONS).filter((i) => i.url).length +
        POKEDEX.filter((p) => p.url).length;
      const fakeKeys = Array.from(
        { length: totalOpenableUrls },
        (_, i) => `dummy:${i}`,
      );
      updateSave({ urlsOpened: fakeKeys });
      checkBadges();
      expect(getSave().badges).toContain("completionist");
      // Auto badges don't queue a notification
      expect(getPendingBadgeNotification()).toBeNull();
    });
  });

  describe("CHAMPION condition", () => {
    it("needs PHONE.NUMBER in keyItemsCollected", () => {
      const champ = BADGES.find((b) => b.id === "champion")!;
      updateSave({ keyItemsCollected: ["PHONE.NUMBER"] });
      expect(champ.condition(getSave())).toBe(true);
    });

    it("without PHONE.NUMBER the condition is false", () => {
      const champ = BADGES.find((b) => b.id === "champion")!;
      updateSave({ keyItemsCollected: ["GITHUB.URL"] });
      expect(champ.condition(getSave())).toBe(false);
    });

    it("auto-awards when checkBadges fires with PHONE.NUMBER collected", () => {
      updateSave({ keyItemsCollected: ["PHONE.NUMBER"] });
      checkBadges();
      expect(getSave().badges).toContain("champion");
    });
  });

  describe("checkBadges notification queue", () => {
    it("queues a notification for KOSTAS-given badges (not auto)", () => {
      updateSave({ gymComplete: true });
      checkBadges();
      const pending = getPendingBadgeNotification();
      expect(pending).not.toBeNull();
      expect(pending?.id).toBe("gym");
    });

    it("the queued notification marks the badge as notified so it doesn't re-fire", () => {
      updateSave({ gymComplete: true });
      checkBadges();
      expect(getSave().badgesNotified).toContain("gym");

      // Clear pending and run checkBadges again — should NOT re-queue gym
      clearPendingBadgeNotification();
      checkBadges();
      expect(getPendingBadgeNotification()).toBeNull();
    });

    it("queues exactly one notification per call (one badge at a time)", () => {
      // Trigger two conditions at once
      const totalOpenableUrls =
        Object.values(ITEM_DEFINITIONS).filter((i) => i.url).length +
        POKEDEX.filter((p) => p.url).length;
      updateSave({
        gymComplete: true,
        urlsOpened: Array.from(
          { length: totalOpenableUrls },
          (_, i) => `dummy:${i}`,
        ),
      });
      checkBadges();
      // completionist is auto → awarded; gym is queued → pending
      expect(getSave().badges).toContain("completionist");
      expect(getPendingBadgeNotification()?.id).toBe("gym");
    });
  });

  describe("getBadgeStatuses", () => {
    it("returns all 8 badges with earned/conditionMet flags", () => {
      const statuses = getBadgeStatuses();
      expect(statuses.length).toBe(8);
      expect(statuses.every((s) => typeof s.earned === "boolean")).toBe(true);
      expect(statuses.every((s) => typeof s.conditionMet === "boolean")).toBe(
        true,
      );
    });

    it("reflects save mutations", () => {
      updateSave({ badges: ["gym"], gymComplete: true });
      const statuses = getBadgeStatuses();
      const gymStatus = statuses.find((s) => s.badge.id === "gym")!;
      expect(gymStatus.earned).toBe(true);
      expect(gymStatus.conditionMet).toBe(true);
    });
  });
});
