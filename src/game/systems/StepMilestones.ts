/**
 * StepMilestones — TMs sold at the Pokemart with steps as currency.
 *
 * Each TM represents a technology/skill in Kostas's toolkit. The player
 * earns steps by walking the world and spends them at the MART clerk
 * to buy individual TMs. The `steps` field on each entry is its price.
 *
 * Purchases are DEBITABLE — every TM deducts its price from the running
 * step counter via `spendSteps()`, so buying everything is an endurance
 * test. There's no auto-award — the player chooses what to prioritize.
 *
 * Persistence is delegated to GameSave — the collected-TMs list is
 * `save.tmsCollected`, the same array the Bag reads for the TMs
 * pocket, so there's a single source of truth.
 */

import { giveItem, hasItem } from "./GameSave";
import { getItemDef } from "@/game/data/itemDefinitions";
import { getSteps, spendSteps } from "./StepStore";
import { checkBadges } from "./BadgeMilestones";

export interface StepMilestone {
  /** Price in steps. */
  steps: number;
  itemId: string;
  tm: string;
  description: string;
}

/**
 * TM catalog for the Pokemart. The `steps` field is the buy price.
 * Order here is the display order in the shop (cheap → expensive).
 *
 * The 16 entries here + 3 starter TMs (python/git/linux, granted
 * for free at the start) + 1 questionnaire TM (tm_portfolio) = the
 * 20 TMs the ENGINEER badge requires.
 */
export const STEP_MILESTONES: StepMilestone[] = [
  { steps: 150,   itemId: "tm_numpy",         tm: "NUMPY",         description: "Vectorized numerics" },
  { steps: 200,   itemId: "tm_pandas",        tm: "PANDAS",        description: "DataFrames everywhere" },
  { steps: 250,   itemId: "tm_tailwind",      tm: "TAILWIND",      description: "Utility-first CSS" },
  { steps: 300,   itemId: "tm_jupyter",       tm: "JUPYTER",       description: "Research notebooks" },
  { steps: 500,   itemId: "tm_fastapi",       tm: "FASTAPI",       description: "Python web framework" },
  { steps: 1000,  itemId: "tm_nextjs",        tm: "NEXT.JS",       description: "React meta-framework" },
  { steps: 1500,  itemId: "tm_docker",        tm: "DOCKER",        description: "Containerization" },
  { steps: 2000,  itemId: "tm_pytorch",       tm: "PYTORCH",       description: "Deep learning framework" },
  { steps: 2500,  itemId: "tm_huggingface",   tm: "HUGGINGFACE",   description: "Pretrained models hub" },
  { steps: 3000,  itemId: "tm_aws",           tm: "AWS",           description: "Cloud infrastructure" },
  { steps: 4000,  itemId: "tm_kubernetes",    tm: "KUBERNETES",    description: "Container orchestration" },
  { steps: 5000,  itemId: "tm_ray",           tm: "RAY",           description: "Distributed training" },
  { steps: 6000,  itemId: "tm_terraform",     tm: "TERRAFORM",     description: "Infrastructure as code" },
  { steps: 7000,  itemId: "tm_langchain",     tm: "LANGCHAIN",     description: "LLM orchestration" },
  { steps: 8000,  itemId: "tm_system_design", tm: "SYSTEM DESIGN", description: "Architecture at scale" },
  { steps: 10000, itemId: "tm_vercel",        tm: "VERCEL",        description: "Ship it instantly" },
];

export function isTMCollected(itemId: string): boolean {
  return hasItem(itemId);
}

export function getCollectedTMCount(): number {
  return STEP_MILESTONES.filter((m) => hasItem(m.itemId)).length;
}

/** True if the player has enough steps to buy this TM. */
export function canAfford(milestone: StepMilestone): boolean {
  return getSteps() >= milestone.steps;
}

/**
 * Attempt to buy a TM. On success: debits the player's steps, puts the
 * TM in the bag, and re-checks badges. Returns true on success, false
 * if the player can't afford it or already owns it.
 */
export function buyTM(milestone: StepMilestone): boolean {
  if (hasItem(milestone.itemId)) return false;
  if (!canAfford(milestone)) return false;
  if (!spendSteps(milestone.steps)) return false;
  const def = giveItem(milestone.itemId);
  if (!def) return false;
  checkBadges();
  return true;
}

/** Milestone statuses for a step-tracker NPC or shop UI to render. */
export function getMilestoneStatuses(currentSteps: number): {
  milestone: StepMilestone;
  status: "collected" | "affordable" | "locked";
}[] {
  return STEP_MILESTONES.map((m) => {
    if (hasItem(m.itemId)) {
      return { milestone: m, status: "collected" as const };
    }
    if (currentSteps >= m.steps) {
      return { milestone: m, status: "affordable" as const };
    }
    return { milestone: m, status: "locked" as const };
  });
}

// Reference the unused import so tree-shaking doesn't complain.
void getItemDef;
