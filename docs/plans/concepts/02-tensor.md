# Concept 02: The Tensor

## 1. Concept Overview

**Metaphor:** A single, slowly rotating 3D geometric shape -- an abstract tensor, tesseract-like wireframe -- serves as the hero element, brand mark, and unifying visual motif of the entire portfolio. It is the logo, the loading animation, the page transition, and the ambient backdrop. The rest of the site is ruthlessly minimal: generous whitespace, tight typography, surgical use of color. The tensor says "I work in high-dimensional spaces" without a single word. The site says "I ship clean, polished work."

**The Wow Factor:** On first load, a wireframe 4D hypercube (tesseract) fades into view at the center of the screen, slowly rotating through its fourth dimension. It reacts to the mouse -- subtle parallax, slight deformation following the cursor. As you navigate to different pages, the tensor morphs smoothly into a different geometric form (a torus for projects, an icosahedron for papers, a helix for blog). It is always present in the background or corner, always alive, always moving. The favicon is a static frame of the tensor. Page transitions use the tensor dissolving and reforming.

**Why it works for the target audience:** This concept leads with restraint and taste. Senior engineers and hiring managers at top companies (Amazon, Google, Meta) see dozens of flashy portfolios. This one stands out by being the most refined, not the most busy. The 3D element is technically impressive but understated. The minimal layout puts the content front and center. It signals: "I have strong aesthetics AND I can ship."

---

## 2. Color Palette and Typography

### Colors

```
Background:       #09090b  (zinc-950 -- true near-black)
Surface:          #18181b  (zinc-900 -- cards, elevated areas)
Surface Elevated: #27272a  (zinc-800 -- hover states)
Border:           #3f3f46  (zinc-700 -- subtle dividers)
Border Subtle:    #27272a  (zinc-800 -- very faint lines)

Primary Accent:   #a78bfa  (violet-400 -- tensor wireframe, links, active states)
Accent Glow:      #7c3aed  (violet-600 -- glow behind tensor, hover glows)
Secondary Accent: #e4e4e7  (zinc-200 -- used sparingly for emphasis)
Warm Accent:      #fbbf24  (amber-400 -- stars, citation counts, alerts)
Success:          #34d399  (emerald-400 -- live badges, status indicators)
Muted Text:       #71717a  (zinc-500)
Body Text:        #d4d4d8  (zinc-300)
Heading Text:     #fafafa  (zinc-50)

Tensor Wireframe: #a78bfa at 80% opacity, with #7c3aed glow
Tensor Vertices:  #e4e4e7 (bright points at intersections)
```

### Typography

```
Headings:     "Instrument Serif", serif   (elegant, editorial, unexpected for tech)
Body:         "Geist", sans-serif         (Vercel's own typeface -- modern, clean)
Code/Mono:    "Geist Mono", monospace     (pairs perfectly with Geist)
```

The serif-sans contrast is the key design decision. Instrument Serif for headings creates an editorial, almost academic feel that signals "this person publishes papers." Geist for body text is contemporary and incredibly legible. The tension between serif headings and sans body is visually arresting.

---

## 3. Navigation Design

### Desktop Navigation

