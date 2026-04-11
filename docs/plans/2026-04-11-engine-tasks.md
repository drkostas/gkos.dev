# Explore Mode — Engine Tasks (Self-Contained)

> Each task below is FULLY SELF-CONTAINED. You can read any single task
> and understand: what the code does now, why it's wrong, what the end
> goal is, and exactly how to fix it — without reading any other document.
>
> These are YOUR engine/infrastructure tasks. After these are done, I
> (Claude) will customize all content: NPC placements, dialogs, Pokemon
> mapping, signs, items, KOSTAS state machine, Research Log stories, etc.

---

## THE BIG PICTURE

This game is Kostas Georgiou's portfolio disguised as a Pokemon Emerald game.
Every game mechanic maps to a portfolio element:

- Walking up to a Pokemon = discovering a project
- Talking to a gym trainer = reading a PhD paper
- Buying a TM at the mart = learning about a skill
- Finding a hidden item = discovering a contact link
- Earning a badge = proving engagement with the portfolio
- The Research Log = earning personal stories through loyalty

The game must feel like a REAL Pokemon game. A recruiter or fellow engineer
should be able to play for 20-30 minutes and naturally discover Kostas's
entire body of work — projects, papers, skills, blog posts, contact info —
while having FUN.

**8 Badges (our final design):**
1. PhD — collected all 6 gym papers
2. SCHOLAR — collected all 10 papers (gym + route)
3. OPEN SOURCE — registered all Pokemon (projects)
4. AUTHOR — collected all blog posts
5. FULL STACK — collected all TMs (skills)
6. EXPLORER — visited all 5 map zones
7. DEVOTED — opened every URL from bag/Pokedex
8. CHAMPION — found MEW beyond the boundary → KOSTAS gives badge + phone number

---

## TASK 1: Map Analyzer Script [CRITICAL]

### What exists now:
- The game map is a 140×120 stitched tilemap (`public/game/maps/mauville.json`)
- Collision layer determines walkable (0) vs blocked (non-0) tiles
- NPC characters also block tiles at the Grid Engine level (NOT in collision layer)
- `scripts/validate-npcs.mjs` exists (154 lines) but doesn't do full reachability analysis
- I (Claude) ran a BFS and found: 2321 reachable tiles out of 3180 walkable tiles (27% disconnected)
- Route 118 is only 42% reachable, Route 111 only 50% — this is expected (terrain behind water/cliffs)
- BUT: 3 wild Pokemon and 2 hidden items were placed on completely unreachable tiles

### Why this matters:
I need to place ~40 NPCs, ~30 Pokemon, ~20 items, and ~15 signs across the map. EVERY placement
must be on a tile the player can actually reach. One misplaced NPC on a narrow path could block
an entire route permanently. I also need to know distances between locations for story pacing
(e.g., "place this blog NPC halfway between the gym and Route 117"). Without this tool, I'm
placing content blind and will inevitably create unreachable or path-blocking placements.

### What to build:
A Node.js script `scripts/map-analyzer.mjs` that:

1. **Reads collision layer** from `mauville.json`
2. **Reads all NPC positions** from `npcs.ts` + `wild-pokemon.ts` (they're Grid Engine blockers)
3. **BFS from spawn (72,58)** — marks all reachable tiles considering BOTH collision AND NPC blocking
4. **Outputs per-zone stats:** reachable/total tiles, percentage
5. **Flags unreachable NPCs/Pokemon/items** — any entity on a non-reachable tile
6. **Detects path-blocking:** if placing an NPC at (X,Y) would disconnect any previously reachable area
7. **Computes distances** between key landmarks (gym door, pokecenter, mart, route entries, day care)
8. **Lists all safe placement tiles** — reachable, not on an NPC, not blocking any path
9. **Outputs JSON** (`game-map-data.json`) with:
   ```
   { reachableTiles, zoneStats, landmarks, distances, safePlacementTiles, warnings }
   ```
10. **Outputs ASCII visualization** for quick visual inspection

### How NPC blocking works (for the BFS):
NPCs are NOT in the collision tilemap. They're Grid Engine characters with `collisionGroups: ["geDefault"]`.
The analyzer script needs to read NPC positions from the data files and treat those tiles as blocked
DURING the BFS. This means parsing the TypeScript data files for position coordinates.

### Key locations to compute distances from:
- Player spawn: (72, 58)
- Gym door: (58, 55) / (59, 55)
- Pokemon Center door: (72, 55) / (73, 55)
- Mart door: (73, 64) / (74, 64)
- Route 117 entrance: ~(49, 58)
- Route 118 entrance: ~(90, 58)
- Route 110 entrance: ~(62, 70)
- Route 111 entrance: ~(62, 49)
- Day Care Man: (37, 54)

---

## TASK 2: Step Counter → Mart Shop [CRITICAL]

### What the code does now:
- `StepMilestones.ts` defines 9 TM milestones at step thresholds (250, 500, 1000, ... 8000)
- `checkStepTMs()` is called on EVERY step in `OverworldScene.ts` line 497
- When `currentSteps >= milestone.steps`, it immediately calls `giveItem()` → TM goes to bag automatically
- `getPendingAward()` queues a dialog popup: "250-step milestone reached!" + "TM:TAILWIND added!"
- Player has ZERO CHOICE — TMs are force-given while walking
- `StepStore.ts` has `incrementStep()` and `getSteps()` but NO `spendSteps()` function
- The mart clerk (`interiors.ts` line 153) has static PyPI dialog — no shop menu

### Why this is wrong:
Our design says TMs are BOUGHT at the Pokemart with STEPS AS CURRENCY — like money in OG Pokemon.
The player should CHOOSE which skills to prioritize. "Do I buy DOCKER now or save for KUBERNETES?"
Auto-awarding removes all agency and turns a game mechanic into a passive background process.
The Pokemart should be a DESTINATION the player revisits, not a static NPC hallway.

### What to build:

**A) StepStore.ts — add spend function:**
```typescript
export function spendSteps(amount: number): boolean {
  const current = readSteps();
  if (current < amount) return false;
  writeSteps(current - amount);
  return true;
}
```

