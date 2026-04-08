# Implementation Phases — Portfolio Redesign

**Date:** 2026-04-08  
**Total phases:** 7 major phases, each with sub-steps

---

## Phase 1: Study Braydon's Site (Original Code)

**Goal:** Run braydoncoyer.dev locally, inspect every page, understand every component, document everything.

### Steps
1.1. Set up the Braydon codebase locally (install deps, configure env vars with dummy values where needed)  
1.2. Run the dev server  
1.3. Inspect every page in Playwright — take full-page screenshots at both desktop and mobile viewpoints  
1.4. Document every visual element: layout grids, spacing, colors, fonts, shadows, borders, animations  
1.5. Map each visual element to its source code file and component  
1.6. Identify which components are reusable vs page-specific  
1.7. Document the styling system: Tailwind config, global CSS, design tokens  
1.8. Document the content pipeline: Velite config, MDX processing, data fetching  
1.9. Create a component inventory spreadsheet: component name → what it does → which pages use it → keep/modify/drop  

**Deliverable:** Updated CLAUDE.md in `.references/braydoncoyer.dev/` with visual-to-code mapping for every element on every page.

**Estimated effort:** 1-2 sessions

---

## Phase 2: Recreate in Astro (Pixel-Perfect Clone)

**Goal:** Rebuild braydoncoyer.dev in Astro. Must be visually identical — same layout, same elements, same animations, same responsiveness. No changes to design yet.

