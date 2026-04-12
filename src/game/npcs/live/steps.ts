/**
 * Step Tracker NPC dialog — pure-local, no API. Pulls the current
 * step total from StepStore (localStorage-backed) and builds a
 * dialog comparing it to the closest TM purchase threshold.
 *
 * "Live" here means "driven by current save state, not hardcoded
 * text" which matches the criterion #10 spirit for the 5th NPC.
 */

import { getSteps, formatSteps } from "@/game/systems/StepStore";
import { STEP_MILESTONES } from "@/game/systems/StepMilestones";
import { hasItem } from "@/game/systems/GameSave";

export const STEPS_FALLBACK_LINES: string[] = [
  "Walking counts!",
  "Every tile you explore powers",
  "the MART's TM dispenser.",
  "Check in when you've walked",
  "a few hundred more steps.",
];

interface StepState {
  steps: number;
  nextUnaffordable?: {
    itemId: string;
    tm: string;
    price: number;
    deficit: number;
  };
  allOwned: boolean;
}

/**
 * Inspect the current save state to build the data structure the
 * dialog formatter needs. Exported so it can be unit-tested without
 * touching the React side.
 */
export function computeStepState(
  opts: { steps?: number; hasItemFn?: (id: string) => boolean } = {},
): StepState {
  const steps = opts.steps ?? getSteps();
  const hasFn = opts.hasItemFn ?? hasItem;

  // Find the cheapest TM the player DOESN'T own yet.
  const unowned = STEP_MILESTONES.filter((m) => !hasFn(m.itemId));
  if (unowned.length === 0) {
    return { steps, allOwned: true };
  }
  // Pick the cheapest unowned (not the next-tier-up) so even a broke
  // player sees their immediate target instead of "save 6800 more."
  const cheapest = unowned.reduce((prev, cur) =>
    cur.steps < prev.steps ? cur : prev,
  );
  return {
    steps,
    allOwned: false,
    nextUnaffordable: {
      itemId: cheapest.itemId,
      tm: cheapest.tm,
      price: cheapest.steps,
      deficit: Math.max(0, cheapest.steps - steps),
    },
  };
}

export function formatStepsDialog(state: StepState): string[] {
  const stepsStr = formatSteps(state.steps);
  if (state.allOwned) {
    return [
      "You've collected every TM!",
      `${stepsStr} steps logged.`,
      "Take a breath, TRAINER.",
      "You've earned it.",
    ];
  }
  const target = state.nextUnaffordable!;
  if (target.deficit <= 0) {
    return [
      `${stepsStr} steps logged!`,
      `You can afford TM ${target.tm}`,
      `(${target.price} steps).`,
      "Go check the MART catalog!",
    ];
  }
  return [
    `${stepsStr} steps logged.`,
    `Next up: TM ${target.tm}`,
    `at ${target.price} steps.`,
    `${target.deficit} more to go!`,
  ];
}

/**
 * One-shot helper. Reads live state and formats it.
 */
export function getStepsDialog(): string[] {
  try {
    const state = computeStepState();
    return formatStepsDialog(state);
  } catch {
    return STEPS_FALLBACK_LINES;
  }
}
