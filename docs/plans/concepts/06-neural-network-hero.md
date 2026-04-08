# Concept 06: The Neural Network (Hero)

**Status:** Draft  
**Author:** Kostas Georgiou  
**Date:** 2026-04-06  
**Framework:** Astro + Canvas/Three.js + GSAP  
**Theme:** Dark

---

## 1. Concept Overview

### The Metaphor

Kostas's career is a neural network. Skills are nodes. Career stages are layers. Experience flows through connections as data flows through weights. The portfolio features an interactive neural network diagram as the hero section, with a subtle, living version persisting as a background element across every page. The network is not decorative -- it is functional: hovering nodes reveals related projects, clicking connections traces how one skill led to another, and navigating between pages causes particles to reroute through different pathways, visualizing how different aspects of the career connect.

### The Wow Factor

The hero section fills the viewport with a stylized neural network diagram. The input layer on the left shows foundational skills (Python, Math, CS). Hidden layers in the middle represent career stages (BSc, MSc, PhD, Amazon). The output layer on the right shows current capabilities (Production ML, Research, Products). Glowing particles continuously flow left-to-right through the connections, representing "data" (experience) being processed through the network. The network is interactive:

- **Hover a node:** It lights up and shows a tooltip with the skill name, years of experience, and related projects. Connected nodes glow proportionally.
- **Click a node:** A panel slides in showing all projects that use that skill/belong to that stage.
- **Scroll down:** The network smoothly compresses into a subtle background pattern that persists on all pages -- a constellation of faintly glowing dots with occasional flowing particles.
- **Navigate to Projects:** Particles reroute to flow through the "Products" and "Research" output nodes, visualizing what section you are viewing.

### Target Audience Hooks

- **Recruiters (30-second scan):** The hero immediately communicates "ML Engineer" through pure visual language. Name, title, and CTA buttons are front and center. The network is eye-catching but does not obstruct the key information.
- **Hiring Managers:** The network diagram literally shows skill breadth and depth. They can hover nodes to see "PyTorch - 6 years - used in 8 projects" without reading paragraphs of text. It is an interactive resume.
- **Senior MLEs / Peers:** The architecture diagram is their daily vocabulary. Seeing a portfolio that IS a neural network signals deep domain fluency. The interactive skill exploration is genuinely useful for understanding the person's capabilities.

---

## 2. Color Palette & Typography

### Color Palette

```
Background:             #08090d    (deep navy-black)
Surface (cards):        #10111a    (dark panels, slight blue tint)
Surface hover:          #171828    (lifted panels)
Border:                 #1e2035    (subtle structural lines)

Network node (idle):    #3b3f5c    (dim, inactive nodes)
Network node (active):  #7c9aff    (periwinkle blue -- lit up on hover/focus)
Network connection:     #1e2035    (very subtle lines when idle)
Network connection lit: #7c9aff30  (semi-transparent blue when particles pass)
Particle color:         #7c9aff    (glowing blue particles)
Particle glow:          #7c9aff60  (bloom effect around particles)

Primary accent:         #7c9aff    (periwinkle blue -- same as network active)
Secondary accent:       #a78bfa    (soft violet -- secondary highlights)
Warm accent:            #fbbf24    (amber -- product/live badges)
Success accent:         #34d399    (emerald -- open source, code links)
Error/citation:         #f87171    (coral -- publication venue badges)

Text primary:           #e2e8f0    (high-contrast body text)
Text secondary:         #8892b0    (muted descriptions, metadata)
Text tertiary:          #4a5275    (very muted labels)

Gradient glow:          radial-gradient(#7c9aff15, transparent)
                        (subtle glow behind network nodes)
```

### Typography

```
Headings:       Space Grotesk, 600/700 weight
                (geometric sans-serif with tech/engineering feel)

Body:           Inter, 400/500 weight
                (clean, optimized for screen readability)

Code/tags:      JetBrains Mono, 400 weight
                (inline code, skill labels, technical terms)

Display/hero:   Space Grotesk, 800 weight, tracking tight
                (hero name and major section titles)

Node labels:    JetBrains Mono, 500 weight, 0.7rem
                (labels on network nodes -- must be very legible at small size)

Math:           KaTeX (for blog equations)
```

### Type Scale

```
Hero name:       clamp(2.5rem, 5vw, 4rem)
Section title:   clamp(1.5rem, 3vw, 2.25rem)
Card title:      1.25rem
Body:            1rem / 1.65 line-height
Small/meta:      0.875rem
Node label:      0.7rem, monospace
Tag:             0.75rem, uppercase, letter-spacing 0.05em
```

---

## 3. Navigation Design

### Primary Navigation: Minimal Top Bar

A clean, minimal top navigation that does not compete with the network hero.

```
Layout:
  Left:    "KG" monogram (circle with initials, styled as a node)
  Center:  Home  Projects  Papers  Blog  Resume  Contact
  Right:   [Download CV] pill button

Behavior:
  - Transparent on hero (overlaid on the network)
  - Gains a frosted-glass background after scrolling past hero
  - Active link: underline + the network background subtly brightens 
    around the corresponding "output node"
  - On mobile: hamburger with slide-in drawer
  - Scroll-aware: hides on scroll down, reveals on scroll up
```

### Network-Aware Navigation (Unique Feature)

When you navigate between pages, the background network responds:
- **Home:** All particles flow evenly through all paths
- **Projects:** Particles concentrate through "Products" and "Research" output nodes
- **Papers:** Particles flow toward "Publications" output node
- **Blog:** Particles flow toward "Knowledge Sharing" output node
- **Resume:** All nodes brighten simultaneously (full network activated)
- **Contact:** Particles converge to a single output point

This is subtle (the background network is low-opacity) but adds a living, responsive feel to navigation.

---

## 4. Page Designs

### 4.1 HOME PAGE

