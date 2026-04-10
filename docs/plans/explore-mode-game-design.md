# Explore Mode — Full Game Design Document

> **For the developer:** This document captures every design decision made during brainstorming.
> Use it as the reference while implementing in the `feature/pokemon-explore` worktree.
> The game code already has solid infrastructure (DialogSystem, PickupStore, BagMenu, TrainerCard, etc.) — this doc describes what to BUILD on top of it.

---

## 1. Game Overview

A playable Pokemon Emerald-style world where everything maps to Kostas Georgiou's portfolio:

| Game Concept | Portfolio Mapping |
|---|---|
| Wild Pokemon (overworld) | Projects — talk to register in Pokedex |
| Gym Trainers | PhD papers — talk to collect |
| Route Trainers | Non-PhD papers — talk to collect |
| Overworld NPCs | Blog posts — offer with yes/no prompt |
| Item Balls (visible + hidden) | Contact links (GitHub, LinkedIn, etc.) |
| TMs | Skills/frameworks — earned via step counter |
| Research Logs | Personal stories — unlocked every 5 discoveries |
| Badges | Milestone achievements — earned from KOSTAS |
| Trainer Card | Resume/stats — evolves with progress |

**Map:** 140×120 stitched tiles. Mauville City (center) + Route 117 (west) + Route 118 (east) + Route 110 (south) + Route 111 (north). Bounded on all sides by sea, cliffs, or NPCs.

**No battles.** All interactions are dialog-based. Talk to Pokemon, talk to trainers, talk to NPCs. Collect everything.

---

## 2. First-Time Flow — Professor Oak Intro

Triggered on first load (no save in localStorage). Persisted after completion — never shown again.

```
[Black screen]

OAK: "Hello there! Welcome to the world
      of MACHINE LEARNING!"

OAK: "My name is OAK. People call me
      the ML PROFESSOR."

OAK: "This world is inhabited by creatures
      called PROJECTS."

OAK: "For some people, PROJECTS are tools.
      Others use them for research."

OAK: "First, what is your name?"
     → [Text input field]

OAK: "Right! So your name is [NAME]!"

OAK: "Are you a boy? Or are you a girl?"
     → BOY / GIRL

OAK: "[NAME]! Your very own ML adventure
      is about to unfold!"
     "A world of dreams and discoveries
      with PROJECTS awaits! Let's go!"

[Fade to black → spawn in Mauville City]
```

**Saved to localStorage:** `playerName`, `playerGender`, `firstPlayedAt`

**Second+ visit:** Skip straight to Mauville spawn point.

---

## 3. First Moments in Mauville

Player spawns in Mauville. KOSTAS (rival sprite) stands near the gym entrance.

```
KOSTAS: "Hey! You must be new around here."
        "I'm KOSTAS — the GYM LEADER."

KOSTAS: "Take a look around first."
        "Talk to people. Explore the routes."
        "Collect what you can."

KOSTAS: "When you're ready, come find me
         inside the GYM."

KOSTAS: "Oh — and keep count of your steps."
        "The guy at the MART tracks that."
        "You might earn something."

[KOSTAS walks into gym, takes leader position]
```

After this, KOSTAS is always at the gym leader spot. Regular NPC — walk up, press A, dialog box opens.

---

## 4. Buildings & Interiors

### 4a. GYM — PhD Papers + KOSTAS

**Layout:** Linear path with 6 trainers blocking the way, leading to KOSTAS at the back.

**Trainers (in order):**

