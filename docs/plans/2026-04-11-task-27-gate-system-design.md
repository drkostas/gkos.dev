# Task 27 — Gate System Design

**Status:** design complete, ready to implement
**Date:** 2026-04-11
**Related tasks:** Task 28 (Dynamic Party + Field Moves) — engine built in parallel, GateSystem reads a Task-28 save field that ships now

---

## Goal

Add clearable obstacles to the overworld. A gate is an obstacle that blocks tiles until a party Pokemon knows the required "field move." Field moves are custom-named abilities taught by KOSTAS on badge award (Task 28). Two flavors: **NPC gates** (an existing NPC like Snorlax blocks a path) and **terrain gates** (a decorative obstacle like a tinted tree).

The engine ships with an empty `GATES` array. Specific gate definitions are filled in during the content phase.

## What the player sees

1. Player earns a badge from KOSTAS. KOSTAS says "Your KYOGRE learned FORCE PUSH!"
2. Player walks past a suspicious tree on Route 111 they noticed earlier. Presses A.
3. `"KYOGRE used FORCE PUSH! The tree was removed!"` The tree vanishes; the tile is walkable.
4. A small pocket of previously-unreachable terrain opens, containing one reward.

No in-game hint tells the player which gates are clearable — they have to figure it out.

---

## Key design decisions

### 1. Terrain gates are Grid Engine blocker characters, not tilemap mutations

**Rejected:** `tilemap.putTileAt(-1, ...)` + `gridEngine.setTransition(...)`. Grid Engine caches collision data at init and re-reading from tilemap mutation is unreliable; any fallback requires a permanent hot-path check on every movement step.

**Chosen:** each terrain gate tile is a Grid Engine character with a decorative sprite and `collisionGroups: ["geDefault"]`. Spawning the gate = `addCharacter`. Clearing = `removeCharacter` + sprite destroy. Zero tilemap mutation, zero cache concerns, and it reuses the exact teardown path pickup items already use end-to-end.

**Multi-tile gates** (boulders, fences) get one character per tile, ids `gate_{gateId}_0`, `gate_{gateId}_1`, .... Matches the Aqua/Magma formation pattern and the map analyzer's existing multi-tile NPC handling.

### 2. Field moves persist in GameSave now, keyed by species

```ts
// GameSave
fieldMoves: Record<string, string[]>;  // e.g. { "latias": ["TEST_MOVE"] }
```

This is Task 28's eventual shape — the field layout does not change when Task 28 lands. Task 28 adds `PartySystem.ts` and `getActiveParty()` on top; `GateSystem.findPokemonWithMove` swaps from iterating the static `PARTY` array to calling `getActiveParty()`, a one-line change.

A `window.grantFieldMove(species, moveName)` dev helper is attached in `GateSystem.init()` and stripped in `destroy()`, so test moves can be granted from the browser console without source-file contamination.

### 3. NPC gate flow: check field move BEFORE showing NPC dialog

**Rejected:** play the NPC dialog first, then check field move, then show a separate clear message. This makes the player sit through "Zzz..." every visit, chains two dialogs together, and forces `NPCSystem.tryInteract` to change its return type to `{ npcId } | null` so the caller can look up the gate.

**Chosen:** on A-press, if the facing tile has an NPC that's bound to a gate AND a party Pokemon knows the move, skip the NPC dialog entirely and play the clear message. If no move, fall through to normal NPC dialog — which IS the locked message. Matches OG Pokemon's HM pattern (once you have the Poke Flute, pressing A on Snorlax uses it immediately).

Consequence: `NPCSystem.tryInteract` keeps its `Promise<boolean>` signature. A new read-only helper `NPCSystem.npcAtTile(x, y)` returns `{ id } | null` and is called once by the priority chain, *before* both `tryNpcGate` and `tryInteract`.

NPC gates do not need a `lockedMessage` field — the NPC's own dialog is the locked message. `GateDefinition.lockedMessage` is required only for terrain gates.

### 4. Dedicated `GateSystem` class, not inline in OverworldScene

Matches the existing system pattern (NPCSystem, DialogSystem, PCInterface). OverworldScene already tops 1400 lines; inline wiring would add another 150. A dedicated class also gives a clean testing seam: `GateSystem(scene, gridEngine, dialogSystem)` — constructor matches NPCSystem, no coupling to NPCSystem at all (the NPC id is passed in by the caller).

### 5. Pink placeholder sprite generated in BootScene

