# Concept 01: The Latent Space

## 1. Concept Overview

**Metaphor:** Your entire portfolio IS a latent space visualization -- a living, interactive 2D embedding (think t-SNE / UMAP) where every project, paper, blog post, and skill exists as a data point in a continuous space. Similar things cluster together naturally. The hero section is not a banner -- it is the visualization itself, filling the viewport. Visitors are literally exploring your work as a machine learning practitioner would explore data.

**The Wow Factor:** The first thing a visitor sees is an animated scatter plot of glowing points organizing themselves in real time. Points cluster by similarity -- your NeurIPS paper sits near your self-supervised learning projects, FleetSmart.ai is near your deployed product work, your PyPi packages form their own island. Hovering over any point reveals a preview card. Clicking opens the full content. Filtering by category triggers a smooth re-embedding animation where points glide to new positions. It is simultaneously a portfolio, a data visualization, and a statement about who you are as an ML engineer.

**Why it works for the target audience:** Senior MLEs and hiring managers will instantly recognize the visualization. It demonstrates technical fluency without saying a word. Recruiters will find it memorable and visually distinctive. No one else in ML has a portfolio that IS a dimensionality reduction.

---

## 2. Color Palette and Typography

### Colors

```
Background:       #0a0e17  (deep space navy, almost black)
Surface:          #111827  (card/panel backgrounds)
Surface Elevated: #1a2234  (hover states, modals)
Border:           #1e293b  (subtle grid lines)

Primary Accent:   #6366f1  (indigo -- cluster highlights, active states)
Secondary Accent: #22d3ee  (cyan -- links, hover glows)
Warm Accent:      #f59e0b  (amber -- stars, citations, metrics)
Success:          #10b981  (emerald -- live projects, active status)
Muted Text:       #94a3b8  (slate-400)
Body Text:        #e2e8f0  (slate-200)
Heading Text:     #f8fafc  (near-white)

Point Colors by Category:
  ML Projects:    #818cf8  (indigo-400)
  Papers:         #c084fc  (purple-400)
  Products:       #34d399  (emerald-400)
  PyPi Packages:  #fbbf24  (amber-400)
  Blog Posts:     #38bdf8  (sky-400)
  Bots/Misc:      #fb7185  (rose-400)
```

### Typography

```
Headings:     "Space Grotesk", sans-serif  (geometric, technical, modern)
Body:         "Inter", sans-serif          (highly readable at all sizes)
Code/Data:    "JetBrains Mono", monospace  (for tags, metrics, code snippets)
```

Space Grotesk carries that "data science meets design" feeling. Inter is the workhorse. JetBrains Mono for anything that should feel like data or code.

---

## 3. Navigation Design

### Desktop Navigation

A minimal top bar that floats above the visualization:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  KG  ·  Explore   Projects   Papers   Blog   Resume   Contact       [=]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

- "KG" is a small geometric logo mark (two letters forming an abstract node graph)
- "Explore" is the home/hero page with the full scatter visualization
- Active page has a glowing underline in indigo
- Hamburger [=] on the right collapses to mobile
- Navigation is semi-transparent, blurs the background behind it (backdrop-filter)
- Scrolling down makes it fully opaque

### Mobile Navigation

- Hamburger menu slides in from the right
- Full-screen overlay with large tap targets
- Category filter pills are accessible from a bottom sheet

### Scroll Behavior

The hero visualization is pinned for the first viewport. Scrolling down reveals a traditional content area below it, but the visualization remains accessible via a floating "minimap" button in the bottom-right corner that snaps you back to the full view.

---

## 4. Page Designs

### 4.1 Home / Explore Page

The hero IS the visualization. No separate hero section.

**Layout:**
- Full-viewport canvas showing all data points
- Bottom-left: Brief introduction text overlay
- Bottom-right: Category legend with toggleable filters
- Top-left: Search bar (filters points in real-time)
- Points are sized by "impact" (citations for papers, stars for repos, deploy status for products)
- Hovering a point: glow increases, tooltip card appears with title + one-liner + category
- Clicking a point: smooth zoom into that region, content panel slides in from right
- Clusters have faint convex hull outlines with labels ("Self-Supervised Learning", "Deployed Products", "Dev Tools")

**Below the fold (scroll down):**
- A curated "Featured" section with 3-4 highlight cards (FleetSmart, Cross-Scale MAE NeurIPS, MEDiC)
- Quick stats bar: "8+ Publications | 100+ Citations | 15+ Projects | 7 PyPi Packages"
- Brief "About" paragraph
- CTA: "Explore the space above, or browse by category below"

