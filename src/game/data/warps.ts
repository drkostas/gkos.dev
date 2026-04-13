/**
 * Warp definitions — door tiles on the stitched overworld that trigger
 * transitions to building interiors.
 *
 * The overworld is a stitched 140x120 tile map. Mauville City origin sits
 * at tile (50, 50). Original pokeemerald warp positions (relative to
 * Mauville) need +50 offset for both x and y.
 *
 * OG Mauville outdoor warp positions → stitched coordinates:
 *   Gym entrance:     Mauville (8, 5)  → stitched (58, 55)
 *   Pokemon Center:   Mauville (22, 5) → stitched (72, 55)
 *   Pokemart:         Mauville (23, 14)→ stitched (73, 64)
 */

export interface Warp {
  /** Tile position on the stitched overworld map */
  overworldTile: { x: number; y: number };
  /** Target interior map key (matches INTERIORS record key) */
  targetMap: string;
  /** Spawn position inside the interior (tile coords) */
  spawnTile: { x: number; y: number };
  /** Player facing direction on arrival */
  spawnFacing: "up" | "down" | "left" | "right";
}

export const WARPS: Warp[] = [
  // Collision-based: these are the BLOCKED door tiles on the building wall.
  // Player tries to walk into them → gets blocked → warp triggers.
  // Spawn one tile above exit warps to avoid instant re-exit.

  // Mauville Gym — single door tile, spawn on the exit mat tile, facing up
  { overworldTile: { x: 58, y: 55 }, targetMap: "gym", spawnTile: { x: 4, y: 20 }, spawnFacing: "up" },

  // Pokemon Center — single door tile, spawn on the exit mat tile, facing up
  { overworldTile: { x: 72, y: 55 }, targetMap: "pokecenter", spawnTile: { x: 7, y: 8 }, spawnFacing: "up" },

  // Pokemart — single door tile, spawn on the exit mat tile, facing up
  { overworldTile: { x: 73, y: 64 }, targetMap: "mart", spawnTile: { x: 3, y: 7 }, spawnFacing: "up" },
];

/** Look up a warp by the BLOCKED door tile the player is trying to walk into. */
export function findWarp(x: number, y: number): Warp | undefined {
  return WARPS.find((w) => w.overworldTile.x === x && w.overworldTile.y === y);
}

/** Given the player position and facing, get the tile they're trying to walk into. */
export function getTargetTile(px: number, py: number, facing: string): { x: number; y: number } {
  switch (facing) {
    case "up": return { x: px, y: py - 1 };
    case "down": return { x: px, y: py + 1 };
    case "left": return { x: px - 1, y: py };
    case "right": return { x: px + 1, y: py };
    default: return { x: px, y: py };
  }
}
