# Portfolio Redesign + Blog Addition — Design Document

**Author:** Kostas Georgiou  
**Date:** 2026-04-06  
**Status:** Draft — awaiting decisions  
**Live site:** https://gkos.dev  
**Repo:** drkostas/drkostas.github.io

---

## 1. Context & Goals

### Current State
- Next.js 12, React 17, static export via `next export`
- VSCode-themed UI with dark color scheme
- 7 pages: Home, Projects, Papers, GitHub, Resume, Contact, Settings
- 4 redundant navigation layers (title bar, tabs, explorer, sidebar)
- Monospace font everywhere
- No blog section
- Deployed on Vercel (auto-deploys from `main`)

### Target Audience (ordered by priority)
1. **Recruiters / HR** — 30-second scan, need name/title/resume/contact
2. **Hiring Managers** — evaluating seniority, impact, breadth
3. **Senior MLEs / Technical Peers** — evaluating depth, taste, code quality
4. **Open-source community** — arriving from GitHub repos or papers

### Goals
- Reduce clutter and navigation redundancy
- Make the site instantly understandable to non-developers
- Elevate visual professionalism while keeping the developer identity
- Add a blog section for technical writing
- Improve content hierarchy (distinguish flagship projects from class exercises)
- Better mobile experience

### Non-Goals
- Change the domain (stays gkos.dev)

### Decisions Made
- **Framework: Astro** — full migration. Best fit for content portfolio + blog. Zero JS by default, islands for interactivity
- **Repo strategy: R1** — rename current repo to `drkostas/vscode-portfolio`, create new `drkostas/drkostas.github.io` for the Astro site. Preserves stars/forks on the VSCode template. Update Vercel to point to new repo
- **Concept: Pokemon dual-mode (08b)** — Normal mode (professional portfolio) + Explore mode (playable Pokemon world). See `docs/plans/concepts/08b-pokemon-expanded.md`
- **Normal mode base: Braydon Coyer** — use braydoncoyer.dev as structural starting point. Code available at `.references/braydoncoyer.dev/`. Full analysis in its CLAUDE.md
- **Visual inspiration: Josh Comeau** — blog-forward, personality-driven, interactive elements. His current stack documented but closed source. Old blog open source (github.com/joshwcomeau/blog)
- **Theme: Auto-detect user preference** — respect `prefers-color-scheme`. Default to light. Prominent dark/light toggle. Both themes must look polished
- **Pokemon DNA: Phase last** — subtle pixel-art accents added AFTER the professional portfolio is complete. 🎮 Explore mode built as final phase

### Implementation Order
1. **Setup** — new repo, Astro scaffold, Vercel deployment, domain transfer
2. **Replicate Braydon's structure in Astro** — port the layout, components, styling system (GridWrapper, bento grid, drama-shadow, hatched borders). Adapt to dark+light theme
3. **Design our pages** — extensive discussion needed. We're ML engineers, not frontend devs. Different content, different hierarchy, different audience
4. **Build each page** — Home, Projects (tiered), Papers, Blog (with LaTeX/math), Resume, Contact
5. **Blog infrastructure** — MDX + Content Collections, Shiki highlighting, KaTeX math, HF demo embeds, TOC, RSS
6. **Pokemon normal-mode DNA** — pixel font accents, 8-bit borders, Pokemon card project cards, 🎮 toggle button
7. **Pokemon explore mode** — Phaser game, tilemaps, sprites, NPCs, buildings, auto-generated Pokemon from project data

---

## 2. Framework Decision

### Option F1: Stay on Next.js 12 (Pages Router)
- **Effort:** Zero migration work
- **Blog:** Add via `next-mdx-remote` + local MDX files
- **Pros:** No risk, all current code works, fast iteration on design changes
- **Cons:** Next.js 12 is 4 years old, no security patches, `next export` removed in Next.js 14. React 17 limits future component libraries. Limited MDX ecosystem (contentlayer dead, next-mdx-remote archived)
- **Future risk:** Increasingly hard to find compatible libraries

### Option F2: Upgrade to Next.js 14+ (Pages Router compatible)
- **Effort:** Medium. Codemods for `next/image` and `next/link`. Replace `next export` with `output: 'export'`. Upgrade React 17 → 18
- **Blog:** Better MDX options (`content-collections`, modern `next-mdx-remote`)
- **Pros:** Modern ecosystem, security patches, Turbopack dev server, still Pages Router
- **Cons:** Risk of breaking existing components, need to test hydration changes (React 18), couple days of migration work
- **Note:** Can keep Pages Router — App Router migration is optional

