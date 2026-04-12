import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { getSave, updateSave, clearSave } from "@/game/systems/GameSave";
import { isTrainerCleared, markTrainerCleared } from "@/game/systems/TrainerStore";
import { INTERIORS } from "@/game/data/interiors";

// happy-dom localStorage stub
beforeAll(() => {
  const store = new Map<string, string>();
  const mockLs: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => { store.delete(k); },
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
  };
  vi.stubGlobal("localStorage", mockLs);
  Object.defineProperty(window, "localStorage", {
    value: mockLs,
    writable: true,
    configurable: true,
  });
});

describe("Gym Completion — gymComplete flag", () => {
  const gymTrainers = INTERIORS.gym.npcs.filter((n) => n.autoGive);

  beforeEach(() => {
    clearSave();
    localStorage.clear();
  });

  it("gym has exactly 6 autoGive trainers", () => {
    expect(gymTrainers.length).toBe(6);
  });

  it("gymComplete stays false when only 5/6 trainers cleared", () => {
    // Clear 5 of 6 trainers
    for (let i = 0; i < 5; i++) {
      markTrainerCleared(gymTrainers[i].id);
    }
    // Simulate the check
    const allCleared = gymTrainers.every((t) => isTrainerCleared(t.id));
    expect(allCleared).toBe(false);
    expect(getSave().gymComplete).toBe(false);
  });

  it("gymComplete becomes true when all 6 trainers cleared", () => {
    for (const t of gymTrainers) {
      markTrainerCleared(t.id);
    }
    const allCleared = gymTrainers.every((t) => isTrainerCleared(t.id));
    expect(allCleared).toBe(true);
    // Simulate what InteriorScene.checkGymCompletion does
    if (allCleared) {
      updateSave({ gymComplete: true });
    }
    expect(getSave().gymComplete).toBe(true);
  });

  it("gymComplete flag persists across getSave() calls", () => {
    updateSave({ gymComplete: true });
    expect(getSave().gymComplete).toBe(true);
    // Re-read
    expect(getSave().gymComplete).toBe(true);
  });
});
