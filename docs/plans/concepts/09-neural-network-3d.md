# Concept 09: The 3D Neural Network

**Status:** Design Concept  
**Author:** Kostas Georgiou  
**Date:** 2026-04-06

---

## 1. Concept Overview

### The Metaphor

The entire portfolio is visualized as a **3D neural network floating in space**. Different neurons ARE different pages and content sections. The network is fully explorable in 3D — rotate, zoom, orbit. Clicking a neuron navigates to that page. The architecture of the network is not random: it is a deliberate mapping of a real neural network to the structure of a career and portfolio.

This is not a gimmick. It is the deepest possible expression of "I am a machine learning engineer" as a visual metaphor. Every ML concept has a direct analogy to portfolio content.

### The Core Mapping: Neural Network as Career

```
INPUT LAYER          HIDDEN LAYER 1       HIDDEN LAYER 2       OUTPUT LAYER
(Origins)            (Skills)             (Experience)          (Products)

[Education]          [Python]             [Amazon]              [FleetSmart]
[Background]         [PyTorch]            [UTK AICIP]           [ShiftMD]
[Contact]            [Computer Vision]    [Teaching]            [MEDiC]
                     [NLP]                [Industry]            [Cross-Scale MAE]
                     [Cloud/Infra]                              [XpensAI]
                     [Self-Supervised]                          [Blog]
                     [Math/Stats]                               [Papers]
```

- **Input Layer** = Where the data (your life story) begins: education, background, contact info
- **Hidden Layer 1** = Skills and competencies — the transformations that convert raw input into capability
- **Hidden Layer 2** = Experience — where skills are applied in real environments (Amazon, UTK, etc.)
- **Output Layer** = What you produce: projects, papers, blog posts — the actual deliverables

### The Deep ML Metaphor

Every ML concept maps to a portfolio element:

| ML Concept | Portfolio Mapping | Visualization |
|-----------|-------------------|---------------|
| **Neurons** | Individual content sections/pages | Glowing spheres, sized by importance |
| **Layers** | Content categories (Input/Skills/Experience/Output) | Vertical planes in 3D space |
| **Weights** | Connections between related content | Lines between neurons, thickness = strength |
| **Activations** | Current focus / hover state | Neuron glows brighter, color shifts |
| **Forward Pass** | Career narrative flow (education to output) | Animated data flow left-to-right |
| **Backpropagation** | Blog posts / lessons learned flowing backward | Reverse-direction pulse animation |
| **Loss Function** | "Impact" metric — how well outputs serve goals | Displayed as a converging loss curve |
| **Learning Rate** | Career growth speed over time | Timeline animation speed |
| **Batch Normalization** | Work-life balance / normalized effort | Subtle visual on experience nodes |
| **Dropout** | Skills not currently active / deprioritized | Dimmed neurons that aren't highlighted |
| **Attention Mechanism** | Featured/highlighted content | Spotlight effect on important neurons |
| **Skip Connections** | Direct links (education to a project, no intermediate) | Arcing lines that skip layers |
| **Gradient Flow** | Knowledge/influence propagation | Color gradient animation along connections |
| **Epochs** | Years of career experience | Timeline at the bottom |

### The Wow Factor

- **You land on a slowly rotating neural network in 3D space.** Particles drift along connections. The camera slowly orbits. It's immediately visually striking.
- **Clicking a neuron zooms the camera** smoothly to that neuron's neighborhood. Connected neurons are highlighted. The page content appears in an overlay panel.
- **The Forward Pass animation**: On first visit, an animated "data flow" traces through the network from Input (education) through Hidden layers (skills, experience) to Output (projects, papers). This is your career story told as a literal forward pass.
- **Hovering a neuron "activates" it**: it glows, its connections brighten (thicker = stronger connection), and a tooltip shows what it is.
- **Weights are meaningful**: A paper that directly led to a project shows a thick, bright connection. A skill used heavily in a project shows a strong weight.
- **The Blog IS backpropagation**: Blog posts are visualized as signals flowing BACKWARD through the network — insights that improve everything. When you navigate to the blog section, pulses travel right-to-left through the connections.
- **The Loss Curve**: A small persistent widget shows a "training loss" curve that represents career growth. Hover over it to see milestones at each "epoch" (year).

---

## 2. Color Palette & Typography

### Color Palette

The palette is inspired by ML visualization tools (TensorBoard, Weights & Biases, Netron) and deep space aesthetics.

| Role | Hex | Usage |
|------|-----|-------|
| Background (space) | `#050510` | Deep dark background, near-black with blue tint |
| Background (content panel) | `#0d0d1a` | Content overlay panels |
| Grid lines | `#1a1a3a` | Subtle 3D grid in the background |
| Neuron base | `#2a2a5a` | Inactive neuron color |
| Neuron active | `#6366f1` | Hovered/selected neuron (indigo) |
| Input layer | `#22d3ee` | Cyan — education, background, contact |
| Hidden layer 1 | `#a78bfa` | Purple — skills, competencies |
| Hidden layer 2 | `#f472b6` | Pink — experience, roles |
| Output layer | `#34d399` | Emerald — projects, papers, blog |
| Connection (weak) | `#1e1e4a` | Low-weight connections |
| Connection (strong) | `#818cf8` | High-weight connections (bright indigo) |
| Forward pass pulse | `#fbbf24` | Gold — data flowing forward |
| Backprop pulse | `#f87171` | Red — blog/insight flowing backward |
| Text primary | `#e2e8f0` | Slate-100 |
| Text secondary | `#94a3b8` | Slate-400 |
| Accent | `#6366f1` | Indigo-500 (primary interactive) |
| Accent hover | `#818cf8` | Indigo-400 |
| Badge: NeurIPS | `#fbbf24` | Gold |
| Badge: WACV | `#c0c0c0` | Silver |
| Badge: Amazon | `#ff9900` | Amazon orange |
| Badge: GitHub | `#f0f6fc` | White |

### Typography

| Context | Font | Fallback | Size |
|---------|------|----------|------|
| Body text | `Inter` | system sans-serif | 15px / 1.65 |
| Headings | `Space Grotesk` | sans-serif | 22-36px |
| Code / tech tags | `JetBrains Mono` | monospace | 13px |
| Neuron labels (3D) | `Space Grotesk` (via Three.js text) | — | Dynamic |
| Data labels | `Inter` | sans-serif | 12px |
| Loss curve axis | `JetBrains Mono` | monospace | 10px |

`Space Grotesk` gives a technical, modern feel without being cold. Its slightly geometric letterforms complement the network visualization.

---

## 3. Navigation Design

### Primary Navigation: The Network Itself

The 3D neural network IS the navigation. Each neuron is clickable. The network is always partially visible, even when content panels are open. Camera movement is handled via:

- **Mouse drag**: Orbit the camera around the network
- **Scroll**: Zoom in/out
- **Click neuron**: Navigate to that content, camera zooms to neuron
- **Double-click background**: Reset camera to default orbit