### Option F3: Migrate to Astro
- **Effort:** High. Full rewrite of all components (React → Astro components, though React components can be used as "islands")
- **Blog:** First-class MDX + Content Collections, Shiki built-in, best-in-class static output
- **Pros:** Zero JS by default (fastest possible pages), framework-agnostic islands, modern tooling, built for content sites, growing ecosystem
- **Cons:** Full rewrite required, new build system, new deployment config, learning curve. Would need to rebuild all VSCode chrome components
- **Best for:** If doing a ground-up redesign anyway

### Option F4: Hybrid — Keep Next.js for portfolio, Astro for blog
- **Effort:** Medium. Blog is a separate Astro project at `/blog` route
- **Blog:** Full Astro Content Collections power
- **Pros:** Don't touch existing portfolio code, best blog tooling, independent deploys
- **Cons:** Two codebases, two build systems, shared styling requires coordination, slight SEO disadvantage (Vercel rewrite needed to serve both under gkos.dev)

**Recommendation:** F2 if the redesign is evolutionary (polish current site + add blog). F3 if the redesign is significant enough to justify a rewrite. F1 only if we want to ship fast and accept the tech debt.

---

## 3. Navigation & Chrome

### Current Problem
4 navigation layers showing the same 6-7 pages:
- Title bar: `File | Edit | View | Go | Run | Terminal | Help` (decorative, non-functional)
- Tab bar: `home.jsx | resume.html | contact.yml | ...` (draggable tabs)
- Explorer: tree view with same files
- Sidebar: icon-only navigation

This consumes ~200px horizontal + ~70px vertical before content starts.

### Option N1: Sidebar Only (minimal)
- **Keep:** Icon sidebar (left edge) as sole navigation
- **Remove:** Title bar, tab bar, explorer panel
- **Add:** Tooltip labels on hover ("Home", "Projects", "Blog", etc.)
- **Bottom bar:** Simplify to just social links (drop git status, errors/warnings)
- **Result:** Maximum content area, clean and minimal. The sidebar icons become the only VSCode reference
- **Risk:** Might lose too much of the VSCode identity

### Option N2: Sidebar + Slim Tab Bar
- **Keep:** Icon sidebar + tab bar (but with human-readable names: "Home", "Projects" not "home.jsx")
- **Remove:** Title bar, explorer panel
- **Tab bar change:** Tabs show page names with small file-type icons (subtle VSCode nod). Drop the drag-to-reorder — it's never used by the audience
- **Bottom bar:** Social links only
- **Result:** Two navigation layers but both are useful. The tabs provide context ("where am I?"), sidebar provides quick jumping

### Option N3: Sidebar + Minimal Title Bar
- **Keep:** Icon sidebar + title bar (but simplified — just the window dots and "Kostas Georgiou" centered)
- **Remove:** Tab bar, explorer panel
- **Title bar:** Remove fake File/Edit/View menus. Keep just the macOS window dots (red/yellow/green) and centered title — this preserves the "app window" feeling without the fake menus
- **Bottom bar:** Social links only
- **Result:** Still feels like a desktop app, but cleaner

### Option N4: Top Nav + No Sidebar (modern portfolio)
- **Remove:** All VSCode chrome (sidebar, tabs, explorer, title bar, bottom bar)
- **Add:** Clean horizontal top navigation bar with: logo/name on left, page links centered or right-aligned, social icons
- **Result:** Looks like a modern portfolio (Linear, Vercel style). Completely drops VSCode metaphor
- **Risk:** Loses the differentiator. Looks like every other dark portfolio template

**Recommendation:** N2 — keeps the VSCode identity (sidebar + tabs) but removes the redundancy (no explorer, no fake title bar). Human-readable tab names make it accessible.

---

## 4. Page Structure

### Current Pages
| Page | Purpose | Keep? |
|------|---------|-------|
| Home (`/`) | Hero + experience timeline | Yes |
| Projects (`/projects`) | All project cards | Yes, redesign |
| Papers (`/papers`) | Publication list | Decision needed |
| GitHub (`/github`) | GitHub stats + repos | Decision needed |
| Resume (`/resume`) | Embedded PDF | Yes |
| Contact (`/contact`) | Bio + links | Decision needed |
| Settings (`/settings`) | Theme picker | Decision needed |
| Blog (`/blog`) | **NEW** | Yes |

