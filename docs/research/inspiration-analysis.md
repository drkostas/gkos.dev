# Inspiration Analysis — Sites You Liked

Open each URL in your browser while reading the analysis.

## Source Code Summary

| # | Site | Open Source? | Stars | Framework | Repo |
|---|------|-------------|-------|-----------|------|
| 1 | cassie.codes | No | -- | Custom HTML/CSS/JS, GSAP | -- |
| 2 | aristidebenoist.com | No | -- | Custom JS/PHP, WebGL (zero frameworks) | -- |
| 3 | corentinbernadou.com | No | -- | Custom JS, WebGL, Three.js, GSAP | -- |
| 4 | joshwcomeau.com | No (intentionally) | -- | Next.js 14, MDX, React | -- |
| 5 | shikun.io (Clarity) | **Yes** | 202 | CSS/SCSS, HTML (static) | github.com/lorenmt/clarity-template |
| 6 | rush-nlp.com | **Yes** | 8 | Jekyll, JavaScript | github.com/harvardnlp/rush-nlp |
| 7 | johnjoubert.com | No | -- | Unknown (likely JS framework) | -- |
| 8 | lankinen.xyz | No | -- | Next.js | -- |
| 9 | marcelanowak.com | No | -- | CMS-based (WordPress) | -- |
| 10 | braydoncoyer.dev | **Yes** | 782 | Next.js 15, TypeScript, Tailwind, Supabase | github.com/braydoncoyer/braydoncoyer.dev |
| 11 | jesse-zhou.com | **Yes** | 950 | JavaScript, Three.js, GLSL, GSAP | github.com/enderh3art/Ramen-Shop |

4/11 are open source. Creative dev portfolios tend to be closed source. Josh Comeau wrote a blog post explaining why he intentionally keeps his closed source (people cloned it and passed it off as their own).

---

## 1. Cassie Evans — cassie.codes
**What you liked:** Lamp animation changes with dark mode, animations shift with theme

**Analysis:**
- The lamp SVG in the header is interactive — click it to toggle dark/light mode
- In dark mode, the lamp "turns on" with a glow effect. In light mode, it's off
- Background illustrations, colors, and even SVG animations change with the theme — it's not just a CSS variable swap
- The tech is pure SVG + GSAP — no heavy 3D framework needed
- Sections: home (about), writing, speaking, making (projects)
- Navigation: simple top nav, 4 links. No chrome, no clutter

**What to borrow:**
- Theme toggle that changes more than just colors — animations, illustrations, mood
- SVG micro-interactions as personality (not decoration)
- Simple flat nav — proves you don't need sidebar/tabs

**Adaptation for ML portfolio:**
- A theme toggle could switch between "research mode" (academic, paper-focused) and "engineering mode" (projects, demos) — changing the content emphasis, not just colors
- Or simpler: dark mode toggle with animated element (like a neural network that "activates" in dark mode)

---

## 2. Aristide Benoist — aristidebenoist.com
**What you liked:** Fluid horizontal scroll animations on project cards

**Analysis:**
- Homepage is a horizontal scroll gallery of project thumbnails
- Each thumbnail scales/reveals on scroll with smooth GSAP transitions
- Typography: Schnyder (serif) + Founders Grotesk (sans-serif) — editorial feel
- WebGL-powered page transitions between home and project pages
- Very restrained color palette — mostly B&W with accent through project imagery
- Navigation: minimal top bar (name left, links right)

**What to borrow:**
- Horizontal scroll for featured projects section
- Smooth scale-on-reveal for project cards
- Typography pairing: serif for headings, grotesk for body
- Let project imagery provide all the color

**Adaptation for ML portfolio:**
- Featured ML projects (FleetSmart, MEDiC, etc.) as horizontal scroll cards
- Each card reveals with a smooth scale animation as you scroll
- Click → dedicated project page with details, architecture, results

---

## 3. Corentin Bernadou — corentinbernadou.com
**What you liked:** 3D cube animation, interactive list on the right

**Analysis:**
- Hero section has a 3D cube/geometric animation that reacts to mouse movement
- Right side has a project list — hovering each item changes the 3D scene
- Dark theme throughout, very immersive
- WebGL + GSAP for all interactions
- Awwwards SOTD + Developer Award (March 2026)
- Smooth page transitions using custom WebGL effects

