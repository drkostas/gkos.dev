import Phaser from "phaser";
import { Direction } from "grid-engine";
import type GridEngine from "grid-engine";
import {
  MovementBehavior,
  type EphemeralConfig,
  type EphemeralVisibleBehavior,
  type NPCDefinition,
} from "@/game/types/npc";
import { DialogSystem, wordWrap } from "@/game/systems/DialogSystem";
import { isPickedUp, recordPickup } from "@/game/systems/PickupStore";
import { sfx } from "@/game/systems/SoundManager";
import { isPokedexSeen, markPokedexSeen } from "@/game/systems/PokedexStore";
import { isTrainerCleared, markTrainerCleared } from "@/game/systems/TrainerStore";
import { checkBadges } from "@/game/systems/BadgeMilestones";
import { getSave, markPokedexSeenInSave } from "@/game/systems/GameSave";
import { addToParty } from "@/game/systems/PartySystem";
import { trackPokedexRegister } from "@/game/systems/Analytics";
import {
  WALK_ANIM as WALK_ANIM_MAPPING,
  OPPOSITE,
} from "@/game/utils/sceneHelpers";

/** Default min/max interval in ms between autonomous NPC actions. */
const WALK_BEHAVIOR_MIN_MS = 2000;
const WALK_BEHAVIOR_MAX_MS = 4000;
/** Defaults for RUN_* behaviors — shorter so running NPCs feel brisk. */
const RUN_BEHAVIOR_MIN_MS = 500;
const RUN_BEHAVIOR_MAX_MS = 1000;

const WALK_SPEED = 2;
const RUN_SPEED = 8;

/** Behaviors that default to run speed + shorter tick interval. */
function isRunBehavior(b: MovementBehavior): boolean {
  return (
    b === MovementBehavior.RUN_HORIZONTAL ||
    b === MovementBehavior.RUN_VERTICAL
  );
}

/** Resolve the effective speed for an NPC, honoring explicit overrides. */
function resolveSpeed(npc: NPCDefinition): number {
  if (npc.speed != null) return npc.speed;
  return isRunBehavior(npc.movementBehavior) ? RUN_SPEED : WALK_SPEED;
}

/** Resolve the effective tick interval for an NPC. */
function resolveInterval(npc: NPCDefinition): { min: number; max: number } {
  if (npc.behaviorIntervalMs) return npc.behaviorIntervalMs;
  if (isRunBehavior(npc.movementBehavior)) {
    return { min: RUN_BEHAVIOR_MIN_MS, max: RUN_BEHAVIOR_MAX_MS };
  }
  return { min: WALK_BEHAVIOR_MIN_MS, max: WALK_BEHAVIOR_MAX_MS };
}

/**
 * Runtime state for an ephemeral Pokemon. Kept alive in
 * NPCSystem.ephemeralStates for the full scene lifetime (the cycle
 * needs to keep running in the background while the sprite is
 * hidden). Once the Pokemon is registered in the Pokedex, `state`
 * flips to "permanent" and no further timers are scheduled.
 */
interface EphemeralState {
  def: NPCDefinition;
  config: EphemeralConfig;
  phase: "hidden" | "visible" | "permanent";
  /** Current tile while visible/permanent; undefined while hidden. */
  currentPos?: { x: number; y: number };
  /** Timer that fires next phase transition. Cleared on pause/destroy. */
  timer?: Phaser.Time.TimerEvent;
  /** Active hop-bounce tween, if visibleBehavior === "hop". */
  hopTween?: Phaser.Tweens.Tween;
  /** Fade tween (in or out). */
  fadeTween?: Phaser.Tweens.Tween;
}

/**
 * NPCSystem — manages all NPCs on the overworld map.
 *
 * Responsibilities:
 * - Creates sprites and registers them with Grid Engine
 * - Drives autonomous movement behaviors (wander, look around)
 * - Handles player interaction (face player + show dialog)
 * - Pauses NPC behaviors while dialog is active
 * - Runs the ephemeral-Pokemon spawn/despawn cycle until each one
 *   is registered in the Pokedex
 */
export class NPCSystem {
  private scene: Phaser.Scene;
  private gridEngine: GridEngine;
  private dialogSystem: DialogSystem;
  private npcs: NPCDefinition[];
  private sprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private shadows: Map<string, Phaser.GameObjects.Ellipse> = new Map();
  private behaviorTimers: Phaser.Time.TimerEvent[] = [];
  /** Track each wandering NPC's home position for range clamping. */
  private homePositions: Map<string, { x: number; y: number }> = new Map();
  /** Current pace direction for PACE and RUN NPCs (flips at edges). */
  private paceDirections: Map<string, Direction> = new Map();
  /**
   * Per-ephemeral-NPC lifecycle state. Entries exist for the entire
   * scene lifetime (even while the sprite is hidden) so the cycle can
   * continue running. Promoted entries have state="permanent" — their
   * sprite stays put forever, matching normal NPCs.
   */
  private ephemeralStates: Map<string, EphemeralState> = new Map();

