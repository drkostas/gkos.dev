import Phaser from "phaser";
import { Direction } from "grid-engine";
import type GridEngine from "grid-engine";
import { DialogSystem } from "@/game/systems/DialogSystem";
import { NPCSystem } from "@/game/systems/NPCSystem";
import { SignSystem } from "@/game/systems/SignSystem";
import { MAUVILLE_NPCS, MAUVILLE_SIGNS } from "@/game/data/npcs";
import { MAUVILLE_OBSTRUCTIVE, isObstructiveBlocked } from "@/game/data/obstructive-tiles";
import { GameEvents, emitGameEvent, onGameEvent } from "@/game/EventBridge";

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
  /** Per-obstructive-tile overlay sprites that only show when a character stands on them. */
  private obstructiveOverlays: Map<string, Phaser.GameObjects.Sprite> = new Map();

  private static readonly WALK_SPEED = 4;
  private static readonly RUN_SPEED = 8;

  constructor() {
    super({ key: "OverworldScene" });
  }

  create(): void {
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
    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: this.playerSprite,
          walkingAnimationMapping: WALK_ANIM,
          startPosition: { x: 20, y: 9 },
          speed: OverworldScene.WALK_SPEED,
          offsetY: 0,
        },
      ],
    });

    // NOTE: directionChanged() observable is unreliable (doesn't fire consistently).
    // flipX is handled per-frame in update() instead.

    // Intercept movement to block obstructive-tile crossings.
    // positionChangeStarted fires BEFORE the tile transition happens,
    // so we can stop the character in time.
    this.gridEngine.positionChangeStarted().subscribe(({ charId, enterTile, exitTile }) => {
      if (charId !== "player") return;
      // Figure out direction from exit -> enter
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
      }
    });

    // ── Systems ──────────────────────────────────────────────
    this.dialogSystem = new DialogSystem();
    this.npcSystem = new NPCSystem(this, this.gridEngine, this.dialogSystem, MAUVILLE_NPCS);
    this.npcSystem.init();
    this.signSystem = new SignSystem(this.dialogSystem, MAUVILLE_SIGNS);

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
    this.cameras.main.startFollow(this.playerSprite, true);
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
      emitGameEvent(GameEvents.SHOW_MENU);
    });

    this.unsubMenuClose = onGameEvent(GameEvents.MENU_CLOSE, () => {
      this.menuActive = false;
    });
  }

  update(): void {
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

    if (moveDir) {
      // Call move every frame — Grid Engine handles continuous movement
      // and ignores calls while already moving in the same direction.
      // Obstructive-tile blocking is handled by the positionChangeStarted
      // interceptor (set up in create()), which stops the move if needed.
      const playerPos = this.gridEngine.getPosition("player");
      const target = this.getTileInDirection(playerPos, moveDir);
      if (isObstructiveBlocked(playerPos.x, playerPos.y, target.x, target.y, moveDir, MAUVILLE_OBSTRUCTIVE)) {
        this.gridEngine.turnTowards("player", moveDir);
      } else {
        this.gridEngine.move("player", moveDir);
      }
    }

    // flipX when facing right (left frames reused, mirrored).
    // Done per-frame because directionChanged() observable is unreliable.
    const facing = this.gridEngine.getFacingDirection("player");
    this.playerSprite.flipX = facing === Direction.RIGHT;

    // Y-sorted depth for player (between ground at 0 and foreground at 1000)
    this.playerSprite.setDepth(10 + this.playerSprite.y);
    this.npcSystem.updateDepth();

    // Toggle obstructive-tile overlays based on character positions
    this.updateObstructiveOverlays();
  }

  private async handleInteraction(): Promise<void> {
    if (this.isInteracting || this.dialogSystem.active) return;
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
   * These are hidden by default and become visible only when a character
   * is standing on the tile — showing the sign graphic ABOVE the character
   * so they appear to be standing behind it.
   */
  private createObstructiveOverlays(): void {
    const TILE = 16;
    // Load the composed tileset to extract the sign graphics
    const composedTex = this.textures.get("mauville_bottom");
    if (!composedTex) return;

    const map = this.make.tilemap({ key: "mauville" });
    const groundLayer = map.getLayer("Ground");
    if (!groundLayer) return;

    for (const tile of MAUVILLE_OBSTRUCTIVE) {
      const tileData = map.getTileAt(tile.x, tile.y, true, "Ground");
      if (!tileData) continue;

      // Get the metatile index (GID - firstgid)
      const gid = tileData.index;
      const localId = gid - 1; // bottom tileset firstgid is 1

      // Create a unique frame for this metatile from the composed tileset
      const columns = 16;
      const srcX = (localId % columns) * TILE;
      const srcY = Math.floor(localId / columns) * TILE;
      const frameKey = `obstructive_${tile.x}_${tile.y}`;
      composedTex.add(frameKey, 0, srcX, srcY, TILE, TILE);

      // Create the overlay sprite at the tile position, origin top-left
      const sprite = this.add.sprite(
        tile.x * TILE + TILE / 2,
        tile.y * TILE + TILE / 2,
        "mauville_bottom",
        frameKey,
      );
      // High depth so it always covers any character at the same or lower y
      sprite.setDepth(10 + (tile.y + 2) * TILE + 10);
      sprite.setVisible(false);
      this.obstructiveOverlays.set(`${tile.x},${tile.y}`, sprite);
    }
  }

  /** Show/hide obstructive overlay sprites based on whether a character is on them. */
  private updateObstructiveOverlays(): void {
    // Build set of occupied obstructive tiles.
    // Include BOTH the current tile AND the destination tile (when moving),
    // because positionChangeStarted fires before getPosition updates. This
    // ensures the overlay appears as soon as the character starts stepping
    // onto the tile, not a frame after they arrive.
    const occupied = new Set<string>();
    const charIds = this.gridEngine.getAllCharacters();
    for (const charId of charIds) {
      const pos = this.gridEngine.getPosition(charId);
      occupied.add(`${pos.x},${pos.y}`);
      // Also consider the tile being moved INTO
      if (this.gridEngine.isMoving(charId)) {
        const dir = this.gridEngine.getFacingDirection(charId);
        const target = this.getTileInDirection(pos, dir);
        occupied.add(`${target.x},${target.y}`);
      }
    }

    for (const [key, sprite] of this.obstructiveOverlays) {
      sprite.setVisible(occupied.has(key));
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
