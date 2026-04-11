/**
 * TrainerStore — tracks which autoGive trainers have been cleared.
 *
 * "Cleared" means the player interacted, received the item, and the
 * trainer walked to their aside position. Persists via localStorage.
 */

const STORAGE_KEY = "gkos:explore:trainers-cleared";

function loadCleared(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCleared(ids: string[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/** Has this trainer already given their item? */
export function isTrainerCleared(npcId: string): boolean {
  return loadCleared().includes(npcId);
}

/** Mark a trainer as cleared. */
export function markTrainerCleared(npcId: string): void {
  const ids = loadCleared();
  if (!ids.includes(npcId)) {
    ids.push(npcId);
    saveCleared(ids);
  }
}