**Interactions:**
- Pan: click-drag on empty space
- Zoom: scroll wheel / pinch
- Filter: click category pills, points not matching fade to 10% opacity and drift apart
- Search: type in search bar, matching points pulse and non-matching fade
- Re-embed animation: when toggling categories, remaining points smoothly animate to new positions (pre-computed layouts stored as JSON)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  KG  ·  Explore   Projects   Papers   Blog   Resume   Contact       [=]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Search points...]                                                          │
│                                                                              │
│           ·  ·                    · ·                                         │
│         ·  · · ·               · · ·  ·                                      │
│        · ·MEDiC· ·              ·FleetSmart·                                 │
│         · · · ·                   · · ·                                       │
│           · ·                      ·                                          │
│                        ·                         · ·                          │
│                       · ·                      · · · ·                        │
│                      · · ·                    ·garmin-auth·                   │
│                     ·NeurIPS·                   · · ·                         │
│                      · · ·                       ·                            │
│                       · ·                                                    │
│          · ·                                                                 │
│         ·YT Bot· ·                                                           │
│          · ·                                                                 │
│                                                                              │
│  ┌─────────────────────────┐    ┌──────────────────────────────────────────┐ │
│  │ Kostas Georgiou         │    │ Legend:                                  │ │
│  │ PhD · ML Engineer       │    │ [*] ML Projects    [*] Papers           │ │
│  │ Applied Scientist       │    │ [*] Products       [*] PyPi             │ │
│  │ @ Amazon                │    │ [*] Blog Posts     [*] Bots/Misc        │ │
│  └─────────────────────────┘    └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│                      SCROLL FOR CURATED HIGHLIGHTS                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  8+ Publications   100+ Citations   15+ Projects   7 PyPi Packages          │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │ [img]            │  │ [img]            │  │ [img]            │           │
│  │ FleetSmart.ai    │  │ Cross-Scale MAE  │  │ MEDiC            │           │
│  │ AI fleet mgmt    │  │ NeurIPS 2023     │  │ CLIP distill     │           │
│  │ [Live]           │  │ 54 citations     │  │ [Code] [HF]      │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Projects Page

A filtered, zoomed-in view of just the project points, plus a traditional grid fallback.

**Layout:**
- Top: Mini scatter plot showing only project-category points (ML, Products, PyPi, Bots, Misc)
- Toggle: "Scatter View" | "Grid View"
- Below: Category filter pills (ML Projects, Products, PyPi, Bots, Misc)
- Grid View: responsive card grid (3 columns desktop, 2 tablet, 1 mobile)