  constructor(
    scene: Phaser.Scene,
    gridEngine: GridEngine,
    dialogSystem: DialogSystem,
    npcs: NPCDefinition[],
  ) {
    this.scene = scene;
    this.gridEngine = gridEngine;
    this.dialogSystem = dialogSystem;
    this.npcs = npcs;
  }

  /** Create all NPC sprites, register with Grid Engine, start behaviors. */
  init(): void {
    for (const npc of this.npcs) {
      // Skip pickups that have already been collected
      if (npc.pickup && isPickedUp(npc.id)) continue;
      // Skip NPCs whose spawn condition is not met
      if (npc.spawnCondition && !npc.spawnCondition()) continue;

      // Ephemeral Pokemon: split path — permanent if already seen,
      // otherwise start the hidden→visible cycle in the background.
      if (npc.ephemeral) {
        this.initEphemeral(npc);
        continue;
      }

      // AutoGive trainers that are already cleared: spawn at aside position
      if (npc.autoGive && isTrainerCleared(npc.id)) {
        this.createNPC({
          ...npc,
          position: { ...npc.autoGive.asidePosition },
        });
      } else {
        this.createNPC(npc);
      }
    }
    this.startIdleAnimations();
  }

  /**
   * OG-style idle animations:
   * - Walk-in-place for Poochyena (cycle walk frames while stationary)
   * - Breathing scale for sleeping Pokemon (Snorlax/Slaking/Slakoth)
   * - Shadows under all NPC sprites
   */
  private startIdleAnimations(): void {
    for (const npc of this.npcs) {
      if (npc.pickup && isPickedUp(npc.id)) continue;
      const sprite = this.sprites.get(npc.id);
      if (!sprite) continue;

      // ── Shadows ──────────────────────────────────────────
      // OG game draws a small elliptical shadow under every overworld sprite.
      // Skip item balls and sleeping 32x32 Pokemon (they sit on the ground).
      if (npc.spriteKey !== "item_ball") {
        const shadow = this.scene.add.ellipse(0, 0, 10, 4, 0x000000, 0.2);
        shadow.setDepth(sprite.depth - 1);
        // Track shadow with sprite position each frame
        this.shadows.set(npc.id, shadow);
      }

      // ── Sleeping Pokemon: breathing scale ────────────────
      const isSleeping = npc.spriteKey === "snorlax" ||
        npc.spriteKey === "slaking" ||
        npc.spriteKey === "slakoth";
      if (isSleeping) {
        this.scene.tweens.add({
          targets: sprite,
          scaleX: (npc.scale ?? 1) * 1.04,
          scaleY: (npc.scale ?? 1) * 0.96,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          delay: Math.random() * 1000,
        });
        continue;
      }

      // ── Wild Pokemon idle bounce (2-frame icon animation) ──
      if (npc.pokemon && npc.spriteKey.startsWith("pkmn_")) {
        const bounceFrames = [0, 1];
        (sprite as any).__walkFrames = bounceFrames;
        (sprite as any).__walkIdx = 0;
        const timer = this.scene.time.addEvent({
          delay: 500,
          loop: true,
          callback: () => {
            if (!sprite.active) return;
            const idx = ((sprite as any).__walkIdx + 1) % bounceFrames.length;
            (sprite as any).__walkIdx = idx;
          },
        });
        this.behaviorTimers.push(timer);
        continue;
      }

      // ── Walk-in-place for Poochyena ──────────────────────
      // OG MOVEMENT_TYPE_WALK_IN_PLACE: cycle standing → leftFoot →
      // standing → rightFoot at ~250ms per frame.
      // NOTE: Poochyena is animated:true so Grid Engine applies
      // walkingAnimationMapping, which sets the standing frame every tick.
      // We override that in updateDepth() by re-setting the walk frame.
      if (npc.spriteKey === "poochyena_ow") {
        const dir = npc.facingDirection;
        const dirKey = dir === Direction.DOWN ? "down" :
          dir === Direction.UP ? "up" :
          dir === Direction.LEFT ? "left" : "right";
        const mapping = WALK_ANIM_MAPPING[dirKey];
        const walkFrames = [mapping.standing, mapping.leftFoot, mapping.standing, mapping.rightFoot];
        if (dir === Direction.RIGHT) sprite.flipX = true;
        // Store walk-in-place state on the sprite for updateDepth() to read
        (sprite as any).__walkFrames = walkFrames;
        (sprite as any).__walkIdx = 0;
        const timer = this.scene.time.addEvent({
          delay: 250,
          loop: true,
          callback: () => {
            if (!sprite.active) return;
            const idx = ((sprite as any).__walkIdx + 1) % walkFrames.length;
            (sprite as any).__walkIdx = idx;
          },
        });
        this.behaviorTimers.push(timer);
      }
    }
  }