The home page is built around the interactive neural network hero, with content sections below.

#### Hero Section (100vh)

The neural network fills the viewport. The person's name, title, and CTA buttons are overlaid in the center-left area, between the input and first hidden layer.

##### Network Architecture

```
INPUT LAYER        HIDDEN LAYER 1     HIDDEN LAYER 2     OUTPUT LAYER
(Foundations)      (Education)         (Expertise)         (Current)

○ Python           ○ BSc CS (AUTH)     ○ SSL / MIM        ○ Production ML
○ Math/Stats       ○ MSc CS (UTK)     ○ Computer Vision  ○ Research
○ ML Theory        ○ PhD (UTK)        ○ NLP / LLMs       ○ Products
○ Software Eng     ○ Amazon           ○ Remote Sensing   ○ Open Source
○ Data Systems                        ○ Full-Stack       ○ Publications
```

Each node is a circle (~20px) with a label. Connections are thin lines between every node in adjacent layers. Particles (small glowing dots, 3-5px) flow left-to-right along connections, with speed and brightness proportional to the "strength" of that skill path.

##### Content Overlay

```
                    KOSTAS GEORGIOU
              PhD  |  ML Engineer  |  Applied Scientist

           8+ years  ·  8 publications  ·  100+ citations
               NeurIPS  ·  WACV  ·  IGARSS

          [View Projects]  [Download CV]  [Contact]
```

#### Below the Hero: Content Sections

After scrolling past the hero, the network compresses into a subtle background (opacity 0.05-0.08) and the content sections begin.

##### Skills Section: "Network Weights"

Skills displayed as a grid, each skill is a "node" that connects to the network diagram. Hovering a skill highlights its node in the background network.

```
NETWORK WEIGHTS (Skills)

Research                    Engineering                 Infrastructure
┌─────────────┐             ┌─────────────┐            ┌─────────────┐
│ ● PyTorch   │             │ ● FastAPI   │            │ ● AWS       │
│ ● SSL / MIM │             │ ● Next.js   │            │ ● GCP       │
│ ● CLIP      │             │ ● Python    │            │ ● Docker    │
│ ● ViTs      │             │ ● React     │            │ ● K8s       │
│ ● OpenCV    │             │ ● TypeScript│            │ ● PostgreSQL│
│ ● HF        │             │ ● OR-Tools  │            │ ● Serverless│
└─────────────┘             └─────────────┘            └─────────────┘
```

##### Featured Projects: "Forward Pass Results"

Three featured project cards, each connected to the network by a faint line from the relevant output node.

```
FORWARD PASS: TOP RESULTS

┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ ░░░░░ IMAGE ░░░░░░░ │  │ ░░░░░ IMAGE ░░░░░░░ │  │ ░░░░░ IMAGE ░░░░░░░ │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ FleetSmart.ai       │  │ Cross-Scale MAE     │  │ MEDiC               │
│ AI fleet mgmt SaaS  │  │ NeurIPS 2023        │  │ CLIP distillation   │
│ [● Live]            │  │ [Paper] [Code]      │  │ [Paper][Code][HF]   │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘

              → View all projects →
```

##### Recent Publications: "Validation Metrics"

A compact list of top publications with citation counts.

```
VALIDATION METRICS (Top Publications)

  Cross-Scale MAE          NeurIPS 2023       54 citations    [PDF] [Code]
  mCL-LC                   WACV 2023          31 citations    [PDF]
  Occasionally Secure      arXiv 2024         14 citations    [PDF]

                    → View all publications →
```

#### ASCII Mockup: Home Page

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  (KG)       Home   Projects   Papers   Blog   Resume   Contact    [Download CV]  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                           INTERACTIVE NEURAL NETWORK                             │
│                                                                                  │
│   INPUT            HIDDEN 1          HIDDEN 2           OUTPUT                   │
│                                                                                  │
│   ○ Python ─────── ○ BSc ──────────── ○ SSL/MIM ──────── ○ Prod ML              │
│     │ ╲         ╱  │ ╲            ╱   │ ╲            ╱   │                       │
│   ○ Math ──── ● ── ○ MSc ──── ● ──── ○ CV ──── ● ────── ○ Research             │
│     │ ╲    ╱╲  ╲ ╱ │ ╲    ╱╲  ╲ ╱   │ ╲    ╱╲  ╲ ╱   │                       │
│   ○ ML Th ── ● ─── ○ PhD ──── ● ──── ○ NLP ──── ● ───── ○ Products             │
│     │ ╲    ╱  ╲╱╲  │ ╲    ╱   ╲╱╲   │ ╲    ╱   ╲╱╲   │                       │
│   ○ SWE ──── ● ─── ○ Amzn ─── ● ──── ○ RS ───── ● ───── ○ OSS                  │
│     │           ╲   │              ╲   │              ╲   │                       │
│   ○ Data ──────── ╲ │               ╲  ○ FullStk ──── ╲── ○ Pubs                │
│                                                                                  │
│                  ● = flowing particle                                             │
│                                                                                  │
│               KOSTAS GEORGIOU                                                    │
│        PhD  |  ML Engineer  |  Applied Scientist                                 │
│                                                                                  │
│     8+ years  ·  8 pubs  ·  100+ cites  ·  NeurIPS WACV IGARSS                  │
│                                                                                  │
│        [View Projects]   [Download CV]   [Contact]                               │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│         ·  ·    ·       ·  ·    ·       ·  ·    ·   ← subtle network bg         │
│  ·   ·    ·  ·    ·  ·    ·  ·    ·  ·    ·  ·   ·                              │
│                                                                                  │
│  NETWORK WEIGHTS                                                                 │
│                                                                                  │
│  Research              Engineering            Infrastructure                     │
│  ┌────────────┐        ┌────────────┐         ┌────────────┐                     │
│  │ ● PyTorch  │        │ ● FastAPI  │         │ ● AWS/GCP  │                     │
│  │ ● SSL/MIM  │        │ ● Next.js  │         │ ● Docker   │                     │
│  │ ● CLIP     │        │ ● Python   │         │ ● K8s      │                     │
│  │ ● ViTs     │        │ ● React    │         │ ● Postgres │                     │
│  │ ● HF       │        │ ● TS       │         │ ● Svrless  │                     │
│  └────────────┘        └────────────┘         └────────────┘                     │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ·   ·    ·  ·    ·  ·    ·  ·    ·  ·    ·  ·   ·                              │
│                                                                                  │
│  FORWARD PASS: TOP RESULTS                                                       │
│                                                                                  │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐     │
│  │ ░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │     │
│  │ ░░░ FLEETSMART ░░░░░ │ │ ░░░ CROSS-SCALE ░░░░ │ │ ░░░ MEDIC ░░░░░░░░░░ │     │
│  │ ░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░ │     │
│  ├──────────────────────┤ ├──────────────────────┤ ├──────────────────────┤     │
│  │ FleetSmart.ai        │ │ Cross-Scale MAE      │ │ MEDiC                │     │
│  │ AI fleet management  │ │ NeurIPS 2023, 54 cit │ │ CLIP distillation    │     │
│  │ FastAPI Next.js GCP  │ │ PyTorch MIM CV       │ │ PyTorch SSL CLIP     │     │
│  │ [● Live]      [More] │ │ [Paper] [Code]       │ │ [Paper][Code][HF]    │     │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘     │
│                                                                                  │
│                        → View all projects →                                     │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ·   ·    ·  ·    ·  ·    ·  ·    ·  ·    ·  ·   ·                              │
│                                                                                  │
│  VALIDATION METRICS                                                              │
│                                                                                  │
│  Cross-Scale MAE         NeurIPS 2023       54 cites     [PDF] [Code]           │
│  mCL-LC                  WACV 2023          31 cites     [PDF]                   │
│  Occasionally Secure     arXiv 2024         14 cites     [PDF]                   │
│                                                                                  │
│                    → View all publications →                                      │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  (KG)   GitHub  LinkedIn  Scholar  HuggingFace  PyPi            gkos.dev        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 PROJECTS PAGE

