/**
 * StepMilestones — awards TMs at step count thresholds.
 *
 * Each TM represents a technology/skill in Kostas's toolkit. Walking
 * more of the world unlocks more TMs, encouraging exploration.
 *
 * Works alongside StepStore (which tracks the raw count). This module
 * just handles the threshold → item mapping and the "pending award"
 * pattern that OverworldScene polls each frame to pop a dialog.
 *
 * Persistence is delegated to GameSave — the collected-TMs list is
 * `save.tmsCollected`, the same array the Bag reads for the TMs
 * pocket, so there's a single source of truth.
 */

import { giveItem, hasItem } from "./GameSave";
import { getItemDef } from "@/game/data/itemDefinitions";
import { sfx } from "./SoundManager";
import { checkBadges } from "./BadgeMilestones";

export interface StepMilestone {
  steps: number;
  itemId: string;
  tm: string;
  description: string;
}

/**
 * Step thresholds and the TM each one grants. The `itemId` must
 * match an entry in ITEM_DEFINITIONS so `giveItem` can look it up.
 */
export const STEP_MILESTONES: StepMilestone[] = [
  { steps: 250,  itemId: "tm_tailwind",      tm: "TAILWIND",      description: "Utility-first CSS" },
  { steps: 500,  itemId: "tm_fastapi",       tm: "FASTAPI",       description: "Python web framework" },
  { steps: 1000, itemId: "tm_nextjs",        tm: "NEXT.JS",       description: "React meta-framework" },
  { steps: 1500, itemId: "tm_docker",        tm: "DOCKER",        description: "Containerization" },
  { steps: 2000, itemId: "tm_pytorch",       tm: "PYTORCH",       description: "Deep learning framework" },
  { steps: 3000, itemId: "tm_aws",           tm: "AWS",           description: "Cloud infrastructure" },
  { steps: 4000, itemId: "tm_kubernetes",    tm: "KUBERNETES",    description: "Container orchestration" },
  { steps: 6000, itemId: "tm_terraform",     tm: "TERRAFORM",     description: "Infrastructure as code" },
  { steps: 8000, itemId: "tm_system_design", tm: "SYSTEM DESIGN", description: "Architecture at scale" },
];

export function isTMCollected(itemId: string): boolean {
  return hasItem(itemId);
}

export function getCollectedTMCount(): number {
  return STEP_MILESTONES.filter((m) => hasItem(m.itemId)).length;
}

// ── Pending award (consumed by scene update loop) ─────────

let pendingAward: StepMilestone | null = null;

export function getPendingAward(): StepMilestone | null {
  return pendingAward;
}

export function clearPendingAward(): void {
  pendingAward = null;
}

/**
 * Check step milestones after a step increment. Awards at most one
 * TM per call — if the player crosses multiple thresholds at once
 * (e.g. a teleport), the first uncollected one wins and the rest
 * wait for the next call.
 *
 * On award: persists to GameSave via `giveItem`, plays `sfx.pickup`,
 * stores the milestone in `pendingAward` so the scene can surface a
 * dialog on the next update tick.
 */
export function checkStepTMs(currentSteps: number): StepMilestone | null {
  for (const milestone of STEP_MILESTONES) {
    if (currentSteps >= milestone.steps && !hasItem(milestone.itemId)) {
      const def = giveItem(milestone.itemId);
      if (!def) continue;
      // Sound is played by the scene when it shows the award dialog
      pendingAward = milestone;
      checkBadges();
      return milestone;
    }
  }
  return null;
}

/** Milestone statuses for a step-tracker NPC to render. */
export function getMilestoneStatuses(currentSteps: number): {
  milestone: StepMilestone;
  status: "collected" | "next" | "locked";
}[] {
  let foundNext = false;
  return STEP_MILESTONES.map((m) => {
    if (hasItem(m.itemId)) {
      return { milestone: m, status: "collected" as const };
    }
    if (!foundNext && currentSteps < m.steps) {
      foundNext = true;
      return { milestone: m, status: "next" as const };
    }
    if (!foundNext) {
      // Already past the threshold but haven't received — shouldn't
      // happen in practice since checkStepTMs runs on each step,
      // but label as "next" defensively.
      foundNext = true;
      return { milestone: m, status: "next" as const };
    }
    return { milestone: m, status: "locked" as const };
  });
}

// Reference the unused import so tree-shaking doesn't complain.
void getItemDef;
