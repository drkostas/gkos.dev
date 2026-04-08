# Concept 08b: The Pokemon World (Expanded)

**Status:** Design Concept (Expanded from 08)  
**Date:** 2026-04-08  
**Builds on:** `08-pokemon.md` — read that first for base concept

---

## Core Evolution: Dual-Mode Portfolio

The key insight: **two ways to experience the portfolio.**

### Mode 1: Normal Mode (Menu-First)
- Traditional clean portfolio navigation via the Pokemon Start menu
- Opens instantly, content readable in seconds
- Recruiter-friendly — no gameplay required
- Clean dark UI with pixel art aesthetic touches (fonts, borders, transitions)

### Mode 2: Explore Mode (Gameplay)
- Top-down Pokemon world you walk around in
- Buildings = portfolio sections (enter to view content)
- NPCs = your content (projects, papers, blogs) as living entities
- Toggle between modes at any time

**The menu works everywhere.** Even while exploring, pressing Start opens the full navigation. You're never trapped in the game.

---

## The Living World

### The Map Layout

```
┌─────────────────────────────────────────────────────┐
│                    GKOS TOWN                         │
│                                                      │
│    ┌──────────┐         ┌──────────┐                │
│    │ RESEARCH │         │ PROJECTS │                │
│    │   LAB    │         │  CENTER  │                │
│    │ (Papers) │         │(Products)│                │
│    └────┬─────┘         └────┬─────┘                │
│         │                    │                       │
│    ═════╧════════════════════╧═══════                │
│    ║          MAIN ROAD              ║               │
│    ═════╤════════════════════╤═══════                │
│         │                    │                       │
│    ┌────┴─────┐         ┌────┴─────┐                │
│    │  BLOG    │         │  HOME    │                │
│    │  CAFE    │         │  (Your   │                │
│    │(Articles)│         │   House) │                │
│    └──────────┘         └──────────┘                │
│                                                      │
│         ┌──────────┐    ┌──────────┐                │
│         │ TRAINING │    │  POKEMON │                │
│         │  GYM     │    │  CENTER  │                │
│         │(Resume/  │    │(Contact/ │                │
│         │ Skills)  │    │  Links)  │                │
│         └──────────┘    └──────────┘                │
│                                                      │
│    🌳🌳   🌿   🌳🌳   💧  🌳   🌿🌿  🌳          │
│    Route 1 → (Easter eggs, hidden areas)             │
└─────────────────────────────────────────────────────┘
```

### Buildings as Pages

| Building | Page | What's Inside |
|----------|------|---------------|
| **Your House** | Home / About | Your bedroom/office. Trainer Card on the wall (resume summary). Photo on desk. Walk around your personal space |
| **Projects Center** | Projects | A gallery/exhibition hall. Each project displayed as a poster/exhibit. Walk up to one → dialog shows description + Demo/Code links |
| **Research Lab** | Papers | Professor Oak-style lab. Bookshelves with papers. Computer terminals showing citations. Talk to professor NPCs |
| **Blog Cafe** | Blog | A cozy cafe. Each table has a blog post topic. Talk to the "author" (NPC you) sitting at a table to read a post |
| **Training Gym** | Resume / Skills | A Pokemon gym with badge displays. Each badge = a skill/technology. Gym leader = your experience timeline |
| **Pokemon Center** | Contact / Links | Nurse Joy desk = contact form. PC terminal = social links. Healing machine = newsletter signup |

---

## NPCs as Content (The Big Idea)

Everything in your portfolio becomes a living entity in the world.

### Pokemon = Your Projects

Each project in your portfolio auto-generates a Pokemon that roams the world.

```
┌─────────────────────────────────────────────────┐
│ PROJECTS CENTER (Interior)                       │
│                                                  │
│   🔬 MEDiC          ⚓ FleetSmart     📊 ShiftMD │
│    (Dragon/         (Water/          (Normal/    │
│     Psychic)         Steel)           Fighting)  │
│    Lv.85            Lv.72            Lv.68       │
│                                                  │
│        🧪 MaskDistill    💰 XpensAI              │
│         (Psychic/         (Electric/             │
│          Dark)             Normal)               │
│         Lv.84             Lv.75                  │
│                                                  │
│   🏃 Soma           🔬 CrossScale-MAE           │
│    (Fighting/        (Dragon/                    │
│     Fairy)            Flying)                    │
│    Lv.65             Lv.54                       │
│                                                  │
│  [KOSTAS sprite standing near entrance]          │
└─────────────────────────────────────────────────┘
```

