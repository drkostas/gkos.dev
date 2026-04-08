# Concept 05: The Paper

**Status:** Draft  
**Author:** Kostas Georgiou  
**Date:** 2026-04-06  
**Framework:** Astro + GSAP  
**Theme:** Dark

---

## 1. Concept Overview

### The Metaphor

The entire portfolio is structured as a research paper. Visitors experience the site the way a reviewer reads a manuscript: Abstract (Home), Related Work (Experience), Methods (Projects), Experiments (Publications), Results (Demos), and References (Contact). The typography is LaTeX-inspired but modernized for screens. Wide margins contain floating annotations, citation-style cross-references, and margin notes that provide secondary context without cluttering the main flow. Section numbers persist throughout. The scrolling experience mirrors reading a two-column academic paper, but in a dark, modern, wide-format interpretation.

### The Wow Factor

The first thing you see is a paper-style header block with "title, authors, abstract" formatting -- but it is the portfolio hero. The title is the person's name. The author block contains title, affiliation, and links. The abstract IS the career summary. As you scroll, section headings appear with LaTeX-style numbering (1., 1.1., 2., etc.). Hovering over any cross-reference (e.g., "see Section 3.2") shows a preview tooltip of that section. Citation brackets like [1], [2] link to the publications page. Margin notes slide in from the right edge as you scroll, containing supplementary details: "54 citations," "deployed to production," "NeurIPS 2023." The reading experience feels scholarly and authoritative -- but the dark theme and modern spacing prevent it from looking stuffy.

### Target Audience Hooks

- **Recruiters (30-second scan):** The abstract/hero section gives the complete picture in one viewport: name, title, key metrics, and resume download. They can stop scrolling after 5 seconds and have everything they need.
- **Hiring Managers:** The paper structure communicates rigor and organization. Section numbers and clear hierarchy make it trivially easy to jump to "Methods" (projects) or "Experiments" (publications) and evaluate depth.
- **Senior MLEs / Peers:** This is their native format. They read papers every day. The LaTeX-inspired typography, citation hovers, and margin notes feel like home. The design itself is a signal of academic fluency.

---

## 2. Color Palette & Typography

### Color Palette

```
Background (paper):      #0f0f14    (dark parchment -- warm dark, not cold)
Surface (cards/panels):  #161620    (elevated content panels)
Surface hover:           #1c1c28    (interaction state)
Margin area:             #0a0a0e    (slightly darker than main, like printed margin)
Border:                  #252535    (subtle structural lines)
Rule lines:              #2a2a40    (horizontal rules between sections)

Primary accent:          #7c9aff    (periwinkle blue -- like hyperlinks in LaTeX PDFs)
Secondary accent:        #c792ea    (soft purple -- annotation/margin note color)
Citation bracket:        #f0c674    (warm yellow -- [1], [2] citation markers)
Code accent:             #a8e6cf    (mint green -- inline code, method names)

Text primary:            #d4d4e0    (warm off-white, not harsh #fff)
Text secondary:          #8888a0    (muted, for metadata, dates, abstracts)
Text tertiary:           #555570    (very muted, for margin annotations labels)

Section numbers:         #7c9aff    (accent blue, matching hyperlinks)
Venue badge gold:        #f0c674    (top-tier: NeurIPS, ECCV)
Venue badge silver:      #c792ea    (strong: WACV, IGARSS)
Venue badge bronze:      #8888a0    (preprint, workshop)
```

### Typography

```
Body text:      Crimson Pro, 400/450 weight, 1.75 line-height
                (a modern serif optimized for screen reading -- the "paper" feel)

Headings:       Crimson Pro, 700 weight
                (same family as body, bold for structure)

Section #s:     JetBrains Mono, 500 weight
                (monospace numbers: "1.", "2.1.", "3." -- LaTeX section numbering)

Code/methods:   JetBrains Mono, 400 weight
                (inline code, method names, technical terms)

Abstract text:  Crimson Pro, 400 italic
                (italicized abstract, matching paper convention)

Margin notes:   Inter, 400 weight, 0.8rem
                (sans-serif for contrast -- margin annotations are metadata, not prose)

Display/title:  Crimson Pro, 700 weight, tracking tight
                (the "paper title" in the hero)

Math:           KaTeX default (Computer Modern)
                (for any equations in blog posts)
```

### Type Scale

```
Paper title:    clamp(2rem, 4vw, 3.5rem)
Section head:   clamp(1.4rem, 2.5vw, 2rem)
Subsection:     clamp(1.1rem, 2vw, 1.5rem)
Body:           1.05rem / 1.75 line-height  (generous for serif readability)
Abstract:       1rem / 1.7 line-height, italic
Margin note:    0.8rem / 1.5 line-height
Citation:       0.85rem, superscript style
Tag:            0.75rem, uppercase, monospace
```

### Design Principle: Wide Margins

The content column is narrow (max 680px) centered on the page, with wide margins (200px+) on each side on desktop. This mimics the generous margins of a typeset paper. The right margin is active -- it holds floating annotations, citation tooltips, and supplementary figures. The left margin holds section numbers and (optionally) a table of contents.

---

## 3. Navigation Design

### Primary Navigation: Paper-Style Section Links

Navigation is built into the paper structure itself. At the top: a slim bar with the "author" name and section links styled as a paper's table of contents.

```
Layout:
  Left:    "K. Georgiou" (styled as author name in a paper header)
  Center:  Abstract · Related Work · Methods · Experiments · Blog · Appendix
  Right:   [Download PDF] button (styled like "Download Paper" on arXiv)

Behavior:
  - Always visible, slim (40px height)
  - Active section highlighted with blue underline
  - On scroll: current section label updates automatically
  - On mobile: collapses to hamburger with section list
  - Smooth scroll to sections when clicked
```

