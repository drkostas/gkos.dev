# Dynamic Party + Field Moves — Design

**Date:** 2026-04-11
**Status:** Approved, ready to implement
**Scope:** Engine only. Content phase (MEW, starter reduction, wire-ups) follows separately.

## Goal

Turn the static 6-member party into a dynamic collection that grows
across the game, and introduce field moves — a separate move list
used at overworld gates. Both features are engine-phase only; content
(which Pokemon join where, which moves exist, which gates block the
map) is wired in a later pass against the stable API this task
delivers.

## Architecture summary

- **Source of truth for party membership** lives in the save
  (`save.partyMemberIds`), not in the `party.ts` static data.
- `ALL_PARTY` is the catalog of every possible member; the save
  selects which subset is active.
- Field moves are plain strings. No registry. Gate checks and
  teach calls match by string equality. (Upgrade path to an enum
  documented, not built.)
- Party size is capped at 6 forever. Content-phase sequencing
  guarantees `addToParty` never fires against a full party; the
  engine logs a warning if it ever happens.
- No save migration. Pre-launch, dev-only saves get cleared when
  they drift.

## Data model

### `src/game/data/party.ts`

```typescript
export interface PartyMember {
  /** Stable save-state id. Slug, never changes once chosen. */
  id: string;
  nickname: string;
  species: string;
  // ... all existing fields unchanged ...
}

export interface ActivePartyMember extends PartyMember {
  /** Field moves this Pokemon has learned. */
  fieldMoves: string[];
}

export const ALL_PARTY: PartyMember[] = [
  { id: "medic",       nickname: "MEDiC",     species: "latias",    /* ... */ },
  { id: "fleetsmart",  nickname: "FleetSmart", species: "kyogre",   /* ... */ },
  { id: "maskdistill", nickname: "MaskDistill", species: "absol",   /* ... */ }, // nickname typo fixed
  { id: "xpensai",     nickname: "XpensAI",   species: "manectric", /* ... */ },
  { id: "shiftmd",     nickname: "ShiftMD",   species: "breloom",   /* ... */ },
  { id: "soma",        nickname: "Soma",      species: "medicham",  /* ... */ },
];

export const PARTY_BY_ID: Record<string, PartyMember> =
  Object.fromEntries(ALL_PARTY.map((p) => [p.id, p]));

/** Starts at all 6. Content phase drops to 4 + configures joins. */
export const STARTING_PARTY_IDS: string[] = ALL_PARTY.map((p) => p.id);

/** @deprecated Import ALL_PARTY or call getActiveParty() instead. */
export const PARTY = ALL_PARTY;
```

The `PARTY` alias is kept as a deprecated re-export so
`PokemonSummary.tsx`'s type-only import doesn't churn in this task.
Remove it after all consumers are migrated.

### `src/game/systems/GameSave.ts`

Add two fields to the `GameSave` interface and `defaults()`:

```typescript
partyMemberIds: string[];             // default: [...STARTING_PARTY_IDS]
fieldMoves: Record<string, string[]>; // default: {}
```

Shallow merge keeps old dev saves working. No migration code.

## PartySystem API

New file: `src/game/systems/PartySystem.ts`

```typescript
export function getActiveParty(): ActivePartyMember[];
export function addToParty(id: string): boolean;
export function teachFieldMove(id: string, moveName: string): void;
export function findPokemonWithMove(moveName: string): ActivePartyMember | null;
```

- **`getActiveParty`** — walks `save.partyMemberIds`, looks each up
  in `PARTY_BY_ID`, attaches `fieldMoves[id]`. Skips unknown ids
  with a `console.warn`.
- **`addToParty`** — returns `false` on unknown id, duplicate, or
  full party. Full-party case logs a warning (content bug signal).
  No dialog, no UI — caller decides how to react.
