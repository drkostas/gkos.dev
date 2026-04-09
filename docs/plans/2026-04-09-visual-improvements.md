# Visual Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all visual weak points in the Braydon clone — elevate elements that look like placeholders to the same craft level as the best parts of the site (bento cards, newsletter, photo gallery).

**Architecture:** Each improvement is a self-contained CSS/component change. Apply one at a time, screenshot before/after, evaluate critically before moving to next. If an improvement doesn't clearly make things better, revert it.

**Tech Stack:** Tailwind CSS, Astro components, existing design tokens (colors, shadows, borders)

**Design system reference (things that work well and should be matched):**
- `drama-shadow` — `shadow-md ring-1 ring-indigo-500/15` + inner white glow
- BentoCard borders — `rounded-2xl border border-border-primary bg-bg-primary`
- BentoCard hover — gradient overlay + indigo border + link arrow animation
- GridWrapper lines — horizontal rule pseudo-elements, solid `border-primary/50`
- Hatched pattern — 45deg diagonal stripes at 5px
- Colors — `purple-primary (#6C47FF)` is THE accent. `indigo-600` is hover-only.
- Typography — Geist Sans, `tracking-tighter` on headings, `text-balance`
- `&&` in headings — developer branding element

---

### Task 1: Dark Mode

**Files:**
- Modify: `src/styles/global.css`
- Modify: `tailwind.config.mjs`
- Modify: `src/layouts/Layout.astro`
- Modify: `src/components/Navbar.astro`

**Step 1: Enable Tailwind dark mode**

In `tailwind.config.mjs`, add `darkMode: "class"` to the config.

**Step 2: Define dark color tokens**

In `global.css`, add dark mode CSS variables:
```css
.dark {
  --bg-primary: #0f0f10;
  --border-primary: #2a2a2e;
  --dark-primary: #f7f7f8;
  --text-primary: #f1f1f3;
  --text-secondary: #a0a0a8;
  --text-tertiary: #6b6b75;
}
```

**Step 3: Add theme toggle to navbar**

Small sun/moon icon button next to the SocialPill. Toggle adds/removes `dark` class on `<html>`. Persist choice in localStorage. Auto-detect `prefers-color-scheme` on first visit.

**Step 4: Add `dark:` variants to key components**

Start with Layout (bg, text), Navbar, Footer, BentoCard, GridWrapper, NewsletterSignUp. Each component gets `dark:bg-*`, `dark:text-*`, `dark:border-*` classes.

**Step 5: Screenshot, evaluate, commit**

Compare light vs dark side by side. Dark mode should feel intentional — not just "inverted". The hatched sidebar pattern, GridWrapper lines, and BentoCard borders should all have dark equivalents that look good.

**Evaluation criteria:**
- Does the dark background feel comfortable to read on?
- Do the purple accents pop MORE in dark mode? (they should)
- Are the bento card borders visible but subtle?
- Does the newsletter dark section blend awkwardly with a dark page? (need to differentiate)
- Do images/photos look natural or do they need reduced brightness?

---

### Task 2: Fix Section Labels

**Files:**
- Modify: every page that has section labels (`src/pages/index.astro`, `about.astro`, `blog.astro`, `speaking.astro`, `toolbox.astro`, `changelog.astro`)

**Step 1: Change `text-indigo-600` to `text-purple-primary`**

Every section label ("About", "Blog", "My Site", "Experience", "More", "Applications", "Hardware", "Stats", "Socials") currently uses `text-indigo-600`. Change to `text-purple-primary` to match the site's actual accent color.

**Step 2: Add uppercase tracking**

Change from `text-sm font-medium` to `text-xs font-semibold uppercase tracking-widest`. This makes them feel like intentional category labels rather than random colored text. Matches the TOC label style (`.toc-label` in global.css: `font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase`).

**Step 3: Screenshot, evaluate**

Compare before/after. The labels should now look like they belong to the same design system as the TOC sidebar labels and the navbar text.

**Evaluation criteria:**
- Do they read as "section categories" or "random colored text"?
- Does the uppercase + tracking make them feel too corporate/stiff?
- Is purple-primary visible enough at text-xs size?
- Do they still create visual rhythm with the GridWrapper lines?

---

### Task 3: Redesign Blog Post List Dividers

**Files:**
- Modify: `src/pages/blog.astro`

**Step 1: Replace dashed borders with solid GridWrapper-style lines**

