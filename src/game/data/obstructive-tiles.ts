import { Direction } from "grid-engine";

/**
 * Obstructive tiles — tiles the player can walk onto, but that render
 * visually above the player (so the player appears to stand behind them).
 *
 * Optionally, some obstructive tiles block movement from specific directions
 * (e.g. a sign post can be entered from N/E/W but not from below going up).
 *
 * This is our manual override layer for the kinds of tiles the original
 * game's metatile behavior system would handle, but which aren't present
 * in Mauville's metatile attributes.
 */
export interface ObstructiveTile {
  /** Tile coordinates (in tile units, not pixels). */
  x: number;
  y: number;
  /**
   * Directions that are BLOCKED from entering this tile.
   * e.g. `[Direction.UP]` means you can't walk UP into this tile
   * (because there's a sign post standing on the ground).
   * Empty array = walkable from all 4 directions.
   */
  blockedDirections: Direction[];
}

/**
 * Mauville City obstructive tiles.
 *
 * Signs: you walk onto them and the post renders in front of you.
 * Since a sign post stands upright, you can't walk UP into it from below
 * (that would be walking through the solid base of the post).
 *
 * All 8 sign positions come from the original events.json bg_events.
 */
export const MAUVILLE_OBSTRUCTIVE: ObstructiveTile[] = [
  // City sign at (19,7)
  { x: 19, y: 7, blockedDirections: [Direction.UP] },
  // PokCenter signs at (23,5) and (24,5)
  { x: 23, y: 5, blockedDirections: [Direction.UP] },
  { x: 24, y: 5, blockedDirections: [Direction.UP] },
  // Gym sign at (11,6)
  { x: 11, y: 6, blockedDirections: [Direction.UP] },
  // PokeMart signs at (24,14) and (25,14)
  { x: 24, y: 14, blockedDirections: [Direction.UP] },
  { x: 25, y: 14, blockedDirections: [Direction.UP] },
  // Bike Shop sign at (33,6)
  { x: 33, y: 6, blockedDirections: [Direction.UP] },
  // Game Corner sign at (11,15)
  { x: 11, y: 15, blockedDirections: [Direction.UP] },
];

/**
 * Check if the given direction of movement is blocked by an obstructive tile
 * at the target position.
 */
export function isObstructiveBlocked(
  targetX: number,
  targetY: number,
  movementDirection: Direction,
  tiles: ObstructiveTile[] = MAUVILLE_OBSTRUCTIVE,
): boolean {
  const tile = tiles.find((t) => t.x === targetX && t.y === targetY);
  if (!tile) return false;
  return tile.blockedDirections.includes(movementDirection);
}

/** Return the set of obstructive tile positions as "x,y" strings. */
export function obstructivePositions(
  tiles: ObstructiveTile[] = MAUVILLE_OBSTRUCTIVE,
): Set<string> {
  return new Set(tiles.map((t) => `${t.x},${t.y}`));
}
