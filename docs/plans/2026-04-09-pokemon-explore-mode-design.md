# Pokemon Explore Mode — Design Document

**Date:** 2026-04-09
**Branch:** feature/pokemon-explore
**Status:** Design approved, ready for implementation planning

---

## Overview

A playable Pokemon Emerald-style top-down RPG world embedded in the portfolio as an "Explore Mode." Toggle via a gamepad button from the normal portfolio. The game uses original Pokemon Emerald assets (tilesets, sprites, maps) from the pret/pokeemerald decompilation project.

The visitor plays as KOSTAS, walking through a modified Mauville City and surrounding routes. Portfolio content is mapped to game entities: projects are Pokemon, papers are trainers, blog posts are NPCs, skills are gym badges, and the Start Menu mirrors the portfolio structure.

## Tech Stack

- **Game engine:** Phaser 3 (v3.90) — loaded on demand via React island (`client:only="react"`)
- **Movement:** Grid Engine plugin (`grid-engine` npm) — pixel-perfect grid-locked movement, pathfinding, NPC AI
- **Map editor:** Tiled — exports JSON that Phaser loads natively
- **Assets:** Extracted from pret/pokeemerald (tilesets, sprites, maps, collision data)
- **UI overlays:** React components on top of Phaser canvas (dialogs, menus, HTML modals)
- **Integration:** Astro React island, DOM event bridge between Phaser and Astro/React

## Game Area

### Mauville City (40x20 tiles)

The hub. All 7 buildings are present. Gym, Pokemon Center, Mart, and Houses are enterable. Bike Shop and Game Corner are locked with in-universe excuses.

Primary tileset: `gTileset_General`
Secondary tileset: `gTileset_Mauville`

### Route 117 (west)

Extends toward Verdanturf Town. Contains tall grass with ML project Pokemon, non-PhD paper scientist NPCs, and the Day Care (flavor only). Blocked before Verdanturf by a Snorlax.

### Route 110 (south, partial)

Start of the route heading south. Contains tall grass with Fun/Misc project Pokemon. Blocked before Cycling Road ("Closed for repairs!").

### Route 118 (east, partial)

Short stretch to the beach. Contains tall grass with PyPI project Pokemon. Blocked by water ("You need SURF!").

## Entity Mapping

### Pokemon = Projects (31 now, growing)

Every project in the portfolio is a Pokemon. They roam in tall grass on routes and a few walk visibly in the city center.

| Route | Category | Pokemon Types | Count |
|-------|----------|---------------|-------|
| Route 117 (west) | ML Projects | Psychic, Dragon | 17 |
| Route 110 (south) | Fun Projects | Normal, Fire, Ghost | 7 |
| Route 118 (east) | PyPI Packages | Electric, Steel | 7 |
| City center | Featured | Mixed | 3-4 visible |

- Type auto-derived from project tags
- Level derived from stars, citations, or maturity metric
- HP bar could represent test coverage, accuracy, uptime, etc.
- Walking into tall grass triggers "Wild [PROJECT] appeared!" encounter
- Encounter screen shows: project name, description, type, level, stats, links (Code/Demo/Paper)
- As new projects are added to the data files, new Pokemon appear automatically

#### Pokedex Status
- **Caught:** Shipped/deployed projects
- **Seen:** WIP projects (easter egg — visible but not catchable)
- **Unseen:** Silhouette — future slots, unlocked as projects are added

#### Party (6 featured projects)
Always accessible from Start Menu. The top 6 projects shown with sprites, types, levels, HP bars.

### Trainers (Scientists) = Papers (10)

Papers are represented as scientist/professor NPCs who trigger battle-style encounter screens.

| Location | Papers | Type |
|----------|--------|------|
| Inside Gym (trainers) | PhD papers | Battle the gym trainers |
| Inside Gym (leader) | PhD Dissertation | The gym leader battle |
| Route 117 | 1-2 non-PhD papers | Roaming scientists |
| Route 110 | 1 non-PhD paper | Roaming scientist |
| City center | 1 non-PhD paper | Walking around |

