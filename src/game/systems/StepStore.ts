/**
 * StepStore — tracks the player's total step count across both the
 * overworld and every interior, persisted via localStorage so the
 * counter survives page reloads.
 *
 * Every time Grid Engine finishes moving the player by one tile the
 * scene calls `incrementStep()`, which bumps the stored count and
 * returns the new total. `getSteps()` reads the current value for
 * display (e.g. on the Trainer Card).
 *
 * `checkStepMilestones()` is a stub hook for future rewards (items,
 * dialog, achievements) — right now it just returns the milestone
 * that was reached on THIS step, if any, so callers can react.
 */

const STORAGE_KEY = "gkos:explore:steps";

/** Milestones the counter announces. Add more as rewards are defined. */
const STEP_MILESTONES = [100, 500, 1000, 2500, 5000, 10000] as const;

function readSteps(): number {
  if (typeof localStorage === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeSteps(n: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    // ignore
  }
}

/** Read the current step count. */
export function getSteps(): number {
  return readSteps();
}

/**
 * Add one to the step count and persist. Returns the new total. If
 * this increment crosses a milestone, the milestone value is returned
 * via the second element; otherwise it's null.
 */
export function incrementStep(): { total: number; milestone: number | null } {
  const before = readSteps();
  const after = before + 1;
  writeSteps(after);
  const milestone = checkStepMilestones(after, before);
  return { total: after, milestone };
}

/**
 * Returns the milestone that was CROSSED on this increment — i.e. the
 * largest milestone satisfying `before < m <= after`. Returns `null`
 * if no milestone was crossed this step.
 *
 * Callers can use this to trigger side effects (item gift, dialog,
 * fanfare) when a milestone is first reached.
 */
export function checkStepMilestones(
  after: number,
  before = after - 1,
): number | null {
  for (let i = STEP_MILESTONES.length - 1; i >= 0; i--) {
    const m = STEP_MILESTONES[i];
    if (before < m && after >= m) return m;
  }
  return null;
}

/**
 * Spend steps from the player's running total. Used by the Pokemart
 * shop where steps are the in-game currency. Returns true if the
 * player had enough steps (and the balance was decremented); false if
 * they couldn't afford the purchase.
 */
export function spendSteps(amount: number): boolean {
  if (amount <= 0) return true;
  const current = readSteps();
  if (current < amount) return false;
  writeSteps(current - amount);
  return true;
}

/** Clear the step count. Useful for testing / a full reset. */
export function clearSteps(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Format the step count for display — groups thousands with commas
 * so "1247" renders as "1,247" on the Trainer Card.
 */
export function formatSteps(n: number): string {
  return n.toLocaleString("en-US");
}