| Position | Paper | Venue | Trainer dialog |
|---|---|---|---|
| 1 (near door) | mCL-LC: Aerial Segmentation with Contrastive Learning | WACV 2023 | "I study how to SEGMENT aerial images using CONTRASTIVE LEARNING at multiple levels! Want to read my paper?" → Yes/No |
| 2 | Cross-Scale MAE: Multiscale Remote Sensing | NeurIPS 2023 | "MASKED AUTOENCODERS can work at MULTIPLE SCALES! This paper was accepted at NEURIPS! Want it?" → Yes/No |
| 3 | Multi-Scale RS Fine-Tuning Strategies | IGARSS 2024 | "Fine-tuning SELF-SUPERVISED models for REMOTE SENSING is tricky. I figured out the best strategies! Paper?" → Yes/No |
| 4 | Trustworthy AI for Early Dementia Detection | CHASE 2025 | "Can we make AI TRUSTWORTHY enough to detect DEMENTIA early? I think so. Want to read how?" → Yes/No |
| 5 | MEDiC: CLIP Distillation for Medical Imaging | arXiv 2026 | "I DISTILLED CLIP into a tiny model for MEDICAL imaging. It's called MEDiC! Want the paper?" → Yes/No |
| 6 | ExPLoRe: Long-Range Remote Sensing | ECCV Under Review | "My latest work captures LONG-RANGE dependencies in SATELLITE imagery. Still under review! Interested?" → Yes/No |

**KOSTAS (gym leader):**

See Section 8 (Badge System) for his dynamic dialog.

After completing all gym trainers + getting GYM BADGE, KOSTAS also gives:
- DISSERTATION.PDF (key item, links to actual dissertation when available)

### 4b. Pokemon Center — Nurse Joy + PC

**Nurse Joy (gameplay guide, rotating hints):**

First visit:
```
NURSE: "Welcome to the POKEMON CENTER!"
       "Let me check your team..."
       "..."
       "Your POKEMON are in perfect health!"

NURSE: "Since you're new, some tips:"
       "ARROW KEYS to move."
       "A / ENTER / SPACE to interact."
       "ESC / M to open the MENU."
       "Hold SHIFT to run!"

NURSE: "Talk to everyone — they might
        give you BLOG POSTS or items!"
```

Subsequent visits (rotates through):
```
"Have you checked the TALL GRASS on the routes?"
"I heard rare PROJECTS hide there!"
```
```
"Don't forget the GYM! KOSTAS gives
BADGES when you hit milestones."
```
```
"The PC in the corner has your
SKILL STORAGE. Check it out!"
```
```
"Someone hid a POKEBALL near the
western edge of the map..."
```
```
"The MART keeper tracks your STEPS.
Walk enough and you'll earn TMs!"
```

**PC (Skill Storage):**

Interact with PC:
```
"KOSTAS's PC booted up!"
"Access which?"
→ SKILL STORAGE
→ LOG OFF
```

SKILL STORAGE shows collected TMs in a grid:
```
TM01: PYTHON           ✓ Pre-loaded
TM02: GIT              ✓ Pre-loaded
TM03: LINUX            ✓ Pre-loaded
TM04: REACT            ✓ Found
TM05: DOCKER           ??? (Walk 2000 steps)
TM06: AWS              ??? (Walk 3500 steps)
...
```

Pre-loaded TMs (you start with these):
- TM01: PYTHON — "The foundation. 7 PyPI packages."
- TM02: GIT — "Version control for everything."
- TM03: LINUX — "Essential for any ML engineer."

### 4c. Poke Mart — Step Tracker + Strava Guy

**Step Tracker Guy (TM vendor):**
```
"I count every step trainers take!"
"You've walked [1,247] steps!"

"Milestones:"
"   500 → TM:REACT           ✓"
"  1000 → TM:FASTAPI         ✓"
"  2000 → TM:DOCKER          ▶ 753 more!"
"  3500 → TM:AWS             ✗"
"  5000 → TM:KUBERNETES      ✗"
"  7500 → TM:TERRAFORM       ✗"
" 10000 → TM:SYSTEM DESIGN   ✗"

"Keep walking!"
```

On milestone hit:
```
"♪ [item jingle]"
"You walked [2000] steps!"
"TM:DOCKER added to SKILL STORAGE!"
```

**Strava Guy (fitness NPC, inside Mart):**

Active this week (last activity < 7 days):
```
"KOSTAS never stops training!"
"This week:"
"  [Activity 1 name] — [distance/time]"
"  [Activity 2 name] — [distance/time]"
"  [Activity 3 name] — [distance/time]"

"YTD: [X]km across [N] runs!"
```

Quiet this week (7-30 days since last activity):
```
"KOSTAS hasn't trained this week."
"Must be in CRUNCH MODE on a paper!"
"YTD: [X]km — still impressive."
```

