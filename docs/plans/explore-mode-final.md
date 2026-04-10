# Explore Mode — Final Design (v3)

> Consolidated from game-design.md, placement-map.md, dialogs.md, and issues-v2.md.
> This is the SINGLE SOURCE OF TRUTH. Previous docs are superseded.

---

## 1. Core Concept

A playable Pokemon Emerald-style world. Everything maps to Kostas's portfolio:

| Game | Portfolio |
|---|---|
| Wild Pokemon (overworld) | Projects — walk up to register in Pokedex |
| Gym trainers | PhD papers — mandatory, auto-collected |
| Route trainers | Non-PhD papers — optional, yes/no prompt |
| Overworld NPCs | Blog posts — optional, yes/no prompt |
| Item balls (visible + hidden) | Contact links |
| TMs | Skills/frameworks — earned via steps + exploration |
| Research Logs | Personal stories — unlocked every 5 discoveries |
| Badges (8) | Milestone achievements |
| KOSTAS (gym leader) | Smart guide + badge giver |

**No battles.** All interactions are dialog-based.
**Map:** 140×120 stitched tiles. Mauville City + 4 routes.
**Bounded by:** Snorlax (north), Slaking (south), Magma/Aqua (west), sea (east).

---

## 2. The 8 Badges (binary — earned or not)

| Slot | Badge | Requirement | Typical order | Given by |
|---|---|---|---|---|
| 1 | **GYM** | Collect all 6 gym PhD papers + talk to KOSTAS | 1st (~9 min) | KOSTAS |
| 2 | **PUBLICATION** | Collect ALL 10 papers (6 gym + 4 route) | 2nd (~23 min) | KOSTAS |
| 3 | **CONNECTED** | Find all 7 key items (5 visible + 2 hidden) | 3rd (~28 min) | KOSTAS |
| 4 | **POKEDEX** | Register all 30 Pokemon | 4th (~35 min) | KOSTAS |
| 5 | **BLOGGER** | Collect all blog posts (1 at launch) | 5th (varies) | KOSTAS |
| 6 | **ENGINEER** | Collect all 20 TMs | 6th (~50+ min) | KOSTAS |
| 7 | **COMPLETIONIST** | Opened every URL (papers, blogs, projects, items) | 7th (last) | KOSTAS |
| 8 | **CHAMPION** | Found MEW beyond the eastern boundary | Secret | MEW directly |

**Badges don't have tiers.** Binary: earned or not. When new content is added, badges are NOT revoked. OAK calls to notify about new content, KOSTAS tells you what's new, the objectives checklist updates — but your earned badges stay.

**CHAMPION badge → phone number story.** See §12.

---

## 3. Loading Screen — Professor Oak Onboarding

The loading screen IS the onboarding. No separate Oak intro scene.

### First-time player:

**While assets load (progress 0-100%), Oak teaches the game:**
```
[~10%] "Hello there! Welcome to KOSTAS's world!"
[~25%] "This isn't just a game — it's a living portfolio."
[~40%] "PROJECTS are POKEMON. Walk up to them to register them."
[~55%] "TRAINERS carry RESEARCH PAPERS. People share BLOG POSTS."
[~70%] "SKILLS are hidden as TMs. Walk more to earn them at the MART!"
[~85%] "Collect everything and visit the GYM LEADER for BADGES."
[100%] "The world is ready!"
```

**After loading — profile setup:**
```
"What is your name?" → [text input]
"Are you a boy or girl?" → [BOY / GIRL]
"[NAME]! Your adventure begins!"
→ "Press any key to start!"
```

Controls visible at bottom throughout:
`Arrows Move · Shift Run · A/Enter Interact · S/Backspace Back · Esc/M Menu`

### Returning player:
```
[Progress bar fills]
"Welcome back, [NAME]!"
[If new content:] "New discoveries await! [N] new PROJECTS since your last visit!"
→ "Press any key to continue!"
```

### Mobile detection:
If touch device or viewport < 768px:
```
"Explore Mode requires a keyboard."
"Visit gkos.dev/explore on desktop to play!"
"Or browse the normal portfolio above ↑"
```
No Phaser boot. Just the message.

---

## 4. Gym — PhD Papers (mandatory)