#### Concept

"Network Outputs" -- projects are the outputs of the neural network. The page groups projects by output node (Production ML, Research, Open Source, Packages). The background network subtly highlights the relevant pathways for the currently viewed category.

#### Layout

- **Header:** "Network Outputs" with the total project count
- **Filter bar:** All | Products | Research | Open Source | Packages -- selecting a filter causes the background network particles to visually route toward that output node
- **Featured tier (6 projects):** Large cards with hero images, descriptions, tech stack tags, and action buttons
- **Standard tier:** Medium cards in a 3-column grid
- **Compact tier:** Dense list for minor/old projects

#### Project Card Design

Each featured project card has a subtle visual connection to the network -- a faint glowing line extends from the top-left corner of the card upward, connecting to the relevant area of the background network. This is a very subtle effect (low opacity) that reinforces the metaphor without being distracting.

```
    · · · ·              ← faint line to network
    │
┌───┴──────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░ PROJECT IMAGE ░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
├──────────────────────────────┤
│ Project Name                 │
│                              │
│ One-paragraph description    │
│ of the project and its       │
│ impact or results.           │
│                              │
│ ┌──────┐ ┌──────┐ ┌──────┐  │
│ │PyTorch│ │ CLIP │ │  HF  │  │
│ └──────┘ └──────┘ └──────┘  │
│                              │
│ [Paper]  [Code]  [HF Demo]  │
└──────────────────────────────┘
```

#### ASCII Mockup: Projects Page

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  (KG)       Home   Projects   Papers   Blog   Resume   Contact    [Download CV]  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ·   ·    ·  ·  ● ·  ·  ● ·  ·    ·  ·   ·  ← network bg (particles flowing  │
│    ·   ·  ● ·    ·  ·    ·  ·  ● ·    ·  ·      toward "Products" output)     │
│                                                                                  │
│  NETWORK OUTPUTS                                                                 │
│  Explore the results of the forward pass.                                        │
│                                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                        │
│  │▌ All  ▐│ │Products│ │Research│ │  OSS   │ │Packages│  ← filter tabs          │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                        │
│                                                                                  │
│  ── FEATURED ────────────────────────────────────────────────────────            │
│                                                                                  │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░ FLEETSMART IMAGE ░░░░░░░░░ │ │ ░░░░░░░░ MEDIC IMAGE ░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  ├─────────────────────────────────────┤ ├─────────────────────────────────────┤ │
│  │ FleetSmart.ai                       │ │ MEDiC                               │ │
│  │                                     │ │                                     │ │
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
│  │ First open reproduction of          │ │ Self-supervised masked autoencoder  │ │
│  │ MaskDistill. 84.8% finetune acc.    │ │ with multi-scale exploitation.      │ │
│  │ [Code]  [HuggingFace]              │ │ NeurIPS 2023  ·  54 citations       │ │
│  └─────────────────────────────────────┘ │ [Paper]  [Code]                     │ │
│                                          └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐ │
│  │ ShiftMD                             │ │ XpensAI                             │ │
│  │ Constraint optimization scheduling  │ │ AI expense management with OCR      │ │
│  │ for medical departments.            │ │ and intelligent categorization.     │ │
│  │ Next.js  Python  OR-Tools  Supa     │ │ Python  AWS  Azure  GPT-4o         │ │
│  │ [Coming Soon]                       │ │ [● Live]                            │ │
│  └─────────────────────────────────────┘ └─────────────────────────────────────┘ │
│                                                                                  │
│  ── STANDARD ────────────────────────────────────────────────────────            │
│                                                                                  │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐           │
│  │ ░░░ IMAGE ░░░░░░░░ │ │ ░░░ IMAGE ░░░░░░░░ │ │ ░░░ IMAGE ░░░░░░░░ │           │
│  │ Soma               │ │ Minecraft AI       │ │ 3D Segmentation   │           │
│  │ Health + fitness    │ │ RL maze solving    │ │ Medical ViT       │           │
│  │ [Demo] [Code]      │ │ [Code]             │ │ [Code]            │           │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘           │
│                                                                                  │
│  ── COMPACT ─────────────────────────────────────────────────────────            │
│                                                                                  │
│  BERT QA — Reading comprehension on novels ........................ [Code]       │
│  Hybrid Girvan Newman — Distributed community detection .... [Code][Paper]       │
│  Accident Severity — Car accident prediction with XGBoost ..... [Code]           │
│  COVID-19 Vaccination — LSTM time series forecasting .......... [Code]           │
│  Instagram Likes — CNN engagement prediction .................. [Code]           │
│  RL Value Iteration — MDP optimal policy ...................... [Code]           │
│  Numpy CNN — Pure numpy convolution ........................... [Code]           │
│  Numpy NN — Feed-forward from scratch ......................... [Code]           │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  (KG)   GitHub  LinkedIn  Scholar  HuggingFace  PyPi            gkos.dev        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.3 PAPERS / PUBLICATIONS PAGE

