import { Direction } from "grid-engine";

/**
 * Obstructive tiles — tiles the player can walk onto, but that render
 * visually above the player (so the player appears to stand behind them).
 *
 * The `blockedDirections` array specifies which directions are BLOCKED
 * for movement that would cross this tile. This applies to BOTH:
 *   - ENTRY: moving from outside INTO this tile in a blocked direction
 *   - EXIT: moving from this tile OUT in a blocked direction
 *
 * Example — a sign post standing upright:
 *   blockedDirections: [Direction.UP, Direction.DOWN]
 *   → You cannot walk up or down through this tile.
 *   → You can walk LEFT or RIGHT across it (horizontal corridor).
 *   → While standing on it, you can leave only LEFT or RIGHT.
 */
export interface ObstructiveTile {
  x: number;
  y: number;
  blockedDirections: Direction[];
}

/**
 * Mauville City obstructive tiles.
 *
 * Signs block vertical movement (UP/DOWN) through their tile.
 * You can walk across them horizontally but can't pass through them
 * vertically — visually the post stands upright in the tile.
 */
export const MAUVILLE_OBSTRUCTIVE: ObstructiveTile[] = [
  // All 8 signs block vertical traversal (UP and DOWN)
  { x: 19, y: 7, blockedDirections: [Direction.UP, Direction.DOWN] },   // city sign
  { x: 23, y: 5, blockedDirections: [Direction.UP, Direction.DOWN] },   // pc sign
  { x: 24, y: 5, blockedDirections: [Direction.UP, Direction.DOWN] },   // pc sign
  { x: 11, y: 6, blockedDirections: [Direction.UP, Direction.DOWN] },   // gym sign
  { x: 24, y: 14, blockedDirections: [Direction.UP, Direction.DOWN] },  // mart sign
  { x: 25, y: 14, blockedDirections: [Direction.UP, Direction.DOWN] },  // mart sign
  { x: 33, y: 6, blockedDirections: [Direction.UP, Direction.DOWN] },   // bike shop sign
  { x: 11, y: 15, blockedDirections: [Direction.UP, Direction.DOWN] },  // game corner sign
];

/**
 * Check if movement is blocked by an obstructive tile.
 *
 * Blocks if EITHER:
 *   - The target tile is obstructive AND blocks the incoming direction (entry)
 *   - The source tile is obstructive AND blocks the outgoing direction (exit)
 */
export function isObstructiveBlocked(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  direction: Direction,
  tiles: ObstructiveTile[] = MAUVILLE_OBSTRUCTIVE,
): boolean {
  // Check target (entry block)
  const target = tiles.find((t) => t.x === targetX && t.y === targetY);
  if (target && target.blockedDirections.includes(direction)) {
    return true;
  }
  // Check source (exit block)
  const source = tiles.find((t) => t.x === sourceX && t.y === sourceY);
  if (source && source.blockedDirections.includes(direction)) {
    return true;
  }
  return false;
}