Long break (30+ days):
```
"KOSTAS has been quiet..."
"No workouts for a whole month!"
"Probably writing his DISSERTATION."
```

**Data source:** `/api/strava/recent` (expand to return last 3 activities)

### 4d. Blog Tower (MAUVILLE BROADCAST TOWER)

**Initially locked.** Opens as blog posts are added.

Sign on door:
```
"MAUVILLE BROADCAST TOWER"
"Currently off-air."
"New BLOGGERS arriving soon!"
```

Guard NPC outside:
```
"The tower isn't open yet."
"We're waiting for BLOGGERS to arrive."
"Each floor will feature a different
 BLOG POST from KOSTAS."
"Check back soon!"
```

**When blogs exist:** Each floor = one featured/curated blog. Different floors can have different categories (ML, DevOps, Personal) once enough content exists. Floors open progressively:
- 0 blogs → locked
- 1+ blogs → Floor 1 open
- 3+ blogs → Floors 1-3 open
- etc.

### 4e. Game Corner — Locked

Sign:
```
"GAME CORNER"
"CLOSED FOR RENOVATION"
"Coming soon: HYPERPARAMETER TUNING!"
```

### 4f. Bike Shop — Locked

Sign:
```
"RYDEL'S PIPELINES"
"Fast deployment rigs — OPENING SOON"
```

NPC outside:
```
"Can't wait for the shop to open!"
"GITHUB ACTIONS, DOCKER COMPOSE..."
"All the fastest PIPELINES!"
```

### 4g. Spotify Guy — Outside Game Corner

First visit:
```
"Yo! I'm the DJ of MAUVILLE!"
"I always know what KOSTAS is vibing to."

"Right now he's listening to:"
"♪ [Track Name]"
"  by [Artist]"

"Good taste, right?"

"Oh! I've seen some PROJECTS nearby"
"related to SPOTIFY and MUSIC!"
"Check the GRASS east of town!"

"Come back anytime!"
```

Return visits:
```
"♪ Currently playing:"
"[Track Name] by [Artist]"
```
OR:
```
"♪ Silence right now..."
"KOSTAS must be in deep focus mode."
```

**Data source:** `/api/spotify/now-playing`

---

## 5. Overworld Pokemon (Projects)

**No grass encounters.** All Pokemon are visible overworld sprites. Walk up, press A:

```
[Pokemon cry sound plays]
"A wild [POKEMON NAME] appeared!"
"[Project description]"

"[POKEMON] was registered in your POKeDEX!"
```

Automatic — no yes/no needed. Just the notification.

**Existing overworld Pokemon:**
- Snorlax (Route 111) — blocks path, sleeping
- Slaking + 2 Slakoth (Route 110) — sleeping family
- Poochyena ×10 (Route 117, Magma/Aqua standoff)

**To add:** More overworld Pokemon on routes, each mapping to a project from the Pokedex data. Place them at thematically appropriate locations:
- Water-type projects near water tiles
- Research projects near the gym/Route 111 (academic theme)
- Tool/package projects near the Mart area
- Bot projects near Route 110 (automation theme)

---

## 6. Blog Post NPCs (Overworld)

Blog NPCs are scattered across routes and Mauville. Each offers one blog post:

```
NPC: "Have you read KOSTAS's blog post
      about [TOPIC]?"

NPC: "[Brief description of the post]"

NPC: "Want me to save it to your BAG?"
     → YES / NO

YES: "♪ [item jingle]"
     "Blog post '[TITLE]' was added
      to your BLOG POSTS!"

NO:  "Come back if you change your mind!"
```

**After giving the blog, same NPC adds a hint:**
```
"Oh, by the way..."
"I saw something shiny near the
 [LANDMARK] to the [DIRECTION]."
"Might be worth checking out!"
```

**Number of blog NPCs = number of blog posts.** Data-driven from the content collection. As blogs are added, new NPCs appear on routes.

---

## 7. Non-PhD Paper Trainers (Routes)

Scattered on routes, NOT in the gym. Same yes/no flow as gym trainers:

| Route | Paper | Trainer sprite |
|---|---|---|
| Route 111 | Koopman-Based Transition Detection (IGARSS 2024) | man_1 |
| Route 118 | Occasionally Secure (arXiv 2024) | youngster |
| Route 110 | Teaching Assistant Pseudo-Labels (2025) | school_kid_m |
| Route 117 | Hybrid Girvan-Newman Communities (2019) | old_man or maniac |
| Route 111 | Adding more as published... | ... |

---

## 8. Badge System

**8 badge slots on the Trainer Card. ALL badges given by KOSTAS** at the gym. You complete a milestone → notification → walk to gym → talk to KOSTAS → he gives the badge.

### Badges with tiers:

| # | Badge | Bronze | Silver | Gold |
|---|---|---|---|---|
| 1 | EXPLORER | Visit 3 zones | Visit all 5 zones | All zones + 5000 steps |
| 2 | BLOGGER | Collect 1 blog | Collect 5 blogs | Collect ALL blogs |
| 3 | SCHOLAR | Collect 1 non-PhD paper | Collect 3 papers | Collect ALL non-PhD papers |
| 4 | PHD | Talk to 1 gym trainer | Talk to all 6 gym trainers | Complete gym + KOSTAS |
| 5 | ENGINEER | Collect 3 TMs | Collect 10 TMs | Collect ALL TMs |
| 6 | POKEDEX | Register 10 Pokemon | Register 20 Pokemon | Register ALL Pokemon |
| 7 | GYM | Enter the gym | Beat all trainers | Get DISSERTATION from KOSTAS |
| 8 | CHAMPION | — | — | Find MEW (binary, no tiers) |

**Tier behavior with new content:**
- Bronze never drops
- Gold → Silver when new content is added that you haven't found
- Talk to KOSTAS to learn what's new
- Find the new stuff → Gold restored

### Milestone notification:
```
"♪ [badge jingle]"
"Milestone complete!"
"Visit KOSTAS at the GYM!"
```

### KOSTAS dialog per badge:

**EXPLORER (Gold):**
```
"You've walked every route and
 visited every corner of this world."
"EXPLORER BADGE is yours."
→ "You received EXPLORER BADGE!"
```

**BLOGGER (Gold):**
```
"You read every blog post?"
"Most people just skim headlines."
"That means a lot. BLOGGER BADGE."
→ "You received BLOGGER BADGE!"
```

**SCHOLAR (Gold):**
```
"You tracked down papers outside
 the gym too? Thorough."
"More thorough than my reviewers."
"SCHOLAR BADGE."
→ "You received SCHOLAR BADGE!"
```

**PHD (Gold):**
```
"You've studied all my PhD research."
"That's basically my defense committee."
"PHD BADGE."
→ "You received PHD BADGE!"
```

**ENGINEER (Gold):**
```
"Every skill. Every framework."
"You could work at my lab."
"ENGINEER BADGE."
→ "You received ENGINEER BADGE!"
```

**POKEDEX (Gold):**
```
"All projects registered."
"You've seen more of my work
 than my own advisor."
"POKEDEX BADGE."
→ "You received POKEDEX BADGE!"
```

**GYM (Gold):**
```
"You went through all my research
 and made it to me."
"Take the GYM BADGE."
"And this — my DISSERTATION."
→ "You received GYM BADGE!"
→ "You received DISSERTATION.PDF!"
```

**When nothing new:**
```
"Good to see you."
"Nothing new to report."
"Keep coming back — there's always
 more to discover."
```

**When content updated but player hasn't found new stuff:**
```
"Hey. Things have changed since
 your last visit."
"[N] new PROJECTS appeared."
"[N] new BLOG POSTS are out there."
"Go find them."
"Your [BADGE] dropped to SILVER."
"Bring it back to GOLD."
```

### All 7 non-champion badges earned:
```
"..."
"You did it."
"Every badge. Every paper."
"Every project. Every blog."
"Every skill."

"I don't give this to just anyone."

→ "You received KOSTAS's PHONE NUMBER!"

"If you ever want to talk ML,
 or have an opportunity..."
"Call me. I mean it."
```

---