#### Concept

"Training Validation" -- publications are the validation metrics of the network's training. Each paper demonstrates that the network (career) is learning effectively.

#### Layout

- **Header:** "Training Validation (Publications)" with total citation count as the "accuracy score"
- **Summary stat:** "Network Accuracy: 100+ citations across 8 publications"
- **Filter:** All | Top-Tier (NeurIPS, ECCV, WACV) | IEEE | Preprints
- **Sort:** By year | By citations
- **Cards:** Horizontal publication cards with venue badge, citation counter, abstract toggle, and action buttons

#### Publication Card Design

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─ NeurIPS 2023 ─┐                                 54 cites    │
│  └─────────────────┘                                             │
│                                                                  │
│  Cross-Scale MAE: A Tale of Multiscale Exploitation              │
│  in Remote Sensing                                               │
│                                                                  │
│  Remote sensing images present unique challenges to image        │
│  analysis due to the extensive geographic...    [show more ↓]    │
│                                                                  │
│  [PDF]  [Code]  [Scholar]  [BibTeX]                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Each publication card has a subtle animation: the left border glows briefly in the venue badge color when scrolled into view, like a neuron firing.

---

### 4.4 BLOG PAGE (Index)

#### Concept

"Backpropagation Logs" -- blog posts are the backpropagation signal, sharing the insights and corrections learned during the forward pass. Each post propagates knowledge backward to the community.

#### Layout

- **Header:** "Backpropagation Logs" with RSS link
- **Featured post:** Full-width hero card with cover image
- **Post grid:** 2-column grid of post preview cards
- **Sidebar:** Tags, search, "Most propagated" (popular posts by views)

#### Blog Post Card

```
┌───────────────────────────────────┐
│ ░░░░░░░░░ COVER IMAGE ░░░░░░░░░░ │
├───────────────────────────────────┤
│ self-supervised-learning          │
│                                   │
│ Why Masked Image Modeling Works   │
│ Better Than You Think             │
│                                   │
│ A deep dive into the inductive    │
│ biases that make MAE and BEiT     │
│ surprisingly effective...         │
│                                   │
│ Apr 2026  ·  12 min read          │
└───────────────────────────────────┘
```

---

### 4.5 BLOG POST PAGE

#### Layout

- **Reading progress bar:** Top of viewport, styled as a "training progress bar"
- **Title + metadata:** Date, reading time, tags, author
- **Table of contents:** Sidebar (desktop), collapsible (mobile)
- **Content area:** max-width 720px, clean typography
- **Code blocks:** Shiki with line numbers, dark theme matching site palette
- **Math:** KaTeX rendering
- **Interactive demos:** HuggingFace Space embeds
- **Background:** The subtle network continues, very low opacity
- **Bottom:** Prev/next navigation, share buttons, related posts

---

### 4.6 RESUME PAGE

#### Concept

"Full Network Architecture" -- the resume is the complete architecture specification. Everything else on the site is a simplified view; the resume has all the details.

#### Layout

- **Header:** "Full Network Architecture (Resume)"
- **Quick highlights:** Grid of key facts (education, experience, top skills)
- **Download button:** Prominent [Download PDF]
- **PDF viewer:** Full-width embedded PDF with page controls

---

### 4.7 CONTACT PAGE

#### Concept

"API Endpoints" -- contact methods are the API endpoints for interacting with the network. Clean, functional, developer-friendly.

#### Layout

- **Header:** "API Endpoints"
- **Subheader:** "Send a request to any endpoint below."

```
POST  /email       → kg@gkos.dev
GET   /linkedin    → linkedin.com/in/drkostas
GET   /github      → github.com/drkostas
GET   /scholar     → scholar.google.com/...
GET   /huggingface → huggingface.co/drkostas
GET   /pypi        → pypi.org/user/drkostas
```

Each "endpoint" is a card styled like an API documentation entry, with the HTTP method badge, path, and the actual link. Hovering an endpoint shows a brief curl-like command:

```
$ curl -X POST gkos.dev/email --data "subject=Hello"
```

This is playful and developer-native without being gimmicky.

---

## 5. Interactive Elements & Animations

### Neural Network Hero (Canvas/Three.js)

#### Architecture

The network is rendered on a 2D Canvas (preferred for performance) or Three.js flat scene.

- **Nodes:** Circles with labels. Organized in 4 layers (input, hidden1, hidden2, output)
- **Connections:** Thin lines between nodes in adjacent layers. Opacity varies by "weight" (how related the skills are)
- **Particles:** Small glowing circles (3-5px) that travel along connections from left to right. 20-40 particles active at any time. Speed varies slightly per particle for organic feel
- **Glow:** Each particle has a radial gradient glow (CSS filter or Canvas shadowBlur)