**B) StepMilestones.ts — remove auto-award, add shop helpers:**
- REMOVE `checkStepTMs()` function (or keep as `getAvailableTMs()`)
- REMOVE `pendingAward` pattern entirely
- KEEP `getMilestoneStatuses()` for the shop UI
- ADD:
```typescript
export function canAfford(milestone: StepMilestone): boolean {
  return getSteps() >= milestone.steps;
}
export function buyTM(milestone: StepMilestone): boolean {
  if (!canAfford(milestone) || hasItem(milestone.itemId)) return false;
  if (!spendSteps(milestone.steps)) return false;
  giveItem(milestone.itemId);
  checkBadges();
  return true;
}
```

**C) OverworldScene.ts — remove auto-award:**
- REMOVE line 497: `checkStepTMs(total);`
- REMOVE lines 504-530: pending award dialog pattern

**D) New component: MartShopInterface.tsx**
React overlay triggered when player talks to the mart clerk. Layout:
```
┌─────────────────────────────────┐
│  TM SHOP          Steps: 2,450 │
│─────────────────────────────────│
│▶ TM:TAILWIND       250  ✓      │
│  TM:FASTAPI        500  ✓      │
│  TM:DOCKER        1500         │
│  TM:PYTORCH       2000   ✗     │
│  TM:AWS           3000   ✗     │
│  CANCEL                        │
│─────────────────────────────────│
│ Containerization platform.      │
└─────────────────────────────────┘
```
- ✓ = already bought (grayed, not selectable)
- No mark = can afford (selectable)
- ✗ = can't afford (grayed)
- Select + A → "Buy TM:DOCKER for 1,500 steps?" → Yes/No
- Yes → `buyTM()` → deduct steps → TM to bag → jingle → back to list
- Navigate with arrows, B to cancel, A to select
- Triggered via EventBridge event (like PC interface)

**E) interiors.ts — mart clerk uses dialogFn:**
Replace static dialog with `dialogFn` that emits a `SHOW_MART_SHOP` event.

### Files to modify:
- `src/game/systems/StepStore.ts` — add `spendSteps()`
- `src/game/systems/StepMilestones.ts` — remove auto-award, add buy helpers
- `src/game/scenes/OverworldScene.ts` — remove auto-award call + pending dialog
- `src/components/game/MartShopInterface.tsx` — NEW component
- `src/components/game/PhaserGame.tsx` — mount MartShopInterface
- `src/game/EventBridge.ts` — add SHOW_MART_SHOP / MART_SHOP_CLOSE events
- `src/game/data/interiors.ts` — change mart clerk to dialogFn

---

## TASK 3: Dialog Text Word-Wrap + 2 Lines Per Page [CRITICAL]

### What the code does now:

**Problem A — Hard character split in Pokemon encounter:**
`NPCSystem.ts` lines 221-223:
```typescript
const descLines = pkm.projectDescription
  .split("\n")
  .flatMap((l) => (l.length > 36 ? [l.slice(0, 36), l.slice(36)] : [l]));
```
This slices at exactly 36 characters with NO word-boundary awareness.
"CLIP distillation framework for medical imaging" becomes:
- "CLIP distillation framework for med" ← broken mid-word!
- "ical imaging"

**Problem B — Each dialog string = one page:**
`DialogBox.tsx` treats each string in `lines[]` as a separate page requiring A-press.
An NPC with 8 short lines = 8 separate A-presses. The dialog box has room for 2-3 lines
but only shows ONE at a time. This is tedious and breaks immersion.

Snorlax has 8 dialog strings = 8 pages for a simple "Zzz... sleeping" message.

### Why this matters:
- Mid-word breaks look unprofessional
- 8 A-presses for one conversation is annoying — players stop reading
- OG Pokemon Emerald shows 2 lines per dialog page, then waits for A-press
- Every NPC interaction suffers from this — it affects the ENTIRE game experience

### What to build:

**A) Word-wrap utility function** (new file or in DialogSystem):
```typescript
function wordWrap(text: string, maxWidth: number = 36): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
```

**B) Pagination function** — groups lines into 2-line pages:
```typescript
function paginateDialog(rawLines: string[], linesPerPage: number = 2): string[] {
  // First, word-wrap any long lines
  const wrapped = rawLines.flatMap(line => {
    if (line === "") return [""]; // preserve intentional blank lines as page breaks
    return wordWrap(line, 36);
  });
  
  // Then group into pages of linesPerPage
  const pages: string[] = [];
  let buffer: string[] = [];
  for (const line of wrapped) {
    if (line === "") {
      // Empty string = forced page break
      if (buffer.length > 0) { pages.push(buffer.join("\n")); buffer = []; }
      continue;
    }
    buffer.push(line);
    if (buffer.length >= linesPerPage) {
      pages.push(buffer.join("\n"));
      buffer = [];
    }
  }
  if (buffer.length > 0) pages.push(buffer.join("\n"));
  return pages;
}
```

**C) Apply pagination in DialogSystem.showDialog() or in the EventBridge emit:**
Before passing `lines` to the DialogBox, run them through `paginateDialog()`.
This way ALL dialog in the game automatically gets word-wrapped and paginated.

**D) DialogBox.tsx — render multi-line pages:**
The `displayedText` variable currently contains a single line. After pagination,
it will contain strings with `\n` in them (e.g. "Line one\nLine two").
Add `white-space: pre-wrap` to the dialog text container so `\n` creates
visible line breaks within the box.

**E) Replace hard-split in NPCSystem.ts Pokemon encounter:**
Replace lines 221-223 with the `wordWrap()` function call.

### Files to modify:
- `src/game/systems/DialogSystem.ts` — add pagination before emit (or new util file)
- `src/game/systems/NPCSystem.ts` — replace hard-split with wordWrap
- `src/components/game/DialogBox.tsx` — add `whiteSpace: "pre-wrap"` to text container

---

## TASK 4: NEW GAME Full Reset [CRITICAL]

### What the code does now:
- OpeningScreen "NEW GAME" calls `clearSave()` from `GameSave.ts`
- `clearSave()` only removes ONE localStorage key: `gkos:explore:save`
- But there are **7 other independent localStorage keys** that persist:
  - `gkos:explore:steps` (StepStore)
  - `gkos:explore:pickups` (PickupStore)
  - `gkos:explore:pokedex-seen` (PokedexStore)
  - `gkos:explore:pc` (PCStore)
  - `gkos:explore:trainers-cleared` (TrainerStore)
  - `gkos:explore:interior` (InteriorStateStore)
  - `gkos:explore:settings` (Settings — debatable if this should persist)