### Secondary Navigation: Content Panel Header

When a neuron is clicked and a content panel opens, the panel has a breadcrumb-style nav showing the current position in the network:

```
Input > Education > PhD Computer Science (UTK)
```

And a layer-based tab bar:

```
[Input: About/Contact] [Skills] [Experience] [Output: Projects/Papers/Blog]
```

### Tertiary Navigation: Persistent Top Bar

A minimal top bar floats above the 3D viewport:

```
[Kostas Georgiou]    [Home] [Projects] [Papers] [Blog] [Resume] [Contact]    [⚙]
```

For users who prefer traditional navigation. Semi-transparent, does not obstruct the network.

### Layer Quick-Jump

Clicking a layer label in the top bar zooms the camera to that entire layer, showing all neurons in it side-by-side. From there, click individual neurons to dive deeper.

### Mobile Navigation

On mobile, the 3D viewport becomes a background animation (auto-rotating, non-interactive). A standard bottom tab bar provides navigation. The 3D network remains visible as an ambient background but is not the primary interaction method on touch devices.

---

## 4. Page Designs

### 4.1 Home Page — The Full Network View

On landing, the camera is positioned at a comfortable distance showing the full network. The network slowly rotates. A brief intro animation plays:

1. Network fades in from particles (0-1s)
2. Neurons materialize layer by layer, left to right (1-3s)
3. Connections draw themselves between neurons (3-4s)
4. A forward pass pulse traces through (4-6s)
5. Camera settles into slow orbit. UI elements fade in.

Below the network viewport (or overlaid at the bottom), a minimal hero section:

```
Kostas Georgiou
PhD · ML Engineer · Applied Scientist at Amazon

Explore the network or use the navigation above.
```

The hero text is rendered in HTML (not in the 3D scene) for accessibility and SEO.

A "Loss Curve" widget in the bottom-right shows career progression:

```
Loss ↑                                      
     |\                                     
     | \                                    
     |  \    ┌─ PhD started                 
     |   \   │                              
     |    \──┘   ┌─ NeurIPS                 
     |     \─────┘  ┌─ Amazon               
     |      \───────┘                       
     └──────────────────────── Epoch →      
      2013  2018  2019  2023  2024  2026    
```

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Kostas Georgiou]      [Home] [Projects] [Papers] [Blog] [Resume] [Contact] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│              INPUT          HIDDEN 1        HIDDEN 2        OUTPUT           │
│                                                                              │
│              ┌──┐          ┌──┐            ┌──┐           ┌──┐              │
│              │Ed│─────────→│Py│───────────→│Am│──────────→│FS│              │
│              └──┘ ╲        └──┘ ╲          └──┘ ╲        └──┘              │
│                    ╲       ┌──┐  ╲         ┌──┐  ╲       ┌──┐              │
│              ┌──┐   ╲─────│PT│───╲────────→│UT│───╲─────→│MD│              │
│              │Bg│────╲───→└──┘    ╲        └──┘    ╲     └──┘              │
│              └──┘     ╲   ┌──┐    ╲        ┌──┐    ╲    ┌──┐              │
│                        ╲─→│CV│─────╲──────→│Tc│─────╲──→│MC│              │
│              ┌──┐     ╱   └──┘      ╲      └──┘      ╲  └──┘              │
│              │Ct│────╱    ┌──┐       ╲     ┌──┐       ╲ ┌──┐              │
│              └──┘   ╱────→│NL│────────╲───→│In│────────╲│XA│              │
│                    ╱      └──┘         ╲   └──┘        ╲└──┘              │
│                   ╱       ┌──┐          ╲               ┌──┐              │
│                  ╱───────→│Cl│───────────╲─────────────→│Bl│              │
│                           └──┘            ╲             └──┘              │
│                           ┌──┐             ╲            ┌──┐              │
│                           │SS│──────────────╲──────────→│Pa│              │
│                           └──┘               ╲          └──┘              │
│                           ┌──┐                ╲         ┌──┐              │
│                           │Ma│─────────────────╲───────→│Sm│              │
│                           └──┘                          └──┘              │
│                                                                              │
│   Ed=Education  Bg=Background  Ct=Contact  Py=Python  PT=PyTorch            │
│   CV=CompVision  NL=NLP  Cl=Cloud  SS=SSL  Ma=Math                          │
│   Am=Amazon  UT=UTK  Tc=Teaching  In=Industry                               │
│   FS=FleetSmart  MD=ShiftMD  MC=MEDiC  XA=XpensAI  Bl=Blog  Pa=Papers      │
│   Sm=Soma                                                                    │
│                                                                              │
│        Kostas Georgiou                                     ┌─Loss Curve──┐  │
│        PhD · ML Engineer · Applied Scientist               │\            │  │
│        at Amazon                                           │ ╲___╱──╲_   │  │
│                                                            │         ╲─  │  │
│        Explore the network above.                          └─────────────┘  │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  [Drag] Orbit    [Scroll] Zoom    [Click Neuron] Navigate    [Dbl-Click] Reset│
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Projects Page — Output Layer Focus

Clicking a project neuron (or navigating via the top bar to Projects) zooms the camera to the Output Layer. All output neurons enlarge and spread apart. A content panel slides in from the right (~60% width), and the 3D network remains visible on the left (~40%), zoomed to the output layer with the selected project neuron highlighted.

The content panel shows:

**If a specific project neuron was clicked**: That project's detail view:
- Project image (large)
- Title, description
- Tech stack as connection labels (showing which Hidden Layer neurons connect to this one)
- Links: Live, Code, Demo, Paper
- Related content: connected neurons listed (e.g., "Connected to: PyTorch, Computer Vision, UTK AICIP, Cross-Scale MAE paper")

**If "Projects" was clicked from nav**: A list/grid view of all project neurons:
- Featured (FleetSmart, ShiftMD, MEDiC, MaskDistill, XpensAI, Soma) — large cards
- Research (Cross-Scale MAE, 3D Segmentation, etc.) — medium cards
- Utilities (PyPi packages, bots) — compact list