#### Interactions

- **Hover node:** Node brightens, label appears/enlarges, connected paths light up, tooltip shows:
  ```
  ┌─────────────────────────┐
  │ PyTorch                 │
  │ 6 years  ·  8 projects  │
  │ MEDiC, Cross-Scale MAE, │
  │ MaskDistill, 3D Seg...  │
  └─────────────────────────┘
  ```
- **Click node:** Smooth scroll to the relevant section (e.g., clicking "Products" scrolls to featured projects)
- **Hover connection:** The specific path lights up brightly, showing how two skills/stages relate

#### Scroll Behavior

As the user scrolls past the hero:
1. The network compresses vertically (nodes move closer together)
2. Opacity reduces from 1.0 to 0.06
3. The network becomes a fixed background element
4. Particles continue flowing at reduced speed and brightness
5. The compression animation is smooth, driven by GSAP ScrollTrigger

#### Performance

- Canvas 2D is preferred over Three.js (much lighter for 2D node-and-edge rendering)
- Use `requestAnimationFrame` with frame budgeting (skip frames if below 30fps)
- Limit to 40 particles maximum
- On mobile: static SVG version (no animation, just the diagram)
- Respect `prefers-reduced-motion`: particles stop, network is static

### Network Background (All Pages)

A very subtle version of the network lives in the background of every page:

- **Opacity:** 0.05-0.08 (barely visible)
- **Particles:** 5-10, very slow
- **Purpose:** Provides visual continuity across pages
- **Page-aware routing:** Particles concentrate toward different output nodes based on the current page
- **Implementation:** A single Canvas element that persists across Astro page transitions (via `transition:persist`)

### GSAP Animations

- **Card entrance:** Staggered fade-in + translateY when scrolled into view
- **Counter animation:** Number count-up for citations, publication count, etc.
- **Filter transition:** When changing project filter, cards fade out and in with layout shift
- **Page transitions:** View Transitions API for smooth cross-page animations

### Micro-interactions

- **Card hover:** Subtle lift (translateY -4px) + border glow (accent color, low opacity)
- **Button hover:** Background fill wipe from left to right
- **Tag hover:** Pulse + tooltip showing how many projects use this skill
- **Node label hover (skills section):** Corresponding node in background network briefly brightens
- **Link hover:** Underline animation (draws from left)
- **Contact endpoint hover:** Curl command tooltip appears

---

## 6. Mobile Adaptation

### Breakpoints

```
Desktop:   >= 1024px   (full network hero, interactive nodes, 3-col grid)
Tablet:    768-1023px  (simplified network, 2-col grid, reduced particles)
Mobile:    < 768px     (static SVG network, single column, no animation)
```

### Mobile-Specific Changes

- **Network hero:** Replaced with a static SVG diagram of the network (pre-rendered, no Canvas). The SVG is responsive and scales down cleanly. No interaction (tap conflicts with scroll). Alternatively: a simplified version showing only the output layer nodes as a horizontal row of skill badges.
- **Navigation:** Hamburger menu. Bottom sticky bar with [Resume] [Contact] CTAs.
- **Network background:** Hidden on mobile (too subtle to matter at small sizes, saves resources).
- **Project cards:** Full-width, stacked vertically. Featured cards keep images; standard/compact become image-less list items.
- **Skills grid:** 2-column instead of 3-column.
- **Publication cards:** Full-width, stacked.
- **Blog TOC:** Collapsible at top of post.
- **Contact "API endpoints":** Full-width cards, stacked.
- **Font sizes:** Scale via clamp(). No discrete breakpoint jumps.
- **Touch targets:** Minimum 44x44px.

### Mobile Network Alternatives (Ranked)

1. **Static SVG:** Pre-rendered network diagram as an SVG. Clean, lightweight, scales perfectly. No interactivity.
2. **Horizontal node row:** Just the output layer nodes as a row of badges: `[Prod ML] [Research] [Products] [OSS] [Pubs]`. Tapping each scrolls to the corresponding section.
3. **Animated CSS particles:** Simple CSS animation of a few dots moving across the hero area. No network structure, just the "particle" feel.
4. **No network at all:** Replace with a clean gradient background and just the text content. Simplest, fastest.

**Recommendation:** Option 1 (static SVG) for tablets, Option 2 (node row) for phones.

### Performance Budget (Mobile)

```
First Contentful Paint:  < 1.2s
Largest Contentful Paint: < 2.0s
Total JS bundle:         < 50KB  (no Canvas, no GSAP on mobile)
Network SVG:             < 15KB  (optimized, compressed)
```

---

## 7. Tech Requirements

### Astro Architecture

