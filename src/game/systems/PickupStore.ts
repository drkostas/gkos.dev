/**
 * PickupStore — tracks which pickup items the player has collected.
 * Persists via localStorage so pickups stay collected across page loads.
 */

const STORAGE_KEY = "gkos:explore:pickups";

/** An entry in the Bag's key items list. */
export interface CollectedItem {
  name: string;
  url?: string;
}

function loadState(): Record<string, CollectedItem> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state: Record<string, CollectedItem>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** Has the player already picked up this NPC's item? */
export function isPickedUp(npcId: string): boolean {
  const state = loadState();
  return !!state[npcId];
}

/** Record a pickup. */
export function recordPickup(npcId: string, item: CollectedItem): void {
  const state = loadState();
  state[npcId] = item;
  saveState(state);
}

/** Get all collected items (for display in the Bag). */
export function getCollectedItems(): CollectedItem[] {
  return Object.values(loadState());
}

/** Clear all pickups (useful for testing). */
export function clearPickups(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