Hovering a project card in the panel highlights the corresponding neuron in the 3D view and brightens its connections.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Kostas Georgiou]      [Home] [Projects] [Papers] [Blog] [Resume] [Contact] │
├──────────────────────────────────────────────────────────────────────────────┤
│                              │                                               │
│                              │  PROJECTS — Output Layer                      │
│    ┌──┐                      │                                               │
│    │Py│─────────┐            │  ▶ Viewing: All Projects                      │
│    └──┘         │            │  Connected from: [Skills] [Experience]        │
│    ┌──┐         ↓            │                                               │
│    │PT│───────→(FS)★         │  ═══════════════════════════════════          │
│    └──┘        ╱│╲           │                                               │
│    ┌──┐       ╱ │ ╲          │  ★ FEATURED                                  │
│    │CV│──────╱  │  ╲         │                                               │
│    └──┘     ╱   │   ╲        │  ┌──────────────────────────────────────┐    │
│    ┌──┐    ↓    ↓    ↓       │  │ [img] FleetSmart.ai                 │    │
│    │Cl│──→(MD) (MC) (XA)     │  │ AI fleet management platform        │    │
│    └──┘    │    │    │       │  │ [FastAPI] [Next.js] [GCP] [LLM]     │    │
│    ┌──┐    │    │    │       │  │ Connections: Python, Cloud, Amazon   │    │
│    │SS│────┤    │    │       │  │ [■ Live]                             │    │
│    └──┘    ↓    ↓    ↓       │  └──────────────────────────────────────┘    │
│           (Bl) (Pa) (Sm)     │                                               │
│                              │  ┌──────────────────────────────────────┐    │
│                              │  │ [img] MEDiC                          │    │
│   ●=active  ○=inactive       │  │ CLIP distillation, 85.07% ImageNet  │    │
│   ★=selected                 │  │ [PyTorch] [CLIP] [SSL] [HuggingFace]│    │
│   (FS)=FleetSmart            │  │ Connections: PyTorch, CV, SSL, UTK  │    │
│   Arrow thickness =          │  │ [□ Code] [□ Demo]                   │    │
│     connection weight        │  └──────────────────────────────────────┘    │
│                              │                                               │
│                              │  ┌──────────────────────────────────────┐    │
│                              │  │ [img] ShiftMD                        │    │
│                              │  │ Constraint programming scheduling    │    │
│                              │  │ [Next.js] [Python] [OR-Tools]        │    │
│                              │  └──────────────────────────────────────┘    │
│                              │                                               │
├──────────────────────────────┴───────────────────────────────────────────────┤
│  Layer: Output    Neurons: 8    Avg Connections: 4.2    [Reset View]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Papers Page — Output Layer (Publications Neuron)

The Papers neuron in the Output layer expands when clicked. The camera zooms to this neuron and its connections. The content panel shows:

- Publication count, total citations, h-index equivalent
- Each paper as a card with: title, venue (color-coded badge), year, citations, abstract toggle, links
- **Connection visualization**: Each paper shows which skill neurons and experience neurons it connects to. The 3D view highlights these connections in real time as you scroll through papers.
- Papers sorted by "weight" (citations) by default, toggle to chronological

The venue badges use the layer color coding:
- NeurIPS, WACV: Gold/Silver badges
- IGARSS: Bronze
- arXiv: Gray
- Under Review: Pulsing border

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Kostas Georgiou]      [Home] [Projects] [Papers] [Blog] [Resume] [Contact] │
├──────────────────────────────────────────────────────────────────────────────┤
│                              │                                               │
│                              │  PUBLICATIONS                                 │
│         ┌──┐                 │  10 papers · 102 citations · 3 venues        │
│         │SS│╲                │                                               │
│         └──┘ ╲               │  Sort: [★ Weight] [Chronological] [Venue]    │
│         ┌──┐  ╲              │                                               │
│         │CV│───╲────→(Pa)★   │  ═══════════════════════════════════          │
│         └──┘    ╱    ╱│╲     │                                               │
│         ┌──┐   ╱    ╱ │ ╲    │  ┌──────────────────────────────────────┐    │
│         │PT│──╱    ╱  │  ╲   │  │ Cross-Scale MAE: A Tale of Multi-   │    │
│         └──┘      ╱   │   ╲  │  │ scale Exploitation in Remote Sensing │    │
│         ┌──┐     ╱    │    ╲ │  │                                      │    │
│         │Ma│────╱     │     ╲│  │ [NEURIPS 2023]  Citations: 54       │    │
│         └──┘         ╱      ╲│  │                                      │    │
│                     ╱        │  │ Weight: ████████████████████ 0.94    │    │
│         ┌──┐       ╱         │  │                                      │    │
│         │NL│──────╱          │  │ Connections:                         │    │
│         └──┘                 │  │ ← Self-Supervised Learning (0.9)    │    │
│                              │  │ ← Computer Vision (0.95)            │    │
│   Line thickness indicates   │  │ ← PyTorch (0.8)                    │    │
│   how strongly each skill    │  │ ← UTK AICIP (1.0)                  │    │
│   contributed to each paper  │  │ → Cross-Scale MAE project (1.0)    │    │
│                              │  │                                      │    │
│                              │  │ [▶ Paper] [▶ Code] [▶ Scholar]     │    │
│                              │  │ [▼ Show Abstract]                   │    │
│                              │  └──────────────────────────────────────┘    │
│                              │                                               │
│                              │  ┌──────────────────────────────────────┐    │
│                              │  │ Semantic Segmentation in Aerial      │    │
│                              │  │ Imagery using Multi-Level CL         │    │
│                              │  │ [WACV 2023]  Citations: 31          │    │
│                              │  │ Weight: ██████████████░░░░░░ 0.72   │    │
│                              │  └──────────────────────────────────────┘    │
│                              │                                               │
├──────────────────────────────┴───────────────────────────────────────────────┤
│  Neuron: Publications    Forward connections: 4    Back connections: 6        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Blog Index — Backpropagation View

The Blog section is conceptualized as **backpropagation**: insights that flow backward through the network, improving all layers. When the Blog neuron is selected:

1. The camera zooms to the Blog neuron in the Output layer
2. **Backprop animation plays**: Pulses travel RIGHT-to-LEFT through connections, from the Blog neuron back through Experience, Skills, and to the Input layer. This visualizes how writing about your work creates feedback loops that improve understanding.
3. The content panel shows blog posts with their "gradient" — which parts of the network they impact.

