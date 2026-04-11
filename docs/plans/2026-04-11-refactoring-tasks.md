# Explore Mode — Refactoring & Bug Fix Tasks

> Each task below is FULLY SELF-CONTAINED. Same format as the engine tasks doc.
> These are code quality improvements — no new features, no behavior changes
> (except R8 which is a bug fix).
>
> **Golden rule: we prefer dirty code over broken code.** Every refactoring
> here is a pure extraction or reorganization. No logic changes. If a task
> feels risky, skip it.

---

## DEPENDENCY MAP

```
R1 (scene utilities)    — standalone, no deps
R2 (useGameKeyboard)    — standalone, no deps
R3 (useTypewriter)      — standalone, no deps
R4 (localStorage util)  — standalone, no deps
R5 (split Birch)        — DO AFTER R2 + R3 (Birch uses both patterns)
R6 (interior interact)  — DO AFTER R1 (uses extracted scene helpers)
R7 (menu navigation)    — DO AFTER R2 (useGameKeyboard simplifies menus first)
R8 (research log bug)   — standalone, DO BEFORE content phase
```

**Safe to parallelize:** R1, R2, R3, R4 can all be done simultaneously — they touch
completely different files.

**DO NOT work together:** R1 + R6 both touch InteriorScene.ts. Do R1 first (extract
constants/utilities), then R6 (extract interaction logic). Otherwise merge conflicts.

**DO NOT work together:** R2 + R5 both touch BirchSpeechLayer.tsx. Do R2 first (the
hook), then R5 (the split). R5 is much cleaner if the keyboard hook already exists.

---

## TASK R1: Extract Shared Scene Utilities [LOW RISK]

### What the code does now:

OverworldScene.ts (1371 lines) and InteriorScene.ts (1724 lines) duplicate ~150 lines
of identical code:

**Constants (character-for-character identical in both files):**
- `WALK_ANIM` — 9-frame walking animation mapping (OverworldScene:40, InteriorScene:46)
- `RUN_ANIM` — running animation mapping offset by 9 (OverworldScene:48, InteriorScene:54)
- `OPPOSITE` — direction reverse lookup (InteriorScene:62, OverworldScene has inline equivalents)
- `WALK_SPEED = 4`, `RUN_SPEED = 8` (OverworldScene:136-137, InteriorScene:80-81)
- `BONK_INTERVAL_WALK = 700`, `BONK_INTERVAL_RUN = 350` (both scenes)

**Utility methods (identical implementations):**
- `dirToAnimKey(dir)` — Direction enum → "down"|"up"|"left"|"right" string
  (OverworldScene:1138-1146, InteriorScene:1260-1268)
- `getTileInDirection(pos, dir)` — returns adjacent tile position
  (OverworldScene:1270-1280, InteriorScene:1247-1257)
- `stringToDirection(s)` — string → Direction enum
  (OverworldScene:1382-1390, InteriorScene:1270-1278)

**Behavior (near-identical, ~50 lines each):**
- `handleBlocked(moveDir, delta)` — walk-in-place animation + bonk SFX at step rate.
  Both scenes implement the same blocked-walk foot-toggle state machine with the same
  timing, same SFX calls, same frame selection logic.
  (OverworldScene:1090-1136, InteriorScene:1152-1198)

**Debug overlay:**
- `updateDebugOverlay()` — ~40 lines each, renders tile coordinate text on screen.
  Nearly identical implementation. (OverworldScene:426-463, InteriorScene:1321-1358)

### Why this matters:

Any bug fix or improvement to these shared behaviors must be applied to BOTH files.
The `handleBlocked` walk-in-place logic has already been through several iterations —
each time both scenes had to be updated in sync. Future scenes (if any) would need to
copy the same code again.

### What to build:

**New file: `src/game/utils/sceneHelpers.ts`**

