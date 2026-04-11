import Phaser from "phaser";
import type GridEngine from "grid-engine";
import { Direction } from "grid-engine";
import { GATES, type GateDefinition } from "@/game/data/gates";
import { DialogSystem } from "@/game/systems/DialogSystem";
import { isGateCleared, markGateCleared } from "@/game/systems/GameSave";
import { findPokemonWithMove } from "@/game/systems/PartySystem";

/**
 * GateSystem — runtime wiring for clearable obstacles.
 *
 * Two gate types (see `src/game/data/gates.ts`):
 *
 *   "terrain" — free-standing obstacles. Each tile in the gate's
 *     `tiles` array is registered as a Grid Engine blocker character
 *     with `speed: 0` and a decorative sprite. The player faces the
 *     obstacle, presses A, and GateSystem asks PartySystem for a
 *     Pokemon that knows the required field move. Match → clear
 *     (remove characters, destroy sprites, persist). No match → show
 *     the gate's `lockedMessage`.
 *
 *   "npc" — an existing NPC defined in `npcs.ts`. That NPC uses
 *     `spawnCondition: () => !isGateCleared("…")` so it never spawns
 *     after clearing. At runtime, GateSystem.tryNpcGate is called
 *     BEFORE `npcSystem.tryInteract`; if the player knows the move,
 *     it skips the NPC's dialog entirely and plays the clear
 *     message. If the player doesn't know the move, it returns
 *     false and the normal NPC dialog fires as the locked message —
 *     matching OG Pokemon's HM-on-Snorlax behavior.
 *
 * Field moves are persisted in `save.fieldMoves[partyMemberId]`
 * (Task 28). All reads go through `PartySystem.findPokemonWithMove`
 * so this file doesn't know or care how the party is stored — when
 * the party changes (wild Pokemon joins, KOSTAS teaches a move),
 * GateSystem picks it up on the next interaction without any
 * additional plumbing.
 *
 * Gate characters use the id scheme:
 *   - 1-tile gate: `gate_{gateId}`
 *   - multi-tile:  `gate_{gateId}_0`, `gate_{gateId}_1`, …
 *
 * No tilemap mutation, no collision-cache invalidation, no fallback
 * hacks — gates are just blocker characters, the same path pickup
 * items use.
 */
export class GateSystem {
  private scene: Phaser.Scene;
  private gridEngine: GridEngine;
  private dialogSystem: DialogSystem;
  /** gate id → Grid Engine character ids spawned for it */
  private gateCharacters: Map<string, string[]> = new Map();
  /** gate id → Phaser sprites (parallel to gateCharacters) */
  private gateSprites: Map<string, Phaser.GameObjects.Sprite[]> = new Map();

  constructor(
    scene: Phaser.Scene,
    gridEngine: GridEngine,
    dialogSystem: DialogSystem,
  ) {
    this.scene = scene;
    this.gridEngine = gridEngine;
    this.dialogSystem = dialogSystem;
  }

  // ── Lifecycle ────────────────────────────────────────────

  /**
   * Spawn characters for every uncleared terrain gate on the
   * overworld. Idempotent — safe to call on scene restart (cleared
   * gates are skipped, and existing character ids are reused from
   * the gate id scheme).
   */
  init(): void {
    for (const gate of GATES) {
      if (gate.map !== "overworld") continue;
      if (gate.type !== "terrain") continue;
      if (isGateCleared(gate.id)) continue;
      this.spawnGateCharacters(gate);
    }
  }

  /**
   * Remove all gate characters and sprites. Called from
   * OverworldScene.shutdown() so a scene restart doesn't leave
   * stale characters registered with Grid Engine. The try/catch
   * around removeCharacter handles the case where Grid Engine is
   * already partially torn down.
   */
  destroy(): void {
    for (const [gateId] of this.gateCharacters) {
      for (const charId of this.gateCharacters.get(gateId) ?? []) {
        try {
          this.gridEngine.removeCharacter(charId);
        } catch {
          // ignore — grid engine may already be gone
        }
      }
      for (const sprite of this.gateSprites.get(gateId) ?? []) {
        sprite.destroy();
      }
    }
    this.gateCharacters.clear();
    this.gateSprites.clear();
  }

  // ── Interaction (called from OverworldScene.handleInteraction) ──

