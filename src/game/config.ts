import Phaser from "phaser";
import GridEngine from "grid-engine";
import { BootScene } from "./scenes/BootScene";
import { OverworldScene } from "./scenes/OverworldScene";
import { InteriorScene } from "./scenes/InteriorScene";
import { isTouchDevice } from "./systems/TouchInput";

/** Pixel scale factor — how many screen pixels per game pixel. */
export const PIXEL_SCALE = 3;

/**
 * Camera zoom on touch devices — lower than desktop so the player
 * sees more tiles on a smaller screen. The player sprite is smaller
 * but the wider viewport compensates. Scenes pick the right value
 * via `getSceneZoom()` when configuring the camera.
 */
export const MOBILE_PIXEL_SCALE = 2;

/**
 * Camera zoom when a touch device is held in portrait. The viewport
 * is narrower than landscape so we zoom out further to keep a
 * reasonable number of tiles visible horizontally.
 */
export const MOBILE_PORTRAIT_PIXEL_SCALE = 1.5;

/**
 * Resolve the correct camera zoom for the current device + orientation.
 * Called once in each scene's `create()` and again from a resize
 * listener so rotating the phone re-zooms without a reload.
 */
export function getSceneZoom(): number {
  if (typeof window === "undefined") return PIXEL_SCALE;
  if (!isTouchDevice()) return PIXEL_SCALE;
  const portrait = window.innerHeight > window.innerWidth;
  return portrait ? MOBILE_PORTRAIT_PIXEL_SCALE : MOBILE_PIXEL_SCALE;
}

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
    scene: [BootScene, OverworldScene, InteriorScene],
  };
}