```
src/
├── layouts/
│   ├── BaseLayout.astro        # HTML head, global styles, nav, footer
│   ├── BlogLayout.astro        # Blog post layout (TOC, metadata, share)
│   └── ProjectLayout.astro     # Future: individual project case study pages
│
├── pages/
│   ├── index.astro             # Home: network hero + content sections
│   ├── projects.astro          # Network Outputs: project listing
│   ├── papers.astro            # Training Validation: publications
│   ├── blog/
│   │   ├── index.astro         # Backpropagation Logs: blog index
│   │   └── [...slug].astro     # Individual blog posts
│   ├── resume.astro            # Full Network Architecture
│   └── contact.astro           # API Endpoints
│
├── components/
│   ├── NeuralNetworkHero.tsx   # Canvas-based interactive network (client:load)
│   ├── NeuralNetworkBg.tsx     # Subtle background network (client:visible, transition:persist)
│   ├── NetworkSVG.astro        # Static SVG fallback for mobile/reduced-motion
│   ├── NodeTooltip.tsx         # Hover tooltip for network nodes (client:visible)
│   ├── Navigation.astro        # Top nav bar
│   ├── MobileNav.tsx           # Hamburger drawer (client:media="(max-width: 767px)")
│   ├── ProjectCard.astro       # Featured/standard project card
│   ├── ProjectCompact.astro    # Compact project list item
│   ├── PublicationCard.astro   # Publication card with venue badge
│   ├── VenueBadge.astro        # Color-coded venue indicator
│   ├── BlogCard.astro          # Blog post preview card
│   ├── MetricCounter.tsx       # Animated count-up (client:visible)
│   ├── FilterTabs.tsx          # Interactive project filter (client:load)
│   ├── ApiEndpointCard.astro   # Contact "endpoint" card
│   ├── SkillNode.astro         # Individual skill in the weights grid
│   ├── ReadingProgress.astro   # Blog reading progress bar
│   ├── Footer.astro            # Bottom bar with social links
│   └── icons/                  # SVG icon components
│
├── content/
│   ├── blog/                   # MDX blog posts
│   ├── projects/               # Project data (YAML or JSON)
│   └── papers/                 # Publication data (YAML or JSON)
│
├── styles/
│   ├── global.css              # CSS custom properties, resets, dark theme
│   ├── typography.css          # Space Grotesk, Inter, JetBrains Mono
│   ├── network.css             # Network-specific styles (node sizes, glow effects)
│   └── themes.css              # Theme definitions
│
└── lib/
    ├── neural-network.ts       # Network layout algorithm, node positions, connections
    ├── particles.ts            # Particle system: spawning, movement, lifecycle
    ├── network-data.ts         # Node definitions (skills, stages) and their connections
    ├── scroll-animations.ts    # GSAP ScrollTrigger setup
    └── utils.ts                # Shared utilities
```

### Key Dependencies

```
Framework:           astro@5.x
UI Islands:          @astrojs/react
Canvas (preferred):  HTML Canvas 2D API (native, no library)
  OR
3D (alternative):    three + @react-three/fiber (only if wanting 3D depth effects)
Animation:           gsap (ScrollTrigger for scroll-driven animations)
Content:             @astrojs/mdx, Astro Content Collections
Code highlighting:   shiki (built into Astro)
Math:                katex, remark-math, rehype-katex
View Transitions:    astro:transitions (built into Astro)
RSS:                 @astrojs/rss
Sitemap:             @astrojs/sitemap
Fonts:               @fontsource/space-grotesk, @fontsource/inter, @fontsource/jetbrains-mono
Icons:               lucide-react or astro-icon
```

### Canvas Network Implementation

```typescript
// network-data.ts — define the network structure
export const networkLayers: NetworkLayer[] = [
  {
    name: "Input",
    nodes: [
      { id: "python", label: "Python", years: 8, projects: 15 },
      { id: "math", label: "Math/Stats", years: 8 },
      { id: "ml-theory", label: "ML Theory", years: 8 },
      { id: "swe", label: "Software Eng", years: 8 },
      { id: "data", label: "Data Systems", years: 6 },
    ],
  },
  {
    name: "Hidden 1 (Education)",
    nodes: [
      { id: "bsc", label: "BSc CS (AUTH)", year: "2014-2018" },
      { id: "msc", label: "MSc CS (UTK)", year: "2019-2021" },
      { id: "phd", label: "PhD (UTK)", year: "2021-2025" },
      { id: "amazon", label: "Amazon", year: "2024-now" },
    ],
  },
  // ... hidden 2, output
];

// neural-network.ts — Canvas rendering
class NeuralNetworkRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private nodes: PositionedNode[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.layoutNodes();
    this.spawnParticles(30);
  }

  private layoutNodes() {
    // Position nodes in layers with equal vertical spacing
    // Each layer is evenly distributed across the canvas width
  }

  private spawnParticles(count: number) {
    // Create particles that follow random paths through the network
    // Each particle picks a random route: input -> hidden1 -> hidden2 -> output
  }

  public render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawConnections();
    this.drawParticles();
    this.drawNodes();
    requestAnimationFrame(() => this.render());
  }

  public setPageFocus(page: string) {
    // Adjust particle routing to concentrate on relevant output nodes
    // e.g., page="projects" → particles favor "Products" and "Research" outputs
  }

  public setBackgroundMode(compressed: boolean) {
    // Compress node positions, reduce opacity, slow particles
  }
}
```

### Astro View Transitions (for network persistence)

```astro
---
// BaseLayout.astro
import { ViewTransitions } from "astro:transitions";
---
<html>
  <head>
    <ViewTransitions />
  </head>
  <body>
    <canvas
      id="network-bg"
      transition:persist
      transition:name="network"
    />
    <slot />
  </body>
</html>
```

The `transition:persist` directive keeps the Canvas element alive across page navigations, so the network background does not reset or re-render when navigating between pages. This creates the seamless "particles rerouting" effect.

---

## 8. Additional ASCII Mockups

### Mobile Home View (375px)

