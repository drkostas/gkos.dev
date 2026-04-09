import Phaser from "phaser";
import { Direction } from "grid-engine";
import type GridEngine from "grid-engine";
import { MovementBehavior, type NPCDefinition } from "@/game/types/npc";
import { DialogSystem } from "@/game/systems/DialogSystem";

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
      this.createNPC(npc);
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
      const npcPos = this.gridEngine.getPosition(npc.id);
      if (npcPos.x === target.x && npcPos.y === target.y) {
        // Make NPC face the player (opposite of player's facing direction)
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
        return true;
      }
    }
    return false;
  }

  /** Clean up all behavior timers (call on scene shutdown). */
  destroy(): void {
    for (const timer of this.behaviorTimers) {
      timer.destroy();
    }
    this.behaviorTimers = [];
  }

  // ── Private helpers ──────────────────────────────────────────

  /** Update y-sorted depth and flipX for all NPC sprites each frame. */
  updateDepth(): void {
    for (const [id, sprite] of this.sprites.entries()) {
      sprite.setDepth(10 + sprite.y);
      // flipX per-frame (directionChanged observable is unreliable)
      const npc = this.npcs.find((n) => n.id === id);
      if (npc?.animated) {
        const dir = this.gridEngine.getFacingDirection(id);
        sprite.flipX = dir === Direction.RIGHT;
      }
    }
  }

  private createNPC(npc: NPCDefinition): void {
    const sprite = this.scene.add.sprite(0, 0, npc.spriteKey);
    this.sprites.set(npc.id, sprite);
    this.homePositions.set(npc.id, { ...npc.position });

    if (npc.animated) {
      // 9-frame spritesheet (144x32): down(0-2), up(3-5), left(6-8)
      this.gridEngine.addCharacter({
        id: npc.id,
        sprite,
        startPosition: npc.position,
        speed: 2,
        offsetY: 0,
        facingDirection: npc.facingDirection,
        walkingAnimationMapping: WALK_ANIM_MAPPING,
        collides: true,
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
        offsetY: 0,
        facingDirection: npc.facingDirection,
        collides: true,
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

  private executeBehavior(npc: NPCDefinition): void {
    // Don't move NPCs while dialog is active
    if (this.dialogSystem.active) return;
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
