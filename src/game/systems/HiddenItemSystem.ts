import type { DialogSystem } from "./DialogSystem";
import { findHiddenItemAt } from "@/game/data/hiddenItems";
import { hasItem } from "./GameSave";
import { ItemGift } from "./ItemGift";

/**
 * HiddenItemSystem — tile-coordinate hidden item pickup.
 *
 * Usage (from a Phaser scene):
 *
 *   const picked = await HiddenItemSystem.tryPickup(
 *     this.dialogSystem,
 *     "overworld",
 *     facingTile.x,
 *     facingTile.y,
 *   );
 *   if (picked) return; // consume the A press
 *
 * Returns `true` if a hidden item existed and was successfully
 * granted (dialog shown, sound played), `false` otherwise so the
 * caller can fall through to NPC / sign checks.
 *
 * Idempotent: once the referenced item id is in GameSave, pressing
 * A on the same tile again is a no-op. No duplicate dialog, no
 * duplicate entry in the bag.
 */
export class HiddenItemSystem {
  static async tryPickup(
    dialogSystem: DialogSystem,
    map: string,
    x: number,
    y: number,
  ): Promise<boolean> {
    const tile = findHiddenItemAt(map, x, y);
    if (!tile) return false;

    // Already collected? Silently ignore so the player can walk past.
    if (hasItem(tile.itemId)) return false;

    // Grant via the single blessed path: save + sfx + dialog.
    return await ItemGift.give(dialogSystem, tile.itemId);
  }
}
