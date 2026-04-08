# CLAUDE.md (Draft for portfolio-v2 repo)

## Project Overview

This is the new portfolio + blog for Kostas Georgiou (gkos.dev), built with Astro. It replaces the previous VSCode-themed Next.js portfolio.

**Live site (old, still running):** https://gkos.dev (served by Vercel from `drkostas/vscode-portfolio`)
**This repo:** `drkostas/portfolio-v2` (private until launch)
**Target URL:** https://gkos.dev (will switch Vercel to this repo when ready)

## About the Owner

- **Name:** Konstantinos (Kostas) Georgiou
- **Role:** PhD Machine Learning Engineer, Applied Scientist L5 at Amazon
- **Education:** PhD from UTK Bredesen Center (defense April 2026, graduation May 2026), advisor Dr. Hairong Qi
- **Publications:** 10 papers (NeurIPS, WACV, IGARSS, CHASE, ECCV under review), 102+ citations
- **Key projects:** FleetSmart.ai (maritime AI), ShiftMD (shift scheduling), XpensAI (expense management), MEDiC (CLIP distillation), MaskDistill-PyTorch, Soma (health dashboard)
- **GitHub:** 8,300+ followers, 59 repos, 7 PyPi packages
- **HuggingFace:** huggingface.co/drkostas
- **Target audience:** Recruiters/HR, hiring managers, senior MLEs, open-source community

## Design Concept: Pokemon Dual-Mode

**Normal mode:** Professional, clean portfolio. Dark/light theme (auto-detect preference, default light). Blog-forward. Based structurally on braydoncoyer.dev, visually inspired by joshwcomeau.com.

**Explore mode:** Playable Pokemon GBA-style world (Phaser 3). Buildings = pages, Pokemon = projects, NPCs = blog posts/papers, gym badges = skills, trainer card = resume. Toggled via 🎮 button.

**Full concept doc:** See `docs/plans/concepts/08b-pokemon-expanded.md` in the OLD repo at `~/Insync/Gdrive/Projects/drkostas.github.io/`

## Related Repos and Files

### Old Portfolio (reference, DO NOT modify without asking)
- **Location:** `~/Insync/Gdrive/Projects/drkostas.github.io/`
- **GitHub:** `drkostas/vscode-portfolio` (renamed from drkostas.github.io)
- **Data files to migrate:** `pages/api/ml-projects.json`, `pages/api/published-papers.json`, `pages/api/experience.json`, `pages/api/pypi-projects.json`, `pages/api/bots-projects.json`, `pages/api/misc-projects.json`

### Reference Codebase (Braydon Coyer)
- **Location:** `~/Insync/Gdrive/Projects/drkostas.github.io/.references/braydoncoyer.dev/`
- **Analysis:** Full CLAUDE.md in that directory with 60+ components analyzed, styling system, blog implementation details
- **Key patterns to reuse:** Bento grid, GridWrapper lines, drama-shadow, hatched borders, scroll-tracked TOC, code blocks with macOS chrome

### Design Documents
All in the old repo at `~/Insync/Gdrive/Projects/drkostas.github.io/docs/`:
- `plans/2026-04-06-portfolio-redesign.md` — master design doc with all decisions
- `plans/concepts/08b-pokemon-expanded.md` — the chosen concept (Pokemon dual-mode)
- `plans/concepts/01-09*.md` — all 9 concepts considered (for reference)
- `research/portfolio-inspiration.md` — 170+ portfolios researched
- `research/inspiration-analysis.md` — 11 sites user liked with detailed analysis

## Tech Stack

- **Framework:** Astro (latest)
- **Styling:** Tailwind CSS
- **Animation:** GSAP and/or Framer Motion (for React islands)
- **Content:** Astro Content Collections (MDX) for blog and changelog
- **Code highlighting:** Shiki (built into Astro)
- **Math:** KaTeX via remark-math + rehype-katex
- **Game engine:** Phaser 3 (for Pokemon explore mode, loaded on demand)
- **Fonts:** TBD (candidates: Geist, Inter, plus a pixel font for Pokemon DNA)
- **Deployment:** Vercel (configured later, not yet)

## Development Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build locally
```

## Content Ordering Rule

When adding new papers, projects, experience entries, or packages, always add them at the **top** of the data (lowest index) so they appear first on the site.

## Implementation Order

1. ✅ Setup — this repo, Astro scaffold
2. Replicate Braydon's structure in Astro (layout, components, styling, dark+light theme)
3. Design ML engineer pages (discuss content structure)
4. Build each page (Home, Projects tiered, Papers, Blog with LaTeX, Resume, Contact)
5. Blog infrastructure (MDX, Content Collections, Shiki, KaTeX, HF embeds, TOC, RSS)
6. Pokemon normal-mode DNA (pixel accents, 🎮 toggle)
7. Pokemon explore mode (Phaser, tilemaps, sprites, NPCs, auto-generated Pokemon)

## Orchestrator Integration

This project is tracked by the cross-project orchestrator.
- **Export file:** `~/Insync/Gdrive/Projects/_orchestrator/exports/portfolio-v2.md`
- **Ack file:** `~/Insync/Gdrive/Projects/_orchestrator/exports/portfolio-v2-ack.md`