**Project Card:**
```
┌──────────────────────────────────────┐
│ [Project Screenshot - 2:1 ratio]     │
├──────────────────────────────────────┤
│ FleetSmart.ai                        │
│                                      │
│ AI-powered fleet management platform │
│ for vessel tracking, compliance      │
│ monitoring, and operational          │
│ analytics.                           │
│                                      │
│ FastAPI  Next.js  GCP  LLM  PgSQL   │
│                                      │
│            [Live] [Code]             │
└──────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  KG  ·  Explore   Projects   Papers   Blog   Resume   Contact       [=]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Projects                                              [Scatter] | Grid     │
│                                                                              │
│  [All] [ML] [Products] [PyPi] [Bots] [Misc]                                │
│                                                                              │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐    │
│  │ [  img: MEDiC     ] │ │ [  img: MaskDist  ] │ │ [ img: FleetSmart ] │    │
│  ├─────────────────────┤ ├─────────────────────┤ ├─────────────────────┤    │
│  │ MEDiC              │ │ MaskDistill-PyTorch │ │ FleetSmart.ai       │    │
│  │                     │ │                     │ │                     │    │
│  │ Multi-objective     │ │ First open PyTorch  │ │ AI-powered fleet    │    │
│  │ exploration of      │ │ reproduction of     │ │ management platform │    │
│  │ distillation from   │ │ MaskDistill with    │ │ for vessel track... │    │
│  │ CLIP...             │ │ pre-trained...      │ │                     │    │
│  │                     │ │                     │ │                     │    │
│  │ PyTorch  SSL  CLIP  │ │ PyTorch  SSL  CLIP  │ │ FastAPI  Next  GCP  │    │
│  │                     │ │                     │ │                     │    │
│  │   [Code] [Demo]    │ │   [Code] [Demo]    │ │       [Live]        │    │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘    │
│                                                                              │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐    │
│  │ [  img: ShiftMD   ] │ │ [  img: XpensAI   ] │ │ [  img: Soma      ] │    │
│  ├─────────────────────┤ ├─────────────────────┤ ├─────────────────────┤    │
│  │ ShiftMD             │ │ XpensAI             │ │ Soma                │    │
│  │ ...                 │ │ ...                 │ │ ...                 │    │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Papers / Publications Page

**Layout:**
- Top: Citation metrics bar (total citations, h-index, publications count)
- Timeline view: papers arranged chronologically on a vertical timeline
- Each paper is a card positioned alternating left/right of the timeline
- Conference badges (NeurIPS, WACV, IGARSS) are highlighted with venue colors
- Clicking a paper expands inline to show full abstract, links to PDF/code/scholar

**Paper Card:**
```
┌──────────────────────────────────────┐
│ NeurIPS 2023                  54 ★   │
├──────────────────────────────────────┤
│ Cross-Scale MAE: A Tale of          │
│ Multiscale Exploitation in           │
│ Remote Sensing                       │
│                                      │
│ Remote sensing images present unique │
│ challenges to image analysis due...  │
│                                      │
│        [Paper] [Code] [Scholar]      │
└──────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  KG  ·  Explore   Projects   Papers   Blog   Resume   Contact       [=]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Publications                                                                │
│                                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                  │
│  │ 10       │  │ 100+     │  │ Top Venue │                                  │
│  │ Papers   │  │ Citations│  │ NeurIPS   │                                  │
│  └──────────┘  └──────────┘  └──────────┘                                  │
│                                                                              │
│  2026 ─────────────────────────────────────────────                          │
│       │                                                                      │
│       │    ┌─────────────────────────────────────┐                          │
│       ├────│ ECCV 2026 (Under Review)        0 ★ │                          │
│       │    │ ExPLoRe: Exploration-driven Pre-    │                          │
│       │    │ training for Long-range Remote...   │                          │
│       │    │            [Paper]                   │                          │
│       │    └─────────────────────────────────────┘                          │
│       │                                                                      │
│       │    ┌─────────────────────────────────────┐                          │
│       ├────│ arXiv preprint                  0 ★ │                          │
│       │    │ MEDiC: Multi-objective Exploration  │                          │
│       │    │ of Distillation from CLIP           │                          │
│       │    │        [Paper] [Code]               │                          │
│       │    └─────────────────────────────────────┘                          │
│       │                                                                      │
│  2024 ─────────────────────────────────────────────                          │
│       │                                                                      │
│       │    ┌─────────────────────────────────────┐                          │
│       ├────│ IEEE IGARSS 2024                0 ★ │                          │
│       │    │ Koopman-Based Transition Detection  │                          │
│       │    │ in Satellite Imagery...             │                          │
│       │    └─────────────────────────────────────┘                          │
│       │                                                                      │
│  2023 ─────────────────────────────────────────────                          │
│       │                                                                      │
│       │    ┌─────────────────────────────────────┐                          │
│       ├────│ NeurIPS 2023                   54 ★ │                          │
│       │    │ Cross-Scale MAE: A Tale of          │                          │
│       │    │ Multiscale Exploitation...          │                          │
│       │    │      [Paper] [Code] [Scholar]       │                          │
│       │    └─────────────────────────────────────┘                          │
│       │                                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Blog Page (Index)

**Layout:**
- Blog posts appear as points in the main visualization AND as a traditional list here
- Two views: "Space View" (scatter of just blog posts, clustered by topic) and "List View"
- List view: cards with featured image, title, date, reading time, tags
- Sidebar: tag cloud, recent posts, series groupings
- Posts are written in MDX with full code highlighting, math (KaTeX), and embedded demos

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  KG  ·  Explore   Projects   Papers   Blog   Resume   Contact       [=]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Blog                                              [Space View] | List      │
│                                                                              │
│  ┌──────────────────────────────────────────┐  ┌────────────────────────┐   │
│  │                                          │  │ Tags                   │   │
│  │  ┌────────────────────────────────────┐  │  │                        │   │
│  │  │ [featured image]                   │  │  │ self-supervised (4)    │   │
│  │  │                                    │  │  │ remote-sensing (3)     │   │
│  │  ├────────────────────────────────────┤  │  │ deployment (2)         │   │
│  │  │ Understanding Self-Supervised      │  │  │ pytorch (5)            │   │
│  │  │ Learning for Remote Sensing        │  │  │ infrastructure (2)     │   │
│  │  │                                    │  │  │                        │   │
│  │  │ Apr 2, 2026 · 12 min read          │  │  ├────────────────────────┤   │
│  │  │                                    │  │  │ Series                 │   │
│  │  │ A deep dive into how SSL methods   │  │  │                        │   │
│  │  │ like MAE and CLIP distillation...  │  │  │ > SSL for Remote       │   │
│  │  │                                    │  │  │   Sensing (3 parts)    │   │
│  │  │ #ssl #remote-sensing #pytorch      │  │  │ > Deploying ML at     │   │
│  │  └────────────────────────────────────┘  │  │   Scale (2 parts)     │   │
│  │                                          │  │                        │   │
│  │  ┌────────────────────────────────────┐  │  └────────────────────────┘   │
│  │  │ [featured image]                   │  │                               │
│  │  ├────────────────────────────────────┤  │                               │
│  │  │ Building FleetSmart: Lessons in    │  │                               │
│  │  │ Production ML                      │  │                               │
│  │  │                                    │  │                               │
│  │  │ Mar 15, 2026 · 8 min read          │  │                               │
│  │  └────────────────────────────────────┘  │                               │
│  │                                          │                               │
│  └──────────────────────────────────────────┘                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Blog Post Page

