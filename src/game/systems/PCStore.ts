/**
 * PCStore — manages items stored in the Pokemon Center PC.
 *
 * Some items start in the PC on first play. The player discovers the
 * PC inside the Pokemon Center and can withdraw items to their bag.
 *
 * Items with an `itemId` are backed by ITEM_DEFINITIONS and flow
 * through `giveItem()` on withdraw so they land in the correct
 * GameSave pocket array (e.g. tmsCollected). Legacy items without
 * an `itemId` fall back to PickupStore / recordPickup.
 *
 * Persists via localStorage so PC state survives page reloads.
 */

import { recordPickup, type CollectedItem } from "./PickupStore";
import { giveItem } from "./GameSave";
import { getItemDef } from "@/game/data/itemDefinitions";

const STORAGE_KEY = "gkos:explore:pc";
const INITIALIZED_KEY = "gkos:explore:pc-init";

/**
 * Build a PCItem from an ITEM_DEFINITIONS entry so the PC's display
 * fields (name, description, icon lookup) stay in sync with the Bag.
 */
function pcItemFromDef(itemId: string, pcId: string): PCItem {
  const def = getItemDef(itemId);
  return {
    id: pcId,
    itemId,
    name: def?.name ?? itemId,
    description: def?.description,
    // TMs, papers, etc. live in their pocket array via giveItem.
    // `pocket` is kept for PickupStore compat but unused for giveItem items.
    pocket: def?.pocket,
  };
}

/**
 * Items that start in the PC on a fresh save. The three foundational
 * TMs — Python, Git, Linux — are the skills every ML engineer begins
 * with, handed over by the nurse as the player's starting toolkit
 * before they buy higher-tier TMs from the MART.
 */
const DEFAULT_PC_ITEMS: PCItem[] = [
  pcItemFromDef("tm_python", "pc_tm_python"),
  pcItemFromDef("tm_git",    "pc_tm_git"),
  pcItemFromDef("tm_linux",  "pc_tm_linux"),
];

export interface PCItem {
  /** Unique ID for this PC-slot entry. */
  id: string;
  /**
   * Optional ITEM_DEFINITIONS key. When present, `withdrawItem` calls
   * `giveItem(itemId)` so the item flows into the correct GameSave
   * pocket array and participates in badge checks / bag display.
   */
  itemId?: string;
  /** Display name shown in the PC list. */
  name: string;
  /** URL opened when item is used from the Bag (legacy path only). */
  url?: string;
  /** Flavor text shown in the PC description box. */
  description?: string;
  /** Bag pocket the item goes to when withdrawn (legacy PickupStore path). */
  pocket?: string;
}

function loadPC(): PCItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePC(items: PCItem[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/** Initialize the PC with default items on first play. */
export function initPC(): void {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(INITIALIZED_KEY)) return;
  savePC([...DEFAULT_PC_ITEMS]);
  localStorage.setItem(INITIALIZED_KEY, "1");
}

/** Get all items currently stored in the PC. */
export function getPCItems(): PCItem[] {
  return loadPC();
}

/**
 * Withdraw an item from the PC into the bag.
 * Returns true if the item was found and withdrawn.
 *
 * Items with an `itemId` are routed through `giveItem()` so they
 * land in the correct GameSave pocket array (e.g. `tmsCollected`)
 * and trigger badge re-evaluation naturally via the bag systems.
 * Legacy items without `itemId` fall back to `recordPickup` so
 * they appear in PickupStore (used by the older contact-link path).
 */
export function withdrawItem(pcId: string): boolean {
  const items = loadPC();
  const idx = items.findIndex((it) => it.id === pcId);
  if (idx === -1) return false;

  const item = items[idx];

  if (item.itemId) {
    // Preferred path: item is backed by ITEM_DEFINITIONS.
    giveItem(item.itemId);
  } else {
    // Legacy path: store directly in PickupStore.
    const bagItem: CollectedItem = {
      name: item.name,
      url: item.url,
      pocket: item.pocket,
      description: item.description,
    };
    recordPickup(`pc:${item.id}`, bagItem);
  }

  // Remove from PC
  items.splice(idx, 1);
  savePC(items);

  return true;
}

/** Clear PC state (for "Clear Progress"). */
export function clearPC(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(INITIALIZED_KEY);
}