### Secondary Navigation: Section Numbers (Left Margin)

On desktop, the left margin shows the current section number and subsection hierarchy. As you scroll, the number updates. This acts as a "where am I" indicator.

```
  1.
  │
  1.1
  │
  1.2  ← you are here
  │
  2.
```

### Page Mapping (Paper Structure)

```
Paper Section    →  Portfolio Page/Section   →  URL
─────────────────────────────────────────────────────
Title & Abstract →  Hero + career summary    →  / (top)
1. Related Work  →  Experience timeline      →  / (scroll)
2. Methods       →  Projects                 →  /projects
3. Experiments   →  Publications             →  /papers
4. Blog          →  Technical writing        →  /blog
5. Appendix      →  Resume (full details)    →  /resume
References       →  Contact & links          →  /contact
```

---

## 4. Page Designs

### 4.1 HOME PAGE

The home page reads like the first pages of a research paper: title block, abstract, introduction, and related work (experience). It is a single long scroll.

#### Title Block

Styled exactly like a LaTeX paper header:

```
                    KOSTAS GEORGIOU

    PhD  ·  Machine Learning Engineer  ·  Applied Scientist

          Amazon  ·  University of Tennessee, Knoxville

    kg@gkos.dev  ·  github.com/drkostas  ·  gkos.dev

                      ──────────

                       Abstract

    Applied Scientist at Amazon with 8+ years of experience
    in machine learning, computer vision, and self-supervised
    learning. PhD from UTK with 8 publications (NeurIPS,
    WACV, IGARSS) and 100+ citations. Builder of production
    ML systems (FleetSmart.ai, XpensAI) and open-source
    research tools (Cross-Scale MAE, MEDiC). This portfolio
    presents the methods, experiments, and results of a
    career optimizing at the intersection of research and
    engineering.

    Keywords: self-supervised learning, masked image modeling,
    CLIP distillation, computer vision, remote sensing,
    applied ML, fleet analytics, constraint optimization

    [Download CV]   [View Publications]   [Contact Author]
```

#### Section 1: Introduction (Career Overview)

Styled with section numbering. Content provides the high-level narrative.

```
1.  Introduction

    This work presents the professional trajectory of an
    applied scientist working across the full spectrum of
    machine learning — from theoretical foundations in
    self-supervised representation learning to deployed
    production systems serving real users.

    1.1  Key Contributions

    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │      8+      │  │    100+      │  │      6+      │
    │ Publications │  │  Citations   │  │  Products    │
    │ NeurIPS WACV │  │  and growing │  │  Deployed    │
    └──────────────┘  └──────────────┘  └──────────────┘

    1.2  Research Interests

    Self-supervised learning, masked image modeling,
    knowledge distillation, multi-scale representation
    learning, remote sensing, medical imaging.
```

#### Section 2: Related Work (Experience Timeline)

Experience presented as a "literature review" of the author's own career.

```
2.  Related Work

    2.1  Amazon — Applied Scientist (2024–Present)

    Production ML systems at scale. Focus areas include
    [details redacted for portfolio — see Resume appendix
    for full description].

                                        ┌─────────────────┐
                                        │ Margin note:     │
                                        │ "At Amazon since │
                                        │ 2024. Prev: UTK  │
                                        │ PhD, 4.5 years"  │
                                        └─────────────────┘

    2.2  University of Tennessee — PhD Researcher (2019–2025)

    Research in self-supervised learning for computer
    vision. Developed Cross-Scale MAE [8] (NeurIPS 2023,
    54 citations), MEDiC [2] (CLIP distillation), and
    mCL-LC [9] (WACV 2023, 31 citations). Authored 8
    publications across top venues.

    Hovering [8] shows: "Cross-Scale MAE: A Tale of
    Multi-Scale Exploitation in Remote Sensing. NeurIPS
    2023. 54 citations."
```

