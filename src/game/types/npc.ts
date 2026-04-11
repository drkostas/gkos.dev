import { Direction } from "grid-engine";
import type { GameSave } from "@/game/systems/GameSave";
import type { DialogSystem } from "@/game/systems/DialogSystem";

/**
 * Context passed to `afterDialog` callbacks so they can surface
 * follow-up dialog boxes (e.g. "Received X BADGE!") while a reward
 * jingle plays in parallel. The callback can `await dialogSystem.
 * showDialog(...)` and `await sfx.<name>Async()` in Promise.all to
 * hold the conversation open until both the sound and the player
 * dismissal resolve.
 */
export interface AfterDialogContext {
  dialogSystem: DialogSystem;
}

/** Result returned by a dynamic dialog function. */
export interface DynamicDialogResult {
  lines: string[];
  speakerName?: string;
  /**
   * Callback fired after the dialog box closes. Receives a context
   * with the active DialogSystem so follow-up dialogs can be shown
   * inside the same interaction. Can be sync or async.
   */
  afterDialog?: (ctx: AfterDialogContext) => void | Promise<void>;
}

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
  /**
   * Dynamic dialog — if provided, called instead of static `dialog`.
   * Receives the current GameSave so dialog can vary by player state.
   * Can be async (e.g. fetch from API before opening dialog).
   * KOSTAS (gym leader) uses this for his 7-priority state machine.
   */
  dialogFn?: (save: GameSave) => DynamicDialogResult | Promise<DynamicDialogResult>;
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
  /** If set, NPC only spawns when this returns true. */
  spawnCondition?: () => boolean;
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
  /**
   * If set, this NPC gives an item on first interaction then walks to
   * asidePosition. On subsequent visits, spawns at asidePosition with
   * different dialog. Used for gym trainers that give papers/items.
   */
  autoGive?: {
    /** Item name shown in the Bag (e.g. "MEDiC Paper"). */
    itemName: string;
    /** URL opened when item is used from the Bag. */
    itemUrl?: string;
    /** Bag pocket the item goes to. */
    pocket: string;
    /** Flavor text shown in the Bag description. */
    description: string;
    /** Where the NPC walks to after giving the item. */
    asidePosition: { x: number; y: number };
    /** Dialog shown after the NPC has been cleared. */
    clearedDialog?: string[];
  };
  /**
   * If set, this NPC is an overworld Pokemon that registers in the Pokedex.
   * First encounter: flash + discovery dialog + registration.
   * Repeat encounters: shows repeatDialog instead.
   */
  pokemon?: {
    pokedexNumber: number;
    speciesName: string;
    projectName: string;
    projectDescription: string;
    projectUrl?: string;
    /** Dialog shown on 2nd+ encounters. Falls back to generic if omitted. */
    repeatDialog?: string[];
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