## 9. Research Log — Loyalty Reward

**Unlocked every 5 NEW discoveries** (projects + blogs + papers combined, lifetime counter).

These are personal stories from KOSTAS that only exist in the game. Not on the portfolio site. The more content you discover over time, the more logs you unlock.

### How it works:
- Each unique discovery increments `totalDiscoveriesSinceStart`
- At 5, 10, 15, 20, 25... a new Research Log unlocks
- Player gets notified: "RESEARCH LOG updated! Visit KOSTAS!"
- KOSTAS tells the story → log saved to menu

### Research Log entries:

```
#1 (5 discoveries): "Why I left Greece for a PhD"
   "I grew up in Halkida. Small town, big dreams.
    Everyone said 'stay, get a safe job.' But I
    couldn't stop thinking about neural networks.
    So I got on a plane to Tennessee."

#2 (10 discoveries): "The NeurIPS rejection"
   "My first NeurIPS submission was desk-rejected.
    Reviews were brutal. I almost quit research.
    But I rewrote everything from scratch.
    Cross-Scale MAE was born from that failure."

#3 (15 discoveries): "Building FleetSmart at 2 AM"
   "Writing my dissertation by day, building
    a maritime AI startup by night. My advisor
    thought I was crazy. 40 enterprise vessels
    later, maybe I was. But it worked."

#4 (20 discoveries): "The day MaskDistill hit 1000 stars"
   "I woke up to 200 GitHub notifications.
    Someone shared it on Hacker News.
    That's when I realized: open source
    isn't just code. It's community."

#5 (25 discoveries): "Why I open-source everything"
   "Every paper, every tool, every package.
    People ask why I don't keep it proprietary.
    Because someone in Greece right now is
    where I was 8 years ago. They need this."

#6+ : Keep adding as content grows...
```

### KOSTAS dialog for Research Log:
```
"You've uncovered [N] things so far."
"That unlocks Research Log #[X]."
""
"Let me tell you something most
 people don't know..."
""
[Story text]
""
"→ Research Log #[X] unlocked!"
```

### When nothing new:
```
"Keep coming back."
"Every 5 new discoveries unlock
 a new RESEARCH LOG."
"The earlier you start, the more
 of my story you'll uncover."
```

---

## 10. Key Items (Contact Links)

Scattered as item balls across the map. Some visible, some hidden (walk over tile + press A).

| Item | Location | Visible? |
|---|---|---|
| RESUME.PDF | Mauville (28,19 offset) | Yes |
| GITHUB.URL | Route 117 (6,68) | Yes |
| LINKEDIN.URL | Route 118 (107,59) | Yes |
| HUGGINGFACE.URL | Route 110 (76,117) | Yes |
| SCHOLAR.URL | Route 111 (69,28) | Yes |
| TWITTER.URL | Hidden — Route 117 near flowers | No |
| EMAIL | Hidden — Route 110 near Cycling Road | No |
| PHONE.NUMBER | Out of bounds — left edge, visible Pokeball | Easter egg |

---

## 11. TM List (Skills/Frameworks)

### Pre-loaded in PC:
| TM# | Skill | Description |
|---|---|---|
| 01 | PYTHON | "The foundation. 7 PyPI packages." |
| 02 | GIT | "Version control for everything." |
| 03 | LINUX | "Essential for any ML engineer." |

### Earned via step counter (at Poke Mart):
| TM# | Skill | Steps needed |
|---|---|---|
| 04 | REACT | 500 |
| 05 | FASTAPI | 1,000 |
| 06 | DOCKER | 2,000 |
| 07 | NEXT.JS | 3,000 |
| 08 | AWS | 3,500 |
| 09 | PYTORCH | 4,000 |
| 10 | KUBERNETES | 5,000 |
| 11 | TERRAFORM | 7,500 |
| 12 | SYSTEM DESIGN | 10,000 |

### Given by route NPCs (after dialog):
| TM# | Skill | Who gives it |
|---|---|---|
| 13 | TAILWIND | NPC near Bike Shop |
| 14 | TYPESCRIPT | NPC in Mauville |
| 15 | POSTGRESQL | NPC on Route 118 |
| 16 | REDIS | NPC on Route 110 |
| 17 | WANDB | NPC on Route 111 |

