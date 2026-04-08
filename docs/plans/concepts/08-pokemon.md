# Concept 08: The Pokemon Game

**Status:** Design Concept  
**Author:** Kostas Georgiou  
**Date:** 2026-04-06

---

## 1. Concept Overview

### The Metaphor

The entire portfolio is a classic Pokemon game (Generation III / Emerald era). The homepage IS a top-down pixel art room — a researcher's lab/office — where a character sprite (representing Kostas) stands. You can move the character with arrow keys or WASD. A Pokemon-style Start menu provides navigation to all pages. Objects in the room are interactable: walk to the computer and press Enter to see Projects, approach the bookshelf for Publications, sit at the desk for the Resume.

This is the **spiritual successor to the VSCode portfolio** — both are "themed interactive experiences." The VSCode one said "I'm a developer." The Pokemon one says "I'm a developer who builds things that are genuinely fun to interact with."

### The Wow Factor

- **You land on a playable game.** The first thing visitors see is a pixel art room with a character they can move. This is immediately memorable and shareable.
- **Object interactions** trigger Pokemon-style dialog boxes that show real portfolio content (project descriptions, paper abstracts, contact links).
- **Room transitions**: Walk to a door to "enter" a new area (the blog room, the project showcase room). Each page can be a different room in a larger building.
- **NPC encounters**: An NPC (Professor Oak-style) greets you on first visit with a welcome message and quick tutorial.
- **Pokemon menu system**: The iconic Start menu (with the distinctive sound effect) slides in from the right with page navigation.
- **Battle mode** (optional stretch goal): A "Challenge Me" feature that presents technical trivia as Pokemon battles.

### Target Audience Fit

- **Recruiters**: The Start menu and dialog boxes present all information in clean, readable format. They don't have to play the game.
- **Hiring Managers**: The sheer technical ambition of building this demonstrates frontend skill and creative engineering.
- **Technical Peers**: They'll explore every corner, find easter eggs, and share it on HN/Twitter.
- **Everyone**: Nostalgia is a universal connector. Anyone who grew up with Pokemon will spend 5 minutes exploring.

---

## 2. Color Palette & Typography

### Color Palette

The palette is inspired by GBA-era Pokemon games, adapted for a dark theme that works on modern displays.

| Role | Hex | Usage |
|------|-----|-------|
| Background (dark) | `#0f0f1b` | Page background behind the game viewport |
| Game viewport bg | `#1a1a2e` | The game canvas background |
| Floor tiles (light) | `#3d3d5c` | Room floor color |
| Floor tiles (dark) | `#2d2d4a` | Checkerboard pattern |
| Wall color | `#4a4a6a` | Room walls |
| Wall accent | `#5c5c8a` | Wall trim, shelves |
| Furniture wood | `#8b6914` | Desk, bookshelf, table |
| Furniture dark | `#5c4a0a` | Furniture shadows |
| Computer screen | `#00ff88` | Active terminal/screen glow |
| Dialog box bg | `#1e1e3a` | Text boxes, menu panels |
| Dialog border | `#f8f8f8` | White border on dialog boxes |
| Text primary | `#f8f8f8` | Dialog text, menu text |
| Text secondary | `#b0b0cc` | Descriptions, metadata |
| Accent green | `#00e676` | Selected menu items, links |
| Accent red | `#ff5252` | HP bars, warnings |
| Accent blue | `#448aff` | Info badges, tech tags |
| Accent gold | `#ffd740` | Stars, featured items |
| Player sprite accent | `#ff6b35` | Character hair/clothing highlight |

### Typography

| Context | Font | Fallback | Size |
|---------|------|----------|------|
| Game dialog text | `Press Start 2P` (Google Fonts) | monospace | 14px |
| Menu items | `Press Start 2P` | monospace | 12px |
| Content body (overlays) | `Inter` | system sans-serif | 15px / 1.6 |
| Content headings | `Press Start 2P` | monospace | 16-20px |
| Tech tags / badges | `JetBrains Mono` | monospace | 12px |
| Status text (HP bars etc) | `Press Start 2P` | monospace | 10px |

**Key rule**: The pixel font (`Press Start 2P`) is used for all in-game UI (dialogs, menus, labels). When a full content overlay opens (projects, papers, blog), the body text switches to `Inter` for readability, but headings stay pixel font to maintain the theme.

---

## 3. Navigation Design

### Primary Navigation: Pokemon Start Menu

Pressing **Escape**, clicking the **Menu** button, or pressing **Enter** when no object is nearby opens the Pokemon-style Start menu. It slides in from the right edge:

```
                          ┌──────────────────┐
                          │   ▶ ABOUT ME     │
                          │     PROJECTS     │
                          │     PAPERS       │
                          │     BLOG         │
                          │     RESUME       │
                          │     CONTACT      │
                          │     ─────────    │
                          │     SETTINGS     │
                          │     EXIT GAME    │
                          └──────────────────┘
```

Arrow keys move the selector. Enter selects. Escape closes. The selected item has a bouncing arrow indicator and highlight color.

### Secondary Navigation: Room Exploration

