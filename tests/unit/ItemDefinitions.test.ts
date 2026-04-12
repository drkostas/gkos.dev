import { describe, it, expect } from "vitest";
import {
  ITEM_DEFINITIONS,
  getItemsByPocket,
  getItemDef,
} from "@/game/data/itemDefinitions";
import { STEP_MILESTONES } from "@/game/systems/StepMilestones";

/**
 * Content regression tests for the 4 bag pockets + shop catalog.
 *
 * Keeps the criterion #8 content counts honest: 10 papers, 20 TMs,
 * 7 key items, ≥1 blog post. Every ITEM_DEFINITIONS entry must have
 * a valid pocket, and every shop entry must reference a known item id.
 */

describe("Content — ITEM_DEFINITIONS", () => {
  describe("Pocket totals match design doc §2", () => {
    it("10 papers (6 gym + 4 route = PUBLICATION badge total)", () => {
      const papers = getItemsByPocket("papers");
      expect(papers.length).toBe(10);
    });

    it("20 TMs (ENGINEER badge total)", () => {
      const tms = getItemsByPocket("tms");
      expect(tms.length).toBe(20);
    });

    it("at least 8 key items (CONNECTED + PHONE.NUMBER for CHAMPION)", () => {
      const keys = getItemsByPocket("keyItems");
      expect(keys.length).toBeGreaterThanOrEqual(8);
    });

    it("key_phone_number exists (CHAMPION badge trigger)", () => {
      const def = getItemDef("key_phone_number");
      expect(def).toBeDefined();
      expect(def?.name).toBe("PHONE.NUMBER");
      expect(def?.pocket).toBe("keyItems");
    });

    it("10 blog posts (BLOGGER badge design target)", () => {
      const blogs = getItemsByPocket("blogs");
      expect(blogs.length).toBeGreaterThanOrEqual(10);
    });

    it("every blog post has a non-placeholder name + description", () => {
      const blogs = getItemsByPocket("blogs");
      for (const b of blogs) {
        expect(b.name.length).toBeGreaterThan(3);
        expect(b.description.length).toBeGreaterThan(10);
        // Avoid the generic "coming soon" / "tbd" placeholder copy
        const joined = (b.name + " " + b.description).toLowerCase();
        expect(joined).not.toContain("placeholder");
        expect(joined).not.toContain("tbd");
        expect(joined).not.toContain("coming soon");
        expect(joined).not.toContain("lorem");
      }
    });

    it("every blog post has a unique id", () => {
      const blogs = getItemsByPocket("blogs");
      const ids = blogs.map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("Data integrity", () => {
    it("every entry's key matches its id field", () => {
      for (const [key, def] of Object.entries(ITEM_DEFINITIONS)) {
        expect(def.id).toBe(key);
      }
    });

    it("every paper has a unique venue URL", () => {
      const papers = getItemsByPocket("papers");
      const urls = papers.map((p) => p.url);
      expect(urls.every((u) => typeof u === "string" && u.length > 0)).toBe(
        true,
      );
      // Ensure no two papers share the same URL (the pre-fix stub had
      // all 5 point at one scholar.google.com profile).
      const unique = new Set(urls);
      expect(unique.size).toBe(papers.length);
    });

    it("every item has a description and icon", () => {
      for (const def of Object.values(ITEM_DEFINITIONS)) {
        expect(def.description.length).toBeGreaterThan(0);
        expect(def.icon || "").toMatch(/\/game\/ui\/bag\//);
      }
    });
  });

  describe("TMs ↔ STEP_MILESTONES consistency", () => {
    it("every shop entry points to a real item id", () => {
      for (const m of STEP_MILESTONES) {
        expect(getItemDef(m.itemId)).toBeDefined();
        expect(getItemDef(m.itemId)?.pocket).toBe("tms");
      }
    });

    it("shop has exactly 16 buyable TMs", () => {
      // 3 starter TMs (python/git/linux) + 1 questionnaire TM
      // (tm_portfolio) + 16 shop TMs = 20 total for the ENGINEER
      // badge condition. Shop count is independently asserted so a
      // future refactor that moves a TM out of the shop doesn't
      // silently break the badge math.
      expect(STEP_MILESTONES.length).toBe(16);
    });

    it("shop prices are monotonically non-decreasing", () => {
      for (let i = 1; i < STEP_MILESTONES.length; i++) {
        expect(STEP_MILESTONES[i].steps).toBeGreaterThanOrEqual(
          STEP_MILESTONES[i - 1].steps,
        );
      }
    });

    it("shop names match the display name on the ItemDef", () => {
      for (const m of STEP_MILESTONES) {
        const def = getItemDef(m.itemId)!;
        // `def.name` is like "TM NUMPY", `m.tm` is "NUMPY"
        expect(def.name).toBe("TM " + m.tm);
      }
    });
  });

  describe("Paper venue URL regression", () => {
    it("no paper points at a bare scholar.google.com profile", () => {
      // The old stub used
      // https://scholar.google.com/citations?user=drkostas for every
      // paper. Real papers use arxiv, NeurIPS, CVF, MDPI, or
      // per-citation scholar URLs.
      const papers = getItemsByPocket("papers");
      for (const p of papers) {
        expect(p.url).not.toBe(
          "https://scholar.google.com/citations?user=drkostas",
        );
      }
    });
  });
});