**What to borrow:**
- Interactive hero element that responds to user input (mouse/scroll)
- Project list where hovering changes a visual element (doesn't need to be 3D — could be an image/diagram that morphs)
- Dark, immersive aesthetic with a single interactive focal point

**Adaptation for ML portfolio:**
- Hero could be an interactive data visualization or neural network diagram that reacts to mouse
- Right side: project list where hovering shows project preview/thumbnail
- Doesn't need full WebGL — Three.js or even CSS transforms could achieve the hover-interaction pattern

---

## 4. Josh Comeau — joshwcomeau.com
**What you liked:** Overall look and feel

**Analysis:**
- Light theme with warm personality
- Blog-forward — the homepage IS the blog (latest posts)
- Uses next-mdx-remote for blog posts with interactive React components embedded in articles
- "Joy of React" course branding integrated
- Navigation: clean top bar with name/logo + links (Latest, Tutorials, CSS, React, etc.)
- Subtle spring animations on interactive elements (toggle switches, code examples)
- Code blocks have custom syntax highlighting with tabs, copy buttons, and live previews
- Color palette: warm, slightly off-white background, purple/blue accents

**What to borrow:**
- Blog-forward homepage — latest posts prominently featured
- Interactive code blocks with syntax highlighting (fits Shiki perfectly in Astro)
- Warm, personality-driven design that still feels professional
- Spring animations on interactive elements (Framer Motion or GSAP)

**Adaptation for ML portfolio:**
- Home page could feature latest blog posts + featured projects
- Blog posts with embedded interactive code examples, HF demos, and Plotly charts
- Warm dark theme (not cold/harsh dark) with personality in the details

---

## 5. Shikun Liu — shikun.io/projects/clarity
**What you liked:** Visualizations and elements in the Clarity template

**Analysis:**
- Clarity is an open-source template specifically for AI research presentation
- Dark mode, minimalist, rich media containers for research visualizations
- Fonts: Poppins (sans-serif) + Charter (serif) + Fira Code (monospace)
- Modular: each project gets a dedicated rich page with video embeds, animated 3D viz, diagrams
- Designed by studying: David Ha, Chris Olah (Distill), Lilian Weng, Karpathy
- Sections: project title, abstract, key visuals, methods, results

**What to borrow:**
- The rich project page format — each ML project gets a magazine-quality dedicated page
- Mix of video, animated visualization, and diagrams within project pages
- Typography system: sans-serif + serif + mono, each with a clear role
- The minimal-but-rich aesthetic — dark, clean, but content areas are visually rich

**Adaptation for ML portfolio:**
- Each flagship project (FleetSmart, MEDiC, MaskDistill) gets a Clarity-style dedicated page
- Include: problem statement, architecture diagram, key results, embedded demo
- Use the Poppins/Charter/Fira Code font stack (or similar)

---

## 6. Alexander Rush — rush-nlp.com
**What you liked:** Minimal and compact, but too simple

**Analysis:**
- Single page: photo, name, role, links (Papers, GitHub, Twitter, Blog)
- Publication list below
- No navigation, no sections, no chrome
- Just the essentials: who you are + what you've published

**What to borrow:**
- The "essentials only" philosophy for the home page
- A recruiter sees name, title, and clear CTAs within 2 seconds
- Publication list format with venue badges

**Adaptation for ML portfolio:**
- Home page hero section should be THIS focused: name, title, 2-sentence pitch, 3-4 clear CTAs (Resume, Projects, Blog, Contact)
- Then expand into richer content below the fold or on dedicated pages

---

## 7. John Joubert — johnjoubert.com
**What you liked:** Focused homepage with only relevant info, then links to deeper pages

**Analysis:**
- Clean, focused landing page: name, title, brief description
- Clear navigation to deeper sections (Work, About, Contact)
- The home page acts as a "routing hub" — doesn't try to show everything
- Each linked page has its own richer, more detailed layout

**What to borrow:**
- The "hub and spoke" pattern: focused home → rich sub-pages
- Home page is the recruiter page (30 seconds)
- Sub-pages are the deep-dive pages (hiring managers, peers)

**Adaptation for ML portfolio:**
- **Home:** Name + title + 2 sentences + skill tags + 4 big CTAs (Projects, Papers, Blog, Resume)
- **Projects page:** Rich cards with tiers (featured/standard/compact)
- **Blog page:** Full blog experience with MDX
- **Papers page:** Academic publications with venue/citation info
- The home page loads instantly and answers "who is this person?" in 3 seconds

---

## 8. Elias Lankinen — lankinen.xyz/elias
**What you liked:** The idea/concept (probably not the final product)

**Analysis:**
- Terminal/CLI inspired interface
- Interactive command-line style navigation
- Typing effect, command history
- Developer-focused concept: your portfolio as a CLI

**What to borrow:**
- The concept of a dev-themed interactive element (not the whole site)
- Could be a fun Easter egg: a terminal command on the site that lets tech peers explore content via CLI
- Or: the typing animation in the hero section

**Adaptation for ML portfolio:**
- An optional "terminal mode" Easter egg (hidden `/terminal` page or keyboard shortcut)
- Or: a typing animation in the hero that cycles through your roles ("ML Engineer", "Applied Scientist", "Researcher", "Builder")

---

## 9. Marcela Nowak — marcelanowak.com
**What you liked:** Tabs, sidebar, image layout

**Analysis:**
- Clean layout with tab-based navigation for different content sections
- Sidebar with profile info/links
- Nice image placement integrated with content
- Professional, portfolio-meets-resume feel

**What to borrow:**
- Tab-based content switching (within a page, not separate pages)
- Sidebar with key info (photo, name, role, links) that stays visible
- Image + text layouts that don't feel like a blog or a resume, but a hybrid

**Adaptation for ML portfolio:**
- Home page with a persistent sidebar (photo, name, links) and tabbed main content (About / Experience / Skills)
- Or: project page with tabs for different categories (Products / Research / Open Source)

---

## 10. Braydon Coyer — braydoncoyer.dev
**What you liked:** Interactive blog page with timeline that follows scroll

**Analysis:**
- Blog page has a vertical timeline that tracks your scroll position
- Posts are organized chronologically with the timeline as a visual anchor
- Clean cards for each blog post with tags, date, reading time
- Uses Notion API as CMS (content managed in Notion, displayed on site)
- Dark theme, clean typography

**What to borrow:**
- Scroll-tracking timeline for blog posts or experience section
- Blog post cards with metadata (tags, date, reading time)
- The timeline-as-navigation pattern — click a point on the timeline to jump to that post/period

**Adaptation for ML portfolio:**
- Blog page with a scroll-tracking timeline showing post dates
- Or: experience section with a timeline that highlights as you scroll through career milestones
- Could also work for a "research timeline" showing papers chronologically

---

## 11. Jesse Zhou — jesse-zhou.com
**What you liked:** Love the 3D concept, but concerned about mobile + recruiter time

**Analysis:**
- Full 3D ramen restaurant built in Three.js + Blender
- Navigate between floors to find projects on vending machines and TVs
- Extremely creative and memorable
- Mobile: works but the 3D navigation is less intuitive on touch
- Recruiter problem: no quick way to find resume/contact without exploring the 3D world

**What to borrow:**
- The CONCEPT of themed interactive exploration (not necessarily 3D)
- A single interactive hero element that draws people in, then clear navigation below
- The idea that the site itself demonstrates your technical ability

**Adaptation for ML portfolio:**
- **Don't make the whole site 3D** — make the hero a small interactive element (animated neural network, data flow visualization, interactive chart)
- Below the hero: clean, fast, scannable content for recruiters
- The interactive element proves technical skill without blocking access to content
- Think: 20% interactive wow factor, 80% clean professional content

---

## Synthesis: Your Design DNA

From these 11 sites, here's the design language emerging:

**Layout:** Hub-and-spoke (focused home → rich sub-pages). Not single-page scroll.

**Theme:** Dark, but warm — not harsh. Purple/violet accent.

**Navigation:** Simple top nav or minimal sidebar. One layer, not four.

**Hero:** Interactive element (not full 3D) — animated viz, theme toggle with animation, or hover-reactive graphic. Proves technical skill immediately.

**Typography:** Sans-serif body (Poppins/Inter), serif or mono for headings (developer identity), mono only for code blocks.

**Projects:** Horizontal scroll for featured, or hover-interactive list (Corentin pattern). Tiered hierarchy.

**Blog:** Timeline-based navigation, interactive code blocks, embedded HF demos.

**Key interaction patterns:**
1. Theme toggle that changes more than colors (Cassie Evans)
2. Horizontal scroll gallery for projects (Aristide Benoist)
3. Hover-to-preview on project lists (Corentin Bernadou)
4. Scroll-tracking timeline for blog/experience (Braydon Coyer)
5. Rich project pages with embedded visualizations (Shikun Liu / Clarity)

**The recruiter-first principle (from Rush-NLP + Joubert):**
- Home page answers "who is this?" in 3 seconds
- Name, title, pitch, CTAs — above the fold
- Interactive hero BELOW the essential info, not replacing it
- Deep content on dedicated pages, not buried in the home page
