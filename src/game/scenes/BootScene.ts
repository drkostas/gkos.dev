import Phaser from "phaser";

/**
 * BootScene — preloads all placeholder assets then hands off to OverworldScene.
 *
 * Asset paths reference files created by Task 4 (placeholder tilemap).
 * The game will show a black screen until those assets exist on disk.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Tileset image (single PNG with all tile graphics)
    this.load.image(
      "placeholder-tiles",
      "/assets/game/tilesets/placeholder-tiles.png",
    );

    // Tiled JSON map exported from Tiled editor
    this.load.tilemapTiledJSON(
      "mauville",
      "/assets/game/maps/mauville.json",
    );

    // Player spritesheet — 16x16 frames, 4 directions x 3 walk frames
    this.load.spritesheet("player", "/assets/game/sprites/player.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    this.scene.start("OverworldScene");
  }
}
