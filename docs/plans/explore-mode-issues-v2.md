# Explore Mode — Issues & Revisions (v2)

> Comprehensive analysis of gaps, UX issues, and design fixes.
> Updates the game-design.md, placement-map.md, and dialogs.md docs.

---

## REVISED BADGE SYSTEM (8 badges, no overlap)

| # | Badge | Requirement | When earned |
|---|---|---|---|
| 1 | **GYM** | Complete the gym (all 6 trainers + KOSTAS) | First gym visit |
| 2 | **PUBLICATION** | Collect ALL 10 papers (6 gym + 4 route) | After exploring routes |
| 3 | **POKEDEX** | Register all Pokemon | After finding all overworld Pokemon |
| 4 | **BLOGGER** | Collect all blog posts | After talking to all blog NPCs |
| 5 | **ENGINEER** | Collect all TMs | After walking enough + finding hidden ones |
| 6 | **EXPLORER** | Visit all 5 zones | After walking into each zone |
| 7 | **CONNECTED** | Find all key items + contacts | After finding hidden + visible items |
| 8 | **CHAMPION** | Find MEW beyond the eastern boundary | Easter egg (hackers only) |

**Key fix:** GYM and PUBLICATION are naturally separated. GYM requires completing the gym (6 mandatory papers auto-collected). PUBLICATION requires also finding 4 optional route papers. Player ALWAYS gets GYM first, then comes back later for PUBLICATION.

---

## REVISED GYM FLOW (mandatory paper collection)

Trainers **block the path** and give papers **automatically** (no yes/no):

```
TRAINER: [tells you about their paper, 2-3 dialog boxes]
TRAINER: "Take this paper — you'll need it!"
→ "♪ Paper '[TITLE]' added to PAPERS!"
[Trainer steps aside, path opens]
```

This makes the gym a LINEAR GAUNTLET — you must collect all 6 to reach KOSTAS. Matches OG Pokemon gym flow where you must battle every trainer.

**Route papers remain optional (yes/no prompt).** Player explores routes, finds trainers, can accept or skip.

**KOSTAS's gym completion dialog now directs the player:**
```
"You made it through my research."
"Take the GYM BADGE."
→ "♪ You received GYM BADGE!"
"And my DISSERTATION."
→ "♪ You received DISSERTATION.PDF!"
""
"But there are 4 more papers out there."
"Researchers on the ROUTES have work"
"outside my PhD."
"Find them all for the PUBLICATION BADGE."
""
"And there's much more to discover..."
"PROJECTS in the grass. BLOG POSTS"
"from the people. SKILLS hidden"
"across the map."
""
"Come back when you've found something."
```

This naturally sends the player to explore routes after the gym.

---

## REVISED LOADING SCREEN — PROFESSOR OAK ONBOARDING

The loading screen is a unified onboarding experience. No separate Oak intro scene.

### First-time player flow:

**Phase 1: Loading (progress 0-100%)**

Oak's tutorial text auto-advances alongside the progress bar:

```
[progress ~10%]
"Hello there!"
"Welcome to KOSTAS's world!"

[progress ~25%]
"This isn't just a game —"
"it's a living portfolio."

[progress ~40%]
"PROJECTS are POKEMON."
"Walk up to them to register"
"them in your POKEDEX."

[progress ~55%]
"TRAINERS carry RESEARCH PAPERS."
"People in town share BLOG POSTS."

[progress ~70%]
"SKILLS are hidden as TMs."
"The more you walk, the more"
"you earn at the MART!"

[progress ~85%]
"Collect everything and visit"
"the GYM LEADER to earn"
"BADGES on your TRAINER CARD."

[progress 100%]
"The world is ready!"
```

Controls bar visible at bottom throughout: `Arrows Move · Shift Run · A/Enter Interact · S/Esc Back · Esc/M Menu`

**Phase 2: Profile setup (after loading completes)**

```
"Before we begin..."
"What is your name?"
→ [Text input field]

"Are you a boy or girl?"
→ [BOY] [GIRL]

"[NAME]! Your adventure begins!"
""
→ "Press any key to start!"
[Music begins → screen fades → game starts]
```