**Talking to a Project Pokemon:**
```
┌─────────────────────────────────────┐
│                                     │
│  �Pokemon sprite: MEDiC             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Wild MEDiC appeared!            │ │
│ │                                 │ │
│ │ "Multi-objective Exploration    │ │
│ │  of Distillation from CLIP"    │ │
│ │                                 │ │
│ │ Type: PyTorch / Self-Supervised │ │
│ │ Level: 85 (citations)          │ │
│ │ HP: ████████████░░ 85.07%      │ │
│ │     (ImageNet-1K accuracy)     │ │
│ │                                 │ │
│ │  ┌──────┐  ┌──────┐  ┌──────┐ │ │
│ │  │ Code │  │ Demo │  │Paper │ │ │
│ │  └──────┘  └──────┘  └──────┘ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Project → Pokemon Mapping:**

| Project | Pokemon Type | Level = | HP Bar = | Sprite Inspiration |
|---------|-------------|---------|----------|-------------------|
| MEDiC | Dragon/Psychic | Citations | Accuracy (85.07%) | Mewtwo-like (distillation = cloning) |
| MaskDistill | Psychic/Dark | Citations | Finetune acc (84.8%) | Alakazam-like (masking = psychic) |
| FleetSmart.ai | Water/Steel | Users/revenue | Uptime | Lapras-like (maritime/vessel) |
| ShiftMD | Normal/Fighting | Users | Schedule fill rate | Machamp-like (scheduling = juggling) |
| XpensAI | Electric/Normal | Customers (30+) | OCR accuracy (95%) | Porygon-like (AI/digital) |
| Soma | Fighting/Fairy | Data points | Activity score | Hitmonchan-like (fitness) |
| Cross-Scale MAE | Dragon/Flying | 54 citations | NeurIPS venue | Dragonite-like (cross-scale = flying) |
| Minecraft AI | Ghost/Normal | Stars (243) | Maze solve rate | Gengar-like (game AI) |

**Auto-generation:** When you add a new project to the data file, a new Pokemon automatically appears in the world. Type and level derived from project metadata.

### Blog Posts = Townspeople (Regular NPCs)

Each blog post is a regular NPC (human character) that walks around Blog Cafe.

```
┌─────────────────────────────────────┐
│ BLOG CAFE (Interior)                │
│                                     │
│  ☕ ☕ ☕                             │
│  Table 1: "Understanding LLM Evals" │
│    👤 NPC sitting, speech bubble    │
│                                     │
│  Table 2: "Building FleetSmart"     │
│    👤 NPC reading newspaper         │
│                                     │
│  Table 3: "My PhD Journey"          │
│    👤 NPC with coffee               │
│                                     │
│  [Walk up to any NPC]               │
│  → Dialog: post title + summary     │
│  → "Read full post?" [Yes] [No]     │
│  → Opens clean blog reader view     │
└─────────────────────────────────────┘
```

- **NPC appearance:** Could vary by blog category (technical = lab coat, career = suit, tutorial = casual)
- **Speech bubble preview:** Shows the first line of the post when nearby
- **Reading:** Selecting "Yes" transitions to a clean, full-width blog reader (not pixel art — normal typography for readability)

### Papers = Professors / Scientists

Each publication is a professor/scientist NPC in the Research Lab.

```
┌─────────────────────────────────────┐
│ RESEARCH LAB (Interior)             │
│                                     │
│  🔬 🧪 📚                           │
│                                     │
│  👨‍🔬 Prof. CrossScale              │
│     "NeurIPS 2023 — 54 citations"   │
│     Wearing: NeurIPS badge          │
│                                     │
│  👩‍🔬 Prof. MEDiC                    │
│     "arXiv preprint — 2026"         │
│     Wearing: arXiv badge            │
│                                     │
│  👨‍🏫 Prof. ExPLoRe                  │
│     "ECCV 2026 — Under Review"      │
│     Wearing: ECCV badge             │
│                                     │
│  [Talk to professor]                │
│  → Paper title, venue, abstract     │
│  → "View PDF?" / "View Code?"      │
└─────────────────────────────────────┘
```

- **Badge/outfit** varies by venue tier (NeurIPS = gold coat, IGARSS = green, arXiv = gray)
- **Citation count** displayed like a level
- **Talking** shows abstract + links to PDF/Code

### Skills = Gym Badges

The Training Gym displays your skills as collectible gym badges.

```
┌─────────────────────────────────────┐
│ TRAINING GYM                        │
│                                     │
│  BADGE CASE:                        │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │ 🐍 │ │ 🔥 │ │ ☁️ │ │ 🐳 │      │
│  │Pyth│ │PyTo│ │ GCP│ │Dock│      │
│  │ on │ │rch │ │    │ │ er │      │
│  └────┘ └────┘ └────┘ └────┘      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │ 🤗 │ │ ⚡ │ │ 🧠 │ │ 📊 │      │
│  │ HF │ │Fast│ │ LLM│ │Next│      │
│  │    │ │API │ │    │ │.js │      │
│  └────┘ └────┘ └────┘ └────┘      │
│                                     │
│  GYM LEADER: [Kostas sprite]        │
│  "I've collected these badges over  │
│   8+ years of ML engineering..."    │
│                                     │
│  [View full experience timeline →]  │
└─────────────────────────────────────┘
```

---

## The Trainer Card (Resume/About)

Found on the wall in Your House. Classic Pokemon Trainer Card format.

```
┌─────────────────────────────────────────────┐
│            T R A I N E R   C A R D          │
│─────────────────────────────────────────────│
│                                              │
│  ┌──────────┐  Name: KOSTAS GEORGIOU       │
│  │          │  Class: ML ENGINEER           │
│  │  [Photo] │  Region: Greece → US          │
│  │          │  ID: PhD-2026                 │
│  └──────────┘  Money: 8+ yrs experience     │
│                                              │
│  BADGES: 🐍 🔥 ☁️ 🐳 🤗 ⚡ 🧠 📊         │
│                                              │
│  POKEDEX:                                   │
│    Pokemon Seen:  15  (projects total)      │
│    Pokemon Owned: 6   (deployed/live)       │
│                                              │
│  HALL OF FAME:                              │
│    🏆 Amazon Applied Scientist L5           │
│    🏆 NeurIPS 2023 Publication              │
│    🏆 8,300+ GitHub Followers               │
│    🏆 102+ Paper Citations                  │
│                                              │
│  ADVENTURE STARTED: 2017                    │
│  LAST SAVE: April 2026                      │
└─────────────────────────────────────────────┘
```

---

## Pokedex = Project Portfolio

Browsable from the menu. Each project has a Pokedex entry.

```
┌─────────────────────────────────────────────┐
│  P O K E D E X                   #001      │
│─────────────────────────────────────────────│
│                                              │
│  ┌──────────────┐  FLEETSMART.AI            │
│  │              │  Type: WATER / STEEL      │
│  │   [Project   │  Height: 976 tests        │
│  │    sprite]   │  Weight: 281 E2E tests    │
│  │              │                            │
│  └──────────────┘  "AI-powered fleet mgmt   │
│                     platform for vessel      │
│                     tracking, compliance     │
│                     monitoring, and ops      │
│                     analytics."              │
│                                              │
│  STATS:                                     │
│  HP     ████████████████░░░░  80%           │
│  ATK    ██████████████░░░░░░  70% (users)   │
│  DEF    ████████████████████  100% (uptime) │
│  SP.ATK ████████████░░░░░░░░  60% (AI acc)  │
│  SP.DEF ██████████████████░░  90% (security)│
│  SPD    ████████████████░░░░  80% (perf)    │
│                                              │
│  ABILITIES:                                 │
│  - FastAPI  - Next.js  - GCP  - LLM        │
│                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ Live │  │ Code │  │ Demo │              │
│  └──────┘  └──────┘  └──────┘              │
│                                              │
│  ◄ #000 MEDiC          ShiftMD #002 ►      │
└─────────────────────────────────────────────┘
```

**Stats mapping:**
- **HP** = project maturity / completion %
- **ATK** = user count / impact
- **DEF** = test coverage / reliability
- **SP.ATK** = AI/ML accuracy metrics
- **SP.DEF** = security / uptime
- **SPD** = performance benchmarks

Stats auto-derived from project metadata where possible.

---

## Normal Mode vs Explore Mode

### Normal Mode (Default for recruiter-first)
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ◆ GKOS.DEV          Home  Projects  Blog  Papers   │    │
│  │                                      Resume  ⚙️ 🎮  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│    ┌─────────────────────────────────────────────────┐      │
│    │ Konstantinos Georgiou                           │      │
│    │ Machine Learning Engineer                       │      │
│    │                                                 │      │
│    │ PhD ML Engineer with 8+ years building          │      │
│    │ production ML systems...                        │      │
│    │                                                 │      │
│    │ [Resume]  [Contact]  [🎮 Explore World]         │      │
│    └─────────────────────────────────────────────────┘      │
│                                                              │
│    Featured Pokemon (Projects)                               │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│    │ MEDiC    │ │FleetSmart│ │ ShiftMD  │ │ XpensAI  │     │
│    │ Lv.85   │ │ Lv.72   │ │ Lv.68   │ │ Lv.75   │     │
│    │ Dragon/  │ │ Water/   │ │ Normal/  │ │Electric/ │     │
│    │ Psychic  │ │ Steel    │ │ Fighting │ │ Normal   │     │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│                                                              │
│    Latest Transmissions (Blog)                               │
│    ┌─────────────────────────────────────────────────┐      │
│    │ 📝 Understanding LLM Eval...     Apr 2026      │      │
│    │ 📝 Building FleetSmart from...   Mar 2026      │      │
│    │ 📝 My PhD Defense Journey...     Apr 2026      │      │
│    └─────────────────────────────────────────────────┘      │
│                                                              │
│    [🎮 Enter Explore Mode — walk around GKOS Town]          │
└─────────────────────────────────────────────────────────────┘
```

