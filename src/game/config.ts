import Phaser from "phaser";
import GridEngine from "grid-engine";
import { BootScene } from "./scenes/BootScene";
import { OverworldScene } from "./scenes/OverworldScene";

/** GBA native resolution */
export const GBA_WIDTH = 240;
export const GBA_HEIGHT = 160;

/**
 * Creates a Phaser game configuration targeting the given container element.
 * Uses GBA resolution (240x160) with pixel-art rendering and Grid Engine.
 */
export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GBA_WIDTH,
    height: GBA_HEIGHT,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
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