- Result: player selects "NEW GAME" but keeps their old steps, pickups, Pokedex,
  trainer progress, PC items, and interior state. The "new game" isn't new at all.

### Why this matters:
A player who wants to restart (or show the game to a friend) expects a FRESH start.
If old data persists, the game is in a broken hybrid state — some systems think it's new
(GameSave is empty), others think it's continued (steps, pickups still there).
This causes bugs like items not appearing (already "picked up" in old save) and
the Pokedex showing entries the player hasn't actually found.

### What to fix:
In `GameSave.ts`, change `clearSave()` to wipe ALL game keys:
```typescript
export function clearSave(): void {
  if (typeof localStorage === "undefined") return;
  // Wipe everything under gkos:explore:* namespace
  const keys = Object.keys(localStorage).filter(k => k.startsWith("gkos:explore:"));
  for (const k of keys) {
    // Optionally preserve settings (text speed, frame style)
    if (k === "gkos:explore:settings") continue;
    localStorage.removeItem(k);
  }
}
```
This matches the approach already used in `OptionsMenu.tsx`'s `clearAllProgress()`.

### Files to modify:
- `src/game/systems/GameSave.ts` — rewrite `clearSave()` to clear all keys

---

## TASK 5: Research Log Discovery Count Bug [CRITICAL]

### What the code does now:
- `researchLog.ts` line 107-115: `getTotalDiscoveries()` counts:
  `save.pokedexSeen.length + papersCollected + blogsCollected + tmsCollected + keyItemsCollected`
- `shouldAwardResearchLog()` checks `getTotalDiscoveries() >= 5` (first log entry threshold)
- `PartyDexRegistrar.ts` auto-adds 6 party Pokemon to `pokedexSeen` on game init
- Result: brand new game → `pokedexSeen = [380, 382, 359, 310, 286, 308]` (6 party Pokemon)
  → discoveries = 6 → threshold 5 is met → "Obtained RESEARCH LOG!" fires immediately

### Why this matters:
The Research Log is our LOYALTY MECHANIC — personal stories from Kostas unlocked through
ACTIVE exploration. Getting it for free on a new game before the player does ANYTHING
devalues the entire system. It should feel EARNED, not gifted.

### What to fix:
Change `getTotalDiscoveries()` to use `pokedexCaught` instead of `pokedexSeen`:
```typescript
export function getTotalDiscoveries(): number {
  const save = getSave();
  return (
    save.pokedexCaught.length +    // ← CAUGHT (found by walking up to overworld Pokemon)
    save.papersCollected.length +   //    not SEEN (which includes auto-registered party)
    save.blogsCollected.length +
    save.tmsCollected.length +
    save.keyItemsCollected.length
  );
}
```
`pokedexCaught` only includes Pokemon the player actively interacted with in the overworld.
Party Pokemon are added to `pokedexSeen` (visible in Pokedex as "seen") but NOT `pokedexCaught`.

### Files to modify:
- `src/game/data/researchLog.ts` — change `pokedexSeen` to `pokedexCaught` in `getTotalDiscoveries()`

---

## TASK 6: Boundary Pokemon Missing Pokedex Registration [HIGH]

### What the code does now:
- Snorlax, Slaking, 2× Slakoth, and 10× Poochyena are defined as regular NPCs in `npcs.ts`
- They have `dialog` fields with flavor text but NO `pokemon` field
- When the player talks to them, it's just dialog — no screen flash, no encounter sound, no Pokedex registration
- The `NPCSystem` only triggers the Pokemon encounter flow when `npc.pokemon` is set (line 207)

### Why this matters:
These are POKEMON SPRITES on the map. A player sees a Snorlax and expects it to register in their
Pokedex — that's how every Pokemon game works. Not registering them is:
1. A missed opportunity to showcase 4 more projects
2. Confusing to anyone who knows Pokemon games
3. 4 fewer Pokedex entries toward the OPEN SOURCE badge

### What to fix:
Add `pokemon` field to each boundary Pokemon in `npcs.ts`:

**Snorlax** (line ~475):
```typescript
pokemon: {
  pokedexNumber: XX, // need a new entry in pokemon.ts
  speciesName: "SNORLAX",
  projectName: "[project to assign]",
  projectDescription: "[description]",
  repeatDialog: ["SNORLAX is still sleeping...", "Zzz... Zzz..."],
},
```

**Slaking** (line ~551), **Slakoth** ×2 (lines ~534, ~571) — same pattern.

**Poochyena** — all 10 share the same Pokedex entry. Only the FIRST Poochyena the player
interacts with should trigger registration. The others should show `repeatDialog`.
Implementation: use the same `pokedexNumber` for all 10 Poochyena NPCs. The NPCSystem
already checks `isPokedexSeen(pkm.pokedexNumber)` — if the first one was seen, all others
go to the repeat path automatically.