- Clean, professional, pixel-art-inspired but NOT a game
- Pixel art border accents, Pokemon-style font for headings
- Sans-serif for body text (readable)
- The 🎮 button toggles to Explore Mode
- Projects shown as "Pokemon cards" with types and levels
- Everything accessible without playing

### Explore Mode (Toggle with 🎮)
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─ GKOS TOWN ──────────────────────── [START] [📋 Menu] ─┐│
│  │                                                          ││
│  │  🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳          ││
│  │  🌳                                            🌳        ││
│  │  🌳   ┌──────────┐      ┌──────────┐          🌳        ││
│  │  🌳   │ RESEARCH │      │ PROJECTS │          🌳        ││
│  │  🌳   │   LAB    │      │  CENTER  │          🌳        ││
│  │  🌳   └────┬─────┘      └────┬─────┘          🌳        ││
│  │  🌳        │                  │                🌳        ││
│  │  🌳   ═════╧══════════════════╧══════          🌳        ││
│  │  🌳                                            🌳        ││
│  │  🌳     🐉(MEDiC)    ⚓(FleetSmart)           🌳        ││
│  │  🌳                                            🌳        ││
│  │  🌳          👤 ← YOU ARE HERE                 🌳        ││
│  │  🌳                                            🌳        ││
│  │  🌳     👤(Blog NPC)   👨‍🔬(Prof. CrossScale)  🌳        ││
│  │  🌳                                            🌳        ││
│  │  🌳   ┌──────────┐      ┌──────────┐          🌳        ││
│  │  🌳   │  BLOG    │      │   HOME   │          🌳        ││
│  │  🌳   │  CAFE    │      │  (House) │          🌳        ││
│  │  🌳   └──────────┘      └──────────┘          🌳        ││
│  │  🌳                                            🌳        ││
│  │  🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳          ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Use WASD or Arrow Keys to move. Press ENTER to interact. ││
│  │ Press START or ESC for menu. Press M for map.            ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Interaction Flow Examples

