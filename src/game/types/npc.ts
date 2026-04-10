import { Direction } from "grid-engine";

/**
 * Movement behavior types mapped from the original Pokemon Emerald events.
 */
export enum MovementBehavior {
  /** Stationary, fixed facing direction. */
  STATIONARY = "stationary",
  /** Randomly walks left/right within a range on a timer. */
  WANDER_LEFT_RIGHT = "wander_left_right",
  /** Randomly changes facing direction on a timer. */
  LOOK_AROUND = "look_around",
}

/**
 * Definition for a single NPC placed on the map.
 */
export interface NPCDefinition {
  /** Unique identifier (e.g. "npc_boy_3"). */
  id: string;
  /** Phaser spritesheet key loaded in BootScene. */
  spriteKey: string;
  /** Tile position on the map. */
  position: { x: number; y: number };
  /** Initial facing direction. */
  facingDirection: Direction;
  /** Movement behavior from original game data. */
  movementBehavior: MovementBehavior;
  /** Horizontal wander range in tiles (0 = no horizontal movement). */
  movementRangeX: number;
  /** Vertical wander range in tiles (0 = no vertical movement). */
  movementRangeY: number;
  /** Dialog lines shown when the player interacts with this NPC. */
  dialog: string[];
  /** Optional speaker name shown in the dialog box. */
  speakerName?: string;
  /** Whether this NPC uses the standard 9-frame spritesheet (false for item_ball). */
  animated: boolean;
  /** Collision width in tiles (default 1). */
  tileWidth?: number;
  /** Collision height in tiles (default 1). */
  tileHeight?: number;
  /** Uniform sprite scale (e.g. 0.5 to halve a 64px sprite to 32px). */
  scale?: number;
  /** Pixel offset for sprite rendering (passed to Grid Engine's offsetY). */
  offsetY?: number;
  /** Flip sprite horizontally (for non-animated sprites). */
  flipX?: boolean;
  /**
   * If set, this NPC is a pickup item. After interaction, the sprite is removed
   * and the item is added to the player's key items. Pickup state persists
   * via localStorage.
   */
  pickup?: {
    /** Item name shown in the Bag (e.g. "RESUME.PDF"). */
    itemName: string;
    /** URL opened when the item is "used" from the Bag. */
    itemUrl?: string;
  };
}

/**
 * Definition for a sign (bg_event) on the map.
 */
export interface SignDefinition {
  /** Tile position. */
  position: { x: number; y: number };
  /** Text shown when the player reads the sign. */
  text: string[];
}
