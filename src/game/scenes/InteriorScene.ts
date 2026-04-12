import Phaser from "phaser";
import { Direction } from "grid-engine";
import type GridEngine from "grid-engine";
import {
  WALK_ANIM,
  WALK_SPEED,
  OPPOSITE,
  dirToAnimKey,
  getTileInDirection,
  stringToDirection,
  handleBlockedWalk,
} from "@/game/utils/sceneHelpers";
import { DialogSystem } from "@/game/systems/DialogSystem";
import { HiddenItemSystem } from "@/game/systems/HiddenItemSystem";
import { incrementStep } from "@/game/systems/StepStore";
import { getSave, giveItem, updateSave } from "@/game/systems/GameSave";
import { getItemDef } from "@/game/data/itemDefinitions";
import { isTrainerCleared, markTrainerCleared } from "@/game/systems/TrainerStore";
import { checkBadges } from "@/game/systems/BadgeMilestones";
import { INTERIORS, type InteriorDef, type InteriorNPC } from "@/game/data/interiors";
import { WARPS } from "@/game/data/warps";
import { getSceneZoom } from "@/game/config";
import { touchState } from "@/game/systems/TouchInput";
import { sfx } from "@/game/systems/SoundManager";
import { bgm } from "@/game/systems/BGMManager";
import { GameEvents, emitGameEvent, onGameEvent, getDebugMode } from "@/game/EventBridge";
import {
  saveInteriorState,
  clearInteriorState,
  loadInteriorState,
  type GymPuzzleState,
} from "@/game/systems/InteriorStateStore";
import {
  GYM_SWITCHES,
  GYM_TILE_SWAP,
  GYM_BLOCKING_TILES,
  GYM_PUZZLE_BOUNDS,
  GYM_PUZZLE_TILES,
  GYM_RAISED_SWITCH,
  GYM_PRESSED_SWITCH,
} from "@/game/data/gym-puzzle";

/**
 * 9-frame spritesheet walking animation mapping.
 * Same layout as OverworldScene — frames from original pokeemerald source.
 *
 * Frame layout in the 9-frame spritesheet (144x32):
 *   0 = down standing,  1 = up standing,  2 = left standing
 *   3 = down walk-L,    4 = down walk-R
 *   5 = up walk-L,      6 = up walk-R
 *   7 = left walk-L,    8 = left walk-R
 *
 * Walk cycle: leftFoot → standing → rightFoot → standing → repeat
 * Right direction reuses left frames with hFlip.
 */
// WALK_ANIM / RUN_ANIM / OPPOSITE moved to @/game/utils/sceneHelpers

/** Data passed to this scene via scene.start(). */
interface InteriorSceneData {
  interiorKey: string;
  returnPos: { x: number; y: number; facing: string };
  /** Optional explicit spawn tile inside the interior. */
  spawnTile?: { x: number; y: number };
  /** Optional explicit facing direction on spawn. */
  spawnFacing?: "up" | "down" | "left" | "right";
}

// WALK_SPEED / RUN_SPEED moved to @/game/utils/sceneHelpers

/**
 * InteriorScene — renders building interiors (Pokemon Center, Mart, Gym)
 * with Grid Engine movement, NPC interaction, and exit warps.
 *
 * Launched from OverworldScene via:
 *   this.scene.start("InteriorScene", { interiorKey, returnPos });
 *
 * On exit warp, transitions back via:
 *   this.scene.start("OverworldScene", { returnFromInterior: true, returnPos });
 */
export class InteriorScene extends Phaser.Scene {
  declare gridEngine: GridEngine;

  private interiorKey!: string;
  private interiorDef!: InteriorDef;
  private returnPos!: { x: number; y: number; facing: string };
  private explicitSpawnTile?: { x: number; y: number };
  private explicitSpawnFacing?: "up" | "down" | "left" | "right";

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private dialogSystem!: DialogSystem;
  private isInteracting = false;
  private isRunning = false;
  private isExiting = false;
  private menuActive = false;
  /** Turn-before-walk: tap = turn, hold = walk (OG behavior). */
  private pendingTurnDir: Direction | null = null;
  private pendingTurnStart = 0;
  private static readonly TURN_DELAY_MS = 130;

  /** NPC sprites keyed by NPC id. */
  private npcSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  /** Original facing directions for NPCs (to restore after interaction). */
  private npcOriginalFacing: Map<string, Direction> = new Map();

  /**
   * Blocked walk-in-place state (OG Emerald behavior).
   * When holding into a wall, the character plays walk animation at step
   * rate and bonks once per step cycle.
   *
   * Left package-public (no `private`) so `this` satisfies the
   * BlockedWalkState interface in sceneHelpers and can be passed
   * directly to handleBlockedWalk.
   */
  blockedDir: Direction | null = null;
  blockedStepTimer = 0;
  private lastInteriorTile: { x: number; y: number } | null = null;

  /** Map pixel dimensions for camera centering. */
  private mapWidthPx = 0;
  private mapHeightPx = 0;

  /** Debug coordinate overlay (same as OverworldScene). */
  private debugEnabled = false;
  private debugContainer: Phaser.GameObjects.Container | null = null;
  private debugTexts: Phaser.GameObjects.Text[] = [];
  private debugMapW = 0;
  private debugMapH = 0;
  blockedFootToggle = false;
  blockedBonkTimer = 0;

  // ── Gym puzzle state ─────────────────────────────────────────
  /** Which switch was last pressed (1-4, 0 = none). */
  private gymPressedSwitch = 0;
  /** Last tile the player was standing on (for switch edge detection). */
  private gymLastPlayerTile: { x: number; y: number } | null = null;
  /** Reference to the tilemap ground layer for runtime tile swaps. */
  private gymGroundLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  /** Reference to the collision layer so we can sync it when swapping. */
  private gymCollisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  /**
   * Set of `${x},${y}` positions that started out as swappable puzzle
   * tiles. Computed once at init — gymSyncCollision iterates ONLY
   * these positions so that after a V2 → FloorTile swap we still
   * clear the stale collision (FloorTile is not in GYM_TILE_SWAP but
   * the position is still part of the puzzle).
   */
  private gymPuzzlePositions = new Set<string>();
  /**
   * Initial Ground layer tile index at each puzzle position, captured
   * right after map load. Used to compute a minimal "diff from
   * default" for save/restore — we only persist positions that have
   * drifted from the map.bin state, so the save payload stays small.
   */
  private gymPuzzleInitial = new Map<string, number>();
  /**
   * Foreground sprites keyed by `${x},${y}`. When a puzzle tile swap
   * changes the Ground layer we need to re-point the matching sprite
   * at the new metatile's top-layer frame so switches show pressed
   * state, beams/poles swap appearance, etc.
   */
  private gymFgSprites = new Map<string, Phaser.GameObjects.Sprite>();
  /** Metadata needed to re-extract frames when a tile swap happens. */
  private gymFgFrameCtx: {
    topKey: string;
    tileW: number;
    tileH: number;
    margin: number;
    spacing: number;
    cols: number;
    layerTypeByTileIdx: Map<number, number>;
  } | null = null;

  // ── Gym electric gate animation ──────────────────────────────
  /**
   * Full beams (groups of sprites that form one visual electric
   * beam). When a crackle fires, every sprite in a beam swaps to
   * frame1 together, then back to frame0.
   */
  private gymBeams: Array<Phaser.GameObjects.Sprite[]> = [];
  /** Countdown until the next random beam crackle. */
  private gymNextCrackleMs = 0;
  /** Beams currently mid-crackle with their remaining time. */
  private gymActiveCrackles: Array<{
    beam: Phaser.GameObjects.Sprite[];
    remainingMs: number;
  }> = [];
  /**
   * Ground-layer tile indices (1-based GIDs) whose foreground sprite
   * uses the animated electric-gate region of the secondary tileset.
   * Derived from the compositor: compact indices +1 for GIDs.
   */
  private static readonly GYM_ANIMATED_TILE_IDS = new Set<number>([
    28, 29, 30, 31,   // GreenH1/H2_On, RedH1/H2_On (0x220-0x223)
    36, 37, 38, 39,   // GreenH3/H4_On, RedH3/H4_On (0x228-0x22b)
    58, 59,           // GreenV1_On, RedV1_On (0x240, 0x241)
    65, 66,           // GreenV2_On, RedV2_On (0x248, 0x249)
  ]);

