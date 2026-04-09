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
    const playerSprite = this.add.sprite(0, 0, "player");
    playerSprite.setDepth(10);

    // ── Grid Engine ──────────────────────────────────────────
    // Brendan has 9 frames in a single row (16x32 each):
    //   0-2: down, 3-5: up, 6-8: left
    // Right-facing reuses left frames with flipX.
    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: playerSprite,
          walkingAnimationMapping: {
            down: { leftFoot: 0, standing: 1, rightFoot: 2 },
            up: { leftFoot: 3, standing: 4, rightFoot: 5 },
            left: { leftFoot: 6, standing: 7, rightFoot: 8 },
            right: { leftFoot: 6, standing: 7, rightFoot: 8 },
          },
          startPosition: { x: 17, y: 14 },
          speed: 4,
          offsetY: -8,
        },
      ],
    });

    // Flip sprite horizontally when facing right (reuses left-facing frames)
    this.gridEngine.directionChanged().subscribe(({ direction }) => {
      playerSprite.flipX = direction === Direction.RIGHT;
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