### Steps
2.1. Create new repo (`portfolio-v2`), scaffold Astro + Tailwind  
2.2. Set up project structure (layouts, components, pages, styles, content)  
2.3. Port the root layout: 3-column grid (hatched sidebars + content), navbar, footer  
2.4. Port global styles: fonts (Geist), colors, design tokens (drama-shadow, hatched pattern), GridWrapper lines  
2.5. Port the Navbar component (desktop pill nav + mobile hamburger)  
2.6. Port the Footer component (3-column links + social pill + hatched border)  
2.7. Port the Home page: hero, photo gallery, about bento grid, featured blog cards, site features section, newsletter  
2.8. Port the About page: narrative timeline, resume/work history, bento grid  
2.9. Port the Blog page: featured cards, category filter, post list  
2.10. Port the Blog Post page: hero image, metadata, MDX content, TOC sidebar, reactions (simplified), related posts  
2.11. Port the Projects page (simplified — just the layout/cards, not Braydon's specific content)  
2.12. Port remaining pages: Speaking, Toolbox, Changelog (structure only)  
2.13. Implement dark/light theme toggle with `prefers-color-scheme` auto-detection  
2.14. Set up MDX + Content Collections with sample posts  
2.15. Set up Shiki code highlighting  
2.16. Mobile responsiveness pass — verify every page at 375px, 768px, 1024px, 1440px  

### Cross-Comparison Process
For each page:  
- Screenshot Braydon's original (live site) at each viewport  
- Screenshot our Astro version at same viewport  
- Side-by-side diff — fix any discrepancies  
- Must match: spacing, colors, shadows, borders, font sizes, animations, hover states  

**Deliverable:** A running Astro site that is visually identical to braydoncoyer.dev. Verified via side-by-side Playwright screenshots.

**Estimated effort:** 5-8 sessions

---

## Phase 3: Adapt for ML Engineer Profile

**Goal:** Discuss and decide what changes are needed to transform a frontend dev portfolio into an ML engineer portfolio. This is a DESIGN phase — discussion, not code.

### Discussion Topics
3.1. **Pages to keep, modify, or drop:**
  - Home — what sections? Hero structure? Featured content?
  - Projects — tiered hierarchy (Featured/Standard/Compact)? How to present ML projects vs web projects?
  - Papers/Publications — separate page or section within projects? Citation display, venue badges, Code/Demo links
  - Blog — same structure works? Category system for ML (tutorials, research, career, tools)?
  - Resume — embedded PDF or custom HTML? Or both?
  - Contact — simplified from Braydon's version?
  - About — narrative timeline? Or more concise?
  - Settings/Toolbox/Speaking/Changelog — keep any of these?

3.2. **New sections needed:**
  - HuggingFace model demos (embedded Spaces)
  - Publication metrics (citation counts, h-index)
  - GitHub contribution graph
  - Skills/tech stack visualization
  - Conference talks (if applicable)

3.3. **Content hierarchy:**
  - What does a recruiter see first? (3-second test)
  - What does a hiring manager dig into? (30-second test)
  - What does a technical peer explore? (5-minute test)

3.4. **Navigation structure:**
  - How many pages?
  - Top nav labels?
  - Mobile nav?

3.5. **Blog features specific to ML:**
  - LaTeX/math rendering (KaTeX)
  - Interactive code blocks (Sandpack or similar)
  - HuggingFace Space embeds
  - Jupyter notebook rendering
  - Figure numbering and captions
  - Citation/reference support
  - Table of contents

3.6. **Design adaptations:**
  - Typography choices (serif for headings? mono for code only?)
  - Color palette (keep Braydon's purple? Your current purple? Something new?)
  - Imagery (your photo, project screenshots, architecture diagrams)

**Deliverable:** Updated design doc with final decisions on every page, section, and element. Wireframes/ASCII mockups for each page.

**Estimated effort:** 2-3 sessions of discussion

---

## Phase 4: Build Each Page

**Goal:** Implement the adapted design from Phase 3. Build each page with real layout and placeholder content.

### Steps
4.1. Build the adapted Home page  
4.2. Build the Projects page with tiered hierarchy  
4.3. Build the Papers/Publications page  
4.4. Build the Blog index page  
4.5. Build the Blog Post template (MDX rendering, TOC, code highlighting, LaTeX)  
4.6. Build the Resume page  
4.7. Build the Contact page  
4.8. Build any additional pages decided in Phase 3  
4.9. Implement all interactive elements (hover effects, animations, scroll behaviors)  
4.10. Full responsive pass (mobile, tablet, desktop)  
4.11. Accessibility audit (keyboard nav, screen reader, contrast ratios)  
4.12. Cross-compare with design mockups from Phase 3  

**Deliverable:** Complete portfolio with adapted design, all pages built, placeholder content, fully responsive.

**Estimated effort:** 5-8 sessions

---

## Phase 5: Transfer Real Content

**Goal:** Replace placeholder content with actual data — projects, papers, experience, blog posts, images.

### Steps
5.1. Migrate project data from old repo JSON files → Astro Content Collections or data files  
5.2. Migrate paper/publication data  
5.3. Migrate experience/resume data  
5.4. Migrate contact information and social links  
5.5. Upload project screenshots (or re-take with Playwright)  
5.6. Add your professional photo  
5.7. Write first 1-2 blog posts (needed for credibility at launch)  
5.8. Set up RSS feed  
5.9. Set up dynamic sitemap  
5.10. OG image generation for social sharing  
5.11. Verify all external links work (GitHub repos, live demos, HuggingFace, arXiv)  
5.12. Full content review — proofread everything  

**Deliverable:** The complete professional portfolio with all real content. Blog has 1-2 launch posts. All links verified.

**Estimated effort:** 2-3 sessions

---

## Phase 6: Pokemon Explore Mode

**Goal:** Build the playable Pokemon world as a separate game layer on top of the professional portfolio.

### Sub-phases

#### 6A: World Design
6A.1. Decide the map layout (buildings, paths, routes, decorations)  
6A.2. Decide the tileset (use real GBA assets or create custom)  
6A.3. Design building interiors for each page/section  
6A.4. Define the NPC mapping: Pokemon = projects, townspeople = blog posts, professors = papers  
6A.5. Design the Pokedex entry format  
6A.6. Design the Trainer Card format  
6A.7. Design the Start Menu mapping  
6A.8. Plan sprite requirements (player character, Pokemon per project, NPC types)  
6A.9. Plan dialog scripts for each NPC interaction  
6A.10. Plan the auto-generation rules (new project → new Pokemon)  

**Deliverable:** Complete world design doc with maps, NPC mappings, dialog scripts, sprite list.

#### 6B: Sprite & Asset Creation
6B.1. Source/create the tileset (GBA-compatible pixel art)  
6B.2. Create or commission player character sprite (4-direction walk animation)  
6B.3. Create or source project Pokemon sprites  
6B.4. Create NPC sprites (blog NPCs, professor NPCs)  
6B.5. Create building exterior/interior tile layouts  
6B.6. Create UI elements (dialog boxes, menu frames, Pokedex frame, Trainer Card frame)  
6B.7. Source sound effects (optional)  

**Deliverable:** Complete asset pack ready for integration.

#### 6C: Game Implementation
6C.1. Set up Phaser 3 as Astro client island (loaded on demand)  
6C.2. Implement tilemap rendering  
6C.3. Implement character movement (WASD + arrow keys)  
6C.4. Implement collision detection  
6C.5. Implement NPC interaction system (walk near → "!" → press Enter → dialog)  
6C.6. Implement dialog system (text reveal, choices, link actions)  
6C.7. Implement Start Menu  
6C.8. Implement building enter/exit transitions  
6C.9. Implement Pokedex browser  
6C.10. Implement Trainer Card  
6C.11. Implement auto-generation (read project data → spawn Pokemon)  
6C.12. Implement mobile virtual D-pad  
6C.13. Implement mode toggle (🎮 button to switch between Normal/Explore)  
6C.14. Performance optimization (sprite atlases, lazy loading, memory management)  

**Deliverable:** Fully playable Pokemon explore mode integrated into the portfolio.

#### 6D: Polish & Testing
6D.1. Test all NPC interactions  
6D.2. Test all building entries/exits  
6D.3. Test mobile controls  
6D.4. Test mode switching (Normal ↔ Explore)  
6D.5. Add easter eggs  
6D.6. Performance testing (target: <3s load for explore mode)  
6D.7. Cross-browser testing  

**Deliverable:** Polished, tested, ready-to-ship explore mode.

**Estimated effort for all of Phase 6:** 15-25 sessions

---

## Phase 7: Deploy & Launch

**Goal:** Make the site live at gkos.dev and make the repo public.

### Steps
7.1. Set up Vercel project for `portfolio-v2`  
7.2. Configure environment variables on Vercel  
7.3. Deploy to preview URL — full QA pass  
7.4. Rename old repo: `drkostas/drkostas.github.io` → `drkostas/vscode-portfolio`  
7.5. Rename new repo: `drkostas/portfolio-v2` → `drkostas/drkostas.github.io`  
7.6. Update Vercel to point to new repo  
7.7. Transfer gkos.dev domain to new Vercel project  
7.8. Make repo public  
7.9. Update old repo README: "This is the original VSCode portfolio. New portfolio at gkos.dev"  
7.10. Verify gkos.dev serves new site  
7.11. Full Playwright visual verification of all pages on production  
7.12. Submit first blog post to Hacker News  
7.13. Share on LinkedIn, Twitter  
7.14. Update orchestrator to track new repo  

**Deliverable:** New portfolio live at gkos.dev. Old repo preserved as `vscode-portfolio`. New repo public. First blog post shared.

**Estimated effort:** 1-2 sessions

---

## Summary

| Phase | What | Effort (sessions) |
|-------|------|--------------------|
| 1 | Study Braydon's original code | 1-2 |
| 2 | Recreate pixel-perfect in Astro | 5-8 |
| 3 | Adapt design for ML engineer (discussion) | 2-3 |
| 4 | Build each adapted page | 5-8 |
| 5 | Transfer real content | 2-3 |
| 6 | Pokemon explore mode (design + assets + code + polish) | 15-25 |
| 7 | Deploy & launch | 1-2 |
| **Total** | | **~31-51 sessions** |

Phases 1-5 produce a complete, professional portfolio without Pokemon.  
Phase 6 adds the wow factor.  
Phase 7 ships it.

Each phase can be done in separate Claude Code sessions. The CLAUDE.md and memory files ensure context is preserved across sessions.
