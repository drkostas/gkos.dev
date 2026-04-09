import Phaser from "phaser";
import { Direction } from "grid-engine";
import type GridEngine from "grid-engine";
import { DialogSystem } from "@/game/systems/DialogSystem";
import { NPCSystem } from "@/game/systems/NPCSystem";
import { SignSystem } from "@/game/systems/SignSystem";
import { MAUVILLE_NPCS, MAUVILLE_SIGNS } from "@/game/data/npcs";
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
          offsetY: -8,
        },
      ],
    });

    // NOTE: directionChanged() observable is unreliable (doesn't fire consistently).
    // flipX is handled per-frame in update() instead.

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

    // Hold Shift to run — swap speed AND animation mapping
    const wantsRun = this.shiftKey.isDown;
    if (wantsRun !== this.isRunning) {
      this.isRunning = wantsRun;
      this.gridEngine.setSpeed("player", wantsRun ? OverworldScene.RUN_SPEED : OverworldScene.WALK_SPEED);
      this.gridEngine.setWalkingAnimationMapping("player", wantsRun ? RUN_ANIM : WALK_ANIM);
    }

    const { cursors } = this;
    if (cursors.left.isDown) {
      this.gridEngine.move("player", Direction.LEFT);
    } else if (cursors.right.isDown) {
      this.gridEngine.move("player", Direction.RIGHT);
    } else if (cursors.up.isDown) {
      this.gridEngine.move("player", Direction.UP);
    } else if (cursors.down.isDown) {
      this.gridEngine.move("player", Direction.DOWN);
    }

    // flipX when facing right (left frames reused, mirrored).
    // Done per-frame because directionChanged() observable is unreliable.
    const facing = this.gridEngine.getFacingDirection("player");
    this.playerSprite.flipX = facing === Direction.RIGHT;

    // Y-sorted depth for player (between ground at 0 and foreground at 1000)
    this.playerSprite.setDepth(10 + this.playerSprite.y);
    this.npcSystem.updateDepth();
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

        // Create sprite at the tile's world position
        const sprite = this.add.sprite(tx * TILE + TILE / 2, ty * TILE + TILE / 2, "mauville_foreground", frameKey);

        // Y-sorted depth: foreground tiles use the BOTTOM edge of the tile (ty+1)
        // so they cover characters whose Y is at or above this tile row.
        // The +8 offset ensures the foreground wins over characters at the same Y.
        sprite.setDepth(10 + (ty + 1) * TILE + 8);
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
