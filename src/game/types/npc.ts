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
 *
 * Range, speed, and tick interval are all overridable on the NPC
 * definition itself — use `movementRangeX/Y` for the box the NPC can
 * roam inside, `speed` for Grid Engine movement velocity, and
 * `behaviorIntervalMs` for how often a movement tick fires.
 */
export enum MovementBehavior {
  /** Stationary, fixed facing direction. */
  STATIONARY = "stationary",
  /** Randomly walks left/right within `movementRangeX`. */
  WANDER_LEFT_RIGHT = "wander_left_right",
  /** Randomly walks up/down within `movementRangeY`. */
  WANDER_UP_DOWN = "wander_up_down",
  /** Randomly walks in any of 4 directions inside the range box. */
  WANDER_AREA = "wander_area",
  /** Predictable back-and-forth horizontally, bouncing at edges. */
  PACE_HORIZONTAL = "pace_horizontal",
  /** Predictable back-and-forth vertically, bouncing at edges. */
  PACE_VERTICAL = "pace_vertical",
  /** Same as PACE_HORIZONTAL but defaults to run speed. */
  RUN_HORIZONTAL = "run_horizontal",
  /** Same as PACE_VERTICAL but defaults to run speed. */
  RUN_VERTICAL = "run_vertical",
  /** Randomly changes facing direction on a timer. */
  LOOK_AROUND = "look_around",
}

/**
 * Visible-phase behavior for ephemeral Pokemon — what the sprite
 * does during the window it's spawned and before it despawns.
 *
 *   - "idle":    stand still (default for non-animated wild sprites)
 *   - "wander":  random small movement inside a 1-tile box
 *                (falls back to "hop" for non-animated sprites)
 *   - "hop":     small vertical pixel-tween bounce, like the OG
 *                overworld Pokemon "curious" animation
 */
export type EphemeralVisibleBehavior = "idle" | "wander" | "hop";

/**
 * Config for a Pokemon that spawns transiently at one of several
 * candidate tiles, fades out, waits, then respawns somewhere else.
 *
 * Lifecycle (see NPCSystem.initEphemeral / spawnEphemeral):
 *
 *   hidden → [pick spawn point] → fade-in → visible (visibleDuration)
 *          → fade-out → [wait hiddenDuration] → hidden → …
 *
 * As soon as the player registers the Pokemon in the Pokedex, the
 * cycle halts and the sprite becomes permanent at whichever tile
 * it was standing on at the moment of registration. On reload, a
 * permanent ephemeral is rebuilt at spawnPoints[0].
 */
export interface EphemeralConfig {
  /** Candidate tiles; one is chosen at random each cycle. */
  spawnPoints: { x: number; y: number }[];
  /** Seconds the Pokemon is on-screen per cycle. */
  visibleDuration: number;
  /** Seconds between despawn and next spawn. */
  hiddenDuration: number;
  /** Visual loop during the visible window. Default "idle". */
  visibleBehavior?: EphemeralVisibleBehavior;
  /**
   * Timing jitter in [0, 1]. 0 = deterministic durations.
   * 1 = uniformly random in [0, 2×duration]. Applied to BOTH
   * visibleDuration and hiddenDuration independently.
   */
  randomness?: number;
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
  /**
   * Movement speed override (Grid Engine tiles-per-second).
   * Defaults: 2 for walk behaviors, 8 for RUN_* behaviors.
   */
  speed?: number;
  /**
   * Override for the autonomous movement tick interval. Lower values
   * make the NPC decide more frequently. Defaults to {2000, 4000}ms
   * for walk behaviors and {500, 1000}ms for RUN_* behaviors.
   */
  behaviorIntervalMs?: { min: number; max: number };
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
    /**
     * Preferred: reference an ITEM_DEFINITIONS entry by id so the
     * item flows through `giveItem()` and participates in badge
     * checks (`checkBadges()` reads save.blogsCollected, etc.).
     * When set, `itemName / itemUrl / pocket / description` are
     * derived from the ItemDef and the legacy fields are ignored.
     */
    itemId?: string;
    /** LEGACY: Item name shown in the Bag (e.g. "MEDiC Paper"). */
    itemName?: string;
    /** LEGACY: URL opened when item is used from the Bag. */
    itemUrl?: string;
    /** LEGACY: Bag pocket the item goes to. */
    pocket?: string;
    /** LEGACY: Flavor text shown in the Bag description. */
    description?: string;
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
    /**
     * If set, this wild Pokemon joins the player's party on first
     * encounter. The value is a party member id from `ALL_PARTY`
     * (e.g. `"shiftmd"`, `"mew"`). Content-phase sequencing
     * guarantees the party is never full when a joinable encounter
     * fires — `addToParty` logs a warning if it ever is.
     */
    joinsParty?: string;
  };
  /**
   * If set, this NPC is an ephemeral Pokemon — it cycles between
   * visible and hidden at random spawn points until the player
   * registers it in the Pokedex. Requires `pokemon` to be set so the
   * cycle knows when to promote to permanent. See EphemeralConfig.
   */
  ephemeral?: EphemeralConfig;
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