  constructor() {
    super({ key: "InteriorScene" });
  }

  init(data: InteriorSceneData): void {
    this.interiorKey = data.interiorKey;
    this.returnPos = data.returnPos;
    this.explicitSpawnTile = data.spawnTile;
    this.explicitSpawnFacing = data.spawnFacing;
    this.isExiting = false;
    this.isInteracting = false;
    this.isRunning = false;
    this.blockedDir = null;
    this.npcSprites.clear();
    this.npcOriginalFacing.clear();
    // Reset gym puzzle per-entry state. Phaser reuses the same scene
    // instance across scene.start() calls, so without this reset a
    // leftover gymPressedSwitch from a previous visit would make the
    // "don't re-press the same switch" guard fire incorrectly (user
    // walks onto a switch that looks raised, nothing happens).
    this.gymPressedSwitch = 0;
    this.gymLastPlayerTile = null;
    this.gymPuzzlePositions.clear();
    this.gymPuzzleInitial.clear();
    this.gymFgSprites.clear();
    this.gymFgFrameCtx = null;
    this.gymBeams = [];
    this.gymActiveCrackles = [];
    this.gymNextCrackleMs = 0;
  }

  preload(): void {
    const def = INTERIORS[this.interiorKey];
    if (!def) return;

    // Cache keys derived from interior key to avoid collisions with overworld.
    const mapKey = `interior_${def.key}`;
    const bottomKey = `${def.key}_bottom`;

    const topKey = `${def.key}_top`;

    if (!this.textures.exists(bottomKey)) {
      this.load.image(bottomKey, def.tilesetBottom);
    }
    if (!this.textures.exists(topKey)) {
      this.load.image(topKey, def.tilesetTop);
    }
    if (!this.cache.tilemap.exists(mapKey)) {
      this.load.tilemapTiledJSON(mapKey, def.mapJson);
    }

    // Gym: preload both animation frames of the top tileset so we can
    // swap between them at 30fps for the electric gate crackle.
    if (def.key === "gym") {
      if (!this.textures.exists("gym_top_frame0")) {
        this.load.image("gym_top_frame0", "/game/tilesets/gym_top_frame0.png");
      }
      if (!this.textures.exists("gym_top_frame1")) {
        this.load.image("gym_top_frame1", "/game/tilesets/gym_top_frame1.png");
      }
    }

    // Preload questionnaire tile icons (e.g. the letter on the mart desk).
    if (def.questionnaireTiles) {
      for (const q of def.questionnaireTiles) {
        if (q.iconUrl) {
          const texKey = `q_${q.id}`;
          if (!this.textures.exists(texKey)) {
            this.load.image(texKey, q.iconUrl);
          }
        }
      }
    }
  }