```
┌─────────────────────────────────────┐
│  (KG)                        ☰     │
├─────────────────────────────────────┤
│                                     │
│     ○ Python                        │
│       ╲                             │
│     ○ ML ──── ○ PhD ──── ○ Prod ML  │
│       ╱         ╲                   │
│     ○ SWE        ○ Amzn ── ○ Rsch   │
│                                     │
│     (static SVG, simplified)        │
│                                     │
│       KOSTAS GEORGIOU               │
│     PhD | ML Engineer               │
│     Applied Scientist               │
│                                     │
│  8+ yrs · 8 pubs · 100+ cites      │
│                                     │
│   [Projects]  [CV]  [Contact]       │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  NETWORK WEIGHTS                    │
│                                     │
│  Research         Engineering       │
│  ┌──────────┐     ┌──────────┐     │
│  │ PyTorch  │     │ FastAPI  │     │
│  │ SSL/MIM  │     │ Next.js  │     │
│  │ CLIP     │     │ Python   │     │
│  │ ViTs     │     │ React    │     │
│  └──────────┘     └──────────┘     │
│                                     │
│  Infrastructure                     │
│  ┌──────────┐                       │
│  │ AWS/GCP  │                       │
│  │ Docker   │                       │
│  │ K8s      │                       │
│  │ Postgres │                       │
│  └──────────┘                       │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  TOP RESULTS                        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ░░░░░ FLEETSMART ░░░░░░░░░ │   │
│  │ AI fleet management SaaS   │   │
│  │ [● Live]                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ░░░░░ CROSS-SCALE ░░░░░░░ │   │
│  │ NeurIPS 2023 · 54 cites    │   │
│  │ [Paper] [Code]             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ░░░░░ MEDIC ░░░░░░░░░░░░░ │   │
│  │ CLIP distillation          │   │
│  │ [Paper] [Code] [HF]       │   │
│  └─────────────────────────────┘   │
│                                     │
│       → View all projects →         │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  TOP PUBLICATIONS                   │
│                                     │
│  Cross-Scale MAE · NeurIPS · 54     │
│  mCL-LC · WACV · 31                │
│  Occasionally Secure · arXiv · 14   │
│                                     │
│      → View all →                   │
│                                     │
├─────────────────────────────────────┤
│  GitHub · LinkedIn · Scholar        │
│  [Resume]     [Contact]             │
│             gkos.dev                │
└─────────────────────────────────────┘
```

### Contact Page ("API Endpoints")

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  (KG)       Home   Projects   Papers   Blog   Resume   Contact    [Download CV]  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ·   ·    ·  ·    ·  ·    ·  ·   · → ●  ← particles converge to single point  │
│    ·   ·    ·  ·    ·  ·    ·  → ●                                               │
│                                                                                  │
│                                                                                  │
│  API ENDPOINTS                                                                   │
│  Send a request to any endpoint below.                                           │
│                                                                                  │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐            │
│  │  POST   /email                                                   │            │
│  │                                                                  │            │
│  │  → kg@gkos.dev                                                   │            │
│  │                                                                  │            │
│  │  For collaborations, opportunities, or questions about           │            │
│  │  research and projects.                                          │            │
│  └──────────────────────────────────────────────────────────────────┘            │
│                                                                                  │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐            │
│  │  GET   /linkedin              │  │  GET   /github                │            │
│  │                               │  │                               │            │
│  │  → linkedin.com/in/drkostas   │  │  → github.com/drkostas       │            │
│  │  Professional network         │  │  Open source contributions    │            │
│  └───────────────────────────────┘  └───────────────────────────────┘            │
│                                                                                  │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐            │
│  │  GET   /scholar               │  │  GET   /huggingface           │            │
│  │                               │  │                               │            │
│  │  → scholar.google.com/...     │  │  → huggingface.co/drkostas   │            │
│  │  Publications & citations     │  │  Pre-trained models           │            │
│  └───────────────────────────────┘  └───────────────────────────────┘            │
│                                                                                  │
│  ┌───────────────────────────────┐                                               │
│  │  GET   /pypi                  │                                               │
│  │                               │                                               │
│  │  → pypi.org/user/drkostas    │                                               │
│  │  Published packages           │                                               │
│  └───────────────────────────────┘                                               │
│                                                                                  │
│                                                                                  │
│  # Example request                                                               │
│  ┌──────────────────────────────────────────────────────┐                        │
│  │ $ curl -X POST gkos.dev/api/contact \               │                        │
│  │     -H "Content-Type: application/json" \            │                        │
│  │     -d '{"subject": "Hello", "from": "you"}'        │                        │
│  └──────────────────────────────────────────────────────┘                        │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  (KG)   GitHub  LinkedIn  Scholar  HuggingFace  PyPi            gkos.dev        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Pros and Cons

### Pros

1. **Immediately communicates ML expertise:** The neural network hero is the most literal possible visual statement of "I am an ML engineer." Before reading a single word, the visitor understands the domain. This is especially powerful for recruiters scanning portfolios quickly.

2. **Interactive skill exploration:** Hovering nodes to see related projects is genuinely useful functionality, not just decoration. A hiring manager can quickly understand "this person has 6 years of PyTorch experience across 8 projects" by hovering a single node. This is more efficient than reading a skills section.

3. **Living background creates continuity:** The persistent network background across all pages creates a cohesive, immersive experience. The particle rerouting on navigation is a subtle but memorable detail that makes the site feel like a unified application rather than disconnected pages.

4. **The hero IS the differentiator:** The interactive neural network is genuinely unique. Many portfolios have fancy heroes, but an interactive, data-driven network diagram that maps to actual career data is rare. It will be remembered and shared.

5. **Balanced visual weight:** Unlike Concept 04 (heavy scroll animation) or Concept 05 (text-heavy), this concept puts the wow factor in the hero and keeps the rest of the site clean and functional. The network compresses to a subtle background, giving content sections full attention. Best of both worlds.

6. **Contact page creativity:** The "API Endpoints" contact page is a crowd-pleaser for developer audiences. It is memorable, on-brand, and functional. The curl example is a nice touch that signals familiarity with API design.

7. **Performance scales well:** Canvas 2D is much lighter than Three.js/WebGL. The particle system is simple math (linear interpolation along paths). Even with 40 particles, the rendering is trivial for modern hardware. The mobile fallback (static SVG) means zero performance cost on phones.

8. **View Transitions integration:** Astro's `transition:persist` for the Canvas element means the network background survives page navigation without re-initialization. This is a free architectural win that other concepts cannot match (Three.js scenes are harder to persist).

### Cons

