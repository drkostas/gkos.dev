import { Direction } from "grid-engine";
import type { SignDefinition } from "@/game/types/npc";
import { DialogSystem } from "@/game/systems/DialogSystem";

/**
 * SignSystem — handles sign (bg_event) interactions on the overworld.
 *
 * Signs are not physical entities in Grid Engine — they are just
 * tile positions. When the player presses the interact key facing
 * a sign tile, we show the sign text via DialogSystem.
 */
export class SignSystem {
  private dialogSystem: DialogSystem;
  private signs: SignDefinition[];
  /** Fast lookup: "x,y" → SignDefinition */
  private signMap: Map<string, SignDefinition>;

  constructor(dialogSystem: DialogSystem, signs: SignDefinition[]) {
    this.dialogSystem = dialogSystem;
    this.signs = signs;
    this.signMap = new Map();
    for (const sign of this.signs) {
      this.signMap.set(`${sign.position.x},${sign.position.y}`, sign);
    }
  }

  /**
   * Attempt to read a sign at the tile the player is facing.
   * Returns true if a sign was found and dialog was triggered.
   */
  async tryInteract(
    playerPos: { x: number; y: number },
    playerFacing: Direction,
  ): Promise<boolean> {
    const target = this.getTileInFront(playerPos, playerFacing);
    const key = `${target.x},${target.y}`;
    const sign = this.signMap.get(key);

    if (sign) {
      await this.dialogSystem.showDialog({ lines: sign.text });
      return true;
    }
    return false;
  }

  private getTileInFront(
    pos: { x: number; y: number },
    facing: Direction,
  ): { x: number; y: number } {
    switch (facing) {
      case Direction.UP:
        return { x: pos.x, y: pos.y - 1 };
      case Direction.DOWN:
        return { x: pos.x, y: pos.y + 1 };
      case Direction.LEFT:
        return { x: pos.x - 1, y: pos.y };
      case Direction.RIGHT:
        return { x: pos.x + 1, y: pos.y };
      default:
        return pos;
    }
  }
}
