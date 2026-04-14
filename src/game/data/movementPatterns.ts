/**
 * Named Movement Patterns — editor-driven NPC behavior definitions.
 *
 * Each pattern describes how an NPC looks around and/or walks. Patterns
 * are referenced by id from both overworld NPCs (`NPCSystem`) and
 * interior NPCs (`InteriorScene`). Edit via the /editor Data → Movement
 * tab. Do NOT use variable references for field values — the editor's
 * export script parses this file with regex and needs literal values.
 */

export interface DirectionWeights {
  up: number;
  down: number;
  left: number;
  right: number;
}

export interface MovementPattern {
  /** Unique identifier, e.g. "guard_patrol". */
  id: string;
  /** Display label in the editor dropdown. */
  label: string;

  // ── Look (turn in place) ──────────────────────────────
  lookEnabled: boolean;
  /** Weighted ratios per direction. {up:1,down:1,left:0,right:0} = only up/down, equal chance. */
  lookDirections: DirectionWeights;
  /** [min, max] ms between looks. */
  lookFrequencyMs: [number, number];

  // ── Walk (take a step) ────────────────────────────────
  walkEnabled: boolean;
  walkDirections: DirectionWeights;
  /** [min, max] tiles per walk burst. */
  walkStepsPerMove: [number, number];
  /** [min, max] ms between walk bursts. */
  walkFrequencyMs: [number, number];
  /** Tiles/sec. 2 = standard walk, 8 = run. */
  walkSpeed: number;

  // ── Constraints ───────────────────────────────────────
  /** Max tiles the NPC can stray from home in X axis. */
  maxRangeX: number;
  /** Max tiles the NPC can stray from home in Y axis. */
  maxRangeY: number;

  // ── Mode ──────────────────────────────────────────────
  /**
   * If true, walk picks a single direction and bounces at boundaries
   * (back-and-forth). If false, walk picks a random weighted direction
   * each burst.
   */
  paceMode: boolean;
}

/**
 * Pre-seeded patterns that replicate the legacy MovementBehavior enum.
 * The ids match the enum string values so existing NPCs work unchanged.
 */
