/**
 * Shared helpers used by both OverworldScene and InteriorScene.
 *
 * These constants and functions were originally duplicated character-for-
 * character in both scene files. Consolidating them here means bug fixes
 * to the walking-animation mapping, the blocked-walk foot-toggle state
 * machine, or the bonk timing only need to land in one place — which has
 * been the source of past drift between the two scenes.
 *
 * The blocked-walk helper mutates a `BlockedWalkState` object so the scene
 * keeps ownership of the animation timers between frames. The helper
 * itself is stateless.
 */

import type Phaser from "phaser";
import type GridEngine from "grid-engine";
import { Direction } from "grid-engine";
import { sfx } from "@/game/systems/SoundManager";

// ── Animation constants ────────────────────────────────────────────

/**
 * Walking animation frame layout (9 frames total) from pokeemerald.
 * Frame indices:
 *   0 down-stand,  1 up-stand,   2 left-stand,
 *   3 down-walkL,  4 down-walkR, 5 up-walkL, 6 up-walkR,
 *   7 left-walkL,  8 left-walkR.
 * Right-facing reuses the left frames with `flipX = true`.
 */
export const WALK_ANIM = {
  down:  { leftFoot: 3, standing: 0, rightFoot: 4 },
  up:    { leftFoot: 5, standing: 1, rightFoot: 6 },
  left:  { leftFoot: 7, standing: 2, rightFoot: 8 },
  right: { leftFoot: 7, standing: 2, rightFoot: 8 },
};

/** Running uses the same layout but offset by 9 (frames 9-17 from running.png). */
export const RUN_ANIM = {
  down:  { leftFoot: 12, standing: 9,  rightFoot: 13 },
  up:    { leftFoot: 14, standing: 10, rightFoot: 15 },
  left:  { leftFoot: 16, standing: 11, rightFoot: 17 },
  right: { leftFoot: 16, standing: 11, rightFoot: 17 },
};

// ── Movement speeds ────────────────────────────────────────────────

/** Grid Engine tile speed when walking. */
export const WALK_SPEED = 4;
/** Grid Engine tile speed when holding shift to run. */
export const RUN_SPEED = 8;

// ── Bonk intervals (blocked walk-in-place SFX cadence) ────────────

/**
 * Milliseconds between bonk SFX plays when the player is walk-in-
 * placing into a wall. Walk and run have different intervals so the
 * collision sound stays in rhythm with the current step rate.
 */
export const BONK_INTERVAL_WALK = 700;
export const BONK_INTERVAL_RUN = 350;

// ── Direction helpers ──────────────────────────────────────────────

/** Reverse-direction lookup — used for making NPCs face the player. */
export const OPPOSITE: Record<string, Direction> = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
};

/** Valid keys for WALK_ANIM / RUN_ANIM. */
export type AnimDirKey = "down" | "up" | "left" | "right";

/** Convert a Grid Engine Direction enum to its WALK_ANIM / RUN_ANIM key. */
export function dirToAnimKey(dir: Direction): AnimDirKey {
  switch (dir) {
    case Direction.DOWN: return "down";
    case Direction.UP: return "up";
    case Direction.LEFT: return "left";
    case Direction.RIGHT: return "right";
    default: return "down";
  }
}

/** Return the tile coordinate one step in `dir` from `pos`. */
export function getTileInDirection(
  pos: { x: number; y: number },
  dir: Direction,
): { x: number; y: number } {
  switch (dir) {
    case Direction.UP:    return { x: pos.x,     y: pos.y - 1 };
    case Direction.DOWN:  return { x: pos.x,     y: pos.y + 1 };
    case Direction.LEFT:  return { x: pos.x - 1, y: pos.y     };
    case Direction.RIGHT: return { x: pos.x + 1, y: pos.y     };
    default: return { x: pos.x, y: pos.y };
  }
}

/** Parse a string direction ("up", "down", …) into a Direction enum. */
export function stringToDirection(s: string): Direction {
  switch (s) {
    case "up":    return Direction.UP;
    case "down":  return Direction.DOWN;
    case "left":  return Direction.LEFT;
    case "right": return Direction.RIGHT;
    default:      return Direction.DOWN;
  }
}