#### Interaction Flow
1. Walk near scientist NPC -> "!" bubble appears
2. Walk into their line of sight or press ENTER
3. Battle transition effect (screen flash/swipe)
4. Battle-style UI shows: paper title, venue, year, citations (as "Level"), abstract
5. Options: View Paper / View Code / Read Abstract / Run Away
6. "View Paper" and "View Code" open links in new tab
7. "Run Away" returns to overworld

### Regular NPCs = Blog Posts (0 now, growing)

Blog posts are regular human NPCs placed in buildings, city streets, and routes.

#### Current State (0 posts — placeholder NPCs)
Since there are no blog posts yet, NPCs have placeholder dialog teasing future content. Each has unique text:

- "I'm waiting for KOSTAS to share his thoughts on ML training tricks!"
- "I heard KOSTAS is writing something about fleet management systems..."
- "Soon I'll have an amazing tutorial about CLIP distillation to tell you about!"
- "KOSTAS promised me a blog post about his PhD journey. Can't wait!"
- "I'll be sharing insights about building production ML systems soon!"
- "Check back later — I'll have a story about deploying AI at scale!"
- "There's going to be a great post about Kubernetes in production..."
- "I can't wait to tell you about reinforcement learning adventures!"

#### Future State (when posts exist)
Placeholder dialog is replaced with real content:
1. Walk up to NPC -> dialog box with post title + 1-line preview
2. "Want to read more? [Yes] [No]"
3. "Yes" -> clean HTML reader overlay (not pixel art — normal typography for readability)
4. "No" -> dialog closes

#### Placement
- Houses: 2-3 per house
- Pokemon Center: 1-2 inside
- Mart: 1-2 inside
- City streets: 2-3 walking around
- Routes: 1-2 (like helpful trainer-tip NPCs in original games)

### Pokefan NPCs = Bio/About Facts

A specific sprite type (Pokefan class) drops biographical details about Kostas. Scattered across city and routes. ~5-7 total.

Examples:
- "KOSTAS came all the way from Greece to study ML in America!"
- "Did you know KOSTAS has 8,300 followers on GitHub?"
- "He's defending his PhD at UTK this April!"
- "KOSTAS worked at Amazon as an Applied Scientist!"
- "I heard he's published 10 papers. Even one at NeurIPS!"
- "KOSTAS has 7 packages on PyPI. What a contributor!"
- "He co-founded XpensAI — an AI expense management platform!"

## Buildings

### Gym (Enterable) — Academic Credentials

- **Interior:** Original Emerald Wattson gym layout (electric fence puzzle)
- **Trainers:** PhD paper scientists (battle-style encounters)
- **Gym Leader:** PhD Dissertation (battle-style encounter at leader position)
- **Badge case:** Skills/technologies displayed as earned gym badges on the wall
- **Exterior sign:** "MAUVILLE GYM — Leader: KOSTAS"

### Pokemon Center (Enterable) — Connection Hub

- **Interior:** Original PokCenter layout
- **Nurse Joy:** Heals your Pokemon with the full jingle animation. She does exactly what she does in the real game. Pure nostalgia.
- **PC terminal:** Opens CV/resume as HTML overlay
- **NPCs inside:** Blog post NPCs + bio-fact Pokefan NPCs

### Mart (Enterable) — GitHub Shop

- **Interior:** Original Mart layout
- **Shopkeeper:** "Sells" GitHub repos. Any repo with >= 1 star or fork appears in the shop.
- **Price:** Stars + forks combined
- **Interaction:** Standard Mart buy menu. Repo name + short description + price. Selecting one -> option to "Buy" (opens GitHub repo in new tab).
- **NPCs inside:** Blog post NPCs + bio-fact NPCs

### Houses 1 & 2 (Enterable) — Blog Hubs

- **Interior:** Standard Pokemon house layout (bookshelf, table, TV, rug)
- **NPCs:** Blog post NPCs (placeholder dialog until real posts exist)
- **Scales:** As blog count grows, more NPCs fill the houses

