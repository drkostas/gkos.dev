# Concept 03: Mission Control

## 1. Concept Overview

**Metaphor:** Your career is a space program. Projects are missions. Papers are transmissions from deep space. Blog posts are flight logs. Skills are systems. Citations are signal strength. GitHub commits are telemetry. The entire portfolio is presented as a NASA/SpaceX-style mission control dashboard with dark backgrounds, grid lines, monospace data readouts, status indicators, and live telemetry panels. Everything is a metric. Everything is monitored. Everything is operational.

**The Wow Factor:** The home page loads as a dashboard with real-time data. A GitHub contribution heatmap updates live. Citation counts tick. Repository stars are displayed as sensor readouts. An uptime counter shows "Days since PhD: 1,096." Project cards have mission status badges (ACTIVE, LAUNCHED, COMPLETE, IN REVIEW). The whole aesthetic screams "this person builds systems that work, and they work right now." Data is not just displayed -- it is celebrated.

**Why it works for the target audience:** Senior MLEs and engineering managers live in dashboards. They monitor models, track experiments, watch metrics. This portfolio speaks their operational language fluently. Recruiters see an immediately impressive, data-rich display that is unlike any other portfolio they have reviewed. The "mission" framing turns a static project list into a narrative of execution and delivery.

---

## 2. Color Palette and Typography

### Colors

```
Background:         #030712  (gray-950 -- near-black with blue undertone)
Surface:            #0f172a  (slate-900 -- panel backgrounds)
Surface Elevated:   #1e293b  (slate-800 -- active panels, hover states)
Grid Lines:         #1e293b  (slate-800 at 40% opacity -- background grid)
Border:             #334155  (slate-700 -- panel borders)
Border Active:      #475569  (slate-600 -- focused panel borders)

Primary Accent:     #22d3ee  (cyan-400 -- primary readouts, active links)
Secondary Accent:   #3b82f6  (blue-500 -- secondary data, chart lines)
Warning:            #f59e0b  (amber-400 -- "in review" status, pending)
Success:            #10b981  (emerald-400 -- "active" / "launched" status)
Danger:             #ef4444  (red-500 -- deprecated, alert states)
Highlight:          #a78bfa  (violet-400 -- special callouts, NeurIPS badge)

Muted Text:         #64748b  (slate-500 -- labels, secondary info)
Body Text:          #cbd5e1  (slate-300 -- primary reading text)
Heading Text:       #f1f5f9  (slate-100 -- headings, important values)
Data Values:        #22d3ee  (cyan-400 -- numbers, metrics, counts)

Status Colors:
  ACTIVE:           #10b981  (emerald)
  LAUNCHED:         #3b82f6  (blue)
  COMPLETE:         #94a3b8  (slate-400)
  IN REVIEW:        #f59e0b  (amber)
  ARCHIVED:         #64748b  (slate-500)
```

### Typography

```
Headings:       "Space Mono", monospace         (NASA-esque, technical, distinctive)
Body:           "IBM Plex Sans", sans-serif     (engineered readability, IBM heritage)
Data/Readouts:  "IBM Plex Mono", monospace      (metrics, code, status readouts)
Labels:         "IBM Plex Sans Condensed"        (compact labels, all-caps)
```

Space Mono for headings gives that unmistakable mission control feel. IBM Plex Sans is the perfect body font -- it was literally designed for engineering contexts. IBM Plex Mono for all data readouts ensures numbers are perfectly aligned and scannable.

---

## 3. Navigation Design

### Desktop Navigation

A top bar styled as a mission control header with system status indicators:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◈ GKOS.DEV           OVERVIEW  MISSIONS  COMMS  LOG  DOSSIER  CONTACT     │
│  ──────────            ════════                                              │
│  SYS:ONLINE  UPTIME:1096d  MISSIONS:25  TRANSMISSIONS:10  SIGNAL:100+cit   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Top row: logo + nav links
- Bottom row: live status ticker showing key metrics
- ◈ is a diamond/hexagon brand mark
- Nav labels use mission control vocabulary:
  - Overview = Home
  - Missions = Projects
  - Comms = Papers/Publications ("communications from the field")
  - Log = Blog ("flight log")
  - Dossier = Resume ("personnel file")
  - Contact = Contact ("establish comms")
- Active page has cyan underline
- Status bar updates values via client-side JS (fetch from GitHub API on load)
- Status bar has a subtle scrolling ticker effect for long values

### Mobile Navigation

- Compact header: logo + hamburger
- Status bar collapses to a single scrolling ticker line
- Hamburger opens a slide-down panel (not full-screen) with nav links
- Mission vocabulary preserved on mobile

---

## 4. Page Designs

### 4.1 Overview (Home Page)

**Layout:** Full dashboard with multiple panels arranged in a grid. Each panel has a title bar, border, and contains different data. The page IS the dashboard -- there is no hero section separate from the content.