  /**
   * Attempt interaction with the tile the player is facing.
   * Returns true if an NPC was found and dialog was triggered.
   */
  async tryInteract(
    playerPos: { x: number; y: number },
    playerFacing: Direction,
  ): Promise<boolean> {
    const target = this.getTileInFront(playerPos, playerFacing);

    for (const npc of this.npcs) {
      // Skip NPCs that have been picked up (no sprite in scene)
      if (npc.pickup && isPickedUp(npc.id)) continue;
      if (!this.sprites.has(npc.id)) continue;

      const npcPos = this.gridEngine.getPosition(npc.id);
      if (npcPos.x === target.x && npcPos.y === target.y) {
        // Make NPC face the player (opposite of player's facing direction)
        const originalDir = npc.facingDirection;
        if (npc.animated) {
          const faceDir = OPPOSITE[playerFacing];
          this.gridEngine.turnTowards(npc.id, faceDir);
          const sprite = this.sprites.get(npc.id);
          if (sprite) sprite.flipX = faceDir === Direction.RIGHT;
        }

        // ── Pokemon encounter: flash + dialog + Pokedex registration ──
        if (npc.pokemon) {
          const pkm = npc.pokemon;
          const firstTime = !isPokedexSeen(pkm.pokedexNumber);

          if (firstTime) {
            // Flash: white screen flash via Phaser camera, with the
            // rising "!" ping as the discovery cue.
            sfx.encounter();
            this.scene.cameras.main.flash(250, 255, 255, 255);
            // Wait for flash to finish before showing dialog
            await new Promise<void>((resolve) => {
              this.scene.time.delayedCall(300, resolve);
            });

            // Discovery dialog
            const descLines = pkm.projectDescription
              .split("\n")
              .flatMap((l) => wordWrap(l, 36));
            await this.dialogSystem.showDialog({
              lines: [
                `${pkm.speciesName} noticed you!`,
                "",
                ...descLines,
              ],
              speakerName: pkm.speciesName,
            });

            // Register in Pokedex (both stores for backwards compat)
            markPokedexSeen(pkm.pokedexNumber);
            markPokedexSeenInSave(pkm.pokedexNumber);
            checkBadges();

            // If this was an ephemeral Pokemon, the cycle stops here —
            // the sprite stays planted at whichever tile it was on
            // when the player found it. Subsequent session loads
            // rebuild it at spawnPoints[0] (see initEphemeral).
            if (npc.ephemeral) {
              this.promoteEphemeralToPermanent(npc.id);
            }
            trackPokedexRegister(pkm.speciesName, pkm.projectName);

            // Registration notification
            await this.dialogSystem.showDialog({
              lines: [
                `${pkm.speciesName} was registered`,
                `in the POKeDEX!`,
              ],
            });

            // Party join — if this wild Pokemon is flagged as joinable,
            // add it to the player's party. Content-phase sequencing
            // guarantees the party isn't full here; `addToParty` logs
            // a warning if the guard fires anyway.
            if (pkm.joinsParty) {
              const joined = addToParty(pkm.joinsParty);
              if (joined) {
                await this.dialogSystem.showDialog({
                  lines: [
                    `${pkm.speciesName} seems to like you!`,
                    `${pkm.speciesName} joined your team!`,
                  ],
                  speakerName: pkm.speciesName,
                });
              }
            }
          } else {
            // Repeat encounter — shorter dialog
            const repeatLines = pkm.repeatDialog ?? [
              `${pkm.speciesName} is still here.`,
              `It seems to be working on`,
              `${pkm.projectName}...`,
            ];
            await this.dialogSystem.showDialog({
              lines: repeatLines,
              speakerName: pkm.speciesName,
            });
          }

          return true;
        }

        // ── Auto-give trainer: item + move aside ──────────────
        if (npc.autoGive) {
          const cleared = isTrainerCleared(npc.id);
          if (cleared) {
            // Already cleared — show short dialog at aside position
            const lines = npc.autoGive.clearedDialog ?? [
              "Good luck with the rest",
              "of the GYM!",
            ];
            await this.dialogSystem.showDialog({
              lines,
              speakerName: npc.speakerName,
            });
          } else {
            // First interaction: dialog → give item → move aside
            await this.dialogSystem.showDialog({
              lines: npc.dialog,
              speakerName: npc.speakerName,
            });

            // Give item — pick the pocket-appropriate jingle so
            // blog posts and TMs don't all play the generic
            // item-get chime.
            if (npc.autoGive.pocket === "blogs") {
              sfx.blogGet();
            } else if (npc.autoGive.pocket === "tms") {
              sfx.tmGet();
            } else {
              sfx.pickup();
            }
            recordPickup(`trainer:${npc.id}`, {
              name: npc.autoGive.itemName,
              url: npc.autoGive.itemUrl,
              pocket: npc.autoGive.pocket,
              description: npc.autoGive.description,
            });
            await this.dialogSystem.showDialog({
              lines: [
                `Received ${npc.autoGive.itemName}!`,
                `It was sent to your BAG.`,
              ],
            });

            // Mark cleared + check badges
            markTrainerCleared(npc.id);
            checkBadges();

            // Walk to aside position
            const aside = npc.autoGive.asidePosition;
            this.gridEngine.moveTo(npc.id, { x: aside.x, y: aside.y });
          }

          // Restore facing
          if (npc.animated) {
            const sprite = this.sprites.get(npc.id);
            if (sprite) sprite.flipX = originalDir === Direction.RIGHT;
          }

          return true;
        }

        // Play pickup sound immediately on interact (before dialog)
        if (npc.pickup) {
          sfx.pickup();
        }

        // Dynamic dialog overrides static dialog (supports async)
        if (npc.dialogFn) {
          const result = await npc.dialogFn(getSave());
          await this.dialogSystem.showDialog({
            lines: result.lines,
            speakerName: result.speakerName ?? npc.speakerName,
          });
          if (result.afterDialog) {
            await result.afterDialog({ dialogSystem: this.dialogSystem });
          }
        } else {
          await this.dialogSystem.showDialog({
            lines: npc.dialog,
            speakerName: npc.speakerName,
          });
        }

        // Restore original facing direction
        if (npc.animated && !npc.pickup) {
          this.gridEngine.turnTowards(npc.id, originalDir);
          const sprite = this.sprites.get(npc.id);
          if (sprite) sprite.flipX = originalDir === Direction.RIGHT;
        }

        // If this is a pickup item, remove it from the scene and record it
        if (npc.pickup) {
          recordPickup(npc.id, {
            name: npc.pickup.itemName,
            url: npc.pickup.itemUrl,
          });
          this.removeNPC(npc.id);
        }

        return true;
      }
    }
    return false;
  }