**Layout:**
- Clean reading experience with max-width content column (~720px)
- Left margin: floating mini-TOC (table of contents) that highlights as you scroll
- Right margin: "Nearby in latent space" -- 3-4 related items (papers, projects, other posts) shown as small point clusters
- Full MDX support: code blocks with copy button, LaTeX math, interactive demos as Astro islands
- Reading progress bar at top
- Author card at bottom with links
- Giscus comments at the very bottom

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  KG  ·  Explore   Projects   Papers   Blog   Resume   Contact       [=]    │
│ [============================---------------------] 58% read                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TOC              ARTICLE CONTENT                  NEARBY IN SPACE          │
│                                                                              │
│  > Intro          Understanding Self-Supervised      · Cross-Scale MAE      │
│    Background     Learning for Remote Sensing        · MEDiC                │
│    Method                                            · WACV 2023 paper      │
│    Results        Apr 2, 2026 · 12 min · #ssl        · MaskDistill          │
│    Conclusion                                                                │
│                   Self-supervised learning has                                │
│                   transformed how we approach                                │
│                   representation learning in                                 │
│                   computer vision. In the remote                             │
│                   sensing domain, the challenges                             │
│                   are unique...                                              │
│                                                                              │
│                   ## Background                                              │
│                                                                              │
│                   The key insight behind masked                              │
│                   image modeling (MIM) is that...                            │
│                                                                              │
│                   ```python                                                  │
│                   class CrossScaleMAE(nn.Module):                            │
│                       def __init__(self, ...):                               │
│                           ...                                                │
│                   ```                                                        │
│                                                                              │
│                   ## Results                                                 │
│                                                                              │
│                   ┌──────────────────────────┐                               │
│                   │ Method     │ Top-1  │ kNN │                               │
│                   ├──────────────────────────┤                               │
│                   │ MAE        │ 83.6%  │ 71% │                               │
│                   │ Ours       │ 85.1%  │ 74% │                               │
│                   └──────────────────────────┘                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.6 Resume Page

**Layout:**
- Two options via tabs: "Interactive" and "PDF"
- Interactive view: timeline-based resume with expandable sections
  - Experience (Amazon, UTK, etc.) as timeline entries
  - Education with degree details
  - Skills as a grouped tag cloud
  - Each entry can be clicked to expand with details
- PDF view: embedded PDF viewer with download button
- The interactive view is the default -- it is searchable, linkable, and accessible

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  KG  ·  Explore   Projects   Papers   Blog   Resume   Contact       [=]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Resume                                    [Interactive] | PDF  [Download]  │
│                                                                              │
│  ┌── Experience ─────────────────────────────────────────────────────────┐   │
│  │                                                                       │   │
│  │  2023-Present  Applied Scientist · Amazon                             │   │
│  │  ─────────────────────────────────────────────                        │   │
│  │  Working on large-scale ML systems for...                             │   │
│  │  Skills: PyTorch, AWS, Large-Scale ML                                 │   │
│  │                                                                       │   │
│  │  2018-2023     Graduate Research Assistant · UTK                      │   │
│  │  ─────────────────────────────────────────────                        │   │
│  │  PhD research in self-supervised learning and remote sensing.         │   │
│  │  Published at NeurIPS, WACV, IGARSS. Taught CS courses.              │   │
│  │                                                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌── Skills ─────────────────────────────────────────────────────────────┐   │
│  │                                                                       │   │
│  │  ML/DL:    [PyTorch] [TensorFlow] [HuggingFace] [Self-Supervised]    │   │
│  │  Backend:  [Python] [FastAPI] [Node.js] [PostgreSQL]                  │   │
│  │  Cloud:    [AWS] [GCP] [Azure] [Docker]                               │   │
│  │  Frontend: [Next.js] [React] [TypeScript]                             │   │
│  │                                                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.7 Contact Page