Change `border-t border-dashed border-border-primary` to `border-t border-border-primary/50` (matching GridWrapper's pseudo-element style — solid, half-opacity).

**Step 2: Add subtle hover state to post items**

Add `hover:bg-white/50 transition-colors rounded-lg -mx-2 px-2` to each post row. This gives a subtle highlight on hover, matching BentoCard's `hover:bg-white` behavior.

**Step 3: Screenshot, evaluate**

**Evaluation criteria:**
- Do the solid lines feel more cohesive with GridWrapper lines above/below sections?
- Does the hover state make the list feel interactive without being distracting?
- At 50+ items, does the list still feel clean or does it feel heavy?

---

### Task 4: Redesign Blog Category Tabs

**Files:**
- Modify: `src/pages/blog.astro`

**Step 1: Replace bare text tabs with pill chips**

Change the category nav from underlined text to pill-shaped chips:
```
rounded-full border px-3 py-1 text-xs font-medium transition-colors
```
Active state: `bg-dark-primary text-white border-dark-primary`
Inactive state: `border-border-primary text-text-secondary hover:border-purple-primary hover:text-purple-primary`

This matches the navbar's pill container aesthetic.

**Step 2: Replace mobile `<select>` with horizontal scroll pills**

Instead of a native dropdown, show the same pills in a horizontally scrollable row on mobile. `overflow-x-auto whitespace-nowrap` with hidden scrollbar.

**Step 3: Screenshot, evaluate**

**Evaluation criteria:**
- Do the pills feel like they belong with the navbar pill and SocialPill?
- Is the active state clearly distinguishable?
- On mobile, does the horizontal scroll feel natural or janky?
- Does the "Categories" heading above them still make sense or is it redundant now?

---

### Task 5: Add Blog Search

**Files:**
- Create: `src/components/BlogSearch.tsx` (React island for client-side search)
- Modify: `src/pages/blog.astro`

**Step 1: Build simple client-side fuzzy search**

A search input above the category tabs. Filters the visible post list by title + summary text. No backend needed — posts are already in the page HTML.

Use a simple input with the site's styling: `rounded-full border border-border-primary bg-bg-primary px-5 py-2.5 text-sm placeholder:text-text-tertiary focus:border-purple-primary focus:ring-1 focus:ring-purple-primary/20`

**Step 2: Add search icon inside input**

Small magnifying glass SVG on the left side of the input, matching the text-tertiary color.

**Step 3: Screenshot, evaluate**

**Evaluation criteria:**
- Does the search input match the newsletter email input styling?
- Is the search fast enough with 50+ posts? (should be since it's client-side)
- Does it combine well with category filtering? (search within selected category)

---

### Task 6: Add 404 Page

**Files:**
- Create: `src/pages/404.astro`

**Step 1: Build a playful 404 page**

Use the site's design language — GridWrapper, centered heading, the `&&` branding. Large "404" in purple-primary, subtitle "This page doesn't exist... yet." with a "Go home" button matching the indigo button style.

**Step 2: Evaluate**

Does it feel like the rest of the site or like an afterthought?

---

### Task 7: Fix Navbar Active State on Sub-pages

**Files:**
- Modify: `src/components/Navbar.astro`

**Step 1: Change active link detection from exact match to startsWith**

Currently `currentPath === link.link`. Change to `currentPath === link.link || (link.link !== "/" && currentPath.startsWith(link.link))`. This makes "Blog" highlight when on `/blog/some-post`.

**Step 2: Evaluate**

Does the Blog link correctly highlight on all blog sub-pages? Does Home still only highlight on `/`?

---

### Task 8: Add Reading Progress Bar

**Files:**
- Create: `src/components/ReadingProgress.tsx`
- Modify: `src/pages/blog/[...slug].astro`

**Step 1: Build a thin progress bar at the top of blog posts**

A fixed bar at the very top of the viewport, `h-[2px] bg-purple-primary` that grows from `width: 0%` to `width: 100%` as the user scrolls through the article. Uses `useScroll` from framer-motion.

**Step 2: Evaluate**

- Is 2px thick enough to notice but subtle enough not to distract?
- Does the purple color match the accent?
- Does it interfere with the navbar?

---

### Task 9: Add Back-to-Top Button

**Files:**
- Create: `src/components/BackToTop.tsx`
- Modify: `src/layouts/Layout.astro`

**Step 1: Build a floating button that appears after scrolling down**

Bottom-right corner, `rounded-full bg-dark-primary text-white shadow-lg`, with an up-arrow icon. Fades in after 500px of scroll, smooth-scrolls to top on click. Uses framer-motion for enter/exit animation.

**Step 2: Evaluate on the changelog page**

That page is 12,000px tall — does the button genuinely help? Is it visible but not obstructive?

---

### Task 10: Add RSS Feed

**Files:**
- Create: `src/pages/rss.xml.ts`

**Step 1: Use `@astrojs/rss` to generate RSS feed**

Install `@astrojs/rss`. Create an RSS endpoint that lists all blog posts with title, summary, pubDate, and link. Add RSS `<link>` tag to Layout head. Add RSS icon to footer or navbar.

**Step 2: Evaluate**

Validate the feed XML in a feed reader. Does it include all posts correctly?

---

### Task 11: Upgrade Code Blocks to Shiki

**Files:**
- Modify: `astro.config.mjs` (Shiki is built into Astro)
- Modify: `src/styles/global.css`

**Step 1: Configure Shiki with a theme that matches the site**

Astro ships with Shiki. Configure with `shikiConfig: { theme: 'github-light' }` (for light mode) and `github-dark` for dark. Keep the macOS chrome (3 dots) from global.css but let Shiki handle syntax coloring.

**Step 2: Add copy-to-clipboard button**

Small "Copy" button on hover at the top-right of code blocks. Changes to "Copied!" for 2 seconds after click.

**Step 3: Evaluate**

Do the code blocks look better with proper syntax highlighting vs the current monochrome inline style?

---

## Execution Order

**Phase A — Quick wins (30 min each):**
2. Fix section labels
3. Blog list dividers
4. Category tabs
6. 404 page
7. Navbar active state

**Phase B — Medium features (1-2 hours each):**
1. Dark mode
5. Blog search
8. Reading progress bar
9. Back-to-top button

**Phase C — Infrastructure (1 hour each):**
10. RSS feed
11. Shiki code blocks

---

## Evaluation Protocol

After each task:
1. Take before/after screenshots
2. Ask: "Does this look like it was designed, or does it look like a developer added it?"
3. Ask: "Would removing this make the site worse? If not, revert."
4. Ask: "Does this match the existing design language (bento cards, GridWrapper lines, drama-shadow, purple accents)?"
5. If any answer is unsatisfying, iterate or revert before moving to next task.