Minimal horizontal nav, left-aligned logo mark, right-aligned links:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◇ Kostas Georgiou                  Projects  Papers  Blog  Resume  Contact │
└──────────────────────────────────────────────────────────────────────────────┘
```

- The ◇ is a tiny static tensor icon (diamond/tesseract projection) that rotates on hover
- Name is in Instrument Serif, navigation links in Geist
- Active page: text turns violet, thin underline
- Links have a subtle letter-spacing animation on hover
- Entire nav is a single line, no background -- it floats over the page content
- Becomes sticky with a frosted-glass background on scroll

### Mobile Navigation

- Hamburger icon (three thin horizontal lines) in top-right
- Opens a full-screen overlay with centered navigation links
- The tensor shape appears small and centered above the nav links, still rotating
- Large tap targets, generous spacing

### Page Transitions

The tensor serves as the transition element:
- Navigating away: content fades, tensor zooms to fill the center of the screen
- Arriving: tensor morphs into the new page's shape, then shrinks back to its position
- Duration: 600ms total, ease-in-out
- Implemented via Astro View Transitions + GSAP

---

## 4. Page Designs

### 4.1 Home Page

**Structure:** Hero takes full viewport. Below the fold: about, selected work, stats, recent posts.

**Hero:**
- Center of screen: the tensor, large (300-400px), slowly rotating
- Below the tensor: name in large Instrument Serif
- Below name: one-line role/tagline in Geist
- Below tagline: two subtle CTA buttons (View Work, Read Papers)
- Background: very faint radial gradient from violet-950 at center to zinc-950 at edges

**Below the fold:**
- "Selected Work" section: 3 featured project cards in a horizontal row
- Stats strip: "NeurIPS | WACV | IGARSS | 8+ Papers | 100+ Citations"
- "Latest Writing" section: 2-3 blog post preview cards
- Brief about paragraph
- Footer

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ◇ Kostas Georgiou                  Projects  Papers  Blog  Resume  Contact │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
│                              ╱╲                                              │
│                             ╱  ╲                                             │
│                            ╱ ╱╲ ╲                                            │
│                           ╱ ╱  ╲ ╲                                           │
│                          ╱ ╱    ╲ ╲                                          │
│                         ╱ ╱  ◇   ╲ ╲                                        │
│                          ╲ ╲    ╱ ╱                                          │
│                           ╲ ╲  ╱ ╱                                           │
│                            ╲ ╲╱ ╱                                            │
│                             ╲  ╱                                             │
│                              ╲╱                                              │
│                                                                              │
│                      Kostas Georgiou                                         │
│                                                                              │
│            PhD ML Engineer · Applied Scientist, Amazon                       │
│                                                                              │
│               [ View Work ]    [ Read Papers ]                               │
│                                                                              │
│                                                                              │
│                          ▼                                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

                        ── scroll ──

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Selected Work                                                      See all │
│  ─────────────                                                               │
│                                                                              │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐    │
│  │                     │ │                     │ │                     │    │
│  │  FleetSmart.ai      │ │  Cross-Scale MAE    │ │  MEDiC              │    │
│  │                     │ │                     │ │                     │    │
│  │  AI-powered fleet   │ │  NeurIPS 2023       │ │  Multi-objective    │    │
│  │  management         │ │  54 citations       │ │  CLIP distillation  │    │
│  │                     │ │                     │ │                     │    │
│  │  FastAPI · Next.js  │ │  PyTorch · MAE      │ │  PyTorch · CLIP     │    │
│  │       [Live] →      │ │     [Paper] →       │ │  [Code] [HF] →     │    │
│  │                     │ │                     │ │                     │    │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│    NeurIPS     WACV     IGARSS     8+ Papers     100+ Citations             │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  Latest Writing                                                     See all │
│  ──────────────                                                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Understanding Self-Supervised Learning for Remote Sensing           │   │
│  │  Apr 2, 2026 · 12 min                                               │   │
│  │  A deep dive into how SSL methods like MAE and CLIP distillation... │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Building FleetSmart: Lessons from Shipping Production ML            │   │
│  │  Mar 15, 2026 · 8 min                                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  About                                                                       │
│                                                                              │
│  Applied Scientist at Amazon. PhD in Computer Science from the University   │
│  of Tennessee, Knoxville. I build machine learning systems that bridge the  │
│  gap between research and production -- from self-supervised learning        │
│  papers at NeurIPS to deployed platforms serving real users.                 │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ◇ Kostas Georgiou · GitHub · Scholar · LinkedIn · HuggingFace              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Projects Page

**Layout:**
- Clean heading with subtitle
- Category tabs (not pills -- just text links with active underline)
- Project cards in a 2-column grid (wider cards with more breathing room)
- Each card: image on top, title, description, tags, action buttons
- The tensor floats small in the top-right background, very faint, still rotating

**Project Card Design:**
Cards are minimal with generous padding. Image has rounded corners. Tags are small monospace text. Buttons are text links with arrows, not chunky buttons.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ◇ Kostas Georgiou                  Projects  Papers  Blog  Resume  Contact │
│                                                                  ════════   │
│                                                                              │
│                                                                              │
│  Projects                                                                    │
│  Things I've built, researched, and shipped.                                │
│                                                                              │
│  All    ML Research    Products    Libraries    Bots    Other                │
│  ═══                                                                         │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   │
│  ├─────────────────────────────────┤  ├─────────────────────────────────┤   │
│  │                                 │  │                                 │   │
│  │  MEDiC                          │  │  FleetSmart.ai                  │   │
│  │                                 │  │                                 │   │
│  │  Multi-objective exploration    │  │  AI-powered fleet management    │   │
│  │  of distillation from CLIP.     │  │  platform for vessel tracking,  │   │
│  │  Achieves 85.07% finetuning     │  │  compliance monitoring, and     │   │
│  │  and 73.92% k-NN on IN-1K.      │  │  operational analytics.         │   │
│  │                                 │  │                                 │   │
│  │  PyTorch · SSL · CLIP · HF      │  │  FastAPI · Next.js · GCP · LLM  │   │
│  │                                 │  │                                 │   │
│  │  Code →    HuggingFace →        │  │  Live →                         │   │
│  │                                 │  │                                 │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   │
│  ├─────────────────────────────────┤  ├─────────────────────────────────┤   │
│  │                                 │  │                                 │   │
│  │  MaskDistill-PyTorch            │  │  ShiftMD                        │   │
│  │                                 │  │                                 │   │
│  │  First open PyTorch repro of    │  │  Intelligent shift scheduling   │   │
│  │  MaskDistill with pre-trained   │  │  system for medical depts       │   │
│  │  weights. 84.8% finetune acc.   │  │  using constraint programming.  │   │
│  │                                 │  │                                 │   │
│  │  PyTorch · SSL · CLIP · HF      │  │  Next.js · Python · OR-Tools    │   │
│  │                                 │  │                                 │   │
│  │  Code →    HuggingFace →        │  │                                 │   │
│  │                                 │  │                                 │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Papers / Publications Page

**Layout:**
- Clean list layout (not timeline) -- each paper is a full-width row
- Top: aggregate metrics in a single line
- Papers are grouped by year with year headers
- Each paper row: conference badge (left), title + abstract excerpt (center), citation count + links (right)
- Hovering a paper row reveals the full abstract in a smooth expand
- Conference names styled as colored badges

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ◇ Kostas Georgiou                  Projects  Papers  Blog  Resume  Contact │
│                                                        ══════               │
│                                                                              │
│  Publications                                                                │
│  Research at the intersection of self-supervised learning,                   │
│  computer vision, and remote sensing.                                        │
│                                                                              │
│  10 papers · 100+ citations · Venues: NeurIPS, WACV, IGARSS                │
│                                                                              │
│  ─── 2026 ──────────────────────────────────────────────────────────────── │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ECCV           ExPLoRe: Exploration-driven Pre-training         0 ★ │   │
│  │ (review)       for Long-range Remote Sensing                        │   │
│  │                                                        [Paper]      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ arXiv          MEDiC: Multi-objective Exploration of            0 ★ │   │
│  │                Distillation from CLIP                                │   │
│  │                                                  [Paper] [Code]     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ─── 2025 ──────────────────────────────────────────────────────────────── │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ IEEE/ACM       Trustworthy AI for Early Dementia Detection      0 ★ │   │
│  │ CHASE          Robust Feature Masking and Clinical                  │   │
│  │                Interpretability                      [Paper]        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ─── 2023 ──────────────────────────────────────────────────────────────── │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ NeurIPS        Cross-Scale MAE: A Tale of Multiscale           54 ★ │   │
│  │ 2023           Exploitation in Remote Sensing                       │   │
│  │                                                                     │   │
│  │                Remote sensing images present unique challenges to    │   │
│  │                image analysis due to the extensive geographic...     │   │
│  │                                              [Paper] [Code]         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ WACV           Semantic segmentation in aerial imagery using   31 ★ │   │
│  │ 2023           multi-level contrastive learning with local          │   │
│  │                consistency                           [Paper]        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Blog Page (Index)

**Layout:**
- Clean, editorial blog index
- Featured/latest post at top with large title and excerpt
- Below: grid of 2-column post cards
- Each card: title, date, reading time, excerpt, tags
- Right column: compact tag list for filtering
- No images on blog cards -- text-forward, editorial feel

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ◇ Kostas Georgiou                  Projects  Papers  Blog  Resume  Contact │
│                                                        ════                  │
│                                                                              │
│  Blog                                                                        │
│  Thoughts on machine learning, systems, and building things.                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  LATEST                                                              │   │
│  │                                                                      │   │
│  │  Understanding Self-Supervised Learning                              │   │
│  │  for Remote Sensing                                                  │   │
│  │                                                                      │   │
│  │  A deep dive into how SSL methods like MAE and CLIP distillation    │   │
│  │  are transforming representation learning for satellite imagery.     │   │
│  │  From pre-training strategies to downstream task evaluation.         │   │
│  │                                                                      │   │
│  │  Apr 2, 2026 · 12 min read                                          │   │
│  │  #self-supervised #remote-sensing #pytorch                           │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │                                 │  │                                 │   │
│  │  Building FleetSmart:           │  │  Why I Open-Source My           │   │
│  │  Production ML Lessons          │  │  Research Implementations       │   │
│  │                                 │  │                                 │   │
│  │  Lessons from building and      │  │  The case for releasing code    │   │
│  │  deploying an ML-powered        │  │  alongside papers, and how     │   │
│  │  fleet management platform.     │  │  it improves your research.    │   │
│  │                                 │  │                                 │   │
│  │  Mar 15, 2026 · 8 min           │  │  Feb 28, 2026 · 6 min          │   │
│  │  #deployment #ml-systems        │  │  #open-source #research        │   │
│  │                                 │  │                                 │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │                                 │  │                                 │   │
│  │  Constraint Programming for     │  │  From PhD to Industry:          │   │
│  │  Shift Scheduling               │  │  What Changes                   │   │
│  │                                 │  │                                 │   │
│  │  How OR-Tools solves complex    │  │  Reflections on transitioning   │   │
│  │  scheduling constraints for     │  │  from academic ML research to   │   │
│  │  medical departments.           │  │  applied science at Amazon.     │   │
│  │                                 │  │                                 │   │
│  │  Jan 20, 2026 · 10 min          │  │  Dec 5, 2025 · 5 min           │   │
│  │  #optimization #operations      │  │  #career #industry             │   │
│  │                                 │  │                                 │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Blog Post Page

**Layout:**
- Centered single column (max-width ~680px) -- like a premium publication
- Large title in Instrument Serif
- Metadata line: date, reading time, tags
- Reading progress bar (thin violet line at top)
- Article body with beautiful typography: proper line-height, paragraph spacing, pull quotes
- Code blocks with syntax highlighting and copy button
- KaTeX for math
- Author bio card at bottom
- Related posts at bottom
- No sidebars -- pure reading focus

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◇ Kostas Georgiou                  Projects  Papers  Blog  Resume  Contact │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 62%         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│              Understanding Self-Supervised                                   │
│              Learning for Remote Sensing                                     │
│                                                                              │
│              April 2, 2026 · 12 min · #ssl #remote-sensing                  │
│                                                                              │
│              ─────────────────────────────────────────                       │
│                                                                              │
│              Self-supervised learning has fundamentally                      │
│              changed how we approach representation                         │
│              learning in computer vision. In the domain                     │
│              of remote sensing, the challenges are                          │
│              uniquely demanding: images span massive                        │
│              geographic areas, come from varied sensors,                    │
│              and exhibit complex multi-scale patterns.                      │
│                                                                              │
│              In this post, I'll walk through the key                        │
│              ideas behind methods like MAE, CLIP                            │
│              distillation, and our work on Cross-Scale                      │
│              MAE (NeurIPS 2023) and MEDiC.                                  │
│                                                                              │
│              ## The Masked Image Modeling Paradigm                           │
│                                                                              │
│              The core idea is elegant: mask a large                         │
│              portion of an image (typically 75%) and                        │
│              train a model to reconstruct it.                               │
│                                                                              │
│              ┌──────────────────────────────────┐                           │
│              │ class CrossScaleMAE(nn.Module):   │  [Copy]                  │
│              │     def __init__(self,            │                           │
│              │                  img_size=224,    │                           │
│              │                  patch_size=16):  │                           │
│              │         super().__init__()        │                           │
│              │         self.encoder = ViT(...)   │                           │
│              └──────────────────────────────────┘                           │
│                                                                              │
│              > "The key insight is that multi-scale                         │
│              > consistency during pre-training leads                        │
│              > to dramatically better downstream                            │
│              > performance in remote sensing."                               │
│                                                                              │
│              ## Results                                                      │
│                                                                              │
│              ┌────────────────────────────────────┐                         │
│              │ Method        │ Top-1  │ kNN  │ mIoU│                         │
│              ├────────────────────────────────────┤                         │
│              │ MAE           │ 83.6%  │ 71.2%│ 45.1│                         │
│              │ Scale-MAE     │ 84.1%  │ 72.0%│ 46.3│                         │
│              │ Ours (CS-MAE) │ 85.1%  │ 73.9%│ 48.7│                         │
│              └────────────────────────────────────┘                         │
│                                                                              │
│              ─────────────────────────────────────────                       │
│                                                                              │
│              ┌──────────────────────────────────────┐                       │
│              │  Kostas Georgiou                      │                       │
│              │  PhD ML Engineer · Applied Scientist  │                       │
│              │  Amazon                               │                       │
│              │  [GitHub] [Scholar] [LinkedIn]         │                       │
│              └──────────────────────────────────────┘                       │
│                                                                              │
│              Related                                                         │
│              ┌─────────────────┐  ┌──────────────────┐                     │
│              │ Building         │  │ Why I Open-      │                     │
│              │ FleetSmart...    │  │ Source My...      │                     │
│              │ 8 min            │  │ 6 min             │                     │
│              └─────────────────┘  └──────────────────┘                     │
│                                                                              │
│              Comments (Giscus)                                               │
│              ─────────────────────────────────────────                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.6 Resume Page

**Layout:**
- Toggle: Interactive | PDF (interactive is default)
- Interactive view: left column has section labels, right column has content
- Sections: Summary, Experience, Education, Skills, Publications
- Skills displayed as grouped tag rows
- Clean, print-like typography
- Download PDF button always visible

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ◇ Kostas Georgiou                  Projects  Papers  Blog  Resume  Contact │
│                                                              ══════         │
│                                                                              │
│  Resume                                          Interactive | PDF  [↓ PDF] │
│                                                  ═══════════                 │
│                                                                              │
│  ┌────────────┬─────────────────────────────────────────────────────────┐   │
│  │            │                                                         │   │
│  │  Summary   │  Applied Scientist at Amazon with a PhD in Computer     │   │
│  │            │  Science. 8+ years of experience in self-supervised     │   │
│  │            │  learning, computer vision, and remote sensing.          │   │
│  │            │  Published at NeurIPS, WACV, and IGARSS.                │   │
│  │            │                                                         │   │
│  ├────────────┼─────────────────────────────────────────────────────────┤   │
│  │            │                                                         │   │
│  │ Experience │  Applied Scientist · Amazon              2023 - Present │   │
│  │            │  Large-scale ML systems and applied research.           │   │
│  │            │                                                         │   │
│  │            │  Graduate Research Asst. · UTK              2018 - 2023 │   │
│  │            │  PhD research in SSL for remote sensing. Published at   │   │
│  │            │  NeurIPS, WACV, IGARSS. Teaching assistant for CS.      │   │
│  │            │                                                         │   │
│  ├────────────┼─────────────────────────────────────────────────────────┤   │
│  │            │                                                         │   │
│  │ Education  │  PhD, Computer Science · U. of Tennessee    2018 - 2023 │   │
│  │            │  Thesis: Self-Supervised Learning for Remote Sensing    │   │
│  │            │                                                         │   │
│  │            │  BSc, Computer Science · AUTH, Greece        2012 - 2018 │   │
│  │            │                                                         │   │
│  ├────────────┼─────────────────────────────────────────────────────────┤   │
│  │            │                                                         │   │
│  │ Skills     │  ML/DL:    PyTorch  TensorFlow  HuggingFace  SSL       │   │
│  │            │  Backend:  Python  FastAPI  Node.js  PostgreSQL         │   │
│  │            │  Cloud:    AWS  GCP  Azure  Docker  Kubernetes          │   │
│  │            │  Frontend: Next.js  React  TypeScript                    │   │
│  │            │                                                         │   │
│  └────────────┴─────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.7 Contact Page

**Layout:**
- Minimal. Centered content. The tensor floats behind, larger, very faint.
- Heading + subtitle
- Social links as icon rows
- Simple contact form below
- No sidebar, no split layout -- just centered elegance

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ◇ Kostas Georgiou                  Projects  Papers  Blog  Resume  Contact │
│                                                                     ═══════ │
│                                                                              │
│                                                                              │
│                         (faint tensor in background)                         │
│                                                                              │
│                             Get in Touch                                     │
│                                                                              │
│                  I'm always open to interesting conversations                │
│                  about ML, research, or collaboration.                       │
│                                                                              │
│                                                                              │
│                    [GH]   [LI]   [GS]   [HF]   [@@]                         │
│                                                                              │
│                                                                              │
│                  ┌──────────────────────────────────┐                       │
│                  │  Name                             │                       │
│                  │  ┌──────────────────────────────┐ │                       │
│                  │  │                              │ │                       │
│                  │  └──────────────────────────────┘ │                       │
│                  │                                   │                       │
│                  │  Email                             │                       │
│                  │  ┌──────────────────────────────┐ │                       │
│                  │  │                              │ │                       │
│                  │  └──────────────────────────────┘ │                       │
│                  │                                   │                       │
│                  │  Message                           │                       │
│                  │  ┌──────────────────────────────┐ │                       │
│                  │  │                              │ │                       │
│                  │  │                              │ │                       │
│                  │  │                              │ │                       │
│                  │  └──────────────────────────────┘ │                       │
│                  │                                   │                       │
│                  │         [ Send Message ]           │                       │
│                  └──────────────────────────────────┘                       │
│                                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Interactive Elements and Animations

### The Tensor (Three.js)

- **Rendering:** Three.js with a minimal scene. Single wireframe geometry. No textures, no complex lighting -- just wireframe lines with bloom post-processing (UnrealBloomPass).
- **Rotation:** Continuous slow rotation on two axes. The tesseract also "breathes" -- vertices pulse slightly in/out along the 4th dimension projection.
- **Mouse reactivity:** The tensor tilts toward the cursor (parallax effect, max 15 degrees). Moving the cursor near the tensor slightly distorts it (vertices pull toward cursor).
- **Per-page morphs:**
  - Home: Tesseract (4D hypercube projection)
  - Projects: Torus wireframe (interconnected, continuous)
  - Papers: Icosahedron wireframe (faceted, crystalline)
  - Blog: DNA helix wireframe (continuous creation)
  - Resume: Cube wireframe (structured, solid)
  - Contact: Sphere wireframe (open, approachable)
- **Morph animation:** Vertices interpolate between shapes using GSAP with elastic easing. Duration: 800ms.
- **Background presence:** On non-hero pages, the tensor lives in the top-right corner at 30% opacity, small (80px), still rotating and mouse-reactive.

### Page Transitions

- **Astro View Transitions:** Content cross-fades between pages (300ms).
- **Tensor morph:** Simultaneous with the page transition, the tensor morphs to the new shape.
- **Navigation underline:** Slides smoothly from current link to new link position.

### Scroll Animations

- **Content reveals:** Sections fade in + translate up 20px as they scroll into view. Staggered timing for card grids.
- **Stats numbers:** Count up animation when the stats strip scrolls into view.
- **Paper list:** Rows slide in from the left with 50ms stagger.

### Micro-interactions

- **Links:** Violet underline grows from left on hover.
- **Cards:** Subtle border-color change (zinc-700 to violet-400/30%) on hover. Shadow elevation increases.
- **Tags:** Slight background fill on hover.
- **Buttons:** Scale 1.02x on hover, 0.98x on press.
- **Logo diamond:** Rotates 90 degrees on hover.
- **Copy code button:** Checkmark replaces icon with a spring animation.

### Loading State

- The tensor renders first (it is tiny), then page content fades in.
- No loading spinner -- the tensor IS the loading indicator.

---

## 6. Mobile Adaptation

### Tensor on Mobile

- The tensor still renders on mobile but at a smaller size (200px on hero, 40px on other pages).
- No mouse reactivity (obviously), but it responds to device gyroscope tilt if available.
- Morph animations still occur between pages.
- If performance is poor, fall back to a static SVG representation.

### Layout Changes

- **Navigation:** Hamburger menu, full-screen overlay with tensor centered above links.
- **Home hero:** Tensor smaller, name and tagline below it, CTAs stack vertically.
- **Projects:** Single column cards, full width.
- **Papers:** Conference badge moves above the title (stacked layout).
- **Blog index:** Single column, featured post card takes full width.
- **Blog post:** Full-width text column, generous padding.
- **Resume:** Labels move above content (stacked instead of side-by-side).
- **Contact:** Form takes full width, social icons stack into 2 rows.

### Performance

- Three.js canvas resolution halved on mobile.
- Bloom post-processing disabled below 768px viewport (wireframe only, no glow).
- Total Three.js bundle: ~150KB gzipped (minimal scene, no heavy add-ons).
- Static SVG fallback for devices that cannot run WebGL.

---

## 7. Tech Requirements

### Framework and Build

```
Astro 4.x                -- Static site generator
  @astrojs/react          -- React islands for Three.js canvas
  @astrojs/mdx            -- Blog posts
  @astrojs/sitemap         -- SEO
  astro-icon               -- Icons