### Option P1: Keep All + Add Blog (8 pages)
- Everything stays, blog is added
- **Pros:** No content removed
- **Cons:** Still 8 pages, some redundant (contact bio = home bio, GitHub = projects overlap)

### Option P2: Consolidate to 6 pages
```
/           → Home (hero + featured projects + key publications + experience)
/projects   → All projects with tiered hierarchy
/blog       → Blog posts (NEW)
/resume     → PDF viewer (unchanged)
/contact    → Links only (drop the bio — it's on home page)
/settings   → Keep as hidden/minimal (gear icon, not a full page)
```
- **Merge GitHub into Home:** Show contribution calendar + follower count on home page as a section
- **Merge Papers into Projects:** Publications become a category within projects (they already have Code links and are essentially "research projects")
- **Simplify Contact:** Just the link cards, no bio paragraph (already on home)
- **Settings:** Dropdown/popover from gear icon instead of full page

### Option P3: Consolidate to 5 pages
```
/           → Home (hero + experience + GitHub stats)
/work       → Projects + Papers combined, with tabs/filters for category
/blog       → Blog posts (NEW)
/resume     → PDF viewer
/contact    → Minimal links
```
- Most aggressive consolidation
- "Work" page replaces both Projects and Papers with filter tabs: "Products", "Research", "Open Source", "Publications"

### Option P4: Modern single-page + blog
```
/           → Single scrolling page: hero → featured work → publications → experience → contact
/blog       → Blog section (multi-page)
/resume     → PDF viewer (linked from hero)
```
- Home page becomes a comprehensive landing page
- Blog is the only multi-page section
- Resume is accessible but not in main nav

**Recommendation:** P2 — good balance of consolidation without losing content. Papers as a separate page still has value for academic audiences. Settings becomes a gear icon popover.

---

## 5. Project Hierarchy & Presentation

### Current Problem
25+ project cards in a flat grid. FleetSmart.ai (deployed SaaS with paying users) has the same visual weight as Vanilla Numpy CNN (a learning exercise).

### Option H1: Tiered Cards (Featured / Standard / Compact)
- **Featured tier** (top 4-6): Large cards with hero image, full description, prominent Live/Demo/Code buttons. FleetSmart, ShiftMD, MEDiC, MaskDistill, XpensAI, Soma
- **Standard tier**: Current card size for mid-tier projects (Cross-Scale MAE, Minecraft AI, etc.)
- **Compact tier**: Small list items for old/minor projects (Numpy CNN, RL Value Iteration) — just name, one-line description, and link. No image
- **Result:** Visual hierarchy instantly communicates what matters

### Option H2: Category Tabs with Featured Section
- Keep category sections (ML, Bots, PyPi, Misc) but add a "Featured" tab/section at the top
- Featured section shows 4-6 best projects as large cards
- Other categories show standard cards
- **Result:** Easy to navigate by category, featured work stands out

### Option H3: Portfolio Case Studies
- Top 3-4 projects get dedicated sub-pages (`/projects/fleetsmart`) with:
  - Problem statement, architecture, tech stack, results/metrics, screenshots
  - This is what hiring managers actually want to see
- Remaining projects stay as cards on the main projects page
- **Result:** Deep showcases for flagship work, quick browse for everything else
- **Effort:** Significant — need to write case study content for each

### Option H4: Interactive Filters
- Single grid with filter buttons: "All", "Products", "Research", "Open Source", "Packages"
- Projects tagged with categories, filter on click
- Optional: sort by date, stars, or relevance
- **Result:** Clean single view, user controls what they see

**Recommendation:** H1 for immediate impact, with H3 as a future enhancement (case study pages for top projects).

---

## 6. Papers Presentation

### Option PP1: Keep Separate Page (redesigned)
- Dedicated `/papers` page with cleaner design
- Switch from monospace to sans-serif for readability
- Add visual distinction: venue tier badges (NeurIPS = gold, workshop = silver)
- Show citation count more prominently
- Add Code/Demo links where available
- **Pros:** Academics and research-focused managers expect a publications page
- **Cons:** Another page to maintain

### Option PP2: Merge into Projects as "Research" Category
- Papers appear as cards in the projects page under a "Research" tab
- Each paper card shows: title, venue, year, citations, links (PDF, Code, Demo)
- **Pros:** Fewer pages, papers contextualized alongside projects
- **Cons:** Might feel like papers are deprioritized for academic audience