A hot-pink 16×16 rectangle generated via `Phaser.GameObjects.Graphics.generateTexture("placeholder_gate", ...)` in `BootScene.preload()`. Zero asset dependencies, unmistakable color so it can't ship by accident, and the `spriteKey` field on `GateDefinition` swaps to a real sprite during content phase without touching any code.

### 6. Save helpers live in GameSave.ts, not GateSystem.ts

`isGateCleared`, `markGateCleared` sit alongside `hasItem`, `markPokedexSeenInSave`, `markBadgeNotified`, `markZoneVisited`. GateSystem owns Phaser + Grid Engine mechanics and calls these helpers for persistence. Matches the established pattern.

---

## Data model

### `src/game/data/gates.ts` (NEW)

Pure data — no imports from game systems, no circular dependencies.

```ts
export interface GateDefinition {
  /** Unique id, used as the key in save.gatesCleared. */
  id: string;
  /** Human-readable description (dev/analyzer tooling only). */
  description: string;
  /** "npc" = attached to an existing NPC. "terrain" = free-standing obstacle. */
  type: "npc" | "terrain";
  /** "overworld" or an interior key. */
  map: "overworld" | string;

  // ── What opens ─────────────────────────────────────────
  /** For NPC gates: the NPC id bound to this gate. */
  npcId?: string;
  /** For terrain gates: the tiles the gate character footprint covers. */
  tiles?: { x: number; y: number }[];
  /** For terrain gates: Phaser texture key for the sprite ("placeholder_gate" during dev). */
  spriteKey?: string;

  // ── When it opens ──────────────────────────────────────
  /** Field move name matched exactly against party members' fieldMoves. */
  requiredMove: string;

  // ── Player-facing messages ─────────────────────────────
  /** Shown when a party Pokemon knows the move. Use {POKEMON} for nickname. */
  clearMessage: string;
  /** Shown when nobody knows the move. REQUIRED for terrain gates, ignored for NPC gates (NPC's own dialog is the locked message). */
  lockedMessage?: string;
}

export const GATES: GateDefinition[] = [];
```

### `src/game/systems/GameSave.ts` additions

```ts
// In GameSave interface:
gatesCleared: string[];
fieldMoves: Record<string, string[]>;

// In defaults():
gatesCleared: [],
fieldMoves: {},

// New helpers:
export function isGateCleared(gateId: string): boolean {
  return getSave().gatesCleared.includes(gateId);
}

export function markGateCleared(gateId: string): void {
  const save = getSave();
  if (save.gatesCleared.includes(gateId)) return;
  updateSave({ gatesCleared: [...save.gatesCleared, gateId] });
}
```

The shallow-merge migration already handles missing fields on older saves; no version bump needed.

---

## `GateSystem` surface

```ts
export class GateSystem {
  private scene: Phaser.Scene;
  private gridEngine: GridEngine;
  private dialogSystem: DialogSystem;
  private gateCharacters: Map<string, string[]> = new Map();
  private gateSprites: Map<string, Phaser.GameObjects.Sprite[]> = new Map();

  constructor(scene, gridEngine, dialogSystem);

  /** Spawn characters for every uncleared terrain gate. Idempotent.
   *  Attaches window.grantFieldMove dev helper. */
  init(): void;

  /** Pre-check called BEFORE npcSystem.tryInteract. If the NPC at
   *  the facing tile is a gate AND a party Pokemon knows the move,
   *  skips NPC dialog, shows clear message, despawns NPC. Returns
   *  false if not a gate / no move, so caller falls through to
   *  normal NPC dialog (which is the locked message). */
  async tryNpcGate(facing: { x: number; y: number }, npcId: string | null): Promise<boolean>;

  /** Called AFTER hidden item, BEFORE PC tile. Checks if the
   *  facing tile is part of a terrain gate, runs field-move logic,
   *  shows clear or locked dialog. Returns true if handled. */
  async tryInteract(tileX: number, tileY: number): Promise<boolean>;

  /** Clean up all gate characters, sprites, and the dev helper. */
  destroy(): void;

  // Private:
  private spawnGateCharacters(gate: GateDefinition): void;
  private clearGate(gateId: string): Promise<void>;
  private getTerrainGateAt(x: number, y: number): GateDefinition | null;
  private findPokemonWithMove(move: string): { nickname: string; moveName: string } | null;
}
```

### `findPokemonWithMove` stub