**Panels:**
1. **Commander Profile** (top-left): Photo, name, title, brief bio, key links
2. **Mission Status** (top-center): Count of active/launched/complete missions with ring chart
3. **Signal Metrics** (top-right): Citations, h-index, publications count with trend arrows
4. **Featured Missions** (middle): 3 highlighted project cards with status badges
5. **Telemetry** (bottom-left): GitHub contribution calendar heatmap (live data)
6. **Recent Transmissions** (bottom-center): Latest papers with citation counts
7. **Flight Log** (bottom-right): Latest blog posts with dates

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◈ GKOS.DEV           OVERVIEW  MISSIONS  COMMS  LOG  DOSSIER  CONTACT     │
│  SYS:ONLINE  UPTIME:1096d  MISSIONS:25  TRANSMISSIONS:10  SIGNAL:100+cit   │
├──────────────────────────────────────────────────────────────────────────────┤
│  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │
│  ┌─ COMMANDER ──────────┐ ┌─ MISSION STATUS ────┐ ┌─ SIGNAL METRICS ─────┐ │
│  │                      │ │                      │ │                      │ │
│  │  [photo]             │ │      ╭───╮           │ │  CITATIONS     100+  │ │
│  │                      │ │     ╱ 25  ╲          │ │  ──────────── ▲ 12%  │ │
│  │  KOSTAS GEORGIOU     │ │    │ total │         │ │                      │ │
│  │  PhD ML Engineer     │ │     ╲     ╱          │ │  PUBLICATIONS   10   │ │
│  │  Applied Scientist   │ │      ╰───╯           │ │  ──────────── ▲  2   │ │
│  │  Amazon              │ │                      │ │                      │ │
│  │                      │ │  ● ACTIVE      4     │ │  H-INDEX         5   │ │
│  │  [GH] [LI] [GS]     │ │  ● LAUNCHED    6     │ │                      │ │
│  │                      │ │  ● COMPLETE   12     │ │  TOP VENUE           │ │
│  │                      │ │  ○ IN REVIEW   3     │ │  NeurIPS 2023        │ │
│  │                      │ │                      │ │                      │ │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ │
│  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │
│  ┌─ FEATURED MISSIONS ───────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌─────────────────────┐┌─────────────────────┐┌─────────────────────┐│  │
│  │  │ ● ACTIVE            ││ ● COMPLETE          ││ ● LAUNCHED          ││  │
│  │  │ FleetSmart.ai       ││ Cross-Scale MAE     ││ MEDiC               ││  │
│  │  │                     ││                     ││                     ││  │
│  │  │ AI fleet management ││ NeurIPS 2023        ││ CLIP distillation   ││  │
│  │  │ platform            ││ 54 citations        ││ framework           ││  │
│  │  │                     ││                     ││                     ││  │
│  │  │ FastAPI Next GCP    ││ PyTorch MAE SSL     ││ PyTorch CLIP HF     ││  │
│  │  │       [LAUNCH →]    ││     [PAPER →]       ││  [CODE →] [HF →]   ││  │
│  │  └─────────────────────┘└─────────────────────┘└─────────────────────┘│  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │
│  ┌─ TELEMETRY ──────────────────┐ ┌─ RECENT COMMS ──┐ ┌─ FLIGHT LOG ────┐ │
│  │                              │ │                  │ │                  │ │
│  │  GitHub Contributions 2026   │ │ NeurIPS 2023     │ │ Understanding    │ │
│  │                              │ │ Cross-Scale MAE  │ │ SSL for Remote   │ │
│  │  ░░▓▓░▓▓░░▓▓▓░░▓░░░▓▓▓▓▓▓  │ │ 54 citations     │ │ Sensing          │ │
│  │  ▓▓▓▓░▓▓▓░▓▓▓▓░▓▓░░▓▓▓▓▓▓  │ │ ─────────────── │ │ Apr 2 · 12 min  │ │
│  │  ░▓▓▓░░▓▓░▓░▓▓░▓▓▓░▓▓▓▓░▓  │ │ WACV 2023       │ │ ──────────────── │ │
│  │  ▓▓░▓▓░▓▓░░▓▓░░▓▓▓░░▓▓▓▓▓  │ │ Semantic Seg.   │ │ Building         │ │
│  │  ░░▓▓▓░░▓░░▓▓▓░▓▓▓░▓▓▓░░▓  │ │ 31 citations    │ │ FleetSmart       │ │
│  │  ▓░░▓▓░▓▓▓░▓▓▓░░▓▓░▓▓▓▓░░  │ │ ─────────────── │ │ Mar 15 · 8 min  │ │
│  │  ░▓▓░▓░▓░▓░▓░▓▓░▓▓░░░░░░░  │ │ IGARSS 2024     │ │ ──────────────── │ │
│  │                              │ │ Koopman-Based    │ │ Constraint       │ │
│  │  Jan      Apr      Jul       │ │ Transition Det.  │ │ Programming      │ │
│  │  2,847 contributions         │ │ 0 citations      │ │ Jan 20 · 10 min  │ │
│  │                              │ │                  │ │                  │ │
│  └──────────────────────────────┘ └──────────────────┘ └──────────────────┘ │
│  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │
│                                                                              │
│  ◈ GKOS.DEV · EST. 2018 · [GH] [LI] [GS] [HF] · ALL SYSTEMS NOMINAL      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Missions (Projects Page)

**Layout:**
- Mission log table header with filter controls
- Filter by status: ALL, ACTIVE, LAUNCHED, COMPLETE, IN REVIEW, ARCHIVED
- Filter by system: ML, PRODUCT, LIBRARY, BOT, OTHER
- Projects displayed as mission cards in a responsive grid
- Each card has: status badge, mission name, brief, system tags, action buttons
- Optional: "Mission Briefing" detail view when clicking a card (expands inline or navigates to detail page)

