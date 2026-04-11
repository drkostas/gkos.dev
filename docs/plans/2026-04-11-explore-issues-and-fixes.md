# Explore Mode — Issues, Fixes & Missing Features (April 11, 2026)

> Comprehensive audit of the current worktree codebase.
> Each issue includes: what the code does now, what we want, why, and how to fix.

---

## GOAL REMINDER

This is a Pokemon Emerald-style game that IS Kostas's portfolio. Every interaction teaches the visitor something:
- **Wild Pokemon** = projects (walk up → Pokedex registers → visitor sees project info)
- **Gym trainers** = PhD papers (mandatory, auto-collected)
- **Route trainers** = non-PhD papers (optional, yes/no)
- **Blog NPCs** = blog posts (yes/no)
- **TMs** = skills (bought at mart with steps as currency)
- **Key items** = contact links (visible + hidden)
- **Badges** = milestones proving engagement
- **Research Log** = personal stories unlocked through discovery

**The game must feel like a REAL Pokemon game** — the portfolio content is woven into game mechanics, not bolted on. Dialog should feel natural, encounters should feel exciting, progression should feel rewarding.

---

## ISSUE 1: Step Counter Auto-Awards TMs (Should Be Mart Purchase)

### What the code does now:
- `StepMilestones.checkStepTMs()` is called on every step (OverworldScene line 497)
- When `currentSteps >= milestone.steps`, it immediately calls `giveItem()` → TM goes to bag
- `getPendingAward()` holds the TM → OverworldScene pops a dialog: "250-step milestone reached!" + "TM:TAILWIND added!"
- Player has NO CHOICE — TMs are force-given while walking

### What we want:
- Steps are CURRENCY, like money in OG Pokemon
- The Pokemart has a SHOP MENU where player browses TMs with step prices
- Player selects a TM → "Buy TM:DOCKER for 1,500 steps?" → Yes/No
- If yes: steps DEDUCTED, TM goes to bag
- If no: "Come back when you're ready!"
- The step count goes DOWN when you buy (you spend your steps)
- Walking earns more steps to spend later

### Why:
- Buying creates AGENCY — the player chooses which skills to prioritize
- Spending steps creates TENSION — "Do I buy DOCKER now or save for KUBERNETES?"
- The mart becomes a DESTINATION you revisit, not a static NPC hallway
- It matches OG Pokemon's Pokemart experience (browse, choose, buy)

### What needs to change:

**StepStore.ts:**
```typescript
// ADD: spend function
export function spendSteps(amount: number): boolean {
  const current = readSteps();
  if (current < amount) return false;
  writeSteps(current - amount);
  return true;
}
```

**StepMilestones.ts:**
- REMOVE `checkStepTMs()` function (or repurpose it as `getAvailableTMs()`)
- REMOVE `pendingAward` pattern
- Keep `getMilestoneStatuses()` for the shop UI display
- Change: milestones are now PRICES, not auto-award thresholds:
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

**OverworldScene.ts:**
- REMOVE line 497: `checkStepTMs(total)` — no more auto-awarding
- REMOVE lines 504-530: pending award dialog pattern

**New: MartShopInterface.tsx (React component):**
- Triggered when player talks to mart clerk (replaces current static dialog)
- Shows list of TMs with prices in steps
- Current step balance displayed at top
- Already purchased TMs show ✓
- Affordable but unpurchased TMs are selectable
- Too expensive TMs are grayed out
- Select → confirm → deduct steps → give TM → jingle → back to list

**interiors.ts mart clerk:**
- Change from static dialog to `dialogFn` that opens the shop interface via EventBridge event

---

## ISSUE 2: Snorlax, Slaking, Slakoth, Poochyena Don't Register in Pokedex

### What the code does now:
- These are defined in `npcs.ts` as regular NPCs with `dialog` only
- No `pokemon` field → NPCSystem doesn't trigger flash or Pokedex registration
- They function purely as boundary blockers with flavor dialog