### Returning player flow:

```
[Progress bar fills]
"Welcome back, [NAME]!"
"Your adventure continues..."

[If new content detected:]
"New discoveries await!"
"[N] new PROJECTS and [N] new"
"BLOG POSTS since your last visit!"

[progress 100%]
→ "Press any key to continue!"
[Music begins → screen fades → game resumes at saved position]
```

No name/gender input, no tutorial. Straight to gameplay.

---

## CRITICAL ISSUES — FIXES

### 1. First-time guidance
**Fix:** Oak handles ALL onboarding on the loading screen. No KOSTAS cutscene needed. Rich Boy NPC at (74,60) — nearest to spawn — says: "Hey! You're new! The GYM is to the west! Explore first!" as a backup if player missed the loading screen text.

### 2. Blog NPCs with no content
**Fix:** At launch (0 blogs), blog NPCs say:
```
"I'm working on a story for you..."
"It's not ready yet."
"Come back soon — it'll be worth it!"
```
When blogs are added, their dialog updates to offer the blog (yes/no).

### 3. Mobile detection
**Fix:** GameLoadingScreen detects touch device or viewport < 768px:
```
"Explore Mode requires a keyboard."
""
"Visit gkos.dev/explore on your"
"desktop computer to play!"
""
"Or browse the normal portfolio"
"using the links above ↑"
```
No game boot, no Phaser load. Just the message.

### 4. Bag restructure
**Fix:** 4 pockets replacing the current 5:

| Pocket | Contents | Source |
|---|---|---|
| PAPERS | 10 papers (6 gym + 4 route) | Gym trainers (auto) + route trainers (yes/no) |
| BLOG POSTS | N blog posts | Overworld NPCs (yes/no) |
| KEY ITEMS | 7-8 contacts + DISSERTATION | Item balls (visible + hidden) + KOSTAS |
| TMs | 20 skills | PC pre-loaded + steps + hidden + NPC-given |

Empty pockets show contextual hints:
- PAPERS: "Visit the GYM to collect research papers!"
- BLOG POSTS: "Talk to people — they have stories to share!"
- KEY ITEMS: "Explore the world and press A everywhere!"
- TMs: "Walk more! Check the MART for milestones."

### 5. Unified GameSave
**Fix:** Single manager, single localStorage key `gkos:explore:save`:

```typescript
interface GameSave {
  // Profile
  playerName: string;
  playerGender: "boy" | "girl";
  firstPlayedAt: string;
  lastPlayedAt: string;
  
  // Progress
  steps: number;
  playTimeSeconds: number;
  zonesVisited: string[];
  
  // Collections (arrays of slugs/IDs)
  pokedexSeen: number[];
  papersCollected: string[];
  blogsCollected: string[];
  tmsCollected: string[];
  keyItemsCollected: string[];
  
  // Badges
  badges: Record<string, "bronze" | "silver" | "gold">;
  
  // Research Log
  totalDiscoveries: number;
  researchLogsUnlocked: number;
  
  // State
  pickupsConsumed: string[];
  gymTrainersCleared: string[];
  gymComplete: boolean;
  
  // Content versioning
  lastKnownCounts: {
    pokedex: number;
    papers: number;
    blogs: number;
    tms: number;
  };
  
  // Player position (for resume)
  lastPosition: { x: number; y: number; facing: string } | null;
}
```

Migrates existing PickupStore data on first load.

### 6. Objectives on Trainer Card back
**Fix:** Flip the card → see:
```
┌──────────────────────────────────────┐
│ PROGRESS                    [NAME]   │
│                                      │
│ ■ Papers .............. 6/10         │
│ ■ Blog Posts .......... 0/0          │
│ ■ Pokemon ............. 12/31        │
│ ■ TMs ................. 5/20         │
│ ■ Key Items ........... 3/7          │
│                                      │
│ RESEARCH LOG .............. #3       │
│ "Every 5 discoveries unlock          │
│  a new entry."                       │
│                                      │
│ BADGES  ★★☆☆☆☆☆☆  (2/8)            │
└──────────────────────────────────────┘
```

