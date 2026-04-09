import Phaser from "phaser";
import { Direction } from "grid-engine";
import type GridEngine from "grid-engine";
import { DialogSystem } from "@/game/systems/DialogSystem";
import { NPCSystem } from "@/game/systems/NPCSystem";
import { SignSystem } from "@/game/systems/SignSystem";
import { MAUVILLE_NPCS, MAUVILLE_SIGNS } from "@/game/data/npcs";
import { GameEvents, emitGameEvent, onGameEvent } from "@/game/EventBridge";

/**
 * OverworldScene — the main playable scene.
 *
 * Creates the tilemap, spawns the player sprite, initialises Grid Engine
 * for grid-based movement, and wires up arrow-key controls.
 * Also initialises NPC and sign systems for interaction.
 */
export class OverworldScene extends Phaser.Scene {
  /** Injected by Grid Engine plugin (see config.ts mapping) */
  declare gridEngine: GridEngine;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private dialogSystem!: DialogSystem;
  private npcSystem!: NPCSystem;
  private signSystem!: SignSystem;
  /** Guards against multiple simultaneous interactions. */
  private isInteracting = false;
  /** True while the start menu overlay is open — blocks player movement. */
  private menuActive = false;
  /** Cleanup function for MENU_CLOSE event listener. */
  private unsubMenuClose: (() => void) | null = null;

  /** Normal and running speeds (tiles per second). */
  private static readonly WALK_SPEED = 4;
  private static readonly RUN_SPEED = 8;

  constructor() {
    super({ key: "OverworldScene" });
  }

  create(): void {
    // ── Tilemap ──────────────────────────────────────────────
    const map = this.make.tilemap({ key: "mauville" });

    // Two tilesets: bottom layer (ground) and top layer (above player).
    const bottomTileset = map.addTilesetImage(
      "mauville_bottom",
      "mauville_bottom",
    );
    const topTileset = map.addTilesetImage(
      "mauville_top",
      "mauville_top",
    );

    if (!bottomTileset) {
      throw new Error("OverworldScene: failed to add tileset 'mauville_bottom'");
    }
    if (!topTileset) {
      throw new Error("OverworldScene: failed to add tileset 'mauville_top'");
    }

    // Ground layer — renders BELOW the player (depth 0).
    const groundLayer = map.createLayer("Ground", bottomTileset);
    if (groundLayer) {
      groundLayer.setDepth(0);
    }

    // Above layer — renders ABOVE the player (depth 100).
    // This creates the pseudo-3D effect: treetops, roof overhangs, etc.
    const aboveLayer = map.createLayer("Above", topTileset);
    if (aboveLayer) {
      aboveLayer.setDepth(100);
    }

    // Collision layer: Grid Engine reads ge_collide property from it.
    // Must be created so Grid Engine can inspect it, but hidden visually.
    const collisionLayer = map.createLayer("Collision", bottomTileset);
    if (collisionLayer) {
      collisionLayer.setVisible(false);
    }

    // ── Player sprite ────────────────────────────────────────
    this.playerSprite = this.add.sprite(0, 0, "player");

    // ── Grid Engine ──────────────────────────────────────────
    // Brendan spritesheet is now a 3x4 grid (48x128):
    //   Row 0=down, Row 1=left, Row 2=right, Row 3=up
    //   Each row: [walk1, stand, walk2]
    // walkingAnimationMapping: 0 lets Grid Engine handle all frames + flipX natively.
    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: this.playerSprite,
          walkingAnimationMapping: 0,
          startPosition: { x: 20, y: 9 },
          speed: OverworldScene.WALK_SPEED,
          offsetY: -8,
        },
      ],
    });

    // ── Systems ──────────────────────────────────────────────
    this.dialogSystem = new DialogSystem();
    this.npcSystem = new NPCSystem(
      this,
      this.gridEngine,
      this.dialogSystem,
      MAUVILLE_NPCS,
    );
    this.npcSystem.init();
    this.signSystem = new SignSystem(this.dialogSystem, MAUVILLE_SIGNS);

    // ── Camera ───────────────────────────────────────────────
    this.cameras.main.startFollow(this.playerSprite, true);
    this.cameras.main.setBounds(
      0,
      0,
      map.widthInPixels,
      map.heightInPixels,
    );
    this.cameras.main.setRoundPixels(true);

    // ── Input ────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Interaction keys: Enter, Z, and Space
    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    );
    const zKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.Z,
    );
    const spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );

    // Bind interaction to Enter, Z, and Space
    this.interactKey.on("down", () => this.handleInteraction());
    zKey.on("down", () => this.handleInteraction());
    spaceKey.on("down", () => this.handleInteraction());

    // Shift key for running (hold to run, release to walk)
    this.shiftKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    );

    // ── Start Menu (Escape key) ─────────────────────────────────
    const escKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );
    escKey.on("down", () => {
      // Don't open menu if dialog is active or menu is already open
      if (this.dialogSystem.active || this.menuActive) return;
      this.menuActive = true;
      emitGameEvent(GameEvents.SHOW_MENU);
    });

    // Listen for menu close from the React overlay
    this.unsubMenuClose = onGameEvent(GameEvents.MENU_CLOSE, () => {
      this.menuActive = false;
    });
  }

  update(): void {
    // Block all player movement while dialog or menu is active
    if (this.dialogSystem.active || this.menuActive) return;

    // Hold Shift to run
    const speed = this.shiftKey.isDown
      ? OverworldScene.RUN_SPEED
      : OverworldScene.WALK_SPEED;
    this.gridEngine.setSpeed("player", speed);

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

    // Y-sorted depth for characters: between Ground (0) and Above (100).
    // Depth 1-99 range ensures characters render above ground but below treetops/roofs.
    const playerDepth = 1 + (this.playerSprite.y / 1000) * 98;
    this.playerSprite.setDepth(Math.min(99, Math.max(1, playerDepth)));
    this.npcSystem.updateDepth();
  }

  /** Handle Enter/Z press: try NPC interaction, then sign interaction. */
  private async handleInteraction(): Promise<void> {
    // Don't stack interactions
    if (this.isInteracting || this.dialogSystem.active) return;

    this.isInteracting = true;
    try {
      const playerPos = this.gridEngine.getPosition("player");
      const playerFacing = this.gridEngine.getFacingDirection("player");

      // Try NPC first, then sign
      const npcHit = await this.npcSystem.tryInteract(
        playerPos,
        playerFacing,
      );
      if (!npcHit) {
        await this.signSystem.tryInteract(playerPos, playerFacing);
      }
    } finally {
      this.isInteracting = false;
    }
  }

  /** Clean up systems on scene shutdown. */
  shutdown(): void {
    this.npcSystem?.destroy();
    this.dialogSystem?.destroy();
    if (this.unsubMenuClose) {
      this.unsubMenuClose();
      this.unsubMenuClose = null;
    }
  }
}
