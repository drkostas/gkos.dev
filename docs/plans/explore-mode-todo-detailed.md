# Explore Mode — Detailed TODO with Expected Behaviors

> Each task includes: what exists, what's needed, exact expected behavior,
> UI flow, data structures, and edge cases.

---

## EXISTING FUNCTIONALITY REFERENCE

### What already works (templates you can reuse):

**NPC with dialog** — `NPCDefinition` in `npcs.ts` + `NPCSystem.interact()`
- Player faces NPC → presses A → NPC turns to face player → dialog box opens
- Lines advance with A/Enter → after last line, dialog closes → NPC turns back
- Pickup NPCs: after dialog, sprite removed + item added to PickupStore

**NPC with choices** — `DialogSystem` supports `choices` array
- After dialog lines, choice buttons appear (YES/NO or custom)
- Player picks with arrows → confirms with A → `action` string returned via EventBridge

**Questionnaire** — `InteriorDef.questionnaireTiles` in `interiors.ts`
- Tile position triggers a multi-question form
- Questions have correct answers → reward on completion
- Already working in Pokemart

**Item pickup** — `PickupStore` persists collected items in localStorage
- `isPickedUp(npcId)` → boolean check
- `recordPickup(npcId, { name, url })` → persists
- NPC with `pickup` field: after dialog → recordPickup → removeNPC → item in bag

**PC (item withdraw)** — works in Pokemon Center interior
- Player faces PC tile → A press → PC UI opens
- Shows stored items → select → withdraw to bag

**Overworld Pokemon** — Snorlax, Slaking, Slakoth, Poochyena all placed
- Added as NPCs via NPCDefinition (some animated, some not)
- Custom sprites loaded in BootScene (spritesheet config per species)
- Interaction = standard NPC dialog (no Pokedex registration yet)

**Interior NPCs** — defined in `interiors.ts` InteriorNPC interface
- id, spriteKey, position, facingDirection, dialog, speakerName
- Created in InteriorScene, standard dialog on A-press

**Gym puzzle** — electric barriers toggle on switch tiles
- Animated tile swapping between frame0/frame1 textures
- Beams grouped by adjacency, crackle as units

**Options menu** — has CLEAR PROGRESS (wipes localStorage, reloads)
- Already handles New Game functionality

---

## TASK 1: Opening Screen

### What exists:
- `GameLoadingScreen.tsx` on main branch (basic progress bar + controls)
- No name/gender input, no tutorial text, no returning player detection

### What to build:

**Phase 1 — Loading (0-100%):**
- Oak/Kostas tutorial text auto-advances as progress bar fills
- Text is an array of strings, each tied to a progress threshold:
  ```typescript
  const TUTORIAL_LINES = [
    { at: 10, text: "Hello there! Welcome to KOSTAS's world!" },
    { at: 25, text: "This isn't just a game — it's a living portfolio." },
    { at: 40, text: "PROJECTS are POKEMON. Walk up to them." },
    { at: 55, text: "TRAINERS carry RESEARCH PAPERS." },
    { at: 70, text: "SKILLS are hidden as TMs. Walk to earn them!" },
    { at: 85, text: "Visit the GYM LEADER for BADGES." },
    { at: 100, text: "The world is ready!" },
  ];
  ```
- Each line fades in when progress >= threshold
- Controls bar always visible at bottom

**Phase 2 — Profile (after loading, first visit only):**
- Check localStorage: if save exists → skip to Phase 3
- Text input: "What is your name?" → text field, max 10 chars
  - A/Enter confirms
  - Default placeholder: "RED"
- Choice: "Are you a boy or girl?" → two buttons [BOY] [GIRL]
  - Arrows to select, A/Enter to confirm
  - Sets player sprite (brendan vs may — or both brendan for now)
- Save `playerName` + `playerGender` to GameSave
- Show: "[NAME]! Your adventure begins!"

