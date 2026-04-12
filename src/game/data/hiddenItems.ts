/**
 * Hidden Items data map.
 *
 * Each entry binds a specific tile coordinate on a specific map to
 * an ITEM ID in itemDefinitions.ts. Pressing A while facing that
 * tile grants that item to the player via ItemGift.give() — which
 * routes it to the correct bag pocket, plays the jingle, and shows
 * a "<ITEM> added to <POCKET>!" dialog.
 *
 * Hidden items are TRULY hidden — we never place a sprite on the
 * tile. The `placement` field is metadata for the author so we know
 * what environmental feature (rock / flower / grass patch) the item
 * is meant to be hiding next to. It does not affect rendering.
 *
 * `map` is:
 *   - `"overworld"` for the main mauville outdoor map
 *   - the interior key (`"pokecenter"`, `"mart"`, `"gym"`) for indoors
 */

export type HiddenItemDifficulty = "easy" | "medium" | "hard";
export type HiddenItemPlacement = "rock" | "flower" | "grass";

export interface HiddenItemTile {
  /** Unique id used for pickup-tracking persistence. */
  id: string;
  /** Map key: `"overworld"` or an interior key. */
  map: string;
  /** Tile coordinates on that map. */
  x: number;
  y: number;
  /** Id referencing ITEM_DEFINITIONS. */
  itemId: string;
  /** How hard the item is to find. Currently just metadata. */
  difficulty: HiddenItemDifficulty;
  /** What environmental feature hides the item. Author metadata. */
  placement: HiddenItemPlacement;
}

export const HIDDEN_ITEMS: HiddenItemTile[] = [
  // ── TEST ROCK — directly south of the overworld spawn (72, 58)
  //   so the player can walk up and press A immediately after load.
  {
    id: "ow_test_rock",
    map: "overworld",
    x: 72,
    y: 59,
    itemId: "key_rock_potion",
    difficulty: "easy",
    placement: "rock",
  },

  // ── EASY — rocks on the overworld ──────────────────────────
  {
    id: "ow_rock_repel",
    map: "overworld",
    x: 30,
    y: 55,
    itemId: "key_scholar",
    difficulty: "easy",
    placement: "rock",
  },

  // ── MEDIUM — flowers ──────────────────────────────────────
  {
    id: "ow_flower_linkedin",
    map: "overworld",
    x: 55,
    y: 35,
    itemId: "key_linkedin",
    difficulty: "medium",
    placement: "flower",
  },
  {
    id: "ow_flower_huggingface",
    map: "overworld",
    x: 20,
    y: 28,
    itemId: "key_huggingface",
    difficulty: "medium",
    placement: "flower",
  },

  // ── HARD — hidden in grass ────────────────────────────────
  {
    id: "ow_grass_resume",
    map: "overworld",
    x: 65,
    y: 42,
    itemId: "key_resume",
    difficulty: "hard",
    placement: "grass",
  },

  // ── Indoor: mart counter hidden GitHub link ──────────────
  {
    id: "mart_hidden_github",
    map: "mart",
    x: 8,
    y: 2,
    itemId: "key_github",
    difficulty: "medium",
    placement: "flower",
  },

  // ── HIDDEN TMs — 4 ML tools buried in scenery (plan §Hidden
  //   items "2 hidden key + 4 hidden TMs = 6"). Spread across the
  //   routes so the player has a reason to explore beyond
  //   Mauville proper. Each TM is thematically matched to the
  //   route's vibe (northern research hill → NumPy, south cycling
  //   road → Ray Tune, etc.). Placements use the existing scenic
  //   features so the tiles are approachable without requiring
  //   new art.
  {
    // Route 111 north research hill — NumPy hides under a rock
    id: "r111_rock_numpy",
    map: "overworld",
    x: 67,
    y: 27,
    itemId: "tm_numpy",
    difficulty: "medium",
    placement: "rock",
  },
  {
    // Route 110 south cycling road — Ray Tune in the grass
    id: "r110_grass_ray",
    map: "overworld",
    x: 62,
    y: 84,
    itemId: "tm_ray",
    difficulty: "hard",
    placement: "grass",
  },
  {
    // Route 117 west near day-care — HuggingFace flower
    id: "r117_flower_hf",
    map: "overworld",
    x: 38,
    y: 58,
    itemId: "tm_huggingface",
    difficulty: "medium",
    placement: "flower",
  },
  {
    // Route 118 east near fisherman — Pandas under a rock
    id: "r118_rock_pandas",
    map: "overworld",
    x: 100,
    y: 60,
    itemId: "tm_pandas",
    difficulty: "easy",
    placement: "rock",
  },
];

/** Look up a hidden item by map + tile coordinate. */
export function findHiddenItemAt(
  map: string,
  x: number,
  y: number,
): HiddenItemTile | undefined {
  return HIDDEN_ITEMS.find(
    (it) => it.map === map && it.x === x && it.y === y,
  );
}