**Mission Card:**
```
┌─ MISSION: FLEETSMART ─────────────────┐
│ STATUS: ● ACTIVE                       │
│ CLASSIFICATION: PRODUCT                │
│ ──────────────────────────────────────│
│ AI-powered fleet management platform   │
│ for vessel tracking, compliance        │
│ monitoring, and operational analytics. │
│                                        │
│ SYSTEMS: FastAPI · Next.js · GCP · LLM │
│                                        │
│              [LAUNCH →]                │
└────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◈ GKOS.DEV           OVERVIEW  MISSIONS  COMMS  LOG  DOSSIER  CONTACT     │
│  SYS:ONLINE  UPTIME:1096d  MISSIONS:25  TRANSMISSIONS:10  SIGNAL:100+cit   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ MISSION LOG ─────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  STATUS: [ALL] [●ACT] [●LNC] [●CMP] [○REV] [○ARC]                   │  │
│  │  SYSTEM: [ALL] [ML] [PRODUCT] [LIBRARY] [BOT] [OTHER]                │  │
│  │                                                              25 total │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │
│  │ ● ACTIVE             │ │ ● LAUNCHED           │ │ ● LAUNCHED           │ │
│  │ PRODUCT              │ │ ML RESEARCH          │ │ ML RESEARCH          │ │
│  │ ────────────────────│ │ ────────────────────│ │ ────────────────────│ │
│  │ FleetSmart.ai        │ │ MEDiC                │ │ MaskDistill-PyTorch  │ │
│  │                      │ │                      │ │                      │ │
│  │ AI fleet management  │ │ Multi-objective CLIP │ │ First open PyTorch   │ │
│  │ platform for vessel  │ │ distillation. 85.07% │ │ repro of MaskDistill │ │
│  │ tracking & compliance│ │ finetune accuracy.   │ │ with pre-trained wts.│ │
│  │                      │ │                      │ │                      │ │
│  │ FastAPI Next GCP LLM │ │ PyTorch SSL CLIP HF  │ │ PyTorch SSL CLIP HF  │ │
│  │                      │ │                      │ │                      │ │
│  │     [LAUNCH →]       │ │  [CODE →]  [HF →]   │ │  [CODE →]  [HF →]   │ │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ │
│                                                                              │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │
│  │ ● ACTIVE             │ │ ● ACTIVE             │ │ ● LAUNCHED           │ │
│  │ PRODUCT              │ │ PRODUCT              │ │ PRODUCT              │ │
│  │ ────────────────────│ │ ────────────────────│ │ ────────────────────│ │
│  │ ShiftMD              │ │ XpensAI              │ │ Soma                 │ │
│  │                      │ │                      │ │                      │ │
│  │ Constraint prog.     │ │ AI expense mgmt with │ │ Health dashboard     │ │
│  │ scheduling for       │ │ automated receipt    │ │ aggregating Garmin,  │ │
│  │ medical departments. │ │ scanning and OCR.    │ │ Strava, and Hevy.    │ │
│  │                      │ │                      │ │                      │ │
│  │ Next.js Python ORT   │ │ Python AWS Azure GPT │ │ Python Next.js       │ │
│  │                      │ │                      │ │                      │ │
│  │                      │ │     [LAUNCH →]       │ │  [CODE →] [DEMO →]  │ │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ │
│                                                                              │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │
│  │ ● COMPLETE           │ │ ● COMPLETE           │ │ ● COMPLETE           │ │
│  │ ML RESEARCH          │ │ ML RESEARCH          │ │ ML RESEARCH          │ │
│  │ ────────────────────│ │ ────────────────────│ │ ────────────────────│ │
│  │ Cross-Scale MAE      │ │ Minecraft AI         │ │ 3D Semantic Seg.     │ │
│  │                      │ │                      │ │                      │ │
│  │ NeurIPS 2023         │ │ RL agent for maze    │ │ Transformers on 3D   │ │
│  │ 54 citations         │ │ missions in MC.      │ │ medical images.      │ │
│  │                      │ │                      │ │                      │ │
│  │ PyTorch MIM CV       │ │ PyTorch RL MC        │ │ PyTorch SegFormer    │ │
│  │                      │ │                      │ │                      │ │
│  │ [PAPER →] [CODE →]  │ │     [CODE →]         │ │     [CODE →]         │ │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ │
│                                                                              │
│  ... more missions below ...                                                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Comms (Papers / Publications Page)

**Layout:**
- "Communications Log" framing
- Top: signal metrics panel (total transmissions, aggregate signal strength/citations, venues reached)
- Papers displayed as "incoming transmissions" in a list format
- Each transmission has: timestamp (year), source (conference), signal strength (citations), message (title), and actions (links)
- Expandable abstract on click
- Conference badges styled as signal source identifiers with color codes

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◈ GKOS.DEV           OVERVIEW  MISSIONS  COMMS  LOG  DOSSIER  CONTACT     │
│  SYS:ONLINE  UPTIME:1096d  MISSIONS:25  TRANSMISSIONS:10  SIGNAL:100+cit   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ COMMUNICATIONS LOG ──────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  TRANSMISSIONS: 10     SIGNAL STRENGTH: 100+ citations                │  │
│  │  VENUES REACHED: NeurIPS · WACV · IGARSS · ECCV · IEEE/ACM · MDPI    │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ─── INCOMING TRANSMISSIONS ─────────────────────────────────────────────── │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2026 │ ECCV        │ ○ IN REVIEW │ SIGNAL: ---                       │  │
│  │      │             │             │                                    │  │
│  │      │ ExPLoRe: Exploration-driven Pre-training for Long-range       │  │
│  │      │ Remote Sensing                                                │  │
│  │      │                                                    [PAPER →]  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2026 │ arXiv       │ ● LAUNCHED  │ SIGNAL: 0 ░░░░░░░░░░             │  │
│  │      │             │             │                                    │  │
│  │      │ MEDiC: Multi-objective Exploration of Distillation from CLIP  │  │
│  │      │                                          [PAPER →] [CODE →]   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2024 │ IGARSS      │ ● COMPLETE  │ SIGNAL: 0 ░░░░░░░░░░             │  │
│  │      │             │             │                                    │  │
│  │      │ Koopman-Based Transition Detection in Satellite Imagery:      │  │
│  │      │ Unveiling Construction Phase Dynamics Through Material        │  │
│  │      │ Histogram Analysis                                            │  │
│  │      │                                                    [PAPER →]  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2023 │ NeurIPS     │ ● COMPLETE  │ SIGNAL: 54 ▓▓▓▓▓▓▓▓▓░           │  │
│  │      │             │             │                                    │  │
│  │      │ Cross-Scale MAE: A Tale of Multiscale Exploitation in         │  │
│  │      │ Remote Sensing                                                │  │
│  │      │                                                               │  │
│  │      │ Remote sensing images present unique challenges to image      │  │
│  │      │ analysis due to the extensive geographic coverage, hardware   │  │
│  │      │ limitations, and misaligned multi-scale images...             │  │
│  │      │                                          [PAPER →] [CODE →]   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2023 │ WACV        │ ● COMPLETE  │ SIGNAL: 31 ▓▓▓▓▓▓░░░░           │  │
│  │      │             │             │                                    │  │
│  │      │ Semantic segmentation in aerial imagery using multi-level     │  │
│  │      │ contrastive learning with local consistency                   │  │
│  │      │                                                    [PAPER →]  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2019 │ MDPI Algo.  │ ● COMPLETE  │ SIGNAL: 3 ░░░░░░░░░░             │  │
│  │      │             │             │                                    │  │
│  │      │ A distributed hybrid community detection methodology for      │  │
│  │      │ social networks                                               │  │
│  │      │                                                    [PAPER →]  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ─── END OF LOG ─────────────────────────────────────────────────────────── │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Log (Blog Index Page)

**Layout:**
- "Flight Log" framing
- Entries styled as log entries with timestamps, mission references, and entry IDs
- Each entry: log number, date, title, reading time, brief excerpt, tags
- Entries are full-width rows (not cards) for a log-like sequential feel
- Filter by tag in a compact bar at top
- Chronological order (newest first)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◈ GKOS.DEV           OVERVIEW  MISSIONS  COMMS  LOG  DOSSIER  CONTACT     │
│  SYS:ONLINE  UPTIME:1096d  MISSIONS:25  TRANSMISSIONS:10  SIGNAL:100+cit   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ FLIGHT LOG ──────────────────────────────────────────────────────────┐  │
│  │  Operational notes, technical analysis, and mission debriefs.         │  │
│  │                                                                       │  │
│  │  TAGS: [ALL] [ssl] [remote-sensing] [deployment] [pytorch] [career]  │  │
│  │                                                         12 entries    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ LOG-012 │ 2026-04-02 │ 12 MIN READ │ REFS: Cross-Scale MAE, MEDiC   │  │
│  │ ──────────────────────────────────────────────────────────────────── │  │
│  │                                                                       │  │
│  │ Understanding Self-Supervised Learning for Remote Sensing             │  │
│  │                                                                       │  │
│  │ A deep dive into how SSL methods like MAE and CLIP distillation are  │  │
│  │ transforming representation learning for satellite imagery. From      │  │
│  │ pre-training strategies to downstream task evaluation.                │  │
│  │                                                                       │  │
│  │ #self-supervised #remote-sensing #pytorch #computer-vision            │  │
│  │                                                         [READ →]     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ LOG-011 │ 2026-03-15 │ 8 MIN READ │ REFS: FleetSmart.ai             │  │
│  │ ──────────────────────────────────────────────────────────────────── │  │
│  │                                                                       │  │
│  │ Building FleetSmart: Lessons from Shipping Production ML              │  │
│  │                                                                       │  │
│  │ How we designed, trained, and deployed ML models for real-time fleet  │  │
│  │ management. Covering data pipelines, model serving, and monitoring.   │  │
│  │                                                                       │  │
│  │ #deployment #ml-systems #fastapi #production                          │  │
│  │                                                         [READ →]     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ LOG-010 │ 2026-02-28 │ 6 MIN READ │ REFS: None                       │  │
│  │ ──────────────────────────────────────────────────────────────────── │  │
│  │                                                                       │  │
│  │ Why I Open-Source My Research Implementations                         │  │
│  │                                                                       │  │
│  │ The case for releasing code alongside papers, and how publishing     │  │
│  │ reproducible implementations improves your research and career.       │  │
│  │                                                                       │  │
│  │ #open-source #research #career                                        │  │
│  │                                                         [READ →]     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ... more entries ...                                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Log Entry (Blog Post Page)

**Layout:**
- Log entry header with metadata in a structured panel
- Article body in a readable column (max-width ~720px)
- Right sidebar: "Related Missions" and "Related Comms" -- links to projects and papers mentioned
- Code blocks styled as "terminal readouts" with green-on-dark coloring option (or standard syntax highlighting)
- Reading progress displayed as a percentage readout in the nav bar: "LOG-012: 58% COMPLETE"

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◈ GKOS.DEV           OVERVIEW  MISSIONS  COMMS  LOG  DOSSIER  CONTACT     │
│  LOG-012: ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░ 58% READ   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ LOG ENTRY ───────────────────────────────────┐  ┌─ RELATED ───────────┐│
│  │                                               │  │                     ││
│  │  ID:      LOG-012                             │  │  MISSIONS:          ││
│  │  DATE:    2026-04-02                          │  │  · Cross-Scale MAE  ││
│  │  AUTHOR:  K. Georgiou                         │  │  · MEDiC            ││
│  │  READ:    12 min                              │  │  · MaskDistill      ││
│  │  TAGS:    ssl, remote-sensing, pytorch        │  │                     ││
│  │  REFS:    Cross-Scale MAE, MEDiC              │  │  COMMS:             ││
│  │                                               │  │  · NeurIPS 2023     ││
│  └───────────────────────────────────────────────┘  │  · WACV 2023        ││
│                                                      │  · arXiv MEDiC      ││
│  Understanding Self-Supervised Learning              │                     ││
│  for Remote Sensing                                  │                     ││
│  ══════════════════════════════════════               │                     ││
│                                                      │                     ││
│  Self-supervised learning has fundamentally          │                     ││
│  changed how we approach representation              │                     ││
│  learning in computer vision. In the domain          │                     ││
│  of remote sensing, the challenges are               │                     ││
│  uniquely demanding: images span massive             │                     ││
│  geographic areas, come from varied sensors,         │                     ││
│  and exhibit complex multi-scale patterns.           │                     ││
│                                                      │                     ││
│  ## The Masked Image Modeling Paradigm               │                     ││
│                                                      │                     ││
│  The core idea is elegant: mask a large              │                     ││
│  portion of an image (typically 75%) and             │                     ││
│  train a model to reconstruct it.                    │                     ││
│                                                      │                     ││
│  ┌─ TERMINAL ──────────────────────────┐  [COPY]    │                     ││
│  │ $ python train.py                   │            │                     ││
│  │                                     │            │                     ││
│  │ import torch                        │            │                     ││
│  │ from mae import CrossScaleMAE       │            │                     ││
│  │                                     │            │                     ││
│  │ model = CrossScaleMAE(              │            │                     ││
│  │     encoder_dim=768,                │            │                     ││
│  │     mask_ratio=0.75                 │            │                     ││
│  │ )                                   │            │                     ││
│  └─────────────────────────────────────┘            │                     ││
│                                                      │                     ││
│  ## Results                                          │                     ││
│                                                      │                     ││
│  ┌─ DATA READOUT ──────────────────────┐            │                     ││
│  │ METHOD        TOP-1   kNN    mIoU   │            │                     ││
│  │ ─────────── ─────── ────── ──────  │            │                     ││
│  │ MAE           83.6%  71.2%  45.1   │            │                     ││
│  │ Scale-MAE     84.1%  72.0%  46.3   │            │                     ││
│  │ Ours (CS-MAE) 85.1%  73.9%  48.7   │            └─────────────────────┘│
│  └─────────────────────────────────────┘                                   │
│                                                                              │
│  ─── END OF LOG ENTRY ──────────────────────────────────────────────────── │
│                                                                              │
│  ┌─ AUTHOR ──────────────────────────────────────────────────────────────┐ │
│  │  K. GEORGIOU · PhD ML Engineer · Applied Scientist, Amazon           │ │
│  │  [GITHUB →]  [SCHOLAR →]  [LINKEDIN →]                               │ │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ COMMENTS ────────────────────────────────────────────────────────────┐ │
│  │  Authenticate via GitHub to transmit.                                 │ │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.6 Dossier (Resume Page)

**Layout:**
- "Personnel Dossier" framing
- Structured like a military/agency personnel file
- Sections: IDENTIFICATION, SERVICE RECORD (experience), TRAINING (education), CAPABILITIES (skills), COMMUNICATIONS (publications summary), CLEARANCE (certifications/access)
- Monospace data layout for all fields
- Download button styled as "EXPORT DOSSIER [PDF]"
- Toggle between interactive and PDF view

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◈ GKOS.DEV           OVERVIEW  MISSIONS  COMMS  LOG  DOSSIER  CONTACT     │
│  SYS:ONLINE  UPTIME:1096d  MISSIONS:25  TRANSMISSIONS:10  SIGNAL:100+cit   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ PERSONNEL DOSSIER ───────────────────────────────────── [EXPORT PDF] ┐  │
│  │                                                                       │  │
│  │  ┌─ IDENTIFICATION ──────────────────────────────────────────────┐    │  │
│  │  │  NAME:       Kostas Georgiou                                  │    │  │
│  │  │  CALLSIGN:   drkostas                                         │    │  │
│  │  │  TITLE:      Applied Scientist                                │    │  │
│  │  │  ORG:        Amazon                                           │    │  │
│  │  │  STATUS:     ● ACTIVE                                         │    │  │
│  │  │  CLEARANCE:  PhD, Computer Science                            │    │  │
│  │  └───────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  │  ┌─ SERVICE RECORD ──────────────────────────────────────────────┐    │  │
│  │  │                                                                │    │  │
│  │  │  2023-PRESENT  Applied Scientist                               │    │  │
│  │  │                Amazon                                          │    │  │
│  │  │                Large-scale ML systems and applied research.    │    │  │
│  │  │                SYSTEMS: PyTorch, AWS, Large-Scale ML           │    │  │
│  │  │                                                                │    │  │
│  │  │  2018-2023     Graduate Research Assistant                     │    │  │
│  │  │                University of Tennessee, Knoxville              │    │  │
│  │  │                PhD research in self-supervised learning for    │    │  │
│  │  │                remote sensing. Published at NeurIPS, WACV,     │    │  │
│  │  │                IGARSS. Teaching assistant for CS courses.       │    │  │
│  │  │                SYSTEMS: PyTorch, Computer Vision, SSL          │    │  │
│  │  │                                                                │    │  │
│  │  └────────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  │  ┌─ TRAINING ────────────────────────────────────────────────────┐    │  │
│  │  │                                                                │    │  │
│  │  │  PhD    Computer Science    U. of Tennessee       2018-2023   │    │  │
│  │  │         Self-Supervised Learning for Remote Sensing            │    │  │
│  │  │                                                                │    │  │
│  │  │  BSc    Computer Science    AUTH, Greece           2012-2018   │    │  │
│  │  │                                                                │    │  │
│  │  └────────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  │  ┌─ CAPABILITIES ───────────────────────────────────────────────┐     │  │
│  │  │                                                               │     │  │
│  │  │  ML/DL:      PyTorch · TensorFlow · HuggingFace · SSL · CV  │     │  │
│  │  │  BACKEND:    Python · FastAPI · Node.js · PostgreSQL          │     │  │
│  │  │  CLOUD:      AWS · GCP · Azure · Docker · Kubernetes          │     │  │
│  │  │  FRONTEND:   Next.js · React · TypeScript                     │     │  │
│  │  │  RESEARCH:   NeurIPS · WACV · IGARSS · 100+ citations       │     │  │
│  │  │                                                               │     │  │
│  │  └───────────────────────────────────────────────────────────────┘     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.7 Contact (Establish Comms)

**Layout:**
- "Establish Communications" heading
- Styled as a communications interface
- Left: "Frequency" links (social channels) displayed as radio frequency readouts
- Right: "Transmit" form (contact form) styled as a message composition terminal
- Status indicators next to each channel (green = active)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◈ GKOS.DEV           OVERVIEW  MISSIONS  COMMS  LOG  DOSSIER  CONTACT     │
│  SYS:ONLINE  UPTIME:1096d  MISSIONS:25  TRANSMISSIONS:10  SIGNAL:100+cit   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ ESTABLISH COMMUNICATIONS ────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Open to interesting conversations about ML, research,                │  │
│  │  or collaboration opportunities.                                      │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ FREQUENCIES ────────────────┐  ┌─ TRANSMIT MESSAGE ──────────────────┐ │
│  │                              │  │                                      │ │
│  │  CH-01  GitHub        ● ON  │  │  FROM:                               │ │
│  │  ──────────────────────────  │  │  ┌──────────────────────────────┐   │ │
│  │  github.com/drkostas         │  │  │ Name                         │   │ │
│  │                              │  │  └──────────────────────────────┘   │ │
│  │  CH-02  LinkedIn      ● ON  │  │                                      │ │
│  │  ──────────────────────────  │  │  RETURN FREQ:                       │ │
│  │  linkedin.com/in/drkostas   │  │  ┌──────────────────────────────┐   │ │
│  │                              │  │  │ Email                        │   │ │
│  │  CH-03  Scholar       ● ON  │  │  └──────────────────────────────┘   │ │
│  │  ──────────────────────────  │  │                                      │ │
│  │  Google Scholar profile      │  │  SUBJECT:                            │ │
│  │                              │  │  ┌──────────────────────────────┐   │ │
│  │  CH-04  HuggingFace   ● ON  │  │  │ Subject                      │   │ │
│  │  ──────────────────────────  │  │  └──────────────────────────────┘   │ │
│  │  huggingface.co/drkostas     │  │                                      │ │
│  │                              │  │  MESSAGE:                            │ │
│  │  CH-05  Email         ● ON  │  │  ┌──────────────────────────────┐   │ │
│  │  ──────────────────────────  │  │  │                              │   │ │
│  │  kgeorgio@vols.utk.edu      │  │  │                              │   │ │
│  │                              │  │  │                              │   │ │
│  │                              │  │  │                              │   │ │
│  │  ALL CHANNELS NOMINAL        │  │  └──────────────────────────────┘   │ │
│  │                              │  │                                      │ │
│  │                              │  │           [ TRANSMIT → ]             │ │
│  │                              │  │                                      │ │
│  └──────────────────────────────┘  └──────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Interactive Elements and Animations

### Dashboard Feel

- **Background grid:** Faint dot grid or line grid across the entire page (CSS background-image, repeating pattern). Gives that "control room display" feel without being distracting.
- **Panel borders:** Panels have a 1px border that subtly pulses (opacity 0.4 to 0.7) when data inside updates. Very subtle -- conveys "this is alive."
- **Status indicators:** Small colored dots (8px) that occasionally blink to simulate real-time monitoring.

### Live Data

- **GitHub contributions:** Fetched client-side on page load, rendered as heatmap in the Telemetry panel. Updates every 30 seconds via ISR in Astro.
- **Uptime counter:** JavaScript counter that calculates days since PhD completion (or career start) and ticks up in real time.
- **Citation counts:** Pulled from Google Scholar (via a build-time scrape or manual JSON update) and displayed with trend arrows.
- **Commit count:** Last 365 days of GitHub contributions, auto-refreshed.

### Animations

- **Page load:** Panels appear sequentially with a staggered fade-in (50ms delay between each). Simulates a dashboard "booting up."
- **Number counters:** Count up from 0 to final value when scrolling into view (1s duration, ease-out).
- **Status badges:** Subtle pulse animation on ACTIVE badges (scale 1.0 to 1.05, repeating).
- **Signal strength bars:** Animate from left to right like a loading bar when the paper row scrolls into view.
- **Log entry hover:** Border brightens from slate-700 to cyan-400/20%. Subtle left-border highlight.
- **Navigation transitions:** Quick cross-fade between pages (200ms). Status bar metrics may "flicker" briefly during transition (simulating a dashboard refresh).

### Micro-interactions

- **Mission cards:** Slight elevation increase on hover (box-shadow grows). Status badge brightens.
- **Transmission rows:** Left border changes from transparent to cyan on hover.
- **Tags:** Background fill from transparent to slate-800 on hover.
- **Buttons:** Cyan text with arrow that slides right 4px on hover.
- **Panel title bars:** Subtle background gradient appears on hover.

### Background Ambient Effects

- **Scanline effect (optional):** Very faint horizontal scanlines overlaid on the background (CSS pseudo-element). Can be toggled off in settings.
- **CRT glow (optional):** Very subtle vignette effect at screen edges. Adds to the control room feel without being gimmicky.

---

## 6. Mobile Adaptation

### Dashboard on Mobile

The dashboard grid collapses to a single column. Panels stack vertically in priority order:
1. Commander Profile (compact: name, title, links in one row)
2. Mission Status (compact: 4 numbers in a row)
3. Featured Missions (horizontally scrollable card row)
4. Signal Metrics (compact: inline numbers)
5. Telemetry (GitHub heatmap, horizontally scrollable)
6. Recent Comms (2 latest, truncated)
7. Flight Log (2 latest, truncated)

### Layout Changes

- **Navigation:** Compact header with logo + hamburger. Status bar becomes a single scrolling ticker.
- **Mission cards:** Full width, single column.
- **Transmission rows:** Stacked layout (metadata on top, title below, links below that).
- **Log entries:** Full width, metadata stacked above title.
- **Dossier:** All sections stacked, full width. Labels above values instead of beside.
- **Contact:** Stacked (frequencies on top, form below).

### Mobile-Specific Touches

- The dot grid background is removed below 768px (cleaner, better performance).
- Panel borders are simplified (solid, no pulse animation).
- Status indicators still blink (they are tiny, no performance cost).
- Scanline effect disabled on mobile.

### Performance

- All panels render as static HTML via Astro SSG.
- Only the GitHub heatmap and uptime counter need client-side JS.
- Total interactive JS: under 30KB gzipped (no Three.js, no heavy libraries).
- This is the lightest concept of the three.

---

## 7. Tech Requirements

### Framework and Build

```
Astro 4.x                -- Static site generator
  @astrojs/react          -- React islands for interactive widgets
  @astrojs/mdx            -- Blog posts
  @astrojs/sitemap         -- SEO
  astro-icon               -- Icons