**Phase 3 — Start:**
- First visit: "Press any key to start!"
- Returning visit: "Welcome back, [NAME]!" + new content notification if applicable
- Key/click → music starts → screen fades out → game spawns

**Mobile detection:**
- Check `'ontouchstart' in window` or `navigator.maxTouchPoints > 0` or `window.innerWidth < 768`
- If mobile: hide game, show message:
  ```
  "Explore Mode requires a keyboard."
  "Visit gkos.dev/explore on desktop!"
  ```
- No Phaser boot on mobile

### Edge cases:
- Very fast loading (<1 sec): text still shows but scrolls quickly
- Player enters empty name: use "RED" as default
- Player refreshes during Phase 2: save hasn't been created yet, replays Phase 2

---

## TASK 2: Unified GameSave Manager

### What exists:
- `PickupStore` — separate localStorage key `gkos:explore:pickups`
- Player position save — separate localStorage key `gkos:explore:player`
- Settings — separate localStorage key `gkos:explore:settings`
- Debug mode — separate key `gkos:explore:debug`

### What to build:
Single manager, single key `gkos:explore:save`:

```typescript
interface GameSave {
  // Profile
  playerName: string;
  playerGender: "boy" | "girl";
  firstPlayedAt: string;       // ISO date
  lastPlayedAt: string;

  // Progress
  steps: number;
  playTimeSeconds: number;
  zonesVisited: string[];      // ["mauville", "route117", ...]

  // Collections
  pokedexSeen: number[];       // Pokedex entry numbers
  papersCollected: string[];   // paper slug IDs
  blogsCollected: string[];    // blog slug IDs
  tmsCollected: string[];      // TM names
  keyItemsCollected: string[]; // item names

  // Engagement tracking
  urlsOpened: string[];        // "paper:medic", "pokedex:7", "key:github", etc.

  // Badges
  badges: string[];            // earned badge IDs: ["phd", "scholar", ...]

  // Research Log
  totalDiscoveries: number;    // lifetime counter, never resets
  researchLogsUnlocked: number;

  // NPC state
  pickupsConsumed: string[];   // NPC IDs whose item ball has been taken
  gymTrainersCleared: string[];
  npcsTalkedTo: string[];      // for tracking first-visit vs return dialog
  gymComplete: boolean;
  championBadge: boolean;
  phoneNumberReceived: boolean;

  // Content versioning (for new content detection)
  lastKnownCounts: {
    pokedex: number;
    papers: number;
    blogs: number;
    tms: number;
  };

  // Position
  lastPosition: { x: number; y: number; facing: string } | null;
  lastInterior: string | null; // if player was inside a building
}
```

**API:**
```typescript
function loadSave(): GameSave          // from localStorage, with defaults
function saveToDisk(save: GameSave)    // to localStorage
function getSave(): GameSave           // current in-memory save (fast reads)
function updateSave(patch: Partial<GameSave>)  // merge + persist

// Convenience:
function addToCollection(field: keyof GameSave, value: string | number)
function hasInCollection(field: keyof GameSave, value: string | number): boolean
```

**Migration:** On first load, read from old PickupStore + player position keys, merge into new GameSave, delete old keys.

**Autosave:** Call `saveToDisk()` every 1 second (or on every state change — whichever is simpler).

---

## TASK 3: Hidden Items System

### What exists:
- Visible item balls use `NPCDefinition` with `pickup` field
- `PickupStore.isPickedUp(id)` checks if collected
- `NPCSystem.interact()` handles pickup → removeNPC

### What to build:

**Data structure:**
```typescript
interface HiddenItem {
  id: string;                  // unique ID for save tracking
  position: { x: number; y: number };
  itemName: string;            // "TM:SUPABASE", "TWITTER.URL", etc.
  itemUrl?: string;            // URL for USE action
  pocket: "papers" | "blogs" | "keyItems" | "tms";
  description: string;         // shown in bag
  difficulty: "easy" | "medium" | "hard"; // determines tile type placement
}
```