### Bike Shop — Locked

- Door message: "Rydel went to Slateport for a delivery!"
- Future expansion slot

### Game Corner — Locked

- Door message: "Under renovation! Coming soon!"
- Future expansion slot (interactive blog browser?)

## Start Menu

| Item | Maps to | Details |
|------|---------|---------|
| **Pokedex** | Project catalog | Caught/Seen/Unseen. Browse all projects with sprites, types, stats, links. |
| **Pokemon** | Party of 6 | Featured projects. Sprites, types, levels, HP bars. Quick access to demos/code. |
| **Bag -> Skills** | Technologies | Organized by category: Languages, Frameworks, Cloud/DevOps, Data/ML |
| **Bag -> TMs** | PyPI packages | TM01 = high-sql, TM02 = garmin-auth, etc. Description + install command + PyPI link. |
| **Bag -> Key Items** | Important links | Resume PDF, GitHub profile, LinkedIn, HuggingFace, Google Scholar, email |
| **Trainer Card** | Resume | Name: KOSTAS. Class: ML ENGINEER. Region: Greece -> US. Photo. Badges (skills). Pokedex count. Hall of Fame (experience timeline: Amazon, FleetSmart, XpensAI, UTK, etc.) |
| **Save** | Download CV | Triggers PDF download of resume |
| **Option** | Settings | Sound on/off. Exit to Normal Mode. |

## Route Blockers

| Location | Blocker | Message |
|----------|---------|---------|
| Route 117 (before Verdanturf) | Snorlax | "Zzz... A huge SNORLAX is blocking the way!" |
| Route 110 (before Cycling Road) | NPC/gate | "Cycling Road closed for repairs!" |
| Route 118 (past beach) | Water | "The water is deep here. You need SURF." |

## Signs

| Location | Text |
|----------|------|
| City entrance | "MAUVILLE CITY — Where ML meets adventure!" |
| Gym exterior | "MAUVILLE GYM — Leader: KOSTAS" |
| Near spawn | "Press START for menu. ENTER to interact." |
| Route markers | Authentic route names (ROUTE 117, etc.) |
| Easter eggs | Hidden on routes, fun flavor text |

## Interaction Patterns

### Wild Pokemon Encounter (Projects)
1. Walk into tall grass
2. Random encounter triggers (like original games)
3. Battle transition effect
4. "Wild [PROJECT_NAME] appeared!" screen
5. Pokemon sprite + name, type, level, description
6. Options: View Code / View Demo / View Paper / Pokedex Entry / Run Away
7. Selecting a link opens in new tab
8. "Run Away" returns to overworld

### Trainer Encounter (Papers)
1. Walk into scientist's line of sight
2. "!" bubble, scientist walks toward you
3. Battle transition
4. "Scientist KOSTAS wants to show his research!"
5. Paper title, venue, year, citations, abstract
6. Options: View Paper / View Code / Read Abstract / Run Away

### NPC Dialog (Blogs, Bio)
1. Walk up to NPC, press ENTER
2. Classic Pokemon text box at bottom of screen
3. Text scrolls letter-by-letter (authentic speed)
4. For blogs: preview text -> "Want to read more? [Yes/No]"
5. For bio: just the fact, then dialog closes

### Mart Shopping (GitHub Repos)
1. Talk to shopkeeper
2. "Welcome! Take a look at our wares!"
3. Standard Mart buy menu with repo names + prices (stars+forks)
4. Select repo -> description shown -> "Buy? [Yes/No]"
5. "Yes" -> opens GitHub repo in new tab
6. "No" -> back to list

### PC Terminal (CV)
1. Interact with PC in Pokemon Center
2. "KOSTAS's PC" menu appears
3. Opens CV/resume as clean HTML overlay

### Save (Download CV)
1. Open Start Menu -> Save
2. "Would you like to save? [Yes/No]"
3. "Yes" -> triggers PDF download
4. "[PLAYER] saved the game!" with authentic save jingle