---

## IMPORTANT ISSUES — FIXES

### 7. Pokedex registration mapping (all 31)

| # | Name | Species | Registration method |
|---|---|---|---|
| 1 | MEDiC | Latias | Party (auto-seen on menu open) |
| 2 | FleetSmart.ai | Kyogre | Party (auto-seen) |
| 3 | ShiftMD | Breloom | Overworld Route 110 (63,85) |
| 4 | XpensAI | Manectric | Overworld Route 110 (62,75) |
| 5 | MaskDistill | Absol | Party (auto-seen) |
| 6 | Soma | Medicham | Party (auto-seen) |
| 7 | Cross-Scale MAE | Salamence | Overworld Route 111 (65,15) |
| 8 | HGG in RS | Camerupt | Overworld Route 111 (65,42) |
| 9 | 3D Fused LSGAN | Banette | Overworld Route 117 (25,63) |
| 10 | ACUTE | Glalie | Overworld Route 111 (58,15) |
| 11 | Cloud-DevOps | Swellow | Overworld Mauville (85,59) |
| 12 | YAML Configs | Seviper | Overworld Route 117 (40,51) |
| 13 | Termcolor | Torkoal | Overworld Route 117 (30,50) |
| 14 | Cross-Fetch | Wailord | Overworld Route 118 near water (128,58) |
| 15 | ElasticDB | Aggron | Overworld Route 111 (60,33) |
| 16 | CloudStore | Pelipper | Overworld Route 118 (93,60) |
| 17 | MySQL Wrapper | Lairon | Overworld Mart interior (8,5) |
| 18 | Email Sender | Delcatty | Overworld Pokecenter interior (10,5) |
| 19 | Accident Bot | Mawile | Overworld Route 110 (65,109) |
| 20 | Insta Bot | Sableye | Overworld Route 110 (70,110) |
| 21 | Onoma Bot | Shedinja | Overworld Route 110 (75,111) |
| 22 | HF Datasets | Flygon | Overworld Route 118 (110,56) |
| 23 | Py Template | Trapinch | Overworld Route 117 (30,50) |
| 24 | DSE 512 | Solrock | Overworld Route 111 (60,33) |
| 25 | Colorized KNN | Claydol | Overworld Route 111 (62,28) |
| 26 | RL Grid World | Plusle | Overworld Mauville (76,59) |
| 27 | Stereo Depth | Vibrava | Overworld Route 118 (100,60) |
| 28 | iOS MovieDB | Volbeat | Overworld Route 110 (63,95) |
| 29 | Eye in the Sky | Altaria | Overworld Route 111 (58,5) |
| 30 | Face Detector | Kirlia | Overworld Mauville (55,58) |
| 31 | Portfolio v2 | Blaziken | Given by KOSTAS at 100% completion |

**6 auto-seen (party) + 24 overworld + 1 special = 31 total.**
Party Pokemon are marked "seen" (not "caught") when the player first opens the Party menu. Caught = found as overworld encounter.

### 8. KOSTAS dialog state machine

Priority order when player talks to KOSTAS:
```
1. First gym visit? → Gym completion dialog (GYM badge + DISSERTATION)
2. Unclaimed badge ready? → Give FIRST unclaimed badge (one per visit)
3. Research Log milestone? → Tell story, unlock log
4. New content detected? → Tell player what's new, mention Silver badges
5. All 7 non-champion badges at Gold? → Give phone number (one-time)
6. Fallback → "Nothing new. Keep exploring. Come back later."
```

### 9. Hidden items priority
```
On A-press:
1. Check tile player is FACING → NPC there? → talk
2. Check tile player is FACING → Sign there? → read
3. Check tile player is STANDING ON → hidden item? → pickup
4. Nothing → no action
```

### 10. Step milestones (rebalanced)
```
   250 → TM:REACT        (earned during Mauville exploration)
   500 → TM:FASTAPI      (earned entering first route)
  1000 → TM:NEXT.JS      (one route explored)
  1500 → TM:DOCKER       (two routes explored)
  2000 → TM:PYTORCH      (most routes explored)
  3000 → TM:AWS           (thorough first playthrough)
  4000 → TM:KUBERNETES    (completionist territory)
  6000 → TM:TERRAFORM     (dedicated explorer)
  8000 → TM:SYSTEM DESIGN (multi-session achievement)
```