### Talking to a Project Pokemon
```
1. Walk near MEDiC sprite → "!" bubble appears
2. Press ENTER →
   ┌─────────────────────────────────────┐
   │ Wild MEDiC appeared!                │
   │                                     │
   │ "Multi-objective Exploration of     │
   │  Distillation from CLIP"           │
   │                                     │
   │ PyTorch | Self-Supervised | CLIP    │
   │ Level 85 | HP: 85.07% accuracy     │
   │                                     │
   │ What would you like to do?          │
   │  ► View Code (GitHub)              │
   │    View Demo (HuggingFace)         │
   │    Read Paper (arXiv)              │
   │    View in Pokedex                 │
   │    Run away                        │
   └─────────────────────────────────────┘
3. Select "View Code" → opens GitHub in new tab
4. Select "View in Pokedex" → shows full Pokedex entry
5. Select "Run away" → dialog closes, back to walking
```

### Entering a Building
```
1. Walk to Research Lab door → "Press ENTER to enter"
2. Press ENTER → screen transition (fade to black)
3. Interior loads — pixel art lab with professor NPCs
4. Walk around inside, talk to professors (= papers)
5. Walk to door → "Press ENTER to exit" → back outside
```

### Opening the Start Menu
```
Press START or ESC anywhere:

┌──────────────────┐
│    S T A R T     │
│──────────────────│
│ ► POKeDEX       │  (Projects browser)
│   POKeMON       │  (Current team/featured)
│   BAG           │  (Skills/Tools)
│   TRAINER CARD  │  (Resume/About)
│   SAVE          │  (Download CV)
│   OPTION        │  (Settings/Theme)
│   EXIT          │  (Normal Mode)
└──────────────────┘
```