### Layout (10×21 interior):
```
     0123456789
  2| ####.K####   K = KOSTAS
  4| ###.6..###   6 = ExPLoRe (ECCV)
  6| ####.5####   5 = MEDiC (arXiv 2026)
  9| ..4...#...   4 = Trustworthy AI (CHASE 2025)
 13| .3.....###   3 = Multi-Scale RS (IGARSS 2024)
 16| .2........   2 = Cross-Scale MAE (NeurIPS 2023)
 19| ##..1...##   1 = mCL-LC (WACV 2023)
 20| ##.....G##   G = Gym Guide
```

### Flow:
- Trainers BLOCK the path. You MUST talk to each one.
- Papers are AUTO-COLLECTED (no yes/no). "Take this paper!" → ♪ added to PAPERS.
- Trainer steps aside after giving paper.
- Linear gauntlet from entrance to KOSTAS.

### Gym trainers:
| Pos | Paper | Venue | Speaker |
|---|---|---|---|
| (3,19) | mCL-LC: Aerial Segmentation | WACV 2023 | RESEARCHER ANNA |
| (1,16) | Cross-Scale MAE | NeurIPS 2023 | RESEARCHER BLAKE |
| (1,13) | Multi-Scale RS Fine-Tuning | IGARSS 2024 | RESEARCHER CHEN |
| (2,9) | Trustworthy AI for Dementia | CHASE 2025 | RESEARCHER DIANA |
| (5,6) | MEDiC: CLIP Distillation | arXiv 2026 | RESEARCHER EMMA |
| (4,4) | ExPLoRe: Long-Range RS | ECCV Under Review | RESEARCHER FRANK |

### KOSTAS gym completion dialog:
```
"You made it through my research."
"6 papers. 5 venues."
"Take the GYM BADGE."
→ ♪ "You received GYM BADGE!"
"And my DISSERTATION."
→ ♪ "You received DISSERTATION.PDF!"
""
"But there are 4 more papers on the routes."
"Researchers outside the gym have work"
"beyond my PhD."
""
"And there's much more to discover."
"PROJECTS in the grass. BLOG POSTS"
"from the people. SKILLS hidden"
"across the map."
""
"Come back when you've found something."
"I'll be here."
```

---

## 5. KOSTAS — Smart Guide State Machine

Every time player talks to KOSTAS, he checks state in priority order:

```
1. Has unclaimed badge?
   → Give the FIRST ready badge (one per visit)
   → Badge-specific dialog (see §5a)

2. Close to a badge (>80%)?
   → "You're almost there! [N] more [items] for [BADGE]."
   → Points to specific locations/routes

3. New content since last visit?
   → "Things changed. [N] new PROJECTS. [N] new BLOGS."
   → "Go find them."

4. Research Log milestone?
   → Tells personal story, unlocks log entry

5. Has CHAMPION badge? (first time seeing it)
   → MEW emotional story → gives phone number (see §12)

6. General guidance (nothing else applies)
   → Checks lowest completion % across all categories
   → Gives specific directions to the area with most missing content
   → Example: "Route 111 still has PROJECTS you haven't seen."
   → Example: "You've walked 3,200 steps. 800 more for the next TM."

7. Everything complete
   → "You're up to date. Come back when there's more to discover."
```

### §5a — Badge-specific dialog:

**GYM:** (given during gym completion, see §4)

**PUBLICATION:** "All 10 papers. Gym and routes. You know my research better than most of my colleagues. PUBLICATION BADGE."

**CONNECTED:** "GitHub, LinkedIn, Scholar, HuggingFace, Resume... You found every way to reach me. CONNECTED BADGE. Now you have no excuse not to say hello."

**POKEDEX:** "Every single project. Registered. You've seen more of my work than my own advisor. POKEDEX BADGE."

**BLOGGER:** "You read every blog post? Most people just skim headlines. That means a lot. BLOGGER BADGE."

**ENGINEER:** "Every skill. Every framework. Python, PyTorch, Docker, Kubernetes... You could join my team tomorrow. ENGINEER BADGE."

**COMPLETIONIST:** "You didn't just collect. You OPENED everything. Every paper, every blog, every project link. You actually engaged with my work. That's rare. COMPLETIONIST BADGE."

---

## 6. Buildings

