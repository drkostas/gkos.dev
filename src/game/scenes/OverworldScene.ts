import Phaser from "phaser";
import { Direction } from "grid-engine";
import type GridEngine from "grid-engine";

/**
 * OverworldScene — the main playable scene.
 *
 * Creates the tilemap, spawns the player sprite, initialises Grid Engine
 * for grid-based movement, and wires up arrow-key controls.
 */
export class OverworldScene extends Phaser.Scene {
  /** Injected by Grid Engine plugin (see config.ts mapping) */
  declare gridEngine: GridEngine;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: "OverworldScene" });
  }

  create(): void {
    // ── Tilemap ──────────────────────────────────────────────
    const map = this.make.tilemap({ key: "mauville" });
    const tileset = map.addTilesetImage(
      "placeholder-tiles",
      "placeholder-tiles",
    );

    if (!tileset) {
      throw new Error(
        "OverworldScene: failed to add tileset 'placeholder-tiles'",
      );
    }

    // Create layers defined in the Tiled JSON.
    // The layer names must match those in the exported map.
    map.createLayer("Ground", tileset);
    map.createLayer("World", tileset);

    // ── Player sprite ────────────────────────────────────────
    const playerSprite = this.add.sprite(0, 0, "player");
    playerSprite.setDepth(10);

    // ── Grid Engine ──────────────────────────────────────────
    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: playerSprite,
          walkingAnimationMapping: 0,
          startPosition: { x: 20, y: 10 },
          speed: 4,
        },
      ],
    });

    // ── Camera ───────────────────────────────────────────────
    this.cameras.main.startFollow(playerSprite, true);
    this.cameras.main.setBounds(
      0,
      0,
      map.widthInPixels,
      map.heightInPixels,
    );
    this.cameras.main.setRoundPixels(true);

    // ── Input ────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  update(): void {
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
  }
}