```

### 3D Rendering

```
three 0.170+              -- 3D engine for the tensor
  @react-three/fiber      -- React bindings for Three.js (used in island)
  @react-three/drei       -- Helpers (OrbitControls fallback, etc.)
  postprocessing          -- Bloom effect (three.js post-processing)
```

### Animation

```
gsap 3.x                  -- Page transitions, morph interpolation, scroll reveals
  ScrollTrigger           -- Scroll-linked animations
  MorphSVGPlugin          -- If using SVG fallback morphing (GreenSock Club)
framer-motion 11.x        -- React component animations (subtle, inside islands)
```

### Styling

```
Tailwind CSS 4.x           -- Utility-first
  @tailwindcss/typography   -- Blog prose
```

### Fonts

```
Instrument Serif           -- From Google Fonts (headings)
Geist / Geist Mono         -- From Vercel (body, code)
                              npm install geist
```

### Content and Data

```
Astro Content Collections   -- Blog posts, projects, papers
  Zod schemas               -- Validation
  MDX                       -- Blog format
KaTeX                       -- Math
shiki                       -- Code highlighting (built into Astro)
```

### Deployment

```
Vercel                      -- Hosting
  @astrojs/vercel           -- Adapter
  Vercel Analytics
  Vercel Speed Insights
```

### Astro Island Architecture

```
Static (no JS):
  - Navigation (CSS-only mobile menu or minimal JS)
  - All page content (headings, text, cards, paper list)
  - Footer
  - Blog post body (rendered MDX)
  - Resume interactive view