```typescript
import { Direction } from "grid-engine";

// ── Animation constants ──────────────────────────────────
export const WALK_ANIM = {
  down:  { leftFoot: 3, standing: 0, rightFoot: 4 },
  up:    { leftFoot: 5, standing: 1, rightFoot: 6 },
  left:  { leftFoot: 7, standing: 2, rightFoot: 8 },
  right: { leftFoot: 7, standing: 2, rightFoot: 8 },
};

export const RUN_ANIM = {
  down:  { leftFoot: 12, standing: 9,  rightFoot: 13 },
  up:    { leftFoot: 14, standing: 10, rightFoot: 15 },
  left:  { leftFoot: 16, standing: 11, rightFoot: 17 },
  right: { leftFoot: 16, standing: 11, rightFoot: 17 },
};

export const WALK_SPEED = 4;
export const RUN_SPEED = 8;
export const BONK_INTERVAL_WALK = 700;
export const BONK_INTERVAL_RUN = 350;

export const OPPOSITE: Record<string, Direction> = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
};

// ── Direction utilities ──────────────────────────────────
export type AnimDirKey = "down" | "up" | "left" | "right";

export function dirToAnimKey(dir: Direction): AnimDirKey {
  switch (dir) {
    case Direction.DOWN: return "down";
    case Direction.UP: return "up";
    case Direction.LEFT: return "left";
    case Direction.RIGHT: return "right";
    default: return "down";
  }
}

export function getTileInDirection(
  pos: { x: number; y: number },
  dir: Direction,
): { x: number; y: number } {
  switch (dir) {
    case Direction.UP: return { x: pos.x, y: pos.y - 1 };
    case Direction.DOWN: return { x: pos.x, y: pos.y + 1 };
    case Direction.LEFT: return { x: pos.x - 1, y: pos.y };
    case Direction.RIGHT: return { x: pos.x + 1, y: pos.y };
    default: return { ...pos };
  }
}

export function stringToDirection(s: string): Direction {
  switch (s) {
    case "up": return Direction.UP;
    case "down": return Direction.DOWN;
    case "left": return Direction.LEFT;
    case "right": return Direction.RIGHT;
    default: return Direction.DOWN;
  }
}
```

**`handleBlocked` extraction:**

This one is trickier because it reads and mutates scene-local state (blockedDir,
blockedStepTimer, blockedBonkTimer, blockedFootToggle, isRunning). Extract it as a
function that takes a mutable state object:

```typescript
export interface BlockedWalkState {
  blockedDir: Direction | null;
  blockedStepTimer: number;
  blockedBonkTimer: number;
  blockedFootToggle: boolean;
}

export function handleBlockedWalk(
  state: BlockedWalkState,
  moveDir: Direction,
  delta: number,
  isRunning: boolean,
  sprite: Phaser.GameObjects.Sprite,
  gridEngine: GridEngine,
  playerId: string,
): void {
  gridEngine.turnTowards(playerId, moveDir);
  sprite.flipX = moveDir === Direction.RIGHT;
  // ... rest of the logic, using state.blockedDir etc.
}
```

Each scene keeps a `BlockedWalkState` object and passes it to the shared function.
The scene's `update()` resets `state.blockedDir = null` when movement resumes (same
as current behavior).

### Files to modify:
- `src/game/utils/sceneHelpers.ts` — NEW
- `src/game/scenes/OverworldScene.ts` — remove duplicated constants/methods, import from sceneHelpers
- `src/game/scenes/InteriorScene.ts` — same

### Testing:
1. Walk around the overworld — movement speed, animation frames unchanged
2. Walk into a wall — bonk SFX timing and walk-in-place animation unchanged
3. Hold Shift to run — speed swap and run animation unchanged
4. Enter an interior — same tests inside a building
5. `npx tsc --noEmit` clean

---

## TASK R2: `useGameKeyboard` Hook + Key Matchers [LOW RISK]

### What the code does now:

18 React components implement the same keyboard event pattern:

```typescript
useEffect(() => {
  if (!visible) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === "a" || e.key === "A" || e.key === " " || e.key === "Enter") {
      // confirm action
    }
    if (e.key === "s" || e.key === "S" || e.key === "Backspace") {
      // cancel action
    }
    // ... arrows, escape, etc.
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [visible, ...deps]);
```

**Components with this pattern:**
DialogBox.tsx, BirchSpeechLayer.tsx, BagMenu.tsx, QuestionnaireInterface.tsx,
TrainerCard.tsx, StartMenu.tsx, PartyMenu.tsx, PCInterface.tsx, HelpScreen.tsx,
MartShopInterface.tsx, PokedexList.tsx, PokemonSummary.tsx, OptionsMenu.tsx,
OpeningScreen.tsx, TitleScreenLayer.tsx, NotificationBanner.tsx, ResearchLogViewer.tsx,
MapNamePopup.tsx