### Found as hidden items:
| TM# | Skill | Location |
|---|---|---|
| 18 | GCP | Hidden — Route 117 |
| 19 | SUPABASE | Hidden — Mauville |
| 20 | VERCEL | Hidden — Route 118 |

---

## 12. Easter Eggs

### Out-of-bounds NPCs (multiple locations beyond map edges):
```
"..."
"Wait."
"How did you get here?"
"This area doesn't exist."

"You must have modified the code
 or found a boundary glitch."

"I'm genuinely impressed."

"Email kostas@gkos.dev and tell
 him how you did it."

"He loves this kind of thing."
```

### Left edge — visible Pokeball (KOSTAS's phone number):
A Pokeball sprite visible just beyond the western boundary. If someone hacks there:
```
"You found PHONE.NUMBER!"
"KOSTAS's personal phone number!"
"→ [Actual phone number]"
"Tell him you found the easter egg."
```

### Right edge — MEW:
MEW sprite floating over water beyond the eastern boundary.
```
[MEW cry]
"MEW appeared!"
"The rarest find of all."
"MEW was registered in your POKeDEX!"

"♪ [badge jingle]"
"You earned the CHAMPION BADGE!"
```

MEW's Pokedex entry: "The rarest find. Only those who push past every boundary discover what's really possible."

---

## 13. Trainer Card

### Front side:
```
┌──────────────────────────────────────┐
│ TRAINER CARD              ID [DATE]  │
│                          ┌────────┐  │
│ NAME:  [PLAYER NAME]     │ SPRITE │  │
│ TITLE: Applied Scientist │        │  │
│ STEPS: [N]               └────────┘  │
│ PLAY TIME: [H]h [M]m                │
│                                      │
│ BADGES                               │
│ [1][2][3][4][5][6][7][8]            │
│  ★  ★  ★  ☆  ★  ☆  ★  ☆            │
│ (tier shown below each badge)        │
└──────────────────────────────────────┘
```

### Back side (press A to flip):
```
┌──────────────────────────────────────┐
│ RESEARCH LOG           [N] entries   │
│                                      │
│ #1: Why I left Greece...       ✓     │
│ #2: The NeurIPS rejection...   ✓     │
│ #3: Building FleetSmart...     ✓     │
│ #4: ???                              │
│ #5: ???                              │
│                                      │
│ "Every 5 discoveries unlock          │
│  a new entry."                       │
└──────────────────────────────────────┘
```

### Card color (visual tier):
| Stars earned | Color |
|---|---|
| 0-1 badges | Gray |
| 2-4 badges | Green |
| 5-6 badges | Blue |
| 7 badges | Gold |
| 8 (champion) | Red |

---

## 14. NPC Behavior — Hints

Every NPC, after their main interaction (giving blogs, telling stories), drops a hint:

```
"Oh, by the way..."
"I saw something [near LANDMARK]"
"to the [DIRECTION]."
"Might be worth checking out!"
```

Hints point to: hidden items, overworld Pokemon, or other NPCs. Creates a web of breadcrumbs that guides exploration naturally.

---

## 15. New Content Detection

On game boot, compare localStorage against current data:

```typescript
const saved = loadSave();
const current = getCurrentContentCounts(); // from data files

if (current.totalPokedex > saved.lastKnownPokedex ||
    current.totalBlogs > saved.lastKnownBlogs ||
    current.totalPapers > saved.lastKnownPapers) {
  // Trigger OAK phone call
  showNotification("PROFESSOR OAK is calling!");
  // Dialog:
  // "New discoveries have been made!"
  // "[N] new PROJECTS in the wild!"
  // "[N] new BLOG POSTS from trainers!"
  // "Go find them!"
}
```

