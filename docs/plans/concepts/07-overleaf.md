# Concept 07: The Overleaf

**Status:** Design Concept  
**Author:** Kostas Georgiou  
**Date:** 2026-04-06

---

## 1. Concept Overview

### The Metaphor

The entire portfolio looks and feels like Overleaf's dark-mode LaTeX editor. The defining layout is a persistent **split-screen**: the LEFT panel holds your "source" content (about text, project listings, paper details, blog posts), and the RIGHT panel always shows a "compiled" CV/resume rendered to look like a LaTeX PDF.

The metaphor is: **you are always one click from seeing the full picture**. A recruiter can browse your projects in detail on the left while your credentials sit right there on the right. No context-switching. No "where's the resume?" moment.

### The Wow Factor

- The RIGHT panel is a pixel-perfect LaTeX-styled document (Computer Modern font, section formatting, horizontal rules, BibTeX-style citations) that scrolls and highlights the section corresponding to what you're viewing on the left. Browsing the Projects page? The CV auto-scrolls to the "Selected Projects" section and highlights it.
- A subtle "compile" animation plays on page transitions: the right panel briefly shows a progress bar and "Compiling..." message before the CV section smoothly scrolls into view.
- The header bar is an exact replica of Overleaf's toolbar (with the Overleaf-style green compile button, which serves as a "Download PDF" action).
- The file tree in the sidebar mirrors Overleaf's project file tree, but each "file" is a page on the site.

### Spiritual Successor

This directly evolves the VSCode portfolio concept: same "developer tool as portfolio" strategy, but the tool changed from a code editor to a document editor, which better serves the content (a portfolio is a document, not a codebase).

---

## 2. Color Palette & Typography

### Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Background (editor) | `#1e1e1e` | Left panel background |
| Background (PDF preview) | `#2b2b2b` | Right panel background (simulating dark-mode PDF viewer) |
| PDF "paper" surface | `#f5f5f0` | The actual CV document surface (cream/off-white) |
| PDF text | `#1a1a1a` | Text on the CV document |
| Toolbar background | `#2c2c2c` | Top bar |
| Sidebar background | `#252525` | File tree panel |
| Accent (Overleaf green) | `#4ab04a` | Compile button, active states, links |
| Accent secondary | `#6cb4ee` | Hyperlinks in the editor panel |
| Gutter/line numbers | `#858585` | Line numbers in the source panel |
| Selection highlight | `#264f78` | Active section highlight in CV |
| Error red | `#f44747` | Form validation, broken links |
| Warning amber | `#cca700` | Draft/preprint badges |

### Typography

| Context | Font | Fallback | Size |
|---------|------|----------|------|
| Left panel body | `Inter` | system sans-serif | 15px / 1.6 |
| Left panel headings | `JetBrains Mono` | monospace | 20-28px |
| Left panel code/tags | `JetBrains Mono` | monospace | 13px |
| CV document body | `CMU Serif` (Computer Modern) | `Latin Modern Roman`, Georgia | 11pt-equivalent |
| CV document headings | `CMU Serif Bold` | Georgia Bold | 14pt-equivalent |
| CV document monospace | `CMU Typewriter` | Courier New | 10pt-equivalent |
| Toolbar/UI chrome | `Inter` | system sans-serif | 13px |
| File tree labels | `JetBrains Mono` | monospace | 13px |

The key typographic trick: the LEFT panel uses modern web fonts (Inter + JetBrains Mono), the RIGHT panel uses Computer Modern (the LaTeX default) loaded via `@font-face` from the `computer-modern` npm package. This contrast reinforces that the right side is a "compiled document."

---

## 3. Navigation Design

### Primary Navigation: Overleaf File Tree

The left sidebar contains a file tree mimicking Overleaf's project structure:

```
v portfolio/
    main.tex          <- Home / About
    projects.tex      <- Projects
    papers.bib        <- Publications
    blog/
      v posts/
          post-1.tex  <- Blog Post 1
          post-2.tex  <- Blog Post 2
      index.tex       <- Blog Index
    contact.tex       <- Contact
```

Clicking a file loads the corresponding page content in the left panel. The active file is highlighted green (Overleaf style).

### Secondary Navigation: Overleaf Toolbar

The top toolbar replicates Overleaf's toolbar with functional elements:

```
[Logo] Kostas Georgiou / portfolio  |  [Compile ▶] [Download PDF] [Share] [Theme ⚙]
```

- **Compile button**: Downloads the actual PDF resume
- **Share button**: Copies the current page URL
- **Theme toggle**: Switches between dark editor / light editor modes