**A-press priority (in OverworldScene interaction handler):**
```
1. Is there an NPC on the tile player is FACING? → NPC dialog
2. Is there a sign on the tile player is FACING? → sign dialog
3. Is there a hidden item on the tile player is STANDING ON? → hidden pickup
4. Nothing → no action
```

**Hidden item interaction flow:**
1. Player stands on hidden item tile (no visual indicator)
2. Player presses A (and no NPC/sign in front)
3. Check: `isHiddenItem(playerPos)` AND NOT `isCollected(itemId)`
4. If found:
   - ♪ `se_itemget.ogg` plays
   - Dialog: "You found [ITEM NAME]!"
   - Optional follow-up line with description
   - Item added to correct bag pocket
   - Mark as collected in GameSave
5. If already collected: no action (tile is now "empty")

**Tile types (you provide coordinates):**
- Easy: rocks — player likely walks over rocks and presses A out of curiosity
- Medium: flowers — slightly less obvious, player might A-press flowers
- Hard: ground between grass blocks — no visual cue at all, requires hint-following

---

## TASK 4: Pokemon Encounter Flash + Pokedex Registration

### What exists:
- Overworld Pokemon are NPCs (Snorlax, Poochyena, etc.) with standard dialog
- Pokedex viewer exists (`PokedexList.tsx`) with entries from `pokemon.ts`
- No flash, no registration, no encounter sound

### What to build:

**NPCDefinition extension:**
```typescript
interface NPCDefinition {
  // ... existing fields ...

  /** If set, this NPC is an overworld Pokemon that registers in the Pokedex. */
  pokemon?: {
    pokedexNumber: number;       // matches PokedexEntry.number
    speciesName: string;         // "SNORLAX", "BRELOOM", etc.
    projectName: string;         // "ShiftMD", "Cross-Scale MAE", etc.
    projectDescription: string;  // 1-2 lines
    projectUrl?: string;         // link to project
  };
}
```

**First encounter flow (pokemon field set AND not in pokedexSeen):**
1. Player faces Pokemon NPC → presses A
2. **Screen flash:** white overlay fades in (0ms to full white) → holds 100ms → fades out (150ms)
3. **Sound:** `encounter_ding.ogg` plays during flash
4. **Dialog box opens:**
   ```
   "[SPECIES] noticed you!"
   ""
   "[Project description line 1]"
   "[Project description line 2]"
   ```
5. **After dialog closes:**
   - Add `pokedexNumber` to `save.pokedexSeen[]`
   - Increment `save.totalDiscoveries`
   - Notification text (in dialog or banner): "[SPECIES] registered in POKéDEX!"
   - Check badge milestones