**Key matching is inconsistent:**
- DialogBox: `["a", "A", " ", "Enter"]` (array includes)
- BirchSpeechLayer: `e.key === "a" || e.key === "A" || ...` (repeated 5 times)
- BagMenu: `e.key === "a" || e.key === "A" || ...` (chained conditionals)
- StartMenu: different casing checks

No shared "is this the confirm button?" function exists.

### What to build:

**New file: `src/game/utils/inputKeys.ts`**

```typescript
const CONFIRM_KEYS = new Set(["a", "A", " ", "Enter"]);
const CANCEL_KEYS = new Set(["s", "S", "Backspace"]);
const MENU_KEYS = new Set(["Escape", "m", "M"]);

export const isConfirmKey = (k: string): boolean => CONFIRM_KEYS.has(k);
export const isCancelKey = (k: string): boolean => CANCEL_KEYS.has(k);
export const isMenuKey = (k: string): boolean => MENU_KEYS.has(k);
export const isUpKey = (k: string): boolean => k === "ArrowUp";
export const isDownKey = (k: string): boolean => k === "ArrowDown";
export const isLeftKey = (k: string): boolean => k === "ArrowLeft";
export const isRightKey = (k: string): boolean => k === "ArrowRight";
```

**New file: `src/game/hooks/useGameKeyboard.ts`**

```typescript
import { useEffect } from "react";

interface KeyHandlers {
  confirm?: () => void;
  cancel?: () => void;
  up?: () => void;
  down?: () => void;
  left?: () => void;
  right?: () => void;
  menu?: () => void;
  /** Catch-all for keys not matched above. */
  other?: (e: KeyboardEvent) => void;
}

/**
 * Attach game keyboard handlers when `active` is true.
 * Automatically prevents default on matched keys.
 * Cleans up on unmount or when active flips to false.
 */
export function useGameKeyboard(active: boolean, handlers: KeyHandlers): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (isConfirmKey(e.key)) { e.preventDefault(); handlers.confirm?.(); }
      else if (isCancelKey(e.key)) { e.preventDefault(); handlers.cancel?.(); }
      else if (isUpKey(e.key)) { e.preventDefault(); handlers.up?.(); }
      else if (isDownKey(e.key)) { e.preventDefault(); handlers.down?.(); }
      else if (isLeftKey(e.key)) { e.preventDefault(); handlers.left?.(); }
      else if (isRightKey(e.key)) { e.preventDefault(); handlers.right?.(); }
      else if (isMenuKey(e.key)) { e.preventDefault(); handlers.menu?.(); }
      else { handlers.other?.(e); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, handlers]);
}
```

**IMPORTANT:** Handlers must be stable references (wrapped in `useCallback`) or the
effect will re-fire every render. Document this in the JSDoc. Components that currently
use refs to avoid stale closures (e.g. DialogBox) continue to use refs — the hook just
eliminates the addEventListener/removeEventListener boilerplate.

**Migration approach:** Do this incrementally — one component at a time. Start with the
simplest (NotificationBanner, MapNamePopup), then work through the complex ones (BagMenu,
BirchSpeechLayer). Each component is an independent change that can be committed separately.

### Files to create:
- `src/game/utils/inputKeys.ts` — key matcher functions
- `src/game/hooks/useGameKeyboard.ts` — the hook

### Files to modify:
- 18 React components (incrementally, one at a time)

### Testing:
After each component migration:
1. Open the component in-game
2. Press confirm (A/Space/Enter), cancel (S/Backspace), arrows — all work as before
3. Close/dismiss works
4. No double-fire or missed input
5. `npx tsc --noEmit` clean

---

## TASK R3: `useTypewriter` Hook [LOW RISK]

### What the code does now:

DialogBox.tsx (lines 51-71) and BirchSpeechLayer.tsx (lines 158-185) both implement
character-by-character text display:
- setTimeout-based character reveal loop
- Sound effect on each character
- Manual timer cleanup on unmount / text change
- "skip to end" function that cancels the timer and shows full text