### Mobile Navigation

On mobile, the split-screen collapses. A tab bar at the top lets you switch between "Source" (content) and "Preview" (CV), mimicking Overleaf's mobile editor toggle. The file tree becomes a hamburger menu drawer.

---

## 4. Page Designs

### 4.1 Home Page (main.tex)

The left panel shows a personal introduction formatted like a LaTeX document source, with visible section commands rendered as styled headings. The content includes:

- `\section{About}` — Brief personal statement (2-3 sentences)
- `\section{Experience}` — Timeline: Amazon Applied Scientist, UTK PhD, etc.
- `\section{Education}` — PhD, MS, BS with years and institutions
- `\section{Skills}` — Grouped by category: Languages, Frameworks, Cloud, Tools
- `\section{Highlights}` — Key metrics: 8 publications, NeurIPS/WACV, 54 citations on Cross-Scale MAE

The RIGHT panel (CV) shows the corresponding compiled sections. As you scroll the left panel, the right panel auto-scrolls to track.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [◉] Kostas Georgiou / portfolio    [▶ Compile]  [↓ PDF]  [◐ Share]  [⚙]   │
├──────────┬───────────────────────────────┬───────────────────────────────────┤
│ FILETREE │  main.tex (Source)            │  CV Preview (Compiled PDF)       │
│          │                               │                                  │
│ v port/  │  1  \documentclass{cv}        │  ┌─────────────────────────┐     │
│  >main   │  2  \begin{document}          │  │  KOSTAS GEORGIOU        │     │
│   proj   │  3                            │  │  PhD | ML Engineer |    │     │
│   paper  │  4  \section{About}           │  │  Applied Scientist      │     │
│  v blog/ │  5  Machine Learning          │  │                         │     │
│   index  │  6  Engineer and Applied      │  │  ─────────────────────  │     │
│   post1  │  7  Scientist at Amazon       │  │  EXPERIENCE             │     │
│   post2  │  8  with 8+ years of          │  │                         │     │
│   contct │  9  experience in computer    │  │  Applied Scientist      │     │
│          │  10 vision, self-supervised   │  │  Amazon | 2024-Present  │     │
│          │  11 learning, and NLP.        │  │  • ML models for ...    │     │
│          │  12                           │  │                         │     │
│          │  13 \section{Experience}      │  │  Research Associate     │     │
│          │  14 \entry{Amazon}            │  │  UTK AICIP | 2019-2024  │     │
│          │  15   {Applied Scientist}     │  │  • 8 publications ...   │     │
│          │  16   {2024--Present}         │  │                         │     │
│          │  17   {Building ML models     │  │  EDUCATION              │     │
│          │  18    for retail...}         │  │                         │     │
│          │  19                           │  │  PhD Computer Science   │     │
│          │  20 \entry{UTK AICIP}        │  │  UTK | 2019-2024        │     │
│          │  21   {Research Associate}    │  │                         │     │
│          │  22   {2019--2024}            │  │  MS Computer Science    │     │
│          │  23   {Self-supervised        │  │  UTK | 2019-2021        │     │
│          │  24    learning research...}  │  │                         │     │
│          │  25                           │  │  BS Informatics         │     │
│          │  26 \section{Education}       │  │  AUTh | 2013-2018       │     │
│          │  27 ...                       │  └─────────────────────────┘     │
│          │                               │                                  │
├──────────┴───────────────────────────────┴───────────────────────────────────┤
│  Ln 14, Col 1  ·  UTF-8  ·  LaTeX  ·  ● main.tex  ·  Compiled ✓           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Projects Page (projects.tex)

The left panel displays project cards grouped by tier. The content resembles a LaTeX document with `\subsection` headings per project:

- **Featured Projects** (large cards): FleetSmart.ai, ShiftMD, MEDiC, MaskDistill, XpensAI, Soma
- **Research Projects** (medium cards): Cross-Scale MAE, 3D Semantic Segmentation, Minecraft AI
- **Utilities & Packages** (compact list): PyPi packages, bots, learning exercises

Each project card includes: image thumbnail, description, tech tags, and action buttons (Live/Demo/Code/Paper).

The RIGHT panel CV auto-scrolls to "Selected Projects" and highlights the entries that correspond to the currently visible projects on the left.