#### ASCII Mockup: Home Page

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  K. Georgiou     Abstract · Related Work · Methods · Experiments    [Download]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                                                                                  │
│  ┆                                                                         ┆     │
│  ┆                        KOSTAS GEORGIOU                                  ┆     │
│  ┆                                                                         ┆     │
│  ┆        PhD  ·  ML Engineer  ·  Applied Scientist                        ┆     │
│  ┆                                                                         ┆     │
│  ┆      Amazon  ·  University of Tennessee, Knoxville                      ┆     │
│  ┆                                                                         ┆     │
│  ┆   kg@gkos.dev  ·  github.com/drkostas  ·  gkos.dev                     ┆     │
│  ┆                                                                         ┆     │
│  ┆                         ─────────────                                   ┆     │
│  ┆                                                                         ┆     │
│  ┆                           Abstract                                      ┆     │
│  ┆                                                                         ┆     │
│  ┆    Applied Scientist at Amazon with 8+ years of                         ┆     │
│  ┆    experience in machine learning, computer vision,                     ┆     │
│  ┆    and self-supervised learning. PhD from UTK with                      ┆     │
│  ┆    8 publications (NeurIPS, WACV, IGARSS) and 100+                     ┆     │
│  ┆    citations. Builder of production ML systems and                      ┆     │
│  ┆    open-source research tools.                                          ┆     │
│  ┆                                                                         ┆     │
│  ┆    Keywords: self-supervised learning, masked image                     ┆     │
│  ┆    modeling, CLIP distillation, computer vision                         ┆     │
│  ┆                                                                         ┆     │
│  ┆    [Download CV]  [Publications]  [Contact Author]                      ┆     │
│  ┆                                                                         ┆     │
│  ┆                         ─────────────                                   ┆     │
│  ┆                                                                         ┆     │
│  ┆  1.  Introduction                                                       ┆     │
│  ┆                                                                         ┆     │
│  ┆  This work presents the professional trajectory of  ┌─ margin ────────┐ ┆     │
│  ┆  an applied scientist working across the full       │ 8+ publications │ ┆     │
│  ┆  spectrum of machine learning — from theoretical    │ 100+ citations  │ ┆     │
│  ┆  foundations to production systems.                  │ 8+ years in ML  │ ┆     │
│  ┆                                                     └─────────────────┘ ┆     │
│  ┆  1.1  Key Contributions                                                 ┆     │
│  ┆                                                                         ┆     │
│  ┆  ┌────────────┐ ┌────────────┐ ┌────────────┐                          ┆     │
│  ┆  │     8+     │ │   100+     │ │    6+      │                          ┆     │
│  ┆  │   Papers   │ │ Citations  │ │  Products  │                          ┆     │
│  ┆  └────────────┘ └────────────┘ └────────────┘                          ┆     │
│  ┆                                                                         ┆     │
│  ┆                         ─────────────                                   ┆     │
│  ┆                                                                         ┆     │
│  ┆  2.  Related Work (Experience)                                          ┆     │
│  ┆                                                     ┌─ margin ────────┐ ┆     │
│  ┆  2.1  Amazon — Applied Scientist                    │ Since 2024      │ ┆     │
│  ┆       2024–Present                                  │ Production ML   │ ┆     │
│  ┆                                                     │ at scale        │ ┆     │
│  ┆  Production ML systems at scale. Building           └─────────────────┘ ┆     │
│  ┆  applied science solutions for [domain].                                ┆     │
│  ┆                                                                         ┆     │
│  ┆  2.2  UTK — PhD Researcher                         ┌─ margin ────────┐ ┆     │
│  ┆       2019–2025                                     │ NeurIPS 2023    │ ┆     │
│  ┆                                                     │ WACV 2023       │ ┆     │
│  ┆  Self-supervised learning for computer vision.      │ IGARSS 2024 x2  │ ┆     │
│  ┆  Developed Cross-Scale MAE [8], MEDiC [2],         │ 8 papers total  │ ┆     │
│  ┆  mCL-LC [9]. 8 publications, 100+ citations.       └─────────────────┘ ┆     │
│  ┆                                                                         ┆     │
│  ┆  2.3  AUTH — BSc Computer Science                                       ┆     │
│  ┆       2014–2018                                                         ┆     │
│  ┆                                                                         ┆     │
│  ┆  Community detection on social networks.                                ┆     │
│  ┆  Published first paper: distributed hybrid                              ┆     │
│  ┆  methodology [10].                                                      ┆     │
│  ┆                                                                         ┆     │
├──┆─────────────────────────────────────────────────────────────────────────┆────┤
│  K. Georgiou    GitHub · LinkedIn · Scholar · HuggingFace       gkos.dev        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 PROJECTS PAGE (Methods)

#### Concept

"3. Methods" -- each project is a method developed by the author. The page uses paper-style presentation: numbered subsections, method descriptions, and figures (project screenshots). The margin notes contain tech stack details and metrics.

#### Layout

- **Section header:** "3. Methods" with filter tabs below
- **Featured methods (3.1-3.6):** Full subsection treatment with image, description, tech stack in margin, action buttons
- **Additional methods (3.7+):** Compact list with one-line descriptions
- **Figures:** Project screenshots labeled as "Figure 1:", "Figure 2:" etc.

