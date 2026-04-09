import { Direction } from "grid-engine";

/**
 * An edge of a tile. The "bottom" edge of a tile is the south side.
 */
export type Edge = "top" | "bottom" | "left" | "right";

/**
 * Obstructive tiles — tiles the player can walk onto, but that render
 * visually above the player (so the player appears to stand behind them).
 *
 * Each obstructive tile can have some of its edges BLOCKED. A blocked
 * edge prevents movement across it — both entering and exiting.
 *
 * Example — a sign post facing down (read from below):
 *   blockedEdges: ["bottom"]
 *   → Cannot walk UP from the tile below (crosses the sign's bottom edge).
 *   → Cannot walk DOWN from the sign tile (crosses the sign's bottom edge).
 *   → Can walk onto the sign from above, left, or right.
 *   → Can leave the sign going up, left, or right.
 */
export interface ObstructiveTile {
  x: number;
  y: number;
  blockedEdges: Edge[];
}

/**
 * Mauville City obstructive tiles. Signs block their bottom edge.
 * All 8 sign positions come from events.json bg_events.
 */
export const MAUVILLE_OBSTRUCTIVE: ObstructiveTile[] = [
  { x: 19, y: 7, blockedEdges: ["bottom"] },   // city sign
  { x: 23, y: 5, blockedEdges: ["bottom"] },   // pc sign
  { x: 24, y: 5, blockedEdges: ["bottom"] },   // pc sign
  { x: 11, y: 6, blockedEdges: ["bottom"] },   // gym sign
  { x: 24, y: 14, blockedEdges: ["bottom"] },  // mart sign
  { x: 25, y: 14, blockedEdges: ["bottom"] },  // mart sign
  { x: 33, y: 6, blockedEdges: ["bottom"] },   // bike shop sign
  { x: 11, y: 15, blockedEdges: ["bottom"] },  // game corner sign
];

/**
 * Check if movement from source to target is blocked by an obstructive edge.
 *
 * A movement crosses two edges simultaneously:
 *   - The "exit" edge of the source tile
 *   - The "entry" edge of the target tile
 * If EITHER of those edges is blocked, the movement is blocked.
 */
export function isObstructiveBlocked(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  direction: Direction,
  tiles: ObstructiveTile[] = MAUVILLE_OBSTRUCTIVE,
): boolean {
  let sourceEdge: Edge;
  let targetEdge: Edge;
  switch (direction) {
    case Direction.UP:
      sourceEdge = "top"; targetEdge = "bottom"; break;
    case Direction.DOWN:
      sourceEdge = "bottom"; targetEdge = "top"; break;
    case Direction.LEFT:
      sourceEdge = "left"; targetEdge = "right"; break;
    case Direction.RIGHT:
      sourceEdge = "right"; targetEdge = "left"; break;
    default:
      return false;
  }

  const source = tiles.find((t) => t.x === sourceX && t.y === sourceY);
  if (source && source.blockedEdges.includes(sourceEdge)) return true;

  const target = tiles.find((t) => t.x === targetX && t.y === targetY);
  if (target && target.blockedEdges.includes(targetEdge)) return true;

  return false;
}