Clicking a featured project could expand it inline (accordion-style) to show a mini case study.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [◉] Kostas Georgiou / portfolio    [▶ Compile]  [↓ PDF]  [◐ Share]  [⚙]   │
├──────────┬───────────────────────────────┬───────────────────────────────────┤
│ FILETREE │  projects.tex (Source)        │  CV Preview (Compiled PDF)       │
│          │                               │                                  │
│ v port/  │  \section{Featured Projects}  │  ┌─────────────────────────┐     │
│   main   │                               │  │          ...            │     │
│  >proj   │  ┌─────────────────────────┐  │  │                         │     │
│   paper  │  │ [img] FleetSmart.ai     │  │  │  ─────────────────────  │     │
│  v blog/ │  │ AI fleet management     │  │  │ ▐SELECTED PROJECTS    ▐│     │
│   index  │  │ platform for vessel     │  │  │ ▐                     ▐│     │
│   post1  │  │ tracking & compliance   │  │  │ ▐ FleetSmart.ai —     ▐│     │
│   contct │  │ [FastAPI][Next.js][GCP]  │  │  │ ▐ AI fleet mgmt       ▐│     │
│          │  │ [■ Live]                 │  │  │ ▐ platform. FastAPI,   ▐│     │
│          │  └─────────────────────────┘  │  │ ▐ Next.js, GCP.        ▐│     │
│          │                               │  │ ▐                       ▐│     │
│          │  ┌─────────────────────────┐  │  │ ▐ MEDiC — Multi-obj    ▐│     │
│          │  │ [img] MEDiC             │  │  │ ▐ exploration of       ▐│     │
│          │  │ Multi-objective CLIP    │  │  │ ▐ distillation from    ▐│     │
│          │  │ distillation. 85.07%    │  │  │ ▐ CLIP. NeurIPS-       ▐│     │
│          │  │ finetuning ImageNet-1K  │  │  │ ▐ adjacent work.       ▐│     │
│          │  │ [PyTorch][CLIP][HF]     │  │  │ ▐                       ▐│     │
│          │  │ [□ Code] [□ Demo]       │  │  │ ▐ ShiftMD — Intelli-   ▐│     │
│          │  └─────────────────────────┘  │  │ ▐ gent shift sched-    ▐│     │
│          │                               │  │ ▐ uling for medical    ▐│     │
│          │  \section{Research}           │  │ ▐ departments.         ▐│     │
│          │  ...                          │  │                         │     │
│          │                               │  └─────────────────────────┘     │
├──────────┴───────────────────────────────┴───────────────────────────────────┤
│  Ln 1, Col 1  ·  UTF-8  ·  LaTeX  ·  ● projects.tex  ·  Compiled ✓        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Papers Page (papers.bib)

The left panel shows publications in a BibTeX-inspired format. Each entry uses a card layout but with BibTeX field labels visible:

```
@article{georgiou2023crossscale,
  title   = {Cross-Scale MAE: A Tale of Multiscale Exploitation...},
  author  = {Georgiou, Konstantinos and ...},
  journal = {NeurIPS 2023},
  year    = {2023},
  cited   = {54},
  links   = {[Paper] [Code] [Scholar]}
}
```

Entries are sorted by year (newest first). Venue badges color-coded: NeurIPS = gold, WACV = silver, IGARSS = bronze, arXiv = gray, journal = blue.

The RIGHT panel CV shows the "Publications" section with the standard LaTeX bibliography format. The currently-hovered paper on the left gets highlighted on the right.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [◉] Kostas Georgiou / portfolio    [▶ Compile]  [↓ PDF]  [◐ Share]  [⚙]   │
├──────────┬───────────────────────────────┬───────────────────────────────────┤
│ FILETREE │  papers.bib (Source)          │  CV Preview (Compiled PDF)       │
│          │                               │                                  │
│ v port/  │  % ══════════════════════     │  ┌─────────────────────────┐     │
│   main   │  % Publications               │  │          ...            │     │
│   proj   │  % ══════════════════════     │  │                         │     │
│  >paper  │                               │  │  PUBLICATIONS           │     │
│  v blog/ │  @inproceedings{              │  │                         │     │
│   index  │    georgiou2023crossscale,    │  │  [1] K. Georgiou et al. │     │
│   contct │    title  = {Cross-Scale      │  │  "Cross-Scale MAE: A    │     │
│          │      MAE: A Tale of Multi-    │  │  Tale of Multiscale     │     │
│          │      scale Exploitation in    │  │  Exploitation in Remote  │     │
│          │      Remote Sensing},         │  │  Sensing." NeurIPS,     │     │
│          │    author = {Georgiou, K.     │  │  2023. [54 citations]   │     │
│          │      and Psaroudakis, A.      │  │                         │     │
│          │      and ...},                │  │  [2] K. Georgiou et al. │     │
│          │    booktitle = {NeurIPS},     │  │  "Semantic segmentation │     │
│          │    year   = {2023},           │  │  in aerial imagery..."  │     │
│          │    cited  = {54}   ★★★        │  │  WACV, 2023.            │     │
│          │  }                            │  │  [31 citations]         │     │
│          │  [Paper] [Code] [Scholar]     │  │                         │     │
│          │                               │  │  [3] K. Georgiou et al. │     │
│          │  @article{                    │  │  "Ocassionally Secure:  │     │
│          │    georgiou2024secure,        │  │  A Comparative Analy-   │     │
│          │    title  = {Ocassionally     │  │  sis..." arXiv, 2024.   │     │
│          │      Secure: A Comparative    │  │  [14 citations]         │     │
│          │      Analysis of Code Gen-    │  │                         │     │
│          │      eration Assistants},     │  │  ...                    │     │
│          │    ...                        │  │                         │     │
│          │  }                            │  └─────────────────────────┘     │
├──────────┴───────────────────────────────┴───────────────────────────────────┤
│  Ln 1, Col 1  ·  UTF-8  ·  BibTeX  ·  ● papers.bib  ·  Compiled ✓         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Blog Index (blog/index.tex)