  /**
   * Read-only peek: return the NPC currently occupying (x, y), or
   * null. Used by GateSystem.tryNpcGate as a pre-check before the
   * normal NPC dialog fires, so a party Pokemon with the right
   * field move can clear an NPC-type gate without playing the NPC's
   * dialog first (matching OG Pokemon's HM-on-Snorlax behavior).
   *
   * Iterates `this.npcs` the same way `tryInteract` does, but skips
   * NPCs that aren't currently spawned. The `sprites.has` guard
   * covers despawned pickups, hidden ephemerals, and NPCs whose
   * `spawnCondition` returned false. `getPosition` returns each
   * NPC's *current* position (not its data-file position), which is
   * correct — a wandering NPC on a gate tile should still pre-empt.
   */
  npcAtTile(x: number, y: number): { id: string } | null {
    for (const npc of this.npcs) {
      if (!this.sprites.has(npc.id)) continue;
      try {
        const p = this.gridEngine.getPosition(npc.id);
        if (p.x === x && p.y === y) return { id: npc.id };
      } catch {
        // Character missing from Grid Engine despite having a sprite —
        // ignore, next loop iteration handles it.
      }
    }
    return null;
  }

  /** Remove an NPC from the scene (sprite + grid engine character). */
  private removeNPC(npcId: string): void {
    const sprite = this.sprites.get(npcId);
    if (sprite) {
      sprite.destroy();
      this.sprites.delete(npcId);
    }
    const shadow = this.shadows.get(npcId);
    if (shadow) {
      shadow.destroy();
      this.shadows.delete(npcId);
    }
    try {
      this.gridEngine.removeCharacter(npcId);
    } catch {
      // ignore
    }
  }

  /** Clean up all behavior timers (call on scene shutdown). */
  destroy(): void {
    for (const timer of this.behaviorTimers) {
      timer.destroy();
    }
    this.behaviorTimers = [];
    for (const shadow of this.shadows.values()) shadow.destroy();
    this.shadows.clear();
    // Ephemeral timers and tweens live outside behaviorTimers — tear
    // them down explicitly so they don't keep firing after the scene
    // transitions to an interior.
    for (const state of this.ephemeralStates.values()) {
      if (state.timer) state.timer.destroy();
      if (state.hopTween) state.hopTween.stop();
      if (state.fadeTween) state.fadeTween.stop();
    }
    this.ephemeralStates.clear();
  }

  // ── Private helpers ──────────────────────────────────────────