### Option PP3: Publications Section on Home Page
- A compact publications list on the home page (title, venue, year, citation count)
- "View all" links to either a full page or expands in place
- **Pros:** Immediately visible to all visitors
- **Cons:** Home page gets longer

**Recommendation:** PP1 — keep the dedicated page but redesign it. Research-focused roles (your target) expect to find publications easily.

---

## 7. Typography

### Option T1: Sans-serif Body + Monospace Code Only
- **Body/headings:** Inter, Geist, or similar modern sans-serif
- **Code blocks/tags:** Keep current monospace
- **Result:** Immediately more readable and professional. Monospace reserved for where it belongs
- **Reference:** How Linear, Vercel, Stripe do it

### Option T2: Mixed — Monospace Headings + Sans-serif Body
- **Headings:** Monospace (keeps the developer identity in headers)
- **Body text:** Sans-serif for readability
- **Code/tags:** Monospace
- **Result:** Developer aesthetic in structure, readable in content

### Option T3: Keep Full Monospace (polished)
- Keep monospace everywhere but improve sizing, spacing, and line-height
- Add more whitespace between sections
- Increase font size for body text
- **Result:** Still feels like VSCode, just more spacious and readable
- **Risk:** Monospace body text is fundamentally harder to read for long content

**Recommendation:** T2 — monospace headings give the developer vibe, sans-serif body makes content scannable. Best of both worlds.

---

## 8. Blog Architecture

### Option B1: MDX in Next.js (integrated)
- `next-mdx-remote` + local `.mdx` files in `/content/blog/`
- Pages at `/blog` (index) and `/blog/[slug]` (posts)
- Remark/rehype plugins: math (KaTeX), code highlighting (Shiki), GFM, heading anchors
- Custom MDX components: `<Figure>`, `<HFDemo>`, `<Callout>`, `<PlotlyChart>`
- **Pros:** Single codebase, same styling, simple deployment
- **Cons:** next-mdx-remote is archived, Next.js 12 MDX ecosystem is aging

### Option B2: Astro Blog (subdirectory via Vercel rewrite)
- Separate Astro project for the blog
- Vercel rewrites `/blog/*` to the Astro deployment
- Content Collections for type-safe frontmatter, Shiki built-in
- Can use React components as islands for interactive elements
- **Pros:** Best-in-class blog tooling, independent deployment
- **Cons:** Two codebases, styling coordination needed, deployment complexity

### Option B3: Blog in Astro (full site migration)
- Only viable if choosing F3 (migrate entire site to Astro)
- Blog is just another Content Collection alongside projects/papers
- **Pros:** Unified tooling, best performance, modern DX
- **Cons:** Full rewrite required

### Blog Features Checklist
Regardless of framework choice, the blog needs:

| Feature | Priority | Notes |
|---------|----------|-------|
| LaTeX/math rendering | Must-have | KaTeX via remark-math + rehype-katex |
| Syntax highlighting | Must-have | Shiki (matches VSCode theme) |
| Code block line numbers | Must-have | Via CSS counters or Shiki config |
| Code block line highlighting | Nice-to-have | Highlight specific lines in examples |
| HuggingFace Space embeds | Must-have | `<HFDemo>` component with iframe |
| Table of contents | Must-have | Auto-generated from headings |
| RSS feed | Must-have | For HN, aggregators, readers |
| Reading time estimate | Nice-to-have | Calculated from word count |
| Share buttons (HN, Twitter, LinkedIn) | Nice-to-have | Social sharing |
| Tags/categories | Must-have | Filter posts by topic |
| Search | Nice-to-have | Full-text search across posts |
| Plotly/interactive charts | Nice-to-have | Dynamic import, SSR disabled |
| Jupyter notebook rendering | Nice-to-have | Pre-convert to HTML or MDX |
| Citation/footnote support | Nice-to-have | Via remark-gfm footnotes |
| Image figures with captions | Must-have | Custom `<Figure>` component |
| Dark/light code themes | Nice-to-have | Match site theme |
| Previous/next post navigation | Nice-to-have | At bottom of each post |
| Open Graph images | Must-have | For social sharing previews |

**Recommendation:** B1 if staying on Next.js (F1/F2). B3 if migrating to Astro (F3). B2 is the escape hatch if you want the best blog tooling without touching the portfolio.

