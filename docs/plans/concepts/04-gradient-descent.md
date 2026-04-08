# Concept 04: The Gradient Descent

**Status:** Draft  
**Author:** Kostas Georgiou  
**Date:** 2026-04-06  
**Framework:** Astro + Three.js + GSAP  
**Theme:** Dark

---

## 1. Concept Overview

### The Metaphor

Your career IS gradient descent. Every decision, every project, every paper is a step down a loss landscape toward a better solution. The portfolio tells this story literally: a 3D loss landscape lives in the background, and as the visitor scrolls, they descend through the optimization space. Career milestones are local minima where significant work happened. Projects are "solutions found at convergence points." Blog posts share "gradients" -- the insights and directions that informed the next step. The resume is the "training log." Contact is the "next iteration."

### The Wow Factor

When you first land on the page, you see a beautiful 3D wireframe loss landscape rendered in Three.js, viewed from above at an angle. A glowing particle (representing Kostas's career trajectory) sits at the top. As you scroll, the particle descends the landscape, tracing an optimization path. The camera follows. At each major career milestone (PhD, Amazon, publications, products), the particle pauses at a local minimum, and the content for that section fades in. The landscape colors shift based on the "domain" of work -- cool blues for research, warm oranges for product engineering, greens for open source.

The landscape is not just decoration -- it is the narrative structure. The vertical axis IS the scroll axis. Depth into the page IS depth into the optimization.

### Target Audience Hooks

- **Recruiters (30-second scan):** Hero section immediately shows name, title, and a striking visual. Prominent CTA buttons for resume and contact. The scroll animation is impressive but skippable -- nav links jump directly to sections.
- **Hiring Managers:** The optimization metaphor communicates ML depth instantly. Project cards at "convergence points" showcase impact with metrics.
- **Senior MLEs / Peers:** The mathematical metaphor signals domain fluency. Blog posts as "gradients" shows intellectual engagement. Interactive landscape demonstrates frontend capability.

---

## 2. Color Palette & Typography

### Color Palette

```
Background (void):      #0a0a0f    (near-black, deep space)
Surface (cards):        #13131a    (dark elevated panels)
Surface hover:          #1a1a24    (subtle lift on interaction)
Border:                 #2a2a3a    (barely visible structure)

Primary accent:         #8b5cf6    (vivid purple -- the "gradient" color)
Secondary accent:       #06b6d4    (cyan -- convergence/solution markers)
Warm accent:            #f59e0b    (amber -- product/engineering highlights)
Success/green:          #10b981    (emerald -- open source markers)

Text primary:           #e2e8f0    (slate-100, high contrast body)
Text secondary:         #94a3b8    (slate-400, muted labels)
Text tertiary:          #475569    (slate-600, subtle metadata)

Gradient trail:         linear-gradient(#8b5cf6, #06b6d4)  (particle path)
Loss landscape mesh:    #8b5cf620  (purple wireframe, 12% opacity)
Landscape glow:         #8b5cf640  (purple glow at interaction points)
```

### Typography

```
Headings:       JetBrains Mono, 600 weight
                (monospace signals "engineer," used sparingly for section titles)

Body:           Inter, 400/500 weight
                (clean sans-serif, optimized for screen reading)

Code/tags:      JetBrains Mono, 400 weight
                (inline code, skill tags, technical labels)

Display/hero:   Inter, 800 weight, tracking tight
                (large hero text, "Kostas Georgiou" etc.)

Math/equations: KaTeX rendering
                (for blog posts, preserves LaTeX aesthetics)
```

### Type Scale

```
Hero name:      clamp(2.5rem, 5vw, 4.5rem)
Section title:  clamp(1.5rem, 3vw, 2.25rem)
Card title:     1.25rem
Body:           1rem / 1.6 line-height
Small/meta:     0.875rem
Tag:            0.75rem, uppercase, letter-spacing 0.05em
```

---

## 3. Navigation Design

### Primary Navigation: Floating Top Bar

A slim, frosted-glass navigation bar fixed to the top of the viewport. It appears after scrolling past the hero (hidden on initial load so the landscape is unobstructed).

```
Layout:
  Left:    "KG" monogram (links to top)
  Center:  Home | Projects | Papers | Blog | Resume | Contact
  Right:   Theme toggle (sun/moon) + "Download CV" button

Behavior:
  - Hidden on page load (hero is full-screen immersive)
  - Fades in after scrolling 100vh
  - Active link highlighted with purple underline + glow
  - On mobile: hamburger menu, slides in from right
  - Scroll-aware: hides on scroll down, reveals on scroll up
```

### Secondary Navigation: Loss Landscape Progress Indicator

A thin vertical progress bar on the right edge of the viewport, styled as a miniature loss curve. The visitor's current position is shown as a glowing dot on the curve. Hovering reveals section labels.

```
  ╷  ● Home           (you are here)
  │ ╲
  │  ╲  Projects
  │   ╲
  │    ╲● Papers
  │     │
  │     │ Blog
  │     ╲
  │      ● Contact
  ╵
```

---

## 4. Page Designs

### 4.1 HOME PAGE

The home page IS the gradient descent experience. It is a long scroll that transitions through five "optimization steps."

#### Step 0: The Summit (Hero)

Full-viewport 3D loss landscape. Camera is positioned above, looking down at the terrain. The glowing particle is at the peak. Kostas's name and title are overlaid in large type.

Content:
```
KOSTAS GEORGIOU
PhD | ML Engineer | Applied Scientist at Amazon

"Optimizing at the intersection of research and production"

[View Resume]  [Get in Touch]

        ↓ scroll to begin descent ↓
```

#### Step 1: The First Descent (Career Overview)

As the user scrolls, the camera tilts and the particle begins moving down the landscape. A timeline fades in, showing career progression.

Content:
```
THE OPTIMIZATION PATH

2018  ──── BSc Computer Science, AUTH, Greece
             └ First gradient: community detection on social graphs

2019  ──── MSc Computer Science, UTK
             └ Direction shift: computer vision + self-supervised learning

2021  ──── PhD Student → Candidate, UTK
             └ Deep dive: masked image modeling, CLIP distillation

2023  ──── NeurIPS publication, Cross-Scale MAE
             └ Convergence: 54 citations, state-of-the-art results

2024  ──── Applied Scientist, Amazon
             └ New objective function: production ML at scale

2025  ──── PhD Conferred + 8 publications
             └ Optimization continues...
```

#### Step 2: Key Metrics (The Convergence Dashboard)

The particle reaches a plateau. Animated counters appear.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│      8+      │  │     100+     │  │      8+      │  │    Amazon    │
│ Publications │  │  Citations   │  │ Years in ML  │  │  Applied Sci │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

#### Step 3: Featured Work Preview

Three featured project cards appear as "solutions at local minima" -- positioned at dips in the landscape.

```
 ┌─ FleetSmart.ai ──────┐  ┌─ Cross-Scale MAE ─────┐  ┌─ MEDiC ───────────────┐
 │ AI fleet management   │  │ NeurIPS 2023, 54 cites │  │ CLIP distillation     │
 │ [Live] [Details]      │  │ [Paper] [Code]         │  │ [Paper] [Code] [HF]   │
 └───────────────────────┘  └────────────────────────┘  └───────────────────────┘

                        → View all projects →
```

#### Step 4: Tech Stack (The Gradient Components)

Skills displayed as a grid of glowing tags, grouped by category. Each tag pulses gently, like neurons firing.

```
RESEARCH                    ENGINEERING                 INFRASTRUCTURE
PyTorch                     FastAPI                     AWS / GCP
Self-Supervised Learning    Next.js                     Docker / K8s
Computer Vision             Python                      PostgreSQL
Transformers                React                       Supabase
HuggingFace                 TypeScript                  Serverless
```

#### ASCII Mockup: Home Page (Full)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                    ░░░▓▓▓▓▓░░░░░▓▓▓▓░░░░░                                       │
│                  ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░                                       │
│                ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░  ← 3D loss landscape                 │
│              ░▓▓▓▓▓▓▓▓▓▓●▓▓▓▓▓▓▓▓▓▓▓▓▓░    (Three.js canvas)                  │
│                ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░     ● = particle                       │
│                  ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░                                           │
│                                                                                  │
│                      KOSTAS GEORGIOU                                              │
│              PhD  |  ML Engineer  |  Applied Scientist                            │
│                                                                                  │
│             [ View Resume ]    [ Get in Touch ]                                   │
│                                                                                  │
│                        ↓ scroll ↓                                                │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                            ╷     │
│  THE OPTIMIZATION PATH                                                     │ ●   │
│                                                                            │╲    │
│  2018 ─── BSc CS, AUTH ──── community detection                            │ │   │
│       │                                                                    │ │   │
│  2019 ─── MSc CS, UTK ──── computer vision pivot                           │ │   │
│       │                                                                    │ ╲   │
│  2021 ─── PhD Candidate ── masked image modeling, CLIP                     │  │  │
│       │                                                                    │  │  │
│  2023 ─── NeurIPS ──────── Cross-Scale MAE (54 cites)                      │  ●  │
│       │                                                                    │  │  │
│  2024 ─── Amazon ────────── production ML at scale                         │  │  │
│       │                                                                    │  ╲  │
│  2025 ─── PhD Conferred ── 8 publications, 100+ cites                      │   │ │
│                                                                            ╵   ╵ │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│     ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐           │
│     │     8+     │   │    100+    │   │     8+     │   │   Amazon   │           │
│     │   Papers   │   │ Citations  │   │  Years ML  │   │ Applied Sci│           │
│     └────────────┘   └────────────┘   └────────────┘   └────────────┘           │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SOLUTIONS AT LOCAL MINIMA                                                       │
│                                                                                  │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐     │
│  │ ░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │     │
│  │ ░░░ IMAGE ░░░░░░░░░░ │ │ ░░░ IMAGE ░░░░░░░░░░ │ │ ░░░ IMAGE ░░░░░░░░░░ │     │
│  │ ░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │     │
│  ├──────────────────────┤ ├──────────────────────┤ ├──────────────────────┤     │
│  │ FleetSmart.ai        │ │ Cross-Scale MAE      │ │ MEDiC                │     │
│  │ AI fleet management  │ │ NeurIPS 2023         │ │ CLIP distillation    │     │
│  │ FastAPI Next.js GCP  │ │ PyTorch MIM CV       │ │ PyTorch SSL CLIP     │     │
│  │ [Live]        [More] │ │ [Paper] [Code]       │ │ [Paper][Code][HF]    │     │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘     │
│                                                                                  │
│                        → View all projects →                                     │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  THE GRADIENT COMPONENTS                                                         │
│                                                                                  │
│  Research              Engineering            Infrastructure                     │
│  ┌──────────┐          ┌──────────┐           ┌──────────┐                       │
│  │ PyTorch  │          │ FastAPI  │           │ AWS/GCP  │                       │
│  │ SSL      │          │ Next.js  │           │ Docker   │                       │
│  │ CV       │          │ Python   │           │ K8s      │                       │
│  │ ViTs     │          │ React    │           │ Postgres │                       │
│  │ HF       │          │ TS       │           │ Svrless  │                       │
│  └──────────┘          └──────────┘           └──────────┘                       │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  KG    GitHub  LinkedIn  Scholar  HuggingFace  PyPi           gkos.dev          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 PROJECTS PAGE

#### Concept

Projects are "solutions found at convergence points." The page opens with a zoomed-out view of the loss landscape showing multiple minima, each labeled with a project name. Below, projects are displayed in a tiered layout.

#### Layout

- **Header:** "Solutions at Local Minima" with an animated mini-landscape showing convergence points
- **Filter bar:** All | Products | Research | Open Source | Packages
- **Featured tier:** Top 6 projects as large cards with hero images (2:1 ratio), full descriptions, and prominent action buttons
- **Standard tier:** Mid-importance projects as medium cards in a 3-column grid
- **Compact tier:** Minor/old projects as a dense list (name, one-liner, link)

#### Featured Projects (large cards)

1. FleetSmart.ai -- AI fleet management SaaS [Live]
2. MEDiC -- CLIP distillation framework [Paper][Code][HF]
3. MaskDistill -- first open PyTorch reproduction [Code][HF]
4. ShiftMD -- constraint optimization scheduling [Private]
5. XpensAI -- AI expense management [Live]
6. Cross-Scale MAE -- NeurIPS 2023 [Paper][Code]

#### Standard Projects (medium cards)

- Soma, Minecraft AI, 3D Semantic Segmentation, BERT QA, Hybrid Girvan Newman, Accident Severity, COVID-19 Vaccination

#### Compact Projects (list items)

- RL Value Iteration, Vanilla Numpy CNN, Vanilla Numpy NN, Instagram Likes Prediction

#### ASCII Mockup: Projects Page

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  KG          Home   Projects   Papers   Blog   Resume   Contact    [Download CV] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SOLUTIONS AT LOCAL MINIMA                                                       │
│  Each project represents a convergence point in the optimization landscape.      │
│                                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                        │
│  │  All   │ │Products│ │Research│ │  OSS   │ │Packages│  ← filter tabs          │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                        │
│                                                                                  │
│  ── FEATURED ────────────────────────────────────────────────────────────        │
│                                                                                  │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░ FLEETSMART IMAGE ░░░░░░░░░ │ │ ░░░░░░░░ MEDIC IMAGE ░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  ├─────────────────────────────────────┤ ├─────────────────────────────────────┤ │
│  │ FleetSmart.ai                       │ │ MEDiC                               │ │
│  │ AI-powered fleet management for     │ │ Multi-objective Exploration of      │ │
│  │ vessel tracking, compliance, and    │ │ Distillation from CLIP. 85.07%     │ │
│  │ operational analytics.              │ │ finetuning on ImageNet-1K.         │ │
│  │                                     │ │                                     │ │
│  │ FastAPI  Next.js  GCP  LLM  PgSQL   │ │ PyTorch  SSL  CLIP  MIM  HF        │ │
│  │                                     │ │                                     │ │
│  │ [● Live]                            │ │ [Paper]  [Code]  [HuggingFace]     │ │
│  └─────────────────────────────────────┘ └─────────────────────────────────────┘ │
│                                                                                  │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐ │
│  │ MaskDistill-PyTorch                 │ │ Cross-Scale MAE                     │ │
│  │ First open reproduction, 84.8% acc  │ │ NeurIPS 2023, 54 citations          │ │
│  │ [Code]  [HuggingFace]              │ │ [Paper]  [Code]                     │ │
│  └─────────────────────────────────────┘ └─────────────────────────────────────┘ │
│                                                                                  │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐ │
│  │ ShiftMD                             │ │ XpensAI                             │ │
│  │ Constraint optimization scheduling  │ │ AI expense management with OCR      │ │
│  │ [Coming Soon]                       │ │ [● Live]                            │ │
│  └─────────────────────────────────────┘ └─────────────────────────────────────┘ │
│                                                                                  │
│  ── STANDARD ────────────────────────────────────────────────────────────        │
│                                                                                  │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐           │
│  │ ░░░ IMAGE ░░░░░░░░ │ │ ░░░ IMAGE ░░░░░░░░ │ │ ░░░ IMAGE ░░░░░░░░ │           │
│  │ Soma               │ │ Minecraft AI       │ │ 3D Segmentation   │           │
│  │ Health dashboard    │ │ RL maze solver     │ │ Medical imaging   │           │
│  │ [Demo] [Code]      │ │ [Code]             │ │ [Code]            │           │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘           │
│                                                                                  │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐           │
│  │ BERT QA            │ │ Hybrid Girvan N.   │ │ Accident Severity  │           │
│  │ Reading compreh.   │ │ Community detect.  │ │ Car crash predict. │           │
│  │ [Code]             │ │ [Code] [Paper]     │ │ [Code]             │           │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘           │
│                                                                                  │
│  ── COMPACT ─────────────────────────────────────────────────────────────        │
│                                                                                  │
│  COVID-19 Vaccination Pred.  LSTM time series forecasting      [Code] →         │
│  Instagram Likes Prediction  CNN-based engagement prediction   [Code] →         │
│  RL Value Iteration          MDP optimal policy calculation    [Code] →         │
│  Vanilla Numpy CNN           Pure numpy convnet implementation [Code] →         │
│  Vanilla Numpy Neural Net    Numpy feed-forward network        [Code] →         │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  KG    GitHub  LinkedIn  Scholar  HuggingFace  PyPi           gkos.dev          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.3 PAPERS / PUBLICATIONS PAGE

#### Concept

"Published Convergence Proofs" -- each paper is a formally verified solution at a convergence point. The page displays publications in a timeline format with venue badges, citation counts, and links.

#### Layout

- **Header:** "Published Convergence Proofs" with total citation count
- **Filter:** All | Conferences | Journals | Preprints
- **Sort:** By year (default) | By citations
- **Cards:** Each paper is a horizontal card with:
  - Venue badge (color-coded: gold for top-tier NeurIPS/WACV, silver for IEEE, bronze for preprints)
  - Title (large, clickable)
  - Authors (with Kostas highlighted)
  - Year + venue
  - Citation count (animated counter)
  - Abstract (collapsible)
  - Action buttons: [PDF] [Code] [Scholar] [BibTeX]

#### Venue Badge Colors

```
NeurIPS, ECCV:      #f59e0b  (gold)
WACV, IGARSS:       #8b5cf6  (purple)
IEEE/ACM journals:  #06b6d4  (cyan)
arXiv preprints:    #94a3b8  (gray)
```

---

### 4.4 BLOG PAGE (Index)

#### Concept

"Gradients & Insights" -- blog posts are the directional derivatives, the partial insights that inform the next optimization step. Each post shares a gradient of knowledge.

#### Layout

- **Header:** "Gradients & Insights" with RSS feed link
- **Featured post:** Latest or pinned post as a hero card with large image
- **Post grid:** 2-column grid of post cards
- **Sidebar (desktop):** Tags cloud, search bar, "Most cited gradients" (popular posts)

#### Post Card Contents

```
┌──────────────────────────────────┐
│ ░░░░░░░░ COVER IMAGE ░░░░░░░░░░ │
├──────────────────────────────────┤
│ Tag: self-supervised-learning    │
│                                  │
│ Why Masked Image Modeling Works  │
│ Better Than You Think            │
│                                  │
│ A deep dive into the inductive   │
│ biases that make MAE and BEiT    │
│ surprisingly effective...        │
│                                  │
│ Apr 2026  ·  12 min read         │
└──────────────────────────────────┘
```

---

### 4.5 BLOG POST PAGE

#### Layout

- **Reading progress bar** at the top (styled as a loss curve approaching minimum)
- **Title + metadata:** Date, reading time, tags
- **Table of contents:** Fixed sidebar on desktop, collapsible on mobile
- **Content area:** max-width 720px, generous margins
- **Components:** Code blocks with Shiki, math with KaTeX, interactive demos with HuggingFace embeds, figures with captions
- **Bottom:** Previous/next post navigation, share buttons (Twitter, LinkedIn, HN)

#### ASCII Mockup: Blog Post

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← reading progress (42%)     │
├──────────────────────────────────────────────────────────────────────────────────┤
│  KG          Home   Projects   Papers   Blog   Resume   Contact    [Download CV] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─── TOC ──────────┐                                                            │
│  │                   │  self-supervised-learning · computer-vision                │
│  │ 1. Introduction   │                                                            │
│  │ 2. Background   ●│  Why Masked Image Modeling Works                           │
│  │ 3. The Key       │  Better Than You Think                                     │
│  │    Insight        │                                                            │
│  │ 4. Experiments   │  April 15, 2026  ·  12 min read  ·  Kostas Georgiou       │
│  │ 5. Conclusion    │                                                            │
│  │                   │  ────────────────────────────────────────────              │
│  │                   │                                                            │
│  │                   │  Masked image modeling has emerged as a dominant            │
│  │                   │  paradigm in self-supervised visual representation          │
│  │                   │  learning. But why does it work so well? In this            │
│  │                   │  post, I explore the inductive biases that make             │
│  │                   │  approaches like MAE, BEiT, and our Cross-Scale             │
│  │                   │  MAE surprisingly effective...                              │
│  │                   │                                                            │
│  │                   │  ## 2. Background                                           │
│  │                   │                                                            │
│  │                   │  The key equation governing masked prediction:              │
│  │                   │                                                            │
│  │                   │    L = E[||f(x_masked) - x_target||^2]                      │
│  │                   │                                                            │
│  │                   │  ```python                                                  │
│  │                   │  class MaskedAutoEncoder(nn.Module):                        │
│  │                   │      def __init__(self, encoder, decoder):                  │
│  │                   │          super().__init__()                                  │
│  │                   │          self.encoder = encoder                              │
│  │                   │          self.decoder = decoder                              │
│  │                   │  ```                                                         │
│  │                   │                                                            │
│  └───────────────────┘  ┌─ HuggingFace Demo ──────────────────────┐              │
│                          │                                         │              │
│                          │  Try MEDiC-ViT-Base interactively:      │              │
│                          │  [iframe: HuggingFace Space]            │              │
│                          │                                         │              │
│                          └─────────────────────────────────────────┘              │
│                                                                                  │
│                          ────────────────────────────────────────────              │
│                                                                                  │
│                          ← Previous Post          Next Post →                     │
│                          "On Loss Landscapes"     "CLIP Distillation"             │
│                                                                                  │
│                          Share: [Twitter] [LinkedIn] [Hacker News]                │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  KG    GitHub  LinkedIn  Scholar  HuggingFace  PyPi           gkos.dev          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.6 RESUME PAGE

#### Concept

"The Training Log" -- the resume is the complete record of the optimization run. Displayed as an embedded PDF with a download button, plus a styled HTML summary above it.

#### Layout

- **Header:** "Training Log" with [Download PDF] button
- **Quick summary cards:** Education, experience highlights, skills (for those who want a scan without opening the PDF)
- **PDF viewer:** Full-width embedded PDF with page navigation
- **Print-friendly:** Cmd+P captures a clean version

---

### 4.7 CONTACT PAGE

#### Concept

"Next Iteration" -- reaching out starts the next step in the optimization. Minimal, focused on actionable links.

#### Layout

- **Header:** "Start the Next Iteration"
- **Subheader:** "Whether it's a research collaboration, engineering opportunity, or just a conversation about ML."
- **Contact cards** (grid of 2x3):

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  📧 Email        │  │  💼 LinkedIn      │  │  🐙 GitHub       │
│  kg@gkos.dev     │  │  /in/drkostas    │  │  /drkostas       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  🎓 Scholar      │  │  🤗 HuggingFace  │  │  📦 PyPi         │
│  profile link    │  │  /drkostas       │  │  /drkostas       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

- **Optional:** A simple contact form (name + email + message) that posts to a serverless function

---

## 5. Interactive Elements & Animations

### Three.js: Loss Landscape (Hero + Background)

- **Hero landscape:** Full 3D wireframe terrain generated from Perlin noise
- **Particle trajectory:** A glowing orb traces the optimization path as the user scrolls
- **Camera movement:** Smooth camera dolly following the particle descent
- **Performance:** Only renders when in viewport. Falls back to a static gradient on low-power devices. Uses `requestAnimationFrame` with frame budgeting
- **Reduced motion:** Respects `prefers-reduced-motion` -- landscape becomes a static image, particle jumps between positions

### GSAP: Scroll-Driven Animations

- **Timeline entries:** Fade in + slide from left as they enter viewport
- **Metric counters:** Count up from 0 when scrolled into view
- **Project cards:** Staggered entrance animation (0.1s delay between cards)
- **Section transitions:** Smooth opacity and transform transitions between scroll sections

### Micro-interactions

- **Card hover:** Subtle lift (translateY -4px) + border glow in accent color
- **Button hover:** Background fill animation (left to right wipe)
- **Tag hover:** Brief pulse + tooltip showing related projects
- **Link hover:** Underline draws from left to right
- **Navigation active state:** Purple glow pulse on current section

### Scroll-Linked Loss Curve (Progress Indicator)

- SVG path that represents a loss curve
- A dot moves along the curve as the user scrolls
- The curve is drawn progressively (stroke-dashoffset animation)
- Section labels appear as annotations on the curve

---

## 6. Mobile Adaptation

### Breakpoints

```
Desktop:   >= 1024px   (full layout, Three.js, sidebar TOC)
Tablet:    768-1023px  (2-column grid, simplified landscape)
Mobile:    < 768px     (single column, no Three.js)
```

### Mobile-Specific Changes

- **Three.js landscape:** Replaced with a CSS gradient + animated SVG loss curve (much lighter)
- **Navigation:** Hamburger menu with slide-in drawer. Bottom sticky bar with key CTAs
- **Project cards:** Full-width, stacked vertically. Featured cards keep images; standard cards become image-less
- **Blog TOC:** Collapsible accordion at top of post (not sidebar)
- **Timeline:** Vertical single-column with alternating left alignment
- **Metrics:** 2x2 grid instead of 4-across
- **Contact cards:** 2-column grid
- **Font sizes:** Scale down via clamp() -- no breakpoint jumps
- **Touch targets:** Minimum 44x44px for all interactive elements

### Performance Budget (Mobile)

```
First Contentful Paint:  < 1.5s
Largest Contentful Paint: < 2.5s
Total JS bundle:         < 100KB (excluding Three.js island)
Three.js island:         Lazy loaded, only on desktop
```

---

## 7. Tech Requirements

### Astro Architecture

```
src/
├── layouts/
│   ├── BaseLayout.astro        # HTML head, global styles, nav, footer
│   ├── BlogLayout.astro        # Blog post layout (TOC, metadata)
│   └── ProjectLayout.astro     # Individual project page (future case studies)
│
├── pages/
│   ├── index.astro             # Home (scroll-driven gradient descent)
│   ├── projects.astro          # Projects listing
│   ├── papers.astro            # Publications
│   ├── blog/
│   │   ├── index.astro         # Blog index
│   │   └── [...slug].astro     # Dynamic blog posts
│   ├── resume.astro            # Resume viewer
│   └── contact.astro           # Contact page
│
├── components/
│   ├── LossLandscape.tsx       # Three.js island (React, client:visible)
│   ├── LossCurveProgress.astro # SVG scroll progress indicator
│   ├── Navigation.astro        # Top nav bar
│   ├── MobileNav.tsx           # Mobile drawer (React, client:media)
│   ├── ProjectCard.astro       # Featured/standard project card
│   ├── ProjectCompact.astro    # Compact project list item
│   ├── PaperCard.astro         # Publication card
│   ├── BlogCard.astro          # Blog post preview card
│   ├── MetricCounter.tsx       # Animated number counter (React, client:visible)
│   ├── FilterTabs.tsx          # Interactive filter (React, client:load)
│   ├── ContactCard.astro       # Contact link card
│   ├── Footer.astro            # Bottom bar with social links
│   └── icons/                  # SVG icon components
│
├── content/
│   ├── blog/                   # MDX blog posts
│   ├── projects/               # Project data (YAML or JSON)
│   └── papers/                 # Publication data (YAML or JSON)
│
├── styles/
│   ├── global.css              # CSS custom properties, resets
│   ├── typography.css          # Font faces, type scale
│   └── themes.css              # Dark theme (and optional light)
│
└── lib/
    ├── landscape.ts            # Three.js scene setup, Perlin noise generation
    ├── scroll-animations.ts    # GSAP ScrollTrigger configuration
    └── utils.ts                # Shared utilities
```

### Key Dependencies

```
Framework:          astro@5.x
UI Islands:         @astrojs/react
3D:                 three (r168+), @react-three/fiber, @react-three/drei
Animation:          gsap (with ScrollTrigger plugin)
Content:            @astrojs/mdx, astro Content Collections
Code highlighting:  shiki (built into Astro)
Math:               katex, remark-math, rehype-katex
PDF viewer:         react-pdf or <iframe> embed
RSS:                @astrojs/rss
Sitemap:            @astrojs/sitemap
Icons:              lucide-react or astro-icon
Fonts:              @fontsource/inter, @fontsource/jetbrains-mono
```

### Three.js Specifics

- **Landscape geometry:** `PlaneGeometry(20, 20, 128, 128)` with vertex displacement from 3D Perlin noise
- **Material:** `MeshBasicMaterial` with wireframe mode, semi-transparent purple
- **Particle:** `SphereGeometry` with `MeshStandardMaterial` emissive glow + `PointLight`
- **Camera:** `PerspectiveCamera` with FOV 60, controlled by scroll position via GSAP
- **Rendering:** `WebGLRenderer` with `antialias: true`, `alpha: true` for transparent background
- **Performance:** Use `InstancedMesh` for any repeated geometry, limit draw calls, use `client:visible` to defer loading

### GSAP Configuration

```typescript
// Scroll-driven timeline for the home page
gsap.registerPlugin(ScrollTrigger);

// Landscape camera follows scroll
ScrollTrigger.create({
  trigger: "#home-scroll-container",
  start: "top top",
  end: "bottom bottom",
  scrub: 1,
  onUpdate: (self) => {
    // Update camera position and particle along path
    updateLandscapeProgress(self.progress);
  },
});

// Section reveals
gsap.utils.toArray(".section-reveal").forEach((section) => {
  gsap.from(section, {
    scrollTrigger: { trigger: section, start: "top 80%" },
    opacity: 0,
    y: 40,
    duration: 0.8,
  });
});
```

---

## 8. Additional ASCII Mockups

### Mobile Home View (375px)

```
┌─────────────────────────────────────┐
│  KG                          ☰     │
├─────────────────────────────────────┤
│                                     │
│   ╲  ╱ ╲    ╱╲  ╱             │
│    ╲╱   ╲  ╱  ╲╱              │
│     ╲    ╲╱    ╲   ← CSS gradient  │
│      ╲    ●     ╲     + SVG curve  │
│       ╲        ╱ ╲                  │
│                                     │
│       KOSTAS GEORGIOU               │
│     PhD | ML Engineer               │
│     Applied Scientist               │
│                                     │
│   [View Resume] [Contact]          │
│                                     │
│          ↓ scroll ↓                 │
├─────────────────────────────────────┤
│                                     │
│  THE OPTIMIZATION PATH              │
│                                     │
│  2024 ── Amazon                     │
│  │       Applied Scientist          │
│  │                                  │
│  2023 ── NeurIPS                    │
│  │       Cross-Scale MAE            │
│  │                                  │
│  2021 ── PhD Candidate, UTK         │
│  │                                  │
│  2019 ── MSc, UTK                   │
│  │                                  │
│  2018 ── BSc, AUTH                  │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌───────┐ ┌───────┐               │
│  │  8+   │ │ 100+  │               │
│  │Papers │ │ Cites │               │
│  └───────┘ └───────┘               │
│  ┌───────┐ ┌───────┐               │
│  │  8+   │ │Amazon │               │
│  │ Years │ │App Sci│               │
│  └───────┘ └───────┘               │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ░░░░░ FLEETSMART ░░░░░░░░░ │   │
│  │ AI fleet management SaaS   │   │
│  │ [● Live]                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ░░░░░ CROSS-SCALE ░░░░░░░ │   │
│  │ NeurIPS 2023, 54 cites     │   │
│  │ [Paper] [Code]             │   │
│  └─────────────────────────────┘   │
│                                     │
│       → View all projects →         │
│                                     │
├─────────────────────────────────────┤
│  GitHub · LinkedIn · Scholar        │
│             gkos.dev                │
└─────────────────────────────────────┘
```

---

## 9. Pros and Cons

### Pros

1. **Unique and memorable:** The gradient descent metaphor is deeply specific to ML -- no other portfolio uses it. It signals domain expertise before the visitor reads a single word.

2. **Narrative structure:** The scroll-driven optimization journey gives the portfolio a story arc. Visitors experience a "beginning to end" rather than clicking through disconnected pages.

3. **Technical showcase:** The Three.js landscape demonstrates real frontend engineering capability, which matters for applied scientist roles that involve demo-building and tooling.

4. **Scalable metaphor:** The concept works at every level. Projects are "local minima," blog posts are "gradients," the resume is a "training log," contact is "next iteration." Nothing feels forced.

5. **Scroll-friendly for recruiters:** The home page works as a single-scroll experience. A recruiter can scroll through name, timeline, metrics, and featured projects in 30 seconds without clicking anything.

6. **Strong visual identity:** The combination of 3D landscape, glowing particle, and purple-cyan palette creates a distinctive look that is hard to confuse with template portfolios.

7. **Performance-conscious design:** The Three.js island loads lazily and only on capable devices. The rest of the site is zero-JS Astro components. Lighthouse scores stay high.

### Cons

1. **Three.js complexity:** The 3D loss landscape is the hardest component to build, tune, and maintain. Getting it to look good, perform well, and sync with scroll requires significant Three.js expertise. Estimated 3-5 days just for the landscape.

2. **Scroll hijacking risk:** Scroll-driven storytelling can feel annoying if the scroll speed is wrong or the animations are too slow. Must be very carefully tuned. Users should always be able to jump via nav links.

3. **Mobile degradation:** The core wow-factor (3D landscape) disappears on mobile. The CSS fallback needs to carry its own weight or mobile visitors get a lesser experience.

4. **Metaphor fatigue:** If overplayed, the gradient descent metaphor could feel gimmicky. "Training Log" for resume and "Next Iteration" for contact are clever once but might feel try-hard to some visitors. Should be used as flavor text, not as the only way to navigate.

5. **Content-first risk:** The impressive visuals might distract from the actual content. A hiring manager wants to see project impact, not watch a particle animate. The animations must enhance, not obstruct.

6. **SEO and accessibility:** Heavy scroll-driven animations can hurt screen reader experience and search engine parsing. Requires careful progressive enhancement -- all content must be in the DOM without JS.

7. **Load time on first visit:** Three.js + GSAP + fonts could balloon initial load if not carefully code-split. The landscape should never block first contentful paint.

---

## 10. Effort Estimate

### Total: 6-8 weeks (part-time) / 3-4 weeks (full-time)

| Phase | Task | Effort | Notes |
|-------|------|--------|-------|
| **1. Foundation** | Astro project setup, layouts, routing, global styles, fonts | 2-3 days | Straightforward Astro boilerplate |
| **2. Navigation** | Top nav, mobile drawer, scroll-aware behavior | 1-2 days | GSAP for scroll-hide |
| **3. Three.js Landscape** | Perlin terrain, particle path, camera sync, scroll integration | 4-6 days | Hardest component. Needs iteration |
| **4. Home Page** | Timeline, metrics, featured cards, scroll sections | 2-3 days | GSAP ScrollTrigger |
| **5. Projects Page** | Tiered layout, filter tabs, all project cards | 2-3 days | Content migration from JSON |
| **6. Papers Page** | Publication cards, venue badges, citation display | 1-2 days | Simpler layout |
| **7. Blog Infrastructure** | Content Collections, MDX pipeline, Shiki, KaTeX, RSS | 3-4 days | Plugin chain is fiddly |
| **8. Blog Templates** | Index page, post layout, TOC, code blocks, HF embeds | 2-3 days | |
| **9. Resume Page** | PDF embed, HTML summary, download button | 1 day | Simple page |
| **10. Contact Page** | Contact cards, optional form | 0.5 day | Minimal page |
| **11. Mobile** | Responsive styles, CSS fallback for landscape, mobile nav | 2-3 days | |
| **12. Progress Indicator** | SVG loss curve, scroll sync | 1-2 days | Nice detail |
| **13. Polish** | Animations, hover states, transitions, a11y, Lighthouse | 2-3 days | |
| **14. Content** | Migrate all projects/papers, write first blog post | 2-3 days | |
| **15. Deployment** | Vercel config, OG images, sitemap, analytics | 1 day | |

### Risk Items

- Three.js landscape (Phase 3) is the highest-risk item. If it takes longer than expected, the fallback is a simpler 2D animated SVG landscape that captures the same feel at 30% of the effort.
- Blog MDX pipeline (Phase 7) often has edge cases with plugins conflicting. Budget extra time for debugging.
- GSAP ScrollTrigger + Three.js synchronization can be tricky to get smooth. May need to use GSAP's `useGSAP` hook carefully with React Three Fiber.

### MVP (Shippable in 2-3 weeks)

If time is tight, ship without:
- Three.js landscape (use CSS gradient + SVG curve instead)
- Blog (add in v2)
- Progress indicator
- Contact form

This reduces effort to approximately 2-3 weeks part-time while keeping the visual identity and metaphor intact.