  /** Update y-sorted depth, flipX, and shadow positions each frame. */
  updateDepth(): void {
    for (const [id, sprite] of this.sprites.entries()) {
      sprite.setDepth(10 + sprite.y);
      // flipX per-frame (directionChanged observable is unreliable)
      const npc = this.npcs.find((n) => n.id === id);
      if (npc?.animated) {
        // Walk-in-place Pokemon: override Grid Engine's standing frame
        // with the walk cycle frame. Must happen AFTER Grid Engine's
        // update (which runs before scene update).
        const walkFrames = (sprite as any).__walkFrames as number[] | undefined;
        if (walkFrames) {
          const idx = (sprite as any).__walkIdx as number;
          sprite.setFrame(walkFrames[idx]);
          // flipX is set once at init, don't override
        } else {
          const dir = this.gridEngine.getFacingDirection(id);
          sprite.flipX = dir === Direction.RIGHT;
        }
      }

      // Shadow at character feet.
      const shadow = this.shadows.get(id);
      if (shadow) {
        // Use tile position for stable placement (no tween jitter)
        const tilePos = this.gridEngine.getPosition(id);
        const feetX = tilePos.x * 16 + 8;
        const feetY = (tilePos.y + 1) * 16;

        // For moving NPCs, blend toward sprite.x for smooth tracking.
        // Stationary NPCs just use tile position.
        const isMoving = this.gridEngine.isMoving(id);
        const cx = isMoving ? sprite.x + 8 : feetX;
        const cy = isMoving ? sprite.y + sprite.displayHeight : feetY;

        shadow.setPosition(cx, cy);
        shadow.setDepth(9 + cy);
      }
    }
  }

  private createNPC(npc: NPCDefinition): void {
    const sprite = this.scene.add.sprite(0, 0, npc.spriteKey);
    if (npc.scale != null) sprite.setScale(npc.scale);
    if (npc.flipX) sprite.flipX = true;
    this.sprites.set(npc.id, sprite);
    this.homePositions.set(npc.id, { ...npc.position });

    if (npc.animated) {
      // 9-frame spritesheet (144x32): down(0-2), up(3-5), left(6-8)
      this.gridEngine.addCharacter({
        id: npc.id,
        sprite,
        startPosition: npc.position,
        speed: resolveSpeed(npc),
        offsetY: npc.offsetY ?? 0,
        facingDirection: npc.facingDirection,
        walkingAnimationMapping: WALK_ANIM_MAPPING,
        ...(npc.tileWidth != null && { tileWidth: npc.tileWidth }),
        ...(npc.tileHeight != null && { tileHeight: npc.tileHeight }),
        // Explicit collision groups so Grid Engine actually blocks the
        // player from walking through. The legacy `collides: true`
        // shorthand can fail to register the character in any group,
        // letting the player phase through.
        collides: {
          collidesWithTiles: true,
          collisionGroups: ["geDefault"],
        },
      });

      // Initial flip for right-facing NPCs
      if (npc.facingDirection === Direction.RIGHT) {
        sprite.flipX = true;
      }
      // NOTE: ongoing flipX handled per-frame in updateDepth()
    } else {
      // Non-animated sprite (e.g. item_ball — 16x16 single image)
      this.gridEngine.addCharacter({
        id: npc.id,
        sprite,
        startPosition: npc.position,
        speed: 0,
        offsetY: npc.offsetY ?? 0,
        facingDirection: npc.facingDirection,
        ...(npc.tileWidth != null && { tileWidth: npc.tileWidth }),
        ...(npc.tileHeight != null && { tileHeight: npc.tileHeight }),
        // Explicit collision groups so Grid Engine actually blocks the
        // player from walking through. The legacy `collides: true`
        // shorthand can fail to register the character in any group,
        // letting the player phase through.
        collides: {
          collidesWithTiles: true,
          collisionGroups: ["geDefault"],
        },
      });
    }

    // Start behavior timer
    this.startBehavior(npc);
  }

  // ── Ephemeral Pokemon lifecycle ──────────────────────────────

  /**
   * Decide the initial phase for an ephemeral NPC. If the Pokemon
   * has already been registered in the Pokedex we skip the whole
   * cycle and spawn it permanently at spawnPoints[0] — the first
   * configured location is the canonical "found it here" tile.
   * Otherwise we start hidden and wait half the configured
   * hiddenDuration before the first appearance (so first-time
   * players see some Pokemon quickly instead of waiting the full
   * cycle every load).
   */
  private initEphemeral(npc: NPCDefinition): void {
    if (!npc.ephemeral || !npc.pokemon) return;
    const config = npc.ephemeral;
    const state: EphemeralState = {
      def: npc,
      config,
      phase: "hidden",
    };
    this.ephemeralStates.set(npc.id, state);

    if (isPokedexSeen(npc.pokemon.pokedexNumber)) {
      // Already discovered: spawn once, never hide again.
      const anchor = config.spawnPoints[0] ?? npc.position;
      state.phase = "permanent";
      state.currentPos = { ...anchor };
      this.createNPC({ ...npc, position: { ...anchor } });
      return;
    }

    // First-time players: stagger the first appearance so the
    // screen isn't empty for a full hiddenDuration at boot.
    const firstDelayMs = this.jitterSeconds(config.hiddenDuration / 2, config.randomness) * 1000;
    state.timer = this.scene.time.delayedCall(firstDelayMs, () => {
      this.spawnEphemeral(npc.id);
    });
  }