Each blog post card shows:
- Title, date, reading time, tags
- "Gradient flow": a mini visualization showing which neurons this post "updates" (e.g., a post about SSL would show connections to the Self-Supervised Learning skill neuron and the UTK experience neuron)
- Excerpt (2 lines)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Kostas Georgiou]      [Home] [Projects] [Papers] [Blog] [Resume] [Contact] │
├──────────────────────────────────────────────────────────────────────────────┤
│                              │                                               │
│        BACKPROPAGATION       │  B L O G                                      │
│        ←←←←←←←←←←←←←        │  Insights flowing backward through            │
│                              │  the network                                  │
│   ┌──┐    ┌──┐    ┌──┐      │                                               │
│   │Ed│←───│Py│←───│Am│←──┐  │  ═══════════════════════════════════          │
│   └──┘    └──┘    └──┘   │  │                                               │
│   ┌──┐    ┌──┐    ┌──┐   │  │  ┌──────────────────────────────────────┐    │
│   │Bg│←───│PT│←───│UT│←──┤  │  │ Self-Supervised Learning:            │    │
│   └──┘    └──┘    └──┘   │  │  │ From SimCLR to Cross-Scale MAE       │    │
│           ┌──┐    ┌──┐   │  │  │                                      │    │
│           │CV│←───│Tc│←──┤  │  │ Apr 2026 · 12 min                    │    │
│           └──┘    └──┘   │  │  │ [SSL] [Computer Vision] [MAE]        │    │
│           ┌──┐           │  │  │                                      │    │
│           │SS│←──────────┤  │  │ Gradient flows to:                   │    │
│           └──┘          (Bl)★ │  │ ← Self-Supervised Learning (0.9)   │    │
│                              │  │ ← Computer Vision (0.7)             │    │
│   Red pulses ←←← show       │  │ ← UTK AICIP (0.5)                  │    │
│   insight flowing back       │  │                                      │    │
│   through the network        │  │ A deep dive into the evolution...   │    │
│                              │  └──────────────────────────────────────┘    │
│                              │                                               │
│                              │  ┌──────────────────────────────────────┐    │
│                              │  │ Building FleetSmart:                 │    │
│                              │  │ From Prototype to Production         │    │
│                              │  │                                      │    │
│                              │  │ Mar 2026 · 15 min                    │    │
│                              │  │ [SaaS] [FastAPI] [GCP]               │    │
│                              │  │                                      │    │
│                              │  │ Gradient flows to:                   │    │
│                              │  │ ← Cloud/Infra (0.8)                 │    │
│                              │  │ ← Python (0.6)                      │    │
│                              │  │ ← Amazon/Industry (0.7)             │    │
│                              │  └──────────────────────────────────────┘    │
│                              │                                               │
├──────────────────────────────┴───────────────────────────────────────────────┤
│  Mode: BACKPROPAGATION    Blog posts: 4    Avg gradient magnitude: 0.72      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Blog Post Page — Gradient Detail

When a blog post is opened, the 3D view zooms to show the Blog neuron and its backward connections. Continuous backprop pulses flow from the Blog neuron through the relevant connections.

The content panel expands to ~70% width for comfortable reading:

- Full MDX-rendered blog post
- Headings, code blocks (Shiki), math (KaTeX), images, HF embeds
- Table of Contents sidebar (toggleable)
- Progress bar at top (styled as a "gradient magnitude" bar)
- At the end: "This post updates:" section showing which neurons received gradient
- Previous/Next navigation

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Kostas Georgiou]      [Home] [Projects] [Papers] [Blog] [Resume] [Contact] │
├──────────────────────────────────────────────────────────────────────────────┤
│               │                                                              │
│   ┌──┐       │  Self-Supervised Learning:                                   │
│   │SS│←──┐   │  From SimCLR to Cross-Scale MAE                              │
│   └──┘   │   │                                                              │
│   ┌──┐   │   │  April 2026 · 12 min · [SSL] [CV] [MAE]                     │
│   │CV│←──┤   │  Gradient: ████████████████████░░ 0.87                       │
│   └──┘   │   │  ─────────────────────────────────────────────────           │
│   ┌──┐   │   │                                                              │
│   │UT│←──┤   │  ## Introduction                                             │
│   └──┘   │   │                                                              │
│         (Bl)★│  Self-supervised learning has transformed computer            │
│              │  vision by eliminating the need for expensive labeled          │
│   Backprop   │  datasets. In this post, I trace the evolution from           │
│   pulses     │  early contrastive methods through masked image               │
│   flowing    │  modeling to our work on Cross-Scale MAE.                     │
│   ←←←←←←    │                                                              │
│              │  ## The Contrastive Era                                        │
│              │                                                              │
│              │  SimCLR [Chen et al., 2020] demonstrated that a               │
│              │  simple framework for contrastive learning could               │
│              │  achieve remarkable results...                                 │
│              │                                                              │
│              │  ```python                                                    │
│              │  # SimCLR loss function                                       │
│              │  def nt_xent_loss(z_i, z_j, temperature=0.5):                │
│              │      similarity = cosine_similarity(z_i, z_j)                │
│              │      return -log(exp(sim_pos/t) / sum(exp(sim/t)))            │
│              │  ```                                                          │
│              │                                                              │
│              │  The key insight was that...                                   │
│              │                                                              │
│              │  ─────────────────────────────────────────────────            │
│              │  This post updates: [SSL] [CV] [UTK] [Cross-Scale MAE]       │
│              │  [◀ Prev post]                    [Next post ▶]              │
├──────────────┴───────────────────────────────────────────────────────────────┤
│  Reading: SSL Survey    Progress: 45%    Gradient: 0.87                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.6 Resume Page — Full Network Activation Map

The Resume page shows the entire network with ALL neurons activated (glowing) — because the resume represents the complete picture. The camera pulls back to show the full network, and every neuron is lit up, with connections all visible.

The content panel shows a traditional CV layout but with a twist: each section of the CV is annotated with which network layer it corresponds to.

At the top: a "Network Health" summary showing stats:
- Neurons: 25+
- Total connections: 80+
- Avg activation: 0.85
- Loss (converged): 0.03

A "Download Weights" button (= Download PDF) is prominently placed.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Kostas Georgiou]      [Home] [Projects] [Papers] [Blog] [Resume] [Contact] │
├──────────────────────────────────────────────────────────────────────────────┤
│                              │                                               │
│   FULL NETWORK — ALL ACTIVE  │  R E S U M E                                 │
│                              │                                               │
│   (Ed)───(Py)───(Am)──→(FS) │  Network Health:                              │
│    │╲    │╲╱│    │╲   ╱(MD) │  Neurons: 25  Connections: 82                 │
│    │ ╲   │╱╲│    │ ╲ ╱      │  Avg Activation: 0.85  Loss: 0.03            │
│   (Bg)──(PT)──(UT)──→(MC)   │                                               │
│    │╲    │╲╱│    │╲   ╱(XA) │  [▼ DOWNLOAD WEIGHTS (PDF)]                  │
│    │ ╲   │╱╲│    │ ╲ ╱      │                                               │
│   (Ct)──(CV)──(Tc)──→(Bl)   │  ═══════════════════════════════════          │
│          │╲╱│    │╲   ╱(Pa) │                                               │
│          │╱╲│    │ ╲ ╱      │  Input Layer                                  │
│         (NL)──(In)──→(Sm)   │  ─────────────────────────────────────        │
│          │╲╱│                │                                               │
│         (Cl)                 │  EDUCATION                                    │
│          │                   │  PhD Computer Science — UTK, 2019-2024        │
│         (SS)                 │  MS Computer Science — UTK, 2019-2021         │
│          │                   │  BS Informatics — AUTh, Greece, 2013-2018     │
│         (Ma)                 │                                               │
│                              │  Hidden Layer 1: Skills                       │
│   ALL neurons glowing        │  ─────────────────────────────────────        │
│   ALL connections visible    │                                               │
│   Full activation map        │  Python, PyTorch, Computer Vision, NLP,       │
│                              │  Cloud/Infra, Self-Supervised Learning,        │
│                              │  Mathematics/Statistics                        │
│                              │                                               │
│                              │  Hidden Layer 2: Experience                   │
│                              │  ─────────────────────────────────────        │
│                              │                                               │
│                              │  Applied Scientist — Amazon, 2024-Present     │
│                              │  Research Associate — UTK AICIP, 2019-2024    │
│                              │  ...                                           │
│                              │                                               │
│                              │  Output Layer: Projects & Publications        │
│                              │  ─────────────────────────────────────        │
│                              │  [See Projects page]  [See Papers page]       │
│                              │                                               │
├──────────────────────────────┴───────────────────────────────────────────────┤
│  Network: FULLY ACTIVATED    Status: CONVERGED    [Download Weights (PDF)]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.7 Contact Page — Input Layer Focus

