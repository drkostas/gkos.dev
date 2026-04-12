import { describe, it, expect } from "vitest";
import { LOG_ENTRIES } from "@/game/data/researchLog";

/**
 * Research Log regression tests for criterion #8 — every Research
 * Log entry has real content that reads like a human wrote it.
 */

describe("Content — Research Log", () => {
  it("has at least 6 entries", () => {
    expect(LOG_ENTRIES.length).toBeGreaterThanOrEqual(6);
  });

  it("every entry has a unique number", () => {
    const numbers = LOG_ENTRIES.map((e) => e.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("entry numbers are 1-based and sequential", () => {
    LOG_ENTRIES.forEach((e, i) => {
      expect(e.number).toBe(i + 1);
    });
  });

  it("every entry has a non-placeholder title", () => {
    for (const e of LOG_ENTRIES) {
      expect(e.title.length).toBeGreaterThan(5);
      expect(e.title.toLowerCase()).not.toContain("placeholder");
      expect(e.title.toLowerCase()).not.toContain("stub");
      expect(e.title.toLowerCase()).not.toContain("tbd");
      expect(e.title.toLowerCase()).not.toContain("lorem");
    }
  });

  it("every entry has at least 4 body lines of real content", () => {
    for (const e of LOG_ENTRIES) {
      expect(e.text.length).toBeGreaterThanOrEqual(4);
      // Each line should be a non-empty sentence fragment
      for (const line of e.text) {
        expect(line.length).toBeGreaterThan(10);
        expect(line.toLowerCase()).not.toContain("lorem");
        expect(line.toLowerCase()).not.toContain("placeholder");
      }
    }
  });

  it("thresholds are monotonically increasing", () => {
    for (let i = 1; i < LOG_ENTRIES.length; i++) {
      expect(LOG_ENTRIES[i].threshold).toBeGreaterThanOrEqual(
        LOG_ENTRIES[i - 1].threshold,
      );
    }
  });

  it("first entry unlocks at ≤5 discoveries (early reward)", () => {
    expect(LOG_ENTRIES[0].threshold).toBeLessThanOrEqual(5);
  });

  it("last entry requires ≤50 discoveries (reachable in one run)", () => {
    const last = LOG_ENTRIES[LOG_ENTRIES.length - 1];
    expect(last.threshold).toBeLessThanOrEqual(50);
  });

  it("every entry mentions real-life context (Greek/UTK/Amazon/PhD/etc)", () => {
    const realityMarkers = [
      "Greece",
      "Greek",
      "Tennessee",
      "UTK",
      "Bredesen",
      "Amazon",
      "PhD",
      "NeurIPS",
      "Thessaloniki",
      "FleetSmart",
      "MEDiC",
      "MaskDistill",
      "Cross-Scale",
      "GitHub",
      "followers",
      "Hairong",
    ];
    const contentMatches = LOG_ENTRIES.map((e) => {
      const joined = e.text.join(" ") + " " + e.title;
      return realityMarkers.some((m) => joined.includes(m));
    });
    // At least 5 of 6 entries should reference real-life content
    const realEntries = contentMatches.filter(Boolean).length;
    expect(realEntries).toBeGreaterThanOrEqual(LOG_ENTRIES.length - 1);
  });
});