### Also need:
- Add 4 new entries to `pokemon.ts` (POKEDEX array) mapping to projects
- Decide which projects these map to (I'll do this in content work, but you need the entries)
- Update `TOTAL_POKEDEX` in `BadgeMilestones.ts` to include the new count

### Files to modify:
- `src/game/data/npcs.ts` — add `pokemon` field to Snorlax, Slaking, Slakoth, Poochyena
- `src/game/data/pokemon.ts` — add 4 new POKEDEX entries
- `src/game/systems/BadgeMilestones.ts` — update TOTAL_POKEDEX

---

## TASK 7: Fix DEVOTED Badge Conflict [HIGH]

### What the code does now:
There are TWO conflicting definitions of the DEVOTED badge:

**BadgeMilestones.ts** line 75-78:
```typescript
{ id: "devoted", name: "DEVOTED",
  hint: `Collect all ${TOTAL_KEY_ITEMS} key items`,
  condition: (s) => s.keyItemsCollected.length >= TOTAL_KEY_ITEMS }
```

**GameSave.ts** line 335-340:
```typescript
const DEVOTED_BADGE_THRESHOLD = 10;
if (!save.badges.includes("devoted") &&
    save.urlsOpened.length >= DEVOTED_BADGE_THRESHOLD) {
  awardBadge("devoted");
}
```

**TrainerCard.tsx** line 397:
```typescript
tagline: "Opened 10+ project URLs."
```

### Our design decision:
DEVOTED = opened every URL (papers, blogs, projects, items). This is the COMPLETIONIST
badge — it proves the player didn't just collect items but actually ENGAGED with the
portfolio by opening every link.

### What to fix:
1. **BadgeMilestones.ts** — remove DEVOTED entry entirely (it checks key items, which is wrong)
2. **GameSave.ts** — change `DEVOTED_BADGE_THRESHOLD` from hardcoded `10` to a dynamic total:
   ```typescript
   const TOTAL_OPENABLE_URLS = countItemsWithUrls() + countPokedexWithUrls();
   ```
   Where `countItemsWithUrls()` counts all items in ITEM_DEFINITIONS that have a `url` field,
   and `countPokedexWithUrls()` counts all POKEDEX entries with a `url` field.
3. **TrainerCard.tsx** — update tagline: "Opened every project URL."

### Files to modify:
- `src/game/systems/BadgeMilestones.ts` — remove DEVOTED condition
- `src/game/systems/GameSave.ts` — change DEVOTED threshold to dynamic total
- `src/components/game/TrainerCard.tsx` — update tagline

---

## TASK 8: Fix CHAMPION Badge Condition [HIGH]

### What the code does now:
```typescript
// BadgeMilestones.ts line 81-84
{ id: "champion", name: "CHAMPION",
  hint: "Earn all 7 other badges",
  condition: (s) => s.badges.length >= 7 }
```
CHAMPION auto-awards when you have 7 badges. This makes it a PASSIVE reward for completing
everything else — there's no unique CHAMPION experience.

### Our design decision:
CHAMPION is the emotional climax of the game. The flow:
1. Player collects all 7 contact key items (5 visible + 2 hidden) throughout the game
2. Player hacks past the eastern water boundary (requires DevTools or code knowledge)
3. Player finds MEW floating beyond the boundary
4. MEW gives the phone number + CHAMPION badge directly
5. Player goes to KOSTAS at the gym → KOSTAS sees the phone number
6. Emotional story: "That badge belonged to a friend... his pet... I thought it was lost forever..."
7. KOSTAS gives his personal phone number as gratitude
8. "Call me. Anytime."

The CHAMPION badge should be given by MEW (or auto-awarded when the player has ALL contacts
including the phone number). NOT auto-awarded based on badge count.

### What to fix:
1. **BadgeMilestones.ts** — change CHAMPION condition:
   ```typescript
   { id: "champion",
     condition: (s) => s.keyItemsCollected.includes("PHONE.NUMBER") }
   ```
   OR: remove from BadgeMilestones entirely and award directly in the MEW interaction code.

2. **KOSTAS's dialogFn** — add a priority check for Champion badge:
   When player has CHAMPION badge, KOSTAS delivers the emotional MEW story dialog
   (this is my content task, but the engine needs to support the check).

### Files to modify:
- `src/game/systems/BadgeMilestones.ts` — change CHAMPION condition
- `src/game/data/interiors.ts` — KOSTAS's dialogFn needs Champion badge check (content: me)

---

## TASK 9: Reconcile Pokedex Total Count [HIGH]

### What the code does now:
- `pokemon.ts` has 32 entries (POKEDEX array)
- `wild-pokemon.ts` places 24 wild Pokemon (via `wild()` function)
- Party has 6 Pokemon (auto-registered as "seen" by PartyDexRegistrar)
- Snorlax/Slaking/Slakoth/Poochyena have NO Pokedex entries (4 Pokemon unregistered)
- `BadgeMilestones.ts`: `TOTAL_POKEDEX = POKEDEX.length` (currently 32)

### The math doesn't add up:
- 6 party (auto-seen) + 24 wild (overworld) = 30 registration paths
- But POKEDEX has 32 entries
- 2 entries have NO way to be registered (no wild placement, no party)
- After Task 6 adds boundary Pokemon: 6 + 24 + 4 = 34, but POKEDEX would be 36

### Why this matters:
If `TOTAL_POKEDEX = 32` but only 30 are obtainable, the OPEN SOURCE badge is IMPOSSIBLE to earn.
Every Pokedex entry must have exactly ONE registration method.

### What to fix:
1. Audit every entry in `pokemon.ts` — which ones have a wild placement? Which are party-only?
2. Remove entries that have no registration path, OR add wild placements for them
3. After Task 6 (boundary Pokemon), add their entries to pokemon.ts
4. Ensure `TOTAL_POKEDEX` in BadgeMilestones matches the actual obtainable count
5. Verify: party(6) + wild(24) + boundary(4) = 34 (if that's the target)

### Files to modify:
- `src/game/data/pokemon.ts` — reconcile entries
- `src/game/data/wild-pokemon.ts` — add missing placements if needed
- `src/game/systems/BadgeMilestones.ts` — update TOTAL_POKEDEX

---

## TASK 10: Add autoGive to Interior NPCs [HIGH]

### What the code does now:
- `NPCDefinition` (overworld type in `npc.ts`) has `autoGive` field ✓
- `NPCSystem.ts` handles autoGive: dialog → item → trainer walks aside ✓
- BUT gym trainers are `InteriorNPC` (in `interiors.ts`), a DIFFERENT type
- `InteriorNPC` has: id, spriteKey, position, facingDirection, dialog, speakerName, dialogFn
- `InteriorNPC` does NOT have: autoGive, asidePosition, clearedDialog
- `InteriorScene.handleInteraction()` does NOT handle autoGive at all
- Current gym trainers show static dialog with no item giving

### Why this matters:
Our design says gym trainers give PhD papers AUTOMATICALLY (mandatory, no yes/no).
After giving, the trainer walks to a side position clearing the path for the player.
This is the core GYM BADGE mechanic — without autoGive in interiors, players can't
collect papers and can't earn the PhD badge.

### What to build:
1. **Add to InteriorNPC interface** in `interiors.ts`:
   ```typescript
   autoGive?: {
     itemName: string;
     itemUrl?: string;
     pocket: string;
     description: string;
     asidePosition: { x: number; y: number };
     clearedDialog?: string[];
   };
   ```

2. **InteriorScene.handleInteraction()** — add autoGive handling:
   - Check if NPC has `autoGive` field
   - Check `TrainerStore.isTrainerCleared(npc.id)`
   - If NOT cleared: show dialog → give item via ItemGift → mark cleared → walk NPC to aside position
   - If already cleared: NPC is at aside position with clearedDialog

3. **InteriorScene.create()** — on scene load:
   - Check TrainerStore for each NPC with autoGive
   - If cleared: spawn at asidePosition instead of original position
   - Use clearedDialog instead of original dialog

### Files to modify:
- `src/game/data/interiors.ts` — add autoGive to InteriorNPC type + gym trainer data
- `src/game/scenes/InteriorScene.ts` — add autoGive handling in create() and handleInteraction()

---

## TASK 11: Real Play Time Tracking [HIGH]

### What the code does now:
- TrainerCard.tsx line 79: `const yearsExperience = new Date().getFullYear() - 2017;`
- Line 169: displays "9h 00m" (years since 2017) — completely fake
- GameSave has NO `playTimeSeconds` field
- No timer anywhere in the game

### Why this matters:
Play time is a core Pokemon Trainer Card stat. It shows how long the visitor has been
engaged with the portfolio. It's also useful for analytics (average session duration).

### What to build:
1. **GameSave.ts** — add `playTimeSeconds: number` (default 0)
2. **PhaserGame.tsx** — start a 1-second interval after game boots:
   ```typescript
   const timer = setInterval(() => {
     if (!document.hidden) { // pause when tab is backgrounded
       const save = getSave();
       updateSave({ playTimeSeconds: save.playTimeSeconds + 1 });
     }
   }, 1000);
   ```
3. **TrainerCard.tsx** — read from GameSave:
   ```typescript
   const save = getSave();
   const hours = Math.floor(save.playTimeSeconds / 3600);
   const mins = Math.floor((save.playTimeSeconds % 3600) / 60);
   // Display: "0h 12m"
   ```

### Files to modify:
- `src/game/systems/GameSave.ts` — add playTimeSeconds field + default
- `src/components/game/PhaserGame.tsx` — add interval timer
- `src/components/game/TrainerCard.tsx` — read real play time

---

## TASK 12: Fix Slaking/Slakoth Sprites [MEDIUM]

### What the code does now:
- Wild Pokemon use 32×64 sprites from `/game/sprites/pokemon/icons/` (2-frame pixel-art)
- Snorlax uses a 32×32 OG emerald overworld sprite — fits the pixel scale ✓
- Slaking uses a 48×48 Lanczos-downscaled sprite with `scale: 2/3` — higher resolution
- Slakoth same — 48×48 with `scale: 2/3`
- The 48×48 sprites are visually inconsistent with the 16px tile grid

### Why this matters:
The retro pixel-art aesthetic requires visual consistency. Mixing HD and pixel-art
sprites breaks immersion. Slaking/Slakoth look out of place next to OG-style Pokemon.

### What to fix:
- Check if pokeemerald has OG overworld sprites for Slakoth/Slaking (32×32 format)
- If yes: use those, update BootScene spritesheet loading accordingly
- If no: create 32×64 icons (same format as wild Pokemon icons) or scale the current ones
  down to match the pixel aesthetic with nearest-neighbor scaling (not Lanczos)
- Remove `scale: 2/3` hack from npcs.ts

### Files to modify:
- `public/game/sprites/emerald/` — replace or add sprite files
- `src/game/scenes/BootScene.ts` — update spritesheet dimensions
- `src/game/data/npcs.ts` — remove scale override

---

## TASK 13: Fix Questionnaire Reward [MEDIUM]

### What the code does now:
- QuestionnaireInterface.tsx has 4 questions with answers: README, MEDIC, APRIL, PYTORCH
- Correct answers reward "MYSTERY TICKET" (a key item in itemDefinitions.ts)
- MYSTERY TICKET has no URL, no real meaning — it's a placeholder

### What we want:
- The questionnaire tests PORTFOLIO KNOWLEDGE (proves the player engaged with the content)
- Correct answers should reward something meaningful — a TM, or access to something
- Questions should be about Kostas's actual work

### What to fix:
- Replace MYSTERY TICKET with a meaningful TM reward (I'll specify which TM in content work)
- Questions should be customizable (I'll write the final questions, but the system needs to
  support configuring both questions AND rewards)
- Currently questions/answers are hardcoded in QuestionnaireInterface.tsx — consider making
  them data-driven (loaded from a config file)

### Files to modify:
- `src/components/game/QuestionnaireInterface.tsx` — make questions/answers configurable
- `src/game/data/itemDefinitions.ts` — replace MYSTERY TICKET with actual reward

---

## TASK 14: Fix PC Default Items [MEDIUM]

### What the code does now:
- `PCStore.ts` initializes with: RESUME.PDF, BLOG.URL, GITHUB.URL, LINKEDIN.URL, HUGGINGFACE.URL, SCHOLAR.URL
- These are CONTACT LINKS stored in the PC

### What our design says:
- PC stores pre-loaded TMs: PYTHON, GIT, LINUX (foundational skills the player STARTS with)
- Contact links are found as ITEM BALLS on the overworld (visible + hidden), NOT in the PC

### What to fix:
- Change PCStore defaults to: TM:PYTHON, TM:GIT, TM:LINUX
- These should use item IDs from itemDefinitions.ts
- Add these 3 TMs to itemDefinitions.ts if they don't exist

### Files to modify:
- `src/game/systems/PCStore.ts` — change default items
- `src/game/data/itemDefinitions.ts` — ensure TM:PYTHON, TM:GIT, TM:LINUX entries exist

---

## TASK 15: Fix Route 118 Music [MEDIUM]

### What the code does now:
- `BGMManager.ts` line 25: `route118: "mus_route110.ogg"`
- Comment on line 9 says route118 should use `mus_route111.ogg` for variety
- `mus_route111.ogg` EXISTS in `/game/audio/bgm/` ✓

### What to fix:
One-line change:
```typescript
route118: "mus_route111.ogg",  // was: "mus_route110.ogg"
```

### Files to modify:
- `src/game/systems/BGMManager.ts` — line 25

---

## TASK 16: Pokemon Encounter Sound Effect [MEDIUM]

### What the code does now:
- NPCSystem.ts line 213: `sfx.pickup()` — reuses the generic item pickup sound for Pokemon encounters
- SoundManager.ts has no `encounter()` or `pokemonDiscovery()` function
- The item pickup sound ("you found a Pokeball!") plays when discovering a Pokemon — wrong feel

### What we want:
- A distinct discovery sound that plays during the white flash
- Should feel like EXCITEMENT and DISCOVERY, not finding loot
- Short (0.3-0.5s), rising tone

### What to fix:
1. Find or create `se_encounter.ogg` (or `se_pokemon_found.ogg`)
2. Add to SoundManager:
   ```typescript
   function playEncounter(): void { play("se_encounter.ogg", 0.8); }
   ```
3. Add to sfx export: `encounter: playEncounter`
4. Replace `sfx.pickup()` in NPCSystem Pokemon encounter with `sfx.encounter()`

### Files to modify:
- `public/game/audio/sfx/` — add new sound file
- `src/game/systems/SoundManager.ts` — add encounter function
- `src/game/systems/NPCSystem.ts` — use sfx.encounter() instead of sfx.pickup()

---

## TASK 17: Trainer Card Back = Progress Checklist [MEDIUM]

### What the code does now:
- Trainer Card flips with A button ✓
- Back side shows... (need to check current content, but from our investigation it's
  not showing the progress checklist from our design)

### What we want:
Back side shows:
```
PROGRESS
■ Papers .............. 6/10
■ Blog Posts .......... 1/1
■ Pokemon ............. 18/30
■ TMs ................. 8/20
■ Key Items ........... 4/7
■ URLs Opened ......... 12/48

RESEARCH LOG ............ #3
BADGES .................. 5/8
```

### Files to modify:
- `src/components/game/TrainerCard.tsx` — redesign back side content

---

## TASK 18: Fix Hidden Item Priority Order [MEDIUM]

### What the code does now:
OverworldScene `handleInteraction()` priority:
```
1. PC tile check
2. Hidden item check (FACING tile) ← BEFORE NPCs!
3. NPC interaction
4. Sign interaction
```

### What our design says:
```
1. NPC interaction (facing tile)
2. Sign interaction (facing tile)
3. Hidden item (facing tile)
4. PC tile
```
NPCs should ALWAYS take priority. If a hidden item is on a tile adjacent to an NPC,
the player should talk to the NPC, not accidentally trigger the hidden item.

### What to fix:
Reorder the checks in `handleInteraction()`:
```typescript
// 1. NPC
const npcHit = await this.npcSystem.tryInteract(playerPos, playerFacing);
if (npcHit) return;
// 2. Sign
const signHit = await this.signSystem.tryInteract(playerPos, playerFacing);
if (signHit) return;
// 3. Hidden item
const pickedHidden = await HiddenItemSystem.tryPickup(...);
if (pickedHidden) return;
// 4. PC
if (OverworldScene.PC_TILES.has(pcKey)) { ... }
```

### Files to modify:
- `src/game/scenes/OverworldScene.ts` — reorder handleInteraction() checks

---

## TASK 19: Return-to-Portfolio Link [MEDIUM]

### What the code does now:
- `explore.astro` uses bare `<html>` — no navbar, no back link
- Once the game loads, the player can only exit via browser back button
- The noscript tag has "Return to normal site" but only shows without JS

### What we want:
Two exit points:
1. **Title screen:** add "WEBSITE" to the main menu (CONTINUE / NEW GAME / WEBSITE / OPTION)
   - Clicking it navigates to `/` (the normal portfolio)
2. **HELP screen:** add "Visit gkos.dev" link at the bottom
   - Opens `/` in the same tab

### Files to modify:
- `src/components/game/OpeningScreen.tsx` — add WEBSITE menu item
- `src/components/game/HelpScreen.tsx` — add portfolio link

---

## TASK 20: Advanced NPC Movement Behaviors [ENHANCEMENT]

### What exists now:
```typescript
enum MovementBehavior {
  STATIONARY, WANDER_LEFT_RIGHT, LOOK_AROUND
}
```
Only 3 behaviors. World feels static.

### What to add:
```typescript
WANDER_UP_DOWN     // shuffles vertically within range
WANDER_AREA        // wanders freely in a range box (both axes)
PACE_HORIZONTAL    // predictable back-and-forth horizontally
PACE_VERTICAL      // predictable back-and-forth vertically
RUN_HORIZONTAL     // runs back and forth (speed 8 instead of 2)
RUN_VERTICAL       // runs up and down
```

### Also add `speed` override to NPCDefinition:
```typescript
speed?: number;  // default 2 for walk, 8 for run
```

### Files to modify:
- `src/game/types/npc.ts` — add new enum values + speed field
- `src/game/systems/NPCSystem.ts` — implement movement logic for each new behavior

---

## TASK 21: Ephemeral Pokemon System [ENHANCEMENT]

### What we want:
Pokemon that APPEAR at one of N random locations, stay visible for M seconds, then VANISH
and reappear elsewhere after a delay. Creates excitement and replayability.

### Data model:
```typescript
interface EphemeralPokemonConfig {
  spawnPoints: { x: number; y: number }[];
  visibleDuration: number;   // seconds
  hiddenDuration: number;    // seconds
  visibleBehavior: "idle" | "wander" | "hop";
  randomness: number;        // 0-1, varies timing
}
```

### Behavior:
1. Pick random spawn point → create sprite → register with Grid Engine
2. Run visible behavior for duration (± randomness)
3. Fade out + remove sprite
4. Wait hidden duration (± randomness)
5. Repeat from step 1 with different spawn point
6. AFTER player registers it in Pokedex → stop ephemeral cycle, become permanent

### Add to NPCDefinition:
```typescript
ephemeral?: EphemeralPokemonConfig;
```

### Files to modify:
- `src/game/types/npc.ts` — add ephemeral config
- `src/game/systems/NPCSystem.ts` — implement ephemeral lifecycle (or new EphemeralSystem.ts)

---

## TASK 22: Analytics Tracking [ENHANCEMENT]

### What exists: Zero analytics in the game code.

### What to add:
Wire Umami tracking calls at key game events. The main site already has Umami configured
(`window.umami` is available if the tracking script is loaded).

```typescript
function track(event: string, data?: Record<string, any>) {
  if (typeof window !== "undefined" && (window as any).umami) {
    (window as any).umami.track(event, data);
  }
}
```

Call at:
- Game start: `track('game-start', { name, gender })`
- Pokemon registered: `track('pokedex-register', { pokemon, project })`
- Paper collected: `track('paper-collected', { paper })`
- Blog collected: `track('blog-collected', { blog })`
- Badge earned: `track('badge-earned', { badge })`
- URL opened: `track('url-opened', { type, id })`
- Champion badge: `track('champion-badge')`
- Session end: `track('game-session', { duration, steps, badges })`

### Files to modify:
- New: `src/game/systems/Analytics.ts` — wrapper + event functions
- Various files — add track() calls at relevant points

---

## TASK 23: Birch Speech Sound Effects [MEDIUM]

### What the code does now:
- `BirchSpeechLayer.tsx` has a typewriter engine (lines 154-176) that advances characters one by one
- But it plays NO sound during typing — completely silent
- In-game `DialogBox.tsx` plays `sfx.text()` on each new line starting (line 54)
- Gender selection menu has no `sfx.select()` on cursor movement
- Name confirmation has no `sfx.confirm()` on YES press
- The Birch sequence feels dead and unresponsive compared to in-game dialog

### Why this matters:
The opening is the player's FIRST experience with the game. If the Birch speech feels
cheap (silent typewriter, no feedback sounds), it sets a bad tone. Every other dialog
in the game has sound — the intro should too. OG Pokemon Emerald's Birch speech has
the same typewriter blips as in-game dialog.

### What to fix:
1. **Typewriter tick** — add `sfx.text()` in the tick function (line 166 area):
   ```typescript
   const tick = () => {
     charIdx++;
     setDisplayedChars(charIdx);
     // Play text blip every few chars (not every single char — too noisy)
     if (charIdx % 3 === 0) sfx.text();
     ...
   };
   ```

2. **Gender menu navigation** — add `sfx.select()` on ArrowUp/ArrowDown (line 436-442):
   ```typescript
   if (e.key === "ArrowUp" || e.key === "ArrowDown") {
     e.preventDefault();
     sfx.select();  // ← ADD THIS
     setGenderCursor(prev => { ... });
   }
   ```

3. **Gender confirm** — add `sfx.confirm()` on A/Enter (line 443-446):
   ```typescript
   } else if (["a", "A", " ", "Enter"].includes(e.key)) {
     e.preventDefault();
     sfx.confirm();  // ← ADD THIS
     setPhase("WHATS_YOUR_NAME");
   }
   ```

4. **Name confirm YES/NO navigation** — add `sfx.select()` (line 470-472)
5. **Name confirm YES press** — add `sfx.confirm()` (line 475-477)
6. **Name input Enter press** — add `sfx.confirm()` (line 399-403)

### Files to modify:
- `src/components/game/BirchSpeechLayer.tsx` — add sfx calls at 6 locations
- Import `sfx` from SoundManager (already importing `bgm`, just add `sfx`)

---

## TASK 24: Birch Text Box Scaling [MEDIUM]

### What the code does now:
- BirchSpeechLayer text box (line 721-744) uses HARDCODED pixel sizes:
  ```
  borderWidth: "24px"
  padding: "10px 20px"
  minHeight: "68px"
  fontSize: "clamp(14px, 2.2vw, 26px)"
  ```
- In-game DialogBox.tsx uses SCALED sizes with CSS variables:
  ```
  borderWidth: `calc(24px * ${sX})`
  padding: `calc(10px * ${sX}) calc(20px * ${sX})`
  minHeight: `calc(68px * ${sX})`
  fontSize: `calc(26px * ${sX})`
  ```
  where `sX = "var(--ui-scale-x, 1)"`

### Why this matters:
On small screens the Birch text box is oversized relative to the game container.
On large screens it's undersized. The in-game dialog looks different from the Birch
dialog — they should match exactly since they use the same 9-slice frame image.

### What to fix:
Replace hardcoded px values with `calc(Npx * var(--ui-scale-x, 1))` to match DialogBox:
```typescript
const sX = "var(--ui-scale-x, 1)";
// ... in the style object:
borderWidth: `calc(24px * ${sX})`,
padding: `calc(10px * ${sX}) calc(20px * ${sX})`,
minHeight: `calc(68px * ${sX})`,
fontSize: `calc(26px * ${sX})`,
```

Also fix the speaker name pill (line 748-764) and the gender/confirm menus (lines 786-819, 884-919) to use the same scaling.

### Also fix container size mismatch:
- TitleScreenLayer: `width: "min(135vh, 90vw)"` / `height: "min(90vh, 60vw)"`
- BirchSpeechLayer: `width: "min(150vh, 100vw)"` / `height: "min(100vh, 66.67vw)"`
- Use the SAME dimensions in both (the Title dimensions are more conservative and safer)

### Files to modify:
- `src/components/game/BirchSpeechLayer.tsx` — replace hardcoded sizes with scaled calc() values, match container dimensions to TitleScreenLayer

---

## TASK 25: Title Screen Input Filtering + Menu Polish [LOW]

### What the code does now:

**Problem A — Any key skips title animations:**
- TitleScreenLayer.tsx line 46-49: during "shines" and "banner" phases, ANY keydown calls `onPressStart()`
- This includes Arrow keys, Escape, Shift, etc.
- Player accidentally hits a key → skips the logo animation entirely

**Problem B — No visual highlight on selected menu item:**
- `menuCardSelStyle` (line 223) and `menuSimpleSelStyle` (line 265) are EMPTY objects `{}`
- Only the ▶ cursor distinguishes selected from unselected
- OG Emerald highlights the selected item with distinct background/border

**Problem C — OPTION menu item is pointless:**
- Line 90-94: selecting OPTION stops music and goes to game (same as CONTINUE)
- Players expecting an options screen get nothing — confusing

### What to fix:

**A) Filter title skip to specific keys only:**
```typescript
if (phase === "shines" || phase === "banner") {
  if (["Enter", " ", "a", "A"].includes(e.key)) onPressStart();
}
```

**B) Add selection highlight:**
```typescript
const menuCardSelStyle: React.CSSProperties = {
  borderColor: "#3868c0",
  boxShadow: "0 0 0 3px #a0c0f0",
};
const menuSimpleSelStyle: React.CSSProperties = {
  borderColor: "#3868c0",
  boxShadow: "0 0 0 3px #a0c0f0",
};
```

**C) Either remove OPTION from title menu or make it useful:**
- Option 1: Remove "OPTION" → menu is just CONTINUE / NEW GAME (or just NEW GAME for first visit)
- Option 2: Keep "OPTION" but make it open a text-speed/sound-volume overlay on the title screen
- Recommendation: Remove it. Options are available in-game via the Start Menu.