## Asset Pipeline

### Source
- Clone `pret/pokeemerald` from GitHub
- All assets in `graphics/` directory as indexed PNGs

### Extraction
1. **Tilesets:** Use Porymap to export composed 16x16 metatile sheets as PNGs
2. **Maps:** Use Porymap to export stitched map images, then build collision/interaction layers in Tiled on top
3. **Overworld sprites:** Grab PNGs from `graphics/object_events/pics/people/` — already in spritesheet format
4. **Pokemon sprites:** Use PokeAPI/sprites for pre-extracted battle sprites (64x64 PNGs)
5. **Collision data:** Parse layout `.bin` + `metatile_attributes.bin` to generate collision grid, OR manually paint collision in Tiled

### Tools
- **Porymap** (`huderlem/porymap`): Visual map editor, reads pokeemerald repo, exports map images and metatile sheets
- **Tiled**: Create interaction/collision layers on top of exported map images
- **Phaser 3**: Loads Tiled JSON natively via `tilemapTiledJSON()`
- **Grid Engine**: Reads collision from Tiled tile properties (`ge_collide`)

## Integration with Normal Mode

### Toggle
- Gamepad button (🎮) in the normal portfolio navbar triggers Explore Mode
- Loads Phaser + assets on demand (not on initial page load)
- "Exit to Normal Mode" in the Option menu returns to the portfolio

### Shared Data
- Both modes read from the same data sources (projects.json, papers.json, etc.)
- Adding a project in the data file -> new Pokemon appears in the game AND new card on the projects page
- Content collections are the single source of truth

### Performance Budget
- Normal mode: 0 KB JS (pure Astro SSG)
- Explore mode: ~350KB (Phaser) + ~200KB (sprites/tilesets) + ~100KB (game logic + Grid Engine) = ~650KB
- All loaded lazily on demand when user clicks the gamepad button
- Target: game playable within 3 seconds of toggle

## Phasing

### Phase 1 — MVP
- Mauville City overworld (no building interiors)
- Player movement with Grid Engine
- 3-4 wild Pokemon encounters on city area
- Start Menu (basic: Pokedex list, Trainer Card, Save, Option)
- Toggle mechanism from normal portfolio
- Basic dialog system

### Phase 2 — Routes + Encounters
- Route 117, 110 start, 118 start
- Full wild Pokemon encounter system with battle-style UI
- All 31 projects as Pokemon in Pokedex
- Tall grass encounter mechanics
- Route blockers (Snorlax, water, NPCs)

### Phase 3 — Buildings
- Gym interior (papers as trainers, dissertation as leader, badge case)
- Pokemon Center interior (Nurse Joy healing, PC terminal)
- Mart interior (GitHub repo shop)
- House interiors (blog NPCs)

### Phase 4 — Polish
- Full Start Menu (Bag with pockets, Party screen, full Pokedex UI)
- NPC walking animations and pathfinding
- Battle transition effects
- Sound effects (walking, encounter, dialog, healing jingle)
- Mobile virtual d-pad
- Easter eggs on routes

## Key References

### Repos to Study
- `devshareacademy/monster-tamer` — Phaser 3 Pokemon-like, 111-ep tutorial. Tilemaps, dialog, battles, menus.
- `Annoraaq/grid-engine` — Grid movement plugin for Phaser 3. Core dependency.
- `pret/pokeemerald` — Full Emerald decompilation. All assets.
- `jvnm-dev/pokemon-react-phaser` — Phaser + React + Tiled. Closest to our stack.
- `phaserjs/template-react` — Official Phaser React integration template.
- Pablo.gg blog-as-RPG — Exact same concept (blog as top-down RPG with Phaser + React + Grid Engine).

### Tools
- Porymap (`huderlem/porymap`) — Map editor for pret projects, exports map images
- Tiled (`mapeditor.org`) — Tilemap editor, exports JSON for Phaser
- PokeAPI/sprites — Pre-extracted Pokemon sprites