Both implementations are ~30 lines with the same logic but slightly different state
management (DialogBox uses refs, Birch uses state).

### What to build:

**New file: `src/game/hooks/useTypewriter.ts`**

```typescript
import { useState, useRef, useCallback, useEffect } from "react";

interface UseTypewriterOptions {
  /** Milliseconds between characters. */
  speedMs: number;
  /** Called when the full text is revealed. */
  onComplete?: () => void;
  /** Called on each character reveal (for SFX). */
  onChar?: () => void;
}

interface UseTypewriterReturn {
  /** The text to display (grows character by character). */
  displayedText: string;
  /** Whether the typewriter is still revealing. */
  isTyping: boolean;
  /** Start typing a new string. */
  start: (text: string) => void;
  /** Skip to full text immediately. */
  skipToEnd: () => void;
}

export function useTypewriter(opts: UseTypewriterOptions): UseTypewriterReturn {
  // ... implementation: setTimeout loop, cleanup on unmount,
  // start() resets and begins new text, skipToEnd() cancels timer
  // and sets displayedText to full text.
}
```

### Files to create:
- `src/game/hooks/useTypewriter.ts`

### Files to modify:
- `src/components/game/DialogBox.tsx` — replace manual typewriter with hook
- `src/components/game/BirchSpeechLayer.tsx` — replace manual typewriter with hook

### Testing:
1. Talk to any NPC — text types out character by character at the correct speed
2. Press A mid-typing — text skips to end
3. Press A after typing complete — advances to next page
4. Open Birch speech (new game) — same typewriter behavior
5. Change text speed in Options — both DialogBox and Birch respect the new speed

---

## TASK R4: Extract localStorage Utility [LOW RISK]

### What the code does now:

12 files contain 27 instances of `typeof localStorage === "undefined"` checks. Every
store that persists to localStorage implements the same try-catch pattern:

```typescript
function loadFoo(): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveFoo(value: T): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(value)); }
  catch { /* ignore */ }
}
```

**Files with this pattern:**
StepStore.ts, PickupStore.ts, TrainerStore.ts, PokedexStore.ts, PCStore.ts,
InteriorStateStore.ts, Settings.ts, GameSave.ts, PartyDexRegistrar.ts,
EventBridge.ts, Analytics.ts, OverworldScene.ts

### What to build:

**New file: `src/game/utils/storage.ts`**

```typescript
/**
 * Safe localStorage read — returns fallback on SSR, missing key, or parse error.
 */
export function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safe localStorage write — no-ops on SSR, swallows quota errors.
 */
export function writeJson<T>(key: string, value: T): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // QuotaExceededError or SecurityError — ignore
  }
}

/**
 * Safe localStorage remove — no-ops on SSR.
 */
export function removeKey(key: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(key);
}

/**
 * Check if localStorage is available.
 */
export function hasStorage(): boolean {
  return typeof localStorage !== "undefined";
}
```

**Migration:** Each store's load/save functions become one-liners:

```typescript
// Before (TrainerStore.ts, 17 lines):
function loadCleared(): string[] {
  if (typeof localStorage === "undefined") return [];
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function saveCleared(ids: string[]): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); }
  catch {}
}

// After (2 lines):
const loadCleared = (): string[] => readJson(STORAGE_KEY, []);
const saveCleared = (ids: string[]): void => writeJson(STORAGE_KEY, ids);
```

**Do NOT change GameSave.ts** — it's the central save system with its own shallow-merge
logic that's more complex than a simple read/write. Leave it as-is. The other 11 files
all use the simple pattern.

### Files to create:
- `src/game/utils/storage.ts`

### Files to modify:
- StepStore.ts, PickupStore.ts, TrainerStore.ts, PokedexStore.ts, PCStore.ts,
  InteriorStateStore.ts, Settings.ts, PartyDexRegistrar.ts, EventBridge.ts,
  Analytics.ts, OverworldScene.ts (player_pos storage)

### Testing:
1. Play a full session — step count persists, pickups persist, trainer state persists
2. Open Settings — text speed / frame style persist
3. Reload — all state survives
4. Clear localStorage — game resets cleanly
5. `npx tsc --noEmit` clean

---

