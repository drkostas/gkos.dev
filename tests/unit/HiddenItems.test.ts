import { describe, it, expect } from "vitest";
import { HIDDEN_ITEMS } from "@/game/data/hiddenItems";
import { ITEM_DEFINITIONS } from "@/game/data/itemDefinitions";

/**
 * Hidden item coverage — criterion #1 (plan §Hidden items
 * "2 hidden key + 4 hidden TMs = 6"). The file ships with both
 * shapes: some entries hide a key_* item and some hide a tm_*.
 * This regression suite locks:
 *  - every entry references a known ITEM_DEFINITIONS id
 *  - every entry has a unique id (pickup tracking key)
 *  - at least 4 hidden TMs exist (design target)
 *  - at least 2 hidden key items exist (design target)
 *  - positions are unique per map (no two hidden tiles stacked)
 */

describe("Content — HIDDEN_ITEMS", () => {
  it("every entry references a real item", () => {
    for (const h of HIDDEN_ITEMS) {
      expect(ITEM_DEFINITIONS[h.itemId]).toBeDefined();
    }
  });

  it("every id is unique", () => {
    const ids = HIDDEN_ITEMS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("at least 4 hidden TMs (design target)", () => {
    const tms = HIDDEN_ITEMS.filter((h) => h.itemId.startsWith("tm_"));
    expect(tms.length).toBeGreaterThanOrEqual(4);
  });

  it("at least 2 hidden key items (design target)", () => {
    const keys = HIDDEN_ITEMS.filter((h) => h.itemId.startsWith("key_"));
    expect(keys.length).toBeGreaterThanOrEqual(2);
  });

  it("positions are unique per map (no stacked tiles)", () => {
    const seen = new Set<string>();
    for (const h of HIDDEN_ITEMS) {
      const k = `${h.map}:${h.x},${h.y}`;
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });
});