// ── Blocked walk-in-place (OG Emerald behavior) ────────────────────

/**
 * Mutable state carried across frames by the blocked-walk helper. The
 * scene owns the storage so the helper can stay stateless — each frame
 * handleBlockedWalk reads and writes these fields in place.
 *
 *   blockedDir        — which direction the player is currently bonking
 *                       against, or null when not blocked this frame.
 *   blockedStepTimer  — ms into the current step half (foot vs. standing).
 *   blockedBonkTimer  — ms since the last bonk SFX was played.
 *   blockedFootToggle — which foot to show next (false = left, true = right).
 */
export interface BlockedWalkState {
  blockedDir: Direction | null;
  blockedStepTimer: number;
  blockedBonkTimer: number;
  blockedFootToggle: boolean;
}

/**
 * Replicate OG Emerald's walk-in-place behavior: when the player holds a
 * direction but can't move (wall, NPC, collision tile), the character
 * turns to face that direction, cycles their walk animation in place at
 * the current step rate, and plays the bonk SFX once per step cycle.
 *
 * The helper is called every frame the player is blocked. On the first
 * blocked frame (state.blockedDir !== moveDir) it resets all timers and
 * plays an immediate bonk. Subsequent frames advance the foot-toggle
 * state machine and re-bonk every `BONK_INTERVAL_{WALK,RUN}` ms.
 *
 * `state` is mutated in place. When the player resumes moving (the scene's
 * update loop determines this) the scene should reset `state.blockedDir`
 * to null so the next block cycle starts fresh.
 *
 * @param state      scene-owned storage for cross-frame timers
 * @param moveDir    direction the player is trying to walk
 * @param delta      ms since last frame (from Phaser.Scene.update)
 * @param isRunning  true if shift is held (uses RUN_* constants)
 * @param sprite     the player's Phaser sprite — frame is set directly
 * @param gridEngine the scene's Grid Engine instance
 * @param playerId   Grid Engine character id of the player (typically "player")
 */
export function handleBlockedWalk(
  state: BlockedWalkState,
  moveDir: Direction,
  delta: number,
  isRunning: boolean,
  sprite: Phaser.GameObjects.Sprite,
  gridEngine: GridEngine,
  playerId: string,
): void {
  gridEngine.turnTowards(playerId, moveDir);
  sprite.flipX = moveDir === Direction.RIGHT;

  // Animation step duration matches current movement speed.
  const speed = isRunning ? RUN_SPEED : WALK_SPEED;
  const stepMs = 1000 / speed;
  const halfStep = stepMs / 2;

  // First frame of being blocked — bonk immediately and reset timers.
  if (state.blockedDir !== moveDir) {
    state.blockedDir = moveDir;
    state.blockedStepTimer = 0;
    state.blockedBonkTimer = 0;
    state.blockedFootToggle = false;
    sfx.collision();
    const animSet = isRunning ? RUN_ANIM : WALK_ANIM;
    const key = dirToAnimKey(moveDir);
    sprite.setFrame(animSet[key].leftFoot);
    return;
  }

  state.blockedStepTimer += delta;
  state.blockedBonkTimer += delta;

  const animSet = isRunning ? RUN_ANIM : WALK_ANIM;
  const key = dirToAnimKey(moveDir);

  // Walk animation cycles at the normal step rate while blocked.
  if (state.blockedStepTimer < halfStep) {
    const foot = state.blockedFootToggle ? animSet[key].rightFoot : animSet[key].leftFoot;
    sprite.setFrame(foot);
  } else if (state.blockedStepTimer < stepMs) {
    sprite.setFrame(animSet[key].standing);
  } else {
    state.blockedStepTimer -= stepMs;
    state.blockedFootToggle = !state.blockedFootToggle;
    const foot = state.blockedFootToggle ? animSet[key].rightFoot : animSet[key].leftFoot;
    sprite.setFrame(foot);
  }

  const bonkInterval = isRunning ? BONK_INTERVAL_RUN : BONK_INTERVAL_WALK;
  if (state.blockedBonkTimer >= bonkInterval) {
    state.blockedBonkTimer -= bonkInterval;
    sfx.collision();
  }
}