  create(): void {
    const def = INTERIORS[this.interiorKey];
    if (!def) {
      console.error(`InteriorScene: unknown interior key "${this.interiorKey}"`);
      this.scene.start("OverworldScene");
      return;
    }
    this.interiorDef = def;

    const mapKey = `interior_${def.key}`;
    const bottomKey = `${def.key}_bottom`;

    // ── Tilemap ──────────────────────────────────────────────
    const map = this.make.tilemap({ key: mapKey });

    // The tileset name in the JSON is e.g. "pokecenter_bottom".
    // We match it with the texture key we loaded.
    const tilesetName = `${def.key}_bottom`;
    const tileset = map.addTilesetImage(tilesetName, bottomKey);
    if (!tileset) {
      throw new Error(`InteriorScene: failed to add tileset "${tilesetName}"`);
    }

    // Ground layer — renders below everything
    const groundLayer = map.createLayer("Ground", tileset);
    if (groundLayer) groundLayer.setDepth(0);
    this.gymGroundLayer = groundLayer;

    // Collision layer — hidden, Grid Engine reads ge_collide from it.
    // Grid Engine only honors per-tile `ge_collide` properties from the
    // tileset; it does not honor layer-level properties. Rather than
    // forcing a specific floor gid to be a collide tile (which breaks
    // when the same gid is used as the walkable floor on the Ground
    // layer — see the mart), we stamp `ge_collide: true` onto every
    // non-empty tile on the Collision layer at runtime.
    const collisionLayer = map.createLayer("Collision", tileset);
    this.gymCollisionLayer = collisionLayer;
    if (collisionLayer) {
      collisionLayer.setVisible(false);
      // Gym: record every puzzle-participating tile position (beams,
      // poles, switches, FloorTile) and clear its baked collision.
      // gymSyncCollision later iterates this set so after a
      // V2 → FloorTile swap (or vice versa) we correctly add or
      // remove collision even though FloorTile isn't a swap key.
      if (def.key === "gym") {
        const { x0, x1, y0, y1 } = GYM_PUZZLE_BOUNDS;
        const ground = groundLayer;
        this.gymPuzzlePositions.clear();
        this.gymPuzzleInitial.clear();
        if (ground) {
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const t = ground.getTileAt(x, y);
              if (t && GYM_PUZZLE_TILES.has(t.index)) {
                collisionLayer.removeTileAt(x, y);
                const key = `${x},${y}`;
                this.gymPuzzlePositions.add(key);
                // Snapshot the map.bin default for save-diffing.
                this.gymPuzzleInitial.set(key, t.index);
              }
            }
          }
        }
      }
      collisionLayer.forEachTile((t) => {
        if (t && t.index > 0) {
          t.properties = { ...(t.properties ?? {}), ge_collide: true };
        }
      });
    }

    // ── Foreground (top layer) ─────────────────────────────────
    // Render individual sprites from the top tileset for each tile
    // that has visible content. Uses Y-sorted depth so items above
    // the player render in front, matching OG GBA layer behavior.
    // Build a "tileKey → sprite" map while iterating so we can later
    // group adjacent animated tiles into full beams for the gym.
    this.gymFgSprites.clear();
    const animSpriteByTile = new Map<string, Phaser.GameObjects.Sprite>();
    const topKey = `${def.key}_top`;
    if (this.textures.exists(topKey)) {
      const topTex = this.textures.get(topKey);
      const topImg = topTex.getSourceImage() as HTMLImageElement;
      // The top tileset has the same margin/spacing/tilesize as bottom
      const ts = map.tilesets[0];
      const tileW = ts.tileWidth;
      const tileH = ts.tileHeight;
      const margin = (ts as any).tileMargin ?? 1;
      const spacing = (ts as any).tileSpacing ?? 2;
      const cols = ts.columns;

      // Cache layerType per local tile index so refreshFgSprite can
      // reassign the correct depth without walking the tileset tiles
      // array on every swap. Phaser flattens Tiled's per-tile
      // properties into `tileset.tileProperties` (a plain object
      // keyed by tile id) during parse — the raw `tiles` array from
      // the JSON is NOT preserved, so we read from tileProperties.
      const tilePropsMap = (ts as any).tileProperties as
        | Record<string, Record<string, unknown>>
        | undefined;
      const layerTypeByTileIdx = new Map<number, number>();
      if (tilePropsMap) {
        for (const [idStr, props] of Object.entries(tilePropsMap)) {
          const lt = (props as { layerType?: number }).layerType;
          if (typeof lt === "number") {
            layerTypeByTileIdx.set(Number(idStr), lt);
          }
        }
      }
      this.gymFgFrameCtx = {
        topKey,
        tileW,
        tileH,
        margin,
        spacing,
        cols,
        layerTypeByTileIdx,
      };

      // For each ground tile, check if the corresponding top-layer tile
      // has visible (non-transparent) pixels. If so, create a sprite.
      const groundData = map.getLayer("Ground")?.data;
      if (groundData) {
        for (let ty = 0; ty < map.height; ty++) {
          for (let tx = 0; tx < map.width; tx++) {
            const tile = groundData[ty][tx];
            if (!tile || tile.index <= 0) continue;
            const tileIdx = tile.index - 1; // 0-indexed
            const srcCol = tileIdx % cols;
            const srcRow = Math.floor(tileIdx / cols);
            const srcX = margin + srcCol * (tileW + spacing);
            const srcY = margin + srcRow * (tileH + spacing);

            // Create a unique frame for this tile from the top tileset.
            // For the gym animated tiles we create MATCHING frames on
            // the two animation-frame textures so we can swap later.
            const frameKey = `${topKey}_${tileIdx}`;
            if (!topTex.has(frameKey)) {
              topTex.add(frameKey, 0, srcX, srcY, tileW, tileH);
            }

            const gid = tile.index; // 1-based GID
            const isAnimated =
              def.key === "gym" &&
              InteriorScene.GYM_ANIMATED_TILE_IDS.has(gid);

            // For animated tiles, start the sprite on the frame0 texture
            // so the initial state is deterministic.
            let initialTexKey = topKey;
            if (isAnimated) {
              const f0 = this.textures.get("gym_top_frame0");
              const f1 = this.textures.get("gym_top_frame1");
              if (f0 && f1) {
                if (!f0.has(frameKey)) f0.add(frameKey, 0, srcX, srcY, tileW, tileH);
                if (!f1.has(frameKey)) f1.add(frameKey, 0, srcX, srcY, tileW, tileH);
                initialTexKey = "gym_top_frame0";
              }
            }

            const sprite = this.add.sprite(
              tx * tileW + tileW / 2,
              ty * tileH + tileH / 2,
              initialTexKey,
              frameKey,
            );
            if (isAnimated) {
              animSpriteByTile.set(`${tx},${ty}`, sprite);
            }
            // Depth is driven by the `layerType` property emitted by
            // compose-interior-maps.mjs, which reads metatile_attributes.bin
            // from pret exactly the same way the OG game does:
            //
            //   0 NORMAL  — top-layer draws ALWAYS over characters
            //               (walls, counters, PCs, shelves, pole caps).
            //   1 COVERED — top-layer draws ALWAYS under characters
            //               (floor decorations, mats, switches).
            //   2 SPLIT   — rare; treat like NORMAL.
            //
            // OG uses BG priority bits, NOT Y-sorting. Emulating that
            // in Phaser means constant depths — 5000 sits above any
            // player Y-sort and 1 sits safely below.
            const layerType = layerTypeByTileIdx.get(tileIdx) ?? 0;
            const depth = layerType === 1 ? 1 : 5000;
            sprite.setDepth(depth);
            sprite.setOrigin(0.5, 0.5);
            this.gymFgSprites.set(`${tx},${ty}`, sprite);
          }
        }
      }
    }

    // Build gymBeams from the initial live animated tile positions.
    if (def.key === "gym") {
      this.rebuildGymBeams();
    }

    // ── Player sprite ────────────────────────────────────────
    this.playerSprite = this.add.sprite(0, 0, "player");

    // ── Spawn position from warp data ─────────────────────────
    // The spawn tile is passed as part of the scene data (from warps.ts).
    // We find the matching warp to get the exact spawn tile.
    // For now, use the first exit warp tile as a fallback spawn.
    const spawnPos = this.findSpawnPosition();

    // ── Build Grid Engine characters array ────────────────────
    const characters: Parameters<GridEngine["create"]>[1]["characters"] = [
      {
        id: "player",
        sprite: this.playerSprite,
        walkingAnimationMapping: WALK_ANIM,
        startPosition: spawnPos.tile,
        facingDirection: spawnPos.facing,
        speed: WALK_SPEED,
        offsetY: 0,
        collides: {
          collidesWithTiles: true,
          collisionGroups: ["geDefault"],
        },
      },
    ];

    // ── NPC sprites ──────────────────────────────────────────
    for (const npc of def.npcs) {
      const sprite = this.add.sprite(0, 0, npc.spriteKey);
      this.npcSprites.set(npc.id, sprite);

      const facingDir = stringToDirection(npc.facingDirection);
      this.npcOriginalFacing.set(npc.id, facingDir);

      // Initial flipX for right-facing NPCs
      if (facingDir === Direction.RIGHT) {
        sprite.flipX = true;
      }

      // Cleared autoGive trainers spawn at their aside position so
      // the path stays clear across sessions. The original position
      // is only used before the player has collected from them.
      const spawnPosition =
        npc.autoGive && isTrainerCleared(npc.id)
          ? { ...npc.autoGive.asidePosition }
          : npc.position;

      // Nurse and old_man sprites have fewer than 9 frames —
      // skip walkingAnimationMapping for them to avoid wrong frame refs.
      const isStandardSprite = !["nurse", "old_man"].includes(npc.spriteKey);
      // AutoGive trainers need a non-zero speed so grid-engine can
      // animate the moveTo walk to the aside position after the
      // player collects their item. Non-trainer NPCs stay stationary.
      const npcSpeed = npc.autoGive ? WALK_SPEED : 0;

      characters.push({
        id: npc.id,
        sprite,
        startPosition: spawnPosition,
        speed: npcSpeed,
        offsetY: 0,
        facingDirection: facingDir,
        ...(isStandardSprite && { walkingAnimationMapping: WALK_ANIM }),
        collides: {
          collidesWithTiles: true,
          collisionGroups: ["geDefault"],
        },
      });
    }

    // ── Questionnaire tile icons ─────────────────────────────
    // Render small sprites (e.g. letter on the mart desk) at their
    // tile positions. Uses Y-sorted depth so the player can stand
    // in front of the icon just like any other foreground tile.
    if (def.questionnaireTiles) {
      const TILE = 16;
      for (const q of def.questionnaireTiles) {
        if (!q.iconUrl) continue;
        const texKey = `q_${q.id}`;
        if (!this.textures.exists(texKey)) continue;
        // Center within the tile, with any requested offset.
        const ox = q.iconOffsetX ?? 0;
        const oy = q.iconOffsetY ?? 0;
        const iconSprite = this.add.sprite(
          q.x * TILE + TILE / 2 + ox,
          q.y * TILE + TILE / 2 + oy,
          texKey,
        );
        iconSprite.setOrigin(0.5, 0.5);
        // Scale down to fit inside a single tile — source art is 24×24
        // in the OG but we want it to read clearly on a 16×16 tile, so
        // we clip the outer transparent padding with setDisplaySize.
        iconSprite.setDisplaySize(16, 16);
        // Match the per-tile Y-sort rule (rows 1+): `ty*16 + 2`.
        iconSprite.setDepth(q.y === 0 ? 500 : q.y * 16 + 2);
      }
    }

    // ── Grid Engine ──────────────────────────────────────────
    this.gridEngine.create(map, { characters });

    // ── Gym puzzle initialization ────────────────────────────
    if (def.key === "gym") {
      this.initGymPuzzle();
    }

    // ── Exit warp detection via positionChangeFinished ────────
    // Delay enabling exit detection by 500ms so the player doesn't
    // instantly exit when spawned on the mat tile.
    // Save interior state on every position change (for save/reload).
    //
    // CRITICAL: grid-engine fires positionChangeFinished BEFORE
    // updating the character's tilePos on CHAINED moves (continuous
    // walking). Calling gridEngine.getPosition here would return
    // the OLD tile — so checkGymSwitch would test the tile BEFORE
    // the switch and never see it when the player walks over
    // switches without stopping. Read the destination directly from
    // the event payload's `enterTile` instead.
    this.gridEngine.positionChangeFinished().subscribe(
      ({ charId, enterTile }) => {
        if (charId !== "player") return;
        const pos = { x: enterTile.x, y: enterTile.y };
        const facing = this.gridEngine.getFacingDirection("player");
        saveInteriorState(
          this.interiorKey,
          pos.x,
          pos.y,
          facing,
          this.serializeGymPuzzle(),
        );

        // Bump the step counter so indoor tile crossings count too.
        incrementStep();

        // Gym puzzle: check if player just stepped on a switch
        if (this.interiorKey === "gym") {
          this.checkGymSwitch(pos);
        }
      },
    );

    // Delay enabling exit detection by 500ms so the player doesn't
    // instantly exit when spawned on the mat tile. Same caveat as
    // above: read enterTile from the payload, not getPosition.
    this.time.delayedCall(500, () => {
      this.gridEngine.positionChangeFinished().subscribe(
        ({ charId, enterTile }) => {
          if (charId !== "player") return;
          this.checkExitWarp({ x: enterTile.x, y: enterTile.y });
        },
      );
    });

    // ── Systems ──────────────────────────────────────────────
    this.dialogSystem = new DialogSystem();

    // ── Camera ───────────────────────────────────────────────
    // Interior maps are small — center the whole map on screen.
    // Re-center AND re-zoom on resize so orientation flips (portrait
    // ↔ landscape) pick up the new pixel scale from `getSceneZoom()`.
    this.mapWidthPx = map.widthInPixels;
    this.mapHeightPx = map.heightInPixels;
    this.cameras.main.setZoom(getSceneZoom());
    this.cameras.main.setRoundPixels(true);
    this.centerCamera();
    this.scale.on("resize", () => {
      this.cameras.main.setZoom(getSceneZoom());
      this.centerCamera();
    });

    // ── Debug coords overlay ────────────────────────────────
    this.debugMapW = map.width;
    this.debugMapH = map.height;
    this.debugEnabled = getDebugMode();
    if (this.debugEnabled) this.buildDebugOverlay();
    const unsubDebug = onGameEvent(GameEvents.TOGGLE_DEBUG, (enabled) => {
      this.debugEnabled = !!enabled;
      if (this.debugEnabled) this.buildDebugOverlay();
      else this.destroyDebugOverlay();
    });
    this.events.on("shutdown", () => unsubDebug());

    // ── Input ────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Interaction keys: A, Space, Enter
    for (const code of [
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    ]) {
      this.input.keyboard!.addKey(code).on("down", () => this.handleInteraction());
    }

    // Menu keys: ESC, M
    for (const kc of [Phaser.Input.Keyboard.KeyCodes.ESC, Phaser.Input.Keyboard.KeyCodes.M]) {
      this.input.keyboard!.addKey(kc).on("down", () => {
        if (this.dialogSystem.active || this.isInteracting || this.isExiting) return;
        this.menuActive = true;
        emitGameEvent(GameEvents.SHOW_MENU);
      });
    }
    const unsubMenuClose = onGameEvent(GameEvents.MENU_CLOSE, () => {
      this.menuActive = false;
    });
    this.events.on("shutdown", () => unsubMenuClose());

    // Save interior state immediately on entry
    const entryPos = this.gridEngine.getPosition("player");
    const entryFacing = this.gridEngine.getFacingDirection("player");
    saveInteriorState(
      this.interiorKey,
      entryPos.x,
      entryPos.y,
      entryFacing,
      this.serializeGymPuzzle(),
    );

    // ── BGM ──────────────────────────────────────────────────
    bgm.play(def.music);

    // Start BGM on first user interaction (browser autoplay policy).
    const startBGM = () => {
      bgm.play(def.music);
      window.removeEventListener("keydown", startBGM);
      window.removeEventListener("click", startBGM);
    };
    window.addEventListener("keydown", startBGM);
    window.addEventListener("click", startBGM);

    // ── Fade in ──────────────────────────────────────────────
    this.cameras.main.fadeIn(100, 0, 0, 0);
  }

  update(_time: number, delta: number): void {
    if (this.isExiting) return;

    // ── Gym electric gate animation ──────────────────────────
    // Keep all beams STATIC on frame0. Every 1-5 seconds, pick
    // one random beam and flip ALL its sprites to frame1 for
    // 120ms, then snap back. Whole beams crackle together so
    // it reads as a single spark, not a partial flicker.
    if (this.interiorKey === "gym" && this.gymBeams.length > 0) {
      if (this.gymNextCrackleMs <= 0 && this.gymActiveCrackles.length === 0) {
        this.gymNextCrackleMs = 500;
      }

      this.gymNextCrackleMs -= delta;
      if (this.gymNextCrackleMs <= 0) {
        const beam = this.gymBeams[
          Math.floor(Math.random() * this.gymBeams.length)
        ];
        if (beam && !this.gymActiveCrackles.some((c) => c.beam === beam)) {
          for (const spr of beam) {
            spr.setTexture("gym_top_frame1", spr.frame.name);
          }
          this.gymActiveCrackles.push({ beam, remainingMs: 120 });
        }
        this.gymNextCrackleMs = 1000 + Math.random() * 4000;
      }

      for (let i = this.gymActiveCrackles.length - 1; i >= 0; i--) {
        const c = this.gymActiveCrackles[i];
        c.remainingMs -= delta;
        if (c.remainingMs <= 0) {
          for (const spr of c.beam) {
            spr.setTexture("gym_top_frame0", spr.frame.name);
          }
          this.gymActiveCrackles.splice(i, 1);
        }
      }
    }

    // ── Visual updates (always run) ──────────────────────────
    // Character depth is Y-sorted by the sprite's FOOT position
    // (sprite.y + sprite.height) rather than its top. The player
    // sprite is 16x32 with origin (0,0), so its foot is at
    // sprite.y + 32 — one full tile row below the "head" pixel row.
    // Sorting by the foot keeps the player visually in front of
    // same-row decorations (plant pots, shelves, back-wall items)
    // instead of being covered by them. Tall top-layer tiles at
    // rows above the player still draw above the player because
    // their depth `ty*16 + 2` exceeds the player's foot depth only
    // when `ty > player's foot row`, which doesn't happen for tiles
    // strictly above the character's foot row.
    const facingForFlip = this.gridEngine.getFacingDirection("player");
    this.playerSprite.flipX = facingForFlip === Direction.RIGHT;
    // Y-sort player by sprite foot (matches the original InteriorScene
    // formula that all the non-gym rooms were calibrated against).
    this.playerSprite.setDepth(10 + this.playerSprite.y + this.playerSprite.height);

    // NPC depth — Y-sorted by foot (matches player).
    for (const [id, sprite] of this.npcSprites.entries()) {
      sprite.setDepth(10 + sprite.y + sprite.height);
      const dir = this.gridEngine.getFacingDirection(id);
      sprite.flipX = dir === Direction.RIGHT;
    }

    // Debug overlay
    if (this.debugEnabled) this.updateDebugOverlay();

    // Step counting — interior steps earn currency for the Pokemart.
    {
      const pos = this.gridEngine.getPosition("player");
      if (!this.lastInteriorTile || this.lastInteriorTile.x !== pos.x || this.lastInteriorTile.y !== pos.y) {
        this.lastInteriorTile = { x: pos.x, y: pos.y };
        incrementStep();
      }
    }

    // Block input during dialog or menu
    if (this.dialogSystem.active || this.menuActive) return;

    // No running allowed indoors (OG Emerald behavior)
    if (this.isRunning) {
      this.isRunning = false;
      this.gridEngine.setSpeed("player", WALK_SPEED);
      this.gridEngine.setWalkingAnimationMapping("player", WALK_ANIM);
    }

    // When not moving, force the standing frame (Grid Engine can leave
    // the running frame active when movement stops).
    if (!this.gridEngine.isMoving("player") && !this.blockedDir) {
      const facing = this.gridEngine.getFacingDirection("player");
      const standingFrame =
        facing === Direction.DOWN ? 0 :
        facing === Direction.UP ? 1 :
        2; // left/right both use frame 2 with flipX
      this.playerSprite.setFrame(standingFrame);
    }

    // ── Direction input — keyboard cursors OR touch d-pad flags ──
    const { cursors } = this;
    let moveDir: Direction | null = null;
    if (cursors.left.isDown || touchState.left) moveDir = Direction.LEFT;
    else if (cursors.right.isDown || touchState.right) moveDir = Direction.RIGHT;
    else if (cursors.up.isDown || touchState.up) moveDir = Direction.UP;
    else if (cursors.down.isDown || touchState.down) moveDir = Direction.DOWN;

    if (!moveDir) {
      this.blockedDir = null;
      this.pendingTurnDir = null;
      return;
    }

    // ── Exit check for standing on exit tile ──────────────────
    // If the player is standing on an exit warp tile and presses
    // DOWN (toward the door), trigger the exit even without moving.
    // This handles the case where the player spawns on the mat and
    // immediately wants to leave without first stepping elsewhere.
    if (moveDir === Direction.DOWN) {
      const pos = this.gridEngine.getPosition("player");
      const onExit = this.interiorDef.exitWarpTiles.some(
        (t) => t.x === pos.x && t.y === pos.y,
      );
      if (onExit) {
        this.gridEngine.turnTowards("player", Direction.DOWN);
        this.checkExitWarp();
        return;
      }
    }

    // Gym puzzle: check if target tile is blocked by an active barrier
    const playerPos = this.gridEngine.getPosition("player");
    const targetTile = getTileInDirection(playerPos, moveDir);
    const blockedByBarrier = this.gymBarrierBlocks(targetTile.x, targetTile.y);

    // ── Turn-before-walk (matching OverworldScene) ────────────
    // Case 1: already mid-tap-to-turn for this direction
    if (this.pendingTurnDir === moveDir) {
      if (this.time.now - this.pendingTurnStart >= InteriorScene.TURN_DELAY_MS) {
        // Held long enough — commit to walking (unless barrier blocks)
        this.pendingTurnDir = null;
        if (blockedByBarrier) {
          this.handleBlocked(moveDir, delta);
          return;
        }
        this.gridEngine.move("player", moveDir);
        if (this.gridEngine.isMoving("player")) {
          this.blockedDir = null;
        } else {
          this.handleBlocked(moveDir, delta);
        }
      }
      return;
    }

    // Different direction → drop stale pending turn
    this.pendingTurnDir = null;

    // Case 2: already facing that direction → move immediately
    const facing = this.gridEngine.getFacingDirection("player");
    if (facing === moveDir) {
      if (blockedByBarrier) {
        this.handleBlocked(moveDir, delta);
        return;
      }
      this.gridEngine.move("player", moveDir);
      if (this.gridEngine.isMoving("player")) {
        this.blockedDir = null;
      } else {
        this.handleBlocked(moveDir, delta);
      }
      return;
    }

    // Case 3: facing different direction → just turn, start delay
    this.pendingTurnDir = moveDir;
    this.pendingTurnStart = this.time.now;
    this.gridEngine.turnTowards("player", moveDir);
  }

  // ── Interaction ──────────────────────────────────────────────
  //
  // The priority chain. Each `try*` helper handles one interaction
  // type and returns true if it consumed the A-press.
  //
  // Lock-ownership rule: handlers that open a persistent modal (PC,
  // questionnaire, mart shop) set `this.menuActive = true` and take
  // over responsibility for clearing `this.isInteracting` when the
  // modal closes via its EventBridge event. Synchronous helpers and
  // dialog-based helpers leave `menuActive` false and let the
  // `finally` block below reset the lock.

  private async handleInteraction(): Promise<void> {
    if (this.isInteracting || this.dialogSystem.active || this.isExiting || this.menuActive) return;
    this.isInteracting = true;
    try {
      const playerPos = this.gridEngine.getPosition("player");
      const playerFacing = this.gridEngine.getFacingDirection("player");
      const facingTile = getTileInDirection(playerPos, playerFacing);

      if (await this.tryPCInteraction(facingTile)) return;
      if (await this.tryQuestionnaireInteraction(facingTile)) return;
      if (await this.tryHiddenItem(facingTile)) return;
      if (await this.tryNpcInteraction(facingTile, playerFacing)) return;
    } finally {
      // A modal handler that transferred lock ownership will have
      // set menuActive before returning; its async close handler
      // resets isInteracting. Everything else resets synchronously.
      if (!this.menuActive) this.isInteracting = false;
    }
  }

  /**
   * PC tile (Pokemon Center desk terminal). Plays the OG Pokemon
   * Emerald turn-on flicker — 5 × 100ms toggles of a white overlay
   * on the CRT screen area (source: pokeemerald field_specials.c
   * PCTurnOnEffect) — then fires SHOW_PC on the EventBridge. Takes
   * over the lock until PC_CLOSE fires.
   */
  private async tryPCInteraction(
    facingTile: { x: number; y: number },
  ): Promise<boolean> {
    const pcTiles = this.interiorDef.pcTiles;
    if (!pcTiles) return false;
    const isPC = pcTiles.some(
      (t) => t.x === facingTile.x && t.y === facingTile.y,
    );
    if (!isPC) return false;

    // Transfer lock ownership to the async close handler.
    this.menuActive = true;

    // Screen overlay sits near the top-center of the 16×16 tile.
    const TILE = 16;
    const SCREEN_W = 8;
    const SCREEN_H = 6;
    const pcPixelX = facingTile.x * TILE + (TILE - SCREEN_W) / 2;
    const pcPixelY = facingTile.y * TILE + 3;
    const flickerRect = this.add.rectangle(
      pcPixelX + SCREEN_W / 2,
      pcPixelY + SCREEN_H / 2,
      SCREEN_W,
      SCREEN_H,
      0xffffff,
    );
    flickerRect.setDepth(10000);
    flickerRect.setVisible(false);

    // 5 flickers × 100ms = 500ms total; start OFF, end ON — matches OG.
    let flickerCount = 0;
    sfx.select();
    const flickerTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        flickerRect.setVisible(!flickerRect.visible);
        flickerCount++;
        if (flickerCount >= 5) {
          flickerTimer.remove();
          flickerRect.destroy();
          emitGameEvent(GameEvents.SHOW_PC);
        }
      },
    });

    const unsub = onGameEvent(GameEvents.PC_CLOSE, () => {
      this.isInteracting = false;
      this.menuActive = false;
      unsub();
    });
    return true;
  }

  /**
   * Questionnaire tile (letter on a desk, etc). Interacting fires
   * SHOW_QUESTIONNAIRE with the tile's id; the React UI takes over
   * until the player closes it. Takes over the lock.
   */
  private async tryQuestionnaireInteraction(
    facingTile: { x: number; y: number },
  ): Promise<boolean> {
    const qTiles = this.interiorDef.questionnaireTiles;
    if (!qTiles) return false;
    const q = qTiles.find(
      (t) => t.x === facingTile.x && t.y === facingTile.y,
    );
    if (!q) return false;

    this.menuActive = true;
    sfx.confirm();
    emitGameEvent(GameEvents.SHOW_QUESTIONNAIRE, { id: q.id });
    const unsub = onGameEvent(GameEvents.QUESTIONNAIRE_CLOSE, () => {
      this.isInteracting = false;
      this.menuActive = false;
      unsub();
    });
    return true;
  }

  /**
   * Per-interior-map hidden item lookup. The HiddenItemSystem
   * handles dialog and save-write; we just forward the tile.
   */
  private async tryHiddenItem(
    facingTile: { x: number; y: number },
  ): Promise<boolean> {
    return HiddenItemSystem.tryPickup(
      this.dialogSystem,
      this.interiorKey,
      facingTile.x,
      facingTile.y,
    );
  }

  /**
   * Check every NPC against the two tiles in front of the player
   * (OG behavior — lets you talk to NPCs behind counters/desks).
   * On match, turns the NPC to face the player and dispatches to
   * the correct sub-handler based on the NPC's config.
   */
  private async tryNpcInteraction(
    facingTile: { x: number; y: number },
    playerFacing: Direction,
  ): Promise<boolean> {
    const tilesToCheck = [
      facingTile,
      getTileInDirection(facingTile, playerFacing),
    ];

    for (const checkTile of tilesToCheck) {
      for (const npc of this.interiorDef.npcs) {
        const npcPos = this.gridEngine.getPosition(npc.id);
        if (npcPos.x !== checkTile.x || npcPos.y !== checkTile.y) continue;

        // Turn NPC to face the player.
        const originalDir = this.npcOriginalFacing.get(npc.id)!;
        const faceDir = OPPOSITE[playerFacing];
        this.gridEngine.turnTowards(npc.id, faceDir);
        const sprite = this.npcSprites.get(npc.id);
        if (sprite) sprite.flipX = faceDir === Direction.RIGHT;

        if (npc.autoGive) {
          await this.handleAutoGiveTrainer(npc, sprite, originalDir);
          return true;
        }
        if (npc.shopMenu) {
          this.handleShopNpc(npc, sprite, originalDir);
          return true;
        }
        await this.handleNpcDialog(npc, sprite, originalDir);
        return true;
      }
    }
    return false;
  }

  /**
   * AutoGive trainer flow — first interaction:
   *   1. intro dialog
   *   2. give the configured item (saves + item-get sound + receipt dialog)
   *   3. mark the trainer cleared and re-evaluate badges
   *   4. walk the NPC to `asidePosition` so the path is clear
   *
   * Subsequent interactions just play `clearedDialog` (or a generic
   * fallback) and restore facing.
   */
  private async handleAutoGiveTrainer(
    npc: InteriorNPC,
    sprite: Phaser.GameObjects.Sprite | undefined,
    originalDir: Direction,
  ): Promise<void> {
    const ag = npc.autoGive!;
    if (isTrainerCleared(npc.id)) {
      const lines = ag.clearedDialog ?? [
        "Good luck with the rest",
        "of the GYM!",
      ];
      await this.dialogSystem.showDialog({
        lines,
        speakerName: npc.speakerName,
      });
      // Restore facing on the cleared path only — the first-interaction
      // path hands facing control over to gridEngine.moveTo below.
      this.gridEngine.turnTowards(npc.id, originalDir);
      if (sprite) sprite.flipX = originalDir === Direction.RIGHT;
      return;
    }

    // 1. Intro dialog
    await this.dialogSystem.showDialog({
      lines: npc.dialog,
      speakerName: npc.speakerName,
    });

    // 2. Give the item. The item id comes from ITEM_DEFINITIONS so
    //    name/pocket/description/icon stay in sync with the Bag.
    const def = getItemDef(ag.itemId);
    if (def) {
      giveItem(ag.itemId);
      sfx.pickup();
      await this.dialogSystem.showDialog({
        lines: [
          `Received ${def.name}!`,
          `It was sent to your BAG.`,
        ],
      });
    }

    // 3. Persist cleared state, check gym completion, re-check badges.
    markTrainerCleared(npc.id);
    this.checkGymCompletion();
    checkBadges();

    // 4. Walk to aside position — grid-engine animates using the
    //    NPC's configured WALK_SPEED.
    this.gridEngine.moveTo(npc.id, {
      x: ag.asidePosition.x,
      y: ag.asidePosition.y,
    });
  }

  /**
   * Shop-menu NPC (Pokemart clerk). Opens the MartShopInterface
   * React modal. Transfers lock ownership to the MART_SHOP_CLOSE
   * handler, which restores NPC facing as well.
   */
  private handleShopNpc(
    npc: InteriorNPC,
    sprite: Phaser.GameObjects.Sprite | undefined,
    originalDir: Direction,
  ): void {
    this.menuActive = true;
    sfx.confirm();
    emitGameEvent(GameEvents.SHOW_MART_SHOP);
    const unsub = onGameEvent(GameEvents.MART_SHOP_CLOSE, () => {
      this.gridEngine.turnTowards(npc.id, originalDir);
      if (sprite) sprite.flipX = originalDir === Direction.RIGHT;
      this.isInteracting = false;
      this.menuActive = false;
      unsub();
    });
  }

  /**
   * Normal NPC dialog flow — dynamic dialog (`dialogFn`) overrides
   * static `dialog`. Dynamic dialogs can return an `afterDialog`
   * callback that runs inside the same interaction (e.g. for a
   * follow-up dialog after a reward jingle).
   */
  private async handleNpcDialog(
    npc: InteriorNPC,
    sprite: Phaser.GameObjects.Sprite | undefined,
    originalDir: Direction,
  ): Promise<void> {
    if (npc.dialogFn) {
      const result = await npc.dialogFn(getSave());
      await this.dialogSystem.showDialog({
        lines: result.lines,
        speakerName: result.speakerName ?? npc.speakerName,
      });
      if (result.afterDialog) {
        await result.afterDialog({ dialogSystem: this.dialogSystem });
      }
    } else {
      await this.dialogSystem.showDialog({
        lines: npc.dialog,
        speakerName: npc.speakerName,
      });
    }
    // Restore original facing.
    this.gridEngine.turnTowards(npc.id, originalDir);
    if (sprite) sprite.flipX = originalDir === Direction.RIGHT;
  }

  // ── Exit warp detection ──────────────────────────────────────

  private checkExitWarp(posOverride?: { x: number; y: number }): void {
    if (this.isExiting) return;
    // Prefer the position supplied by the caller (e.g. an enterTile
    // from positionChangeFinished, which is reliable during chained
    // continuous movement — getPosition returns the OLD tile in that
    // case).
    const pos = posOverride ?? this.gridEngine.getPosition("player");
    const facing = this.gridEngine.getFacingDirection("player");
    // Only exit when walking DOWN onto the exit tile (toward the door)
    if (facing !== Direction.DOWN) return;
    const isExit = this.interiorDef.exitWarpTiles.some(
      (t) => t.x === pos.x && t.y === pos.y,
    );
    if (!isExit) return;

    this.isExiting = true;
    sfx.exit();
    bgm.stop();
    clearInteriorState();

    // Instant black screen then switch — no slow fade
    this.cameras.main.setAlpha(0);
    this.scene.start("OverworldScene", {
      returnFromInterior: true,
      returnPos: this.returnPos,
    });
  }

  // ── Blocked walk-in-place (OG Emerald behavior) ──────────────
  //
  // Animation timers + bonk cadence are owned by the shared helper
  // in @/game/utils/sceneHelpers. This wrapper hands over `this` so
  // the helper can mutate the blocked-walk state fields declared
  // above (matching the BlockedWalkState structural interface).

  private handleBlocked(moveDir: Direction, delta: number): void {
    handleBlockedWalk(
      this,
      moveDir,
      delta,
      this.isRunning,
      this.playerSprite,
      this.gridEngine,
      "player",
    );
  }

  // ── Helpers ──────────────────────────────────────────────────

  /** Find the spawn position for this interior based on warp data. */
  private findSpawnPosition(): { tile: { x: number; y: number }; facing: Direction } {
    // 1. Explicit spawn data passed by the caller (highest priority)
    //    — used when freshly warping in from a door.
    if (this.explicitSpawnTile) {
      return {
        tile: this.explicitSpawnTile,
        facing: this.explicitSpawnFacing
          ? stringToDirection(this.explicitSpawnFacing)
          : Direction.UP,
      };
    }

    // 2. Saved interior state (page refresh / session restore).
    //    Only applies when the saved state is for THIS interior.
    const saved = loadInteriorState();
    if (saved && saved.interiorKey === this.interiorKey) {
      return {
        tile: { x: saved.x, y: saved.y },
        facing: stringToDirection(saved.facing),
      };
    }

    // 3. Look up the warp definition for this interior
    const warp = WARPS.find((w) => w.targetMap === this.interiorKey);
    if (warp) {
      return {
        tile: warp.spawnTile,
        facing: stringToDirection(warp.spawnFacing),
      };
    }

    // 3. Fall back to first exit warp tile (player walks in from exit)
    const exit = this.interiorDef.exitWarpTiles[0];
    if (exit) {
      return {
        tile: { x: exit.x, y: exit.y },
        facing: Direction.UP,
      };
    }

    // Ultimate fallback
    return { tile: { x: 0, y: 0 }, facing: Direction.DOWN };
  }

  // getTileInDirection, dirToAnimKey, stringToDirection moved to
  // @/game/utils/sceneHelpers

  // ── Camera centering (works with zoom/resize) ──────────────

  private centerCamera(): void {
    this.cameras.main.centerOn(
      this.mapWidthPx / 2,
      this.mapHeightPx / 2,
    );
  }

  // ── Debug coordinate overlay ───────────────────────────────

  private buildDebugOverlay(): void {
    this.destroyDebugOverlay();
    this.debugContainer = this.add.container(0, 0);
    this.debugContainer.setDepth(100000);
    const TILE = 16;
    for (let ty = 0; ty < this.debugMapH; ty++) {
      for (let tx = 0; tx < this.debugMapW; tx++) {
        if (((tx + ty) & 1) !== 0) continue; // checkerboard
        const label = this.add.text(
          tx * TILE + TILE / 2,
          ty * TILE + TILE / 2,
          `${tx}\n${ty}`,
          {
            fontFamily: "'Pokemon DS', 'Pokemon GB', monospace",
            fontSize: "6px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 2,
            align: "center",
            resolution: 2,
          },
        );
        label.setOrigin(0.5, 0.5);
        label.setAlpha(0.9);
        this.debugContainer.add(label);
        this.debugTexts.push(label);
      }
    }
  }

  private updateDebugOverlay(): void {
    // Interior maps are small — all labels are always visible, no pooling needed.
    // Nothing to update per frame since labels are static positions.
  }

  private destroyDebugOverlay(): void {
    if (this.debugContainer) {
      this.debugContainer.destroy(true);
      this.debugContainer = null;
    }
    this.debugTexts = [];
  }

  // ── Gym puzzle ─────────────────────────────────────────────
  //
  // Replicates the OG Mauville Gym puzzle from pokeemerald
  // (src/field_specials.c MauvilleGymPressSwitch + scripts.inc
  //  EventScript_SetAltBarriers). Stepping on a switch toggles the
  // global barrier state between A (default) and B (alternate).
  // All barriers simultaneously flip their ON/OFF state.

  /**
   * Initialize the gym puzzle. The composed tileset now contains both
   * "On" and "Off" variants of every barrier metatile, so the runtime
   * puzzle state is encoded directly in the tilemap — no side data
   * needed. On every switch press, we walk the puzzle area and swap
   * each barrier tile to its partner (OG MauvilleGymSetDefaultBarriers).
   */
  private initGymPuzzle(): void {
    // If we have a saved puzzle state for this entry (the player
    // refreshed the page mid-puzzle), replay it onto the ground
    // layer BEFORE syncing collision so the player can continue
    // from where they left off instead of getting trapped behind
    // reset beams.
    const saved = loadInteriorState();
    if (
      saved &&
      saved.interiorKey === this.interiorKey &&
      saved.gymPuzzle &&
      this.gymGroundLayer
    ) {
      for (const [key, tileId] of Object.entries(saved.gymPuzzle.tiles)) {
        const [xs, ys] = key.split(",");
        const x = Number(xs);
        const y = Number(ys);
        this.gymGroundLayer.putTileAt(tileId, x, y);
        this.refreshFgSprite(x, y);
      }
      this.gymPressedSwitch = saved.gymPuzzle.pressedSwitch ?? 0;
      // Rebuild beams so the crackle follows the restored state.
      this.rebuildGymBeams();
    }
    // Seed the collision layer so the initial puzzle state is visible
    // to Grid Engine from the first frame.
    this.gymSyncCollision();
  }

  /**
   * Serialize the gym puzzle as a minimal diff from the map.bin
   * default — only positions that currently differ from their
   * initial snapshot. Returns undefined if nothing has changed.
   */
  private serializeGymPuzzle(): GymPuzzleState | undefined {
    if (this.interiorKey !== "gym" || !this.gymGroundLayer) return undefined;
    const tiles: Record<string, number> = {};
    let dirty = false;
    for (const [key, initialIdx] of this.gymPuzzleInitial) {
      const [xs, ys] = key.split(",");
      const t = this.gymGroundLayer.getTileAt(Number(xs), Number(ys));
      if (!t) continue;
      if (t.index !== initialIdx) {
        tiles[key] = t.index;
        dirty = true;
      }
    }
    if (!dirty && this.gymPressedSwitch === 0) return undefined;
    return { pressedSwitch: this.gymPressedSwitch, tiles };
  }

  /**
   * Check if all 6 gym trainers have been cleared. If so, set
   * gymComplete in the save — this is the trigger for the GYM badge.
   * Called after every markTrainerCleared() so the flag flips the
   * moment the last trainer is defeated.
   */
  private checkGymCompletion(): void {
    if (this.interiorKey !== "gym") return;
    const save = getSave();
    if (save.gymComplete) return;
    const gymDef = INTERIORS.gym;
    if (!gymDef) return;
    const trainers = gymDef.npcs.filter((n) => n.autoGive);
    const allCleared = trainers.every((t) => isTrainerCleared(t.id));
    if (allCleared) {
      updateSave({ gymComplete: true });
    }
  }

  private checkGymSwitch(pos: { x: number; y: number }): void {
    // Only trigger on ENTRY to a switch tile, not staying still on it
    const last = this.gymLastPlayerTile;
    if (last && last.x === pos.x && last.y === pos.y) return;
    this.gymLastPlayerTile = { x: pos.x, y: pos.y };

    const sw = GYM_SWITCHES.find((s) => s.x === pos.x && s.y === pos.y);
    if (!sw) return;

    this.pressGymSwitch(sw.id);
  }

  /**
   * Press a switch — replicates the OG sequence from scripts.inc:
   *   goto_if_eq VAR_MAUVILLE_GYM_STATE, <id>, SwitchDoNothing   (no-op if same)
   *   setvar VAR_MAUVILLE_GYM_STATE, <id>
   *   special MauvilleGymSetDefaultBarriers                       (toggle all)
   *   special MauvilleGymPressSwitch                              (update switch visuals)
   *   playse SE_UNLOCK
   */
  private pressGymSwitch(id: number): void {
    if (!this.gymGroundLayer) return;

    // OG: pressing the same switch twice does nothing (guard in
    // scripts.inc). Derive the guard directly from the map state so
    // we never drift out of sync with the ground layer: if the
    // target switch is already showing the PRESSED metatile, skip.
    const sw = GYM_SWITCHES.find((s) => s.id === id);
    if (!sw) return;
    const currentTile = this.gymGroundLayer.getTileAt(sw.x, sw.y);
    if (currentTile?.index === GYM_PRESSED_SWITCH) return;

    this.gymPressedSwitch = id;
    sfx.select(); // placeholder for SE_UNLOCK

    // Implements MauvilleGymSetDefaultBarriers from field_specials.c
    // EXACTLY, using the compact-tile-index mapping from our tileset.
    //
    // Compact tile IDs (from gym-puzzle.ts):
    //   GreenH1_On=28 / Off=44     GreenH2_On=29 / Off=45
    //   GreenH3_On=36 / Off=52     GreenH4_On=37 / Off=53
    //   RedH1_On  =30 / Off=46     RedH2_On  =31 / Off=47
    //   RedH3_On  =38 / Off=54     RedH4_On  =39 / Off=55
    //   GreenV1_On=58    GreenV2_On=65
    //   RedV1_On  =59    RedV2_On  =66
    //   PoleBottom_On=60  PoleBottom_Off=61
    //   PoleTop_On   =71  PoleTop_Off   =72
    //   FloorTile    =24
    const GH1_ON = 28, GH1_OFF = 44;
    const GH2_ON = 29, GH2_OFF = 45;
    const GH3_ON = 36, GH3_OFF = 52;
    const GH4_ON = 37, GH4_OFF = 53;
    const RH1_ON = 30, RH1_OFF = 46;
    const RH2_ON = 31, RH2_OFF = 47;
    const RH3_ON = 38, RH3_OFF = 54;
    const RH4_ON = 39, RH4_OFF = 55;
    const GV1_ON = 58, GV2_ON = 65;
    const RV1_ON = 59, RV2_ON = 66;
    const POLE_B_ON = 60, POLE_B_OFF = 61;
    const POLE_T_ON = 71, POLE_T_OFF = 72;
    const FLOOR = 24;

    // Iterate the puzzle area row-major and read tiles LIVE from the
    // layer — matching OG MauvilleGymSetDefaultBarriers exactly. The
    // FloorTile case reads (y-1), which by the time we process row y
    // has ALREADY been transformed in the previous y iteration. A
    // snapshot-based read would leave row y-1 in its pre-transform
    // state and produce mismatched beam colors (e.g. GV1_On above
    // RV2_On) on the second toggle of a vertical beam pair.
    const layer = this.gymGroundLayer;
    const { x0, x1, y0, y1 } = GYM_PUZZLE_BOUNDS;
    const liveAt = (x: number, y: number): number => {
      const t = layer.getTileAt(x, y);
      return t ? t.index : -1;
    };

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const cur = liveAt(x, y);
        let next = -1;
        switch (cur) {
          case GH1_ON: next = GH1_OFF; break;
          case GH2_ON: next = GH2_OFF; break;
          case GH3_ON: next = GH3_OFF; break;
          case GH4_ON: next = GH4_OFF; break;
          case GH1_OFF: next = GH1_ON; break;
          case GH2_OFF: next = GH2_ON; break;
          case GH3_OFF: next = GH3_ON; break;
          case GH4_OFF: next = GH4_ON; break;

          case RH1_ON: next = RH1_OFF; break;
          case RH2_ON: next = RH2_OFF; break;
          case RH3_ON: next = RH3_OFF; break;
          case RH4_ON: next = RH4_OFF; break;
          case RH1_OFF: next = RH1_ON; break;
          case RH2_OFF: next = RH2_ON; break;
          case RH3_OFF: next = RH3_ON; break;
          case RH4_OFF: next = RH4_ON; break;

          // Vertical beams: V1 On → PoleBottom (still blocked)
          //                 V2 On → FloorTile (now walkable)
          //                 RedV1 → PoleBottom_Off
          //                 RedV2 → FloorTile
          case GV1_ON: next = POLE_B_ON; break;
          case RV1_ON: next = POLE_B_OFF; break;
          case GV2_ON: next = FLOOR; break;
          case RV2_ON: next = FLOOR; break;

          // Poles swap with beams
          case POLE_B_ON:  next = GV1_ON; break;
          case POLE_B_OFF: next = RV1_ON; break;
          case POLE_T_OFF: next = POLE_T_ON; break;
          case POLE_T_ON:  next = POLE_T_OFF; break;

          // FloorTile → V2 beam. OG unconditionally transforms every
          // FloorTile metatile in the puzzle zone: Green if the tile
          // above is GreenBeamV1_On, otherwise Red. There's no "leave
          // the walkable floor alone" branch — the walkable gym floor
          // uses a DIFFERENT metatile (0x20a), so FloorTile (0x21a)
          // only appears at V2 barrier positions.
          //
          // Crucially, we read (y-1) LIVE, not from a snapshot. OG
          // iterates row-major, so by the time we process row y the
          // tile at (x, y-1) has already been transformed — a
          // PoleBottom_On above has just become GV1_On, so the
          // FloorTile below correctly picks the Green variant. The
          // snapshot approach would see the stale PoleBottom_On and
          // pick Red, leaving a mismatched-color vertical beam.
          case FLOOR: {
            const above = liveAt(x, y - 1);
            next = above === GV1_ON ? GV2_ON : RV2_ON;
            break;
          }
        }
        if (next !== -1 && next !== cur) {
          layer.putTileAt(next, x, y);
          this.refreshFgSprite(x, y);
        }
      }
    }

    // Update switch visuals: pressed one → Pressed, others → Raised.
    for (const sw of GYM_SWITCHES) {
      const tileId = sw.id === id ? GYM_PRESSED_SWITCH : GYM_RAISED_SWITCH;
      layer.putTileAt(tileId, sw.x, sw.y);
      this.refreshFgSprite(sw.x, sw.y);
    }

    // Sync collision layer so Grid Engine sees the new blocking state.
    this.gymSyncCollision();

    // Rebuild the beam groups so the crackle animation follows the
    // newly-visible beams, not the pre-press set.
    this.rebuildGymBeams();

    // Persist the new puzzle state immediately so a page refresh
    // right after a press keeps the player in the same state. The
    // next positionChangeFinished would also save, but the player
    // might refresh before taking another step.
    const pos = this.gridEngine.getPosition("player");
    const facing = this.gridEngine.getFacingDirection("player");
    saveInteriorState(
      this.interiorKey,
      pos.x,
      pos.y,
      facing,
      this.serializeGymPuzzle(),
    );
  }

  /**
   * Rebuild the beam groups used by the crackle animation. Walks the
   * current Ground layer for tiles in GYM_ANIMATED_TILE_IDS and groups
   * adjacent (4-connected) foreground sprites into one "beam". Must be
   * called after every puzzle transform so the crackle follows the
   * currently-visible beams, not the map.bin initial set.
   */
  private rebuildGymBeams(): void {
    this.gymBeams = [];
    this.gymActiveCrackles = [];
    if (!this.gymGroundLayer) return;
    const w = this.gymGroundLayer.tilemap.width;
    const h = this.gymGroundLayer.tilemap.height;
    const animated = new Map<string, Phaser.GameObjects.Sprite>();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = this.gymGroundLayer.getTileAt(x, y);
        if (!t) continue;
        if (!InteriorScene.GYM_ANIMATED_TILE_IDS.has(t.index)) continue;
        const sprite = this.gymFgSprites.get(`${x},${y}`);
        if (sprite) animated.set(`${x},${y}`, sprite);
      }
    }
    const visited = new Set<string>();
    for (const [startKey] of animated) {
      if (visited.has(startKey)) continue;
      const beam: Phaser.GameObjects.Sprite[] = [];
      const queue = [startKey];
      visited.add(startKey);
      while (queue.length > 0) {
        const key = queue.shift()!;
        const sprite = animated.get(key);
        if (!sprite) continue;
        beam.push(sprite);
        const [xs, ys] = key.split(",");
        const cx = parseInt(xs, 10);
        const cy = parseInt(ys, 10);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nKey = `${cx + dx},${cy + dy}`;
          if (!visited.has(nKey) && animated.has(nKey)) {
            visited.add(nKey);
            queue.push(nKey);
          }
        }
      }
      if (beam.length > 0) this.gymBeams.push(beam);
    }
  }

  /**
   * Re-point the foreground sprite at (x, y) at its current Ground
   * tile's top-layer frame, and update its depth from layerType. Used
   * after any runtime putTileAt so switches, beams, and poles visually
   * reflect the new puzzle state.
   */
  private refreshFgSprite(x: number, y: number): void {
    const sprite = this.gymFgSprites.get(`${x},${y}`);
    const ctx = this.gymFgFrameCtx;
    if (!sprite || !ctx || !this.gymGroundLayer) return;
    const tile = this.gymGroundLayer.getTileAt(x, y);
    if (!tile) {
      sprite.setVisible(false);
      return;
    }
    const tileIdx = tile.index - 1;
    const frameKey = `${ctx.topKey}_${tileIdx}`;
    // Lazily extract a frame for this tile index the first time we
    // see it — AND make sure the frame exists on every texture the
    // sprite can be reassigned to (base + frame0 + frame1). The
    // crackle animation will later do
    //   spr.setTexture("gym_top_frame1", spr.frame.name)
    // so if frame1 doesn't have the new frame Phaser falls back to
    // the sprite's prior frame, leaving a stale beam fragment.
    // Each texture is checked independently so we mirror the frame
    // even when the base texture already has it from init.
    const srcCol = tileIdx % ctx.cols;
    const srcRow = Math.floor(tileIdx / ctx.cols);
    const srcX = ctx.margin + srcCol * (ctx.tileW + ctx.spacing);
    const srcY = ctx.margin + srcRow * (ctx.tileH + ctx.spacing);
    for (const key of [ctx.topKey, "gym_top_frame0", "gym_top_frame1"]) {
      const t = this.textures.get(key);
      if (t && !t.has(frameKey)) {
        t.add(frameKey, 0, srcX, srcY, ctx.tileW, ctx.tileH);
      }
    }
    sprite.setTexture(ctx.topKey, frameKey);
    // Gym switches: fully hide the "S" decoration when pressed so the
    // feedback is unmistakable. The Ground layer (which only holds
    // plain floor pixels for the pressed metatile) shows through.
    // When the puzzle resets the tile the sprite becomes visible
    // again with the raised frame.
    const isPressedSwitch = tile.index === GYM_PRESSED_SWITCH;
    sprite.setVisible(!isPressedSwitch);
    const layerType = ctx.layerTypeByTileIdx.get(tileIdx) ?? 0;
    sprite.setDepth(layerType === 1 ? 1 : 5000);
  }

  /**
   * Sync the collision layer to match the current ground layer at
   * every tracked puzzle position. Static walls and decorations in
   * the puzzle bounding box retain their baked-in collision because
   * they were never added to gymPuzzlePositions.
   */
  private gymSyncCollision(): void {
    if (!this.gymGroundLayer || !this.gymCollisionLayer) return;
    for (const key of this.gymPuzzlePositions) {
      const [xs, ys] = key.split(",");
      const x = Number(xs);
      const y = Number(ys);
      const ground = this.gymGroundLayer.getTileAt(x, y);
      const isBlock =
        !!ground && GYM_BLOCKING_TILES.has(ground.index);
      if (isBlock) {
        const t = this.gymCollisionLayer.putTileAt(1, x, y);
        if (t) {
          t.properties = { ...(t.properties ?? {}), ge_collide: true };
        }
      } else {
        this.gymCollisionLayer.removeTileAt(x, y);
      }
    }
    // Rebuild Grid Engine's tile collision cache for the puzzle area.
    const { x0, x1, y0, y1 } = GYM_PUZZLE_BOUNDS;
    try {
      this.gridEngine.rebuildTileCollisionCache(
        x0, y0, x1 - x0, y1 - y0,
      );
    } catch {
      // Fallback: runtime check in gymBarrierBlocks() still handles it.
    }
  }

  /**
   * Check if moving into (x, y) is blocked by a currently-active barrier.
   * Reads the tile directly from the tilemap to match whatever the
   * current puzzle state has.
   */
  gymBarrierBlocks(x: number, y: number): boolean {
    if (this.interiorKey !== "gym") return false;
    if (!this.gymGroundLayer) return false;
    const tile = this.gymGroundLayer.getTileAt(x, y);
    if (!tile) return false;
    return GYM_BLOCKING_TILES.has(tile.index);
  }

  shutdown(): void {
    this.dialogSystem?.destroy();
    this.destroyDebugOverlay();
    this.npcSprites.clear();
    this.npcOriginalFacing.clear();
    this.gymBeams = [];
    this.gymNextCrackleMs = 0;
    this.gymActiveCrackles = [];
  }
}
