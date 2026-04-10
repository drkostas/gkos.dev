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
 *
 * Pixel-perfect settings (pixelArt + roundPixels + antialias:false) are
 * important to avoid vertical/horizontal "bleed" lines at tile edges.
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
    antialias: false,
    roundPixels: true,
    render: {
      pixelArt: true,
      antialias: false,
      antialiasGL: false,
      roundPixels: true,
    },
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