  /**
   * Bring an ephemeral Pokemon on-screen at a randomly chosen spawn
   * point. Fades the sprite in, starts the chosen visible behavior,
   * and schedules the despawn timer.
   *
   * Spawn-point selection avoids:
   *   - the player's current tile (can't spawn under them)
   *   - any tile that already has a Grid Engine character on it
   *   - the tile this Pokemon was on last cycle, if possible
   */
  private spawnEphemeral(npcId: string): void {
    const state = this.ephemeralStates.get(npcId);
    if (!state || state.phase !== "hidden") return;

    const candidate = this.pickSpawnPoint(state);
    if (!candidate) {
      // All spawn points are blocked — try again shortly.
      state.timer = this.scene.time.delayedCall(2000, () => {
        this.spawnEphemeral(npcId);
      });
      return;
    }

    state.currentPos = candidate;
    state.phase = "visible";
    this.createNPC({ ...state.def, position: { ...candidate } });

    // Fade-in the sprite. createNPC sets alpha to 1 by default, so
    // explicitly start at 0 and tween up.
    const sprite = this.sprites.get(npcId);
    if (sprite) {
      sprite.setAlpha(0);
      state.fadeTween = this.scene.tweens.add({
        targets: sprite,
        alpha: 1,
        duration: 350,
        ease: "Sine.easeOut",
      });
    }

    // Visible behavior (hop bounces the sprite; idle does nothing;
    // wander falls back to hop for non-animated Pokemon sprites
    // since the grid-engine wander paths need animated characters).
    const behavior: EphemeralVisibleBehavior = state.config.visibleBehavior ?? "idle";
    if (behavior === "hop" || (behavior === "wander" && !state.def.animated)) {
      this.startHopTween(npcId);
    }

    // Schedule despawn.
    const visibleMs = this.jitterSeconds(state.config.visibleDuration, state.config.randomness) * 1000;
    state.timer = this.scene.time.delayedCall(visibleMs, () => {
      this.despawnEphemeral(npcId);
    });
  }

