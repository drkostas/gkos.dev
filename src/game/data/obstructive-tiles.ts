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
 * Mauville City obstructive tiles.
 *
 * Signs: bottom edge blocked. You can walk onto them from above, left,
 * right, and walk off in those directions. Can't enter from below or
 * exit going down.
 *
 * Fences: top edge blocked. You can walk onto them from below, left,
 * right, and walk off in those directions. Can't enter from above or
 * exit going up. The fence visually occupies the top of the tile.
 */
export const MAUVILLE_OBSTRUCTIVE: ObstructiveTile[] = [
  // Signs (8 tiles)
  { x: 19, y: 7, blockedEdges: ["bottom"] },
  { x: 23, y: 5, blockedEdges: ["bottom"] },
  { x: 24, y: 5, blockedEdges: ["bottom"] },
  { x: 11, y: 6, blockedEdges: ["bottom"] },
  { x: 24, y: 14, blockedEdges: ["bottom"] },
  { x: 25, y: 14, blockedEdges: ["bottom"] },
  { x: 33, y: 6, blockedEdges: ["bottom"] },
  { x: 11, y: 15, blockedEdges: ["bottom"] },

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