**Layout:**
- Split layout: left side has contact form, right side has links and info
- Right side: GitHub, LinkedIn, Google Scholar, HuggingFace, email -- each as an icon + link
- Contact form: name, email, subject, message -- submits via a serverless function or Formspree
- Below: a small scatter visualization showing "Where to find me in the latent space" with social platform icons as points

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  KG  ·  Explore   Projects   Papers   Blog   Resume   Contact       [=]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Contact                                                                     │
│                                                                              │
│  ┌─────────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │                             │  │                                      │  │
│  │  Get in touch               │  │  Find me elsewhere                   │  │
│  │                             │  │                                      │  │
│  │  Name                       │  │  [GH] github.com/drkostas            │  │
│  │  ┌───────────────────────┐  │  │  [LI] linkedin.com/in/drkostas      │  │
│  │  │                       │  │  │  [GS] Google Scholar                 │  │
│  │  └───────────────────────┘  │  │  [HF] huggingface.co/drkostas       │  │
│  │                             │  │  [@@] kgeorgio@vols.utk.edu          │  │
│  │  Email                      │  │                                      │  │
│  │  ┌───────────────────────┐  │  │  ─────────────────────────────       │  │
│  │  │                       │  │  │                                      │  │
│  │  └───────────────────────┘  │  │  Based in: United States             │  │
│  │                             │  │  Open to: Senior MLE, Research       │  │
│  │  Message                    │  │  Scientist, Applied Scientist roles  │  │
│  │  ┌───────────────────────┐  │  │                                      │  │
│  │  │                       │  │  └──────────────────────────────────────┘  │
│  │  │                       │  │                                            │
│  │  │                       │  │                                            │
│  │  └───────────────────────┘  │                                            │
│  │                             │                                            │
│  │          [Send Message]     │                                            │
│  │                             │                                            │
│  └─────────────────────────────┘                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Interactive Elements and Animations

### Core Visualization (Canvas-based)

- **Point rendering:** WebGL-accelerated via `pixi.js` or raw Canvas2D. Each point is a small circle with a category-colored glow. Points pulse gently at slightly different rates (breathing effect).
- **Hover:** Point scales up 1.5x, glow intensifies, tooltip card fades in with title + category + one metric.
- **Click:** Smooth animated zoom into the cluster region. Content panel slides in from right (or navigates to detail page).
- **Filter animation:** When toggling categories, non-matching points fade to near-invisible and drift outward. Remaining points animate via spring physics to new positions (pre-computed per filter combination).
- **Search:** As user types, matching points brighten and pulse, non-matching points dim. Debounced at 200ms.

### Page Transitions

- **Astro View Transitions API:** Morph the navigation bar across pages. The scatter visualization smoothly zooms into a specific cluster when navigating to a category page (Projects zooms into project cluster, Papers into paper cluster).
- **Card entry:** Staggered fade-in-up animation for cards using Intersection Observer.
- **Timeline entries:** Animate in from the left/right as they scroll into view.

### Micro-interactions

- **Navigation links:** Subtle underline animation on hover (width grows from center).
- **Buttons:** Gentle scale + glow on hover.
- **Tags/pills:** Background color slides in on hover.
- **Copy code button:** Checkmark animation on click.
- **Reading progress bar:** Smooth gradient fill from left (indigo to cyan).
- **Scroll indicators:** Pulsing down-chevron on hero, fades out after first scroll.

### Loading States

- Points appear one by one in a "training" animation -- starting randomly positioned and settling into their final embedding positions over 1.5 seconds. This mimics a t-SNE optimization converging.

---

## 6. Mobile Adaptation

### Visualization on Mobile

The full scatter plot canvas still works on mobile but with simplified interactions:
- No hover states (tap instead)
- Tap a point to open its tooltip card
- Tap the card to navigate to detail
- Pinch-to-zoom supported
- Category filters are in a horizontally scrollable pill bar at the bottom
- Canvas resolution is halved for performance

### Layout Changes

- **Navigation:** Hamburger menu, full-screen overlay
- **Cards:** Single column, full width
- **Blog posts:** No sidebar -- TOC becomes a collapsible accordion at top, "Nearby in space" moves below the article
- **Resume:** Interactive view is the only view (PDF viewer is poor on mobile); download button prominent
- **Contact:** Stacked layout (form on top, links below)
- **Papers timeline:** Single column, all cards on one side

### Performance Budget

- First paint under 1.5s on 4G
- Visualization canvas lazy-loads after critical content
- Static fallback (screenshot of visualization) shown until canvas is ready
- All images use modern formats (WebP/AVIF) with srcset

---

## 7. Tech Requirements

### Framework and Build

```
Astro 4.x           -- Static site generator, island architecture
  @astrojs/react     -- React islands for interactive components
  @astrojs/mdx       -- Blog posts in MDX
  @astrojs/sitemap   -- SEO sitemap generation
  astro-icon         -- Icon components
```

### Visualization

```
pixi.js 8.x         -- WebGL-accelerated 2D point rendering (hero canvas)
  OR
d3.js 7.x           -- If preferring SVG for simpler interactivity
                        (fewer points = SVG is fine, 50+ points = use pixi)
```

### Animation

```
gsap 3.x             -- Page transitions, scroll animations, point animations
  ScrollTrigger       -- Scroll-linked animations (timeline, card reveals)
  Flip plugin         -- Layout animations for filter transitions
framer-motion 11.x    -- React component animations (used inside islands)
```

### Styling