  /**
   * Fade out and remove an ephemeral Pokemon, then schedule the next
   * spawn. If the Pokemon has been promoted to permanent (player
   * caught it while the despawn was pending) this is a no-op — the
   * sprite stays put.
   */
  private despawnEphemeral(npcId: string): void {
    const state = this.ephemeralStates.get(npcId);
    if (!state) return;
    // Promoted mid-cycle — leave the sprite in place.
    if (state.phase === "permanent") return;
    if (state.phase !== "visible") return;

    // Cancel any active hop tween before the sprite is destroyed so
    // the tween engine doesn't hold a stale reference for a frame.
    this.stopHopTween(npcId);

    const sprite = this.sprites.get(npcId);
    if (sprite) {
      state.fadeTween = this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: 350,
        ease: "Sine.easeIn",
        onComplete: () => {
          // After the fade finishes the sprite might have been
          // destroyed already (scene teardown). Guard against that.
          if (this.sprites.has(npcId)) {
            this.removeNPC(npcId);
          }
          this.scheduleNextSpawn(npcId);
        },
      });
    } else {
      // No sprite (shouldn't happen) — go straight to rescheduling.
      this.removeNPC(npcId);
      this.scheduleNextSpawn(npcId);
    }
  }

  /** Transition from visible/hidden to the "permanent" phase. */
  private promoteEphemeralToPermanent(npcId: string): void {
    const state = this.ephemeralStates.get(npcId);
    if (!state) return;
    if (state.timer) {
      state.timer.destroy();
      state.timer = undefined;
    }
    // Leave any in-progress fade alone — if a fade-out was mid-
    // tween when the player talked to the Pokemon, the dialog
    // blocked input so the tween may or may not have completed.
    // Force the sprite fully opaque and cancel the fade so the
    // caught Pokemon doesn't flicker at 0 alpha.
    if (state.fadeTween && state.fadeTween.isPlaying()) {
      state.fadeTween.stop();
    }
    state.fadeTween = undefined;
    const sprite = this.sprites.get(npcId);
    if (sprite) sprite.setAlpha(1);
    state.phase = "permanent";
  }

  /** Schedule the next spawn of a hidden ephemeral Pokemon. */
  private scheduleNextSpawn(npcId: string): void {
    const state = this.ephemeralStates.get(npcId);
    if (!state) return;
    if (state.phase === "permanent") return;
    state.phase = "hidden";
    state.currentPos = undefined;
    const hiddenMs = this.jitterSeconds(state.config.hiddenDuration, state.config.randomness) * 1000;
    state.timer = this.scene.time.delayedCall(hiddenMs, () => {
      this.spawnEphemeral(npcId);
    });
  }

  /**
   * Pick a tile from spawnPoints that isn't the player's current
   * tile, isn't occupied by another Grid Engine character, and if
   * possible isn't the same tile the Pokemon was on last cycle.
   */
  private pickSpawnPoint(state: EphemeralState): { x: number; y: number } | null {
    const points = state.config.spawnPoints;
    if (points.length === 0) return null;

    let playerPos: { x: number; y: number } | null = null;
    try {
      playerPos = this.gridEngine.getPosition("player");
    } catch {
      // player not yet registered; fine — skip the collision check
    }

    const occupied = new Set<string>();
    if (playerPos) occupied.add(`${playerPos.x},${playerPos.y}`);
    for (const id of this.sprites.keys()) {
      if (id === state.def.id) continue;
      try {
        const p = this.gridEngine.getPosition(id);
        occupied.add(`${p.x},${p.y}`);
      } catch {
        // character not in grid engine — ignore
      }
    }

    const last = state.currentPos;
    const freeAndDifferent = points.filter(
      (p) =>
        !occupied.has(`${p.x},${p.y}`) &&
        !(last && last.x === p.x && last.y === p.y),
    );
    if (freeAndDifferent.length > 0) {
      return freeAndDifferent[Math.floor(Math.random() * freeAndDifferent.length)];
    }
    // Nothing new is free — fall back to any free point.
    const freeAny = points.filter((p) => !occupied.has(`${p.x},${p.y}`));
    if (freeAny.length > 0) {
      return freeAny[Math.floor(Math.random() * freeAny.length)];
    }
    return null;
  }

  /**
   * Small vertical-pixel bounce on the sprite. Doesn't move the
   * Grid Engine character — just tweens the sprite's y offset for
   * a "curious" idle animation. Stationary characters aren't
   * repositioned by Grid Engine each frame, so this tween sticks.
   */
  private startHopTween(npcId: string): void {
    const state = this.ephemeralStates.get(npcId);
    const sprite = this.sprites.get(npcId);
    if (!state || !sprite) return;
    const baseY = sprite.y;
    state.hopTween = this.scene.tweens.add({
      targets: sprite,
      y: baseY - 3,
      duration: 280,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      // Small pause between hops so it reads as "curious twitch"
      // rather than a metronome.
      hold: 0,
      delay: 400,
      repeatDelay: 900,
    });
  }

  private stopHopTween(npcId: string): void {
    const state = this.ephemeralStates.get(npcId);
    if (!state || !state.hopTween) return;
    state.hopTween.stop();
    state.hopTween = undefined;
  }

  /**
   * Apply timing jitter. `baseSeconds` × (1 + randomness × U(-1,+1))
   * — so randomness=0.25 gives ±25%, randomness=1 gives 0..2×.
   * Clamped to ≥1 second to avoid degenerate zero-duration cycles.
   */
  private jitterSeconds(baseSeconds: number, randomness = 0): number {
    const r = Math.max(0, Math.min(1, randomness));
    const jitter = (Math.random() * 2 - 1) * r;
    return Math.max(1, baseSeconds * (1 + jitter));
  }

  // ── End ephemeral lifecycle ──────────────────────────────────

  private startBehavior(npc: NPCDefinition): void {
    if (
      npc.movementBehavior === MovementBehavior.STATIONARY ||
      !npc.animated
    ) {
      return; // No autonomous movement needed
    }

    const timer = this.scene.time.addEvent({
      delay: this.randomDelay(npc),
      loop: false,
      callback: () => {
        this.executeBehavior(npc);
        // Re-schedule with a new random delay
        timer.reset({
          delay: this.randomDelay(npc),
          loop: false,
          callback: timer.callback,
          callbackScope: timer.callbackScope,
        });
      },
    });

    this.behaviorTimers.push(timer);
  }

  /**
   * External pause flag — set by OverworldScene when the start menu
   * is open so NPCs freeze in place too.
   */
  paused = false;

  private executeBehavior(npc: NPCDefinition): void {
    // Don't move NPCs while dialog or menu is active.
    if (this.dialogSystem.active || this.paused) return;
    // Don't move if the NPC is already moving
    if (this.gridEngine.isMoving(npc.id)) return;

    switch (npc.movementBehavior) {
      case MovementBehavior.WANDER_LEFT_RIGHT:
        this.wanderAxis(npc, "x");
        break;
      case MovementBehavior.WANDER_UP_DOWN:
        this.wanderAxis(npc, "y");
        break;
      case MovementBehavior.WANDER_AREA:
        this.wanderArea(npc);
        break;
      case MovementBehavior.PACE_HORIZONTAL:
      case MovementBehavior.RUN_HORIZONTAL:
        this.pace(npc, "x");
        break;
      case MovementBehavior.PACE_VERTICAL:
      case MovementBehavior.RUN_VERTICAL:
        this.pace(npc, "y");
        break;
      case MovementBehavior.LOOK_AROUND:
        this.lookAround(npc);
        break;
    }
  }

  /** Random 1-tile step along a single axis, clamped to the range. */
  private wanderAxis(npc: NPCDefinition, axis: "x" | "y"): void {
    const home = this.homePositions.get(npc.id)!;
    const pos = this.gridEngine.getPosition(npc.id);
    const range = axis === "x" ? npc.movementRangeX : npc.movementRangeY;
    if (range <= 0) return;

    const forward = axis === "x" ? Direction.RIGHT : Direction.DOWN;
    const back = axis === "x" ? Direction.LEFT : Direction.UP;
    const dir = Math.random() < 0.5 ? back : forward;
    const delta = dir === forward ? 1 : -1;
    const currentCoord = axis === "x" ? pos.x : pos.y;
    const homeCoord = axis === "x" ? home.x : home.y;

    if (Math.abs(currentCoord + delta - homeCoord) <= range) {
      this.gridEngine.move(npc.id, dir);
    }
  }

  /** Random 1-tile step in any of 4 directions, clamped to the range box. */
  private wanderArea(npc: NPCDefinition): void {
    const home = this.homePositions.get(npc.id)!;
    const pos = this.gridEngine.getPosition(npc.id);

    // Collect candidate directions whose next tile stays in the box.
    const candidates: Direction[] = [];
    if (npc.movementRangeX > 0) {
      if (Math.abs(pos.x - 1 - home.x) <= npc.movementRangeX) candidates.push(Direction.LEFT);
      if (Math.abs(pos.x + 1 - home.x) <= npc.movementRangeX) candidates.push(Direction.RIGHT);
    }
    if (npc.movementRangeY > 0) {
      if (Math.abs(pos.y - 1 - home.y) <= npc.movementRangeY) candidates.push(Direction.UP);
      if (Math.abs(pos.y + 1 - home.y) <= npc.movementRangeY) candidates.push(Direction.DOWN);
    }
    if (candidates.length === 0) return;

    const dir = candidates[Math.floor(Math.random() * candidates.length)];
    this.gridEngine.move(npc.id, dir);
  }

  /**
   * Predictable back-and-forth along an axis. Remembers the current
   * direction and flips it when the next step would exit the range.
   * Shared by PACE_* and RUN_* (differ only in default speed/tick).
   */
  private pace(npc: NPCDefinition, axis: "x" | "y"): void {
    const home = this.homePositions.get(npc.id)!;
    const pos = this.gridEngine.getPosition(npc.id);
    const range = axis === "x" ? npc.movementRangeX : npc.movementRangeY;
    if (range <= 0) return;

    const forward = axis === "x" ? Direction.RIGHT : Direction.DOWN;
    const back = axis === "x" ? Direction.LEFT : Direction.UP;

    // Seed with a random direction the first time we see this NPC.
    let dir = this.paceDirections.get(npc.id);
    if (dir !== forward && dir !== back) {
      dir = Math.random() < 0.5 ? forward : back;
      this.paceDirections.set(npc.id, dir);
    }

    // Flip if the next tile would leave the range box.
    const delta = dir === forward ? 1 : -1;
    const currentCoord = axis === "x" ? pos.x : pos.y;
    const homeCoord = axis === "x" ? home.x : home.y;
    if (Math.abs(currentCoord + delta - homeCoord) > range) {
      dir = dir === forward ? back : forward;
      this.paceDirections.set(npc.id, dir);
    }

    this.gridEngine.move(npc.id, dir);
  }

  private lookAround(npc: NPCDefinition): void {
    const directions = [
      Direction.UP,
      Direction.DOWN,
      Direction.LEFT,
      Direction.RIGHT,
    ];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    this.gridEngine.turnTowards(npc.id, randomDir);
  }

  private getTileInFront(
    pos: { x: number; y: number },
    facing: Direction,
  ): { x: number; y: number } {
    switch (facing) {
      case Direction.UP:
        return { x: pos.x, y: pos.y - 1 };
      case Direction.DOWN:
        return { x: pos.x, y: pos.y + 1 };
      case Direction.LEFT:
        return { x: pos.x - 1, y: pos.y };
      case Direction.RIGHT:
        return { x: pos.x + 1, y: pos.y };
      default:
        return pos;
    }
  }

  private randomDelay(npc: NPCDefinition): number {
    const { min, max } = resolveInterval(npc);
    return min + Math.random() * (max - min);
  }
}