---

## Mobile Adaptation

### Mobile Explore Mode
- Virtual D-pad overlay (bottom-left) + A/B buttons (bottom-right)
- Smaller viewport but same pixel art (actually looks MORE authentic on a small screen — like a real GBA)
- Touch to interact with NPCs/buildings instead of ENTER

### Mobile Normal Mode
- Standard mobile portfolio layout
- Pokemon card-style project cards
- No pixel art gameplay, just the aesthetic

---

## Auto-Generation Rules

When content is added to the data files, the world updates automatically:

| Content Added | World Effect |
|---------------|-------------|
| New project in `projects.json` | New Pokemon sprite appears in Projects Center. Type auto-derived from tags. Level from stars/citations |
| New blog post in `content/blog/` | New NPC appears in Blog Cafe. Outfit based on category |
| New paper in `papers.json` | New professor NPC in Research Lab. Badge color from venue |
| New skill tag | New gym badge in Training Gym |
| New experience entry | Updated Trainer Card |

---

## Technical Architecture

### Astro Integration
```
src/
  components/
    game/
      GameCanvas.tsx        # Main Phaser/PixiJS game (client:load island)
      StartMenu.tsx         # Pokemon-style menu (client:load)
      Dialog.tsx            # Text dialog system
      Pokedex.tsx           # Project browser
      TrainerCard.tsx       # Resume view
      MiniMap.tsx           # Town overview
    normal/
      Navbar.astro          # Normal mode nav
      ProjectCard.astro     # Pokemon-card styled project
      BlogList.astro        # Blog listing
      PaperList.astro       # Papers listing
  layouts/
    GameLayout.astro        # Explore mode wrapper
    NormalLayout.astro      # Normal mode wrapper
  pages/
    index.astro             # Mode toggle + content
    projects.astro          # Normal mode projects
    blog/
      index.astro
      [slug].astro
    papers.astro
    resume.astro
    contact.astro
  data/
    projects.json           # Source of truth → auto-generates Pokemon
    papers.json             # Source of truth → auto-generates professors
    world-config.json       # Map layout, building positions, NPC routes
  assets/
    sprites/                # Character, Pokemon, NPC sprites
    tilesets/               # Map tiles (grass, buildings, paths)
    audio/                  # Pokemon-style SFX (optional)
```

