import Phaser from "phaser";
import { Direction } from "grid-engine";
import type GridEngine from "grid-engine";
import { MovementBehavior, type NPCDefinition } from "@/game/types/npc";
import { DialogSystem } from "@/game/systems/DialogSystem";
import { isPickedUp, recordPickup } from "@/game/systems/PickupStore";
import { sfx } from "@/game/systems/SoundManager";

/**
 * Walking animation mapping from original pokeemerald source.
 * Frame layout: 0=down-stand, 1=up-stand, 2=left-stand,
 * 3=down-walkL, 4=down-walkR, 5=up-walkL, 6=up-walkR,
 * 7=left-walkL, 8=left-walkR. Right = left frames + hFlip.
 */
const WALK_ANIM_MAPPING = {
  down:  { leftFoot: 3, standing: 0, rightFoot: 4 },
  up:    { leftFoot: 5, standing: 1, rightFoot: 6 },
  left:  { leftFoot: 7, standing: 2, rightFoot: 8 },
  right: { leftFoot: 7, standing: 2, rightFoot: 8 },
};

/** Min/max interval in ms between autonomous NPC actions (wander, look around). */
const BEHAVIOR_MIN_MS = 2000;
const BEHAVIOR_MAX_MS = 4000;

/** Opposite direction lookup for making NPC face the player. */
const OPPOSITE: Record<string, Direction> = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
};

/**
 * NPCSystem — manages all NPCs on the overworld map.
 *
 * Responsibilities:
 * - Creates sprites and registers them with Grid Engine
 * - Drives autonomous movement behaviors (wander, look around)
 * - Handles player interaction (face player + show dialog)
 * - Pauses NPC behaviors while dialog is active
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
      this.createNPC(npc);
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

      // ── Walk-in-place for Poochyena ──────────────────────
      // OG MOVEMENT_TYPE_WALK_IN_PLACE: cycle standing → leftFoot →
      // standing → rightFoot at ~250ms per frame.
      if (npc.spriteKey === "poochyena_ow") {
        const dir = npc.facingDirection;
        const mapping = WALK_ANIM_MAPPING[
          dir === Direction.DOWN ? "down" :
          dir === Direction.UP ? "up" :
          dir === Direction.LEFT ? "left" : "right"
        ];
        const frames = [mapping.standing, mapping.leftFoot, mapping.standing, mapping.rightFoot];
        let idx = 0;
        this.scene.time.addEvent({
          delay: 250,
          loop: true,
          callback: () => {
            if (!sprite.active) return;
            sprite.setFrame(frames[idx]);
            idx = (idx + 1) % frames.length;
          },
        });
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

        await this.dialogSystem.showDialog({
          lines: npc.dialog,
          speakerName: npc.speakerName,
        });

        // Restore original facing direction
        if (npc.animated && !npc.pickup) {
          this.gridEngine.turnTowards(npc.id, originalDir);
          const sprite = this.sprites.get(npc.id);
          if (sprite) sprite.flipX = originalDir === Direction.RIGHT;
        }

        // If this is a pickup item, remove it from the scene and record it
        if (npc.pickup) {
          sfx.pickup();
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
  }

  // ── Private helpers ──────────────────────────────────────────

  /** Update y-sorted depth, flipX, and shadow positions each frame. */
  updateDepth(): void {
    for (const [id, sprite] of this.sprites.entries()) {
      sprite.setDepth(10 + sprite.y);
      // flipX per-frame (directionChanged observable is unreliable)
      const npc = this.npcs.find((n) => n.id === id);
      if (npc?.animated) {
        // Skip flipX override for walk-in-place Pokemon (timer controls frames)
        if (npc.spriteKey !== "poochyena_ow") {
          const dir = this.gridEngine.getFacingDirection(id);
          sprite.flipX = dir === Direction.RIGHT;
        }
      }

      // Shadow at character feet. Grid Engine sets sprite origin to
      // top-left (0,0) via setOrigin or container. The character's
      // feet are at (sprite.x + halfWidth, sprite.y + fullHeight).
      const shadow = this.shadows.get(id);
      if (shadow) {
        const cx = sprite.x + sprite.displayWidth / 2;
        const cy = sprite.y + sprite.displayHeight;
        shadow.setPosition(cx, cy);
        shadow.setDepth(sprite.depth - 1);
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
        speed: 2,
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

  private startBehavior(npc: NPCDefinition): void {
    if (
      npc.movementBehavior === MovementBehavior.STATIONARY ||
      !npc.animated
    ) {
      return; // No autonomous movement needed
    }

    const timer = this.scene.time.addEvent({
      delay: this.randomDelay(),
      loop: false,
      callback: () => {
        this.executeBehavior(npc);
        // Re-schedule with a new random delay
        timer.reset({
          delay: this.randomDelay(),
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
        this.wanderLeftRight(npc);
        break;
      case MovementBehavior.LOOK_AROUND:
        this.lookAround(npc);
        break;
    }
  }

  private wanderLeftRight(npc: NPCDefinition): void {
    const currentPos = this.gridEngine.getPosition(npc.id);
    const home = this.homePositions.get(npc.id)!;

    // Pick random direction: left or right
    const dir = Math.random() < 0.5 ? Direction.LEFT : Direction.RIGHT;

    // Calculate what the new position would be
    const newX = dir === Direction.LEFT ? currentPos.x - 1 : currentPos.x + 1;

    // Check range constraints
    if (Math.abs(newX - home.x) <= npc.movementRangeX) {
      this.gridEngine.move(npc.id, dir);
    }
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

  private randomDelay(): number {
    return (
      BEHAVIOR_MIN_MS + Math.random() * (BEHAVIOR_MAX_MS - BEHAVIOR_MIN_MS)
    );
  }
}