### Files to modify:
- `src/components/game/TitleScreenLayer.tsx` — filter keys during animation phases
- `src/components/game/OpeningScreen.tsx` — add selection styles, remove or fix OPTION item

---

## UPDATED TASK SUMMARY

### CRITICAL (5):
| # | Task | Merged issues |
|---|---|---|
| 1 | Map analyzer script | Issues 11, 15, 33 |
| 2 | Step counter → mart shop | Issues 1, 9 |
| 3 | Dialog word-wrap + 2 lines per page — **ALSO applies to Birch speech typewriter** | Issues 3, 7 + Birch dialog splitting |
| 4 | NEW GAME full reset | Issue 23 |
| 5 | Research Log discovery count (pokedexCaught not pokedexSeen) | Issue 24 |

### HIGH (6):
| # | Task |
|---|---|
| 6 | Boundary Pokemon Pokedex registration |
| 7 | Fix DEVOTED badge conflict |
| 8 | Fix CHAMPION badge condition |
| 9 | Reconcile Pokedex total count |
| 10 | Add autoGive to InteriorNPC |
| 11 | Real play time tracking |

### MEDIUM (10):
| # | Task |
|---|---|
| 12 | Slaking/Slakoth sprites |
| 13 | Questionnaire reward |
| 14 | PC defaults (TMs not contacts) |
| 15 | Route 118 music (one-line fix) |
| 16 | Pokemon encounter SFX |
| 17 | Trainer Card back = progress |
| 18 | Hidden item priority order |
| 19 | Return-to-portfolio link |
| 23 | **Birch speech sound effects** |
| 24 | **Birch text box scaling + container size match** |