```ts
private findPokemonWithMove(requiredMove: string) {
  const save = getSave();
  for (const pm of PARTY) {
    const moves = save.fieldMoves[pm.species] ?? [];
    if (moves.includes(requiredMove)) {
      return { nickname: pm.nickname, moveName: requiredMove };
    }
  }
  return null;
}
```

Iterates the static `PARTY` array + reads `save.fieldMoves[species]`. One-line swap to `getActiveParty()` when Task 28 lands — that is the only Task-28 seam in this file.

### `clearGate` (mechanical work only, no dialog)

```ts
private async clearGate(gateId: string): Promise<void> {
  const charIds = this.gateCharacters.get(gateId) ?? [];
  for (const id of charIds) {
    try { this.gridEngine.removeCharacter(id); } catch {}
  }
  for (const sprite of this.gateSprites.get(gateId) ?? []) {
    sprite.destroy();
  }
  this.gateCharacters.delete(gateId);
  this.gateSprites.delete(gateId);
  markGateCleared(gateId);
}
```

Caller shows the dialog. Separation of concerns means `clearGate` is reusable for future programmatic-clear scenarios.

### `spawnGateCharacters`

```ts
private spawnGateCharacters(gate: GateDefinition): void {
  if (gate.type !== "terrain" || !gate.tiles) return;
  const charIds: string[] = [];
  const sprites: Phaser.GameObjects.Sprite[] = [];
  gate.tiles.forEach((t, i) => {
    const charId = gate.tiles!.length === 1 ? `gate_${gate.id}` : `gate_${gate.id}_${i}`;
    const sprite = this.scene.add.sprite(
      t.x * 16 + 8,
      t.y * 16 + 8,
      gate.spriteKey ?? "placeholder_gate",
    );
    sprite.setDepth(t.y * 16 + 15);  // foot-based y-sort, same as NPCs
    this.gridEngine.addCharacter({
      id: charId,
      sprite,
      startPosition: { x: t.x, y: t.y },
      speed: 0,  // explicit — never move
      collides: {
        collidesWithTiles: true,
        collisionGroups: ["geDefault"],
      },
    });
    charIds.push(charId);
    sprites.push(sprite);
  });
  this.gateCharacters.set(gate.id, charIds);
  this.gateSprites.set(gate.id, sprites);
}
```

### `destroy`

```ts
destroy(): void {
  for (const [gateId] of this.gateCharacters) {
    for (const charId of this.gateCharacters.get(gateId) ?? []) {
      try { this.gridEngine.removeCharacter(charId); } catch {}
    }
    for (const sprite of this.gateSprites.get(gateId) ?? []) sprite.destroy();
  }
  this.gateCharacters.clear();
  this.gateSprites.clear();
  delete (window as any).grantFieldMove;
}
```

`try/catch` around `removeCharacter` handles the scene-shutdown case where Grid Engine may already be partially torn down.

### `grantFieldMove` dev helper (attached in `init()`)

```ts
(window as any).grantFieldMove = (species: string, move: string) => {
  const save = getSave();
  const existing = save.fieldMoves[species] ?? [];
  if (!existing.includes(move)) {
    updateSave({
      fieldMoves: { ...save.fieldMoves, [species]: [...existing, move] },
    });
  }
  console.log(`Granted ${move} to ${species}`);
};
```

