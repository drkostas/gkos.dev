# CLAUDE.md

## Project Overview

This is the portfolio + blog for Kostas Georgiou (gkos.dev), built with Astro. It replaced the previous VSCode-themed Next.js portfolio.

**Live site:** https://gkos.dev (served by Vercel from `drkostas/drkostas.github.io`)
**Previous portfolio (archived):** `drkostas/vscode-portfolio`
**Local folder:** still `portfolio-v2/` (GitHub name and disk name don't have to match).

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

## Voice and Tone (site-wide)

For ALL site copy — blog posts, page titles, subtitles, widget descriptions, CTAs, alt text — read [`docs/written-voice.md`](docs/written-voice.md) first. It defines Kostas's written voice: hedged, modest, anti-corporate, slightly Greek-flavored, no em-dashes as separators (use `:`), no MBA/marketing jargon, first-person honest. The doc contains a 6-question quick test to run any line through before shipping. Adapted from his interview-call spoken-voice profile in `~/Insync/Gdrive/Projects/jobs/communication-profile/synthesis/spoken-voice.md`.

This applies BEFORE the blog-specific workflow below. Voice rules are universal; the blog workflow is layered on top for long-form posts.

## Writing Blog Posts

When writing, drafting, outlining, or revising any blog post for this site, apply this **three-stage workflow** in order. Do not write blog content freehand; all three stages are mandatory.

### Stage 1 — Structure (`blog-post` skill)

Invoke the project-scoped `blog-post` skill at `.claude/skills/blog-post` first. It owns: research-first workflow, five-section structure (hook → context → main content → practical application → conclusion + CTA), SEO rules, and a final quality checklist.

**Divergence note:** the skill's file convention (`blogs/<slug>/post.md` + `hero.png`) does not match this site. Posts go to `src/content/blog/<slug>.mdx`; images to `public/blog/<slug>/`; frontmatter fields: `title, publishedAt, summary, categories, imageName, draft` (see `src/content.config.ts`). Always set `publishedAt` with a time component (e.g. `2026-04-15T12:00:00`) to avoid UTC-to-local date drift.

### Stage 2 — Voice (humanizer "Personality and Soul")

Apply the `humanizer` skill's "Personality and Soul" guidance **while drafting**, not as a post-pass. Core rules:
- Have opinions. React to facts; don't neutrally list them.
- Vary rhythm. Short punchy sentences. Then longer ones.
- Acknowledge complexity. Mixed feelings are more human than clean takes.
- Use "I" when it fits. First person is honest, not unprofessional.
- Let some mess in. Tangents, asides, half-formed thoughts.
- Be specific about feelings. Not "this is concerning" but the concrete thing that bothers you.

Sterile, voiceless writing is as obvious as slop. Good writing has a human behind it.

### Stage 3 — Final edit pass (humanizer + anti-slop)

Before declaring the draft done, scan against these flags:

**Em dash overuse** — the single biggest LLM tell. Most em dashes should be commas, periods, or parentheses. Keep only the ones that genuinely earn their emphasis.

**AI vocabulary to strip**: *delve, pivotal, testament, landscape (abstract), vibrant, underscore, emphasize, foster, showcase, tapestry, interplay, intricate, enduring, Additionally, crucial (as filler)*.

**Copula avoidance** — replace *serves as, stands as, marks, represents* with a plain *is/are*.

**Negative parallelism** — *"It's not just X, it's Y"*, *"Not only... but..."* — pick one side.

**Rule-of-three overuse** — break up forced triplets that don't earn their shape.

**Promotional / real-estate-listing language**: *boasts, nestled, stunning, breathtaking, groundbreaking, must-visit, renowned, rich (figurative)*.

**Anti-slop buzzwords**: *leverage* → *use*; *synergistic* → *cooperative*; *paradigm shift* → *major change*; *seamless, intuitive, powerful* → pick the specific one.

**Filler phrases**: *in order to* → *to*; *has the ability to* → *can*; *at this point in time* → *now*; *it is important to note that* → delete.

**Collaborative / sycophantic artifacts**: kill *"I hope this helps!"*, *"Certainly!"*, *"Great question!"*, *"Let me know if..."*.

**Generic positive conclusions** — vague upbeat endings ("exciting times ahead", "a step in the right direction") → replace with one concrete fact or next step.

**Style nits**: straight quotes (`"..."`) not curly (`"..."`); sentence case in headings (not Title Case); no decorative emojis in headings or bullets; inline code (backticks) for file names, commands, and technical identifiers.

### Triggers

This workflow runs on any of: "write a blog post", "draft a post", "outline a tutorial", "technical writeup", "thought-leadership piece", "article", or any edit to files under `src/content/blog/`.

## Orchestrator Integration

This project is tracked by the cross-project orchestrator.
- **Export file:** `~/Insync/Gdrive/Projects/_orchestrator/exports/portfolio-v2.md`
- **Ack file:** `~/Insync/Gdrive/Projects/_orchestrator/exports/portfolio-v2-ack.md`