### Pokemon Center (14×9)
| Pos | NPC | Role |
|---|---|---|
| (7,2) | Nurse Joy | Gameplay hints (rotating). "Your Pokemon are healthy!" + tips |
| (1,2) | PC | Skill Storage — view collected TMs in grid |
| (11,4) | Strava Nerd | Last 3 activities + YTD stats (live from /api/strava) |
| (2,7) | Youngster | "Check the Pokedex! Walk through grass to find projects!" |

**Nurse Joy rotating hints:**
1. "Have you checked the TALL GRASS on routes?"
2. "The GYM LEADER gives BADGES for milestones!"
3. "The PC in the corner has SKILL STORAGE."
4. "The MART keeper tracks STEPS for TMs!"
5. "Try pressing A on empty ground. HIDDEN ITEMS exist!"

### Poke Mart (11×8)
| Pos | NPC | Role |
|---|---|---|
| (1,3) | Clerk | PyPI packages showcase with download counts |
| (5,5) | Step Tracker | Step count + TM milestones (see §7) |
| (2,6) | Developer | Flavor + "Check Route 118 for deployment projects!" |

### Blog Tower (locked at launch)
Sign: "MAUVILLE BROADCAST TOWER — Currently off-air."
Guard NPC: "We're waiting for BLOGGERS. Check back soon!"
Opens floor-by-floor as featured blogs are added later.

### Game Corner — locked
Sign: "GAME CORNER — CLOSED FOR RENOVATION"

### Bike Shop — locked
Sign: "RYDEL'S PIPELINES — OPENING SOON"

---

## 7. TMs — 20 Skills

### Pre-loaded in PC (3):
| TM | Skill |
|---|---|
| 01 | PYTHON |
| 02 | GIT |
| 03 | LINUX |

### Step milestones at Mart (9):
| Steps | TM | Skill |
|---|---|---|
| 250 | 04 | TAILWIND |
| 500 | 05 | FASTAPI |
| 1,000 | 06 | NEXT.JS |
| 1,500 | 07 | DOCKER |
| 2,000 | 08 | PYTORCH |
| 3,000 | 09 | AWS |
| 4,000 | 10 | KUBERNETES |
| 6,000 | 11 | TERRAFORM |
| 8,000 | 12 | SYSTEM DESIGN |

### Visible item balls (2):
| Coord | TM |
|---|---|
| (67,67) Mauville | REACT |
| (82,67) Mauville | TYPESCRIPT |

### Hidden ground items (4):
| Coord | TM |
|---|---|
| (58,58) Mauville | SUPABASE |
| (8,64) Route 117 | GCP |
| (120,57) Route 118 | VERCEL |
| (62,95) Route 110 | REDIS |

### NPC-given (2):
| Route | TM | NPC |
|---|---|---|
| Route 111 | WANDB | NPC near rocks |
| Route 118 | POSTGRESQL | NPC near water |

---

## 8. Key Items (7)

| Item | Location | Type |
|---|---|---|
| RESUME.PDF | Mauville (78,69) | Visible item ball |
| GITHUB.URL | Route 117 (6,68) | Visible item ball |
| LINKEDIN.URL | Route 118 (107,59) | Visible item ball |
| HUGGINGFACE.URL | Route 110 (76,117) | Visible item ball |
| SCHOLAR.URL | Route 111 (69,28) | Visible item ball |
| TWITTER.URL | Route 118 (95,55) | Hidden |
| EMAIL | Route 111 (63,5) | Hidden |

---

## 9. Papers (10)

### Gym (6, mandatory, auto-collected):
1. mCL-LC (WACV 2023)
2. Cross-Scale MAE (NeurIPS 2023)
3. Multi-Scale RS Fine-Tuning (IGARSS 2024)
4. Trustworthy AI for Dementia (CHASE 2025)
5. MEDiC (arXiv 2026)
6. ExPLoRe (ECCV Under Review)

### Routes (4, optional, yes/no):
| Route | Paper | Coord | Trainer |
|---|---|---|---|
| 117 | Hybrid Girvan-Newman (2019) | (25,58) | VETERAN GEORGE |
| 118 | Occasionally Secure (arXiv 2024) | (97,57) | HACKER YUKI |
| 111 | Teaching Asst Pseudo-Labels (2025) | (62,40) | TUTOR MARCUS |
| 110 | Koopman Transition (IGARSS 2024) | (62,82) | ENGINEER SARAH |