```
Tailwind CSS 4.x      -- Utility-first styling
  @tailwindcss/typography  -- Blog post prose styling
```

### Content and Data

```
Astro Content Collections  -- Type-safe blog posts, project data, paper data
  Zod schemas              -- Validation for all content types
  MDX                      -- Blog post format with component embedding
KaTeX                      -- Math rendering in blog posts
shiki                      -- Code syntax highlighting (built into Astro)
```

### Deployment

```
Vercel                     -- Hosting, edge functions for contact form
  @astrojs/vercel          -- Vercel adapter
  Vercel Analytics         -- Page view tracking
  Vercel Speed Insights    -- Core Web Vitals monitoring
```

### Pre-computation

The latent space positions need to be pre-computed at build time:
- A Node.js script computes point positions using a simplified force-directed layout (or actual UMAP via `umap-js` package)
- Input: project/paper/blog metadata + manually assigned similarity tags
- Output: JSON file with x,y coordinates for each item, per filter state
- This runs as part of the Astro build pipeline

### Astro Island Architecture

```
Static (no JS):
  - Navigation bar
  - Footer
  - Blog post content (rendered MDX)
  - Resume interactive view (pure HTML/CSS accordion)
  - Paper cards
  - Project cards

React Islands (client:load):
  - LatentSpaceCanvas  -- The main visualization
  - SearchBar          -- Real-time point filtering
  - CategoryFilter     -- Toggle categories
  - ContactForm        -- Form with validation

React Islands (client:visible):
  - CodeBlock          -- Copy button interactivity
  - GiscusComments     -- Blog comments
  - PDFViewer          -- Resume PDF embed
```

---

## 8. Detailed ASCII Mockups

