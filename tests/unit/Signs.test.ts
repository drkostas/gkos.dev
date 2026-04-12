import { describe, it, expect } from "vitest";
import { MAUVILLE_SIGNS } from "@/game/data/npcs";

/**
 * Signs content regression — criterion #8. Every sign the player
 * can interact with must have a non-placeholder string that
 * mentions something real about the portfolio. Placeholder text
 * like "Sign here" / "TBD" / "Coming soon" must not ship.
 */

describe("Content — Signs", () => {
  it("has at least 20 sign definitions across Mauville + routes (design target)", () => {
    expect(MAUVILLE_SIGNS.length).toBeGreaterThanOrEqual(20);
  });

  it("every sign has a non-empty text array", () => {
    for (const s of MAUVILLE_SIGNS) {
      expect(s.text.length).toBeGreaterThanOrEqual(1);
      for (const line of s.text) {
        expect(line.length).toBeGreaterThan(0);
      }
    }
  });

  it("no sign contains placeholder text", () => {
    const bannedSubstrings = [
      "placeholder",
      "lorem ipsum",
      "tbd",
      "todo",
      "xxx",
      "fixme",
    ];
    for (const s of MAUVILLE_SIGNS) {
      const joined = s.text.join(" ").toLowerCase();
      for (const banned of bannedSubstrings) {
        expect(joined).not.toContain(banned);
      }
    }
  });

  it("at least 5 signs mention KOSTAS or a portfolio element", () => {
    const markers = [
      "KOSTAS",
      "ML",
      "FleetSmart",
      "Amazon",
      "GYM",
      "GITHUB",
      "GitHub",
    ];
    const withMarkers = MAUVILLE_SIGNS.filter((s) => {
      const joined = s.text.join(" ");
      return markers.some((m) => joined.includes(m));
    });
    expect(withMarkers.length).toBeGreaterThanOrEqual(5);
  });

  it("every sign has a valid position", () => {
    for (const s of MAUVILLE_SIGNS) {
      expect(typeof s.position.x).toBe("number");
      expect(typeof s.position.y).toBe("number");
      expect(s.position.x).toBeGreaterThanOrEqual(0);
      expect(s.position.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("sign positions are unique (no two signs at same tile)", () => {
    const keys = MAUVILLE_SIGNS.map((s) => `${s.position.x},${s.position.y}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("key Mauville signs exist (GYM, Pokemon Center, Mart)", () => {
    // After offset (50,50), Mauville gym sign is at (61, 56)
    // pokemon center at (74, 55), mart at (75, 64). These are
    // derived from the raw entries in npcs.ts.
    const joinedText = MAUVILLE_SIGNS.map((s) => s.text.join(" ")).join(" | ");
    expect(joinedText).toContain("GYM");
    expect(joinedText.toUpperCase()).toContain("POKEMON CENTER");
    expect(joinedText.toUpperCase()).toContain("POKE MART");
  });
});