Contact is part of the Input layer. Clicking the Contact neuron zooms to the Input layer. The content panel shows:

- Contact information with icons
- "Feed data into the network" concept — the contact form is framed as "sending a signal to the Input layer"
- Links: Email, LinkedIn, GitHub, Google Scholar, HuggingFace
- Contact form with name, email, message fields
- A fun animation: when the form is submitted, a "data point" enters the Input layer and propagates forward through the entire network as a forward pass pulse

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Kostas Georgiou]      [Home] [Projects] [Papers] [Blog] [Resume] [Contact] │
├──────────────────────────────────────────────────────────────────────────────┤
│                              │                                               │
│   INPUT LAYER                │  C O N T A C T                                │
│                              │                                               │
│           ┌──┐  →→→→        │  Send a signal to the input layer.            │
│           │Ed│──→→→→→       │                                               │
│           └──┘  →→→→        │  ═══════════════════════════════════          │
│                              │                                               │
│           ┌──┐  →→→→        │  DIRECT CONNECTIONS                           │
│           │Bg│──→→→→→       │                                               │
│           └──┘  →→→→        │  ✉  kostas@gkos.dev                          │
│                              │  ⌂  github.com/drkostas                      │
│     ★    ┌──┐  →→→→         │  ∞  linkedin.com/in/drkostas                 │
│    ───→ (Ct)──→→→→→         │  ☆  Google Scholar                            │
│     ★    └──┘  →→→→         │  🤗 huggingface.co/drkostas                   │
│                              │                                               │
│                              │  ─────────────────────────────────────        │
│   (Ct) = Contact neuron     │                                               │
│   ★ = incoming signal       │  SEND A SIGNAL                                │
│   →→→ = data propagating    │                                               │
│   to hidden layers           │  Name:    [_________________________]        │
│                              │  Email:   [_________________________]        │
│                              │  Message:                                     │
│                              │  [____________________________________]      │
│                              │  [____________________________________]      │
│                              │  [____________________________________]      │
│                              │                                               │
│                              │  [▶ Propagate Forward (Send)]                │
│                              │                                               │
├──────────────────────────────┴───────────────────────────────────────────────┤
│  Layer: Input    Neuron: Contact    Forward connections: 7                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Interactive Elements & Animations

### 3D Scene

1. **Network Construction** (first load, 0-6s):
   - Frame 0-1s: Background fades from black, subtle star particles appear
   - Frame 1-2s: Input layer neurons materialize (particles converge to form spheres)
   - Frame 2-3s: Hidden layer 1 neurons appear
   - Frame 3-4s: Hidden layer 2 neurons appear
   - Frame 4-5s: Output layer neurons appear
   - Frame 5-6s: Connections draw themselves between neurons (lines grow from source to target)

2. **Idle Animation**:
   - Camera orbits slowly (0.1 deg/sec)
   - Neurons pulse subtly (scale 1.0 → 1.02 → 1.0, 4-second cycle, staggered)
   - Random forward-pass pulses travel through connections every 8 seconds
   - Background particles drift slowly
   - Connections shimmer with a subtle gradient animation

3. **Hover (Neuron Activation)**:
   - Hovered neuron scales up 20%, glows brighter, emits particles
   - Connected neurons glow (brightness proportional to weight)
   - Connections to/from the hovered neuron brighten and thicken
   - Unconnected neurons dim to 30% opacity
   - Tooltip appears showing neuron name and type

4. **Click (Navigation)**:
   - Camera smoothly flies to the clicked neuron (1.2s eased transition)
   - Content panel slides in from right (400ms)
   - Clicked neuron enters "selected" state (persistent glow ring)
   - Connected neuron neighborhood stays highlighted

5. **Forward Pass Animation**:
   - Triggered on first visit and via a "Play Forward Pass" button
   - Gold particles travel from Input layer through connections to Output layer
   - Each neuron "activates" as the signal reaches it (glow + scale pulse)
   - Takes ~4 seconds for full propagation
   - A timeline below maps each layer activation to a career milestone

6. **Backpropagation Animation** (Blog):
   - Red particles travel from the Blog neuron backward through connections
   - Each neuron they pass through "updates" (brief red glow, then settles brighter)
   - Visualizes how writing about work creates feedback that strengthens everything

7. **Layer Isolation**:
   - Clicking a layer label in the nav zooms camera to show only that layer
   - Other layers fade to 10% opacity
   - Neurons in the focused layer spread apart for clarity
   - Click "Show All" or double-click background to return to full view

### Content Panel Interactions

8. **Scroll-activated connections**: As you scroll through projects or papers in the content panel, the 3D view highlights the connections for the currently visible item.

9. **Connection detail**: Clicking a connection line in the 3D view shows a tooltip explaining the relationship (e.g., "PyTorch → MEDiC: Core framework used for model implementation").

10. **Loss Curve Widget**:
    - Persistent in bottom-right
    - Interactive: hover to see epoch/year details
    - Click a point on the curve to see what happened that year
    - The curve animates drawing itself on first load

### Micro-animations

- Neuron pulse: `scale(1.0) → scale(1.02)`, 4s ease-in-out, infinite
- Connection shimmer: gradient offset animation, 6s linear, infinite
- Content panel slide: `translateX(100%) → translateX(0)`, 400ms ease-out
- Camera flight: 1.2s cubic-bezier(0.16, 1, 0.3, 1)
- Particle emission: 20 particles/sec on hovered neuron, 2s lifetime, fade + drift
- Tooltip fade: 200ms opacity transition
- Forward pass pulse: 80px length, 800ms travel time per connection
- Backprop pulse: 60px length, 600ms travel time (faster, more urgent)

### Easter Egg: Overfit Mode

If you click the same neuron 10 times in a row, the network enters "Overfit Mode": all neurons turn the same color (memorization!), connections become chaotic, and a message appears: "Warning: Overfitting detected. Try regularization (explore other neurons)." The network then "regularizes" back to normal with a satisfying animation.

---

## 6. Mobile Adaptation

### Approach: 3D as Background, Content as Focus

On mobile, the 3D network becomes an **ambient background** rather than the primary interaction. The network renders at lower detail (fewer particles, simpler connections) and auto-rotates slowly. Content is accessed via standard mobile navigation.

### Mobile Layout

