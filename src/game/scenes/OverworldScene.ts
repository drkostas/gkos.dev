import Phaser from "phaser";
import { Direction } from "grid-engine";
import type GridEngine from "grid-engine";
import { DialogSystem } from "@/game/systems/DialogSystem";
import { NPCSystem } from "@/game/systems/NPCSystem";
import { SignSystem } from "@/game/systems/SignSystem";
import { HiddenItemSystem } from "@/game/systems/HiddenItemSystem";
import { incrementStep } from "@/game/systems/StepStore";
import { MAUVILLE_NPCS, MAUVILLE_SIGNS } from "@/game/data/npcs";
import { MAUVILLE_OBSTRUCTIVE, isObstructiveBlocked } from "@/game/data/obstructive-tiles";
import { GameEvents, emitGameEvent, onGameEvent, getDebugMode } from "@/game/EventBridge";
import { checkStepTMs, getPendingAward, clearPendingAward } from "@/game/systems/StepMilestones";
import { checkBadges, getPendingBadgeNotification, clearPendingBadgeNotification } from "@/game/systems/BadgeMilestones";
import { markZoneVisited, giveItem, hasItem } from "@/game/systems/GameSave";
import { shouldAwardResearchLog } from "@/game/data/researchLog";
import { PIXEL_SCALE } from "@/game/config";
import { sfx } from "@/game/systems/SoundManager";
import { bgm } from "@/game/systems/BGMManager";
import { MapNamePopup } from "@/game/systems/MapNamePopup";
import { getZoneAt, type ZoneDef } from "@/game/data/zones";
import { findWarp, getTargetTile, type Warp } from "@/game/data/warps";

/**
 * 9-frame spritesheet walking animation mapping.
 * Original pret layout: 144x32 = 9 frames of 16x32 in a row.
 * Frames 0-2: down, 3-5: up, 6-8: left. Right = flipped left.
 */
/**
 * Walking animation mapping derived from the ORIGINAL pokeemerald source code.
 * (src/data/object_events/object_event_anims.h)
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
const WALK_ANIM = {
  down:  { leftFoot: 3, standing: 0, rightFoot: 4 },
  up:    { leftFoot: 5, standing: 1, rightFoot: 6 },
  left:  { leftFoot: 7, standing: 2, rightFoot: 8 },
  right: { leftFoot: 7, standing: 2, rightFoot: 8 },
};

/** Running uses the same layout but offset by 9 (frames 9-17 from running.png). */
const RUN_ANIM = {
  down:  { leftFoot: 12, standing: 9,  rightFoot: 13 },
  up:    { leftFoot: 14, standing: 10, rightFoot: 15 },
  left:  { leftFoot: 16, standing: 11, rightFoot: 17 },
  right: { leftFoot: 16, standing: 11, rightFoot: 17 },
};

/** Ledge map: tile key "x,y" → direction the player must be moving to hop off it. */
type LedgeDir = "up" | "down" | "left" | "right";

/**
 * Pokemon Emerald's exact Y offset table for JUMP_TYPE_HIGH, used for
 * ledge hops over JUMP_DISTANCE_FAR (2 tiles). 16 frames; the original
 * runs at 32 frames (60fps) → 16 indexed via `timer >> 1` for distance=FAR.
 *
 * Source: pokeemerald/src/event_object_movement.c sJumpY_High[]
 */
const POKEMON_JUMP_Y_HIGH = [
  -4, -6, -8, -10, -11, -12, -12, -12,
  -11, -10, -9, -8, -6, -4, 0, 0,
];

export class OverworldScene extends Phaser.Scene {
  declare gridEngine: GridEngine;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private dialogSystem!: DialogSystem;
  private npcSystem!: NPCSystem;
  private signSystem!: SignSystem;
  private isInteracting = false;
  private menuActive = false;
  private isRunning = false;
  /** True while fading out for a warp transition (prevents double-trigger). */
  private isTransitioning = false;
  private unsubMenuClose: (() => void) | null = null;
  /** Map of "x,y" → ledge direction. Built from /game/maps/ledges.json. */
  private ledges: Map<string, LedgeDir> = new Map();
  /** True while the player is mid-hop over a ledge. */
  private isLedgeHopping = false;
  /** When the current ledge hop started (ms, scene time). */
  private hopStartTime = 0;
  /** Total duration of the current ledge hop in ms. */
  private hopDurationMs = 0;
  /** Subscription to Grid Engine movementStopped while chaining hop moves. */
  private hopMoveSub: { unsubscribe: () => void } | null = null;
  /**
   * Tap-to-turn state. When the player presses an arrow key while NOT
   * facing that direction, we first turn the character (one frame) and
   * record the moment of the press. Only after `TURN_DELAY_MS` of
   * continuous hold do we actually start moving — matching the original
   * Pokemon games where a brief tap just turns and a hold walks. While
   * running (Shift held), this delay is bypassed entirely.
   */
  private pendingTurnDir: Direction | null = null;
  private pendingTurnStart = 0;
  private static readonly TURN_DELAY_MS = 130; // ~8 frames @ 60fps
  /**
   * Blocked walk-in-place state (OG Emerald behavior).
   * When holding into a wall, the character plays walk animation at step
   * rate and bonks once per step cycle — matching the original game.
   */
  private blockedDir: Direction | null = null;
  private blockedStepTimer = 0;
  private blockedFootToggle = false; // false=leftFoot, true=rightFoot
  /**
   * Invisible target the camera follows. We sync it to the player's
   * BASE position (without the ledge-hop Y arc) so the camera doesn't
   * bounce vertically while the player visually arcs in place.
   */
  private cameraTarget!: Phaser.GameObjects.Zone;
  /** Set of "x,y" keys for grass tiles (triggers a rustle animation). */
  private grassTiles: Set<string> = new Set();
  /** Player's previous tile so we can detect when they step onto a new grass tile. */
  private lastPlayerTile: { x: number; y: number } | null = null;
  /** Debug overlay state + objects (pool that follows the camera). */
  private debugEnabled = false;
  private debugContainer: Phaser.GameObjects.Container | null = null;
  private debugTexts: Phaser.GameObjects.Text[] = [];
  private debugMapWidth = 0;
  private debugMapHeight = 0;
  /** How many tiles around the player to label (radius).
   *  With every-other-tile pattern, we render radius^2 labels = 400.
   */
  private static readonly DEBUG_VIEW_RADIUS = 20;
  /** Per-obstructive-tile overlay sprites that only show when a character stands on them. */

  private static readonly WALK_SPEED = 4;
  private static readonly RUN_SPEED = 8;

  constructor() {
    super({ key: "OverworldScene" });
  }