export const MOVEMENT_PATTERNS: Record<string, MovementPattern> = {
  stationary: {
    id: "stationary",
    label: "Stationary",
    lookEnabled: false,
    lookDirections: { up: 0, down: 0, left: 0, right: 0 },
    lookFrequencyMs: [2000, 4000],
    walkEnabled: false,
    walkDirections: { up: 0, down: 0, left: 0, right: 0 },
    walkStepsPerMove: [1, 1],
    walkFrequencyMs: [2000, 4000],
    walkSpeed: 0,
    maxRangeX: 0,
    maxRangeY: 0,
    paceMode: false,
  },
  look_around: {
    id: "look_around",
    label: "Look Around",
    lookEnabled: true,
    lookDirections: { up: 1, down: 1, left: 1, right: 1 },
    lookFrequencyMs: [2000, 4000],
    walkEnabled: false,
    walkDirections: { up: 0, down: 0, left: 0, right: 0 },
    walkStepsPerMove: [1, 1],
    walkFrequencyMs: [2000, 4000],
    walkSpeed: 0,
    maxRangeX: 0,
    maxRangeY: 0,
    paceMode: false,
  },
  wander_left_right: {
    id: "wander_left_right",
    label: "Wander Left/Right",
    lookEnabled: false,
    lookDirections: { up: 0, down: 0, left: 0, right: 0 },
    lookFrequencyMs: [2000, 4000],
    walkEnabled: true,
    walkDirections: { up: 0, down: 0, left: 1, right: 1 },
    walkStepsPerMove: [1, 1],
    walkFrequencyMs: [2000, 4000],
    walkSpeed: 2,
    maxRangeX: 2,
    maxRangeY: 0,
    paceMode: false,
  },
  wander_up_down: {
    id: "wander_up_down",
    label: "Wander Up/Down",
    lookEnabled: false,
    lookDirections: { up: 0, down: 0, left: 0, right: 0 },
    lookFrequencyMs: [2000, 4000],
    walkEnabled: true,
    walkDirections: { up: 1, down: 1, left: 0, right: 0 },
    walkStepsPerMove: [1, 1],
    walkFrequencyMs: [2000, 4000],
    walkSpeed: 2,
    maxRangeX: 0,
    maxRangeY: 2,
    paceMode: false,
  },
  wander_area: {
    id: "wander_area",
    label: "Wander Area",
    lookEnabled: false,
    lookDirections: { up: 0, down: 0, left: 0, right: 0 },
    lookFrequencyMs: [2000, 4000],
    walkEnabled: true,
    walkDirections: { up: 1, down: 1, left: 1, right: 1 },
    walkStepsPerMove: [1, 1],
    walkFrequencyMs: [2000, 4000],
    walkSpeed: 2,
    maxRangeX: 2,
    maxRangeY: 2,
    paceMode: false,
  },
  pace_horizontal: {
    id: "pace_horizontal",
    label: "Pace Horizontal",
    lookEnabled: false,
    lookDirections: { up: 0, down: 0, left: 0, right: 0 },
    lookFrequencyMs: [2000, 4000],
    walkEnabled: true,
    walkDirections: { up: 0, down: 0, left: 1, right: 1 },
    walkStepsPerMove: [1, 1],
    walkFrequencyMs: [2000, 4000],
    walkSpeed: 2,
    maxRangeX: 2,
    maxRangeY: 0,
    paceMode: true,
  },
  pace_vertical: {
    id: "pace_vertical",
    label: "Pace Vertical",
    lookEnabled: false,
    lookDirections: { up: 0, down: 0, left: 0, right: 0 },
    lookFrequencyMs: [2000, 4000],
    walkEnabled: true,
    walkDirections: { up: 1, down: 1, left: 0, right: 0 },
    walkStepsPerMove: [1, 1],
    walkFrequencyMs: [2000, 4000],
    walkSpeed: 2,
    maxRangeX: 0,
    maxRangeY: 2,
    paceMode: true,
  },
  run_horizontal: {
    id: "run_horizontal",
    label: "Run Horizontal",
    lookEnabled: false,
    lookDirections: { up: 0, down: 0, left: 0, right: 0 },
    lookFrequencyMs: [500, 1000],
    walkEnabled: true,
    walkDirections: { up: 0, down: 0, left: 1, right: 1 },
    walkStepsPerMove: [1, 1],
    walkFrequencyMs: [500, 1000],
    walkSpeed: 8,
    maxRangeX: 3,
    maxRangeY: 0,
    paceMode: true,
  },
  run_vertical: {
    id: "run_vertical",
    label: "Run Vertical",
    lookEnabled: false,
    lookDirections: { up: 0, down: 0, left: 0, right: 0 },
    lookFrequencyMs: [500, 1000],
    walkEnabled: true,
    walkDirections: { up: 1, down: 1, left: 0, right: 0 },
    walkStepsPerMove: [1, 1],
    walkFrequencyMs: [500, 1000],
    walkSpeed: 8,
    maxRangeX: 0,
    maxRangeY: 3,
    paceMode: true,
  },
};

/** Look up a pattern by id. Returns undefined if not found. */
export function getMovementPattern(id: string | undefined): MovementPattern | undefined {
  if (!id) return undefined;
  return MOVEMENT_PATTERNS[id];
}

/** Pick a weighted random direction from a DirectionWeights object. Returns null if all weights are 0. */
export function weightedRandomDirection(weights: DirectionWeights): "up" | "down" | "left" | "right" | null {
  const total = weights.up + weights.down + weights.left + weights.right;
  if (total <= 0) return null;
  let r = Math.random() * total;
  if ((r -= weights.up) < 0) return "up";
  if ((r -= weights.down) < 0) return "down";
  if ((r -= weights.left) < 0) return "left";
  return "right";
}

/** Random integer in [min, max] inclusive. */
export function randomIntInRange(range: [number, number]): number {
  const [min, max] = range;
  return Math.floor(min + Math.random() * (max - min + 1));
}
