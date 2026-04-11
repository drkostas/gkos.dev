/**
 * InteriorStateStore — saves/loads the player's interior position
 * so the game can resume inside a building after reload.
 *
 * For the Mauville Gym we also persist the puzzle state (per-tile
 * overrides for every position that has been swapped away from its
 * map.bin default) and which switch is currently pressed. Without
 * this, refreshing the page after solving the puzzle would drop the
 * player on the far side of a reset electricity grid with no way
 * back to the entrance.
 */

const KEY = "gkos:explore:interior";

/** Encoded gym puzzle state saved alongside position. */
export interface GymPuzzleState {
  /** Which switch is currently in the PRESSED state (0 = none). */
  pressedSwitch: number;
  /**
   * Per-tile overrides relative to the map.bin default state. Key
   * is "x,y", value is the current Ground layer tile index. Only
   * positions that differ from the initial state are stored.
   */
  tiles: Record<string, number>;
}

export interface InteriorState {
  interiorKey: string;
  x: number;
  y: number;
  facing: string;
  gymPuzzle?: GymPuzzleState;
}

export function saveInteriorState(
  interiorKey: string,
  x: number,
  y: number,
  facing: string,
  gymPuzzle?: GymPuzzleState,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    const payload: InteriorState = { interiorKey, x, y, facing };
    if (gymPuzzle) payload.gymPuzzle = gymPuzzle;
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {}
}

export function clearInteriorState(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
}

export function loadInteriorState(): InteriorState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.interiorKey && typeof parsed.x === "number") return parsed;
  } catch {}
  return null;
}
