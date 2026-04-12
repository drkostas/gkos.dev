import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
import {
  getSave,
  updateSave,
  clearSave,
  flushSave,
  reloadFromStorage,
} from "@/game/systems/GameSave";

/**
 * happy-dom's built-in localStorage implementation is fragile: some
 * methods disappear after the first test that mutates it. We swap in
 * a plain-object in-memory implementation before the test suite runs
 * so every test gets deterministic Storage behaviour.
 */
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
  // Some callers reference window.localStorage directly — alias them.
  Object.defineProperty(window, "localStorage", {
    value: mockLs,
    configurable: true,
  });
});

/**
 * Tests for the GameSave in-memory cache (B1) + legacy badge migration (B7).
 * The cache is module-level state, so `clearSave()` resets both the
 * cache and localStorage between tests.
 */

const STORAGE_KEY = "gkos:explore:save";

describe("GameSave", () => {
  beforeEach(() => {
    // Wipe everything before each test so cache starts at defaults.
    // happy-dom's localStorage lacks a `.clear()` method, so iterate.
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
    clearSave();
  });

  describe("getSave / updateSave basics", () => {
    it("returns defaults on first read", () => {
      const save = getSave();
      expect(save.playerName).toBe("");
      expect(save.badges).toEqual([]);
      expect(save.papersCollected).toEqual([]);
    });

    it("updateSave merges the partial into the cache", () => {
      updateSave({ playerName: "ASH" });
      expect(getSave().playerName).toBe("ASH");
    });

    it("getSave returns a clone (mutations don't leak into cache)", () => {
      const s1 = getSave();
      s1.badges.push("gym");
      const s2 = getSave();
      expect(s2.badges).toEqual([]);
    });
  });

  describe("B1 — microtask flush + coalesced writes", () => {
    it("100 updateSave calls in a tight loop don't lose updates", async () => {
      // Seed a known starting value
      updateSave({ playTimeSeconds: 0 });
      flushSave();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).playTimeSeconds).toBe(
        0,
      );

      // Fire 100 read-modify-write increments synchronously
      for (let i = 0; i < 100; i++) {
        updateSave({ playTimeSeconds: getSave().playTimeSeconds + 1 });
      }

      // In-memory reflects all 100 increments immediately
      expect(getSave().playTimeSeconds).toBe(100);

      // Wait a microtask for the scheduled flush to fire
      await Promise.resolve();

      // localStorage now matches in-memory
      const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(persisted.playTimeSeconds).toBe(100);
    });

    it("flushSave() forces immediate sync write to localStorage", () => {
      updateSave({ playerName: "RED" });
      // Without flush, localStorage may still hold the stale value
      // (depends on microtask ordering)
      flushSave();
      const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(persisted.playerName).toBe("RED");
    });

    it("clearSave resets cache + wipes gkos:explore:* keys", () => {
      updateSave({ playerName: "RED", badges: ["gym"] });
      flushSave();
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
      clearSave();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(getSave().playerName).toBe("");
      expect(getSave().badges).toEqual([]);
    });
  });

  describe("B7 — legacy badge id migration on load", () => {
    it("maps phd → gym, scholar → publication, etc", () => {
      // Seed legacy save directly into localStorage, then the NEXT
      // getSave() will trigger loadFromStorage which runs the migration.
      const legacy = {
        playerName: "TESTER",
        badges: ["phd", "scholar", "opensource", "author", "fullstack"],
        badgesNotified: ["phd"],
      };
      // Reset the module-level cache so getSave reloads from localStorage.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      reloadFromStorage();

      const save = getSave();
      expect(save.badges).toContain("gym");
      expect(save.badges).toContain("publication");
      expect(save.badges).toContain("pokedex");
      expect(save.badges).toContain("blogger");
      expect(save.badges).toContain("engineer");
      expect(save.badges).not.toContain("phd");
      expect(save.badges).not.toContain("scholar");
      expect(save.badgesNotified).toContain("gym");
      expect(save.badgesNotified).not.toContain("phd");
    });

    it("drops the legacy `explorer` badge (no design-doc equivalent)", () => {
      const legacy = {
        playerName: "TESTER",
        badges: ["phd", "explorer", "devoted"],
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      reloadFromStorage();

      const save = getSave();
      expect(save.badges).not.toContain("explorer");
      expect(save.badges).toContain("gym");
      expect(save.badges).toContain("completionist");
      expect(save.badges.length).toBe(2);
    });

    it("maps devoted → completionist", () => {
      const legacy = { playerName: "TESTER", badges: ["devoted"] };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      reloadFromStorage();

      const save = getSave();
      expect(save.badges).toContain("completionist");
      expect(save.badges).not.toContain("devoted");
    });

    it("passes through already-new-style badge ids unchanged", () => {
      const modern = {
        playerName: "TESTER",
        badges: ["gym", "publication", "pokedex", "champion"],
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(modern));
      reloadFromStorage();

      const save = getSave();
      expect(save.badges).toEqual(["gym", "publication", "pokedex", "champion"]);
    });

    it("dedupes when both legacy and new ids appear in the same save", () => {
      const mixed = {
        playerName: "TESTER",
        // phd → gym, and gym already present → should not duplicate
        badges: ["phd", "gym"],
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mixed));
      reloadFromStorage();

      const save = getSave();
      expect(save.badges.filter((b) => b === "gym").length).toBe(1);
    });
  });
});