Walking to objects and pressing Enter/Space triggers contextual interactions. Objects have a subtle sparkle/glow animation when the player is adjacent. A small "Press [Enter]" prompt appears.

### Tertiary Navigation: Top Bar (Accessibility Fallback)

A minimal top bar sits above the game viewport for users who don't want to (or can't) use keyboard controls:

```
[Kostas Georgiou]    [About] [Projects] [Papers] [Blog] [Resume] [Contact]
```

This bar is semi-transparent and auto-hides after 3 seconds of inactivity. Mouse click on any item opens the corresponding overlay directly.

### Mobile Navigation

On mobile, the game viewport is touch-enabled with a virtual D-pad (bottom-left) and A/B buttons (bottom-right). The Start menu has a dedicated button. Alternatively, a tab bar at the bottom provides direct navigation (skipping the game interaction).

---

## 4. Page Designs

### 4.1 Home Page — The Lab/Office Room

The default view is a pixel art room rendered on a canvas element. The room represents a researcher's lab:

**Room Objects:**
| Object | Sprite | Interaction | Links To |
|--------|--------|-------------|----------|
| Desktop Computer | Retro PC with green screen | Screen lights up, shows project thumbnails | Projects overlay |
| Bookshelf | Tall shelf with books/papers | Books shake, titles appear | Papers overlay |
| Desk with papers | Office desk, scattered docs | Papers organize themselves | Resume overlay |
| Poster on wall | Conference poster (NeurIPS) | Zooms in to show poster content | About/CV overlay |
| Bulletin board | Cork board with notes | Notes animate in | Blog overlay |
| Phone on desk | Retro phone | Phone rings | Contact overlay |
| Door (left wall) | Wooden door | Transition to new room | Alternate room / exit |
| Whiteboard | Large whiteboard with equations | Equations animate drawing | Skills/About section |
| Coffee mug | Steaming mug on desk | Steam animation, flavor text | Easter egg dialog |
| Pokemon poster | Game poster on wall | "I see you're a person of culture" | Easter egg dialog |
| Rubber duck | Small duck on monitor | "Debugging in progress..." | Easter egg dialog |

**NPC: Professor Mentor**
A character stands near the door on first visit. Walking up to them triggers:
```
┌─────────────────────────────────────────────────┐
│ PROFESSOR:                                      │
│ Welcome to Kostas's Lab!                         │
│ He's a Machine Learning Engineer                │
│ and Applied Scientist at Amazon.                │
│                                                 │
│ Feel free to explore the room or                │
│ press ESC for the main menu.       [▶ Next]     │
└─────────────────────────────────────────────────┘
```

The professor only appears on first visit (localStorage flag). Subsequent visits start with the player in the room, free to explore.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Kostas Georgiou]         [About][Projects][Papers][Blog][Resume][Contact]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────┐      │
│    │                                                                  │      │
│    │      ╔══════╗    ┌────────────┐   ╔═══════════════╗             │      │
│    │      ║ POST ║    │ WHITEBOARD │   ║   BOOKSHELF   ║             │      │
│    │      ║ ER   ║    │  E=mc^2    │   ║ ╔╗╔╗╔╗╔╗╔╗╔╗ ║             │      │
│    │      ╚══════╝    │  f(x)=...  │   ║ ╚╝╚╝╚╝╚╝╚╝╚╝ ║             │      │
│    │                  └────────────┘   ╚═══════════════╝             │      │
│    │                                                                  │      │
│    │    ┌────────────────┐                     ┌────────────┐        │      │
│    │    │   ┌──────┐     │                     │ BULLETIN   │        │      │
│    │    │   │ ████ │     │        ☻            │ BOARD      │        │      │
│    │    │   │SCREEN│ ☕  │       /▌\  ←player  │ [note]     │        │      │
│    │    │   └──────┘     │       / \           │ [note]     │        │      │
│    │    │  COMPUTER DESK │                     └────────────┘        │      │
│    │    └────────────────┘                                           │      │
│    │                         ┌──────────────────┐                    │      │
│    │    ┌─────┐              │   OFFICE DESK    │      ┌──────┐     │      │
│    │    │PROF │              │ ╔══╗  [docs]  ☎ │      │ 🦆   │     │      │
│    │    │ OAK │              │ ╚══╝             │      │      │     │      │
│    │    └─────┘              └──────────────────┘      └──────┘     │      │
│    │                                                                  │      │
│    │   ═══╡ DOOR ╞═══                                                │      │
│    │                                                                  │      │
│    └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  HP ████████████ LVL 8     EXP ████████░░ 8yr    AREA: The Lab              │
├──────────────────────────────────────────────────────────────────────────────┤
│  [↑←↓→] Move    [Enter] Interact    [Esc] Menu    [M] Map                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Projects Page — Content Overlay

