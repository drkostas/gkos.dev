import Phaser from "phaser";
import GridEngine from "grid-engine";
import { BootScene } from "./scenes/BootScene";
import { OverworldScene } from "./scenes/OverworldScene";

/** Pixel scale factor — how many screen pixels per game pixel. */
export const PIXEL_SCALE = 3;

/**
 * Creates a Phaser game config that fills the entire browser window.
 * Uses Scale.RESIZE so the canvas follows the window size. Camera zoom
 * is applied in the scene to keep tiles at a crisp integer pixel scale.
 */
export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: window.innerWidth,
    height: window.innerHeight,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
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