First TM at 250 steps = ~2-3 minutes of walking. Instant gratification.

### 11. Sound effects needed (prioritized)
```
MUST HAVE (launch blockers):
- encounter_ding.ogg — wild Pokemon encounter (generic for all)
- badge_jingle.ogg — badge earned
- phone_ring.ogg — OAK notification

SHOULD HAVE:
- gym_music.ogg — gym interior BGM
- pokecenter_music.ogg — Pokemon Center BGM
- mart_music.ogg — Mart BGM

NICE TO HAVE:
- research_log.ogg — special log unlock chime
- mew_cry.ogg — MEW easter egg
- step_milestone.ogg — could reuse badge_jingle at lower volume
```

### 12. Live API NPCs — async pattern
```typescript
// In InteriorScene NPC handler:
async function handleStravaGuy() {
  dialogSystem.showDialog(["Loading fitness data..."]);
  try {
    const res = await fetch("/api/strava/recent");
    const data = await res.json();
    const lines = formatStravaDialog(data);
    dialogSystem.showDialog(lines);
  } catch {
    dialogSystem.showDialog(["Can't reach the fitness tracker right now."]);
  }
}
```

---

## FULL REVISED PLAYER JOURNEY (25-30 min)

```
0:00  Loading screen + Oak tutorial text
1:00  Name/gender input → "Press any key!"
1:30  Spawn Mauville (72,58). Zone popup.
2:00  Walk around. Rich Boy: "GYM to the west! Explore first!"
3:00  Enter Pokemon Center. Nurse gives tips. Access PC (3 TMs).
4:00  Enter Mart. Step tracker shows 150 steps. Clerk shows PyPI stats.
5:00  Pick up TM:REACT item ball (67,67). Bag has 4 TMs now.
5:30  "♪ 250 steps! TM:REACT earned!" (from step counter, redundant but confirms)
6:00  Talk to Spotify guy. "KOSTAS is listening to..."
6:30  Enter Gym. Guide explains. Walk up to Trainer 1.
7:00  Trainer 1 → paper auto-collected. Steps aside.
7:30  Trainers 2-6 → all papers collected. Reach KOSTAS.
9:00  KOSTAS → GYM BADGE + DISSERTATION + "Go find 4 more papers on routes."
9:30  Exit gym. "♪ 500 steps! TM:FASTAPI earned!"
10:00 Head south → Route 110. Zone popup. First overworld Pokemon!
10:30 "♪ BRELOOM noticed you! Registered in POKéDEX!" 
11:00 Blog NPC: "Want this blog post?" → YES → collected!
12:00 Koopman paper trainer → "Want the paper?" → YES
13:00 Continue south. Find more Pokemon. Hit Slaking barrier.
14:00 Walk back, head west → Route 117. Day Care Man (GitHub stats).
15:00 Hybrid Girvan-Newman trainer → paper collected.
16:00 Hit Magma/Aqua barrier. Explore grass. More Pokemon.
17:00 Walk back, head east → Route 118. Spotify-related Pokemon.
18:00 Occasionally Secure trainer → paper collected.
19:00 Head north → Route 111. Academic-themed NPCs.
20:00 Teaching Assistant trainer → paper collected. All 4 route papers!
20:30 "♪ PUBLICATION Badge milestone! Visit KOSTAS!"
21:00 Walk back to gym → KOSTAS gives PUBLICATION badge.
22:00 Continue exploring. Find hidden items (press A on ground).
23:00 "♪ EXPLORER Badge!" (visited all 5 zones)
24:00 Back to KOSTAS → EXPLORER badge.
25:00 Check Trainer Card: 3 badges earned. 18/31 Pokemon. 7/20 TMs.
25:30 Player decides: keep exploring or come back later.
```

**Total: ~25 min for a focused playthrough with 3 badges.**
**Full completion: ~45-60 min across multiple sessions.**