### Game Engine Options
1. **Phaser 3** — Full 2D game engine, tilemap support, physics, input handling. Most capable but heaviest (~300KB)
2. **PixiJS** — Lightweight 2D renderer. Need to build game logic manually but much lighter (~150KB)
3. **Custom Canvas** — Lightest but most work. Full control. Good for simple tile-based movement
4. **RPG Maker Web** — Generates the game, embed as iframe. Easiest but least customizable

**Recommendation:** Phaser 3 as a client:load island. It handles tilemaps, sprite animation, input, and dialog natively. The rest of the site (normal mode) is pure Astro with zero JS.

### Sprite Requirements
- **Player character:** 4-direction walking animation (up/down/left/right × 3 frames each = 12 frames)
- **Project Pokemon:** 1 idle sprite each (~15 sprites). Could use PixelMe AI or commission pixel artist
- **Blog NPCs:** 3-4 generic human sprites with color palette swaps per category
- **Professor NPCs:** 2-3 professor sprites with color swaps per venue tier
- **Building exteriors:** 6 building tiles
- **Building interiors:** 6 room layouts with furniture
- **Tileset:** Grass, path, water, trees, flowers (standard RPG Maker-compatible tileset works)

### Performance Budget
- **Normal mode:** 0 KB JS (pure Astro SSG)
- **Explore mode:** ~300KB (Phaser) + ~200KB (sprites/tilesets) + ~50KB (game logic) = ~550KB
- **Loaded on demand:** Phaser only loads when user clicks "🎮 Explore Mode"
- **First meaningful paint:** <1s in normal mode, <3s in explore mode

---

## Effort Estimate

| Phase | Task | Days |
|-------|------|------|
| 1 | Normal mode portfolio (Astro, all pages, responsive) | 10-12 |
| 2 | Pokemon aesthetic (pixel fonts, card styles, trainer card) | 3-4 |
| 3 | Game engine setup (Phaser, tilemap, character movement) | 5-7 |
| 4 | World building (map, buildings, interiors, NPCs) | 7-10 |
| 5 | Content integration (auto-generate Pokemon from data) | 3-4 |
| 6 | Dialog system + menu system | 4-5 |
| 7 | Sprite creation/commissioning | 3-5 |
| 8 | Mobile controls + responsive game canvas | 3-4 |
| 9 | Blog MDX setup + blog reader mode | 5-7 |
| 10 | Polish, testing, easter eggs | 3-5 |
| **Total** | | **~46-63 days** |

### MVP (Shippable in ~20 days)
- Normal mode fully functional (all pages)
- Pokemon card aesthetic for projects
- Trainer Card resume
- Single room explore mode (your house/office)
- Basic movement + object interaction
- Start menu working
- 3-4 project Pokemon in the room

### Full Version (~50+ days)
- Full town with 6 buildings
- All project Pokemon auto-generated
- Blog NPCs, professor NPCs
- Building interiors
- Pokedex browser
- Gym badges for skills
- Sound effects
- Easter eggs
- Mobile virtual d-pad

---

## Pros
- **Extremely memorable** — no one has a Pokemon-style portfolio
- **Dual-mode solves the recruiter problem** — normal mode is instant, game mode is for explorers
- **Auto-generation** means content updates are effortless — add a project, get a Pokemon
- **The metaphor maps perfectly** to portfolio content (Pokemon = projects, Pokedex = portfolio browser, badges = skills, trainer card = resume)
- **Spiritual successor** to the VSCode portfolio — same "themed interactive experience" energy, new concept
- **Shareable** — "check out this guy's portfolio, it's a Pokemon game" will spread on HN/Twitter
- **Deep enough to explore** — easter eggs, hidden routes, fun interactions for tech peers

## Cons
- **High effort** — 46-63 days is significant
- **Sprite creation** — need pixel art assets (commission or AI-generate)
- **Game engine adds weight** — Phaser is ~300KB (only in explore mode though)
- **Accessibility** — game mode is inherently less accessible. Normal mode must be the default
- **Maintenance** — game logic adds complexity to an otherwise simple static site
- **Might seem juvenile** to some hiring managers (mitigated by having professional normal mode)
- **Mobile game controls** are never as good as desktop