```
┌─────────────────────────────────┐
│ [☰]   Kostas Georgiou     [⚙]  │
├─────────────────────────────────┤
│  ╭─────────────────────────╮    │
│  │                         │    │
│  │   3D NETWORK VIEWPORT   │    │
│  │   (ambient, auto-orbit) │    │
│  │                         │    │
│  │  Tap neuron to navigate │    │
│  │                         │    │
│  ╰─────────────────────────╯    │
│                                 │
│  Kostas Georgiou                │
│  PhD · ML Engineer              │
│  Applied Scientist at Amazon    │
│                                 │
│  ┌───────────────────────────┐  │
│  │ ★ Featured: FleetSmart   │  │
│  │ AI fleet management...   │  │
│  │ [■ Live]                 │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ ★ Featured: MEDiC        │  │
│  │ CLIP distillation...     │  │
│  │ [□ Code] [□ Demo]       │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│[Home][Projects][Papers][Blog][+]│
└─────────────────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | 3D Behavior | Content Layout |
|-----------|-------------|----------------|
| > 1200px | Full 3D viewport + content panel side-by-side | Split 40/60 |
| 900-1200px | 3D viewport reduced to 30% | Content panel 70% |
| 768-900px | 3D viewport as top banner (200px height) | Content below, full width |
| < 768px | 3D viewport as ambient background (150px, reduced detail) | Content in foreground, full width |
| < 480px | 3D disabled (static network image fallback) | Pure content layout |

### Touch Interactions

- **Pinch**: Zoom on 3D viewport
- **Drag**: Rotate network (when 3D viewport is in focus)
- **Tap neuron**: Navigate (same as click)
- **Tap outside**: Deselect
- Bottom tab bar always visible for traditional navigation

### Performance Adaptations for Mobile

- Reduce neuron count (combine minor neurons)
- Disable particle effects
- Lower connection line count (only show strong connections)
- Reduce render resolution (canvas size / devicePixelRatio)
- Option to fully disable 3D in Settings (uses static network SVG instead)

---

## 7. Tech Requirements

### 3D Engine

| Component | Technology | Purpose |
|-----------|------------|---------|
| 3D Engine | Three.js | 3D scene, camera, lighting, rendering |
| 3D Abstractions | `@react-three/fiber` | React bindings for Three.js |
| 3D Helpers | `@react-three/drei` | Camera controls, text, effects |
| Post-processing | `@react-three/postprocessing` | Bloom, glow effects on neurons |
| Animation | `framer-motion-3d` or GSAP | Camera transitions, UI animations |
| Math | Native Three.js Vector3 | Neuron positioning, connection geometry |

### Framework & Build

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Astro 5.x | Static site generation, content collections |
| 3D Island | React 19 + R3F | The 3D neural network (single large island) |
| Content panels | React | Overlay panels for Projects, Papers, etc. |
| Content | Astro Content Collections | Blog (MDX), project data, paper data |
| Styling | Tailwind CSS 4 | UI components, content panel styling |

### Key Libraries

| Library | Purpose |
|---------|---------|
| `three` | Core 3D engine |
| `@react-three/fiber` | React Three.js integration |
| `@react-three/drei` | Camera controls, HTML overlay, Text |
| `@react-three/postprocessing` | Bloom/glow for neuron activation |
| `@fontsource/space-grotesk` | Heading font |
| `@fontsource/inter` | Body font |
| `@fontsource/jetbrains-mono` | Code font |
| `framer-motion` | Content panel animations |
| `gsap` | Complex timeline animations (forward pass) |
| `shiki` | Code syntax highlighting |
| `rehype-katex` + `remark-math` | Math rendering |
| `@astrojs/mdx` | Blog MDX support |
| `@astrojs/rss` | RSS feed |
| `@astrojs/sitemap` | SEO |
| `lil-gui` or custom | Debug controls for network params (dev only) |

### Network Data Model

The neural network structure is defined in a JSON configuration:

```json
{
  "layers": [
    {
      "id": "input",
      "name": "Input",
      "color": "#22d3ee",
      "position": { "x": -6, "y": 0, "z": 0 },
      "neurons": [
        {
          "id": "education",
          "label": "Education",
          "size": 1.0,
          "route": "/resume#education",
          "description": "PhD Computer Science (UTK), MS CS, BS Informatics"
        },
        {
          "id": "background",
          "label": "Background",
          "size": 0.8,
          "route": "/",
          "description": "Greek-born, ML-focused, industry + academia"
        },
        {
          "id": "contact",
          "label": "Contact",
          "size": 0.7,
          "route": "/contact",
          "description": "Email, LinkedIn, GitHub, Scholar"
        }
      ]
    },
    {
      "id": "hidden1",
      "name": "Skills",
      "color": "#a78bfa",
      "position": { "x": -2, "y": 0, "z": 0 },
      "neurons": [
        {
          "id": "python",
          "label": "Python",
          "size": 1.0,
          "route": "/resume#skills"
        },
        {
          "id": "pytorch",
          "label": "PyTorch",
          "size": 0.9,
          "route": "/resume#skills"
        },
        {
          "id": "cv",
          "label": "Computer Vision",
          "size": 1.0,
          "route": "/resume#skills"
        },
        {
          "id": "nlp",
          "label": "NLP",
          "size": 0.6,
          "route": "/resume#skills"
        },
        {
          "id": "cloud",
          "label": "Cloud/Infra",
          "size": 0.8,
          "route": "/resume#skills"
        },
        {
          "id": "ssl",
          "label": "Self-Supervised",
          "size": 0.9,
          "route": "/resume#skills"
        },
        {
          "id": "math",
          "label": "Math/Stats",
          "size": 0.7,
          "route": "/resume#skills"
        }
      ]
    }
  ],
  "connections": [
    {
      "from": "education",
      "to": "python",
      "weight": 0.8,
      "description": "Learned Python during undergrad"
    },
    {
      "from": "pytorch",
      "to": "utk",
      "weight": 0.95,
      "description": "Primary framework during PhD research"
    },
    {
      "from": "ssl",
      "to": "crossscale_mae",
      "weight": 1.0,
      "description": "Core methodology of Cross-Scale MAE"
    }
  ]
}
```

### Astro Component Architecture

```
src/
  layouts/
    NetworkLayout.astro       # Main layout with 3D viewport + content area
    BlogPostLayout.astro      # Blog post reading layout
  components/
    network/
      NetworkScene.tsx        # React island: R3F Canvas + scene
      NeuralNetwork.tsx       # Main network component
      Neuron.tsx              # Individual neuron (sphere + label + glow)
      Connection.tsx          # Connection line between neurons
      ForwardPass.tsx         # Forward pass particle animation
      BackpropPass.tsx        # Backpropagation animation
      LayerPlane.tsx          # Semi-transparent layer backdrop
      CameraController.tsx    # Smooth camera transitions
      NetworkParticles.tsx    # Background particle system
      LossCurve.tsx           # Bottom-right loss curve widget
      MiniMap.tsx             # Network overview minimap (optional)
    panels/
      ContentPanel.tsx        # Sliding content panel wrapper
      ProjectsPanel.tsx       # Projects content view
      PapersPanel.tsx         # Papers content view
      BlogPanel.tsx           # Blog index view
      ResumePanel.tsx         # Resume / full activation view
      ContactPanel.tsx        # Contact + input signal form
      AboutPanel.tsx          # About / home content
    ui/
      TopNav.astro            # Persistent top navigation bar
      LayerTabs.tsx           # Layer-based tab navigation
      NeuronTooltip.tsx       # Hover tooltip for neurons
      ConnectionTooltip.tsx   # Connection detail tooltip
      GradientBadge.tsx       # Blog post gradient flow visualization
      WeightBar.tsx           # Weight/strength bar component
      StatusBar.astro         # Bottom status bar
      MobileNav.tsx           # Mobile bottom tab bar
    shared/
      ProjectCard.astro       # Project display card
      PaperEntry.astro        # Paper display entry
      BlogCard.astro          # Blog post card
      VenueBadge.astro        # Conference venue badge
  content/
    blog/                     # MDX blog posts
    config.ts                 # Content collection schemas
  pages/
    index.astro               # Home (full network view)
    projects.astro            # Projects (output layer focus)
    papers.astro              # Papers (publications neuron)
    blog/
      index.astro             # Blog (backpropagation view)
      [slug].astro            # Blog post pages
    resume.astro              # Resume (full activation map)
    contact.astro             # Contact (input layer focus)
  data/
    network.json              # Neural network structure definition
    projects.json             # Project data
    papers.json               # Publication data
    connections.json          # Connection metadata
  styles/
    network.css               # Network-specific styles
    panels.css                # Content panel styles
    globals.css               # Global resets and variables
  shaders/                    # Optional: custom GLSL shaders
    neuron-glow.frag          # Neuron glow shader
    connection-flow.frag      # Connection pulse shader