---

## 10. Pokemon / Pokedex (30)

### Auto-seen (6, Party menu):
MEDiC (Latias), FleetSmart (Kyogre), MaskDistill (Absol), XpensAI (Manectric), ShiftMD (Breloom), Soma (Medicham)

### Overworld encounters (24):
| # | Name | Species | Location |
|---|---|---|---|
| 7 | Cross-Scale MAE | Salamence | Route 111 (65,15) |
| 8 | HGG in RS | Camerupt | Route 111 (65,42) |
| 9 | 3D Fused LSGAN | Banette | Route 117 (25,63) |
| 10 | ACUTE | Glalie | Route 111 (58,15) |
| 11 | Cloud-DevOps | Swellow | Mauville (85,59) |
| 12 | YAML Configs | Seviper | Route 117 (40,51) |
| 13 | Termcolor | Torkoal | Route 117 (30,50) |
| 14 | Cross-Fetch | Wailord | Route 118 (128,58) |
| 15 | ElasticDB | Aggron | Route 111 (60,33) |
| 16 | CloudStore | Pelipper | Route 118 (93,60) |
| 17 | MySQL Wrapper | Lairon | Mart interior (8,5) |
| 18 | Email Sender | Delcatty | Pokecenter interior (10,5) |
| 19 | Accident Bot | Mawile | Route 110 (65,109) |
| 20 | Insta Bot | Sableye | Route 110 (70,110) |
| 21 | Onoma Bot | Shedinja | Route 110 (75,111) |
| 22 | HF Datasets | Flygon | Route 118 (110,56) |
| 23 | Py Template | Trapinch | Route 117 (20,55) |
| 24 | DSE 512 | Solrock | Route 111 (62,28) |
| 25 | Colorized KNN | Claydol | Route 111 (58,38) |
| 26 | RL Grid World | Plusle | Mauville (76,59) |
| 27 | Stereo Depth | Vibrava | Route 118 (100,60) |
| 28 | iOS MovieDB | Volbeat | Route 110 (63,95) |
| 29 | Eye in the Sky | Altaria | Route 111 (58,5) |
| 30 | Face Detector | Kirlia | Mauville (55,58) |

### Encounter flow:
```
[Screen flash 0.2s white]
[Generic encounter sound]
"[SPECIES] noticed you!"
"[Project description line 1]"
"[Project description line 2]"
→ ♪ "[SPECIES] registered in POKéDEX!"
```
Automatic — no yes/no. Quick and satisfying.

### Special overworld Pokemon (boundary blockers):
- Snorlax (68,9) — blocks north. Registers in Pokedex on talk.
- Slaking (59,110) + Slakoth ×2 (59,109 and 59,111) — block south. Each registers.
- Poochyena ×10 (Magma/Aqua standoff) — each registers as same single Pokedex entry.