When the Start menu "PROJECTS" is selected or the computer is interacted with, a full-screen overlay slides up (like Pokemon's Pokedex opening). The overlay uses the Pokemon UI frame but contains modern card layouts:

**Header**: "PROJECTS" in pixel font with a Pokedex-style frame.

**Layout**: Grid of project cards. Each card styled like a Pokemon card:
- Top: Project image (screenshot)
- Title in pixel font
- Description in Inter for readability
- Tech tags as Pokemon-type badges (Fire=PyTorch, Water=Python, Electric=JavaScript, Grass=GCP, etc.)
- Action buttons: [Live] [Code] [Demo] [Paper] styled as Pokemon menu items

**Featured projects** get a "LEGENDARY" border treatment (gold shimmer). Standard projects get "RARE" (silver). Minor projects are "COMMON" (plain).

Categories are presented as "Pokemon Boxes" — tabbed sections you can switch between: "ML Research", "Products", "Open Source", "Utilities".

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗  │
│  ║  P R O J E C T S                                      [X Close]      ║  │
│  ╠════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                      ║  │
│  ║  BOX: [★ Featured] [ML Research] [Products] [Open Source] [Utils]    ║  │
│  ║  ─────────────────────────────────────────────────────────────────   ║  │
│  ║                                                                      ║  │
│  ║  ┌─────────────────────┐  ┌─────────────────────┐                   ║  │
│  ║  │ ★ LEGENDARY ★       │  │ ★ LEGENDARY ★       │                   ║  │
│  ║  │ ┌─────────────────┐ │  │ ┌─────────────────┐ │                   ║  │
│  ║  │ │                 │ │  │ │                 │ │                   ║  │
│  ║  │ │  [FleetSmart]   │ │  │ │  [MEDiC]        │ │                   ║  │
│  ║  │ │   screenshot    │ │  │ │   screenshot    │ │                   ║  │
│  ║  │ │                 │ │  │ │                 │ │                   ║  │
│  ║  │ └─────────────────┘ │  │ └─────────────────┘ │                   ║  │
│  ║  │ FleetSmart.ai      │  │ MEDiC               │                   ║  │
│  ║  │ AI fleet management │  │ Multi-objective      │                   ║  │
│  ║  │ platform            │  │ CLIP distillation    │                   ║  │
│  ║  │                     │  │                      │                   ║  │
│  ║  │ [🔥FastAPI][⚡Next] │  │ [🔥PyTorch][🌊CLIP] │                   ║  │
│  ║  │ [🌿GCP] [💧LLM]    │  │ [⚡HF] [🌿SSL]      │                   ║  │
│  ║  │                     │  │                      │                   ║  │
│  ║  │ [▶ Live]            │  │ [▶ Code] [▶ Demo]   │                   ║  │
│  ║  └─────────────────────┘  └──────────────────────┘                   ║  │
│  ║                                                                      ║  │
│  ║  ┌─────────────────────┐  ┌─────────────────────┐                   ║  │
│  ║  │ ★ LEGENDARY ★       │  │ ★ LEGENDARY ★       │                   ║  │
│  ║  │ ShiftMD             │  │ XpensAI             │                   ║  │
│  ║  │ ...                 │  │ ...                 │                   ║  │
│  ║  └─────────────────────┘  └──────────────────────┘                   ║  │
│  ║                                                                      ║  │
│  ╚════════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  [↑↓] Navigate    [←→] Switch Box    [Enter] View    [Esc] Back             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Papers Page — The Pokedex

Publications are presented as a Pokemon Pokedex interface. Each paper is a "discovered Pokemon" entry:

- Left side: list of papers (scrollable, with title + year)
- Right side: selected paper's full details (abstract, venue, citations, links)
- Papers are numbered (#001 through #010+)
- A "SEEN/CAUGHT" mechanic: papers with associated code repos show as "CAUGHT" (pokeball icon), others as "SEEN" (eye icon)
- Citation count appears as the "CP" (Combat Power) number
- Venue appears as the Pokemon's "TYPE" badge

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗  │
│  ║  P U B L I C A T I O N   D E X                        [X Close]     ║  │
│  ╠════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                      ║  │
│  ║  ┌──────────────────────┐  ┌──────────────────────────────────────┐ ║  │
│  ║  │                      │  │                                      │ ║  │
│  ║  │  #001 Cross-Scale    │  │  #001                                │ ║  │
│  ║  │  ● MAE          2023 │  │  CROSS-SCALE MAE                     │ ║  │
│  ║  │                      │  │                                      │ ║  │
│  ║  │  #002 Semantic Seg   │  │  Type: NEURIPS           CP: 54      │ ║  │
│  ║  │  ● mentation    2023 │  │  Year: 2023             Status:●     │ ║  │
│  ║  │                      │  │                                      │ ║  │
│  ║  │  #003 Occasionally   │  │  ─────────────────────────────────   │ ║  │
│  ║  │  ● Secure       2024 │  │                                      │ ║  │
│  ║  │                      │  │  A Tale of Multiscale Exploitation   │ ║  │
│  ║  │  #004 Koopman-Based  │  │  in Remote Sensing. Self-supervised  │ ║  │
│  ║  │  ○ KTD          2024 │  │  model built on Masked Auto-Encoder │ ║  │
│  ║  │                      │  │  with cross-scale consistency for    │ ║  │
│  ║  │  #005 Advancing      │  │  remote sensing image understanding. │ ║  │
│  ║  │  ○ Multi-Scale  2024 │  │                                      │ ║  │
│  ║  │                      │  │  ─────────────────────────────────   │ ║  │
│  ║  │  #006 Trustworthy    │  │                                      │ ║  │
│  ║  │  ○ AI Dementia  2025 │  │  Authors: Georgiou, K., Psaroudakis │ ║  │
│  ║  │                      │  │           A., Shi, M., Zheng, Z.     │ ║  │
│  ║  │  #007 Teaching       │  │                                      │ ║  │
│  ║  │  ○ Assistant    2025 │  │  [▶ Paper] [▶ Code] [▶ Scholar]     │ ║  │
│  ║  │                      │  │                                      │ ║  │
│  ║  │  ● = Has Code (5)    │  │  HABITAT: github.com/aicip/         │ ║  │
│  ║  │  ○ = Paper Only (5)  │  │           Cross-Scale-MAE           │ ║  │
│  ║  │                      │  │                                      │ ║  │
│  ║  └──────────────────────┘  └──────────────────────────────────────┘ ║  │
│  ║                                                                      ║  │
│  ║  TOTAL: 10 published    CAUGHT: 5 with code    TOTAL CP: 102        ║  │
│  ║                                                                      ║  │
│  ╚════════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  [↑↓] Select    [Enter] View Details    [←→] Scroll    [Esc] Back           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Blog Index — The Bulletin Board

The blog index is presented as a Pokemon-style Town Bulletin Board. Each post is a "notice" pinned to the board:

- Posts are rectangular notes with slightly rotated/offset positions (like real pinned notes)
- Each note shows: title, date, reading time, tags (as type badges)
- Clicking a note expands it into a full blog post overlay
- A "NEW!" badge appears on recent posts (< 30 days old)

The layout is a scrollable grid of note cards with a corkboard texture background inside the Pokemon UI frame.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗  │
│  ║  B U L L E T I N   B O A R D                          [X Close]     ║  │
│  ╠════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                      ║  │
│  ║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║  │
│  ║  ░░ ┌────────────────────┐  ┌────────────────────┐ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │📌 NEW!             │  │📌                  │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │                    │  │                    │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │ Self-Supervised    │  │ Building Fleet-    │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │ Learning: SimCLR   │  │ Smart: Prototype   │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │ to Cross-Scale MAE │  │ to Production      │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │                    │  │                    │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │ Apr 2026 · 12 min  │  │ Mar 2026 · 15 min  │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │ [🔥SSL] [🌿CV]    │  │ [⚡SaaS] [🌿GCP]  │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ └────────────────────┘  └────────────────────┘ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║  │
│  ║  ░░ ┌────────────────────┐  ┌────────────────────┐ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │📌                  │  │📌                  │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │ Deploying ML       │  │ Why I Left         │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │ Models at Amazon   │  │ Academia for       │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │ Scale              │  │ Industry           │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │ Feb 2026 · 10 min  │  │ Jan 2026 · 8 min   │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ │ [🔥MLOps] [⚡AWS]  │  │ [🌿Career]        │ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░ └────────────────────┘  └────────────────────┘ ░░░░░░░░░░░░░░  ║  │
│  ║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║  │
│  ║                                                                      ║  │
│  ╚════════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  [↑↓←→] Navigate    [Enter] Read Post    [Esc] Back                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Blog Post Page — The Scroll

When a blog post is opened, it takes over the full overlay. The post content is rendered in a clean reading format but framed within a Pokemon "scroll" or "book" UI:

- Pokemon-style header with post title, date, reading time
- Body text in `Inter` for readability (pixel font ONLY for title and section headings)
- Full MDX support: code blocks (syntax highlighted with pixel-art-inspired theme), math (KaTeX), images, HF embeds
- A progress bar at the top styled like a Pokemon HP bar (green to red as you scroll)
- Table of contents in a Pokemon menu sidebar (toggleable)
- "Previous/Next" navigation at the bottom styled as battle move buttons
- Share buttons styled as item icons (Twitter bird, LinkedIn badge, HN icon)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗  │
│  ║  ◀ Back to Blog                                        [X Close]     ║  │
│  ║  HP ████████████████████░░░░░░░░░░                   75% read        ║  │
│  ╠════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                      ║  │
│  ║  Self-Supervised Learning:                                           ║  │
│  ║  From SimCLR to Cross-Scale MAE                                      ║  │
│  ║                                                                      ║  │
│  ║  April 2026 · 12 min read                                            ║  │
│  ║  [🔥SSL] [🌿Computer Vision] [⚡MAE]                                ║  │
│  ║  ─────────────────────────────────────────────────────────────────   ║  │
│  ║                                                                      ║  │
│  ║  Self-supervised learning has transformed computer vision by          ║  │
│  ║  eliminating the need for expensive labeled datasets. In this        ║  │
│  ║  post, I trace the evolution from early contrastive methods          ║  │
│  ║  (SimCLR, MoCo) through masked image modeling (MAE, BEiT) to        ║  │
│  ║  our work on Cross-Scale MAE.                                        ║  │
│  ║                                                                      ║  │
│  ║  ## The Contrastive Era                                              ║  │
│  ║                                                                      ║  │
│  ║  SimCLR [Chen et al., 2020] showed that simple contrastive           ║  │
│  ║  learning could match supervised pre-training...                     ║  │
│  ║                                                                      ║  │
│  ║  ```python                                                           ║  │
│  ║  # Cross-Scale MAE loss function                                     ║  │
│  ║  loss = reconstruction_loss + lambda * contrastive_loss              ║  │
│  ║  ```                                                                 ║  │
│  ║                                                                      ║  │
│  ║  ─────────────────────────────────────────────────────────────────   ║  │
│  ║                                                                      ║  │
│  ║  [◀ Prev: FleetSmart]              [Next: ML at Amazon Scale ▶]     ║  │
│  ║                                                                      ║  │
│  ╚════════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  [↑↓] Scroll    [Esc] Back    [S] Share    [T] Table of Contents            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.6 Resume Page — The Trainer Card

The resume is presented as a Pokemon Trainer Card. The card fills most of the overlay:

- Top section: "portrait" (professional photo or pixel art avatar), name, title, badges earned
- "Badges" represent key achievements: PhD badge, NeurIPS badge, Amazon badge, each as a pixel art gym badge
- Stats section: years of experience, publications, citations, projects — displayed as Pokemon stat bars (ATK, DEF, SPD, etc. renamed to Research, Engineering, Leadership, etc.)
- Below the card: a full CV in clean format (Inter font) with the Pokemon UI frame
- Download PDF button styled as "SAVE GAME"

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗  │
│  ║  T R A I N E R   C A R D                               [X Close]    ║  │
│  ╠════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                      ║  │
│  ║  ┌────────────────────────────────────────────────────────────────┐  ║  │
│  ║  │                                                                │  ║  │
│  ║  │  ┌──────────┐   KOSTAS GEORGIOU                               │  ║  │
│  ║  │  │          │   PhD | Applied Scientist | ML Engineer          │  ║  │
│  ║  │  │  [pixel  │   Amazon  ·  Knoxville, TN                      │  ║  │
│  ║  │  │  avatar] │                                                  │  ║  │
│  ║  │  │          │   LEVEL: Senior (8+ years)                       │  ║  │
│  ║  │  └──────────┘   CLASS: ML Engineer / Researcher                │  ║  │
│  ║  │                                                                │  ║  │
│  ║  │  ──────────────────────────────────────────────────────────    │  ║  │
│  ║  │  BADGES EARNED:                                                │  ║  │
│  ║  │                                                                │  ║  │
│  ║  │  [🏅PhD]  [🏅NeurIPS]  [🏅WACV]  [🏅Amazon]                 │  ║  │
│  ║  │  [🏅IGARSS] [🏅FleetSmart] [🏅54Citations]                  │  ║  │
│  ║  │                                                                │  ║  │
│  ║  │  ──────────────────────────────────────────────────────────    │  ║  │
│  ║  │  STATS:                                                        │  ║  │
│  ║  │                                                                │  ║  │
│  ║  │  RESEARCH    ████████████████████░░░░░  85/100                 │  ║  │
│  ║  │  ENGINEERING ██████████████████████░░░  90/100                 │  ║  │
│  ║  │  LEADERSHIP  ████████████████░░░░░░░░  70/100                 │  ║  │
│  ║  │  PUBLISHING  ████████████████████░░░░  80/100                 │  ║  │
│  ║  │  SHIPPING    ██████████████████████░░░  90/100                 │  ║  │
│  ║  │                                                                │  ║  │
│  ║  └────────────────────────────────────────────────────────────────┘  ║  │
│  ║                                                                      ║  │
│  ║  [▶ SAVE GAME (Download PDF)]    [▶ View Full CV]                   ║  │
│  ║                                                                      ║  │
│  ╚════════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.7 Contact Page — The PokeCenter

Contact is styled as a Pokemon Center interaction. A Nurse Joy-inspired NPC (or just a pixel art mail clerk) stands behind a counter. The dialog sequence:

```
RECEPTIONIST: Welcome to the Contact Center!
How would you like to reach Kostas?

▶ Email         (kostas@gkos.dev)
  LinkedIn      (linkedin.com/in/drkostas)
  GitHub        (github.com/drkostas)
  Scholar       (Google Scholar)
  HuggingFace   (huggingface.co/drkostas)
  Send Message  (Contact Form)
```

Selecting "Send Message" opens a form styled as a Pokemon PC storage interface:

```
╔════════════════════════════════════════╗
║  COMPOSE MESSAGE                       ║
╠════════════════════════════════════════╣
║                                        ║
║  YOUR NAME:                            ║
║  ┌──────────────────────────────────┐  ║
║  │                                  │  ║
║  └──────────────────────────────────┘  ║
║                                        ║
║  YOUR EMAIL:                           ║
║  ┌──────────────────────────────────┐  ║
║  │                                  │  ║
║  └──────────────────────────────────┘  ║
║                                        ║
║  MESSAGE:                              ║
║  ┌──────────────────────────────────┐  ║
║  │                                  │  ║
║  │                                  │  ║
║  │                                  │  ║
║  └──────────────────────────────────┘  ║
║                                        ║
║  [▶ SEND]    [▶ CANCEL]              ║
╚════════════════════════════════════════╝
```

---

## 5. Interactive Elements & Animations

### Game Engine

The core game runs on an HTML5 Canvas with a simple tile-based engine. No heavy game framework needed — this is a controlled environment (one room, simple collision detection, sprite animation).

1. **Character Movement**: 4-directional sprite animation (walk cycle), 16x16 or 32x32 pixel sprites. Smooth tile-to-tile movement (not instant snap). Speed: ~4 tiles/second.

2. **Object Interaction**: When adjacent to an interactive object, a small sparkle animation plays on the object and a "!" or "A" button prompt appears. Pressing Enter triggers the interaction.

3. **Dialog System**: Pokemon-style text boxes that appear at the bottom of the screen. Text types out character-by-character with the classic "tick tick tick" sound (optional, mutable). Press Enter to advance.

4. **Menu Animation**: The Start menu slides in from the right with the Pokemon "whoosh" animation. Menu cursor bounces. Selection triggers a confirm sound.

5. **Overlay Transitions**: Content overlays (Projects, Papers, etc.) slide up from the bottom with an easing curve, covering the game viewport. The game pauses while overlays are open.

6. **Room Transitions**: Walking through a door triggers a screen fade-to-black, then fade-in on the new room. Classic Pokemon room transition.

7. **Ambient Animations**: 
   - Computer screen flickers with a green glow
   - Coffee mug steam particles
   - Bookshelf books occasionally wobble
   - Clock on the wall shows real time
   - Whiteboard equations cycle through different formulas
   - Window shows a day/night cycle based on visitor's local time

8. **Sound Design** (optional, off by default):
   - Background: Lo-fi chiptune ambient track
   - Movement: Soft footstep sounds
   - Interaction: Pokemon "A button" confirm
   - Menu: Pokemon menu open/close
   - Dialog: Character-by-character text tick
   - All sounds controlled by a volume slider in Settings

### Easter Eggs

1. **Konami Code**: Up Up Down Down Left Right Left Right B A → unlocks a hidden "Secret Room" with a pixel art arcade cabinet that shows a mini-game (could be a simple Flappy Bird clone or Snake).
2. **Rubber Duck**: Interacting with the rubber duck 5 times triggers "The duck has learned Debugging. It's super effective!"
3. **Coffee Mug**: Interacting repeatedly shows a sequence: "Fresh coffee!", "Still warm...", "Getting cold...", "Ice coffee now.", "Coffee has evolved into Tea!"
4. **Pokemon Poster**: "Ah, I see you're a person of culture as well. Did you know the first commit to this site was in 2022?"
5. **Hidden Tile**: A specific floor tile is slightly different colored. Walking over it reveals a secret item: "You found Rare Candy! (Actually it's my Spotify playlist: [link])"

---

## 6. Mobile Adaptation

### Touch Controls

Mobile layout adds a virtual gamepad overlay on the game viewport:

```
┌─────────────────────────────────┐
│    [☰ Menu]     [Kostas G.]    │
├─────────────────────────────────┤
│                                 │
│                                 │
│    ┌──────────────────────┐    │
│    │                      │    │
│    │     GAME VIEWPORT    │    │
│    │                      │    │
│    │         ☻            │    │
│    │        /▌\           │    │
│    │        / \           │    │
│    │                      │    │
│    └──────────────────────┘    │
│                                 │
│    ┌───┐                [A]    │
│  ┌─┤ ▲ ├─┐                    │
│  │ ├───┤ │           [B]      │
│  │◀│   │▶│                    │
│  │ ├───┤ │                    │
│  └─┤ ▼ ├─┘        [START]    │
│    └───┘                       │
├─────────────────────────────────┤
│ [About][Projects][Papers][Blog] │
└─────────────────────────────────┘
```

### Mobile Fallback

For users who find the game impractical on mobile (small screens, touch awkwardness), the bottom tab bar provides direct navigation to all content overlays. This means mobile users can completely skip the game and just use the site as a normal portfolio.

### Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| > 1024px | Full game viewport, overlays are 80% width centered |
| 768-1024px | Game viewport fills width, virtual D-pad, overlays full-width |
| < 768px | Game viewport with virtual controls, tab bar always visible, overlays full-screen |
| < 480px | Game viewport reduced height (40vh), tab bar prominent, content overlays dominate |

### Accessibility Mode

A prominent toggle in the top bar: "Explore Mode | Read Mode". Read Mode disables the game entirely and shows a clean, traditional portfolio layout (dark theme, card-based). All the same content, just without the game. This ensures the site is usable for:
- Screen readers
- Users with motor impairments
- Users who just want to quickly scan
- Corporate/formal contexts where a game feels inappropriate

---

## 7. Tech Requirements

### Game Engine

| Component | Technology | Purpose |
|-----------|------------|---------|
| Renderer | HTML5 Canvas (2D context) | Game viewport rendering |
| Game loop | `requestAnimationFrame` | 60fps game tick |
| Tile engine | Custom (simple) | Tile map rendering, collision detection |
| Sprite engine | Custom (simple) | Character animation, object sprites |
| Asset format | PNG sprite sheets | Tile sets, character sprites, objects |
| Map format | JSON tile maps | Room layouts (can use Tiled editor export) |

The game engine does NOT need a framework like Phaser or PixiJS. The scope is small enough (one room, simple movement, dialog boxes) that a custom engine in ~500 lines of TypeScript is more appropriate. This keeps the bundle tiny.

### Framework & Build

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Astro 5.x | Static site generation, content collections |
| Game island | React 19 (or Solid) | Game canvas + UI overlays as a single interactive island |
| Content overlays | React components | Project cards, paper entries, blog rendering |
| Content | Astro Content Collections | Blog posts (MDX), project data, paper data |
| Styling | Tailwind CSS 4 | Utility classes for overlays and fallback layout |

### Key Libraries

| Library | Purpose |
|---------|---------|
| `@fontsource/press-start-2p` | Pixel art game font |
| `@fontsource/inter` | Content body text |
| `howler.js` (optional) | Audio playback for sound effects |
| `framer-motion` | Overlay slide-in/out animations |
| `shiki` | Code syntax highlighting in blog posts |
| `rehype-katex` + `remark-math` | Math rendering |
| `@astrojs/mdx` | Blog MDX support |
| `@astrojs/rss` | RSS feed |

### Sprite Assets

Sprites need to be created or sourced. Options:
1. **Commission pixel artist** on Fiverr/ArtStation (~$100-300 for a room tileset + character)
2. **Use open-source tilesets** (OpenGameArt.org has GBA-style assets under CC licenses)
3. **AI-generate** base sprites and pixel-art them (Stable Diffusion + manual cleanup)
4. **DIY with Aseprite** ($20, the standard pixel art tool)

Needed assets:
- Room tileset (floor, walls, furniture) — 16x16 or 32x32
- Character sprite sheet (4 directions x 3 frames walk cycle = 12 frames)
- Object sprites (computer, bookshelf, desk, bulletin board, phone, etc.)
- NPC sprite (professor character)
- UI frame sprites (dialog box borders, menu frame)
- Badge icons (8-12 pixel art badges for the trainer card)

### Astro Component Architecture

```
src/
  layouts/
    GameLayout.astro          # Main layout with game viewport
    ReadModeLayout.astro      # Accessibility fallback layout
    BlogPostLayout.astro      # Blog post reading layout
  components/
    game/
      GameCanvas.tsx          # React island: main game renderer
      GameEngine.ts           # Game loop, input handling, collision
      TileMap.ts              # Tile rendering and map data
      Sprite.ts               # Sprite animation system
      DialogSystem.tsx        # Pokemon-style dialog boxes
      MenuOverlay.tsx         # Start menu component
      SoundManager.ts         # Audio manager (howler.js)
    overlays/
      ProjectsOverlay.tsx     # Projects Pokedex-style overlay
      PapersOverlay.tsx       # Publications Pokedex overlay
      BlogOverlay.tsx         # Bulletin board blog overlay
      ResumeOverlay.tsx       # Trainer card resume
      ContactOverlay.tsx      # PokeCenter contact
      AboutOverlay.tsx        # About me dialog
    ui/
      OverlayFrame.tsx        # Pokemon-style UI frame wrapper
      TypeBadge.tsx           # Pokemon type-style tech badges
      StatBar.tsx             # HP/stat bar component
      PixelButton.tsx         # Pokemon menu-style button
      VirtualDpad.tsx         # Mobile D-pad controls
    shared/
      ProjectCard.astro       # Project display card
      PaperEntry.astro        # Paper display entry
      BlogCard.astro          # Blog post card
      AccessibilityToggle.tsx # Explore/Read mode switch
  content/
    blog/                     # MDX blog posts
    config.ts                 # Content collection schemas
  pages/
    index.astro               # Game viewport (home)
    projects.astro            # Direct URL for projects (opens overlay)
    papers.astro              # Direct URL for papers
    blog/
      index.astro             # Direct URL for blog
      [slug].astro            # Blog post pages
    resume.astro              # Direct URL for resume
    contact.astro             # Direct URL for contact
  assets/
    sprites/                  # All pixel art sprite sheets
    audio/                    # Sound effects (optional)
    maps/                     # Room JSON map data
  data/
    projects.json
    papers.json
    room-map.json             # Tile map definition
  styles/
    pokemon-ui.css            # Pokemon-style UI frames and overlays
    game.css                  # Game viewport styles
    globals.css
```

### Performance Considerations

- Game canvas: ~150KB total (sprites + engine JS)
- Content overlays: loaded on demand (code-split per overlay)
- Sound assets: loaded lazily, only if audio is enabled
- Blog posts: zero JS (Astro static) unless interactive components present
- Total initial load: < 200KB (HTML + CSS + game engine + sprites)
- Lighthouse Performance: > 90 (game canvas may impact slightly)

---

## 8. Pros & Cons

### Pros

1. **Maximum memorability** — Nobody forgets a portfolio that's literally a playable game. This gets shared on HN, Twitter, Reddit.
2. **Viral potential** — "This ML Engineer's portfolio is a Pokemon game" is a headline that writes itself.
3. **Deep engagement** — Average visit time will be 3-5x a normal portfolio. People will explore every corner.
4. **Technical showcase** — Building a game engine (even a simple one) for your portfolio demonstrates serious frontend engineering ability.
5. **Nostalgia factor** — Pokemon is universally loved by the 25-40 demographic (exactly the hiring manager age range).
6. **Natural easter eggs** — The game format naturally supports hidden content, rewarding exploration.
7. **Spiritual successor** — Evolves the VSCode portfolio concept. Shows you can execute a themed interactive experience repeatedly, each time more ambitious.
8. **Conversation starter** — In interviews: "Oh you're the one with the Pokemon portfolio!"

### Cons

1. **Accessibility barrier** — The game is fundamentally keyboard/touch-dependent. Screen readers cannot interact with it. The "Read Mode" fallback is essential but means maintaining two UIs.
2. **Time to content** — A recruiter with 30 seconds doesn't want to learn game controls. The fallback nav bar and Read Mode are critical mitigations.
3. **Professionalism concern** — Some hiring managers may see a game and think "toys" rather than "serious engineer." Mitigated by the quality of execution and the Read Mode fallback for formal contexts.
4. **Sprite art dependency** — Pixel art sprites need to be created or sourced. This is an art task, not an engineering task. Adds cost and timeline.
5. **Mobile experience** — Virtual D-pads on mobile are always awkward. The tab bar fallback is necessary.
6. **Maintenance overhead** — Two UIs (game + read mode), game assets, sound files, map data. More things to break.
7. **SEO limitations** — Game content is rendered on canvas, invisible to search engines. Needs server-rendered fallback content for SEO.
8. **Performance on low-end devices** — Canvas rendering at 60fps may struggle on very old phones. Need graceful degradation.
9. **Effort** — Highest effort of any concept (~35 days). The game engine, sprite art, and dual UI multiply the work.

---

## 9. Effort Estimate

| Phase | Task | Days |
|-------|------|------|
| 1 | Astro project setup + Tailwind + font loading | 1 |
| 2 | Game engine: tile renderer, game loop, input handling | 3 |
| 3 | Character sprite + movement + collision detection | 2 |
| 4 | Room design: tile map creation, object placement | 2 |
| 5 | Dialog system: Pokemon-style text boxes | 2 |
| 6 | Start menu: slide-in menu, keyboard navigation | 1 |
| 7 | Content overlays: Pokemon UI frame component | 2 |
| 8 | Projects overlay: card grid, category tabs, type badges | 2 |
| 9 | Papers overlay: Pokedex-style split view | 2 |
| 10 | Blog setup: Content Collections, MDX, bulletin board | 3 |
| 11 | Blog post template: reading layout, HP progress bar | 2 |
| 12 | Resume: Trainer Card design + stat bars | 1.5 |
| 13 | Contact: PokeCenter dialog + form | 1 |
| 14 | Sprite art: character, room objects, NPCs, badges | 3-5 |
| 15 | Object interactions: sparkle, prompts, animations | 2 |
| 16 | Sound design: effects loading, volume control (optional) | 1.5 |
| 17 | Mobile: virtual D-pad, tab bar fallback, touch events | 2 |
| 18 | Read Mode: full fallback layout | 3 |
| 19 | Easter eggs: Konami code, hidden interactions | 1 |
| 20 | SEO: server-rendered content, meta tags, OG images | 1 |
| 21 | RSS feed, sitemap | 0.5 |
| 22 | Polish: cross-browser, Lighthouse, accessibility audit | 2 |
| **Total** | | **~35-38 days** |

### Complexity Breakdown

- **Low complexity**: Contact, Blog cards, RSS, sitemap
- **Medium complexity**: Dialog system, Start menu, overlays, Trainer Card, blog post template
- **High complexity**: Game engine + tile renderer, sprite animation system, room design, Read Mode fallback, mobile virtual controls
- **Art tasks** (non-engineering): Sprite creation, room tileset, badge icons, NPC design

---

## 10. Key Design Decisions to Make

1. **Sprite source**: Commission pixel artist, use open-source assets, or DIY?
2. **Room count**: One room (simpler, all content accessible) or multiple rooms (more exploration, more art needed)?
3. **Sound**: Include audio by default (off), or skip audio entirely?
4. **Read Mode default**: Should first-time visitors see the game or be asked to choose? Mobile-first visitors might prefer Read Mode by default.
5. **Game framework**: Custom engine (~500 LOC, full control) or lightweight library (Kaplay.js — small, TypeScript-native)?
6. **Direct URL routing**: Should `/projects` show the game with the projects overlay pre-opened, or the Read Mode projects page? (Recommendation: overlay pre-opened, with game visible behind it)
7. **Pokemon IP concerns**: Avoid using any actual Pokemon assets or trademarks. Use "inspired by" pixel art style without copying specific Pokemon designs. The menu style and UI frames should be reminiscent but legally distinct.