  create(): void {
    // ── Load ledge data (async, but kick off early) ─────────
    // ledges.json is generated by compose-metatiles.mjs and lists
    // every tile whose metatile has a MB_JUMP_* behavior.
    fetch("/game/maps/ledges.json")
      .then((r) => r.json())
      .then((data: { x: number; y: number; direction: LedgeDir }[]) => {
        for (const l of data) {
          this.ledges.set(`${l.x},${l.y}`, l.direction);
        }
      })
      .catch(() => { /* no ledges, fine */ });

    // ── Load grass data (tall/long/short grass tiles) ───────
    // Used to play a rustle animation when the player steps onto one.
    fetch("/game/maps/grass.json")
      .then((r) => r.json())
      .then((data: { x: number; y: number }[]) => {
        for (const g of data) this.grassTiles.add(`${g.x},${g.y}`);
      })
      .catch(() => { /* no grass, fine */ });

    // ── Tilemap (ground layer only) ─────────────────────────
    const map = this.make.tilemap({ key: "mauville" });
    const bottomTileset = map.addTilesetImage("mauville_bottom", "mauville_bottom");

    if (!bottomTileset) {
      throw new Error("Failed to add tileset 'mauville_bottom'");
    }

    // Ground layer — renders below everything
    const groundLayer = map.createLayer("Ground", bottomTileset);
    if (groundLayer) groundLayer.setDepth(0);

    // Collision layer — hidden, Grid Engine reads ge_collide from tileset tiles
    const collisionLayer = map.createLayer("Collision", bottomTileset);
    if (collisionLayer) collisionLayer.setVisible(false);

    // We DON'T create the "Above" tilemap layer — instead we use a single
    // foreground image (see below). This avoids per-tile depth issues.

    // ── Player sprite ────────────────────────────────────────
    this.playerSprite = this.add.sprite(0, 0, "player");

    // ── Grid Engine ──────────────────────────────────────────
    // Check if we're returning from an interior scene — if so, the
    // return position overrides the localStorage-saved position.
    const sceneData = this.scene.settings.data as {
      returnFromInterior?: boolean;
      returnPos?: { x: number; y: number; facing: string };
    } | undefined;
    const returningFromInterior = sceneData?.returnFromInterior && sceneData?.returnPos;

    let startPosition: { x: number; y: number };
    let startFacing: Direction;

    if (returningFromInterior) {
      const rp = sceneData!.returnPos!;
      startPosition = { x: rp.x, y: rp.y };
      startFacing = Direction.DOWN; // Always face down when exiting a building
    } else {
      // Restore the player's last saved position + facing from localStorage
      // so a refresh drops them where they were, looking the same way.
      const saved = this.loadPlayerState();
      startPosition = saved ? { x: saved.x, y: saved.y } : { x: 72, y: 58 };
      startFacing = saved?.facing ?? Direction.DOWN;
    }

    // Reset transition flag for this fresh create() call.
    this.isTransitioning = false;

    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: this.playerSprite,
          walkingAnimationMapping: WALK_ANIM,
          startPosition,
          facingDirection: startFacing,
          speed: OverworldScene.WALK_SPEED,
          offsetY: 0,
          // Explicit collision groups so the player collides with
          // tiles AND with NPCs that share the geDefault group.
          collides: {
            collidesWithTiles: true,
            collisionGroups: ["geDefault"],
          },
        },
      ],
    });

    // Auto-save the player's tile position + facing whenever it changes.
    // Also bump the step counter so the Trainer Card's STEPS field
    // reflects every tile crossed on the overworld.
    //
    // CRITICAL: grid-engine fires positionChangeFinished BEFORE
    // updating tilePos on chained moves (continuous walking), so
    // gridEngine.getPosition() returns the OLD tile here. Use the
    // event payload's enterTile for the destination.
    this.gridEngine.positionChangeFinished().subscribe(
      ({ charId, enterTile }) => {
        if (charId !== "player") return;
        this.savePlayerState({ x: enterTile.x, y: enterTile.y });
        incrementStep();
      },
    );
    // Also save when the player just turns without moving (e.g. wall-bonk).
    this.gridEngine.directionChanged().subscribe(({ charId }) => {
      if (charId !== "player") return;
      this.savePlayerState();
    });

    // NOTE: directionChanged() observable is unreliable (doesn't fire consistently).
    // flipX is handled per-frame in update() instead.

    // Intercept movement to block obstructive-tile crossings.
    // positionChangeStarted fires just as the tile transition begins.
    // If the move crosses a blocked edge, stop movement AND snap the
    // character back to the exit tile so the in-progress move is cancelled.
    this.gridEngine.positionChangeStarted().subscribe(({ charId, enterTile, exitTile }) => {
      if (charId !== "player") return;
      // Don't interrupt ledge hops with obstructive checks
      if (this.isLedgeHopping) return;
      const dx = enterTile.x - exitTile.x;
      const dy = enterTile.y - exitTile.y;
      let dir: Direction;
      if (dy < 0) dir = Direction.UP;
      else if (dy > 0) dir = Direction.DOWN;
      else if (dx < 0) dir = Direction.LEFT;
      else if (dx > 0) dir = Direction.RIGHT;
      else return;

      if (isObstructiveBlocked(exitTile.x, exitTile.y, enterTile.x, enterTile.y, dir, MAUVILLE_OBSTRUCTIVE)) {
        this.gridEngine.stopMovement("player");
        // Snap back to the tile the player was leaving.
        this.gridEngine.setPosition("player", exitTile);
      }
    });

    // ── Systems ──────────────────────────────────────────────
    this.dialogSystem = new DialogSystem();
    this.npcSystem = new NPCSystem(this, this.gridEngine, this.dialogSystem, MAUVILLE_NPCS);
    this.npcSystem.init();
    this.signSystem = new SignSystem(this.dialogSystem, MAUVILLE_SIGNS);

    // ── Zone system (music + map name popup) ────────────────
    this.mapNamePopup = new MapNamePopup(this);
    // Initialize current zone from player start position
    const startPos = this.gridEngine.getPosition("player");
    this.currentZone = getZoneAt(startPos.x, startPos.y);
    if (this.currentZone) {
      bgm.play(this.currentZone.music);
      // Show popup after a short delay so camera is positioned
      const zone = this.currentZone;
      this.time.delayedCall(200, () => {
        this.showZonePopup(zone.name, zone.popupTheme);
      });
    }

    // ── OG tile animations (water) ──────────────────────────
    // Phaser parses Tiled animation metadata but doesn't auto-play it.
    // We manually cycle tile indices on the ground layer.
    this.startTileAnimations(groundLayer);

    // ── Per-tile foreground sprites (pseudo-3D) ───────────────
    // Instead of a single flat foreground image, we create individual
    // sprites for each 16x16 tile that has top-layer content.
    // Each sprite gets Y-sorted depth so tiles ABOVE the player
    // render in front, and tiles BELOW render behind.
    // This matches the OG GBA hardware layer behavior.
    this.createForegroundTiles();

    // Dynamic overlays for obstructive tiles (signs, etc.) — shown
    // only when a character stands ON them, so the tile's graphic
    // renders IN FRONT of the character.
    this.createObstructiveOverlays();

    // ── Camera ───────────────────────────────────────────────
    // Pixel-perfect integer zoom. Tiles render at PIXEL_SCALE * 16 screen pixels.
    // We follow an invisible Zone instead of the player sprite directly so
    // we can keep the camera off the Y arc during ledge hops.
    this.cameraTarget = this.add.zone(0, 0, 1, 1);
    this.cameras.main.setZoom(PIXEL_SCALE);
    this.cameras.main.startFollow(this.cameraTarget, true);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setRoundPixels(true);

    // ── Input ────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // A button: A key, Space, Enter
    for (const code of [Phaser.Input.Keyboard.KeyCodes.A, Phaser.Input.Keyboard.KeyCodes.SPACE, Phaser.Input.Keyboard.KeyCodes.ENTER]) {
      this.input.keyboard!.addKey(code).on("down", () => this.handleInteraction());
    }

    // Start button: Escape or M — opens menu if closed, closes if open
    for (const kc of [Phaser.Input.Keyboard.KeyCodes.ESC, Phaser.Input.Keyboard.KeyCodes.M]) {
      this.input.keyboard!.addKey(kc).on("down", () => {
        if (this.dialogSystem.active) return;
        if (this.menuActive) {
          // Close the menu
          emitGameEvent(GameEvents.MENU_CLOSE);
          return;
        }
        this.menuActive = true;
        this.npcSystem.paused = true;
        emitGameEvent(GameEvents.SHOW_MENU);
      });
    }

    this.unsubMenuClose = onGameEvent(GameEvents.MENU_CLOSE, () => {
      this.menuActive = false;
      this.npcSystem.paused = false;
    });

    // BGM is started by PhaserGame.tsx on first user gesture (audio unlock).
    // OverworldScene only handles zone-based track switching during gameplay.

    // ── Return-from-interior: quick fade in ─────────────────────
    // Exit SFX already played by InteriorScene before transitioning.
    if (returningFromInterior) {
      this.cameras.main.fadeIn(150, 0, 0, 0);
    }

    // ── Debug overlay: tile coordinate labels ──────────────────
    this.debugMapWidth = map.width;
    this.debugMapHeight = map.height;
    this.debugEnabled = getDebugMode();
    if (this.debugEnabled) this.buildDebugOverlay();
    onGameEvent(GameEvents.TOGGLE_DEBUG, (enabled) => {
      this.debugEnabled = !!enabled;
      if (this.debugEnabled) this.buildDebugOverlay();
      else this.destroyDebugOverlay();
    });
  }

  /**
   * Build a pool of coordinate labels that cover a 2*RADIUS × 2*RADIUS
   * tile window around the player. Labels are drawn in a checkerboard
   * pattern (only tiles where x+y is even), with the coordinate split
   * across two lines ("x" on top, "y" on bottom) so the text stays
   * confined to its own 16×16 tile and never overlaps neighbors.
   */
  private buildDebugOverlay(): void {
    this.destroyDebugOverlay();
    this.debugContainer = this.add.container(0, 0);
    this.debugContainer.setDepth(100000);
    // Half the tiles of a (2*radius)^2 window → checkerboard.
    const radius = OverworldScene.DEBUG_VIEW_RADIUS;
    const count = Math.ceil((2 * radius) * (2 * radius) / 2);
    for (let i = 0; i < count; i++) {
      const label = this.add.text(0, 0, "", {
        fontFamily: "'Pokemon Emerald Pro', 'Pokemon DS', monospace",
        fontSize: "6px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
        align: "center",
        resolution: 2,
      });
      label.setOrigin(0.5, 0.5);
      label.setAlpha(0.9);
      this.debugContainer.add(label);
      this.debugTexts.push(label);
    }
    this.updateDebugOverlay();
  }

  /**
   * Reposition pooled labels to the current player-centered window.
   * Labels only render on tiles where (x+y) is even, giving a
   * checkerboard pattern (equivalent of the "white" squares).
   */
  private updateDebugOverlay(): void {
    if (!this.debugEnabled || this.debugTexts.length === 0) return;
    const TILE = 16;
    const radius = OverworldScene.DEBUG_VIEW_RADIUS;
    const p = this.gridEngine.getPosition("player");

    let idx = 0;
    for (let dy = -radius; dy < radius; dy++) {
      for (let dx = -radius; dx < radius; dx++) {
        const tx = p.x + dx;
        const ty = p.y + dy;
        // Checkerboard: only label every other tile (the "white" squares).
        if (((tx + ty) & 1) !== 0) continue;
        if (idx >= this.debugTexts.length) break;
        const label = this.debugTexts[idx++];
        if (tx < 0 || ty < 0 || tx >= this.debugMapWidth || ty >= this.debugMapHeight) {
          label.setVisible(false);
          continue;
        }
        label.setVisible(true);
        // Two-line format keeps each label inside its 16×16 tile.
        label.setText(`${tx}\n${ty}`);
        label.setPosition(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
      }
    }
    for (; idx < this.debugTexts.length; idx++) {
      this.debugTexts[idx].setVisible(false);
    }
  }

  /** Destroy all debug overlay objects. */
  private destroyDebugOverlay(): void {
    if (this.debugContainer) {
      this.debugContainer.destroy(true);
      this.debugContainer = null;
    }
    this.debugTexts = [];
  }

  update(_time: number, delta: number): void {
    // Visual updates run every frame, even during dialog/menu,
    // so depth sorting and overlays stay in sync.
    const facingForFlip = this.gridEngine.getFacingDirection("player");
    this.playerSprite.flipX = facingForFlip === Direction.RIGHT;
    this.playerSprite.setDepth(10 + this.playerSprite.y);
    this.npcSystem.updateDepth();
    this.updateObstructiveOverlays();

    // Sync the camera target to the player's BASE position (before any
    // ledge-hop arc offset) so the camera doesn't bounce vertically.
    // For lateral hops this keeps Y completely stable; for vertical
    // hops the camera still tracks the actual tile-to-tile motion.
    this.cameraTarget.setPosition(this.playerSprite.x, this.playerSprite.y);

    // Ledge-hop arc: while the player is mid-hop, add Pokemon Emerald's
    // exact Y offset table on top of Grid Engine's interpolated sprite
    // position. The 16-entry table is sampled by progress (0..1).
    if (this.isLedgeHopping) {
      const elapsed = this.time.now - this.hopStartTime;
      const t = Math.min(elapsed / this.hopDurationMs, 0.999);
      const idx = Math.floor(t * POKEMON_JUMP_Y_HIGH.length);
      this.playerSprite.y += POKEMON_JUMP_Y_HIGH[idx];
    }

    // Grass rustle: if the player just stepped onto a new grass tile,
    // play a quick bounce animation on the sprite.
    if (!this.isLedgeHopping) {
      const pos = this.gridEngine.getPosition("player");
      if (!this.lastPlayerTile || this.lastPlayerTile.x !== pos.x || this.lastPlayerTile.y !== pos.y) {
        this.lastPlayerTile = { x: pos.x, y: pos.y };
        if (this.grassTiles.has(`${pos.x},${pos.y}`)) {
          this.playGrassRustle();
        }
        // Zone transition: music change + map name popup
        this.checkZoneTransition(pos.x, pos.y);
        // Reposition debug overlay around the player on every tile step.
        if (this.debugEnabled) this.updateDebugOverlay();
        // Step milestone tracking
        const { total } = incrementStep();
        checkStepTMs(total);
      }
    }

    // Block input/movement while dialog, menu, or warp transition is active.
    if (this.dialogSystem.active || this.menuActive || this.isTransitioning) return;

    // Show pending TM award — freeze immediately, announce, then give TM
    const award = getPendingAward();
    if (award && !this.isInteracting) {
      clearPendingAward();
      this.isInteracting = true;
      (async () => {
        // 1. Milestone announcement
        await this.dialogSystem.showDialog({
          lines: [
            `${award.steps}-step milestone reached!`,
          ],
        });
        // 2. TM received — play the OG TM jingle while the reward
        //    dialog is up, and hold the conversation open until
        //    BOTH the jingle has finished AND the player dismisses
        //    the dialog (matching OG behavior).
        await Promise.all([
          sfx.tmGetAsync(),
          this.dialogSystem.showDialog({
            lines: [
              `Received TM:${award.tm}!`,
              `${award.description}`,
            ],
          }),
        ]);
        this.isInteracting = false;
      })();
      return;
    }

    // Show pending badge notification
    const badgeNote = getPendingBadgeNotification();
    if (badgeNote && !this.isInteracting) {
      clearPendingBadgeNotification();
      this.isInteracting = true;
      this.dialogSystem.showDialog({
        lines: [
          `${badgeNote.name} BADGE milestone!`,
          `Visit KOSTAS at the GYM!`,
        ],
      }).then(() => {
        this.isInteracting = false;
      });
      return;
    }

    // Auto-award research log at 5 discoveries
    if (!hasItem("key_research_log") && shouldAwardResearchLog() && !this.isInteracting) {
      giveItem("key_research_log");
      this.isInteracting = true;
      sfx.pickup();
      this.dialogSystem.showDialog({
        lines: [
          "Obtained RESEARCH LOG!",
          "A journal with personal entries.",
          "Check KEY ITEMS in your BAG!",
        ],
      }).then(() => {
        this.isInteracting = false;
      });
      return;
    }

    // Hold Shift to run — swap speed AND running animation mapping.
    const wantsRun = this.shiftKey.isDown;
    if (wantsRun !== this.isRunning) {
      this.isRunning = wantsRun;
      this.gridEngine.setSpeed("player", wantsRun ? OverworldScene.RUN_SPEED : OverworldScene.WALK_SPEED);
      this.gridEngine.setWalkingAnimationMapping("player", wantsRun ? RUN_ANIM : WALK_ANIM);
    }

    // When the player is NOT moving, force the walking standing frame for
    // the current facing direction. Grid Engine keeps the last frame of the
    // running mapping when movement stops, which shows a running pose.
    // Skip this when blocked — handleBlocked manages its own walk frames.
    if (!this.gridEngine.isMoving("player") && !this.blockedDir) {
      const facing = this.gridEngine.getFacingDirection("player");
      const standingFrame =
        facing === Direction.DOWN ? 0 :
        facing === Direction.UP ? 1 :
        2; // left/right both use frame 2 (left-standing) with flipX
      this.playerSprite.setFrame(standingFrame);
    }

    const { cursors } = this;
    let moveDir: Direction | null = null;
    if (cursors.left.isDown) moveDir = Direction.LEFT;
    else if (cursors.right.isDown) moveDir = Direction.RIGHT;
    else if (cursors.up.isDown) moveDir = Direction.UP;
    else if (cursors.down.isDown) moveDir = Direction.DOWN;

    if (!moveDir) {
      // No arrow held — clear blocked state and pending turn.
      this.blockedDir = null;
      this.pendingTurnDir = null;
      return;
    }

    // Don't accept new input while mid-hop over a ledge.
    if (this.isLedgeHopping) return;

    const playerPos = this.gridEngine.getPosition("player");
    const target = this.getTileInDirection(playerPos, moveDir);

    // Obstructive tile crossings (signs/fences) — walk-in-place + bonk.
    if (isObstructiveBlocked(playerPos.x, playerPos.y, target.x, target.y, moveDir, MAUVILLE_OBSTRUCTIVE)) {
      this.handleBlocked(moveDir, delta);
      return;
    }

    // Ledge check — target tile is a ledge:
    //   Matching direction → hop over
    //   Non-matching → walk-in-place + bonk
    const ledgeDir = this.ledges.get(`${target.x},${target.y}`);
    if (ledgeDir) {
      if (ledgeDir === this.moveDirToLedgeDir(moveDir)) {
        this.blockedDir = null;
        this.startLedgeHop(moveDir);
      } else {
        this.handleBlocked(moveDir, delta);
      }
      return;
    }

    // Block climbing back up a ledge: the blocking tile is the one
    // BELOW (in the opposite direction of the hop). Check if the
    // target tile has a ledge whose hop direction is opposite to
    // our move direction. E.g., a "down" ledge at the tile above
    // means we can't walk up from the tile below.
    const opposites: Record<string, string> = { up: "down", down: "up", left: "right", right: "left" };
    const moveDirStr = this.moveDirToLedgeDir(moveDir);
    // Check if the tile we'd move onto has a ledge pointing opposite
    // (meaning it's the landing side and we'd be climbing back up).
    // Also check the tile beyond target — that's where the ledge
    // visually sits (the player lands one tile past the ledge after hopping).
    if (moveDirStr) {
      // The ledge tile is the one in the direction we want to go.
      // If that tile's ledge direction is opposite to our movement,
      // we're trying to climb back up.
      const beyondTarget = this.getTileInDirection(target, moveDir);
      const beyondLedge = this.ledges.get(`${beyondTarget.x},${beyondTarget.y}`);
      if (beyondLedge && opposites[moveDirStr] === beyondLedge) {
        this.handleBlocked(moveDir, delta);
        return;
      }
    }

    // (blockedDir is cleared inside tryMove when movement succeeds)

    // ── Tap-to-turn / hold-to-move (matches OG Pokemon) ──────
    // Order matters: a "pending turn" started on a previous frame must
    // be checked BEFORE the "facing === moveDir" branch, otherwise the
    // very next frame after we turn the character would see facing now
    // matching the move direction and walk immediately, bypassing the
    // turn delay entirely.

    // Case 1: we're already mid-tap-to-turn for this direction.
    if (this.pendingTurnDir === moveDir) {
      if (this.time.now - this.pendingTurnStart >= OverworldScene.TURN_DELAY_MS) {
        // Held long enough — commit to walking.
        this.pendingTurnDir = null;
        this.tryMove(moveDir, delta);
      }
      // Otherwise we're still in the "just turned, waiting" window.
      return;
    }

    // Different direction now → drop any stale pending turn.
    this.pendingTurnDir = null;

    // Case 2: running bypasses the turn delay entirely.
    if (this.isRunning) {
      this.tryMove(moveDir, delta);
      return;
    }

    // Case 3: already facing that direction → move immediately.
    const facing = this.gridEngine.getFacingDirection("player");
    if (facing === moveDir) {
      this.tryMove(moveDir, delta);
      return;
    }

    // Case 4: facing some other direction — start a pending turn.
    this.pendingTurnDir = moveDir;
    this.pendingTurnStart = this.time.now;
    this.gridEngine.turnTowards("player", moveDir);
  }

  /**
   * Attempt a move. If Grid Engine can't execute it (collision layer,
   * NPC, map edge, etc.), the player won't start moving — detect that
   * and trigger the OG walk-in-place + bonk behavior.
   */
  private tryMove(moveDir: Direction, delta: number): void {
    this.gridEngine.move("player", moveDir);
    if (this.gridEngine.isMoving("player")) {
      // Move succeeded — clear any blocked state
      this.blockedDir = null;
    } else {
      // Check if blocked tile is a door/warp — enter building instead of bonking
      if (!this.isTransitioning) {
        const pos = this.gridEngine.getPosition("player");
        const target = getTargetTile(pos.x, pos.y, this.dirToAnimKey(moveDir));
        const warp = findWarp(target.x, target.y);
        if (warp) {
          this.handleWarpTransition(warp);
          return;
        }
      }
      // Blocked — walk-in-place + bonk at step rate
      this.handleBlocked(moveDir, delta);
    }
  }

  // PC tile positions in stitched coordinates.
  // OG: PC is inside Pokemon Center. We put one outside near the center.
  // Mauville Pokemon Center entrance is around (73, 55) in stitched coords.
  private static readonly PC_TILES = new Set(["73,55", "74,55"]);

  private async handleInteraction(): Promise<void> {
    if (this.isInteracting || this.dialogSystem.active || this.menuActive) return;
    this.isInteracting = true;
    try {
      const playerPos = this.gridEngine.getPosition("player");
      const playerFacing = this.gridEngine.getFacingDirection("player");

      // Check for PC tile
      const facingTile = this.getTileInDirection(playerPos, playerFacing);
      const pcKey = `${facingTile.x},${facingTile.y}`;
      if (OverworldScene.PC_TILES.has(pcKey)) {
        emitGameEvent(GameEvents.SHOW_PC);
        this.menuActive = true;
        const unsub = onGameEvent(GameEvents.PC_CLOSE, () => {
          this.menuActive = false;
          unsub();
        });
        return;
      }

      // Hidden items — checked before NPCs/signs so a rock or flower
      // patch with a buried pickup takes priority over whatever the
      // tile normally is. No-op (returns false) if there's no hidden
      // item at this tile or it's already been collected.
      const pickedHidden = await HiddenItemSystem.tryPickup(
        this.dialogSystem,
        "overworld",
        facingTile.x,
        facingTile.y,
      );
      if (pickedHidden) return;

      const npcHit = await this.npcSystem.tryInteract(playerPos, playerFacing);
      if (!npcHit) {
        await this.signSystem.tryInteract(playerPos, playerFacing);
      }
    } finally {
      this.isInteracting = false;
    }
  }

  /**
   * Create overlay sprites for each obstructive tile (like signs).
   * Also includes the tile directly above if that tile has foreground
   * content (for tall signs like the gym sign that span 2 tiles).
   *
   * Overlays are hidden by default and shown only when a character
   * stands on the obstructive tile.
   *
   * Each obstructive tile maps to a list of overlay sprites (the tile
   * itself + any tall-object tiles above it).
   */
  private obstructiveOverlayGroups: Map<string, Phaser.GameObjects.Sprite[]> = new Map();

  private createObstructiveOverlays(): void {
    const TILE = 16;
    // Use the TOP-layer-only tileset so overlay sprites draw just the
    // object pixels (sign, fence post) without the grass background
    // that would otherwise cover the underlying ground/foreground.
    const overlayTex = this.textures.get("mauville_top");
    if (!overlayTex) return;

    const map = this.make.tilemap({ key: "mauville" });
    if (!map.getLayer("Ground")) return;

    // Check the foreground image for content at a given tile
    const fgTexture = this.textures.get("mauville_foreground");
    const fgSource = fgTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const fgCanvas = document.createElement("canvas");
    fgCanvas.width = fgSource.width;
    fgCanvas.height = fgSource.height;
    const fgCtx = fgCanvas.getContext("2d")!;
    fgCtx.drawImage(fgSource, 0, 0);

    const hasForegroundContent = (tx: number, ty: number): boolean => {
      if (tx < 0 || ty < 0 || tx * TILE >= fgSource.width || ty * TILE >= fgSource.height) return false;
      const img = fgCtx.getImageData(tx * TILE, ty * TILE, TILE, TILE);
      for (let i = 3; i < img.data.length; i += 4) {
        if (img.data[i] > 0) return true;
      }
      return false;
    };

    for (const tile of MAUVILLE_OBSTRUCTIVE) {
      const group: Phaser.GameObjects.Sprite[] = [];

      // Start with the obstructive tile itself, then walk UP collecting
      // tiles that have foreground content (tall objects like gym sign).
      const tilesToCover: { x: number; y: number }[] = [{ x: tile.x, y: tile.y }];
      let ty = tile.y - 1;
      while (ty >= 0 && hasForegroundContent(tile.x, ty)) {
        tilesToCover.push({ x: tile.x, y: ty });
        ty--;
      }

      for (const t of tilesToCover) {
        const tileData = map.getTileAt(t.x, t.y, true, "Ground");
        if (!tileData) continue;
        const gid = tileData.index;
        const localId = gid - 1;

        // Tileset is extruded: margin=1, spacing=2 around each 16x16 metatile.
        const columns = 16;
        const MARGIN = 1;
        const SPACING = 2;
        const srcX = MARGIN + (localId % columns) * (TILE + SPACING);
        const srcY = MARGIN + Math.floor(localId / columns) * (TILE + SPACING);
        const frameKey = `obstructive_${t.x}_${t.y}`;
        overlayTex.add(frameKey, 0, srcX, srcY, TILE, TILE);

        const sprite = this.add.sprite(
          t.x * TILE + TILE / 2,
          t.y * TILE + TILE / 2,
          "mauville_top",
          frameKey,
        );
        // High depth so the sign covers any character at the obstructive tile
        sprite.setDepth(10 + (tile.y + 2) * TILE + 10);
        sprite.setVisible(false);
        group.push(sprite);
      }

      this.obstructiveOverlayGroups.set(`${tile.x},${tile.y}`, group);
    }
  }

  /** Show/hide obstructive overlay sprites based on whether a character is on them. */
  private updateObstructiveOverlays(): void {
    // Build set of occupied obstructive tiles.
    // Include BOTH the current tile AND the destination tile (when moving).
    const occupied = new Set<string>();
    const charIds = this.gridEngine.getAllCharacters();
    for (const charId of charIds) {
      const pos = this.gridEngine.getPosition(charId);
      occupied.add(`${pos.x},${pos.y}`);
      if (this.gridEngine.isMoving(charId)) {
        const dir = this.gridEngine.getFacingDirection(charId);
        const target = this.getTileInDirection(pos, dir);
        occupied.add(`${target.x},${target.y}`);
      }
    }

    for (const [key, group] of this.obstructiveOverlayGroups) {
      const visible = occupied.has(key);
      for (const sprite of group) {
        sprite.setVisible(visible);
      }
    }
  }

  /** Pool of grass overlay sprites for recycling. */
  private grassPool: Phaser.GameObjects.Sprite[] = [];
  /** Active grass overlays keyed by "x,y". */
  private activeGrass: Map<string, Phaser.GameObjects.Sprite> = new Map();
  /** Current zone the player is in (for music + popup). */
  private currentZone: ZoneDef | undefined;
  private mapNamePopup!: MapNamePopup;
  /** Inline popup — rendered directly in update() to avoid timing issues. */
  private popupBg: Phaser.GameObjects.Image | null = null;
  private popupTxt: Phaser.GameObjects.Text | null = null;
  private popupOffsetY = -30;
  private popupTargetY = 3;
  private popupW = 80;
  private popupState: "none" | "sliding_in" | "visible" | "sliding_out" = "none";

  /**
   * OG-style tall grass field effect (FLDEFF_TALL_GRASS).
   *
   * Spawns a 5-frame grass overlay sprite centered on the tile the
   * player just stepped onto. The sprite is positioned at the tile's
   * center (OG: SetSpritePosToOffsetMapCoords with offset 8,8) and
   * rendered IN FRONT of the player's lower body.
   *
   * OG priority trick: the grass sprite gets subpriority = player + 2,
   * which on the GBA means it draws over the player's lower half.
   * In Phaser with y-sorted depth, we set grass depth to player
   * depth + 1 so it renders on top.
   */
  /**
   * Check if the player crossed into a new zone. If so, change music
   * and show the OG map name popup.
   */
  private checkZoneTransition(x: number, y: number): void {
    const newZone = getZoneAt(x, y);
    if (!newZone || newZone.id === this.currentZone?.id) return;

    this.currentZone = newZone;

    // Change music (OG: FadeOutAndPlayNewMapMusic with 8-frame fade)
    bgm.play(newZone.music);

    // Show map name popup
    this.showZonePopup(newZone.name, newZone.popupTheme);

    // Track zone visit for EXPLORER badge
    markZoneVisited(newZone.id);
    checkBadges();
  }

  /**
   * Show the zone name popup via React (EventBridge).
   * Phaser in-canvas rendering had depth/timing issues, so the popup
   * is a React component overlaid on the game canvas.
   */
  private showZonePopup(name: string, theme: "marble" | "wood"): void {
    emitGameEvent(GameEvents.SHOW_MAP_NAME, { name, theme });
  }

  private playGrassRustle(): void {
    sfx.grass();

    const pos = this.gridEngine.getPosition("player");
    const key = `${pos.x},${pos.y}`;

    // Don't spawn a duplicate at the same tile
    if (this.activeGrass.has(key)) return;

    // Get or create a grass sprite
    let grass = this.grassPool.pop();
    if (!grass) {
      grass = this.add.sprite(0, 0, "tall_grass");
    }

    // OG: centered on tile (offset 8,8 from tile top-left).
    // Tile pixel coords: top-left = (x*16, y*16).
    // Sprite center = (x*16 + 8, y*16 + 8).
    const px = pos.x * 16 + 8;
    const py = pos.y * 16 + 8;
    grass.setPosition(px, py);

    // Render in front of the player. The player sprite depth is
    // 10 + sprite.y. The player's sprite.y at this tile is roughly
    // py - 16 (player sprite origin is offset). We want grass ABOVE
    // the player in draw order at this tile.
    grass.setDepth(10 + this.playerSprite.y + 1);

    grass.setVisible(true);
    grass.setActive(true);
    grass.setFrame(0);

    // OG: the 5-frame rustle plays fast (~4 ticks per frame at 60fps = ~67ms each).
    if (!this.anims.exists("grass_rustle")) {
      this.anims.create({
        key: "grass_rustle",
        frames: this.anims.generateFrameNumbers("tall_grass", {
          start: 0,
          end: 4,
        }),
        frameRate: 15,
        repeat: 0,
      });
    }

    grass.play("grass_rustle");
    this.activeGrass.set(key, grass);

    // Remove once animation finishes
    grass.once("animationcomplete", () => {
      if (!grass) return;
      grass.setVisible(false);
      grass.setActive(false);
      this.activeGrass.delete(key);
      this.grassPool.push(grass);
    });
  }

  /**
   * OG-style tile animations via frame-swapping on the ground layer.
   *
   * Water: 4-frame pixel-scroll cycle at 267ms (OG: 16 ticks at 60fps).
   * Flowers: 12-step sway cycle at 133ms (OG Mauville: 8 ticks at 60fps).
   *   Sequence: [base,base,swayR,swayL,swayL,swayL,swayL,swayL,swayL,swayL,swayR,base]
   *   (rest → sway out → hold → sway back)
   */
  private startTileAnimations(
    groundLayer: Phaser.Tilemaps.TilemapLayer | null,
  ): void {
    if (!groundLayer) return;

    // ── Collect tile positions ────────────────────────────
    // Flower GIDs (red flowers on grass)
    const flowerGids = [5];

    const tilePositions: Map<number, { x: number; y: number }[]> = new Map();
    for (const gid of flowerGids) {
      tilePositions.set(gid, []);
    }
    groundLayer.forEachTile((tile) => {
      const positions = tilePositions.get(tile.index);
      if (positions) {
        positions.push({ x: tile.x, y: tile.y });
      }
    });

    // ── Water animation ─────────────────────────────────
    // Proper metatile variants generated by gen-water-anim.mjs.
    // Each animated water tile has 8 frame GIDs. Cycle at 267ms.
    fetch("/game/maps/water_anim.json")
      .then((r) => r.json())
      .then((data: { frameCount: number; frameDelayMs: number; tiles: { x: number; y: number; frames: number[] }[] }) => {
        if (!data.tiles.length) return;
        let waterStep = 0;
        this.time.addEvent({
          delay: data.frameDelayMs,
          loop: true,
          callback: () => {
            waterStep = (waterStep + 1) % data.frameCount;
            for (const t of data.tiles) {
              groundLayer.putTileAt(t.frames[waterStep], t.x, t.y);
            }
          },
        });
      })
      .catch(() => { /* no water anim data */ });

    // ── Flower animation ─────────────────────────────────
    // GIDs: 1023 = base (center), 1024 = sway-right, 1025 = sway-left
    //
    // Smooth cyclical sway like a pendulum:
    //   center → right → center → left → center (repeat)
    // With longer holds at the extremes and center for a natural feel.
    // Total cycle: ~2.4s (16 steps × 150ms)
    const flowerSeq = [
      1023, 1023, 1023, // rest at center
      1024, 1024, 1024, 1024, // sway right (hold)
      1023, 1023, 1023, // pass through center
      1025, 1025, 1025, 1025, // sway left (hold)
      1023, 1023, 1023, // return to center
    ];
    let flowerStep = 0;
    this.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        flowerStep = (flowerStep + 1) % flowerSeq.length;
        const gid = flowerSeq[flowerStep];
        const positions = tilePositions.get(5);
        if (!positions) return;
        for (const pos of positions) {
          groundLayer.putTileAt(gid, pos.x, pos.y);
        }
      },
    });
  }

  /** Convert a Grid Engine Direction to our ledge-dir enum. */
  private moveDirToLedgeDir(dir: Direction): LedgeDir | null {
    switch (dir) {
      case Direction.UP: return "up";
      case Direction.DOWN: return "down";
      case Direction.LEFT: return "left";
      case Direction.RIGHT: return "right";
      default: return null;
    }
  }

  /**
   * OG Emerald wall-bump behavior: when holding into a blocked tile,
   * the character walks-in-place at the current step rate and plays
   * the bonk SFX once per step cycle. delta = ms since last frame.
   */
  private static readonly BONK_INTERVAL_WALK = 700;
  private static readonly BONK_INTERVAL_RUN = 350;
  private blockedBonkTimer = 0;

  private handleBlocked(moveDir: Direction, delta: number): void {
    this.gridEngine.turnTowards("player", moveDir);
    this.playerSprite.flipX = moveDir === Direction.RIGHT;

    // Animation step duration matches current speed
    const speed = this.isRunning ? OverworldScene.RUN_SPEED : OverworldScene.WALK_SPEED;
    const stepMs = 1000 / speed;
    const halfStep = stepMs / 2;

    // First frame of being blocked — bonk immediately
    if (this.blockedDir !== moveDir) {
      this.blockedDir = moveDir;
      this.blockedStepTimer = 0;
      this.blockedBonkTimer = 0;
      this.blockedFootToggle = false;
      sfx.collision();
      const animSet = this.isRunning ? RUN_ANIM : WALK_ANIM;
      const key = this.dirToAnimKey(moveDir);
      this.playerSprite.setFrame(animSet[key].leftFoot);
      return;
    }

    this.blockedStepTimer += delta;
    this.blockedBonkTimer += delta;

    const animSet = this.isRunning ? RUN_ANIM : WALK_ANIM;
    const key = this.dirToAnimKey(moveDir);

    // Walk animation cycles at normal step rate
    if (this.blockedStepTimer < halfStep) {
      const foot = this.blockedFootToggle ? animSet[key].rightFoot : animSet[key].leftFoot;
      this.playerSprite.setFrame(foot);
    } else if (this.blockedStepTimer < stepMs) {
      this.playerSprite.setFrame(animSet[key].standing);
    } else {
      this.blockedStepTimer -= stepMs;
      this.blockedFootToggle = !this.blockedFootToggle;
      const foot = this.blockedFootToggle ? animSet[key].rightFoot : animSet[key].leftFoot;
      this.playerSprite.setFrame(foot);
    }

    const bonkInterval = this.isRunning ? OverworldScene.BONK_INTERVAL_RUN : OverworldScene.BONK_INTERVAL_WALK;
    if (this.blockedBonkTimer >= bonkInterval) {
      this.blockedBonkTimer -= bonkInterval;
      sfx.collision();
    }
  }

  private dirToAnimKey(dir: Direction): "down" | "up" | "left" | "right" {
    switch (dir) {
      case Direction.DOWN: return "down";
      case Direction.UP: return "up";
      case Direction.LEFT: return "left";
      case Direction.RIGHT: return "right";
      default: return "down";
    }
  }

  /**
   * Perform a ledge hop: chain TWO normal Grid Engine 1-tile moves in
   * the given direction so the player crosses 2 tiles total. While the
   * hop is in progress, the update() loop applies a sinusoidal Y offset
   * on top of Grid Engine's sprite position so the character appears
   * to arc upward and back down.
   */
  private startLedgeHop(dir: Direction): void {
    sfx.ledge();
    this.isLedgeHopping = true;
    this.hopStartTime = this.time.now;
    const speed = this.isRunning ? OverworldScene.RUN_SPEED : OverworldScene.WALK_SPEED;
    this.hopDurationMs = (2 * 1000) / speed;

    // Ledge tiles are blocked by collision, so Grid Engine's move()
    // won't work. Instead, we remove the player character and re-add
    // it with tile collision disabled for the duration of the hop.
    const pos = this.gridEngine.getPosition("player");
    const currentSpeed = this.gridEngine.getSpeed("player");
    const animMapping = this.isRunning ? RUN_ANIM : WALK_ANIM;

    this.gridEngine.removeCharacter("player");
    this.gridEngine.addCharacter({
      id: "player",
      sprite: this.playerSprite,
      walkingAnimationMapping: animMapping,
      startPosition: pos,
      facingDirection: dir,
      speed: currentSpeed,
      offsetY: 0,
      collides: {
        collidesWithTiles: false, // ← disabled for the hop
        collisionGroups: ["geDefault"],
      },
    });

    const restoreCollision = () => {
      const landPos = this.gridEngine.getPosition("player");
      this.gridEngine.removeCharacter("player");
      this.gridEngine.addCharacter({
        id: "player",
        sprite: this.playerSprite,
        walkingAnimationMapping: animMapping,
        startPosition: landPos,
        facingDirection: dir,
        speed: currentSpeed,
        offsetY: 0,
        collides: {
          collidesWithTiles: true,
          collisionGroups: ["geDefault"],
        },
      });
      this.isLedgeHopping = false;
    };

    // Chain two single-tile moves
    let movesRemaining = 2;
    this.hopMoveSub?.unsubscribe();
    this.hopMoveSub = this.gridEngine.movementStopped().subscribe(({ charId }) => {
      if (charId !== "player") return;
      movesRemaining--;
      if (movesRemaining > 0) {
        this.gridEngine.move("player", dir);
      } else {
        this.hopMoveSub?.unsubscribe();
        this.hopMoveSub = null;
        restoreCollision();
      }
    });
    this.gridEngine.move("player", dir);

    // Safety timeout
    this.time.delayedCall(this.hopDurationMs + 200, () => {
      if (this.isLedgeHopping) {
        this.hopMoveSub?.unsubscribe();
        this.hopMoveSub = null;
        restoreCollision();
      }
    });
  }

  /** localStorage key for the player's auto-saved tile position + facing. */
  private static readonly POS_STORAGE_KEY = "gkos:explore:player_pos";

  private loadPlayerState(): { x: number; y: number; facing?: Direction } | null {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(OverworldScene.POS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
        return {
          x: parsed.x,
          y: parsed.y,
          facing: typeof parsed.facing === "string" ? (parsed.facing as Direction) : undefined,
        };
      }
    } catch {
      // ignore parse errors, fall through to null
    }
    return null;
  }

  private savePlayerState(posOverride?: { x: number; y: number }): void {
    if (typeof localStorage === "undefined") return;
    try {
      // Prefer the position supplied by the caller (enterTile from
      // positionChangeFinished). gridEngine.getPosition returns the
      // OLD tile during chained continuous movement.
      const pos = posOverride ?? this.gridEngine.getPosition("player");
      const facing = this.gridEngine.getFacingDirection("player");
      localStorage.setItem(
        OverworldScene.POS_STORAGE_KEY,
        JSON.stringify({ x: pos.x, y: pos.y, facing }),
      );
    } catch {
      // ignore quota errors
    }
  }


  /** Get the tile coordinate in the given direction from the given position. */
  private getTileInDirection(
    pos: { x: number; y: number },
    dir: Direction,
  ): { x: number; y: number } {
    switch (dir) {
      case Direction.UP: return { x: pos.x, y: pos.y - 1 };
      case Direction.DOWN: return { x: pos.x, y: pos.y + 1 };
      case Direction.LEFT: return { x: pos.x - 1, y: pos.y };
      case Direction.RIGHT: return { x: pos.x + 1, y: pos.y };
      default: return pos;
    }
  }

  /**
   * Create individual foreground tile sprites from the foreground image.
   * Each non-transparent 16x16 tile gets its own sprite with Y-sorted depth.
   * This replaces the single flat foreground image approach.
   */
  private createForegroundTiles(): void {
    const TILE = 16;
    const fgTexture = this.textures.get("mauville_foreground");
    const source = fgTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const mapW = Math.floor(source.width / TILE);
    const mapH = Math.floor(source.height / TILE);

    // Create a temporary canvas to read pixel data and check transparency
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source, 0, 0);

    let count = 0;
    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        // Check if this 16x16 tile has any non-transparent pixels
        const imgData = ctx.getImageData(tx * TILE, ty * TILE, TILE, TILE);
        let hasContent = false;
        for (let i = 3; i < imgData.data.length; i += 4) {
          if (imgData.data[i] > 0) { hasContent = true; break; }
        }
        if (!hasContent) continue;

        // Create a unique texture frame for this tile
        const frameKey = `fg_${tx}_${ty}`;
        fgTexture.add(frameKey, 0, tx * TILE, ty * TILE, TILE, TILE);

        // Create sprite with top-left origin so its y matches tile top.
        const sprite = this.add.sprite(tx * TILE, ty * TILE, "mauville_foreground", frameKey);
        sprite.setOrigin(0, 0);

        // Player sprite with offsetY=0 has sprite.y = tileY*16 - 16.
        // Player depth = 10 + sprite.y = Y*16 - 6.
        //
        // Char at row ty depth   = ty*16 - 6
        // Char at row ty+1 depth = ty*16 + 10
        //
        // We want foreground at row ty to COVER the player when the player
        // is at row ty (same row) so trees/bushes render above the player.
        // So fg depth > player at row ty depth:
        //   fg > ty*16 - 6
        // And we want player at row ty+1 to render in FRONT of fg at row ty:
        //   fg < ty*16 + 10
        // Use fg depth = ty*16 + 2 (between those values).
        sprite.setDepth(ty * TILE + 2);
        count++;
      }
    }
    console.log(`Created ${count} foreground tile sprites`);
  }

  // ── Warp / door transitions ──────────────────────────────────

  /**
   * Fade out, play door SFX, stop BGM, and transition to InteriorScene.
   * Called when the player steps onto a warp tile (door).
   */
  private handleWarpTransition(warp: Warp): void {
    this.isTransitioning = true;

    // Stop player movement
    this.gridEngine.stopMovement("player");

    // Play door SFX
    sfx.door();

    // Stop BGM
    bgm.stop();

    // Fade out camera (150ms — snappy like OG)
    this.cameras.main.fadeOut(150, 0, 0, 0);

    this.cameras.main.once("camerafadeoutcomplete", () => {
      // Save current position for return
      const playerPos = this.gridEngine.getPosition("player");
      const facing = this.gridEngine.getFacingDirection("player");

      // Start InteriorScene
      this.scene.start("InteriorScene", {
        interiorKey: warp.targetMap,
        returnPos: {
          x: playerPos.x,
          y: playerPos.y,
          facing: this.dirToAnimKey(facing),
        },
        spawnTile: warp.spawnTile,
        spawnFacing: warp.spawnFacing,
      });
    });
  }

  /** Convert a string direction to Grid Engine Direction enum. */
  private stringToDirection(s: string): Direction {
    switch (s) {
      case "up": return Direction.UP;
      case "down": return Direction.DOWN;
      case "left": return Direction.LEFT;
      case "right": return Direction.RIGHT;
      default: return Direction.DOWN;
    }
  }

  shutdown(): void {
    this.npcSystem?.destroy();
    this.dialogSystem?.destroy();
    this.unsubMenuClose?.();
    this.unsubMenuClose = null;
  }
}
