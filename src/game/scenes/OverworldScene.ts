import Phaser from "phaser";
import { Direction } from "grid-engine";
import type GridEngine from "grid-engine";
import { DialogSystem } from "@/game/systems/DialogSystem";
import { NPCSystem } from "@/game/systems/NPCSystem";
import { SignSystem } from "@/game/systems/SignSystem";
import { MAUVILLE_NPCS, MAUVILLE_SIGNS } from "@/game/data/npcs";
import { MAUVILLE_OBSTRUCTIVE, isObstructiveBlocked } from "@/game/data/obstructive-tiles";
import { GameEvents, emitGameEvent, onGameEvent, getDebugMode } from "@/game/EventBridge";
import { PIXEL_SCALE } from "@/game/config";
import { sfx } from "@/game/systems/SoundManager";
import { bgm } from "@/game/systems/BGMManager";

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
  /** Timestamp of last collision bonk sound — throttle to avoid spam. */
  private lastCollisionSfx = 0;
  private static readonly COLLISION_SFX_COOLDOWN = 300;
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
    // Restore the player's last saved position + facing from localStorage
    // so a refresh drops them where they were, looking the same way.
    const saved = this.loadPlayerState();
    const startPosition = saved ? { x: saved.x, y: saved.y } : { x: 72, y: 58 };

    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: this.playerSprite,
          walkingAnimationMapping: WALK_ANIM,
          startPosition,
          facingDirection: saved?.facing ?? Direction.DOWN,
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
    this.gridEngine.positionChangeFinished().subscribe(({ charId }) => {
      if (charId !== "player") return;
      this.savePlayerState();
    });
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

    // Interaction: Enter, Z, Space
    const interactKeys = [
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      Phaser.Input.Keyboard.KeyCodes.Z,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ];
    for (const code of interactKeys) {
      this.input.keyboard!.addKey(code).on("down", () => this.handleInteraction());
    }

    // Start Menu: Escape
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on("down", () => {
      if (this.dialogSystem.active || this.menuActive) return;
      this.menuActive = true;
      this.npcSystem.paused = true;
      emitGameEvent(GameEvents.SHOW_MENU);
    });

    this.unsubMenuClose = onGameEvent(GameEvents.MENU_CLOSE, () => {
      this.menuActive = false;
      this.npcSystem.paused = false;
    });

    // Start BGM on first user interaction (browser autoplay policy)
    const startBGM = () => {
      bgm.play("mauville");
      window.removeEventListener("keydown", startBGM);
      window.removeEventListener("click", startBGM);
    };
    window.addEventListener("keydown", startBGM);
    window.addEventListener("click", startBGM);

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
        fontFamily: "monospace",
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

  update(): void {
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
        // Reposition debug overlay around the player on every tile step.
        if (this.debugEnabled) this.updateDebugOverlay();
      }
    }

    // Block input/movement while dialog or menu is active.
    if (this.dialogSystem.active || this.menuActive) return;

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
    if (!this.gridEngine.isMoving("player")) {
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
      // No arrow held — clear any pending turn so the next press starts fresh.
      this.pendingTurnDir = null;
      return;
    }

    // Don't accept new input while mid-hop over a ledge.
    if (this.isLedgeHopping) return;

    const playerPos = this.gridEngine.getPosition("player");
    const target = this.getTileInDirection(playerPos, moveDir);

    // Obstructive tile crossings (signs/fences) handled by the
    // positionChangeStarted interceptor — do a pre-check too so we
    // can turn the character rather than do a jittery stop.
    if (isObstructiveBlocked(playerPos.x, playerPos.y, target.x, target.y, moveDir, MAUVILLE_OBSTRUCTIVE)) {
      const now = this.time.now;
      if (now - this.lastCollisionSfx >= OverworldScene.COLLISION_SFX_COOLDOWN) {
        sfx.collision();
        this.lastCollisionSfx = now;
      }
      this.gridEngine.turnTowards("player", moveDir);
      return;
    }

    // Ledge check: if the target tile is a ledge, see whether the
    // player's move direction matches the ledge's hop direction.
    // Matching direction → perform a 2-tile hop with arc animation.
    // Non-matching direction → block entry entirely.
    const ledgeDir = this.ledges.get(`${target.x},${target.y}`);
    if (ledgeDir) {
      if (ledgeDir === this.moveDirToLedgeDir(moveDir)) {
        this.startLedgeHop(moveDir);
      } else {
        this.gridEngine.turnTowards("player", moveDir);
      }
      return;
    }

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
        this.gridEngine.move("player", moveDir);
      }
      // Otherwise we're still in the "just turned, waiting" window.
      return;
    }

    // Different direction now → drop any stale pending turn.
    this.pendingTurnDir = null;

    // Case 2: running bypasses the turn delay entirely.
    if (this.isRunning) {
      this.gridEngine.move("player", moveDir);
      return;
    }

    // Case 3: already facing that direction → move immediately.
    const facing = this.gridEngine.getFacingDirection("player");
    if (facing === moveDir) {
      this.gridEngine.move("player", moveDir);
      return;
    }

    // Case 4: facing some other direction — start a pending turn.
    this.pendingTurnDir = moveDir;
    this.pendingTurnStart = this.time.now;
    this.gridEngine.turnTowards("player", moveDir);
  }

  private async handleInteraction(): Promise<void> {
    // Block interaction while a menu is open. Otherwise pressing
    // Enter/Z/Space inside a menu would also trigger the sign/NPC
    // the player happens to be facing in the world behind it.
    if (this.isInteracting || this.dialogSystem.active || this.menuActive) return;
    this.isInteracting = true;
    try {
      const playerPos = this.gridEngine.getPosition("player");
      const playerFacing = this.gridEngine.getFacingDirection("player");
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

    // NOTE: Water tile animation disabled — the OG replaces sub-tiles
    // (8x8) within metatiles, which requires re-composing the metatiles
    // with each frame's sub-tile data. Pixel-rolling breaks seamless
    // tiling between adjacent water tiles. Proper implementation needs
    // the compose-metatiles script to generate animation frames.

    // ── Flower animation ─────────────────────────────────
    // OG Mauville 12-step sway at 133ms (8 game-ticks):
    // [base, base, swayR, swayL, swayL, swayL, swayL, swayL, swayL, swayL, swayR, base]
    const flowerAnims = [
      { baseGid: 5, swayR: 1031, swayL: 1032 },
    ];
    // Build the 12-step sequence per flower type
    const flowerSequences = flowerAnims.map((a) => ({
      baseGid: a.baseGid,
      frames: [
        a.baseGid, a.baseGid, a.swayR, a.swayL,
        a.swayL, a.swayL, a.swayL, a.swayL,
        a.swayL, a.swayL, a.swayR, a.baseGid,
      ],
    }));
    let flowerStep = 0;
    this.time.addEvent({
      delay: 133,
      loop: true,
      callback: () => {
        flowerStep = (flowerStep + 1) % 12;
        for (const a of flowerSequences) {
          const gid = a.frames[flowerStep];
          const positions = tilePositions.get(a.baseGid);
          if (!positions) continue;
          for (const pos of positions) {
            groundLayer.putTileAt(gid, pos.x, pos.y);
          }
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
    // Total hop duration = time to traverse 2 tiles at the current speed.
    // Grid Engine speed is in tiles/sec.
    const speed = this.isRunning ? OverworldScene.RUN_SPEED : OverworldScene.WALK_SPEED;
    this.hopDurationMs = (2 * 1000) / speed;

    // Chain two single-tile moves: start the first now, queue the
    // second when the first stops. Wrap up state after the second.
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
        this.isLedgeHopping = false;
      }
    });
    this.gridEngine.move("player", dir);

    // Safety timeout: if the second move is blocked or we never see
    // a movementStopped event, force-end the hop after the expected
    // duration so the player isn't stuck.
    this.time.delayedCall(this.hopDurationMs + 200, () => {
      if (this.isLedgeHopping) {
        this.hopMoveSub?.unsubscribe();
        this.hopMoveSub = null;
        this.isLedgeHopping = false;
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

  private savePlayerState(): void {
    if (typeof localStorage === "undefined") return;
    try {
      const pos = this.gridEngine.getPosition("player");
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

  shutdown(): void {
    this.npcSystem?.destroy();
    this.dialogSystem?.destroy();
    this.unsubMenuClose?.();
    this.unsubMenuClose = null;
  }
}