React Islands:
  client:load:
    - TensorCanvas          -- The 3D tensor (Three.js scene)
  client:visible:
    - ContactForm           -- Form with validation
    - CodeBlock             -- Copy button
    - GiscusComments        -- Blog comments
    - PDFViewer             -- Resume PDF embed
  client:idle:
    - CountUp               -- Stats number animation
```

The key constraint: the tensor is the ONLY heavy interactive element. Everything else is either static HTML or lightweight. This keeps the JS bundle small and performance excellent.

---

## 8. Detailed ASCII Mockups

(See Section 4 above -- each page section includes a detailed ASCII mockup.)

Additional mockup -- the tensor morph sequence during navigation:

```
  Page: Home              Transition           Page: Projects
                                              
     ╱╲                     ╱╲                                
    ╱  ╲                   ╱─ ╲                   ╭──────╮    
   ╱ ╱╲ ╲                ╱─── ╲                  │      │    
  ╱ ╱  ╲ ╲              ╱──◯── ╲                 │  ◯◯  │    
   ╲ ╲  ╱ ╱              ╲───  ╱                  │      │    
    ╲ ╲╱ ╱                ╲── ╱                   ╰──────╯    
     ╲  ╱                  ╲─╱                                
      ╲╱                    ╲╱                   (torus)      
                                              
  (tesseract)           (morphing)                            