## TASK R5: Split BirchSpeechLayer.tsx (953 lines) [LOW RISK]

### What the code does now:

BirchSpeechLayer.tsx is the largest React component (953 lines) with 5 mixed concerns:
1. A 14-phase state machine controller (~150 lines)
2. Gender selection UI with keyboard handling (~40 lines)
3. Name input form with its own keyboard logic (~120 lines)
4. Typewriter text animation (~30 lines — replaced by R3 hook)
5. Complex CSS transforms and rendering (~500 lines)

The keyboard handler alone is 124 lines (lines 403-527) — a single `useEffect` with a
massive switch statement dispatching to different phases.

### Dependencies:
- **Do R2 (useGameKeyboard) first.** BirchSpeechLayer has the most complex keyboard
  handling of any component. Extracting the hook first means the split produces cleaner
  sub-components that use the hook instead of raw addEventListener.
- **Do R3 (useTypewriter) first.** The typewriter logic is currently inline. Extracting
  the hook first means the text display sub-component uses the hook instead of reimplementing.

### What to build:

Split into 4 components:

**`BirchSpeechController.tsx`** — the state machine (exported, replaces BirchSpeechLayer):
- Manages the `phase` state (14 phases)
- Renders the sub-components based on current phase
- Handles phase transitions
- ~100 lines

**`BirchTextBox.tsx`** — the typewriter text display:
- Uses `useTypewriter` hook (R3)
- Renders the 9-slice bordered text box with speaker portrait
- Handles text advancement (A-press → next line or skip)
- ~80 lines

**`BirchGenderSelect.tsx`** — the gender selection menu:
- BOY / GIRL selection with cursor
- Uses `useGameKeyboard` hook (R2)
- Calls back to controller with selection
- ~60 lines

**`BirchNameInput.tsx`** — the name input form:
- On-screen keyboard grid
- Backspace, OK, character input
- Uses `useGameKeyboard` hook (R2)
- Calls back to controller with entered name
- ~120 lines

### Files to create:
- `src/components/game/BirchTextBox.tsx`
- `src/components/game/BirchGenderSelect.tsx`
- `src/components/game/BirchNameInput.tsx`

### Files to modify:
- `src/components/game/BirchSpeechLayer.tsx` — becomes the controller, imports sub-components

### Testing:
1. Start a NEW GAME — full Birch speech plays correctly
2. Gender selection works (up/down/confirm)
3. Name input works (arrow grid, backspace, OK)
4. Text types out and advances on A-press
5. The whole flow completes and transitions to the game

---

## TASK R6: Extract Interior Interaction Handlers [LOW RISK]

### What the code does now:

InteriorScene.ts's `handleInteraction()` is 220+ lines (lines 892-1110) with deeply
nested logic handling 6 different interaction types in one method:

1. PC tile — 60 lines of flicker animation + EventBridge open (lines 901-957)
2. Questionnaire tile — 15 lines (lines 962-978)
3. Hidden item — 5 lines (lines 982-988)
4. AutoGive trainer — 45 lines: dialog → give item → mark cleared → walk aside (lines 1012-1066)
5. Shop menu NPC — 15 lines (lines 1072-1086)
6. DialogFn / static dialog NPC — 20 lines (lines 1088-1108)

The autoGive trainer flow is especially complex with 5 sequential async steps.

### Dependencies:
- **Do R1 (scene utilities) first.** R1 extracts `getTileInDirection` and other helpers
  that `handleInteraction` uses. Having them as imports makes the extraction cleaner.

### What to build:

Extract helper methods on InteriorScene (not a separate class — these need scene context):

```typescript
private async tryPCInteraction(facingTile): Promise<boolean>
private async tryQuestionnaireInteraction(facingTile): Promise<boolean>
private async handleAutoGiveTrainer(npc, sprite, originalDir): Promise<void>
private async handleShopNpc(npc, sprite, originalDir): Promise<void>
private async handleNpcDialog(npc, sprite, originalDir): Promise<void>
```

The main `handleInteraction()` becomes a clean priority chain:

