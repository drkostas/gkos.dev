/**
 * PCStore — manages items stored in the Pokemon Center PC.
 *
 * Some items start in the PC on first play. The player discovers the
 * PC inside the Pokemon Center and can withdraw items to their bag.
 * Withdrawing removes the item from the PC and adds it to PickupStore
 * (which the Bag reads).
 *
 * Persists via localStorage so PC state survives page reloads.
 */

import { recordPickup, type CollectedItem } from "./PickupStore";

const STORAGE_KEY = "gkos:explore:pc";
const INITIALIZED_KEY = "gkos:explore:pc-init";

/** Items that start in the PC on a fresh save. */
const DEFAULT_PC_ITEMS: PCItem[] = [
  {
    id: "pc_resume",
    name: "RESUME.PDF",
    url: "/resume.pdf",
    description: "KOSTAS's CV.\nUSE to download the PDF.",
    pocket: "items",
  },
  {
    id: "pc_blog",
    name: "BLOG.URL",
    url: "/blog",
    description: "KOSTAS's technical blog.\nML, DevOps, and more.",
    pocket: "items",
  },
  {
    id: "pc_github",
    name: "GITHUB.URL",
    url: "https://github.com/drkostas",
    description: "Link to KOSTAS's GitHub\nprofile (8,300+ followers).",
    pocket: "items",
  },
  {
    id: "pc_linkedin",
    name: "LINKEDIN.URL",
    url: "https://linkedin.com/in/drkostas",
    description: "KOSTAS's professional\nLinkedIn profile.",
    pocket: "items",
  },
  {
    id: "pc_huggingface",
    name: "HUGGINGFACE.URL",
    url: "https://huggingface.co/drkostas",
    description: "KOSTAS's HuggingFace\nmodels and datasets.",
    pocket: "items",
  },
  {
    id: "pc_scholar",
    name: "SCHOLAR.URL",
    url: "https://scholar.google.com/citations?user=drkostas",
    description: "KOSTAS's Google Scholar\npublications page.",
    pocket: "items",
  },
];

export interface PCItem {
  /** Unique ID for this PC item. */
  id: string;
  /** Display name (e.g. "RESUME.PDF"). */
  name: string;
  /** URL opened when item is used from the Bag. */
  url?: string;
  /** Flavor text shown in the PC description box. */
  description?: string;
  /** Bag pocket the item goes to when withdrawn. */
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
 */
export function withdrawItem(itemId: string): boolean {
  const items = loadPC();
  const idx = items.findIndex((it) => it.id === itemId);
  if (idx === -1) return false;

  const item = items[idx];

  // Add to bag (PickupStore)
  const bagItem: CollectedItem = {
    name: item.name,
    url: item.url,
    pocket: item.pocket,
    description: item.description,
  };
  recordPickup(`pc:${item.id}`, bagItem);

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