### Home Page (Full Viewport -- Hero State)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ bg: #0a0e17                                                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  KG   Explore  Projects  Papers  Blog  Resume  Contact          [=]  │  │
│  │  ──── ═══════                                                         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │ Search the space...                                  [x] │               │
│  └──────────────────────────────────────────────────────────┘               │
│                                                                              │
│                    ○  ○                                                       │
│              ○   ○ ○ ○  ○            ◉  ○                                    │
│            ○  ○ ○ ◉ ○ ○              ○ ○ ◉ ○                                 │
│             ○ ○ ○ ○ ○               ○ ○ ○ ○  ○                               │
│              ○ ○  ○                   ○ ○ ○                                   │
│                ○                       ○                                      │
│                           ○                                                   │
│      ┌──────────────┐   ○ ○                    ○  ○                          │
│      │ MEDiC        │  ○ ◉ ○ ○               ○ ○ ○  ○                        │
│      │ CLIP distill │   ○ ○ ○                 ○ ○ ○                          │
│      │ [Code] [HF]  │    ○ ○                   ○                              │
│      └──────────────┘                                                        │
│        (hover card)           ○ ○                                             │
│                              ○ ○ ○                                            │
│                               ○                                               │
│                                                                              │
│  ┌─────────────────────────┐    ┌──────────────────────────────────────────┐ │
│  │                         │    │                                          │ │
│  │  Kostas Georgiou        │    │  ● ML Projects    ● Papers              │ │
│  │  PhD ML Engineer        │    │  ● Products       ● PyPi Packages       │ │
│  │  Applied Scientist      │    │  ● Blog Posts     ● Bots & Misc         │ │
│  │  Amazon                 │    │                                          │ │
│  │                         │    │  Drag to pan · Scroll to zoom            │ │
│  └─────────────────────────┘    └──────────────────────────────────────────┘ │
│                                                                              │
│                         ▼ Scroll for highlights                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Home Page (Scrolled -- Below the Fold)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  KG   Explore  Projects  Papers  Blog  Resume  Contact          [=]  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════════  │
│                                                                              │
│     8+                100+              15+                7                  │
│   Publications      Citations        Projects         PyPi Packages         │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════════  │
│                                                                              │
│  Featured Work                                                    [↑ Map]   │
│                                                                              │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────┐ │
│  │ ████████████████████   │  │ ████████████████████   │  │ ██████████████ │ │
│  │ ████████████████████   │  │ ████████████████████   │  │ ██████████████ │ │
│  │ ████ FleetSmart.ai ██  │  │ ███ Cross-Scale MAE ██ │  │ ████ MEDiC ███ │ │
│  │ ████████████████████   │  │ ████████████████████   │  │ ██████████████ │ │
│  ├────────────────────────┤  ├────────────────────────┤  ├────────────────┤ │
│  │ FleetSmart.ai          │  │ Cross-Scale MAE        │  │ MEDiC          │ │
│  │ AI fleet management    │  │ NeurIPS 2023           │  │ Multi-obj CLIP │ │
│  │ FastAPI · Next.js      │  │ 54 citations           │  │ distillation   │ │
│  │         [Live]         │  │    [Paper] [Code]      │  │  [Code] [HF]   │ │
│  └────────────────────────┘  └────────────────────────┘  └────────────────┘ │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  About                                                                       │
│                                                                              │
│  I'm an Applied Scientist at Amazon with a PhD in Computer Science from      │
│  the University of Tennessee. My work spans self-supervised learning,        │
│  computer vision, and remote sensing. I build ML systems that ship --        │
│  from research papers at NeurIPS to production platforms like FleetSmart.    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  github.com/drkostas · scholar.google · linkedin · huggingface              │
│                                                                              │
│  (c) 2026 Kostas Georgiou                                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Projects Page (Grid View)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  KG   Explore  Projects  Papers  Blog  Resume  Contact          [=]  │  │
│  │                ════════                                               │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Projects                                               Scatter | [Grid]    │
│  Explore 25+ projects across ML research, products, and tools.              │
│                                                                              │
│  ┌─────┐ ┌────┐ ┌──────────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │ All │ │ ML │ │ Products │ │ PyPi │ │ Bots │ │ Misc │                   │
│  │ ═══ │ │    │ │          │ │      │ │      │ │      │                   │
│  └─────┘ └────┘ └──────────┘ └──────┘ └──────┘ └──────┘                   │
│                                                                              │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────┐│
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ││
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ││
│  ├───────────────────────┤ ├───────────────────────┤ ├─────────────────────┤│
│  │ MEDiC              ●  │ │ MaskDistill        ●  │ │ FleetSmart.ai   ●  ││
│  │                       │ │                       │ │                     ││
│  │ Multi-objective       │ │ First open PyTorch    │ │ AI-powered fleet    ││
│  │ exploration of        │ │ reproduction of       │ │ management for      ││
│  │ distillation from     │ │ MaskDistill with      │ │ vessel tracking     ││
│  │ CLIP. Achieves        │ │ pre-trained weights.  │ │ and compliance.     ││
│  │ 85.07% finetuning.   │ │                       │ │                     ││
│  │                       │ │ PyTorch SSL CLIP      │ │ FastAPI Next GCP    ││
│  │ PyTorch SSL CLIP HF   │ │   CV    HuggingFace   │ │   LLM  PostgreSQL  ││
│  │                       │ │                       │ │                     ││
│  │   [Code]    [Demo]   │ │   [Code]    [Demo]   │ │       [Live]        ││
│  └───────────────────────┘ └───────────────────────┘ └─────────────────────┘│
│                                                                              │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────┐│
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ││
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ││
│  ├───────────────────────┤ ├───────────────────────┤ ├─────────────────────┤│
│  │ ShiftMD            ●  │ │ XpensAI            ●  │ │ Soma             ●  ││
│  │ Constraint prog.      │ │ AI expense mgmt       │ │ Health dashboard    ││
│  │ shift scheduling      │ │ with OCR              │ │ Garmin + Strava     ││
│  │                       │ │                       │ │                     ││
│  │ Next OR-Tools Supa    │ │ Python AWS Azure GPT  │ │ Python Next.js      ││
│  │                       │ │        [Live]         │ │  [Code]   [Demo]   ││
│  └───────────────────────┘ └───────────────────────┘ └─────────────────────┘│
│                                                                              │
│  ... more cards below ...                                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Blog Post Page

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  KG   Explore  Projects  Papers  Blog  Resume  Contact          [=]  │  │
│  │                                  ════                                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ╔══════════════════════════════════════════════════════════════╗ 58%        │
│  ╚══════════════════════════════════════════════════════════════╝            │
│                                                                              │
│  ┌────────┐                                         ┌────────────────────┐  │
│  │  TOC   │  Understanding Self-Supervised          │ Nearby in Space    │  │
│  │        │  Learning for Remote Sensing             │                    │  │
│  │ > Intro│                                         │  ·Cross-Scale MAE  │  │
│  │   BG   │  Apr 2, 2026 · Kostas Georgiou          │  ·MEDiC paper      │  │
│  │   Meth │  12 min read                             │  ·MaskDistill      │  │
│  │   Res  │                                         │  ·WACV 2023        │  │
│  │   Conc │  #self-supervised #remote-sensing        │                    │  │
│  │        │  #pytorch #computer-vision               │                    │  │
│  │        │                                         │                    │  │
│  │        │  ────────────────────────────────        │                    │  │
│  │        │                                         │                    │  │
│  │        │  Self-supervised learning has            │                    │  │
│  │        │  fundamentally changed how we            │                    │  │
│  │        │  approach representation learning        │                    │  │
│  │        │  in computer vision. In the domain       │                    │  │
│  │        │  of remote sensing, the challenges       │                    │  │
│  │        │  are uniquely demanding...               │                    │  │
│  │        │                                         │                    │  │
│  │        │  ## Background                           │                    │  │
│  │        │                                         │                    │  │
│  │        │  The masked image modeling (MIM)         │                    │  │
│  │        │  paradigm, popularized by MAE, works     │                    │  │
│  │        │  by masking random patches of an         │                    │  │
│  │        │  image and training a model to           │                    │  │
│  │        │  reconstruct the missing pixels:         │                    │  │
│  │        │                                         │                    │  │
│  │        │  ┌──────────────────────────┐ [Copy]    │                    │  │
│  │        │  │ import torch             │           │                    │  │
│  │        │  │ from mae import MAE      │           │                    │  │
│  │        │  │                          │           │                    │  │
│  │        │  │ model = MAE(             │           │                    │  │
│  │        │  │   encoder_dim=768,       │           │                    │  │
│  │        │  │   mask_ratio=0.75        │           │                    │  │
│  │        │  │ )                        │           │                    │  │
│  │        │  └──────────────────────────┘           │                    │  │
│  │        │                                         │                    │  │
│  └────────┘  ────────────────────────────────        └────────────────────┘  │
│                                                                              │
│              ┌──────────────────────────────────────────────┐                │
│              │  Kostas Georgiou                             │                │
│              │  PhD ML Engineer · Applied Scientist, Amazon │                │
│              │  [GitHub] [Scholar] [LinkedIn]               │                │
│              └──────────────────────────────────────────────┘                │
│                                                                              │
│              Comments (via Giscus)                                            │
│              ┌──────────────────────────────────────────────┐                │
│              │  Sign in with GitHub to comment              │                │
│              └──────────────────────────────────────────────┘                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Pros and Cons