  /**
   * Pre-check fired BEFORE `npcSystem.tryInteract`. If the NPC at
   * the facing tile is bound to a gate AND a party Pokemon knows
   * the required move, clears the gate, plays the clear message,
   * and returns true. Otherwise returns false so the caller falls
   * through to the normal NPC interaction (which may itself be
   * the locked message for this gate).
   *
   * `npcId` is passed in by the caller rather than looked up here,
   * so GateSystem doesn't need a reference to NPCSystem at all —
   * the caller peeks via `npcSystem.npcAtTile(x, y)` once and
   * hands the result to both `tryNpcGate` and `tryInteract`.
   */
  async tryNpcGate(
    _facing: { x: number; y: number },
    npcId: string | null,
  ): Promise<boolean> {
    if (!npcId) return false;
    const gate = this.getNpcGate(npcId);
    if (!gate) return false;
    if (isGateCleared(gate.id)) return false;

    const user = findPokemonWithMove(gate.requiredMove);
    if (!user) return false;

    await this.clearGate(gate.id);
    // NPC gates don't have their own Grid Engine characters in
    // `gateCharacters` — the NPC lives in NPCSystem. Remove it
    // directly here so the clear is immediate; next scene load the
    // NPC's `spawnCondition` keeps it gone.
    try {
      this.gridEngine.removeCharacter(npcId);
    } catch {
      // NPCSystem will also try to clean up on its own path; swallow
    }

    const lines = gate.clearMessage
      .replace(/\{POKEMON\}/g, user.nickname)
      .split("\n");
    await this.dialogSystem.showDialog({ lines });
    return true;
  }

  /**
   * Handle a press-A interaction against a terrain gate tile.
   * Called AFTER hidden item, BEFORE PC tile in the priority chain.
   * Returns true if the facing tile is part of a terrain gate
   * (whether cleared with a move or shown as locked) so the caller
   * stops searching further interaction sources.
   */
  async tryInteract(tileX: number, tileY: number): Promise<boolean> {
    const gate = this.getTerrainGateAt(tileX, tileY);
    if (!gate) return false;
    if (isGateCleared(gate.id)) return false;

    const user = findPokemonWithMove(gate.requiredMove);
    if (user) {
      await this.clearGate(gate.id);
      const lines = gate.clearMessage
        .replace(/\{POKEMON\}/g, user.nickname)
        .split("\n");
      await this.dialogSystem.showDialog({ lines });
      return true;
    }

    const lockedLines = (gate.lockedMessage ?? "Something blocks the way…").split("\n");
    await this.dialogSystem.showDialog({ lines: lockedLines });
    return true;
  }

  // ── Private helpers ──────────────────────────────────────

  /**
   * Create one Grid Engine character per tile in the gate's
   * footprint, each with a decorative sprite. `speed: 0` is
   * explicit so the gate never moves regardless of Grid Engine
   * defaults. Foot-based y-sort matches NPC depth calculation so
   * the player renders correctly in front of/behind tall gates.
   */
  private spawnGateCharacters(gate: GateDefinition): void {
    if (gate.type !== "terrain" || !gate.tiles || gate.tiles.length === 0) return;

    const spriteKey = gate.spriteKey ?? "placeholder_gate";
    const charIds: string[] = [];
    const sprites: Phaser.GameObjects.Sprite[] = [];

    gate.tiles.forEach((t, i) => {
      const charId =
        gate.tiles!.length === 1 ? `gate_${gate.id}` : `gate_${gate.id}_${i}`;
      const sprite = this.scene.add.sprite(
        t.x * 16 + 8,
        t.y * 16 + 8,
        spriteKey,
      );
      // Foot-based y-sort, same convention as NPCs (see NPCSystem.updateDepth).
      sprite.setDepth(t.y * 16 + 15);

      this.gridEngine.addCharacter({
        id: charId,
        sprite,
        startPosition: { x: t.x, y: t.y },
        speed: 0,
        facingDirection: Direction.DOWN,
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

  /**
   * Mechanical clear — no dialog, caller handles UX. Removes every
   * Grid Engine character and destroys every sprite for the gate,
   * deletes both maps, and persists `markGateCleared(gateId)`.
   * Reusable for future programmatic clear scenarios.
   */
  private async clearGate(gateId: string): Promise<void> {
    const charIds = this.gateCharacters.get(gateId) ?? [];
    for (const id of charIds) {
      try {
        this.gridEngine.removeCharacter(id);
      } catch {
        // ignore
      }
    }
    for (const sprite of this.gateSprites.get(gateId) ?? []) {
      sprite.destroy();
    }
    this.gateCharacters.delete(gateId);
    this.gateSprites.delete(gateId);
    markGateCleared(gateId);
  }

  /** Find a terrain gate whose footprint covers (x, y) on the overworld. */
  private getTerrainGateAt(x: number, y: number): GateDefinition | null {
    for (const g of GATES) {
      if (g.map !== "overworld") continue;
      if (g.type !== "terrain") continue;
      if (!g.tiles) continue;
      if (g.tiles.some((t) => t.x === x && t.y === y)) return g;
    }
    return null;
  }

  /** Find an NPC gate bound to the given npc id, if any. */
  private getNpcGate(npcId: string): GateDefinition | null {
    for (const g of GATES) {
      if (g.type !== "npc") continue;
      if (g.npcId === npcId) return g;
    }
    return null;
  }
}