The left panel shows blog posts as a list. Each post shows:
- Title (large, linked)
- Date and reading time
- Tag pills
- 2-line excerpt
- Thumbnail (optional)

Posts are presented in a clean card list format. The file tree expands the `blog/` folder to show individual post files.

The RIGHT panel CV shows a "Selected Blog Posts" or "Technical Writing" section with titles and dates, tracking the currently visible post range.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [◉] Kostas Georgiou / portfolio    [▶ Compile]  [↓ PDF]  [◐ Share]  [⚙]   │
├──────────┬───────────────────────────────┬───────────────────────────────────┤
│ FILETREE │  blog/index.tex (Source)      │  CV Preview (Compiled PDF)       │
│          │                               │                                  │
│ v port/  │  \section{Blog}              │  ┌─────────────────────────┐     │
│   main   │                               │  │          ...            │     │
│   proj   │  ┌─────────────────────────┐  │  │                         │     │
│   paper  │  │ Self-Supervised Learn-  │  │  │  TECHNICAL WRITING      │     │
│  v blog/ │  │ ing: From SimCLR to     │  │  │                         │     │
│  >index  │  │ Cross-Scale MAE         │  │  │  "Self-Supervised       │     │
│   post1  │  │                         │  │  │  Learning: From SimCLR  │     │
│   post2  │  │ Apr 2026 · 12 min read  │  │  │  to Cross-Scale MAE"   │     │
│   post3  │  │ [SSL] [Computer Vision] │  │  │  Apr 2026              │     │
│   contct │  │                         │  │  │                         │     │
│          │  │ A deep dive into the    │  │  │  "Building FleetSmart:  │     │
│          │  │ evolution of self-sup-   │  │  │  From Prototype to      │     │
│          │  │ ervised learning from    │  │  │  Production"            │     │
│          │  │ contrastive methods...  │  │  │  Mar 2026              │     │
│          │  └─────────────────────────┘  │  │                         │     │
│          │                               │  │  ...                    │     │
│          │  ┌─────────────────────────┐  │  │                         │     │
│          │  │ Building FleetSmart:    │  │  │                         │     │
│          │  │ From Prototype to       │  │  │                         │     │
│          │  │ Production              │  │  │                         │     │
│          │  │                         │  │  │                         │     │
│          │  │ Mar 2026 · 15 min read  │  │  │                         │     │
│          │  │ [FastAPI] [GCP] [SaaS]  │  │  │                         │     │
│          │  └─────────────────────────┘  │  │                         │     │
├──────────┴───────────────────────────────┴───────────────────────────────────┤
│  Ln 1, Col 1  ·  UTF-8  ·  LaTeX  ·  ● index.tex  ·  Compiled ✓           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Blog Post Page (blog/posts/post-1.tex)

The left panel renders the full blog post as rich content: headings, paragraphs, code blocks with syntax highlighting, math equations (KaTeX), images with captions, and embedded HuggingFace demos.