---

## 9. Color & Theme

### Option C1: Keep Current Palette (Dracula-inspired)
- Dark background (`#1e1e1e`), purple accent (`#c792ea` / `#bd93f9`)
- Familiar, already branded
- **Change:** Just improve contrast ratios and add more shades for hierarchy

### Option C2: GitHub Dark Inspired
- Darker background (`#0d1117`), blue accent (`#58a6ff`), green for success states
- More professional, widely recognized as "developer" aesthetic
- **Change:** Shift from purple to blue accent

### Option C3: Custom Dark with Teal/Cyan Accent
- Dark background, teal/cyan accent (like your FleetSmart.ai site)
- More unique, less "student project" feel
- Could tie your portfolio aesthetic to your flagship product

### Option C4: Theme Switcher (simplified)
- Offer 2-3 preset themes via a toggle (not a full settings page)
- Default: refined dark. Alternatives: light mode, high contrast
- Settings page becomes a simple gear icon dropdown

**Recommendation:** C1 with refinements — the purple accent is your brand at this point. Fix contrast ratios and add subtle gradients for depth.

---

## 10. Implementation Phases

### Phase 1: Navigation Cleanup + Typography (1-2 days)
- Remove chosen chrome layers (title bar, explorer, etc.)
- Switch body text to sans-serif
- Improve spacing and whitespace
- Simplify bottom bar
- **Deployable independently — immediate improvement**

### Phase 2: Page Consolidation + Project Hierarchy (2-3 days)
- Implement project tiers (featured/standard/compact)
- Consolidate or remove pages per decisions above
- Redesign papers page
- Improve project card design
- Simplify settings (page → popover)

### Phase 3: Blog Setup (3-5 days)
- Set up MDX or Astro blog infrastructure
- Create blog index and post template
- Implement remark/rehype plugin chain (math, code, GFM)
- Build custom MDX components (Figure, HFDemo, Callout)
- Add RSS feed
- Write first post

### Phase 4: Polish (2-3 days)
- Mobile responsive improvements
- Open Graph images for social sharing
- Performance optimization (Lighthouse audit)
- Accessibility pass (WCAG AA)
- Cross-browser testing

---

## Decision Matrix

Copy this and mark your choices:

```
FRAMEWORK:        [ ] F1 (Stay Next.js 12)
                  [ ] F2 (Upgrade Next.js 14+)
                  [ ] F3 (Migrate to Astro)
                  [ ] F4 (Hybrid)

NAVIGATION:       [ ] N1 (Sidebar only)
                  [ ] N2 (Sidebar + slim tabs)
                  [ ] N3 (Sidebar + minimal title bar)
                  [ ] N4 (Modern top nav, no sidebar)

PAGES:            [ ] P1 (Keep all 7 + blog)
                  [ ] P2 (Consolidate to 6)
                  [ ] P3 (Consolidate to 5)
                  [ ] P4 (Single page + blog)

PROJECT TIERS:    [ ] H1 (Featured/Standard/Compact)
                  [ ] H2 (Category tabs + featured)
                  [ ] H3 (Case study sub-pages)
                  [ ] H4 (Interactive filters)

PAPERS:           [ ] PP1 (Separate page, redesigned)
                  [ ] PP2 (Merge into projects)
                  [ ] PP3 (Section on home page)

TYPOGRAPHY:       [ ] T1 (Sans-serif body + mono code)
                  [ ] T2 (Mono headings + sans-serif body)
                  [ ] T3 (Keep full monospace, polished)

BLOG:             [ ] B1 (MDX in Next.js)
                  [ ] B2 (Astro blog via rewrite)
                  [ ] B3 (Full Astro migration)

COLOR:            [ ] C1 (Keep purple, refine)
                  [ ] C2 (GitHub dark / blue)
                  [ ] C3 (Teal/cyan accent)
                  [ ] C4 (Theme switcher simplified)
```

---

## Open Questions

1. **Mobile:** How important is the mobile experience? Should we invest in responsive design or is this primarily a desktop site?
2. **GitHub page:** Kill it entirely, merge contribution calendar into home, or keep but redesign?
3. **Settings/themes:** Keep as a simplified toggle, or drop entirely and pick one theme?
4. **Project case studies (H3):** Worth the content writing effort now, or defer to Phase 4+?
5. **Blog first post:** What topic? Having a first post ready at launch matters for credibility.