```

### Animation

```
gsap 3.x                  -- Number counters, staggered panel reveals, scroll triggers
  ScrollTrigger           -- Scroll-linked animations
```

No Three.js needed. No heavy animation libraries. GSAP is optional and could be replaced with CSS animations + Intersection Observer for an even lighter build.

### Styling

```
Tailwind CSS 4.x           -- Utility-first styling
  @tailwindcss/typography   -- Blog post prose
```

### Fonts

```
Space Mono                  -- From Google Fonts (headings, labels)
IBM Plex Sans               -- From Google Fonts (body text)
IBM Plex Mono               -- From Google Fonts (data readouts, code)
IBM Plex Sans Condensed     -- From Google Fonts (compact labels)
```

### Content and Data

```
Astro Content Collections   -- Blog posts, projects, papers
  Zod schemas               -- Validation
  MDX                       -- Blog format
KaTeX                       -- Math
shiki                       -- Code highlighting
```

### Live Data

```
GitHub REST API             -- Contributions, repo stats (fetched at build time + client hydration)
  octokit                   -- GitHub API client
react-github-calendar      -- GitHub contribution heatmap component (or custom)
```

### Deployment

```
Vercel                      -- Hosting
  @astrojs/vercel           -- Adapter (for API routes / contact form)
  Vercel Analytics
  Vercel Speed Insights
  Vercel Cron Jobs          -- Optional: scheduled rebuild to refresh GitHub data