### LOW (1):
| # | Task |
|---|---|
| 25 | **Title screen input filtering + menu polish** |

### ENHANCEMENTS (3):
| # | Task |
|---|---|
| 20 | Advanced NPC movement behaviors |
| 21 | Ephemeral Pokemon system |
| 22 | Analytics tracking |

| 26 | **Player name/gender impact** — StartMenu shows player name, `{NAME}` template in dialog |

**Total: 26 tasks** (5 critical + 6 high + 11 medium + 1 low + 3 enhancements)

Note on Task 3: The dialog word-wrap + pagination fix should be implemented as a SHARED utility
that BOTH DialogBox.tsx (in-game) and BirchSpeechLayer.tsx (opening) use. Don't implement it
twice — one function, two consumers.

---

## TASK 26: Player Name/Gender Impact Across the Game [MEDIUM]

### What the code does now:

**Gender — WORKS correctly:**
- BootScene line 41-42: loads `brendan.png` or `may.png` based on `save.playerGender` ✓
- InteriorScene reuses the cached `"player"` texture → correct sprite ✓
- TrainerCard line 180: shows correct portrait (brendan_pic or may_pic) ✓
- BirchSpeechLayer: shows correct player sprite during intro ✓
- **Gender is fully wired. No changes needed.**

**Name — PARTIALLY works:**
- Saved to `save.playerName` ✓
- Shown on Trainer Card (`NAME: [playerName]`) ✓
- Shown on CONTINUE screen ✓
- **BUT: no NPC in the entire game ever says the player's name**
  - NPCs in `npcs.ts` use static `dialog: string[]` — no `{NAME}` interpolation
  - KOSTAS's `dialogFn` reads `save` but never uses `save.playerName`
  - Nurse Joy, gym trainers, blog NPCs — all generic text
