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

  constructor() {
    super({ key: "OverworldScene" });
  }

  create(): void {
    // ── Tilemap ──────────────────────────────────────────────
    const map = this.make.tilemap({ key: "mauville" });

    // The tileset name must match the "name" field in mauville.json's tilesets array.
    // The second argument is the Phaser cache key from BootScene's load.image().
    const tileset = map.addTilesetImage(
      "mauville_composed",
      "mauville_composed",
    );

    if (!tileset) {
      throw new Error(
        "OverworldScene: failed to add tileset 'mauville_composed'",
      );
    }

    // Create the ground layer (visible metatiles from Mauville City).
    map.createLayer("Ground", tileset);

    // Collision layer: Grid Engine reads ge_collide property from it.
    // Must be created so Grid Engine can inspect it, but hidden visually.
    const collisionLayer = map.createLayer("Collision", tileset);
    if (collisionLayer) {
      collisionLayer.setVisible(false);
    }

    // ── Player sprite ────────────────────────────────────────
    this.playerSprite = this.add.sprite(0, 0, "player");
    this.playerSprite.setDepth(10);

    // ── Grid Engine ──────────────────────────────────────────
    // Brendan has 9 frames in a single row (16x32 each):
    //   0-2: down, 3-5: up, 6-8: left
    // Right-facing reuses left frames with flipX.
    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: this.playerSprite,
          walkingAnimationMapping: {
            down: { leftFoot: 0, standing: 1, rightFoot: 2 },
            up: { leftFoot: 3, standing: 4, rightFoot: 5 },
            left: { leftFoot: 6, standing: 7, rightFoot: 8 },
            right: { leftFoot: 6, standing: 7, rightFoot: 8 },
          },
          startPosition: { x: 17, y: 15 },
          speed: 4,
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

    // Enter / Z key for interaction (talk to NPCs, read signs)
    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    );
    const zKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.Z,
    );

    // Bind interaction to both Enter and Z (JustDown checked in update)
    this.interactKey.on("down", () => this.handleInteraction());
    zKey.on("down", () => this.handleInteraction());

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

    // Flip sprite when facing right (left-facing frames reused).
    // Done every frame in update() rather than via directionChanged()
    // because the observable does not reliably fire for every character.
    const facing = this.gridEngine.getFacingDirection("player");
    this.playerSprite.flipX = facing === Direction.RIGHT;
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