6. **NPC stays** (doesn't disappear like item balls)

**Second+ encounter (already in pokedexSeen):**
- No flash, no sound
- Different dialog: "SNORLAX is still sleeping..." / "BRELOOM is training hard!"
- No re-registration

**Edge case:** Pokemon with no project URL (some might not have live repos) — Pokedex entry shows description but no "VIEW PROJECT" button.

---

## TASK 5: Step Counter

### What exists:
- Grid Engine fires `positionChangeFinished` observable (already subscribed in OverworldScene for position save + warp detection)
- No step counting

### What to build:
- In `positionChangeFinished` callback for "player" charId:
  ```typescript
  const save = getSave();
  save.steps++;
  updateSave({ steps: save.steps });
  checkStepMilestones(save.steps);
  ```
- Also count steps in InteriorScene (same hook)
- Display on Trainer Card: "STEPS: 1,247"

---

## TASK 6: Play Time Tracker

### What exists:
- Nothing

### What to build:
- `setInterval(() => updateSave({ playTimeSeconds: getSave().playTimeSeconds + 1 }), 1000)`
- Start in PhaserGame component after game boots
- Pause when tab is hidden (`document.hidden`)
- Display on Trainer Card: "PLAY TIME: 0h 12m"

---

## TASK 7: Item Routing to Bag Pockets

### What exists:
- BagMenu has 5 pockets with hardcoded items (ITEMS, PROJECTS, PAPERS, PYPI, CONTACTS)
- PickupStore gives items to the ITEMS pocket dynamically

### What to build:

**Restructure bag to 4 pockets:**
```typescript
const POCKETS = [
  { id: "papers", name: "PAPERS", emptyMsg: "Visit the GYM to collect research papers!" },
  { id: "blogs", name: "BLOG POSTS", emptyMsg: "Talk to people — they have stories to share!" },
  { id: "keyItems", name: "KEY ITEMS", emptyMsg: "Explore the world and press A everywhere!" },
  { id: "tms", name: "TMs", emptyMsg: "Walk more! Check the MART for milestones." },
];
```

**Each pocket reads from GameSave:**
```typescript
function getPocketItems(pocketId: string): BagItem[] {
  const save = getSave();
  switch (pocketId) {
    case "papers": return save.papersCollected.map(id => PAPER_DEFINITIONS[id]);
    case "blogs": return save.blogsCollected.map(id => BLOG_DEFINITIONS[id]);
    case "keyItems": return save.keyItemsCollected.map(id => KEY_ITEM_DEFINITIONS[id]);
    case "tms": return save.tmsCollected.map(id => TM_DEFINITIONS[id]);
  }
}
```

**When any item is given to the player** (pickup, NPC gift, step milestone, questionnaire reward):
- Determine pocket from item definition
- Add to correct array in GameSave
- ♪ `se_itemget.ogg`
- Dialog: "[ITEM] added to [POCKET]!"

---

## TASK 8: NPC Auto-Gives Item + Moves Aside

### What exists:
- Pickup NPCs give items then DISAPPEAR (sprite removed)
- Regular NPCs give dialog only (no items, don't move)

### What to build (for gym trainers):

**New NPC type: trainer that gives item then moves aside:**

```typescript
interface NPCDefinition {
  // ... existing ...
  
  /** If set, this NPC gives an item and moves to asidePosition after dialog. */
  autoGive?: {
    itemName: string;
    itemUrl?: string;
    pocket: "papers" | "blogs" | "keyItems" | "tms";
    description: string;
    asidePosition: { x: number; y: number }; // where trainer walks to after giving
  };
}
```

**Interaction flow:**
1. Player faces trainer → presses A
2. Trainer turns to face player
3. Dialog plays (paper description, 2-3 lines)
4. "Take this paper!" → ♪ item added to PAPERS pocket
5. Check save: mark trainer ID in `gymTrainersCleared[]`
6. Trainer walks to `asidePosition` using Grid Engine `moveTo()`
7. Trainer stays at aside position permanently (saved in state)

**On subsequent visits (trainer already cleared):**
- Trainer is at aside position
- Different dialog: "Good luck with the rest of the GYM!"
- No item given again

**On scene load (InteriorScene create):**
- Check `save.gymTrainersCleared` for each trainer
- If cleared → spawn at `asidePosition` instead of original position
- Set different dialog

---

## TASK 9: Step Milestone TM Awards

### What exists:
- No step milestone system

### What to build:

**Data:**
```typescript
const STEP_MILESTONES = [
  { steps: 250, tm: "TAILWIND", description: "Utility-first CSS" },
  { steps: 500, tm: "FASTAPI", description: "Python web framework" },
  { steps: 1000, tm: "NEXT.JS", description: "React meta-framework" },
  { steps: 1500, tm: "DOCKER", description: "Containerization" },
  { steps: 2000, tm: "PYTORCH", description: "Deep learning framework" },
  { steps: 3000, tm: "AWS", description: "Cloud infrastructure" },
  { steps: 4000, tm: "KUBERNETES", description: "Container orchestration" },
  { steps: 6000, tm: "TERRAFORM", description: "Infrastructure as code" },
  { steps: 8000, tm: "SYSTEM DESIGN", description: "Architecture at scale" },
];
```

**Check after each step:**
```typescript
function checkStepMilestones(currentSteps: number) {
  const save = getSave();
  for (const milestone of STEP_MILESTONES) {
    if (currentSteps >= milestone.steps && !save.tmsCollected.includes(milestone.tm)) {
      // Award TM
      addToCollection('tmsCollected', milestone.tm);
      incrementDiscoveries();
      // Show notification banner
      showNotification(`TM:${milestone.tm} earned! (${milestone.steps} steps)`);
      // Play sound
      sfx.pickup();
      // Check badge milestones
      checkBadges();
      break; // only one per step (avoid multi-pop)
    }
  }
}
```

**The Step Tracker NPC (Mart interior) reads this data:**
- Shows current step count
- Lists all milestones with ✓ (collected) / ▶ (next) / ✗ (locked)

---

## TASK 10: Badge Milestone Detection

### What exists:
- TrainerCard has 8 badge slots (visual only)
- No badge logic

### What to build:

**Badge definitions:**
```typescript
const BADGES = [
  { id: "phd", name: "PhD", condition: (s) => s.gymComplete },
  { id: "scholar", name: "SCHOLAR", condition: (s) => s.papersCollected.length >= TOTAL_PAPERS },
  { id: "opensource", name: "OPEN SOURCE", condition: (s) => s.pokedexSeen.length >= TOTAL_POKEDEX },
  { id: "author", name: "AUTHOR", condition: (s) => s.blogsCollected.length >= TOTAL_BLOGS },
  { id: "fullstack", name: "FULL STACK", condition: (s) => s.tmsCollected.length >= TOTAL_TMS },
  { id: "explorer", name: "EXPLORER", condition: (s) => s.zonesVisited.length >= 5 },
  { id: "devoted", name: "DEVOTED", condition: (s) => s.urlsOpened.length >= TOTAL_URLS },
  { id: "champion", name: "CHAMPION", condition: (s) => allContactsCollected(s) },
];
```

**Check after every collection event:**
```typescript
function checkBadges() {
  const save = getSave();
  for (const badge of BADGES) {
    if (!save.badges.includes(badge.id) && badge.condition(save)) {
      // Badge newly earned! Show notification
      showNotification(`${badge.name} BADGE milestone! Visit KOSTAS!`);
      // Do NOT auto-add to save.badges — KOSTAS gives it
      // Exception: CHAMPION badge is given by MEW directly
      if (badge.id === "champion") {
        addToCollection('badges', 'champion');
      }
      break; // one notification at a time
    }
  }
}
```

**KOSTAS handles the actual badge giving** — see Task 12.

---

## TASK 11: Notification Banner (non-blocking)

### What exists:
- MapNamePopup slides in from top (zone name display)
- Dialog box (blocking, full-width at bottom)

### What to build:
- Similar to MapNamePopup but different visual style
- Appears at top-center of screen
- Text: "♪ [MESSAGE]"
- Slide in (300ms) → hold (3 seconds) → slide out (300ms)
- Does NOT pause the game
- Does NOT block input
- Queue system: if multiple notifications fire, show them sequentially

**Visual:** 
- Dark semi-transparent pill shape
- White text, Pokemon font
- ♪ icon or badge icon prefix

---

## TASK 12: Dynamic NPC Dialog (state-based)

### What exists:
- NPCDefinition has `dialog: string[]` (static)
- InteriorNPC has `dialog: string[]` (static)
- No support for dynamic/computed dialog

### What to build:

**Extend NPC types to support function-based dialog:**
```typescript
interface NPCDefinition {
  // ... existing fields ...
  
  /** Static dialog (current system). */
  dialog: string[];
  
  /** Dynamic dialog — overrides static if provided. */
  dialogFn?: (save: GameSave) => {
    lines: string[];
    speakerName?: string;
    choices?: { label: string; action: string }[];
    afterDialog?: () => void; // callback after dialog closes
  };
}
```

**In NPCSystem.interact():**
```typescript
if (npc.dialogFn) {
  const result = npc.dialogFn(getSave());
  this.dialogSystem.showDialog(result.lines, result.speakerName, result.choices);
  if (result.afterDialog) { /* wire to dialog complete event */ }
} else {
  this.dialogSystem.showDialog(npc.dialog, npc.speakerName);
}
```

**Same for InteriorNPC.** KOSTAS will use this heavily — his `dialogFn` implements the 7-priority state machine.

---

## TASK 13: NPC State Memory

### What exists:
- Pickup NPCs check `isPickedUp(id)` to skip spawning
- No other state-based dialog changes

### What to build:
- Built on top of Task 12 (dynamic dialog)
- NPCs check `save.npcsTalkedTo` to determine first vs return visit:
  ```typescript
  dialogFn: (save) => {
    if (save.npcsTalkedTo.includes("npc_boy_3")) {
      return { lines: ["Hey, you're back!", "Found anything new?"] };
    }
    return { 
      lines: ["Welcome to MAUVILLE!", "The GYM is to the west!"],
      afterDialog: () => addToCollection('npcsTalkedTo', 'npc_boy_3')
    };
  }
  ```

---

## TASK 14: Async NPC Dialog (API-powered)

### What exists:
- Dialog system shows static strings
- No fetch/async support

### What to build:

**Pattern for live data NPCs:**
```typescript
dialogFn: async (save) => {
  // Show loading indicator
  return {
    lines: ["Let me check..."],
    afterDialog: async () => {
      try {
        const res = await fetch("/api/strava/recent");
        const data = await res.json();
        const lines = formatStravaData(data);
        // Re-open dialog with real data
        dialogSystem.showDialog(lines, "FITNESS NERD");
      } catch {
        dialogSystem.showDialog(["Can't reach the tracker right now."], "FITNESS NERD");
      }
    }
  };
}
```

OR simpler: make `dialogFn` async, and NPCSystem awaits it:
```typescript
async interact(npcId: string) {
  const npc = this.npcs.find(n => n.id === npcId);
  if (npc.dialogFn) {
    const result = await npc.dialogFn(getSave());
    this.dialogSystem.showDialog(result.lines, result.speakerName);
  }
}
```

The NPC handler does the fetch BEFORE opening dialog. Player sees a brief pause (~200ms for API call), then dialog opens with real data. No "Loading..." intermediate state needed if the API is fast.

---

## TASK 15: Conditional NPC Spawning

### What exists:
- All NPCs in the NPC array are always spawned (unless pickup already collected)

### What to build:

**Add optional condition to NPCDefinition:**
```typescript
interface NPCDefinition {
  // ... existing ...
  
  /** If set, NPC only spawns when this returns true. */
  spawnCondition?: () => boolean;
}
```

**In NPCSystem.init():**
```typescript
for (const npc of this.npcs) {
  if (npc.pickup && isPickedUp(npc.id)) continue;
  if (npc.spawnCondition && !npc.spawnCondition()) continue;
  this.createNPC(npc);
}
```

**Usage for blog NPCs:**
```typescript
{
  id: "npc_blog_3",
  spawnCondition: () => getBlogCount() >= 3, // only exists if blog #3 is written
  dialog: [...],
}
```

---

## TASK 16: HELP Sub-Screen

### What exists:
- Start menu has "SAVE" slot → currently shows save confirmation
- Options menu exists with text speed, frame, debug, clear progress

### What to build:
- Replace "SAVE" with "HELP" in MENU_ITEMS
- HELP opens a sub-screen with:
  ```
  ┌──────────────────────────────────────┐
  │ HELP                                 │
  │                                      │
  │ CONTROLS                             │
  │ Arrows: Move  Shift: Run             │
  │ A/Enter: Interact  S/Esc: Back       │
  │ Esc/M: Menu                          │
  │                                      │
  │ OBJECTIVES                           │
  │ ■ PhD ............ Collect gym papers │
  │ ■ Scholar ........ All 10 papers     │
  │ ■ Open Source .... All 30 Pokemon    │
  │ ■ Author ......... All blog posts    │
  │ ■ Full Stack ..... All 20 TMs        │
  │ ■ Explorer ....... Visit 5 zones     │
  │ ■ Devoted ........ Open all URLs     │
  │ ■ Champion ....... ???               │
  │                                      │
  │ PROGRESS: 3/8 badges earned          │
  │ Papers: 6/10  Blogs: 1/1            │
  │ Pokemon: 18/30  TMs: 8/20           │
  │ Steps: 2,450                         │
  └──────────────────────────────────────┘
  ```
- Navigate with arrows, exit with B/Esc
- Earned badges show ✓, unearned show □, Champion shows ???

---

## TASK 17: Trainer Card Back Side

### What exists:
- Trainer Card flips with A button (front ↔ back)
- Back side currently shows Hoenn map with badges or is empty

### What to build:
- Back shows progress checklist (same data as HELP but different layout):
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
- Reads from GameSave

---

## TASK 18: Trainer Card Color

### What exists:
- Card has a background color/texture

### What to build:
- Card background changes based on `save.badges.length`:
  - 0-1: Gray
  - 2-3: Green
  - 4-5: Blue
  - 6-7: Gold
  - 8: Red (champion)
- Could be a CSS filter/overlay or different background images

---

## TASK 19: URL Open Tracking

### What exists:
- Bag has USE action that calls `window.open(url)`
- No tracking of which URLs were opened

### What to build:
- After `window.open()` succeeds, add item ID to `save.urlsOpened[]`:
  ```typescript
  // In BagMenu USE handler:
  window.open(item.url, "_blank");
  addToCollection('urlsOpened', `${pocketId}:${item.name}`);
  checkBadges(); // DEVOTED badge check
  ```
- Same in Pokedex when "VIEW PROJECT" is pressed
- Visual: ✓ or ★ next to items in Bag/Pokedex whose URL has been opened:
  ```
  ▶ RESUME.PDF        x1  ✓
    GITHUB.URL         x1  ✓
    LINKEDIN.URL       x1
  ```

---

## TASK 20: Locked Door Messages

### What exists:
- Signs work on blocked tiles (player faces tile, presses A → sign text)
- No door-specific messages

### What to build:
- Same system as signs, but triggered by facing DOOR tiles
- Or: add door positions to the sign array — they're functionally identical
  ```typescript
  const LOCKED_DOORS: SignDefinition[] = [
    { position: { x: ..., y: ... }, text: ["GAME CORNER", "CLOSED FOR RENOVATION"] },
    { position: { x: ..., y: ... }, text: ["RYDEL'S PIPELINES", "OPENING SOON"] },
    { position: { x: ..., y: ... }, text: ["BROADCAST TOWER", "Off-air — bloggers welcome soon!"] },
  ];
  ```
- Merge into `MAUVILLE_SIGNS` array — SignSystem handles it

---

## TASK 21: Research Log Key Item

### What exists:
- Bag has key items pocket
- No research log viewer

### What to build:
- Research Log is a KEY ITEM given when first milestone is reached (5 discoveries)
- In bag: "RESEARCH LOG" item → USE → opens log viewer
- Log viewer shows unlocked entries:
  ```
  RESEARCH LOG
  
  #1: Why I left Greece ............. ✓
  #2: The NeurIPS rejection ......... ✓
  #3: Building FleetSmart at 2 AM ... ✓
  #4: ??? (5 more discoveries needed)
  #5: ???
  ```
- Select an unlocked entry → read the full text
- Navigate with arrows, exit with B
- Entry text is 4-6 lines each (defined in data, I write content)

---

## TASK 22: Special Pokemon Interaction (MEW)

### What exists:
- Standard Pokemon encounter (Task 4)
- Standard pickup items
- No multi-reward interactions

### What to build:
- MEW uses the Pokemon encounter flow (flash + sound + registration)
- ADDITIONALLY gives a KEY ITEM (PHONE.NUMBER) and sets `save.championBadge = true`
- Flow:
  1. Screen flash + MEW cry sound
  2. "MEW appeared!"
  3. "MEW seems to be holding something..."
  4. ♪ "You received CHAMPION BADGE!"
  5. ♪ "You received PHONE.NUMBER!"  
  6. "MEW looks at you with ancient eyes..."
  7. "...then vanishes."
  8. MEW sprite disappears (like a pickup NPC)
  9. Pokedex registration
  10. Badge added directly to save (no KOSTAS needed for this one)

---

## TASK 23: New Content Detection

### What exists:
- Nothing

### What to build:
- On game boot (after loading save):
  ```typescript
  const save = loadSave();
  const current = {
    pokedex: POKEDEX.length,
    papers: ALL_PAPERS.length,
    blogs: getBlogCount(),
    tms: ALL_TMS.length,
  };
  
  const newContent = {
    pokedex: current.pokedex - (save.lastKnownCounts?.pokedex ?? 0),
    papers: current.papers - (save.lastKnownCounts?.papers ?? 0),
    blogs: current.blogs - (save.lastKnownCounts?.blogs ?? 0),
    tms: current.tms - (save.lastKnownCounts?.tms ?? 0),
  };
  
  const hasNew = Object.values(newContent).some(n => n > 0);
  ```
- If `hasNew`: show message on loading screen: "New discoveries await!"
- Update `save.lastKnownCounts` after notification

---

## TASK 24: New Game / Reset

### What exists:
- Options menu has "CLEAR PROGRESS" → wipes all `gkos:explore:*` keys → reloads

### What to build:
- Already done! The existing CLEAR PROGRESS in Options menu handles this.
- Consider also adding it to HELP screen for discoverability.

---

## TASK 25: Party Pokemon Auto-Register

### What exists:
- Party data in `party.ts` (6 Pokemon with dex numbers)
- Pokedex viewer shows all entries

### What to build:
- On game init (after Oak screen, first spawn):
  ```typescript
  const save = loadSave();
  const partyDexNumbers = PARTY.map(p => p.dexNo);
  for (const num of partyDexNumbers) {
    if (!save.pokedexSeen.includes(num)) {
      save.pokedexSeen.push(num);
    }
  }
  updateSave(save);
  ```
- These show as "seen" in Pokedex (party section), different visual from "caught" (found as overworld encounter)

---

## PART 2: HIDDEN ITEMS — WHAT I NEED FROM YOU

After Task 3 is built, give me coordinates for:

### Easy (rocks) — 2 locations
```
I'll place: TM:GCP, TM:WANDB
Need: 2 rock tile coordinates (one on Route 117, one on Route 111)
```

### Medium (flowers) — 3 locations
```
I'll place: TM:SUPABASE, TM:VERCEL, TWITTER.URL
Need: 3 flower tile coordinates (one in Mauville, one on Route 118, one on Route 118)
```

### Hard (ground between grass) — 3 locations
```
I'll place: TM:REDIS, TM:POSTGRESQL, EMAIL contact
Need: 3 bare-ground-between-grass coordinates (Route 110, Route 118, Route 111)
```

---

## PART 3: WHAT I DO AFTER ALL ENGINE FEATURES ARE READY

See previous TODO doc — full list of content customization tasks.
All NPC placements, dialog writing, Pokemon mapping, sign text, TM definitions,
KOSTAS state machine, Research Log stories, questionnaire questions, sounds, analytics.