The left panel header shows a "Table of Contents" toggle button that reveals a floating ToC sidebar (like Overleaf's outline panel).

The RIGHT panel continues to show the CV, but could optionally switch to showing a "compiled preview" of the blog post itself (like viewing a compiled PDF of the blog post). A toggle in the toolbar lets you switch between "CV Preview" and "Post Preview".

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [◉] Kostas Georgiou / portfolio    [▶ Compile]  [↓ PDF]  [◐ Share]  [⚙]   │
├──────────┬───────────────────────────────┬───────────────────────────────────┤
│ FILETREE │  blog/posts/ssl-survey.tex    │  Post Preview (Compiled)         │
│          │                               │                                  │
│ v port/  │  \title{Self-Supervised       │  ┌─────────────────────────┐     │
│   main   │    Learning: From SimCLR      │  │  Self-Supervised        │     │
│   proj   │    to Cross-Scale MAE}        │  │  Learning: From SimCLR  │     │
│   paper  │  \date{April 2026}            │  │  to Cross-Scale MAE     │     │
│  v blog/ │  \tags{SSL, CV, MAE}          │  │                         │     │
│   index  │                               │  │  Kostas Georgiou        │     │
│  >post1  │  \section{Introduction}       │  │  April 2026 · 12 min   │     │
│   post2  │                               │  │                         │     │
│   contct │  Self-supervised learning     │  │  ─────────────────────  │     │
│          │  has transformed computer     │  │                         │     │
│ OUTLINE  │  vision by eliminating the    │  │  Self-supervised learn- │     │
│ 1. Intro │  need for expensive labeled   │  │  ing has transformed    │     │
│ 2. SSL   │  datasets. In this post, I    │  │  computer vision by     │     │
│ 3. MAE   │  trace the evolution from     │  │  eliminating the need   │     │
│ 4. Cross │  early contrastive methods    │  │  for expensive labeled  │     │
│ 5. Conc  │  to our Cross-Scale MAE.      │  │  datasets...            │     │
│          │                               │  │                         │     │
│          │  \begin{equation}             │  │        L = L_rec +      │     │
│          │    L = L_{rec} + \lambda       │  │     lambda * L_con     │     │
│          │    L_{con}                     │  │                         │     │
│          │  \end{equation}               │  │  [Figure 1: Cross-      │     │
│          │                               │  │   Scale MAE arch...]    │     │
│          │  \begin{figure}               │  │                         │     │
│          │    \includegraphics{arch}      │  └─────────────────────────┘     │
│          │    \caption{Cross-Scale...}   │                                  │
│          │  \end{figure}                 │  [Toggle: CV | Post Preview]     │
├──────────┴───────────────────────────────┴───────────────────────────────────┤
│  Ln 7, Col 1  ·  UTF-8  ·  LaTeX  ·  ● ssl-survey.tex  ·  Compiled ✓      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.6 Resume Page (resume.tex)

This page is unique: the LEFT panel becomes a simplified control panel with:
- Download buttons (PDF, LaTeX source)
- Quick stats (last updated, page count)
- Version history (if applicable)
- A "source view" of the resume LaTeX preamble

The RIGHT panel expands to take ~70% of the width and shows the full CV at a larger scale, now as the primary focus rather than a companion panel. The user can scroll through the entire document.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [◉] Kostas Georgiou / portfolio    [▶ Compile]  [↓ PDF]  [◐ Share]  [⚙]   │
├──────────┬──────────────────────────────────────────────────────────────────┤
│ FILETREE │                                                                 │
│          │  ┌───────────────────────────────────────────────────────────┐  │
│ v port/  │  │                                                           │  │
│   main   │  │                    KOSTAS GEORGIOU                        │  │
│   proj   │  │            PhD | Applied Scientist | ML Engineer           │  │
│   paper  │  │          kostas@gkos.dev | gkos.dev | github/drkostas     │  │
│  v blog/ │  │                                                           │  │
│   index  │  │  ═══════════════════════════════════════════════════════   │  │
│  >resume │  │  EXPERIENCE                                               │  │
│   contct │  │                                                           │  │
│          │  │  Applied Scientist — Amazon                  2024-Present  │  │
│ ──────── │  │  • Building ML models for retail operations                │  │
│ CONTROLS │  │  • ...                                                     │  │
│          │  │                                                           │  │
│ [↓ PDF]  │  │  Research Associate — UTK AICIP Lab            2019-2024  │  │
│ [↓ .tex] │  │  • Published 8 papers (NeurIPS, WACV, IGARSS)            │  │
│          │  │  • Developed Cross-Scale MAE (54 citations)               │  │
│ Updated: │  │  • Led MEDiC project (CLIP distillation)                  │  │
│ Apr 2026 │  │                                                           │  │
│          │  │  ═══════════════════════════════════════════════════════   │  │
│ Pages: 2 │  │  EDUCATION                                                │  │
│          │  │                                                           │  │
│          │  │  PhD Computer Science — UTK                    2019-2024  │  │
│          │  │  MS Computer Science — UTK                     2019-2021  │  │
│          │  │  BS Informatics — AUTh, Greece                 2013-2018  │  │
│          │  │                                                           │  │
│          │  └───────────────────────────────────────────────────────────┘  │
├──────────┴──────────────────────────────────────────────────────────────────┤
│  resume.tex  ·  Compiled ✓  ·  2 pages  ·  Last compiled: Apr 2026        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.7 Contact Page (contact.tex)

The left panel shows contact information in a LaTeX-style format:

- Email (clickable)
- LinkedIn, GitHub, Google Scholar, HuggingFace links
- Location (Knoxville, TN or wherever current)
- A contact form styled as LaTeX input fields (`\input{name}`, `\input{email}`, `\textarea{message}`)

The RIGHT panel CV shows the header section with contact info, highlighting the correspondence.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [◉] Kostas Georgiou / portfolio    [▶ Compile]  [↓ PDF]  [◐ Share]  [⚙]   │
├──────────┬───────────────────────────────┬───────────────────────────────────┤
│ FILETREE │  contact.tex (Source)         │  CV Preview (Compiled PDF)       │
│          │                               │                                  │
│ v port/  │  \section{Contact}            │  ┌─────────────────────────┐     │
│   main   │                               │  │                         │     │
│   proj   │  \href{mailto:kostas@gkos     │  │  KOSTAS GEORGIOU        │     │
│   paper  │    .dev}{kostas@gkos.dev}     │  │  ─────────────────────  │     │
│  v blog/ │                               │  │  ✉ kostas@gkos.dev      │     │
│   index  │  \href{https://linkedin       │  │  ⌂ github.com/drkostas  │     │
│  >contct │    .com/in/drkostas}          │  │  ∞ linkedin/drkostas    │     │
│          │    {LinkedIn}                 │  │  ☆ scholar.google/...   │     │
│          │  \href{https://github         │  │                         │     │
│          │    .com/drkostas}             │  │                         │     │
│          │    {GitHub}                   │  │                         │     │
│          │  \href{https://scholar        │  │                         │     │
│          │    .google.com/...}           │  │                         │     │
│          │    {Google Scholar}            │  │                         │     │
│          │  \href{https://huggingface    │  │                         │     │
│          │    .co/drkostas}              │  │                         │     │
│          │    {HuggingFace}              │  │                         │     │
│          │                               │  │                         │     │
│          │  ──────────────────────────   │  │                         │     │
│          │                               │  │                         │     │
│          │  \section{Send a Message}     │  │                         │     │
│          │                               │  │                         │     │
│          │  \input{name}  [___________]  │  │                         │     │
│          │  \input{email} [___________]  │  │                         │     │
│          │  \textarea{message}           │  │                         │     │
│          │  [________________________]   │  │                         │     │
│          │  [________________________]   │  │                         │     │
│          │                               │  │                         │     │
│          │  [\compile{Send}]             │  │                         │     │
├──────────┴───────────────────────────────┴───────────────────────────────────┤
│  Ln 1, Col 1  ·  UTF-8  ·  LaTeX  ·  ● contact.tex  ·  Compiled ✓         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Interactive Elements & Animations

### Core Interactions

1. **Compile Animation**: On every page navigation, the right panel shows a brief (~800ms) "Compiling..." overlay with a green progress bar (Overleaf's compile progress), then smoothly scrolls the CV to the relevant section. Skippable by clicking.

2. **Synchronized Scrolling**: As the user scrolls the left panel, the right panel auto-scrolls to track the corresponding CV section. Subtle highlight animation shows which CV section corresponds to the current content.

3. **Split Pane Resizer**: A draggable divider between left and right panels. Double-click to snap to 50/50 or to collapse the right panel entirely.

4. **Line Numbers**: The left panel shows gutter line numbers (like a code editor). These are decorative but add to the aesthetic. On blog posts, they help reference specific paragraphs.

5. **File Tree Interactions**: Folders expand/collapse with smooth animation. Active file shows a green dot indicator. Hovering shows a tooltip with the page description.

6. **Compile Button**: Clicking it triggers the compile animation on-demand and offers the PDF resume download.

7. **Search (Ctrl+F)**: A search bar drops down from the toolbar (like Overleaf's find/replace) that searches across all pages. Results show the file and line number.

### Micro-animations

- File tree expand/collapse: 200ms ease-out
- Page transition: left panel content cross-fades (300ms) while CV scrolls
- Hover on project cards: subtle lift shadow + scale(1.01)
- BibTeX entries: hover highlights the entry and its corresponding CV citation
- Status bar updates: text slides in/out on page change
- Toolbar buttons: Overleaf's green pulse on the compile button

### Easter Egg

If you type `\begin{secret}` in the search bar, it reveals a hidden "About This Site" page showing the tech stack and a behind-the-scenes look at how it was built.

---

## 6. Mobile Adaptation

### Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| > 1200px | Full split-screen (file tree + source + CV preview) |
| 768-1200px | File tree collapses to icon bar. Source + CV side by side. |
| < 768px | Single panel with toggle. Tab bar: "Source | Preview". |

### Mobile-Specific Changes

- **File tree** becomes a slide-out drawer (hamburger menu)
- **Source/Preview toggle** tabs at the top replace the split layout
- **Compile button** moves to a floating action button (bottom-right, green circle)
- **CV preview** is swipeable on touch devices
- **Status bar** simplified to just the current filename
- **Line numbers** hidden to save horizontal space
- **Split pane resizer** disabled

### Mobile Navigation Flow

```
┌─────────────────────────────────┐
│ [☰]  Kostas Georgiou   [▶] [⚙] │
├─────────────────────────────────┤
│  [Source]  [Preview]            │
├─────────────────────────────────┤
│                                 │
│  \section{Featured Projects}    │
│                                 │
│  ┌───────────────────────────┐  │
│  │ [img] FleetSmart.ai      │  │
│  │ AI fleet management       │  │
│  │ platform for vessel       │  │
│  │ tracking & compliance     │  │
│  │ [FastAPI][Next.js][GCP]   │  │
│  │ [■ Live]                  │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ [img] MEDiC               │  │
│  │ Multi-objective CLIP      │  │
│  │ distillation...           │  │
│  │ [□ Code] [□ Demo]        │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│  projects.tex · Compiled ✓     │
└─────────────────────────────────┘
         [▶ Download PDF]
```

---

## 7. Tech Requirements

### Framework & Build

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Astro 5.x | Static site generation, content collections |
| UI Islands | React 19 | Interactive components (split pane, file tree) |
| Content | Astro Content Collections | Blog posts (MDX), project data, paper data |
| Styling | Tailwind CSS 4 + CSS Modules | Utility classes + scoped component styles |
| Fonts | `computer-modern` npm package + Google Fonts | LaTeX fonts for CV, Inter + JetBrains Mono for UI |

### Key Libraries

| Library | Purpose |
|---------|---------|
| `@fontsource/computer-modern` | Computer Modern (LaTeX) font family |
| `@fontsource/inter` | Body text font |
| `@fontsource/jetbrains-mono` | Monospace UI font |
| `split.js` or custom | Draggable split pane divider |
| `framer-motion` | Page transitions, compile animation |
| `shiki` | Syntax highlighting for code blocks and BibTeX |
| `rehype-katex` + `remark-math` | LaTeX math rendering in blog posts |
| `@astrojs/mdx` | MDX support for blog |
| `@astrojs/rss` | RSS feed generation |
| `@astrojs/sitemap` | SEO sitemap |

### Astro Component Architecture

```
src/
  layouts/
    OverleafLayout.astro      # Main split-screen layout
    BlogPostLayout.astro      # Blog post with optional post preview
    ResumeLayout.astro        # Expanded CV view
  components/
    FileTree.tsx              # React island: interactive file tree
    SplitPane.tsx             # React island: draggable split pane
    CVPreview.astro           # Right panel CV renderer
    CVSection.astro           # Individual CV section (highlights on active)
    CompileButton.tsx         # React island: compile animation + PDF download
    Toolbar.astro             # Overleaf-style top bar
    StatusBar.astro           # Bottom status bar
    ProjectCard.astro         # Project display card
    PaperEntry.astro          # BibTeX-style paper entry
    BlogCard.astro            # Blog post preview card
    SearchOverlay.tsx         # React island: search functionality
    MobileToggle.tsx          # React island: source/preview toggle
  content/
    blog/                     # MDX blog posts
    config.ts                 # Content collection schemas
  pages/
    index.astro               # Home (main.tex)
    projects.astro            # Projects (projects.tex)
    papers.astro              # Papers (papers.bib)
    blog/
      index.astro             # Blog index
      [slug].astro            # Blog post pages
    resume.astro              # Resume (expanded CV)
    contact.astro             # Contact (contact.tex)
  data/
    cv.json                   # CV content data (rendered on right panel)
    projects.json             # Project data
    papers.json               # Publication data
  styles/
    overleaf.css              # Overleaf-specific theme styles
    latex-document.css        # Styles to make the CV look like a LaTeX PDF
    globals.css               # Global resets and variables
```

### Performance Targets

- Lighthouse Performance: > 95
- First Contentful Paint: < 1.2s
- Total JavaScript: < 50KB (only interactive islands)
- CV panel: pre-rendered as static HTML, no JS needed
- Blog posts: zero JS by default (Astro)

### Deployment

- Vercel with automatic deploys from `main` branch
- Preview deploys on `staging` branch / PRs
- Static output (`output: 'static'` in Astro config)

---

## 8. Pros & Cons

### Pros

1. **Unique metaphor** — No one has an Overleaf-themed portfolio. The LaTeX academic aesthetic is highly relevant for an ML researcher / PhD.
2. **CV always visible** — Recruiters never need to navigate to a separate resume page. The persistent CV panel is a killer feature for job-seeking.
3. **Strong academic signal** — LaTeX, BibTeX, Computer Modern fonts instantly signal research credibility to academic and research-oriented audiences.
4. **Natural information hierarchy** — The split-screen inherently creates primary (left) and secondary (right) content tiers.
5. **Familiar to the audience** — Anyone who has written a paper recognizes this interface immediately.
6. **Print-friendly** — The CV panel is already formatted for print/PDF.
7. **Clean content focus** — Unlike the VSCode concept with its 4 navigation layers, the Overleaf concept has only 2 (file tree + toolbar), leaving maximum space for content.
8. **Responsive split** — The CV can collapse on mobile, giving full width to content.

### Cons

1. **Split-screen on small screens** — Even on tablets, the split layout can feel cramped. The mobile fallback (source/preview toggle) loses the defining feature.
2. **CV content maintenance** — The right panel CV needs to stay in sync with the actual resume PDF. Two sources of truth (cv.json + resume PDF).
3. **Less "wow" visually** — Compared to a 3D concept or game concept, this is more understated. The wow is conceptual, not visual.
4. **Non-technical visitors** — Some recruiters may not recognize the Overleaf reference and just see a split-screen layout (which is fine, but the metaphor is lost on them).
5. **Blog post reading** — Reading blog posts with a CV panel eating 40% of the screen is not ideal. Needs a "collapse preview" or "focus mode" for long reads.
6. **Computer Modern rendering** — Web-rendered Computer Modern fonts don't look as crisp as actual LaTeX PDF output. May need careful font-size and antialiasing tuning.
7. **File tree limitation** — As pages grow (many blog posts), the file tree gets long. Needs collapsible folders and possibly search.

---

## 9. Effort Estimate

| Phase | Task | Days |
|-------|------|------|
| 1 | Astro project setup + Tailwind + font loading | 1 |
| 2 | Overleaf layout: toolbar, file tree, split pane, status bar | 3 |
| 3 | CV preview panel: LaTeX-styled rendering, section highlighting | 2 |
| 4 | Home page content + synchronized scrolling | 1 |
| 5 | Projects page: tiered cards + CV tracking | 2 |
| 6 | Papers page: BibTeX styling + venue badges | 1 |
| 7 | Blog setup: Content Collections, MDX, syntax highlighting, math | 3 |
| 8 | Blog post template: ToC, post preview mode, rich components | 2 |
| 9 | Resume page: expanded CV view + download controls | 1 |
| 10 | Contact page: LaTeX-styled form + links | 0.5 |
| 11 | Mobile adaptation: toggle mode, drawer nav, responsive | 2 |
| 12 | Compile animation + micro-interactions | 1 |
| 13 | Search overlay (Ctrl+F) | 1 |
| 14 | RSS feed, sitemap, OG images, SEO | 1 |
| 15 | Polish: cross-browser testing, Lighthouse, accessibility | 1.5 |
| **Total** | | **~23 days** |

### Complexity Breakdown

- **Low complexity**: Contact, Resume, Status bar, Toolbar
- **Medium complexity**: File tree, Project cards, Paper entries, Blog index
- **High complexity**: Split pane with synchronized scrolling, CV preview panel with section tracking, Compile animation, Mobile layout switching

---

## 10. Key Design Decisions to Make

1. **CV content source**: Should the right panel render from a JSON data file, or directly embed/render the actual LaTeX resume PDF?
2. **Blog post preview mode**: Should blog posts switch the right panel to "Post Preview" by default, or keep the CV and offer a toggle?
3. **Compile animation frequency**: Every page change, or only on first load?
4. **File tree depth**: Flat list of pages, or nested folders (blog/posts/...)?
5. **Search scope**: Current page only, or cross-site search?
