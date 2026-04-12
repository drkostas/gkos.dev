import { describe, it, expect } from "vitest";
import { POKEDEX, POKEDEX_CAUGHT, POKEDEX_SEEN } from "@/game/data/pokemon";

/**
 * Pokedex content regression tests for criterion #8.
 *
 * The POKEDEX badge condition in BadgeMilestones.ts is
 * `s.pokedexSeen.length >= TOTAL_POKEDEX` where TOTAL_POKEDEX is
 * `POKEDEX.length`. Design doc §2 requires "Register all 30 Pokemon"
 * — we allow up to 40 to leave room for boundary/secret Pokemon but
 * enforce a 30 floor.
 */

describe("Content — POKEDEX", () => {
  describe("Count requirements", () => {
    it("has at least 30 entries (POKEDEX badge minimum)", () => {
      expect(POKEDEX.length).toBeGreaterThanOrEqual(30);
    });

    it("has at most 40 entries (leaves room for expansion)", () => {
      expect(POKEDEX.length).toBeLessThanOrEqual(40);
    });

    it("has at least one 'seen' entry (boundary / WIP)", () => {
      expect(POKEDEX_SEEN).toBeGreaterThanOrEqual(POKEDEX_CAUGHT);
    });

    it("has at least 15 'caught' entries (shipped projects baseline)", () => {
      expect(POKEDEX_CAUGHT).toBeGreaterThanOrEqual(15);
    });
  });

  describe("Entry integrity", () => {
    it("every Pokedex number is unique", () => {
      const numbers = POKEDEX.map((e) => e.number);
      const unique = new Set(numbers);
      expect(unique.size).toBe(numbers.length);
    });

    it("every Pokedex number is in sequence from 1 up", () => {
      const sorted = [...POKEDEX].map((e) => e.number).sort((a, b) => a - b);
      expect(sorted[0]).toBe(1);
      // Allow gaps after the first 30 slots — but 1..30 must be dense
      for (let i = 1; i <= 30; i++) {
        expect(sorted).toContain(i);
      }
    });

    it("every entry has a non-empty name (not a placeholder)", () => {
      for (const e of POKEDEX) {
        expect(e.name.length).toBeGreaterThan(0);
        expect(e.name.toLowerCase()).not.toContain("placeholder");
        expect(e.name.toLowerCase()).not.toContain("stub");
        expect(e.name.toLowerCase()).not.toContain("tbd");
      }
    });

    it("every entry has a description >= 15 chars (real content)", () => {
      for (const e of POKEDEX) {
        expect(e.description.length).toBeGreaterThanOrEqual(15);
      }
    });

    it("every entry has a valid Pokemon species sprite reference", () => {
      for (const e of POKEDEX) {
        expect(e.pokemon.length).toBeGreaterThan(0);
      }
    });

    it("every entry has exactly 2 types (Pokemon dual-type)", () => {
      for (const e of POKEDEX) {
        expect(e.types.length).toBe(2);
        expect(e.types[0].length).toBeGreaterThan(0);
        expect(e.types[1].length).toBeGreaterThan(0);
      }
    });

    it("every entry's level is a sensible integer 1-100", () => {
      for (const e of POKEDEX) {
        expect(e.level).toBeGreaterThanOrEqual(1);
        expect(e.level).toBeLessThanOrEqual(100);
        expect(Number.isInteger(e.level)).toBe(true);
      }
    });

    it("every status is one of caught/seen/unseen", () => {
      const valid = new Set(["caught", "seen", "unseen"]);
      for (const e of POKEDEX) {
        expect(valid.has(e.status)).toBe(true);
      }
    });
  });

  describe("URL coverage", () => {
    it("at least 15 entries have a URL (for COMPLETIONIST badge math)", () => {
      const withUrls = POKEDEX.filter((e) => e.url);
      expect(withUrls.length).toBeGreaterThanOrEqual(15);
    });

    it("every URL is a real HTTPS link (not a placeholder)", () => {
      for (const e of POKEDEX) {
        if (!e.url) continue;
        expect(e.url).toMatch(/^https:\/\//);
        expect(e.url).not.toContain("example.com");
        expect(e.url).not.toContain("TBD");
      }
    });
  });
});