```

### Astro Island Architecture

```
Static (no JS):
  - Navigation bar (CSS-only mobile menu)
  - All panel layouts, borders, grid lines
  - Project/mission cards
  - Paper/transmission rows
  - Blog/log entries
  - Resume/dossier content
  - Footer

React Islands (client:load):
  - UptimeCounter          -- Ticking uptime display
  - GitHubHeatmap          -- Contribution calendar

React Islands (client:visible):
  - ContactForm            -- Form with validation
  - CodeBlock              -- Copy button
  - GiscusComments         -- Blog comments
  - PDFViewer              -- Resume PDF embed

React Islands (client:idle):
  - StatusTicker           -- Nav bar status updates
```

This is the lightest concept architecturally. The "dashboard" look is achieved almost entirely through CSS (grid layouts, borders, monospace fonts, colors). The only dynamic elements are the GitHub data and the uptime counter.

---

## 8. Detailed ASCII Mockups

(See Section 4 above -- every page has a detailed ASCII mockup.)

Additional mockup -- the mobile overview dashboard:

```
┌──────────────────────────────┐
│ ◈ GKOS.DEV              [=] │
│ SYS:ONLINE · UPTIME:1096d   │
├──────────────────────────────┤
│ ·  ·  ·  ·  ·  ·  ·  ·  ·  │
│                              │
│ ┌─ COMMANDER ──────────────┐ │
│ │ KOSTAS GEORGIOU          │ │
│ │ PhD · Applied Scientist  │ │
│ │ Amazon                   │ │
│ │ [GH] [LI] [GS] [HF]    │ │
│ └──────────────────────────┘ │
│                              │
│ ┌─ STATUS ─────────────────┐ │
│ │ MISSIONS  COMMS  SIGNAL  │ │
│ │    25       10    100+   │ │
│ │ ●ACT:4  ●LNC:6  ●CMP:12│ │
│ └──────────────────────────┘ │
│                              │
│ ┌─ FEATURED MISSIONS ──── →│ │
│ │                            │
│ │ ┌──────────┐┌──────────┐  │
│ │ │ ● ACTIVE ││ ● COMP.  │  │
│ │ │ Fleet-   ││ Cross-   │  │
│ │ │ Smart.ai ││ Scale MAE│  │
│ │ │          ││ NeurIPS  │  │
│ │ │ [LAUNCH] ││ [PAPER]  │  │
│ │ └──────────┘└──────────┘  │
│ │                        →  │
│ └───────────────────────────┘│
│                              │
│ ┌─ TELEMETRY ──────────────┐ │
│ │ GitHub 2026              │ │
│ │ ░▓▓░▓░▓▓▓▓░▓▓░▓▓▓▓▓▓▓▓  │ │
│ │ ▓▓▓▓░▓▓▓░▓▓▓▓░▓▓░░▓▓▓▓  │ │
│ │ ░▓▓▓░░▓▓░▓░▓▓░▓▓▓░▓▓▓▓  │ │
│ │ 2,847 contributions     │ │
│ └──────────────────────────┘ │
│                              │
│ ┌─ RECENT COMMS ───────────┐ │
│ │ NeurIPS 2023      54 ★   │ │
│ │ Cross-Scale MAE          │ │
│ │ ─────────────────────── │ │
│ │ WACV 2023         31 ★   │ │
│ │ Semantic Seg.            │ │
│ └──────────────────────────┘ │
│                              │
│ ┌─ FLIGHT LOG ─────────────┐ │
│ │ LOG-012 · Apr 2 · 12min  │ │
│ │ Understanding SSL for    │ │
│ │ Remote Sensing           │ │
│ │ ─────────────────────── │ │
│ │ LOG-011 · Mar 15 · 8min  │ │
│ │ Building FleetSmart      │ │
│ └──────────────────────────┘ │
│                              │
│ ◈ · ALL SYSTEMS NOMINAL     │
│                              │
└──────────────────────────────┘
```

### Status Badge Legend (Reference)

```
 ● ACTIVE     -- Currently being developed or maintained
 ● LAUNCHED   -- Deployed/released and in production
 ● COMPLETE   -- Finished, not actively maintained
 ○ IN REVIEW  -- Paper under review, or pre-release
 ○ ARCHIVED   -- Deprecated or no longer relevant
