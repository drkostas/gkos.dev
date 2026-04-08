# Verification Strategy — Pixel-Perfect Comparison

**Date:** 2026-04-08

## Goal

Ensure the Astro recreation is visually identical to Braydon's site. Zero pixel differences.

## Two-Layer Approach

### Layer 1: Overlay Comparison (during building)

**Purpose:** Fast visual feedback while developing each component/page.

**Setup:**
- Baseline screenshots captured once from Braydon's running local dev server
- Stored in `tests/baselines/{page}-{viewport}w.png`
- Simple HTML comparison tool at `tests/compare.html`

**Tool features:**
- Side-by-side view (baseline left, ours right)
- Overlay mode with opacity slider (blend between images)
- Page/viewport selector dropdown

**Workflow:** Build → screenshot → overlay → fix → repeat

### Layer 2: Playwright toHaveScreenshot (final verification)

**Purpose:** Automated pass/fail proof that every page matches at every viewport.

**Setup:**
- Playwright test suite at `tests/visual-regression.spec.ts`
- Baselines = Braydon's screenshots (committed as expected snapshots)
- Tests run against our Astro dev server

**Config:**
- `maxDiffPixels: 0` (strict — zero tolerance)
- On failure: diff images auto-generated in `tests/visual-regression.spec.ts-snapshots/`

**Test matrix:**

| Page | 375px | 768px | 1024px | 1440px |
|------|-------|-------|--------|--------|
| Home | ✓ | ✓ | ✓ | ✓ |
| About | ✓ | ✓ | ✓ | ✓ |
| Blog | ✓ | ✓ | ✓ | ✓ |
| Blog Post | ✓ | ✓ | ✓ | ✓ |
| Projects | ✓ | ✓ | ✓ | ✓ |
| Toolbox/Other | ✓ | ✓ | ✓ | ✓ |

**Total:** ~24 test cases, all must pass.

**When to run:**
- After completing each page
- Full suite as gate before moving to Phase 3

## Baselines

Captured from Braydon's site running locally at `~/Insync/Gdrive/Projects/drkostas.github.io/.references/braydoncoyer.dev/`.

Viewports: 375px, 768px, 1024px, 1440px (all at 1x device scale).
Full-page screenshots (not just viewport — scroll entire page).