Gold badges drop to Silver when new content exists that the player hasn't found. KOSTAS tells them specifically what's new (only mentions what they're missing).

---

## 16. Analytics Tracking

Using Umami custom events (from the main site's integration):

```javascript
umami.track('game-start', { name, gender });
umami.track('game-session', { duration, steps });
umami.track('pokedex-register', { pokemon });
umami.track('paper-collected', { paper, source: 'gym'|'route' });
umami.track('blog-collected', { blog });
umami.track('tm-earned', { tm, method: 'steps'|'npc'|'hidden'|'preloaded' });
umami.track('badge-earned', { badge, tier: 'bronze'|'silver'|'gold' });
umami.track('key-item-found', { item });
umami.track('research-log-unlocked', { logNumber });
umami.track('gym-complete');
umami.track('all-badges');
umami.track('easter-egg', { which: 'mew'|'phone'|'oob-npc' });
```

---

## 17. Full Save State

```typescript
interface GameSave {
  // Profile
  playerName: string;
  playerGender: "boy" | "girl";
  firstPlayedAt: string;          // ISO date
  lastPlayedAt: string;

  // Progress
  steps: number;
  playTimeSeconds: number;
  zonesVisited: string[];

  // Collections
  pokedexSeen: number[];
  papersCollected: string[];      // paper slugs
  blogsCollected: string[];       // blog slugs
  tmsCollected: string[];         // TM names
  keyItemsCollected: string[];    // item names

  // Achievements
  badges: Record<string, "bronze" | "silver" | "gold">;

  // Research Log
  totalDiscoveries: number;       // lifetime, never resets
  researchLogsUnlocked: number;   // = floor(totalDiscoveries / 5)

  // State tracking
  pickupsConsumed: string[];      // NPC IDs of used item balls
  npcsTalkedTo: string[];         // all NPCs ever spoken to
  gymTrainersCompleted: string[]; // gym trainers given papers

  // Content versioning
  lastKnownPokedexCount: number;
  lastKnownBlogCount: number;
  lastKnownPaperCount: number;
  lastKnownTMCount: number;
}
```

Persisted in localStorage under `gkos:explore:save`.

---

## 18. Sound Effects Needed

| Sound | Usage | Source |
|---|---|---|
| Badge earned jingle | Milestone notification + badge award | OG Pokemon badge SFX |
| Pokedex registration ding | Wild Pokemon registered | OG Pokedex SFX |
| Item received jingle | Already have: `se_itemget.ogg` | Existing |
| Step milestone ding | TM earned at Mart | Reuse item jingle |
| Phone ring | OAK calling (new content) | Need new / OG PokeNav |
| MEW cry | Easter egg encounter | OG MEW cry |
| Research Log unlock | New log available | Soft chime / reuse badge |
| Select / confirm / cancel | Already have: `se_select.ogg`, `se_cancel.ogg` | Existing |

---

## 19. Map Boundary Checklist

Verify all edges are impassable:
- [ ] North edge of Route 111 — cliffs/mountains
- [ ] South edge of Route 110 — water/cliffs
- [ ] West edge of Route 117 — water/buildings
- [ ] East edge of Route 118 — water
- [ ] All building walls solid
- [ ] No walkable tiles at map edges (0, 0) through (139, 119)

Easter egg items (Pokeball + MEW) placed JUST beyond the boundary — visible but unreachable without hacking.

---

## 20. Implementation Priority

### Phase 1 — Core game loop (do first):
1. Professor Oak intro (name, gender, localStorage)
2. Step counter (increment on tile move, persist)
3. Badge system (milestone detection, KOSTAS dialog, Trainer Card integration)
4. Yes/No prompt for blog NPCs and paper trainers
5. Overworld Pokemon registration (walk up → Pokedex)
6. KOSTAS as regular NPC with dynamic dialog

### Phase 2 — Buildings:
7. Pokemon Center interior (Nurse hints, PC skill storage)
8. Poke Mart interior (step tracker TMs, Strava guy)
9. Blog Tower (locked initially, opens with content)

### Phase 3 — Polish:
10. Research Log system
11. New content detection (OAK phone call)
12. NPC hint system
13. Badge tier system (Gold → Silver on new content)
14. Trainer Card visual tiers (card color)

### Phase 4 — Easter eggs:
15. Out-of-bounds NPCs
16. MEW + CHAMPION BADGE
17. Phone number Pokeball
18. Analytics tracking (Umami events)