- **`teachFieldMove`** — idempotent. No-op if the id is unknown or
  the move is already learned. No side effects beyond save mutation
  (no notification emit — that's content-phase responsibility).
- **`findPokemonWithMove`** — returns the full `ActivePartyMember`
  (not a subset) so gate dialog can read `nickname` and future UI
  can read `species` without re-lookup.

A dev-only `window.partySystem` helper is exposed in `import.meta.env.DEV`
for console testing, mirroring the Task 27 `grantFieldMove` pattern.

## Consumer migration

Three files consume the old static `PARTY`:

1. **`PartyDexRegistrar.ts`** — iterate `save.partyMemberIds` via
   `PARTY_BY_ID`. Mid-game joins and MEW register through their own
   encounter flow, not through this boot registrar.
2. **`PartyMenu.tsx`** — one-line swap: `const party = getActiveParty()`
   at the top of the render, replacing `const party = PARTY`.
   `ActivePartyMember extends PartyMember`, so all downstream
   property accesses keep working unchanged.
3. **`PokemonSummary.tsx`** — prop type widens from `PartyMember` to
   `ActivePartyMember`. No render changes. The `fieldMoves` field
   flows through but renders nothing yet (layout polish deferred).

## Wire points for content phase

### Wild encounter → party join

Extend `NPCDefinition.pokemon` in `src/game/types/npc.ts`:

```typescript
pokemon?: {
  // ... existing fields ...
  /** If set, this wild Pokemon joins the party on first encounter. */
  joinsParty?: string;  // party member id from ALL_PARTY
};
```

In `NPCSystem.tryInteract`, after the first-time Pokedex registration
block, call `addToParty(pkm.joinsParty)` and show a join dialog:

```
{speciesName} seems to like you!
{speciesName} joined your team!
```

No yes/no prompt. The same wire point handles both the mid-game
wild join and MEW — the only difference between them is where the
encounter NPC lives and what `joinsParty` id it carries.

### KOSTAS teaches field move on badge

New file: `src/game/data/fieldMoveAwards.ts`

```typescript
export interface FieldMoveAward {
  badgeId: string;
  pokemonId: string;
  moveName: string;
  learnMessage: string; // "Your KYOGRE learned FORCE PUSH!"
}
export const FIELD_MOVE_AWARDS: FieldMoveAward[] = [];
```

In `interiors.ts`, inside KOSTAS's `dialogFn`, after `awardBadge(next.id)`:

```typescript
const award = FIELD_MOVE_AWARDS.find((f) => f.badgeId === next.id);
if (award) {
  teachFieldMove(award.pokemonId, award.moveName);
}
```

`learnMessage` is **data for content phase**, surfaced as a dialog
line appended to KOSTAS's badge-receive script. The engine does
not auto-show a notification — that would fire on top of the
dialog and be redundant.

## Task 27 contract

This task writes to `save.fieldMoves[id]`. Task 27 (Gate System)
reads from it via `findPokemonWithMove`. No shared code, no import
dependency. Either can land first; the contract is the save shape.

## Verification plan

1. **Backwards compat** — fresh save renders 6 party members in
   original order.
2. **Pokedex init** — boot registers all 6 species as seen+caught.
3. **`addToParty` guards** — duplicates and unknown ids return
   `false`; unknown logs a warning.
4. **`teachFieldMove` persistence** — teach via console, reload,
   `findPokemonWithMove` returns the correct member.
5. **Type check** — `npx tsc --noEmit` clean.
6. **Unknown-id resilience** — manually corrupt `partyMemberIds`
   with a ghost id; `getActiveParty` skips it with one warning,
   nothing crashes.

## What this task does NOT ship

- Starter count reduction (stays at 6 until content phase)
- MEW's `PartyMember` definition
- Any `joinsParty` values on existing wild Pokemon
- Any `FIELD_MOVE_AWARDS` entries
- Field move UI in `PokemonSummary` (types flow through, render stubbed)
- Save migration code (nuke-old-saves strategy)
- Player-facing "party full" dialog (console warn only)
- `removeFromParty` (YAGNI)

## Design decisions log

- **Field moves as strings, not a registry.** 2-3 moves total,
  co-located in `gates.ts` + `fieldMoveAwards.ts`. Upgrade path
  is a 10-minute refactor if needed later.
- **Explicit `id` field (not species).** Decouples save state
  from sprite assets and display names. Save reads cleanly.
- **`findPokemonWithMove` returns full member.** No premature
  shape narrowing. Callers read `.nickname` today, `.species`
  tomorrow without refactor.
- **No caching in `getActiveParty`.** Called at render time on
  menu open only. Cheap JSON parse; revisit if a hot-loop caller
  appears.
- **Party cap enforced by design, not UI.** Sequencing ensures
  the player never hits 7 joinable Pokemon; engine logs a warning
  if it ever does.