1. **Hero interaction conflicts with scroll on mobile:** Even with a static SVG fallback, the hero takes up valuable viewport space on mobile. Users need to scroll past it to reach content. If the network is too tall or complex on small screens, it becomes an obstacle rather than a feature.

2. **Node label readability:** At small sizes, network node labels can be hard to read. The labels need to be large enough to be legible but small enough to fit the layout. This tension is hard to resolve, especially on 13-inch laptops where the hero might be 700px tall and each layer has 5 nodes.

3. **Canvas interactivity is custom work:** Unlike Three.js (which has raycasting and event systems), Canvas 2D requires manual hit detection. Detecting which node the mouse is hovering requires calculating distances to all node positions on every mouse move. This is not hard but it is fiddly and error-prone (especially with responsive layouts where node positions change).

4. **The metaphor is surface-level:** Unlike Concept 04 (gradient descent permeates every page) or Concept 05 (paper structure IS the navigation), the neural network is primarily a visual element in the hero. The rest of the site (projects page, papers page, blog) is fairly standard. The section names ("Network Outputs," "Backpropagation Logs") are cute but do not fundamentally change the page structure.

5. **Particle routing is hard to notice:** The "particles reroute when you navigate" effect sounds cool in theory, but at 0.06 opacity, most visitors will never notice it. It is an engineering effort that may not pay off in terms of user experience. The cost-benefit ratio of implementing persistent background with page-aware routing is questionable.

6. **Accessibility challenges:** The interactive network hero is essentially invisible to screen readers unless accompanied by comprehensive ARIA labels and an alternative text representation. The hover tooltips need keyboard focus support. The particle animations need `prefers-reduced-motion` handling. This is all doable but adds significant development time.

7. **Risk of "tech demo" perception:** If the network hero feels more like a tech demo than a portfolio, it could backfire. The interactivity needs to feel purposeful (exploring skills) rather than gratuitous (showing off Canvas skills). The tooltips must contain genuinely useful information, not just "PyTorch: 6 years."

---

## 10. Effort Estimate

### Total: 5-7 weeks (part-time) / 2.5-3.5 weeks (full-time)

| Phase | Task | Effort | Notes |
|-------|------|--------|-------|
| **1. Foundation** | Astro project setup, layouts, routing, global styles, fonts | 2-3 days | Standard Astro boilerplate |
| **2. Navigation** | Top nav, mobile drawer, scroll-aware behavior | 1-2 days | |
| **3. Network Data Model** | Define nodes, layers, connections, skill metadata | 1 day | Data architecture for the network |
| **4. Canvas Network Hero** | Layout algorithm, node rendering, connections, labels, responsive sizing | 3-4 days | Core visual component |
| **5. Particle System** | Particle spawning, path following, lifecycle, glow effects | 2-3 days | Math-heavy but not complex |
| **6. Node Interactivity** | Hover detection, tooltip positioning, click navigation, highlight propagation | 2-3 days | Custom Canvas hit detection |
| **7. Network Background** | Compressed mode, transition:persist, page-aware routing | 2-3 days | Astro View Transitions integration |
| **8. Mobile Fallback** | Static SVG generation, responsive layout, node-row alternative | 1-2 days | |
| **9. Home Page Content** | Skills grid, featured projects, publications preview | 2 days | Below the hero |
| **10. Projects Page** | Tiered layout, filter tabs, all project cards | 2-3 days | Content migration from JSON |
| **11. Papers Page** | Publication cards, venue badges, abstract collapse | 1-2 days | |
| **12. Blog Infrastructure** | Content Collections, MDX pipeline, Shiki, KaTeX, RSS | 3-4 days | Standard blog setup |
| **13. Blog Templates** | Post layout, TOC, code blocks, HF embeds | 2-3 days | |
| **14. Resume + Contact** | PDF embed, API endpoint cards, curl example | 1 day | |
| **15. Polish** | Animations, hover states, a11y, Lighthouse, reduced-motion | 2-3 days | |
| **16. Content** | Migrate projects/papers, write first blog post | 2-3 days | |
| **17. Deployment** | Vercel config, OG images, sitemap, analytics | 1 day | |

### Risk Items

- **Canvas hit detection (Phase 6):** The custom hover detection for nodes is the most error-prone part. If it proves too fiddly, consider using SVG instead of Canvas for the hero (SVG elements have native event handling). The trade-off is that SVG may perform worse with 40+ animated particles.
- **View Transitions persistence (Phase 7):** Astro's `transition:persist` is relatively new. Edge cases may exist with Canvas elements. Test early.
- **Network layout responsiveness (Phase 4):** The network needs to look good at many viewport sizes. The layout algorithm must handle 1920px ultrawide down to 1024px laptop without nodes overlapping or labels colliding.

### MVP (Shippable in 3-4 weeks)

Ship without:
- Page-aware particle routing (all pages use same generic background)
- Node click interaction (hover only)
- Blog (add in v2)
- Background network persistence (just fade out on scroll, no background on other pages)

This reduces effort to approximately 3-4 weeks part-time while keeping the interactive hero and clean content pages.

### Complexity Comparison vs Other Concepts

| Aspect | 04 Gradient Descent | 05 The Paper | 06 Neural Network |
|--------|--------------------|--------------|--------------------|
| Visual complexity | High (Three.js 3D) | Low (CSS only) | Medium (Canvas 2D) |
| JS bundle size | Large (~200KB) | Small (~30KB) | Medium (~80KB) |
| Content writing | Medium | High | Medium |
| Unique factor | Scroll journey | Typography/margins | Interactive hero |
| Mobile degradation | Significant | Minimal | Moderate |
| Accessibility | Hard | Easy | Medium |
| Development risk | High (Three.js) | Low | Medium (Canvas) |
| Metaphor depth | Deep (every page) | Deep (structural) | Surface (hero only) |
| Total effort | 6-8 weeks | 4-6 weeks | 5-7 weeks |