```typescript
private async handleInteraction(): Promise<void> {
  if (this.isInteracting || this.dialogSystem.active || ...) return;
  this.isInteracting = true;
  try {
    const facingTile = this.getTileInDirection(playerPos, playerFacing);
    if (await this.tryPCInteraction(facingTile)) return;
    if (await this.tryQuestionnaireInteraction(facingTile)) return;
    if (await this.tryHiddenItem(facingTile)) return;
    if (await this.tryNpcInteraction(facingTile, playerFacing)) return;
  } finally {
    this.isInteracting = false;
  }
}
```

### Files to modify:
- `src/game/scenes/InteriorScene.ts` — extract methods, simplify handleInteraction

### Testing:
1. Enter Pokemon Center — talk to Nurse Joy, use PC, talk to other NPCs
2. Enter Mart — talk to clerk (shop opens), talk to other NPCs
3. Enter Gym — talk to trainers (autoGive works: dialog → item → walk aside)
4. Talk to cleared trainer — shows clearedDialog
5. Interact with questionnaire tile in Mart
6. All interactions lock/unlock movement correctly

---

## TASK R7: `useMenuNavigation` Hook [LOW RISK]

### What the code does now:

3+ components duplicate wrapping list navigation logic:

```typescript
// Arrow Up — wrap to bottom
setIndex((i) => (i <= 0 ? items.length - 1 : i - 1));

// Arrow Down — wrap to top
setIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
```

Found in: BagMenu.tsx, QuestionnaireInterface.tsx, StartMenu.tsx, PCInterface.tsx,
MartShopInterface.tsx, PokedexList.tsx

Some also have left/right for grid navigation (BirchNameInput keyboard grid).

### Dependencies:
- **Do R2 (useGameKeyboard) first.** The navigation hook combines naturally with the
  keyboard hook — the menu component uses `useGameKeyboard` for input and
  `useMenuNavigation` for cursor state.

### What to build:

**New file: `src/game/hooks/useMenuNavigation.ts`**

```typescript
import { useState, useCallback } from "react";

interface UseMenuNavigationReturn {
  index: number;
  setIndex: (i: number) => void;
  moveUp: () => void;
  moveDown: () => void;
  /** For grid layouts: move left/right with wrapping. */
  moveLeft?: () => void;
  moveRight?: () => void;
}

export function useMenuNavigation(
  itemCount: number,
  options?: { columns?: number; initialIndex?: number },
): UseMenuNavigationReturn {
  const [index, setIndex] = useState(options?.initialIndex ?? 0);
  const moveUp = useCallback(
    () => setIndex((i) => (i <= 0 ? itemCount - 1 : i - 1)),
    [itemCount],
  );
  const moveDown = useCallback(
    () => setIndex((i) => (i >= itemCount - 1 ? 0 : i + 1)),
    [itemCount],
  );
  return { index, setIndex, moveUp, moveDown };
}
```

### Files to create:
- `src/game/hooks/useMenuNavigation.ts`

### Files to modify:
- BagMenu.tsx, StartMenu.tsx, PCInterface.tsx, MartShopInterface.tsx, PokedexList.tsx,
  QuestionnaireInterface.tsx (incrementally, one at a time)

### Testing:
Per component: arrow up/down wraps correctly, index stays in bounds, SFX fires on move.

---

## TASK R8: Fix Research Log Auto-Award Bug [BUG FIX]

### What the code does now:

**The bug:** The Research Log key item is auto-awarded in the overworld (OverworldScene.ts
lines 528-543) when `getTotalDiscoveries() >= 5`. But on a fresh game, `getTotalDiscoveries()`
starts at 6 because `PartyDexRegistrar` registers all 6 party Pokemon in `pokedexCaught`
on boot. The Research Log triggers on the player's FIRST STEP — before they've done anything.

**The code path:**
1. `BootScene` → `registerPartyInPokedex()` → marks 6 party Pokemon in `pokedexCaught`
2. `OverworldScene.update()` → checks `shouldAwardResearchLog()` every frame
3. `shouldAwardResearchLog()` → `getTotalDiscoveries() >= LOG_ENTRIES[0].threshold`
4. `getTotalDiscoveries()` counts `pokedexCaught.length` (= 6) + all other collections (= 0) = 6
5. `LOG_ENTRIES[0].threshold` = 5
6. 6 >= 5 → auto-awards Research Log immediately