### MEW — secret, out of bounds (139,59):
Not counted in the 30. Hidden Pokedex entry (#0 or #999).
Gives CHAMPION BADGE directly when interacted with.

---

## 11. Blog NPCs

Blog NPCs are in the overworld (routes + city). Each offers one blog post:

```
NPC: "Have you read KOSTAS's blog about [TOPIC]?"
NPC: "[Brief description]."
NPC: "Want me to save it to your BAG?"
→ YES: ♪ "Blog '[TITLE]' added to BLOG POSTS!"
→ NO: "Come back if you change your mind!"
[After giving blog, NPC adds a hint about nearby content]
```

**At launch (1 blog):** One blog NPC in Mauville gives the launch blog post ("Why I built a Pokemon game for my portfolio"). Other blog NPCs say: "I'm working on a story... not ready yet! Come back soon!"

**Blog NPC positions:**
| # | Location | Coord |
|---|---|---|
| 1 | Mauville (launch blog) | (68,56) |
| 2 | Mauville | (67,64) |
| 3 | Route 117 | (33,56) |
| 4 | Route 117 | (30,66) |
| 5 | Route 118 | (97,62) |
| 6 | Route 118 | (105,65) |
| 7 | Route 111 | (60,18) |
| 8 | Route 110 | (60,89) |
| 9 | Route 110 | (66,87) |
| 10 | Route 110 | (63,100) |

NPCs 2-10 show "coming soon" dialog until their blog exists.

---

## 12. The MEW Story — Phone Number

### Finding MEW (out of bounds, east edge at 139,59):
```
[Screen flash]
[MEW cry sound]

"A wild MEW appeared!"
""
"MEW seems to be holding"
"something..."
""
→ ♪ "You received CHAMPION BADGE!"
""
"MEW looks at you with"
"ancient eyes..."
""
"...then vanishes."
```

### Talking to KOSTAS with Champion badge:
```
KOSTAS: "..."
""
"Wait."
"Where did you get that badge?"
""
"..."
""
"That badge belonged to a friend"
"of mine. From a long time ago."
""
"He gave it to his pet —"
"a rare creature nobody else"
"had ever seen."
""
"When he moved away,"
"the creature disappeared."
"I thought that badge was"
"lost forever."
""
"..."
""
"The fact that you found it..."
"After all this time..."
""
"Thank you."
"I mean that."
""
→ ♪ "KOSTAS gave you his phone number."
""
"Call me. Anytime."
"Not just about ML."
"About anything."
""
"Some things matter more"
"than papers and projects."
```

### Subsequent visits after phone number:
```
"Still exploring?"
""
"That badge you found..."
"It means more to me than"
"all the GYM BADGES combined."
""
"Thank you for being here."
```

---

## 13. Research Log

Unlocked every 5 NEW discoveries (projects + blogs + papers + TMs + items combined).
Lifetime counter, never resets. Early players accumulate more logs over time.

```
#1 (5 discoveries):   "Why I left Greece for a PhD"
#2 (10 discoveries):  "The NeurIPS rejection"
#3 (15 discoveries):  "Building FleetSmart at 2 AM"
#4 (20 discoveries):  "The day MaskDistill hit 1000 stars"
#5 (25 discoveries):  "Why I open-source everything"
#6 (30 discoveries):  "Defending the PhD"
#7 (35 discoveries):  "The Amazon interview"
#8 (40 discoveries):  "What's next"
```

KOSTAS tells the story when milestone is ready (Priority 4 in state machine).

---

## 14. Live NPCs (API-powered)

| NPC | Location | API | What they show |
|---|---|---|---|
| Spotify Guy | Mauville (57,57) | /api/spotify/now-playing | Current/last track |
| Strava Nerd | Pokecenter (11,4) | /api/strava/recent | Last 3 activities + YTD |
| Day Care Man | Route 117 (37,54) | /api/stats/github | Commits this week + most active repo |
| Step Tracker | Mart (5,5) | localStorage | Step count + TM milestones |
| Clerk | Mart (1,3) | /api/stats/pypi | Package download counts |

Pattern: NPC handler does `fetch()` → formats response → passes to DialogSystem.

---

## 15. Bag (4 pockets)

| Pocket | Contents | Source |
|---|---|---|
| PAPERS | 10 papers | Gym (auto) + route (yes/no) |
| BLOG POSTS | N blog posts | NPCs (yes/no) |
| KEY ITEMS | 7 contacts + DISSERTATION | Item balls + KOSTAS |
| TMs | 20 skills | PC + steps + hidden + NPCs |

Empty pocket messages:
- PAPERS: "Visit the GYM to collect research papers!"
- BLOG POSTS: "Talk to people — they have stories to share!"
- KEY ITEMS: "Explore the world and press A everywhere!"
- TMs: "Walk more! Check the MART for milestones."

Items with URLs: select → "USE" → confirmation → opens in new tab.

---

## 16. Trainer Card

### Front:
```
┌──────────────────────────────────────┐
│ TRAINER CARD              ID [DATE]  │
│                          ┌────────┐  │
│ NAME:  [PLAYER NAME]     │ SPRITE │  │
│ STEPS: [N]               │        │  │
│ PLAY TIME: [H]h [M]m     └────────┘  │
│                                      │
│ BADGES                               │
│ [1][2][3][4][5][6][7][8]            │
└──────────────────────────────────────┘
```

Card background color: Gray (0-1) → Green (2-3) → Blue (4-5) → Gold (6-7) → Red (8)

### Back (flip with A):
```
┌──────────────────────────────────────┐
│ PROGRESS                             │
│                                      │
│ ■ Papers .............. 6/10         │
│ ■ Blog Posts .......... 1/1          │
│ ■ Pokemon ............. 18/30        │
│ ■ TMs ................. 8/20         │
│ ■ Key Items ........... 4/7          │
│ ■ URLs Opened ......... 12/48        │
│                                      │
│ RESEARCH LOG ............ #3         │
│ BADGES .................. 3/8        │
└──────────────────────────────────────┘
```

---

## 17. New Content Detection

On game boot, compare localStorage counts against current data:
```
if (current.pokedex > saved.lastKnown.pokedex ||
    current.blogs > saved.lastKnown.blogs || ...)
  → OAK notification on loading screen
  → KOSTAS has updated guidance
```

Badges are NOT revoked. Progress checklist updates. KOSTAS tells you what's new.

---

## 18. Save State

Single localStorage key: `gkos:explore:save`

```typescript
interface GameSave {
  playerName: string;
  playerGender: "boy" | "girl";
  firstPlayedAt: string;
  lastPlayedAt: string;
  steps: number;
  playTimeSeconds: number;
  zonesVisited: string[];
  pokedexSeen: number[];
  papersCollected: string[];
  blogsCollected: string[];
  tmsCollected: string[];
  keyItemsCollected: string[];
  urlsOpened: string[];          // for COMPLETIONIST badge
  badges: string[];              // earned badge IDs
  totalDiscoveries: number;
  researchLogsUnlocked: number;
  pickupsConsumed: string[];
  gymTrainersCleared: string[];
  gymComplete: boolean;
  championBadge: boolean;
  phoneNumberReceived: boolean;
  lastKnownCounts: { pokedex: number; papers: number; blogs: number; tms: number; };
  lastPosition: { x: number; y: number; facing: string } | null;
}
```

---

## 19. Easter Eggs

### Out-of-bounds NPCs (beyond map edges):
```
"..." / "How did you get here?"
"This area doesn't exist."
"Email kostas@gkos.dev and tell him how."
```

### MEW (139,59) — see §12

### Phone number Pokeball (3,58 — west edge, visible but unreachable):
If hacked to: gives KOSTAS's phone number directly (alternate path to §12 reward).

---

## 20. Sound Effects Needed

**Must have:** encounter_ding.ogg, badge_jingle.ogg, phone_ring.ogg (OAK notification)
**Should have:** gym_music.ogg, pokecenter_music.ogg, mart_music.ogg
**Nice to have:** research_log.ogg, mew_cry.ogg

---

## 21. Analytics (Umami)

```javascript
umami.track('game-start', { name, gender });
umami.track('game-session', { duration, steps });
umami.track('pokedex-register', { pokemon });
umami.track('paper-collected', { paper, source: 'gym'|'route' });
umami.track('blog-collected', { blog });
umami.track('tm-earned', { tm, method });
umami.track('badge-earned', { badge });
umami.track('url-opened', { type, id });
umami.track('research-log', { number });
umami.track('champion-badge');
umami.track('phone-number-received');
umami.track('easter-egg', { which });
```

---

## 22. Implementation Priority

### Phase 1 — Core loop:
1. Oak loading screen (tutorial text + name/gender + mobile detection)
2. Unified GameSave manager
3. Step counter (Grid Engine hook)
4. Badge system (binary, milestone detection, notification)
5. KOSTAS state machine (priorities 1-7)
6. Gym papers auto-collect (mandatory, trainers block path)
7. Route papers yes/no
8. Bag restructure (4 pockets)

### Phase 2 — Content:
9. Blog NPC system (yes/no, "coming soon" for empty slots)
10. Overworld Pokemon registration (screen flash + sound)
11. Hidden items (A-press on current tile)
12. TM step milestones at Mart
13. PC Skill Storage view
14. Objectives on Trainer Card back

### Phase 3 — Live data:
15. Strava nerd (async fetch)
16. Spotify guy (async fetch)
17. Day Care Man (GitHub commits)
18. Clerk (PyPI stats)
19. Research Log system

### Phase 4 — Polish:
20. COMPLETIONIST badge (URL open tracking)
21. MEW + Champion badge + phone number story
22. Out-of-bounds easter egg NPCs
23. Sound effects
24. Interior music
25. Analytics tracking
26. New content detection (OAK call)