- **AND: Start Menu shows "KOSTAS" instead of player's name**
  - `MENU_ITEMS[3]` is hardcoded as `"KOSTAS"` (line 23 in StartMenu.tsx)
  - In OG Pokemon, this slot shows YOUR name (opens Trainer Card)
  - Currently: the menu says KOSTAS but opens YOUR card — confusing

### Why this matters:
The player chose a name during the Birch intro. If nobody ever USES it, the choice
feels meaningless. In OG Pokemon, NPCs frequently say "Hey [PLAYER]!" or "Good luck,
[PLAYER]!" It creates a personal connection. For a portfolio game, this matters even
more — the visitor feels like a participant, not a spectator.

### What to fix:

**A) StartMenu — show player name instead of "KOSTAS":**
```typescript
// StartMenu.tsx
const save = getSave();
const MENU_ITEMS = [
  "POKeDEX",
  "POKeMON",
  "BAG",
  save.playerName || "TRAINER",  // ← dynamic, not hardcoded
  "HELP",
  "OPTION",
  "EXIT",
] as const;
```

**B) Support `{NAME}` template in dialog strings:**
Add a utility that replaces `{NAME}` in dialog lines with the player's name:
```typescript
function interpolateDialog(lines: string[], save: GameSave): string[] {
  return lines.map(line => line.replace(/\{NAME\}/g, save.playerName || "TRAINER"));
}
```
Apply this in `NPCSystem.interact()` and `InteriorScene.handleInteraction()` before
passing dialog to `DialogSystem.showDialog()`.

Then NPCs can use: `"Hey {NAME}! Have you explored Route 117?"` and it renders as
`"Hey ALEX! Have you explored Route 117?"`

**C) KOSTAS dialogFn should use player name:**
His dynamic dialog should address the player: `"${save.playerName}, you've earned..."` 
This is mostly MY content task — but the `{NAME}` interpolation from B) must exist first.

### Files to modify:
- `src/components/game/StartMenu.tsx` — dynamic menu item name
- `src/game/systems/NPCSystem.ts` — add `interpolateDialog()` before showing dialog
- `src/game/scenes/InteriorScene.ts` — same interpolation for interior NPCs
- `src/game/data/interiors.ts` — KOSTAS dialogFn uses save.playerName (content: me)

### Note:
The `{NAME}` template support is an ENGINE feature (you build the interpolation).
Actually USING it in NPC dialog text is MY content task (I write the dialog strings
with `{NAME}` placeholders where appropriate).