#### ASCII Mockup: Projects Page

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  K. Georgiou     Abstract · Related Work · Methods · Experiments    [Download]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┆                                                                         ┆     │
│  ┆  3.  Methods (Projects)                                                 ┆     │
│  ┆                                                                         ┆     │
│  ┆  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                         ┆     │
│  ┆  │ All  │ │ Prod │ │ Rsch │ │ OSS  │ │ Pkgs │                         ┆     │
│  ┆  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                         ┆     │
│  ┆                                                                         ┆     │
│  ┆  ─────────────────────────────────────────────                          ┆     │
│  ┆                                                                         ┆     │
│  ┆  3.1  FleetSmart.ai                            ┌─ margin ────────────┐ ┆     │
│  ┆                                                 │ Stack:              │ ┆     │
│  ┆  ┌────────────────────────────────────────┐     │ FastAPI, Next.js,   │ ┆     │
│  ┆  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │     │ GCP, LLM, PgSQL    │ ┆     │
│  ┆  │ ░░░ Figure 1: FleetSmart.ai ░░░░░░░░░ │     │                     │ ┆     │
│  ┆  │ ░░░ fleet management dashboard ░░░░░░░ │     │ Status: Production  │ ┆     │
│  ┆  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │     │ Users: Active       │ ┆     │
│  ┆  └────────────────────────────────────────┘     │                     │ ┆     │
│  ┆                                                 │ [● Live Site]       │ ┆     │
│  ┆  AI-powered fleet management platform for       └─────────────────────┘ ┆     │
│  ┆  vessel tracking, compliance monitoring,                                ┆     │
│  ┆  and operational analytics. Built with                                  ┆     │
│  ┆  FastAPI backend, Next.js frontend, and                                 ┆     │
│  ┆  LLM-powered analysis on GCP.                                          ┆     │
│  ┆                                                                         ┆     │
│  ┆  ─────────────────────────────────────────────                          ┆     │
│  ┆                                                                         ┆     │
│  ┆  3.2  MEDiC                                     ┌─ margin ────────────┐ ┆     │
│  ┆                                                 │ Stack:              │ ┆     │
│  ┆  ┌────────────────────────────────────────┐     │ PyTorch, CLIP,      │ ┆     │
│  ┆  │ ░░░ Figure 2: MEDiC architecture ░░░░ │     │ MIM, HuggingFace   │ ┆     │
│  ┆  └────────────────────────────────────────┘     │                     │ ┆     │
│  ┆                                                 │ Result: 85.07%      │ ┆     │
│  ┆  Multi-objective Exploration of Distillation    │ finetuning acc,     │ ┆     │
│  ┆  from CLIP. Combines token distillation, CLS    │ 73.92% k-NN on     │ ┆     │
│  ┆  alignment, and pixel reconstruction with       │ ImageNet-1K         │ ┆     │
│  ┆  Evolved Part Masking.                          │                     │ ┆     │
│  ┆                                                 │ [Paper] [Code] [HF] │ ┆     │
│  ┆  See also: Section 4.2 for the publication.     └─────────────────────┘ ┆     │
│  ┆                                                                         ┆     │
│  ┆  ─────────────────────────────────────────────                          ┆     │
│  ┆                                                                         ┆     │
│  ┆  3.3  Cross-Scale MAE                          ┌─ margin ────────────┐ ┆     │
│  ┆                                                 │ Venue: NeurIPS 2023 │ ┆     │
│  ┆  Self-supervised masked autoencoder with        │ Citations: 54       │ ┆     │
│  ┆  multi-scale exploitation for remote sensing.   │                     │ ┆     │
│  ┆  Cross-scale consistency via contrastive and    │ [Paper] [Code]      │ ┆     │
│  ┆  generative losses. See [8] for details.        └─────────────────────┘ ┆     │
│  ┆                                                                         ┆     │
│  ┆  ─────────────────────────────────────────────                          ┆     │
│  ┆                                                                         ┆     │
│  ┆  3.4  MaskDistill-PyTorch                       First open PyTorch     ┆     │
│  ┆  3.5  ShiftMD                                   Constraint optim.     ┆     │
│  ┆  3.6  XpensAI                                   AI expense mgmt.     ┆     │
│  ┆  3.7  Soma                                      Health dashboard     ┆     │
│  ┆                                                                         ┆     │
│  ┆  ─────────────────────────────────────────────                          ┆     │
│  ┆                                                                         ┆     │
│  ┆  Additional Methods                                                     ┆     │
│  ┆                                                                         ┆     │
│  ┆  3.8   Minecraft AI — RL maze solver ...... [Code]                      ┆     │
│  ┆  3.9   3D Semantic Seg. — Medical ViT .. [Code]                         ┆     │
│  ┆  3.10  BERT QA — Reading comprehension . [Code]                         ┆     │
│  ┆  3.11  HGN — Community detection ...... [Code][Paper]                   ┆     │
│  ┆  3.12  Accident Severity — XGBoost ..... [Code]                         ┆     │
│  ┆  3.13  COVID-19 Vacc. — LSTM forecast .. [Code]                         ┆     │
│  ┆  3.14  Instagram Likes — CNN predict ... [Code]                         ┆     │
│  ┆  3.15  RL Value Iteration — MDP ........ [Code]                         ┆     │
│  ┆  3.16  Numpy CNN — Pure numpy convnet .. [Code]                         ┆     │
│  ┆  3.17  Numpy NN — Feed-forward network . [Code]                         ┆     │
│  ┆                                                                         ┆     │
├──┆─────────────────────────────────────────────────────────────────────────┆────┤
│  K. Georgiou    GitHub · LinkedIn · Scholar · HuggingFace       gkos.dev        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.3 PAPERS / PUBLICATIONS PAGE (Experiments)

#### Concept

"4. Experiments" -- publications are the experimental validation of the author's methods. Each paper is presented with its venue, year, citation count, and links. The layout mirrors a paper's "experiments" section with numbered subsections per publication.

#### Layout