```

### Performance Targets & Optimization

| Metric | Target | Strategy |
|--------|--------|----------|
| FPS (desktop) | 60fps | Level-of-detail, instanced rendering |
| FPS (mobile) | 30fps+ | Reduced neuron count, no particles, lower resolution |
| Initial load | < 300KB JS | Tree-shake Three.js, lazy-load post-processing |
| TTI | < 2s | Server-render content panel HTML, lazy-load 3D |
| Lighthouse | > 85 | Static HTML for SEO, 3D as progressive enhancement |

**Key optimizations:**
- Three.js is tree-shakeable: only import what's used
- `InstancedMesh` for neurons (one draw call for all spheres)
- `LineSegments` for connections (batched geometry)
- Postprocessing (bloom) only on desktop, conditional import
- 3D scene lazy-loaded: content HTML renders immediately, 3D mounts after
- `offscreenCanvas` where supported for 3D rendering off main thread
- Fallback: static SVG network diagram for browsers without WebGL

---

## 8. Pros & Cons

### Pros

1. **Deepest conceptual alignment** — A neural network portfolio for an ML engineer is the most "true to self" metaphor possible. Every element has meaning. This is not a decoration; it IS the content structure.
2. **Visually stunning** — 3D networks with glowing neurons, particle effects, and animated connections create an immediate "wow" moment. Screenshots and screencasts will look incredible.
3. **Educational** — The metaphor teaches visitors about neural networks while they browse. Non-technical visitors learn something; technical visitors appreciate the accuracy.
4. **Demonstrates core competency** — Building this proves deep understanding of both ML concepts and frontend engineering. The portfolio IS a technical achievement.
5. **Exploration-friendly** — The 3D space invites exploration. Rotating, zooming, clicking neurons feels like discovery. High engagement time.
6. **Shareable** — "This ML engineer's portfolio IS a neural network" is extremely shareable on Twitter, LinkedIn, HN.
7. **Content connections visible** — Unlike any other portfolio, you can literally SEE how skills connect to projects, how education led to experience, how experience produced outputs. The network topology IS the story.
8. **Unique in the space** — Many portfolios use 3D (globe, particles, geometric shapes). None use a structurally meaningful neural network where the architecture maps to content.
9. **Extensible** — Adding a new project = adding a neuron and connections. The visual updates automatically.

### Cons

1. **Heavy JavaScript** — Three.js + R3F + postprocessing = ~150-200KB gzipped minimum. This is a lot for a portfolio. Mitigated by lazy loading and code splitting.
2. **WebGL dependency** — Requires WebGL support. ~98% of modern browsers support it, but corporate locked-down browsers or very old devices may not. Need a non-WebGL fallback.
3. **Performance on low-end devices** — 3D rendering at 60fps is demanding. Mobile devices (especially budget ones) may struggle. Need aggressive quality scaling.
4. **Accessibility** — The 3D scene is not screen-reader accessible. The HTML content panels are, but navigation via the network is not. The top nav bar is the accessibility fallback.
5. **Learning curve** — Visitors need to understand they can interact with the 3D scene. First-time users might not know to click neurons. Need clear onboarding (intro animation helps).
6. **Distraction risk** — The 3D scene is so visually interesting that visitors might spend all their time playing with the camera instead of reading content. The content panel must be compelling enough to compete.
7. **Development effort** — Highest-effort concept by a significant margin (~40 days). Three.js development has a steep learning curve. Camera work, particle systems, and smooth animations require careful tuning.
8. **Content creation** — Defining meaningful weights, connections, and descriptions for every neuron-to-neuron link is a significant content authoring task. The `network.json` is complex.
9. **Mobile compromise** — On mobile, the 3D experience is significantly diminished. The defining feature (3D network exploration) becomes a background decoration on small screens.
10. **SEO** — Content rendered in Three.js is invisible to search engines. The server-rendered HTML content panels handle SEO, but the primary visual experience (the network) is not indexable.

---

## 9. Effort Estimate

| Phase | Task | Days |
|-------|------|------|
| 1 | Astro project setup + Tailwind + fonts | 1 |
| 2 | Three.js / R3F basic scene: camera, lighting, background | 2 |
| 3 | Neuron component: spheres, glow, labels, instancing | 2 |
| 4 | Connection component: lines, weight-based thickness, shimmer | 2 |
| 5 | Network layout algorithm: layer positioning, neuron spacing | 1.5 |
| 6 | Camera controller: smooth fly-to, orbit, zoom limits | 2 |
| 7 | Neuron hover: activation glow, connection highlighting, tooltip | 1.5 |
| 8 | Neuron click: navigation, content panel slide-in | 1.5 |
| 9 | Forward pass animation: particle flow, sequential activation | 2.5 |
| 10 | Backpropagation animation: reverse particle flow | 1.5 |
| 11 | Content panel framework: slide-in, breadcrumbs, layer tabs | 2 |
| 12 | Home page: full network view, hero text, intro animation | 2 |
| 13 | Projects panel: tiered cards, connection annotations | 2 |
| 14 | Papers panel: venue badges, weight display, abstract toggle | 1.5 |
| 15 | Blog setup: Content Collections, MDX, backprop view | 3 |
| 16 | Blog post template: reading layout, gradient display, ToC | 2 |
| 17 | Resume panel: full activation view, network health stats | 1.5 |
| 18 | Contact panel: input layer view, form with forward pass on submit | 1 |
| 19 | Loss curve widget: interactive, timeline, milestones | 1.5 |
| 20 | Network data: define all neurons, connections, weights, descriptions | 2 |
| 21 | Postprocessing: bloom, selective glow, performance tuning | 1.5 |
| 22 | Mobile: responsive 3D quality, fallback SVG, touch controls | 2.5 |
| 23 | Accessibility: top nav fallback, ARIA labels, keyboard navigation | 1.5 |
| 24 | SEO: server-rendered content, meta tags, OG images | 1 |
| 25 | RSS feed, sitemap | 0.5 |
| 26 | Performance: lazy loading, code splitting, FPS monitoring | 2 |
| 27 | Polish: cross-browser, WebGL fallback, Lighthouse | 2 |
| **Total** | | **~43-46 days** |

### Complexity Breakdown

- **Low complexity**: RSS, sitemap, contact form, status bar, top nav
- **Medium complexity**: Content panels, project/paper cards, blog template, loss curve widget, mobile layout
- **High complexity**: Three.js scene setup, neuron rendering with instancing, camera controller, forward pass animation, backpropagation animation, postprocessing/bloom, performance optimization, network data model, WebGL fallback
- **Content creation** (non-engineering): Network structure definition, connection weights, neuron descriptions, layer descriptions

---

## 10. Key Design Decisions to Make

1. **Network accuracy vs. aesthetics**: Should the network topology be a literal representation (exact layer sizes, real architecture) or a stylized version that looks good but isn't architecturally precise? Recommendation: stylized but meaningful — every connection should represent a real relationship, but neuron sizes and positions prioritize visual balance.

2. **Number of neurons**: More neurons = richer network but busier visuals. Recommended: ~25-30 neurons (3 input, 7 skills, 4 experience, ~10-15 output). Minor projects can be combined into aggregate neurons.

3. **3D complexity level**: Full postprocessing with bloom, particles, reflections? Or clean/minimal with just spheres and lines? Recommendation: start minimal, add bloom and particles as progressive enhancement.

4. **Intro animation**: Play on every visit, first visit only, or user-triggered? Recommendation: first visit plays automatically (stored in localStorage), subsequent visits show settled network with a "Replay" button.

5. **Mobile strategy**: Background-only 3D, or full touch-interactive? Recommendation: Touch-interactive on tablets (768px+), background-only on phones.

6. **WebGL fallback**: Static SVG network diagram, or skip the network entirely? Recommendation: static SVG that shows the same network structure as a 2D graph, with clickable neurons.

7. **Content panel width**: How much screen real estate should the content panel take vs. the 3D viewport? Recommendation: 60% content / 40% 3D on desktop, with a draggable divider.

8. **Forward pass frequency**: How often should the idle forward pass animation play? Too frequent = distracting. Too rare = missed. Recommendation: every 15 seconds, subtle opacity.

9. **Blog backprop**: Should every blog post trigger the backprop animation, or only on the blog index? Recommendation: blog index triggers the full animation, individual posts show a static gradient visualization.

10. **Connection tooltips**: Should connection details be visible on hover, on click, or in the content panel? Recommendation: brief tooltip on hover (source, target, weight), detailed explanation in content panel.

---

## 11. Appendix: Technical Deep Dive — The ML Metaphor Map

This section documents every ML concept mapping in full detail, for reference during implementation.

### Layer Architecture

```
                    THE PORTFOLIO NEURAL NETWORK
                    ============================

