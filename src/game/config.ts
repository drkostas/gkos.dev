import Phaser from "phaser";
import GridEngine from "grid-engine";
import { BootScene } from "./scenes/BootScene";
import { OverworldScene } from "./scenes/OverworldScene";

/**
 * Integer pixel scale — every tile is rendered at PIXEL_SCALE × 16 pixels.
 * Larger values = bigger, chunkier pixels but fewer tiles on screen.
 * 3 = ~48px per tile, which feels right for modern screens.
 */
export const PIXEL_SCALE = 3;

/**
 * Creates a Phaser game config that fills the entire browser window.
 * The game canvas resizes dynamically with the window, showing more of
 * the map on wider screens while keeping tiles at a crisp integer scale.
 */
export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    // Use the window size for the game viewport. Dividing by PIXEL_SCALE
    // gives us the "native" resolution in map pixels (every 3 screen
    // pixels = 1 map pixel). Grid Engine and tile math work in native px.
    width: Math.floor(window.innerWidth / PIXEL_SCALE),
    height: Math.floor(window.innerHeight / PIXEL_SCALE),
    pixelArt: true,
    scale: {
      // RESIZE: Phaser automatically resizes the canvas and game size
      // when the window changes. The scene's camera handles the new bounds.
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      // Zoom scales rendering: 3 means every game pixel is drawn as 3x3 screen pixels.
      zoom: PIXEL_SCALE,
    },
    plugins: {
      scene: [
        {
          key: "gridEngine",
          plugin: GridEngine,
          mapping: "gridEngine",
        },
      ],
    },
    scene: [BootScene, OverworldScene],
  };
}
