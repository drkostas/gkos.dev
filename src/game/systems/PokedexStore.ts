/**
 * PokedexStore — tracks which Pokemon the player has discovered.
 *
 * "Seen" means the player has interacted with the Pokemon at least once
 * (triggering the flash + registration flow). Persists via localStorage.
 */

const STORAGE_KEY = "gkos:explore:pokedex-seen";

function loadSeen(): number[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSeen(seen: number[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // ignore
  }
}

/** Has the player already discovered this Pokemon? */
export function isPokedexSeen(pokedexNumber: number): boolean {
  return loadSeen().includes(pokedexNumber);
}

/** Mark a Pokemon as discovered. Returns false if already seen. */
export function markPokedexSeen(pokedexNumber: number): boolean {
  const seen = loadSeen();
  if (seen.includes(pokedexNumber)) return false;
  seen.push(pokedexNumber);
  saveSeen(seen);
  return true;
}

/** How many unique Pokemon the player has discovered. */
export function getPokedexSeenCount(): number {
  return loadSeen().length;
}

/** Clear all Pokedex discoveries (for "Clear Progress"). */
export function clearPokedexSeen(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