### What we want:
- They ARE Pokemon (they're Pokemon sprites!) — they should register in the Pokedex
- First encounter: screen flash + cry + discovery dialog + "[SPECIES] registered in POKeDEX!"
- They need entries in `pokemon.ts` (POKEDEX array) mapping to projects
- Repeat encounters: shorter dialog (they're still blocking the path)

### Why:
- It's weird to see a SNORLAX and NOT have it register
- These are 4 additional Pokedex entries = 4 more projects showcased
- The boundary blockers become MEANINGFUL — they're not just obstacles, they're content

### What needs to change:

**npcs.ts — add `pokemon` field to each:**
```typescript
// Snorlax
{
  id: "npc_snorlax",
  spriteKey: "snorlax",
  // ... existing fields ...
  pokemon: {
    pokedexNumber: XX, // new entry in POKEDEX
    speciesName: "SNORLAX",
    projectName: "[some project]",
    projectDescription: "[description]",
    repeatDialog: ["SNORLAX is still sleeping...", "Zzz... Zzz..."],
  },
}
```

Same for Slaking, Slakoth, and ONE Poochyena (all 10 Poochyenas share one Pokedex entry — only the first triggers registration).

**pokemon.ts — add 4 new entries:**
Need to decide which projects these map to. Suggestions:
- Snorlax → a large/heavy project (maybe a Python package or infrastructure tool)
- Slaking → a "lazy but powerful" project
- Slakoth → a smaller companion project
- Poochyena → one of the bot projects (they travel in packs, like bots)

**Pokedex total count needs updating** in `BadgeMilestones.ts` — `TOTAL_POKEDEX` should include these 4.

---

## ISSUE 3: Dialog Text Splits Too Aggressively

### What the code does now:

**Two separate problems:**

**Problem A: Hard character split in Pokemon encounter**
NPCSystem.ts line 221-223:
```typescript
const descLines = pkm.projectDescription
  .split("\n")
  .flatMap((l) => (l.length > 36 ? [l.slice(0, 36), l.slice(36)] : [l]));
```
This slices at exactly 36 characters with NO word-boundary awareness. "CLIP distillation framework for medical imaging" becomes:
- "CLIP distillation framework for med" ← broken mid-word!
- "ical imaging"

**Problem B: One string = one dialog page**
The DialogBox component treats each string in `lines[]` as a separate page requiring A-press to advance. If an NPC has:
```typescript
dialog: [
  "A huge SNORLAX is blocking",
  "the path!",
  "...",
  "Zzz... Zzz...",
  "",
  "It's dreaming of KOSTAS's",
  "PyTorch training runs.",
  "You can't wake it up.",
]
```
That's **8 pages** the player must press A through. The dialog box has room for 2-3 lines but only shows ONE at a time.

### What we want:
- Word-wrapping: never break mid-word. Wrap at the last space before the limit.
- Multi-line pages: the dialog box should accumulate 2-3 lines before requiring A-press
- Empty strings (`""`) should be treated as page breaks (intentional pauses)
- The result: Snorlax's 8-line dialog becomes ~3 pages, not 8

### Why:
- Mid-word breaks look broken/unprofessional
- 8 A-presses for a short dialog is tedious and breaks immersion
- OG Pokemon shows 2 lines per page (the dialog box is sized for it)
- Players will stop reading if every sentence needs an A-press

### How to fix:

**Replace hard-split with word-wrap helper:**
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

**Paginate dialog lines (group 2-3 lines per page):**
```typescript
function paginateLines(rawLines: string[], linesPerPage: number = 2): string[] {
  const pages: string[] = [];
  let buffer: string[] = [];
  for (const line of rawLines) {
    if (line === "") {
      // Empty string = forced page break
      if (buffer.length > 0) {
        pages.push(buffer.join("\n"));
        buffer = [];
      }
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

**Apply to DialogBox rendering:**
- The `lines` array from SHOW_DIALOG now contains multi-line strings (with `\n`)
- DialogBox renders each page with `white-space: pre-wrap` so `\n` creates line breaks within the box
- Each page still requires A-press to advance (but now each page has 2-3 lines of content)

**Apply word-wrap to Pokemon encounter descriptions:**
- Replace lines 221-223 in NPCSystem with the `wordWrap` function
- Then paginate the result

---

## ISSUE 4: Slaking/Slakoth Use Wrong Sprite Format

### What the code does now:
- Wild Pokemon use 32×64 sprites from `/game/sprites/pokemon/icons/` (2-frame idle animation, pixel-art overworld style)
- Snorlax uses a 32×32 OG emerald overworld sprite
- Slaking and Slakoth use 48×48 Lanczos-downscaled sprites with `scale: 2/3`
- The 48×48 sprites are higher resolution and look visually inconsistent with the 16-pixel tile grid

### What we want:
- ALL overworld Pokemon should use the same sprite style (32×64 or 32×32 OG format)
- Slaking/Slakoth should either:
  - Use OG emerald overworld sprites if they exist (pokeemerald does have overworld sprites for them)
  - Or use the same 32×64 icon format as the wild Pokemon
  - Or use their current sprites but rendered at a size that matches the pixel scale

### Why:
- Visual consistency — mixing HD and pixel-art sprites breaks the retro aesthetic
- The 48×48 sprites at 2/3 scale = 32px, which is close to correct, but the RESOLUTION is higher than the surrounding 16px tiles, making them look out of place

### How to fix:
- Check if pokeemerald has Slakoth/Slaking overworld sprites
- If not, add them to the pokemon/icons folder (32×64 format like others)
- Update BootScene to load them as `pkmn_slakoth` and `pkmn_slaking`
- Update npcs.ts to use `spriteKey: "pkmn_slakoth"` (matching wild pokemon pattern)
- Remove the `scale: 2/3` hack

---

## ISSUE 5: DEVOTED Badge Definition Conflict

### What the code does now:
Two conflicting definitions exist:

**BadgeMilestones.ts line 75-78:**
```typescript
{ id: "devoted", name: "DEVOTED",
  hint: `Collect all ${TOTAL_KEY_ITEMS} key items`,
  condition: (s) => s.keyItemsCollected.length >= TOTAL_KEY_ITEMS }
```

**GameSave.ts line 335-340:**
```typescript
const DEVOTED_BADGE_THRESHOLD = 10;
if (!save.badges.includes("devoted") &&
    save.urlsOpened.length >= DEVOTED_BADGE_THRESHOLD) {
  awardBadge("devoted");
}
```

**TrainerCard.tsx line 397:**
```
tagline: "Opened 10+ project URLs."
```

### What we decided:
DEVOTED = opened every URL (papers, blogs, projects, items). Not just "10 URLs" and not "collect all key items."

### What needs to change:
1. Remove the DEVOTED condition from BadgeMilestones.ts (it's wrong there — says key items)
2. GameSave.ts DEVOTED check should be: `urlsOpened.length >= TOTAL_OPENABLE_URLS` (not hardcoded 10)
3. `TOTAL_OPENABLE_URLS` = count of all items + Pokedex entries that HAVE a url field
4. TrainerCard tagline should be: "Opened every project URL."

---

## ISSUE 6: CHAMPION Badge Condition Wrong

### What the code does now:
```typescript
// BadgeMilestones.ts
{ id: "champion", condition: (s) => s.badges.length >= 7 }
```
CHAMPION = earned all 7 other badges. This makes it automatic once you have 7 badges.

### What we decided:
CHAMPION = found ALL contacts (including phone number from MEW beyond the boundary). KOSTAS gives the badge when he sees you have the phone number. The MEW story is the emotional climax.

### What needs to change:
- CHAMPION should NOT auto-award from badge count
- CHAMPION is given by KOSTAS when `save.keyItemsCollected` includes "PHONE.NUMBER"
- Or: MEW gives CHAMPION badge directly upon interaction (like current design)
- Remove the `badges.length >= 7` condition from BadgeMilestones

---

## ISSUE 7: Dialog Box Shows 1 Line Per Page

### What the code does now:
- DialogBox.tsx renders ONE string per page
- `displayedText` is a single string typewritten
- Each A-press advances `lineIndex` by 1
- The box has room for ~3 lines at current font size but wastes the space

### What we want:
- Each "page" shows 2 lines of text (matching OG Pokemon Emerald)
- A-press advances to the NEXT 2 lines (or finishes)
- This halves the number of A-presses needed

### See Issue 3 for the fix (pagination system).

---

## ISSUE 8: Wild Pokemon Placement Verification

### What the code does now:
- `wild-pokemon.ts` places 24 Pokemon at hardcoded coordinates
- No verification that coordinates are actually walkable
- Example concern: `wild(14, 130, 59)` — Wailord at x=130 on Route 118. Looking at the collision map, Route 118 has extensive water from x=100 onwards. Is (130,59) on land?

### What we want:
- A script that reads the collision layer + all NPC/Pokemon positions
- Outputs: which Pokemon are on walkable tiles, which are on blocked tiles
- Flags any placement that would block a critical path
- Outputs reachability from spawn point (72,58)

### Why:
- Players can't interact with Pokemon on blocked tiles
- An NPC on a narrow path blocks it permanently
- We need this BEFORE placing all the final content (NPCs, items, Pokemon)

### How to build:
A Node.js script (`scripts/validate-map.mjs`) that:
1. Reads `mauville.json` collision layer
2. Reads all NPC positions from `npcs.ts` + `wild-pokemon.ts`
3. Marks walkable tiles (collision=0)
4. Marks NPC-occupied tiles as blocked
5. Flood-fills from spawn (72,58) to find all reachable tiles
6. Reports: unreachable Pokemon/NPCs, path-blocking NPCs, dead ends
7. Outputs an ASCII reachability map

---

## ISSUE 9: No Mart Shop Interface for TM Buying

### What the code does now:
- Mart clerk has static dialog about PyPI packages
- No shop UI, no browsing, no purchasing
- The questionnaire (letter on desk) rewards MYSTERY TICKET, not TMs

### What we want:
- Mart clerk opens a SHOP MENU (like OG Pokemon's "Buy/Sell" menu)
- Shows TMs with step prices
- Player browses → selects → "Buy TM:DOCKER for 1,500 steps?" → Yes/No
- Steps deducted, TM given

### How to build:
New component `MartShopInterface.tsx`:
- Triggered via EventBridge when player talks to mart clerk
- Layout similar to OG Pokemart:
  ```
  ┌─────────────────────────────┐
  │  TM SHOP     Steps: 2,450  │
  │─────────────────────────────│
  │▶ TM:TAILWIND      250 ✓    │
  │  TM:FASTAPI       500 ✓    │
  │  TM:DOCKER       1500      │
  │  TM:PYTORCH      2000  ✗   │
  │  TM:AWS          3000  ✗   │
  │  CANCEL                    │
  │─────────────────────────────│
  │ Containerization platform.  │
  └─────────────────────────────┘
  ```
- ✓ = already bought, selectable = can afford, ✗ = can't afford
- Select + A → confirmation dialog → deduct steps → give TM

---

## ISSUE 10: Pokedex Total Count Uncertain

### What the code does now:
- `pokemon.ts` has 32 entries (line count shows 32 `number:` matches)
- `wild-pokemon.ts` places 24 wild Pokemon
- Party has 6 Pokemon (auto-registered as "seen")
- Snorlax/Slaking/Slakoth/Poochyena have NO Pokedex entries
- `BadgeMilestones.ts`: `TOTAL_POKEDEX = POKEDEX.length` (currently 32)

### Questions:
- Are all 32 Pokedex entries reachable? (6 party + 24 wild = 30, but POKEDEX has 32)
- Which 2 entries are unreachable? Are they the boundary Pokemon (Snorlax etc.)?
- Once we add pokemon fields to boundary Pokemon, total becomes 36? Or do they overlap?

### What we need:
- Reconcile: every Pokedex entry must have EXACTLY ONE registration method
- Party auto-register: 6 entries → "seen" status
- Wild overworld: 24 entries → "caught" on interaction
- Boundary Pokemon: 4 entries → "caught" on interaction (after adding `pokemon` field)
- Total should = 34 (or whatever the actual count is after deduplication)
- `TOTAL_POKEDEX` in BadgeMilestones must match

---

## ISSUE 11: Missing Walkability Map / Path Analysis Tool

### What exists:
- `scripts/validate-npcs.mjs` exists (154 lines) — need to check what it does
- No comprehensive walkability analysis

### What we need:
A `scripts/map-analyzer.mjs` that:
1. Parses the collision layer from `mauville.json`
2. Reads all NPC + Pokemon positions (they become collision tiles)
3. Computes flood-fill reachability from player spawn (72,58)
4. Identifies: blocked paths, unreachable areas, dead ends
5. Outputs: ASCII map with markers, statistics, warnings
6. Can simulate "what if I place an NPC at (X,Y)?" — does it block any path?
7. Computes Manhattan distances between key locations
8. Lists all walkable tiles grouped by zone (for future content placement)

### Why:
- We're about to place 40+ NPCs, 30+ Pokemon, 20+ items
- One misplaced NPC could block an entire route
- We need to KNOW which tiles are safe to use before placing content
- The tool becomes essential for future updates (new Pokemon, new NPCs, puzzles with tree-cutting etc.)

---

## ISSUE 12: Questionnaire Rewards

### What the code does now:
- Questionnaire in mart gives "MYSTERY TICKET" (a key item)
- 4 questions with predetermined answers: README(6), MEDIC(5), APRIL(5), PYTORCH/TORCH(7)

### What we want:
- The questionnaire should give a TM reward (not MYSTERY TICKET)
- Or: questionnaire gives access to a special area / hidden Pokemon
- Questions should be about Kostas's portfolio (testing if the visitor actually explored):
  - "What is the name of KOSTAS's NeurIPS paper?" → CROSS-SCALE MAE
  - "What framework does KOSTAS use for deep learning?" → PYTORCH
  - "What year did KOSTAS start his PhD?" → 2021
  - "How many PyPI packages has KOSTAS published?" → SEVEN

### Why:
- MYSTERY TICKET is a placeholder with no meaning
- The questionnaire should test and reward portfolio knowledge
- Correct answers prove the player actually engaged with the content

---

## ISSUE 13: PC Default Items Don't Match Design

### What the code does now:
- PCStore.ts pre-loads: RESUME.PDF, BLOG.URL, GITHUB.URL, LINKEDIN.URL, HUGGINGFACE.URL, SCHOLAR.URL
- These are CONTACT LINKS stored in the PC

### What we decided:
- PC stores pre-loaded TMs: PYTHON, GIT, LINUX (foundational skills the player "starts with")
- Contact links are ITEM BALLS on the overworld (visible + hidden), NOT in the PC

### What needs to change:
- Replace PC default items with TM:PYTHON, TM:GIT, TM:LINUX
- Remove contact link URLs from PCStore defaults
- Contact links stay as overworld Pokeball pickups + hidden items

---

## ISSUE 14: Future Puzzle System (Design Only)

### What the user described:
- Certain Pokemon moves can CUT trees or BREAK fences on the map
- Tiles that look slightly different from normal trees/fences
- Cutting/breaking opens new small routes to hidden items or Pokemon
- Need to track which obstacles have been cleared (persist in save)

### Not needed now but needs MAP SUPPORT:
- The map analyzer tool (Issue 11) must know about cuttable trees/breakable fences
- The data model needs a "clearable obstacle" type
- The save state needs a `clearedObstacles: string[]` array

### This is PHASE 2 — not blocking current work but architecture should accommodate it.

---

## SUMMARY: Priority Order

### CRITICAL (blocks content placement):
1. **Issue 1:** Step counter → mart purchase (remove auto-award, add shop)
2. **Issue 3:** Dialog text splitting (word-wrap + 2 lines per page)
3. **Issue 11:** Walkability map tool (need this BEFORE placing any content)

### HIGH (affects gameplay correctness):
4. **Issue 2:** Snorlax/Slaking/Poochyena Pokedex registration
5. **Issue 5:** DEVOTED badge conflict (two definitions)
6. **Issue 6:** CHAMPION badge condition (should be MEW/contacts, not badge count)
7. **Issue 10:** Pokedex total count reconciliation

### MEDIUM (visual/UX polish):
8. **Issue 4:** Slaking/Slakoth sprite mismatch
9. **Issue 9:** Mart shop interface UI
10. **Issue 7:** Dialog box 1 line per page → 2 lines
11. **Issue 12:** Questionnaire rewards
12. **Issue 13:** PC default items

### LOW (future planning):
13. **Issue 8:** Wild Pokemon placement verification (covered by Issue 11)
14. **Issue 14:** Puzzle system design for future

---

## ISSUE 15: Map Encoding — Locations, Paths, Distances

### What we need:
A **map data export** that encodes the entire walkable world as a graph. This is the foundation for ALL content placement decisions.

### Output:
A JSON file (`game-map-data.json`) containing:
```typescript
{
  walkableTiles: { x: number; y: number; zone: string }[];
  npcsBlocking: { x: number; y: number; id: string }[];
  edges: { from: [number, number]; to: [number, number]; weight: number }[];
  zones: { id: string; tiles: number; center: [number, number] }[];
  distanceMatrix: Record<string, Record<string, number>>; // zone→zone manhattan
  
  // Key locations with distances from spawn
  landmarks: {
    name: string;
    position: [number, number];
    zone: string;
    distanceFromSpawn: number; // manhattan distance from (72,58)
    reachable: boolean;
  }[];
  
  // Path analysis
  criticalPaths: {
    from: string;
    to: string;
    tiles: [number, number][]; // the shortest path
    bottlenecks: [number, number][]; // single-tile-wide points
  }[];
}
```

### Why:
- **Placement decisions:** "Place this blog NPC halfway between the gym and Route 117" → need distances
- **Story flow:** "The player should discover papers in chronological order" → need path ordering
- **Treasure hunting:** "This hidden item should be FAR from any NPC hint" → need distances
- **Blocking detection:** "Would placing a Pokemon at (65, 77) block the south route?" → need path analysis
- **Future puzzles:** "Cutting this tree opens a path to tiles [X, Y, Z]" → need the graph

### How to build:
`scripts/map-analyzer.mjs` that:
1. Reads collision layer from `mauville.json`
2. Builds adjacency graph of walkable tiles
3. BFS from spawn (72,58) — marks all reachable tiles
4. Computes shortest paths between zone centers
5. Identifies bottleneck tiles (removing one disconnects the graph)
6. Outputs JSON + ASCII visualization

---

## ISSUE 16: Advanced NPC/Pokemon Movement Behaviors

### What exists:
```typescript
enum MovementBehavior {
  STATIONARY = "stationary",
  WANDER_LEFT_RIGHT = "wander_left_right",
  LOOK_AROUND = "look_around",
}
```
Only 3 behaviors. NPCs either stand still, look around, or shuffle left/right.

### What we want — new movement types:

**For NPCs:**
```typescript
enum MovementBehavior {
  STATIONARY = "stationary",           // stands still, fixed direction
  LOOK_AROUND = "look_around",         // randomly turns in place
  WANDER_LEFT_RIGHT = "wander_left_right", // shuffles horizontally
  WANDER_UP_DOWN = "wander_up_down",   // shuffles vertically
  WANDER_AREA = "wander_area",         // wanders freely within range box
  PACE_HORIZONTAL = "pace_horizontal", // walks back and forth predictably
  PACE_VERTICAL = "pace_vertical",     // walks up and down predictably
  RUN_HORIZONTAL = "run_horizontal",   // runs back and forth (faster)
  RUN_VERTICAL = "run_vertical",       // runs up and down (faster)
}
```

**For Pokemon — SPECIAL ephemeral behavior:**
```typescript
interface EphemeralPokemonConfig {
  /** List of possible spawn positions (tile coords). */
  spawnPoints: { x: number; y: number }[];
  /** How long the Pokemon is visible (seconds). */
  visibleDuration: number;
  /** How long between disappear and reappear (seconds). */
  hiddenDuration: number;
  /** What the Pokemon does while visible. */
  visibleBehavior: "idle" | "wander" | "hop" | "spin";
  /** Randomness factor (0=exact timing, 1=fully random). */
  randomness: number;
}
```

This creates Pokemon that APPEAR at one of N locations, do something for a few seconds, then VANISH, and reappear elsewhere later. Like catching a rare Pokemon — you have to be in the right place at the right time.

### Why:
- **NPCs feel alive:** Running kids, pacing guards, wandering researchers — the world feels populated and dynamic
- **Pokemon feel wild:** A Flygon that appears for 10 seconds at one of 3 locations then flies away — creates EXCITEMENT and replayability
- **Treasure hunting:** Ephemeral Pokemon are harder to find → more satisfying to register
- **Visual variety:** Right now the world feels static — NPCs either stand or shuffle

### How to build:

**Expanded NPCSystem.executeBehavior():**
Add cases for new movement types. `wander_area` uses Grid Engine's `moveTo()` with random target within range. `pace_*` uses a back-and-forth pattern. `run_*` sets speed to 8 during movement.

**New: EphemeralPokemonSystem:**
```typescript
class EphemeralPokemonSystem {
  private timer: Phaser.Time.TimerEvent;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private config: EphemeralPokemonConfig;
  private currentSpawnIndex: number = -1;
  
  update() {
    // Timer-based: spawn → visible phase → despawn → hidden phase → respawn
    // Random location selection from spawnPoints[]
    // Behavior during visible phase (idle animation, wander, hop)
    // Interaction still works normally (player walks up, presses A)
    // After registration, Pokemon becomes permanent (stops ephemeral cycle)
  }
}
```

### NPC config additions:
```typescript
interface NPCDefinition {
  // ... existing ...
  
  /** Speed override (default 2 for walk, 8 for run). */
  speed?: number;
  
  /** If set, Pokemon appears/disappears on a cycle. */
  ephemeral?: EphemeralPokemonConfig;
}
```

---

## ISSUE 17: Play Time Tracking is Fake

### What the code does now:
- TrainerCard.tsx line 79: `const yearsExperience = new Date().getFullYear() - 2017;`
- Line 169: displays `{yearsExperience}h 00m` — this shows "9h 00m" (years since 2017), NOT actual play time
- GameSave.ts has NO `playTimeSeconds` field

### What we want:
- Real play time tracker: seconds increment while game is running
- Pauses when tab is hidden or menu is in a non-game state
- Trainer Card shows actual play time: "0h 12m"
- Persisted in GameSave

### What needs to change:
- Add `playTimeSeconds: number` to GameSave interface + defaults
- Add a 1-second interval in PhaserGame.tsx or OverworldScene that increments
- TrainerCard reads from GameSave instead of `yearsExperience`

---

## ISSUE 18: Gym Trainers Don't Have autoGive (Interior Gap)

### What the code does now:
- `autoGive` field exists on `NPCDefinition` (overworld NPC type)
- NPCSystem.ts handles `autoGive`: gives item → moves NPC to aside position
- BUT gym trainers are `InteriorNPC` (different type in `interiors.ts`)
- `InteriorNPC` does NOT have `autoGive`, `asidePosition`, or `clearedDialog`
- Gym trainers currently have static dialog only — no paper giving, no stepping aside

### What we want:
- Gym trainers give papers automatically (mandatory, no yes/no)
- After giving, trainer walks to aside position (clearing the path)
- On revisit, trainer is already aside with different dialog
- State persisted: `gymTrainersCleared[]` in GameSave

### What needs to change:
- Add `autoGive` to `InteriorNPC` interface (or unify with NPCDefinition)
- InteriorScene `handleInteraction()` needs autoGive handling (same pattern as NPCSystem)
- TrainerStore.ts already exists — just needs to be wired into InteriorScene
- Gym trainers in `interiors.ts` need `autoGive` fields with paper items + aside positions

---

## ISSUE 19: No Async API-Powered NPCs

### What the code does now:
- `dialogFn` exists and is async-capable (returns `Promise<DynamicDialogResult>`)
- KOSTAS uses `dialogFn` for dynamic badge dialog ✓
- BUT no NPCs actually fetch from APIs (Strava, Spotify, GitHub, PyPI)
- All dialog is currently static or save-state-based

### What we want (design doc):
- Strava Nerd (Pokecenter): fetches `/api/strava/recent` → shows last 3 activities
- Spotify Guy (Mauville): fetches `/api/spotify/now-playing` → shows current track
- Day Care Man (Route 117): fetches `/api/stats/github` → shows commit activity
- Mart Clerk: fetches `/api/stats/pypi` → shows download counts

### This is MY task (content), not yours:
- The `dialogFn` async support already exists ✓
- I just need to write the `dialogFn` implementations that call fetch()
- BUT: need to verify the game handles the async delay gracefully (no freeze, no error on network failure)

### What you should verify:
- Does InteriorScene await `dialogFn` correctly? (line 995-996: yes, it does)
- Does NPCSystem await `dialogFn` correctly? (line 328-329: yes, it does)
- What happens if fetch fails? → The `dialogFn` should catch and return fallback dialog
- **No engine work needed** — just verification that async path works

---

## ISSUE 20: No Analytics Tracking in Game

### What the code does now:
- Zero Umami tracking calls anywhere in the game code
- The main site has Umami tracking (via the loading screen script)
- But game interactions (Pokemon caught, badges earned, items found) are not tracked

### What we want:
- Track key game events for portfolio analytics:
  ```javascript
  umami.track('game-start', { name, gender });
  umami.track('pokedex-register', { pokemon, project });
  umami.track('paper-collected', { paper });
  umami.track('badge-earned', { badge });
  umami.track('url-opened', { type, id });
  umami.track('champion-badge');
  umami.track('game-session', { duration, steps, badges });
  ```

### This is a LATE task — not blocking anything. Wire it after content is placed.

---

## ISSUE 21: No spawnCondition Used Anywhere

### What the code does now:
- `NPCDefinition` has `spawnCondition?: () => boolean` ✓
- NPCSystem.init() checks it: `if (npc.spawnCondition && !npc.spawnCondition()) continue;` ✓
- BUT no NPC in `npcs.ts` or `wild-pokemon.ts` actually uses it

### What we want:
- Blog NPCs only spawn when their blog exists
- Guard NPCs disappear when building opens
- Some NPCs appear only after certain badges are earned

### This is MY task — I'll set conditions when I write the final NPC data. Engine support is already there. ✓

---

## ISSUE 22: Missing Mart NPC for Step Display

### What the code does now:
- Mart has: clerk (static PyPI dialog), expert (static), developer (static)
- No NPC that SHOWS the player's step count or TM purchase status

### What we want:
- A "Step Tracker" NPC in the mart who tells you your step count
- After the shop interface is built (Issue 9), this NPC might be merged with the clerk
- OR: the clerk opens the shop, and a separate Step Tracker NPC shows your count/history

### Depends on Issue 1/9 (mart shop) — design the NPC role after shop UI is decided.

---

## UPDATED SUMMARY

### YOUR ENGINE TASKS (priority order):

**CRITICAL (blocks everything):**
1. Map analyzer tool + walkability encoding (Issue 11 + 15)
2. Step counter → mart shop purchase system (Issue 1 + 9)
3. Dialog word-wrap + 2 lines per page pagination (Issue 3 + 7)

**HIGH (gameplay correctness):**
4. Add `pokemon` field to Snorlax/Slaking/Slakoth/Poochyena (Issue 2)
5. Fix DEVOTED badge: remove key-items condition, keep URL-opens only (Issue 5)
6. Fix CHAMPION badge: MEW/contacts chain, not badge-count auto-award (Issue 6)
7. Reconcile Pokedex total count (Issue 10)
8. Add `autoGive` to InteriorNPC + wire in InteriorScene (Issue 18)
9. Add play time tracking (Issue 17)

**MEDIUM (polish):**
10. Fix Slaking/Slakoth sprites (Issue 4)
11. Fix questionnaire reward (Issue 12)
12. Fix PC defaults to TMs not contacts (Issue 13)
13. Add MartShopInterface.tsx component (Issue 9)
14. Add mart step-display NPC (Issue 22)

**ENHANCEMENTS (new features):**
15. Advanced NPC movement behaviors (Issue 16)
16. Ephemeral Pokemon system (Issue 16)
17. Analytics tracking (Issue 20)
18. Puzzle system design (Issue 14)

### MY CONTENT TASKS (after your engine work):
- Place all NPCs, Pokemon, items with exact coordinates
- Write all dialog (dynamic, static, conditional)
- Write API-powered dialogFn implementations
- Set spawnConditions for blog NPCs
- Configure KOSTAS state machine dialog tree
- Write Research Log stories
- Design questionnaire questions
- Configure mart shop TM prices
- Source/create sound effects

---

## ISSUE 23: NEW GAME Doesn't Fully Reset

### What the code does now:
- OpeningScreen "NEW GAME" calls `clearSave()` which ONLY clears `gkos:explore:save`
- But there are **7 other localStorage keys** that persist independently:
  - `gkos:explore:steps` (StepStore)
  - `gkos:explore:pickups` (PickupStore)
  - `gkos:explore:pokedex-seen` (PokedexStore)
  - `gkos:explore:pc` (PCStore)
  - `gkos:explore:trainers-cleared` (TrainerStore)
  - `gkos:explore:settings` (Settings — should maybe persist?)
  - `gkos:explore:interior` (InteriorStateStore)
- OptionsMenu's "CLEAR PROGRESS" wipes ALL `gkos:explore:*` keys ✓ (correct)
- But NEW GAME from the title screen only wipes one key ✗ (broken)

### What we want:
- NEW GAME = full reset. Clear ALL game state. Player starts completely fresh.
- Settings (text speed, frame style) could optionally persist (QoL).

### Fix:
`clearSave()` in GameSave.ts should also call:
```typescript
clearSteps();
clearPickups();
clearPokedexSeen();
clearPCStore();
clearTrainerStore();
clearInteriorState();
// Optionally keep settings
```
OR: use the same approach as OptionsMenu's `clearAllProgress()`:
```typescript
const keys = Object.keys(localStorage).filter(k => k.startsWith("gkos:explore:"));
for (const k of keys) localStorage.removeItem(k);
```

---

## ISSUE 24: Research Log Given Immediately on New Game

### What the code does now:
- `shouldAwardResearchLog()` checks `getTotalDiscoveries() >= 5`
- `getTotalDiscoveries()` counts `pokedexSeen.length + papers + blogs + tms + keyItems`
- `PartyDexRegistrar` auto-adds 6 party Pokemon to `pokedexSeen` on game init
- So on a brand new game: `pokedexSeen.length = 6` → discoveries = 6 → threshold 5 is met
- Result: player gets "Obtained RESEARCH LOG!" within seconds of starting, before doing ANYTHING

### What we want:
- Research Log is earned through ACTIVE exploration, not passive auto-registration
- Party Pokemon should NOT count toward discovery total
- OR: threshold should be higher (e.g., 10) so party alone doesn't trigger it

### Best fix:
Change `getTotalDiscoveries()` to count `pokedexCaught` (found by walking up to overworld Pokemon) instead of `pokedexSeen` (which includes auto-registered party):
```typescript
export function getTotalDiscoveries(): number {
  const save = getSave();
  return (
    save.pokedexCaught.length +    // ← CAUGHT, not seen
    save.papersCollected.length +
    save.blogsCollected.length +
    save.tmsCollected.length +
    save.keyItemsCollected.length
  );
}
```
This way: party Pokemon = seen (auto) but NOT caught. Only overworld encounters count as discoveries.

---

## ISSUE 25: No Dedicated Pokemon Encounter Sound

### What the code does now:
- Pokemon encounter in NPCSystem line 213: `sfx.pickup()` — reuses the generic item pickup sound
- SoundManager has no `encounter()`, `pokemonCry()`, or `discovery()` function

### What we want:
- A distinct encounter sound that plays during the white flash when you first meet a Pokemon
- Different from the item pickup jingle — this is a DISCOVERY moment, not a loot moment
- OG Pokemon has a unique "encounter" fanfare per species, but we can use a single generic one

### What's needed:
- A new SFX file: `se_encounter.ogg` or `se_pokemon_found.ogg`
- Something that feels like discovery — short rising tone, 0.3-0.5 seconds
- Add `sfx.encounter()` to SoundManager
- Replace `sfx.pickup()` in NPCSystem Pokemon encounter with `sfx.encounter()`

### Alternatives if we can't source/create a new sound:
- Use `se_itemget.ogg` at a different pitch (if the Audio API supports it)
- Use the badge jingle at low volume (feels too grand)
- Keep `sfx.pickup()` but it's not ideal (sounds like finding a Pokeball, not meeting a Pokemon)

---

## ISSUE 26: Route 118 Music Mapping Wrong

### What the code does now:
- `BGMManager.ts` line 25: `route118: "mus_route110.ogg"`
- Comment on line 9 says: `"route118" → mus_route111.ogg (Route 118 — reuses 111)`
- The code contradicts the comment — plays Route 110 music, not 111

### What we want:
- Route 118 should have distinct music from Route 110 (variety)
- `mus_route111.ogg` EXISTS in the bgm folder and is different from `mus_route110.ogg`
- Change line 25 to: `route118: "mus_route111.ogg"`

### Simple one-line fix.

---

## ISSUE 27: Door Enter/Exit Sounds Exist But Aren't Used Everywhere

### What the code does now:
- `sfx.door()` is called in OverworldScene warp transition ✓
- `sfx.exit()` is called in InteriorScene exit ✓
- Both sounds exist as files (`se_door_enter.ogg`, `se_door_exit.ogg`) ✓

### Status: WORKING ✓ — no fix needed. Good job.

---

## ISSUE 28: Missing Sound Effects Inventory

### Sounds that EXIST and are USED:
| Sound | File | Used for |
|---|---|---|
| Menu select | se_select.ogg | ✓ Navigation |
| Cancel/back | se_cancel.ogg | ✓ B button |
| Menu open | se_win_open.ogg | ✓ Start menu |
| Wall bonk | se_wall_hit.ogg | ✓ Walking into walls |
| Ledge hop | se_dansa.ogg | ✓ Jumping ledges |
| Item pickup | se_itemget.ogg | ✓ Collecting items |
| Save | se_save.ogg | ✓ (unused — autosave, no save confirmation) |
| Card flip | se_card.ogg | ✓ Trainer card flip |
| Door enter | se_door_enter.ogg | ✓ Building warp |
| Door exit | se_door_exit.ogg | ✓ Leaving building |
| PC on | se_pc_on.ogg | ✓ PC activation |
| PC off | se_pc_off.ogg | ✓ PC deactivation |
| Badge get | se_badge_get.mp3 | ✓ Regular badge |
| Badge gym | se_badge_final_gym.mp3 | ✓ Gym badge |
| Badge champion | se_badge_champion.mp3 | ✓ Champion badge |
| Blog get | se_blog_get.mp3 | ✓ Blog post collected |
| TM get | se_tm_get.mp3 | ✓ TM received |

### Sounds MISSING:
| Sound | Needed for | Priority |
|---|---|---|
| Pokemon encounter | First-time Pokemon discovery flash | HIGH |
| Research log unlock | Special moment (different from item pickup) | MEDIUM |
| New content notification | OAK phone call on boot | LOW |
| MEW cry | Easter egg encounter | LOW |
| Step milestone ding | Could reuse tm_get | LOW (reuse existing) |

### Music that EXISTS:
| Track | File | Used for |
|---|---|---|
| Title/intro | mus_intro.ogg | ✓ Title screen |
| Birch speech | mus_birch.ogg | ✓ Professor intro |
| Mauville City | mus_mauville.ogg | ✓ City zone |
| Route 110 | mus_route110.ogg | ✓ Routes 110, 117, (wrongly 118) |
| Route 111 | mus_route111.ogg | ✗ Available but not used for 118 |
| Pokemon Center | mus_pokecenter.ogg | ✓ Center interior |
| Poke Mart | mus_mart.ogg | ✓ Mart interior |
| Gym | mus_gym.ogg | ✓ Gym interior |

### Music MISSING:
- **None!** All areas have BGM. Just fix the Route 118 mapping (Issue 26).

---

## ISSUE 29: Opening Screen Flow vs Design Doc

### What the code does now (working correctly):
1. `ExploreApp` → mobile detection → shows message if mobile ✓
2. `OpeningScreen` → shows `TitleScreenLayer` (Rayquaza + logo + animations) ✓
3. Shines animate → banner slides → "PRESS START" blinks ✓
4. Player presses key → fade to main menu ✓
5. Main menu: CONTINUE / NEW GAME / OPTION (or just NEW GAME / OPTION if first visit) ✓
6. CONTINUE → skips to game ✓
7. NEW GAME → clears save → Birch speech → name/gender → game ✓
8. Birch speech plays mus_birch.ogg ✓
9. Title screen plays mus_intro.ogg ✓

### What's different from our design doc:
- Design said "Professor Oak IS the loading screen" — current implementation has a SEPARATE title screen (Rayquaza) + Birch intro scene. This is BETTER than the design doc — it matches OG Pokemon Emerald's flow.
- Design said "Oak tutorial text during asset loading" — current implementation loads assets separately (Phaser boots after opening screen). The tutorial happens in the Birch speech, not during loading. This works fine.
- Design said "Kostas as professor" — current implementation uses "Birch" naming. **This should use Kostas's identity**, not Birch. The professor IS Kostas (or represents him).

### Only fix needed:
- Birch speech dialog should reference KOSTAS, not be generic
- The professor character is thematically "the builder of this world" = KOSTAS
- Speech content needs to explain the game's purpose (see design doc §3)

---

## ISSUE 30: Story Implementation Gaps

### Checking our plan against what's implemented:

**KOSTAS state machine:** ✓ Partially implemented
- `dialogFn` exists on gym_kostas in interiors.ts ✓
- Checks for unclaimed badges and gives them ✓  
- BUT: missing guidance priorities (close to badge, new content alert, Research Log)
- Missing: emotional MEW/Champion dialog
- Missing: specific hints per badge ("check Route 110 for more papers")
- **This is MY content task** — engine support is there, I write the dialog tree

**Gym trainers give papers:** ✗ NOT implemented
- Current gym trainers are static InteriorNPCs with plain dialog
- No `autoGive`, no stepping aside, no paper collection
- **This is YOUR task** — Issue 18 (add autoGive to InteriorNPC)

**Blog NPCs with conditional spawn:** ✗ NOT implemented
- `spawnCondition` exists on NPCDefinition type ✓
- But NO blog NPCs exist in npcs.ts or wild-pokemon.ts
- **This is MY content task** — I'll add blog NPCs when engine is ready

**Mart shop with step currency:** ✗ NOT implemented
- **YOUR task** — Issue 1/9

**Trainer Card back (objectives):** ✗ Shows Hoenn map/badges, NOT objectives
- TrainerCard flip exists ✓
- Back side doesn't show progress checklist
- **YOUR task** — Issue 17 (back side content)

**HELP screen:** ✓ Implemented
- Shows badges, progress, controls, NEW GAME option ✓
- Replaces SAVE in start menu ✓

**Notification banner:** ✓ Implemented
- Non-blocking slide-in from top ✓
- Queue system ✓

**Hidden items:** ✓ Implemented
- HiddenItemSystem with coordinate lookup ✓
- A-press priority in InteriorScene ✓

**PC interface:** ✓ Implemented
- Item withdraw from PC ✓
- But defaults are wrong (contacts instead of TMs) — Issue 13

---

## REVISED COMPLETE TASK LIST FOR YOU

### CRITICAL:
1. Map analyzer tool + walkability graph (Issue 11 + 15)
2. Step counter → mart shop (remove auto-award, add spendSteps, build MartShopInterface) (Issue 1 + 9)
3. Dialog word-wrap + 2 lines per page pagination (Issue 3 + 7)
4. NEW GAME full reset (clear ALL localStorage keys) (Issue 23)
5. Research Log discovery count excludes party auto-seen (Issue 24)

### HIGH:
6. Add `pokemon` field to Snorlax/Slaking/Slakoth/Poochyena (Issue 2)
7. Fix DEVOTED badge (two conflicting definitions) (Issue 5)
8. Fix CHAMPION badge condition (MEW/contacts, not auto at 7) (Issue 6)
9. Reconcile Pokedex total count (Issue 10)
10. Add `autoGive` to InteriorNPC + wire in InteriorScene (Issue 18)
11. Real play time tracking (Issue 17)

### MEDIUM:
12. Fix Slaking/Slakoth sprites (Issue 4)
13. Fix questionnaire reward (Issue 12)
14. Fix PC defaults to TMs (Issue 13)
15. Fix Route 118 music mapping (Issue 26 — one line)
16. Find/create Pokemon encounter SFX (Issue 25)
17. Trainer Card back shows progress (Issue 17)

### ENHANCEMENTS:
18. Advanced NPC movement behaviors (Issue 16)
19. Ephemeral Pokemon system (Issue 16)
20. Analytics tracking (Issue 20)
