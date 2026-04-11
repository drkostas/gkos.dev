import type { DialogSystem } from "./DialogSystem";
import { giveItem, hasItem } from "./GameSave";
import {
  POCKET_LABELS,
  getItemDef,
  type BagPocketId,
  type ItemDef,
} from "@/game/data/itemDefinitions";
import { sfx } from "./SoundManager";

/**
 * Map the pocket of the item being granted to the right jingle.
 * - blogs   → blog-specific berry chime
 * - tms     → TM fanfare
 * - papers / keyItems / anything else → standard item-get
 */
function jingleForPocket(pocket: BagPocketId): () => void {
  switch (pocket) {
    case "blogs":
      return sfx.blogGet;
    case "tms":
      return sfx.tmGet;
    default:
      return sfx.pickup;
  }
}

function playJingleFor(def: ItemDef): void {
  jingleForPocket(def.pocket)();
}

/**
 * ItemGift — the one blessed path for handing an item to the player.
 *
 * Every grant (hidden-item pickup, NPC gift, step milestone reward,
 * questionnaire reward, etc.) should go through `ItemGift.give()` so
 * the behavior is consistent:
 *
 *   1. Look up the item definition by id.
 *   2. Short-circuit if the player already owns it (duplicates don't
 *      trigger another dialog or jingle).
 *   3. Save it into the correct GameSave pocket array.
 *   4. Play `se_itemget.ogg` (sfx.pickup).
 *   5. Show a dialog: "[ITEM] added to [POCKET]!"
 */
export class ItemGift {
  /**
   * Give the item with the given id to the player. Returns `true` if
   * the item was newly granted (so the caller can decide whether to
   * suppress further interactions), or `false` if the id was invalid
   * or the player already had it.
   */
  static async give(
    dialogSystem: DialogSystem,
    itemId: string,
  ): Promise<boolean> {
    if (hasItem(itemId)) return false;

    const def = giveItem(itemId);
    if (!def) return false;

    playJingleFor(def);

    const pocketLabel = POCKET_LABELS[def.pocket];
    await dialogSystem.showDialog({
      lines: [`${def.name} added\nto ${pocketLabel}!`],
    });

    return true;
  }

  /**
   * Synchronous silent grant — used when a dialog is not appropriate
   * (e.g. a batch migration). Adds the item to the save and plays
   * the pocket-appropriate jingle but does NOT show a dialog.
   */
  static silent(itemId: string): boolean {
    if (hasItem(itemId)) return false;
    const def = giveItem(itemId);
    if (!def) return false;
    playJingleFor(def);
    return true;
  }

  /** Look up an item definition without granting it. */
  static describe(itemId: string) {
    return getItemDef(itemId);
  }
}