```

---

## 9. Pros and Cons

### Pros

1. **Data-forward storytelling.** Every metric is visible. Citations, stars, contributions, uptime -- the portfolio tells a quantitative story that resonates with data-oriented audiences.
2. **Memorable vocabulary.** "Missions," "transmissions," "flight log," "dossier" -- the consistent metaphor is fun, distinctive, and creates a cohesive narrative. People will remember "the space mission portfolio."
3. **Works with sparse content.** Even with 2-3 blog posts, the dashboard looks full because it aggregates data from many sources (GitHub, papers, projects). The panels always have something to show.
4. **Lightest build.** No Three.js, no complex Canvas rendering. The dashboard aesthetic is achieved with CSS grids, borders, and monospace fonts. Near-perfect Lighthouse scores.
5. **Live data differentiation.** Real GitHub stats and ticking counters make this feel alive. Most portfolios are static snapshots. This one updates.
6. **Natural status communication.** The mission status badges (ACTIVE, LAUNCHED, COMPLETE, IN REVIEW) give instant context about each project's state -- something most portfolios fail to communicate.
7. **Strong mobile layout.** The panel-based design stacks cleanly into a single column. The dashboard metaphor works on small screens as a vertical feed.

### Cons

1. **Thematic commitment.** The mission control vocabulary (COMMS, DOSSIER, TRANSMIT) might feel gimmicky to some visitors. If someone finds it corny, the whole site suffers. No way to "partially" use the metaphor.
2. **Readability trade-off.** Monospace fonts for headings and heavy use of all-caps labels can reduce reading comfort, especially for longer blog posts. The blog post page needs to dial back the dashboard aesthetic for readability.
3. **Data accuracy burden.** Showing "live" metrics means they need to be accurate. Stale citation counts or incorrect GitHub stats would undermine the "operational monitoring" promise. Needs regular data refreshes.
4. **Not minimalist.** Compared to The Tensor concept, this is visually busier. More borders, more panels, more data. Some hiring managers prefer clean and simple.
5. **Overused aesthetic risk.** The "dark dashboard with monospace fonts" look has been done before (admin panels, hacker news clones, terminal-themed sites). The mission control framing differentiates it, but the base aesthetic is not wholly original.
6. **Blog reading experience.** The dashboard frame (navigation, status bar, grid background) could feel noisy around long-form prose content. The blog post page needs to be a calmer environment, which means the dashboard aesthetic must be suppressed -- creating a slight identity inconsistency.

---

## 10. Effort Estimate

| Task | Estimate |
|------|----------|
| Astro project setup, Tailwind, routing, fonts | 4 hours |
| Navigation + status ticker component | 4 hours |
| Dashboard grid layout system (reusable panels) | 5 hours |
| Background grid pattern (CSS) | 1 hour |
| Home page dashboard (7 panels) | 8 hours |
| GitHub heatmap integration | 3 hours |
| Uptime counter + live metrics | 2 hours |
| Missions page (filters, status badges, cards) | 5 hours |
| Comms page (transmission list, signal bars) | 4 hours |
| Flight Log index page | 3 hours |
| Log Entry (blog post) template + MDX | 5 hours |
| Dossier page (structured resume) | 4 hours |
| Contact page (frequencies + form) | 3 hours |
| GSAP scroll animations (panel reveals, counters) | 3 hours |
| Status badge system + pulse animations (CSS) | 2 hours |
| Mobile responsive pass | 5 hours |
| Accessibility audit | 2 hours |
| Content migration + status assignment | 3 hours |
| Performance optimization | 2 hours |
| Testing, polish, deploy | 3 hours |
| **Total** | **~70-75 hours** |

This is the fastest concept to build. The visual complexity comes from CSS and typography, not from JavaScript or 3D rendering. The panel layout system, once built, can be reused everywhere. The main engineering effort is in the GitHub data integration and the dashboard home page layout.
