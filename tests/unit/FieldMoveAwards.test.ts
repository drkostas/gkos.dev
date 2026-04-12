import { describe, it, expect } from "vitest";
import { FIELD_MOVE_AWARDS } from "@/game/data/fieldMoveAwards";
import { PARTY_BY_ID } from "@/game/data/party";
import { BADGES } from "@/game/systems/BadgeMilestones";

/**
 * Field move award coverage — per comprehensive plan's decision
 * ledger §5: POKEDEX → KYOGRE "FORCE PUSH", PUBLICATION → ABSOL
 * "CUT". Guarantees the data stays consistent with the party
 * catalog and badge definitions so a renamed party member or
 * badge id doesn't silently orphan a field-move award.
 */

describe("Content — FIELD_MOVE_AWARDS", () => {
  it("has at least 2 entries (plan §Decision Ledger §5)", () => {
    expect(FIELD_MOVE_AWARDS.length).toBeGreaterThanOrEqual(2);
  });

  it("every entry references a real party member", () => {
    for (const award of FIELD_MOVE_AWARDS) {
      expect(PARTY_BY_ID[award.pokemonId]).toBeDefined();
    }
  });

  it("every entry references a real badge id", () => {
    const badgeIds = new Set(BADGES.map((b) => b.id));
    for (const award of FIELD_MOVE_AWARDS) {
      expect(badgeIds.has(award.badgeId)).toBe(true);
    }
  });

  it("moveName and learnMessage are non-empty", () => {
    for (const award of FIELD_MOVE_AWARDS) {
      expect(award.moveName.length).toBeGreaterThan(0);
      expect(award.learnMessage.length).toBeGreaterThan(0);
    }
  });

  it("includes the two ledger-default moves", () => {
    const map = new Map(FIELD_MOVE_AWARDS.map((a) => [a.badgeId, a]));
    expect(map.get("pokedex")?.moveName).toBe("FORCE PUSH");
    expect(map.get("publication")?.moveName).toBe("CUT");
  });
});