```

### Mobile Home Page

```
┌──────────────────────────────┐
│  ◇ Kostas Georgiou      [=] │
│                              │
│                              │
│                              │
│            ╱╲                │
│           ╱  ╲               │
│          ╱ ╱╲ ╲              │
│         ╱ ╱  ╲ ╲             │
│          ╲ ╲  ╱ ╱            │
│           ╲ ╲╱ ╱             │
│            ╲  ╱              │
│             ╲╱               │
│                              │
│      Kostas Georgiou         │
│                              │
│  PhD ML Engineer             │
│  Applied Scientist, Amazon   │
│                              │
│     [ View Work ]            │
│     [ Read Papers ]          │
│                              │
│             ▼                │
│                              │
├──────────────────────────────┤
│                              │
│  Selected Work               │
│                              │
│  ┌──────────────────────────┐│
│  │ FleetSmart.ai            ││
│  │ AI fleet management      ││
│  │ FastAPI · Next.js · GCP  ││
│  │          [Live] →        ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ Cross-Scale MAE          ││
│  │ NeurIPS 2023 · 54 cit.   ││
│  │ PyTorch · MAE             ││
│  │     [Paper] [Code] →     ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ MEDiC                     ││
│  │ CLIP distillation         ││
│  │ PyTorch · SSL · CLIP     ││
│  │    [Code] [HF] →         ││
│  └──────────────────────────┘│
│                              │
└──────────────────────────────┘
```

---

## 9. Pros and Cons

### Pros

1. **Timeless design.** Minimal dark themes do not age. This will look as good in 2028 as it does in 2026.
2. **Content-first.** The minimal styling puts focus squarely on the work. Recruiters and hiring managers can quickly scan projects and papers without visual noise.
3. **Fast performance.** One Three.js scene with a single wireframe geometry is extremely lightweight compared to full 3D portfolios. Most of the site is static HTML.
4. **Strong brand identity.** The tensor becomes a recognizable personal brand mark. It works as a favicon, Twitter avatar, business card icon, presentation slide motif.
5. **Editorial quality.** The Instrument Serif + Geist combination with generous whitespace gives the site a premium, publication-grade feel.
6. **Low content dependency.** Unlike the Latent Space concept, this looks great even with few blog posts. The design is driven by typography and the tensor, not content volume.
7. **Excellent Astro fit.** Almost everything is static. Only one React island (the tensor) needs client-side JS. Lighthouse scores will be near-perfect.

### Cons

1. **Subtlety risk.** The "wow" is quieter than the other concepts. Some visitors might see "just another dark portfolio" before noticing the tensor and morph animations.
2. **Serif controversy.** Instrument Serif is an unusual choice for a tech portfolio. Some may find it too "editorial" for an ML engineer. Counter-argument: that is exactly why it stands out.
3. **Three.js overhead for one element.** Loading the Three.js library (~150KB gzipped) for a single wireframe shape could feel heavy. Mitigation: lazy-load, static SVG fallback.
4. **Morph animations require tuning.** Getting smooth vertex interpolation between different geometries (tesseract -> torus -> icosahedron) requires custom code. Off-the-shelf solutions are limited.
5. **Less interactive.** Compared to the Latent Space or Mission Control concepts, there is less for visitors to "do." The experience is more lean-back than lean-forward.
6. **Two-column projects grid wastes space.** On ultra-wide screens, a 2-column layout might feel sparse. Needs a max-width container.

---

## 10. Effort Estimate

| Task | Estimate |
|------|----------|
| Astro project setup, Tailwind, routing, fonts | 4 hours |
| Navigation component, mobile menu | 3 hours |
| Three.js tensor scene (wireframe + bloom) | 8 hours |
| Mouse reactivity + gyroscope | 3 hours |
| Shape morphing between pages (6 shapes) | 8 hours |
| SVG static fallback for tensor | 2 hours |
| Home page (hero + below-fold sections) | 5 hours |
| Projects page (tabs, grid, cards) | 5 hours |
| Papers page (list, badges, expand) | 4 hours |
| Blog index page + MDX pipeline | 4 hours |
| Blog post template (typography, code, math) | 5 hours |
| Resume page (interactive + PDF toggle) | 4 hours |
| Contact page (form + social links) | 2 hours |
| Page transitions (View Transitions + tensor morph sync) | 4 hours |
| GSAP scroll animations (reveals, counters) | 3 hours |
| Mobile responsive pass | 5 hours |
| Accessibility audit | 2 hours |
| Content migration | 3 hours |
| Performance optimization | 2 hours |
| Testing, polish, deploy | 3 hours |
| **Total** | **~80-85 hours** |

This is the most achievable concept of the three. The tensor is the sole complex interactive element, and the rest of the site is clean static content. The design's power comes from restraint, not from engineering complexity.