### Pros

1. **Unforgettable first impression.** No other ML engineer portfolio uses their actual work as a live data visualization. This will be remembered and talked about.
2. **Deep metaphor alignment.** The entire concept speaks the language of the target audience. Recruiters see something visually impressive; MLEs see a fellow practitioner who thinks in embeddings.
3. **Organic discovery.** The scatter plot encourages exploration -- visitors find connections between your work that a flat list would never reveal.
4. **Scalable.** Adding a new project or blog post just adds a point. No layout redesign needed.
5. **Two consumption modes.** The visualization is the "wow" entry point, but every page also has a traditional grid/list fallback for people who just want to browse.
6. **SEO-friendly.** Below the fold and on subpages, everything is standard HTML rendered by Astro. The visualization is an enhancement, not a replacement.
7. **Strong blog integration.** Blog posts are first-class citizens in the visualization, incentivizing content creation.

### Cons

1. **Visualization performance on low-end devices.** Canvas rendering of 30-50 animated points with glow effects could strain older phones. Needs a static fallback and performance monitoring.
2. **Pre-computation complexity.** The layout algorithm needs to produce good-looking clusters for every filter combination. Manual tuning of similarity weights may be needed.
3. **Accessibility challenges.** A scatter plot as primary navigation is not screen-reader friendly. The traditional list views are the accessible fallback, but the primary experience is visual-only.
4. **Content-to-points mapping.** Blog posts need enough content to justify being "points" in the space. If the blog is sparse at launch, the visualization will feel empty.
5. **Interaction learning curve.** First-time visitors might not immediately understand they can pan, zoom, and filter. Needs clear affordances and onboarding hints.
6. **Mobile experience is compromised.** The visualization is inherently a large-screen experience. Mobile gets a simpler version that loses some of the magic.

---

## 10. Effort Estimate

| Task | Estimate |
|------|----------|
| Astro project setup, Tailwind, routing | 4 hours |
| Navigation component, mobile menu | 3 hours |
| Latent space visualization (Canvas/pixi.js) | 16-20 hours |
| Point layout algorithm + pre-computation script | 8 hours |
| Hover/click/filter interactions | 8 hours |
| Filter animation (re-embedding spring physics) | 6 hours |
| Home page (hero + below-fold sections) | 6 hours |
| Projects page (scatter + grid views) | 6 hours |
| Papers page (timeline, cards, metrics) | 5 hours |
| Blog index page + MDX setup | 5 hours |
| Blog post template (TOC, sidebar, prose) | 6 hours |
| Resume page (interactive + PDF) | 4 hours |
| Contact page (form + links) | 3 hours |
| Page transitions (View Transitions API) | 4 hours |
| GSAP scroll animations | 4 hours |
| Mobile responsive pass | 6 hours |
| Accessibility audit + fallbacks | 4 hours |
| Content migration (projects, papers JSON) | 3 hours |
| Performance optimization + static fallback | 4 hours |
| Testing, polish, deploy to Vercel | 4 hours |
| **Total** | **~105-115 hours** |

This is the most technically ambitious of the three concepts. The visualization is the centerpiece and demands significant investment, but it is also what makes this concept uniquely memorable. The fallback to traditional grid/list views on every page means the site is fully functional even if a visitor never touches the scatter plot.