**Two problems:**
1. **Discovery count inflated by party auto-registration.** Party Pokemon are "already yours" —
   they shouldn't count as discoveries. The player didn't discover MEDiC by walking up to it
   in the overworld; it was in their party from the start.
2. **Research Log auto-awards in overworld instead of through KOSTAS.** Per the design doc §13
   and §5 (KOSTAS state machine priority 4), the Research Log is a personal story that KOSTAS
   tells when a milestone is reached. The overworld auto-award popup bypasses this entirely.

### What to fix:

**A) `getTotalDiscoveries()` — exclude party Pokemon from count:**

```typescript
// researchLog.ts
export function getTotalDiscoveries(): number {
  const save = getSave();
  // Exclude party Pokemon from discovery count — they're "already yours,"
  // not something the player discovered in the overworld.
  const partyDexNumbers = new Set(
    save.partyMemberIds
      .map((id) => PARTY_BY_ID[id]?.dexNo)
      .filter((n): n is number => n !== undefined),
  );
  const realCaught = save.pokedexCaught.filter((n) => !partyDexNumbers.has(n));
  return (
    realCaught.length +
    save.papersCollected.length +
    save.blogsCollected.length +
    save.tmsCollected.length +
    save.keyItemsCollected.length
  );
}
```

Now a fresh save has 0 discoveries. The count only grows when the player actually does
something: catches a wild Pokemon, collects a paper, buys a TM, etc.

**B) Remove the overworld auto-award (OverworldScene.ts lines 528-543):**

Delete this entire block:
```typescript
// Auto-award research log at 5 discoveries
if (!hasItem("key_research_log") && shouldAwardResearchLog() && !this.isInteracting) {
  giveItem("key_research_log");
  this.isInteracting = true;
  sfx.pickup();
  this.dialogSystem.showDialog({
    lines: [
      "Obtained RESEARCH LOG!",
      "A journal with personal entries.",
      "Check KEY ITEMS in your BAG!",
    ],
  }).then(() => {
    this.isInteracting = false;
  });
  return;
}
```

The Research Log will be awarded by KOSTAS during gym visits (my content task — I'll wire
it into the KOSTAS state machine priority 4). The engine just needs to NOT auto-award it.

**C) `shouldAwardResearchLog()` stays** — it's still useful as a helper for KOSTAS's
dialogFn to check whether the player has reached a log milestone. Just remove the
overworld caller.

### Files to modify:
- `src/game/data/researchLog.ts` — `getTotalDiscoveries()` excludes party Pokemon
- `src/game/scenes/OverworldScene.ts` — remove auto-award block (lines 528-543)

### Dependencies:
- Task 28 (Dynamic Party) must be landed — `getTotalDiscoveries()` reads `save.partyMemberIds`
  and `PARTY_BY_ID` which were added in Task 28. **Task 28 is already done.**
- Do this BEFORE content phase — I need `shouldAwardResearchLog()` to return correct values
  when writing KOSTAS's state machine.

### Testing:
1. Fresh save → start game → walk around → Research Log does NOT appear automatically
2. Check `getTotalDiscoveries()` in console → should be 0 on fresh save
3. Catch a wild Pokemon → `getTotalDiscoveries()` → should be 1
4. Collect 5+ things (papers, Pokemon, TMs) → `shouldAwardResearchLog()` → true
5. But no popup — KOSTAS will give it during content phase

---

## PRIORITY SUMMARY

| # | Task | Lines saved | Risk | Depends on | Do before |
|---|---|---|---|---|---|
| **R8** | Research Log bug fix | ~15 (deleted) | **None** | Task 28 (done) | Content phase |
| **R1** | Scene utilities | ~150 | Low | None | R6 |
| **R2** | useGameKeyboard | ~400 | Low | None | R5, R7 |
| **R3** | useTypewriter | ~60 | Low | None | R5 |
| **R4** | localStorage utility | ~100 | Low | None | — |
| **R5** | Split BirchSpeechLayer | reorg | Low | R2 + R3 | — |
| **R6** | Interior interaction | reorg | Low | R1 | — |
| **R7** | useMenuNavigation | ~30 | Low | R2 | — |

**Total: 8 tasks. ~750 lines eliminated. All low risk.**