- **Section header:** "4. Experiments (Publications)" with total citation count
- **Filter/sort:** By year (default) | By citations | By venue
- **Each publication** is a numbered subsection (4.1, 4.2, etc.) with:
  - Title (large, linked to PDF/Scholar)
  - Venue badge (color-coded by tier)
  - Year
  - Citation count (with animated counter)
  - Abstract (collapsible, italicized -- like a paper's abstract within the abstract)
  - Action buttons: [PDF] [Code] [Scholar] [BibTeX]
  - Margin note: venue info, citation trend

#### Publication Entry Format

```
4.1  Cross-Scale MAE: A Tale of Multiscale Exploitation
     in Remote Sensing

     NeurIPS 2023                                    54 citations
     ──────────────────────────────────────

     Remote sensing images present unique challenges
     to image analysis due to the extensive geographic
     coverage, hardware limitations...
                                         [expand abstract]

     [PDF]  [Code]  [Scholar]  [Copy BibTeX]
```

#### BibTeX Copy Feature

Clicking [Copy BibTeX] copies a formatted citation to clipboard and shows a brief toast notification styled as a margin note: "Copied to clipboard."

```bibtex
@inproceedings{georgiou2023crossscale,
  title={Cross-Scale MAE: A Tale of Multiscale Exploitation in Remote Sensing},
  author={Georgiou, Kostas and ...},
  booktitle={NeurIPS},
  year={2023}
}
```

---

### 4.4 BLOG PAGE (Index)

#### Concept

"Supplementary Material" -- blog posts are the supplementary material that did not fit in the main paper. Extended analyses, tutorials, behind-the-scenes of research, opinions.

#### Layout

- **Section header:** "Supplementary Material (Blog)" with RSS link
- **Featured post:** The latest or pinned post as a full-width card
- **Post list:** Each post styled as a subsection entry with number, title, date, reading time, and first-paragraph preview
- **Sidebar (right margin):** Tags, search, "Most referenced" (popular posts)

#### Post List Entry Format

```
S.1  Why Masked Image Modeling Works Better Than You Think
     April 2026  ·  12 min  ·  self-supervised-learning
     
     A deep dive into the inductive biases that make MAE
     and BEiT surprisingly effective for representation
     learning...                              [Read more →]
```

---

### 4.5 BLOG POST PAGE

#### Concept

Each blog post is presented as a standalone supplementary document. Full margin note support, code blocks, math equations, and embedded demos.

#### Layout

- **Header:** Post title styled as a paper section title
- **Metadata:** Date, reading time, tags, author
- **Table of contents:** Left margin (desktop), collapsible top (mobile)
- **Content column:** 680px max-width, generous margins
- **Right margin:** Active annotations -- key takeaways, related papers, code repository links
- **Code blocks:** Shiki-highlighted with line numbers, title bar showing filename
- **Math:** KaTeX rendering, display equations centered with equation numbers
- **Bottom:** Previous/next navigation, share buttons, "Cite this post" BibTeX-style

#### "Cite This Post" Feature (Unique)

At the bottom of each blog post, a "Cite this post" block in BibTeX format:

```bibtex
@misc{georgiou2026maskedmodeling,
  title={Why Masked Image Modeling Works Better Than You Think},
  author={Georgiou, Kostas},
  year={2026},
  url={https://gkos.dev/blog/masked-modeling-insights},
}
```

---

### 4.6 RESUME PAGE (Appendix)

#### Concept

"Appendix A: Curriculum Vitae" -- the resume is the appendix, containing the full detailed record that is summarized in the main text.

#### Layout

- **Section header:** "Appendix A: Curriculum Vitae"
- **Download button:** [Download PDF] prominent at top
- **Quick scan section:** Key highlights in a structured format (name, current role, education, top publications) for those who want text, not PDF
- **PDF viewer:** Full-width embedded PDF below the quick scan
- **Margin note:** "Last updated: [date]"

---

### 4.7 CONTACT PAGE (References)

#### Concept

"References" -- in a paper, the references section is where you find the sources. Here, the references are the ways to reach the author. The section also includes a references-style bibliography of the author's own publications (a nice meta-touch).

#### Layout

- **Section header:** "References & Contact"
- **Contact methods:** Styled as a numbered reference list

```
[1]  K. Georgiou, "Email," kg@gkos.dev, 2026.

[2]  K. Georgiou, "LinkedIn," linkedin.com/in/drkostas, 2024.

[3]  K. Georgiou, "GitHub," github.com/drkostas, 2018–present.
     342 contributions in the last year.

[4]  K. Georgiou, "Google Scholar," scholar.google.com/..., 2019–present.
     100+ citations across 8 publications.

[5]  K. Georgiou, "HuggingFace," huggingface.co/drkostas, 2023–present.
     Pre-trained models: MEDiC-ViT-Base, MaskDistill-ViT-Base.

[6]  K. Georgiou, "PyPi," pypi.org/user/drkostas, 2020–present.
     Published packages: [list].
```

- **Optional contact form** below the references, styled minimally

---

## 5. Interactive Elements & Animations

### Citation Hover Previews

When hovering over a citation bracket like [8], a tooltip appears showing:
- Paper title
- Venue + year
- Citation count
- First sentence of abstract
- [View full entry →] link

Implementation: Astro component with `data-citation-id` attribute, JavaScript (client-side) fetches from a citation map and positions a tooltip. Uses `popover` API or `floating-ui`.

### Margin Notes (Scroll-Triggered)

Margin notes fade in as their corresponding content scrolls into the center of the viewport. They slide in from the right edge with a subtle animation.

- **Implementation:** GSAP ScrollTrigger, each margin note has a `data-anchor` pointing to the main text element it annotates
- **Mobile fallback:** Margin notes become inline callout boxes within the content flow

### Section Number Counter (Left Margin)

The left margin shows the current section/subsection number, updating as you scroll. Implemented with IntersectionObserver on section headings.

### Abstract Collapse/Expand

Publication abstracts are collapsed by default (showing first 2 lines) with a [expand] toggle. Smooth height animation on expand.

### BibTeX Copy

Click-to-copy with a brief toast notification. The toast slides in from the right margin, styled as a margin note that says "Copied to clipboard" and fades out after 2 seconds.

### Reading Progress

A thin line at the very top of the page that fills from left to right as you scroll. Styled as a horizontal rule that "writes itself."

### Cross-Reference Navigation

Any cross-reference in the text (e.g., "See Section 3.2" or "as shown in Figure 1") is a clickable link that smooth-scrolls to the referenced element and briefly highlights it with a purple glow.

### Page Transition

When navigating between pages (e.g., Home to Projects), a brief page-turn animation: the current page slides left and the new page slides in from the right, like flipping pages in a document.

---

## 6. Mobile Adaptation

### Breakpoints

```
Desktop:   >= 1200px   (full margin layout -- 200px left, 250px right, 680px content)
Laptop:    1024-1199px  (narrower margins -- 100px left, 150px right)
Tablet:    768-1023px   (no margins, single column, margin notes become callouts)
Mobile:    < 768px      (full-width, stacked, simplified)
```

### Mobile-Specific Changes

- **Margins disappear:** Content becomes full-width (with padding). No left or right margin columns.
- **Margin notes become callout boxes:** Inline colored boxes within the content flow, marked with a vertical accent bar on the left edge:
  ```
  ┌─ Note ──────────────────────┐
  │ NeurIPS 2023, 54 citations  │
  └─────────────────────────────┘
  ```
- **Navigation:** Hamburger menu. Section list in a drawer.
- **Citation hovers:** Become tap-to-expand. Tap a citation bracket to toggle an inline expansion below it.
- **Section numbers:** Hidden on mobile (they rely on the margin).
- **Typography:** Serif body text at slightly larger size (1.1rem) for mobile readability. Line-height increases to 1.8.
- **Table of contents (blog posts):** Collapsible accordion at top of post.
- **Paper title block:** Centered, slightly smaller font, stacked layout instead of spread.

### Performance Budget (Mobile)

```
First Contentful Paint:   < 1.2s
Largest Contentful Paint: < 2.0s
Total JS bundle:          < 60KB  (no Three.js, minimal GSAP)
Fonts:                    Crimson Pro (300KB, subset to Latin)
                          JetBrains Mono (150KB, subset)
                          Inter (100KB, subset -- margin notes only)
```

---

## 7. Tech Requirements

### Astro Architecture

```
src/
├── layouts/
│   ├── PaperLayout.astro       # The main "paper" layout: header, margins, footer
│   ├── BlogPostLayout.astro    # Blog post with TOC, metadata, cite block
│   └── BaseLayout.astro        # HTML head, fonts, global styles
│
├── pages/
│   ├── index.astro             # Home = Title + Abstract + Introduction + Related Work
│   ├── projects.astro          # Methods section
│   ├── papers.astro            # Experiments section
│   ├── blog/
│   │   ├── index.astro         # Supplementary Material index
│   │   └── [...slug].astro     # Individual blog posts
│   ├── resume.astro            # Appendix A
│   └── contact.astro           # References
│
├── components/
│   ├── PaperHeader.astro       # Title block (name, affiliation, abstract)
│   ├── SectionHeading.astro    # Numbered section heading (1., 1.1., etc.)
│   ├── MarginNote.astro        # Right-margin floating annotation
│   ├── MarginNoteInline.astro  # Mobile fallback: inline callout box
│   ├── CitationRef.tsx         # Citation bracket [N] with hover preview (client:visible)
│   ├── CitationTooltip.tsx     # Floating tooltip for citation previews
│   ├── Navigation.astro        # Top nav bar
│   ├── MobileNav.tsx           # Mobile hamburger drawer (client:media)
│   ├── SectionNumberTracker.tsx # Left-margin current section display (client:load)
│   ├── ProjectMethod.astro     # Full project entry (figure + description + margin)
│   ├── ProjectCompact.astro    # Compact project list item
│   ├── PublicationEntry.astro  # Publication with venue badge, citations, abstract
│   ├── VenueBadge.astro        # Color-coded venue badge
│   ├── AbstractCollapse.tsx    # Collapsible abstract (client:visible)
│   ├── BibtexCopy.tsx          # Copy-to-clipboard BibTeX button (client:visible)
│   ├── MetricCounter.tsx       # Animated number counter (client:visible)
│   ├── BlogCard.astro          # Blog post preview
│   ├── ReadingProgress.astro   # Top progress bar (CSS-only or minimal JS)
│   ├── FilterTabs.tsx          # Interactive filter (client:load)
│   ├── ContactRef.astro        # Reference-style contact entry
│   ├── Footer.astro            # Bottom bar
│   └── icons/                  # SVG icons
│
├── content/
│   ├── blog/                   # MDX blog posts
│   ├── projects/               # Project data (YAML)
│   ├── papers/                 # Publication data (YAML) with BibTeX entries
│   └── citations.json          # Citation map for hover previews
│
├── styles/
│   ├── global.css              # CSS custom properties, resets
│   ├── paper.css               # Paper-specific layout (margins, columns, rules)
│   ├── typography.css          # Crimson Pro, JetBrains Mono, Inter
│   └── themes.css              # Dark theme definition
│
└── lib/
    ├── citations.ts            # Citation map builder, BibTeX generator
    ├── section-numbers.ts      # Section numbering logic
    └── utils.ts                # Shared utilities
```

### Key Dependencies

```
Framework:           astro@5.x
UI Islands:          @astrojs/react
Content:             @astrojs/mdx, Astro Content Collections
Code highlighting:   shiki (built into Astro)
Math:                katex, remark-math, rehype-katex
Animation:           gsap (ScrollTrigger only -- lighter than full GSAP)
Tooltips:            @floating-ui/dom (for citation hovers)
PDF viewer:          <iframe> embed (lightest option) or react-pdf
RSS:                 @astrojs/rss
Sitemap:             @astrojs/sitemap
Fonts:               @fontsource/crimson-pro, @fontsource/jetbrains-mono, @fontsource/inter
Icons:               lucide-react or astro-icon
Clipboard:           navigator.clipboard API (native, no library needed)
```

### CSS Architecture: The Margin Layout

The core layout challenge is the three-column margin system. Implemented with CSS Grid:

```css
.paper-layout {
  display: grid;
  grid-template-columns: 
    minmax(80px, 200px)    /* left margin (section numbers) */
    minmax(320px, 680px)   /* content column */
    minmax(100px, 280px);  /* right margin (notes) */
  gap: 0 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Tablet: collapse margins */
@media (max-width: 1023px) {
  .paper-layout {
    grid-template-columns: 1fr;
    max-width: 720px;
  }
}

.margin-note {
  grid-column: 3;
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  border-left: 2px solid var(--accent-secondary);
  padding-left: 0.75rem;
}

.section-number {
  grid-column: 1;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-primary);
  position: sticky;
  top: 5rem;
}

.content {
  grid-column: 2;
}
```

---

## 8. Additional ASCII Mockups

### Mobile Home View (375px)

```
┌─────────────────────────────────────┐
│  K. Georgiou                 ☰     │
├─────────────────────────────────────┤
│                                     │
│        KOSTAS GEORGIOU              │
│                                     │
│     PhD · ML Engineer               │
│     Applied Scientist               │
│                                     │
│   Amazon · UTK                      │
│                                     │
│   kg@gkos.dev · github/drkostas     │
│                                     │
│          ─────────────              │
│                                     │
│           Abstract                  │
│                                     │
│  Applied Scientist at Amazon        │
│  with 8+ years of experience in     │
│  ML, computer vision, and self-     │
│  supervised learning. PhD from      │
│  UTK with 8 publications and        │
│  100+ citations.                    │
│                                     │
│  [Download CV]  [Publications]      │
│                                     │
│          ─────────────              │
│                                     │
│  1. Introduction                    │
│                                     │
│  ┌───────┐ ┌───────┐               │
│  │  8+   │ │ 100+  │               │
│  │Papers │ │ Cites │               │
│  └───────┘ └───────┘               │
│  ┌───────┐ ┌───────┐               │
│  │  6+   │ │Amazon │               │
│  │Prodcts│ │App Sci│               │
│  └───────┘ └───────┘               │
│                                     │
│          ─────────────              │
│                                     │
│  2. Related Work                    │
│                                     │
│  2.1 Amazon — Applied Scientist     │
│      2024–Present                   │
│                                     │
│  ┌─ Note ────────────────────┐     │
│  │ Production ML at scale    │     │
│  └───────────────────────────┘     │
│                                     │
│  Production ML systems at scale.    │
│  Building applied science           │
│  solutions for [domain].            │
│                                     │
│  2.2 UTK — PhD Researcher           │
│      2019–2025                      │
│                                     │
│  ┌─ Note ────────────────────┐     │
│  │ NeurIPS, WACV, IGARSS    │     │
│  │ 8 papers, 100+ cites     │     │
│  └───────────────────────────┘     │
│                                     │
│  Self-supervised learning for       │
│  computer vision. Cross-Scale       │
│  MAE [8], MEDiC [2], mCL-LC [9].   │
│                                     │
├─────────────────────────────────────┤
│  GitHub · LinkedIn · Scholar        │
│            gkos.dev                 │
└─────────────────────────────────────┘
```

### Publications Page Mobile (375px)

```
┌─────────────────────────────────────┐
│  K. Georgiou                 ☰     │
├─────────────────────────────────────┤
│                                     │
│  4. Experiments (Publications)      │
│     100+ total citations            │
│                                     │
│  ┌─ Sort ──┐  ┌─ Filter ──┐        │
│  │ By Year │  │   All     │        │
│  └─────────┘  └───────────┘        │
│                                     │
│  ─────────────────────────────      │
│                                     │
│  4.1 Cross-Scale MAE: A Tale       │
│      of Multiscale Exploitation     │
│      in Remote Sensing              │
│                                     │
│  ┌ NeurIPS 2023 ┐   54 cites       │
│  └───────────────┘                  │
│                                     │
│  Remote sensing images present      │
│  unique challenges to image         │
│  analysis due to...  [expand ↓]     │
│                                     │
│  [PDF] [Code] [Scholar] [BibTeX]    │
│                                     │
│  ─────────────────────────────      │
│                                     │
│  4.2 Semantic segmentation in       │
│      aerial imagery using           │
│      multi-level contrastive        │
│      learning with local            │
│      consistency                    │
│                                     │
│  ┌ WACV 2023 ┐      31 cites       │
│  └────────────┘                     │
│                                     │
│  Semantic segmentation in large-    │
│  scale aerial images is an          │
│  extremely...       [expand ↓]      │
│                                     │
│  [PDF] [Scholar] [BibTeX]           │
│                                     │
│  ─────────────────────────────      │
│                                     │
│  4.3 Occasionally Secure: A        │
│      Comparative Analysis of        │
│      Code Gen. Assistants           │
│                                     │
│  ┌ arXiv 2024 ┐     14 cites       │
│  └─────────────┘                    │
│                                     │
│  [PDF] [Scholar] [BibTeX]           │
│                                     │
├─────────────────────────────────────┤
│  GitHub · LinkedIn · Scholar        │
│            gkos.dev                 │
└─────────────────────────────────────┘
```

---

## 9. Pros and Cons

### Pros

1. **Perfect audience fit:** The target audience (hiring managers for ML roles, senior MLEs, research scientists) reads papers constantly. This design speaks their language natively. The paper format is the most familiar and authoritative information structure in academia and ML research.

2. **Minimal JavaScript required:** Unlike concepts that rely on Three.js or heavy animation, this design is primarily CSS and typography. The margin layout, section numbering, and horizontal rules are all achievable with CSS Grid and zero JS. The interactive elements (citation hovers, BibTeX copy) are small, scoped islands. This means exceptional performance and SEO.

3. **Content-first design:** The narrow content column with wide margins forces focus on the actual text. There is no visual noise competing with the message. Recruiters read the abstract and are done. Technical reviewers can dig into any section at their own pace.

4. **Unique without being gimmicky:** No other developer portfolio uses the research paper format. The design is distinctive and memorable but in a sophisticated way that communicates academic credibility rather than flashy showmanship.

5. **Margin notes are a superpower:** The margin annotation system lets you add rich context (metrics, tech stacks, badges) without cluttering the main text. This is the editorial equivalent of having a clean resume with detailed footnotes -- the reader chooses their depth.

6. **Natural content hierarchy:** Section numbering (1., 1.1., 2., etc.) provides built-in hierarchy at zero design cost. Visitors instantly understand the structure and can navigate by number. This scales beautifully as content grows.

7. **Blog integration is seamless:** A blog fits perfectly into this metaphor -- it is "supplementary material." The same typography, margins, and citation system apply. Blog posts feel like natural extensions of the portfolio rather than bolted-on additions.

8. **Citation cross-referencing:** The ability to link between projects and publications via [N] citations creates a cohesive narrative. "MEDiC [2]" in the experience section links directly to the publication entry, showing how everything connects.

### Cons

1. **Serif typography risk:** Serif fonts on dark backgrounds can be harder to read than sans-serif, especially at small sizes. Crimson Pro needs careful weight and size tuning. If the type rendering looks muddy on Windows or non-Retina displays, the entire aesthetic suffers.

2. **Wide margins waste space on laptops:** The three-column layout works beautifully on 1440px+ displays but can feel cramped or wasteful on 1366px laptops (still very common). The margin collapse breakpoints need careful attention to avoid a "too narrow content" feeling on mid-size screens.

3. **Perceived stuffiness:** Some visitors (especially those outside academia) might find the paper format pretentious or overly academic. The "Experiments" label for publications and "Methods" for projects could feel like it is taking the metaphor too far. Needs careful tone balancing.

4. **Limited visual richness:** There are no hero images, no 3D graphics, no dramatic animations. The design is intentionally typographic. This means the "screenshot on social media" factor is lower -- it may not look as impressive in a Twitter preview compared to a portfolio with a stunning Three.js hero. The OG image must be exceptionally well-designed to compensate.

5. **Complex responsive behavior:** The three-column margin layout is not trivially responsive. Margin notes need to gracefully transform into inline callouts on smaller screens without losing their connection to the annotated text. This requires careful CSS and potentially JS for positioning.

6. **Content-heavy -- needs good writing:** This design puts text front and center. If the prose is mediocre, there is nothing to hide behind. The abstract, section introductions, and project descriptions must be well-written and concise. This design rewards editorial effort.

7. **Metaphor mapping is not always clean:** Some pages map well (Publications = Experiments), but others are a stretch (Contact = References). The blog as "Supplementary Material" is clever but might confuse visitors expecting a standard blog. The metaphor should be present but not enforced in the navigation labels -- use "Publications" not "Experiments" in the nav.

---

## 10. Effort Estimate

### Total: 4-6 weeks (part-time) / 2-3 weeks (full-time)

| Phase | Task | Effort | Notes |
|-------|------|--------|-------|
| **1. Foundation** | Astro setup, CSS Grid margin layout, global styles, fonts | 2-3 days | The margin layout CSS is the core challenge |
| **2. Typography** | Crimson Pro + JetBrains Mono integration, type scale, dark-mode serif tuning | 1-2 days | Must test on Windows, non-Retina |
| **3. Navigation** | Top nav bar, section links, mobile hamburger | 1-2 days | Straightforward |
| **4. Home Page** | Title block, abstract, introduction, related work sections, margin notes | 2-3 days | Content-heavy, needs good copy |
| **5. Margin Notes System** | Scroll-triggered margin notes, mobile fallback callouts, GSAP | 2-3 days | Core design system component |
| **6. Citation System** | Citation bracket component, hover tooltips, citation map, floating-ui | 2-3 days | Complex interactive component |
| **7. Projects Page** | Method entries with figures, margin stacks, compact list | 2 days | Content migration from JSON |
| **8. Papers Page** | Publication entries, venue badges, abstract collapse, BibTeX copy | 2 days | |
| **9. Blog Infrastructure** | Content Collections, MDX pipeline, Shiki, KaTeX, RSS | 3-4 days | Same as any Astro blog |
| **10. Blog Post Template** | TOC, margin notes in posts, cite-this-post block, code blocks | 2-3 days | Extends margin note system |
| **11. Resume + Contact** | Appendix page, reference-style contact list | 1 day | Simple pages |
| **12. Mobile Responsive** | Margin collapse, callout boxes, mobile nav, touch-friendly citations | 2-3 days | |
| **13. Polish** | Hover states, transitions, page-turn animation, a11y, Lighthouse | 2 days | |
| **14. Content** | Migrate all projects/papers, write abstracts, first blog post | 2-3 days | |
| **15. Deployment** | Vercel config, OG images, sitemap, analytics | 1 day | |

### Complexity Comparison

This concept is **less technically complex** than Concept 04 (no Three.js) but **more editorially demanding** (every section needs well-crafted prose). The CSS margin layout is the hardest technical piece, but it is pure CSS -- no external libraries required beyond floating-ui for tooltips.

### Risk Items

- **Serif font rendering on Windows/non-Retina:** This must be tested early. If Crimson Pro looks bad, fall back to a different serif (Source Serif 4, Libre Baskerville) or switch to sans-serif body with serif headings.
- **Margin note positioning:** On resize, margin notes can collide or overflow. Needs careful `position: sticky` and overflow handling.
- **Content writing:** The abstract, section introductions, and project descriptions need to be professional and concise. Budget time for copywriting, not just code.

### MVP (Shippable in 2-3 weeks)

Ship without:
- Citation hover previews (just make [N] links to the papers page)
- Page-turn animation
- Blog (add in v2)
- BibTeX copy feature

This reduces effort to approximately 2-3 weeks part-time while preserving the paper aesthetic, margin notes, and section numbering.