Persists across reload. No source-file contamination. Stripped on scene destroy for hygiene (closure captures module functions, not `this`, so it's not a leak hazard — just cleanup).

---

## `NPCSystem.npcAtTile` helper

```ts
/** Read-only: return the NPC currently occupying (x, y), or null. */
npcAtTile(x: number, y: number): { id: string } | null {
  for (const npc of this.npcs) {
    if (!this.sprites.has(npc.id)) continue;  // skip despawned/hidden
    const p = this.gridEngine.getPosition(npc.id);
    if (p.x === x && p.y === y) return { id: npc.id };
  }
  return null;
}
```

The `this.sprites.has` guard covers despawned pickups, hidden ephemerals, and NPCs with failing `spawnCondition`s. `getPosition` returns the NPC's *current* position (not its data-file position), which is correct — a wandering NPC on a gate tile should still pre-empt.

---

## OverworldScene priority chain

```ts
private async handleInteraction(): Promise<void> {
  const facing = this.getFacingTile();

  // 1. NPC gate pre-check (field move → clear, else fall through)
  const npcHere = this.npcSystem.npcAtTile(facing.x, facing.y);
  if (await this.gateSystem.tryNpcGate(facing, npcHere?.id ?? null)) return;

  // 2. Normal NPC interaction
  if (await this.npcSystem.tryInteract(this.player.getTilePos(), this.player.getFacing())) return;

  // 3. Sign
  if (await this.signSystem.tryInteract(facing.x, facing.y)) return;

  // 4. Hidden item
  if (await this.hiddenItemSystem.tryPickup(facing.x, facing.y)) return;

  // 5. Terrain gate
  if (await this.gateSystem.tryInteract(facing.x, facing.y)) return;

  // 6. PC tile
  // ...existing PC code
}
```

NPC-type gates rely on `spawnCondition: () => !isGateCleared("snorlax_gate")` in `npcs.ts`. When a gate is cleared, the NPC simply never spawns on the next scene load — no special "cleared" branch inside NPCSystem. Runtime clearing is handled directly by `GateSystem.clearGate` via `gridEngine.removeCharacter` + sprite destroy (does not go through NPCSystem).

---

## Scene lifecycle

**`BootScene.preload()` adds:**

```ts
const gfx = this.make.graphics({ x: 0, y: 0, add: false });
gfx.fillStyle(0xff00ff, 1);
gfx.fillRect(0, 0, 16, 16);
gfx.generateTexture("placeholder_gate", 16, 16);
gfx.destroy();
```

**`OverworldScene.create()` adds:**

```ts
this.gateSystem = new GateSystem(this, this.gridEngine, this.dialogSystem);
this.gateSystem.init();
```

Instantiated right after `NPCSystem`, before the scene returns control.

**`OverworldScene.shutdown()` adds:**

```ts
this.gateSystem?.destroy();
```

---

## Verification plan

Add one throwaway test gate to `GATES`:

```ts
{
  id: "test_gate",
  description: "Test gate one tile east of spawn",
  type: "terrain",
  map: "overworld",
  tiles: [{ x: 73, y: 58 }],
  spriteKey: "placeholder_gate",
  requiredMove: "TEST_MOVE",
  clearMessage: "{POKEMON} used TEST MOVE!\nThe obstacle vanished!",
  lockedMessage: "Something blocks the way…",
},
```

Six-step verification:

1. **Boot `/explore`.** Expect: pink 16×16 square one tile east of the player on spawn.
2. **Walk east.** Expect: blocked by the gate character.
3. **Press A facing east.** Expect: dialog `"Something blocks the way…"`. Confirms `tryInteract` wiring and locked path.
4. **Console: `grantFieldMove("latias", "TEST_MOVE")`.** Expect: `"Granted TEST_MOVE to latias"` in console + `localStorage["gkos:explore:save"]` updated.
5. **Press A facing east again.** Expect: `"MEDiC used TEST MOVE!\nThe obstacle vanished!"`. Pink square gone, tile walkable, character removed.
6. **Reload the page.** Expect: pink square does NOT reappear. Confirms `gatesCleared` persistence.

After all six pass, delete the `test_gate` entry. `GATES` returns to empty; `grantFieldMove` stays as a debug helper.

---

## Files touched

| File | Change |
|---|---|
| `src/game/data/gates.ts` | **NEW** — `GateDefinition` interface + empty `GATES` array |
| `src/game/systems/GateSystem.ts` | **NEW** — class + dev helper |
| `src/game/systems/GameSave.ts` | add `gatesCleared`, `fieldMoves` to interface + defaults; export `isGateCleared`, `markGateCleared` |
| `src/game/scenes/OverworldScene.ts` | instantiate GateSystem, wire priority chain, `destroy()` in shutdown |
| `src/game/scenes/BootScene.ts` | generate `placeholder_gate` texture in preload |
| `src/game/systems/NPCSystem.ts` | add public `npcAtTile(x, y)` read-only helper |

---

## Out of scope for Task 27

- **Specific gate definitions.** `GATES` ships empty; content phase fills it.
- **Real gate sprite assets.** Placeholder only until content phase art exists.
- **Interior gates.** Gym puzzle uses `autoGive` (Task 10), not the gate system.
- **Analyzer `--progression` flag.** Added after `GATES` has data.
- **Custom move names.** Decided in content phase, not engine phase.
- **Task 28 machinery.** `PartySystem.ts`, `getActiveParty()`, and `teachFieldMove()` are Task 28's job. GateSystem reads the save field directly from the static `PARTY` + `save.fieldMoves[species]`. One-line swap when Task 28 lands.