Layer 0: Input (3 neurons)
├── Education: BS Informatics (AUTh), MS CS (UTK), PhD CS (UTK)
├── Background: Greek-born, 8+ years ML, academia + industry
└── Contact: Email, LinkedIn, GitHub, Scholar, HuggingFace

Layer 1: Hidden (Skills, 7 neurons)
├── Python: Primary language, 8+ years
├── PyTorch: Deep learning framework, 5+ years
├── Computer Vision: Core research area
├── NLP: Secondary research area
├── Cloud/Infra: GCP, AWS, Azure, Docker, K8s
├── Self-Supervised Learning: PhD specialization
└── Math/Stats: Linear algebra, optimization, probability

Layer 2: Hidden (Experience, 4 neurons)
├── Amazon: Applied Scientist, 2024-present
├── UTK AICIP: Research Associate, 2019-2024
├── Teaching: Graduate TA, course development
└── Industry: Internships, freelance, consulting

Layer 3: Output (8+ neurons)
├── FleetSmart.ai: Deployed SaaS product
├── ShiftMD: Scheduling optimization platform
├── MEDiC: CLIP distillation framework
├── Cross-Scale MAE: NeurIPS 2023 paper + code
├── XpensAI: AI expense management
├── Soma: Health analytics dashboard
├── Blog: Technical writing
├── Papers: Academic publications (aggregate)
└── [Minor projects collapsed into "Open Source" aggregate neuron]
```

### Connection Semantics

**Strong weights (0.8-1.0)**: Direct, causal relationships
- Education → Python (learned during studies)
- PyTorch → MEDiC (core framework)
- Self-Supervised Learning → Cross-Scale MAE (paper topic)
- UTK AICIP → Papers (all publications from this lab)
- Amazon → FleetSmart (built at/after Amazon)

**Medium weights (0.4-0.7)**: Supportive relationships
- Math → Computer Vision (theoretical foundation)
- Cloud → FleetSmart (deployment infrastructure)
- NLP → XpensAI (text processing for receipts)
- Education → Math (academic grounding)

**Weak weights (0.1-0.3)**: Tangential relationships
- NLP → Soma (minimal NLP in health dashboard)
- Teaching → Blog (teaching experience informs writing)
- Contact → all skills (everyone can reach out about any topic)

### Skip Connections

Direct links that bypass intermediate layers (like ResNet skip connections):
- Education → Cross-Scale MAE (PhD dissertation work)
- Background → Blog (personal experiences inform writing)
- Contact → FleetSmart (direct business inquiry path)

These are visualized as arcing connections that curve over the hidden layers.

### Activation Functions (Neuron Visualization)

Each layer uses a different "activation function" expressed as visual style:
- **Input (ReLU)**: Sharp on/off glow (fully lit or dim)
- **Hidden (Sigmoid)**: Smooth glow transition (gradual activation)
- **Output (Softmax)**: Competitive — when one output neuron brightens, others dim slightly (attention drawn to the selected project)

### Attention Mechanism (Featured Content)

The "attention" concept is used for the featured project spotlight:
- A pulsing "attention head" icon can appear over a featured neuron
- The attention score determines which connections are highlighted first
- Multi-head attention = multiple featured items can be spotlighted simultaneously
- Self-attention within the Output layer shows project-to-project relationships (e.g., MEDiC → MaskDistill, both in SSL space)
