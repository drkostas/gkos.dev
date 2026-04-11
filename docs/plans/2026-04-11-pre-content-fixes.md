# Pre-Content Phase — Fixes & Features

> Everything that needs to happen before the content phase begins.
> Ordered by priority. Each task is independent unless noted.

---

## EXECUTION DIRECTIVES (for Claude — READ FIRST)

**This plan is executed end-to-end without stopping for approval.**

Rules:
1. **Do NOT stop to ask permission.** Every decision in this plan is pre-approved.
   Execute every task in order. Only stop for genuinely ambiguous situations that
   the plan doesn't cover — and even then, make a reasonable choice and log it.

2. **Test after every phase.** Run the Playwright tests for the phase, review
   screenshots with the Read tool, fix failures, re-run. Do not proceed to the
   next phase until the current phase's tests pass visually.

3. **Commit after every phase.** Each phase ends with a `git commit` with a
   descriptive message. This creates checkpoints — if a later phase breaks
   something, we can revert to the last good phase.

4. **Deploy after Phase 2.** After mobile fixes are tested and committed, push
   to main and let Vercel deploy. This creates a tested mobile build the user
   can access when they return.

5. **Screenshot everything.** Every visual test captures a screenshot to
   `tests/screenshots/`. Read them with the Read tool to verify. If a screenshot
   looks wrong, fix the code and re-run until it looks right.

6. **Document decisions.** When the plan is ambiguous and you make a judgment
   call, add a short note to the commit message or a `DECISIONS.md` file.

7. **Run all phases in this session.** No "I'll do the rest later." Phase 1
   through Phase 4 must complete before the session ends. If a phase blocks
   on an external issue, skip to the next and come back.

8. **Content phase (Phase 5) is NOT in this plan.** That's a separate effort
   for after the user returns. Pre-content fixes only.

**Success criteria for this session:**
- [ ] GameLayout restored, navbar visible on /explore
- [ ] GameLoadingScreen mounted, loading flow works
- [ ] Mobile touch controls functional (dispatch synthetic keys to game)
- [ ] Mobile controls are semi-transparent overlay (not below canvas)
- [ ] Game zoom appropriate for mobile
- [ ] Birch textbox readable on mobile
- [ ] Haptics working on touch devices
- [ ] Birch gender menu no-flash fix verified
- [ ] checkBadges name collision resolved
- [ ] DEVOTED badge unified in BadgeMilestones
- [ ] GameSave TS errors fixed
- [ ] require() in GameSave replaced with ESM
- [ ] All dead files deleted
- [ ] Playwright test suite for explore mode created and passing
- [ ] Deployed to Vercel
- [ ] Build passes clean

---

## CRITICAL: Restore Website Integration

### C1: Restore GameLayout.astro + GameLoadingScreen.tsx + explore.astro

**What happened:** The `rsync --delete` during worktree→main integration deleted
`GameLoadingScreen.tsx` and overwrote `explore.astro` with the worktree's standalone
version (no navbar, no GameLayout). The game went from "part of the website" to
"standalone page."

**Files to restore from git history (commit `f1f42e9`):**
- `src/layouts/GameLayout.astro` — keeps navbar, forces dark mode, fills remaining height
- `src/components/game/GameLoadingScreen.tsx` — loading progress bar with portfolio styling
- `src/pages/explore.astro` — uses GameLayout, dynamically imports PhaserGame

**Restoration plan:**
```bash
git show f1f42e9:src/layouts/GameLayout.astro > src/layouts/GameLayout.astro
git show f1f42e9:src/components/game/GameLoadingScreen.tsx > src/components/game/GameLoadingScreen.tsx
git show f1f42e9:src/pages/explore.astro > src/pages/explore.astro
```

**Then reconcile with current code:**
The restored `explore.astro` uses `<div id="game-root">` with a dynamic React import.
The current flow uses `ExploreApp` which manages OpeningScreen → PhaserGame transitions.
Need to merge: GameLayout wraps ExploreApp (or PhaserGame directly), and the loading
screen integrates with the existing flow.

**Integration approach:**
- `explore.astro` uses `GameLayout` (navbar stays)
- Inside GameLayout: render `ExploreApp` with `client:only="react"`
- `ExploreApp` shows `GameLoadingScreen` during Phaser boot (progress bar)
- After assets load → press to start → title screen → Birch speech → game
- The game viewport fills the space below the navbar

---

## CRITICAL: Fix Mobile Controls

### C2: Mobile controls don't interact with the game

**Problem:** Touch buttons render but don't affect the game. Synthetic keyboard
events aren't reaching Phaser or React components.

**Debug checklist:**
1. Is `ExploreApp.tsx` still blocking mobile? Check if the `isMobile` guard was
   properly removed or bypassed
2. Is `TouchControls` actually mounted? Check React DevTools
3. Are synthetic `KeyboardEvent`s dispatched? Add `console.log` in TouchControls
4. Does Phaser receive `touchState`? Log in OverworldScene's `update()`
5. Are touch events swallowed by CSS `touch-action: none` on the wrong element?

**Likely root cause:** The worktree's `ExploreApp.tsx` still has the mobile blocker
(lines 17-54) that returns a "requires keyboard" message on touch devices. The
`TouchControls` component exists but `ExploreApp` never renders it because the
blocker fires first.

### C3: Controls should be overlay (transparent, on-screen), not below canvas

**Design change from spec:** After real-device testing, overlay controls are better
than a separate zone below. The game should fill the full viewport with semi-transparent
controls floating on top.

**Changes:**
- `TouchControls.tsx` — position: fixed overlay, transparent background
- D-pad: bottom-left corner, semi-transparent
- A/B: bottom-right corner, semi-transparent
- START/RUN: small, between d-pad and buttons
- No separate controls zone — game canvas fills full viewport height
- All button backgrounds → transparent/semi-transparent

### C4: Button sizes need calibration + transparent backgrounds

**Issues reported:**
- Buttons have opaque non-transparent backgrounds
- Sizes not calibrated for actual phone screens
- Need programmatic testing with Playwright + screenshots

**Fix:**
- All buttons: `background: rgba(255,255,255,0.1)` or similar semi-transparent
- Active state: `background: rgba(255,255,255,0.2)` with subtle glow
- Sizes: minimum 44px (Apple HIG), test at 48-52px for d-pad arms
- Test with Chrome DevTools mobile emulation across iPhone 14, Pixel 7, iPad

### C5: Add fullscreen button

**Feature:** A small expand icon that calls `document.documentElement.requestFullscreen()`
when on mobile. Hides the browser chrome for a more immersive experience.

**Placement:** Small icon in the top-right or near START button. Toggles fullscreen on/off.

### C6: Game is way too zoomed in on mobile

**Problem:** The current zoom level makes tiles too large on mobile viewports. Player
can barely see surroundings.

**Fix:** The user wants MORE zoomed out on mobile than desktop (reversed from original spec).
- Desktop: `PIXEL_SCALE = 3` (current)
- Mobile landscape: `MOBILE_PIXEL_SCALE = 2` (see more tiles)
- Mobile portrait: `MOBILE_PORTRAIT_PIXEL_SCALE = 1` or `1.5` (even more zoomed out)

Verify on real device — non-integer zoom (1.5) may cause pixel bleed at tile boundaries.

### C7: Birch textbox covers full screen on mobile

**Problem:** The dialog box / text box used during Birch speech fills too much of the
mobile viewport. Text is unreadable or overflows.

**Fix:** Scale the Birch speech text box based on viewport size. Use `--ui-scale-x` and
`--ui-scale-y` CSS variables (already computed in PhaserGame.tsx) to constrain the
text box dimensions on smaller screens.

### C8: No haptics on mobile

**Problem:** `Haptics.ts` exists with `hapticTap()` / `hapticConfirm()` / `hapticToggle()`
but they're not being called from TouchControls, or `navigator.vibrate` isn't available.

**Debug:** Check if `hapticTap()` is called in TouchControls' touch handlers. Check if
the first-gesture requirement for vibration API is blocking it. Add console.log to verify.

---

## HIGH: Code Quality (Developer Review)

### H1: Fix `checkBadges` name collision

Two functions with the same name in different modules:
- `BadgeMilestones.ts:119` → `checkBadges(): void` — queues KOSTAS badge notifications
- `GameSave.ts:416` → `checkBadges(): string[]` — auto-awards DEVOTED badge

A typo in the import path silently switches behavior.

**Fix:** Rename `GameSave.checkBadges` → `refreshDevotedBadge()` or merge DEVOTED into
`BadgeMilestones.BADGES` so there's one badge-checking entry point.

### H2: Unify DEVOTED badge declaration

DEVOTED is declared in 3 places with different behavior:
- `BadgeMilestones.BADGES` — 7 badges, no DEVOTED
- `GameSave.checkBadges()` — manually awards DEVOTED
- `TrainerCard` + KOSTAS `BADGE_ORDER` — 8 badges including DEVOTED

**Fix:** Add DEVOTED to `BadgeMilestones.BADGES` with its condition. Delete
`GameSave.checkBadges()`. Now all 8 badges flow through the same system.

### H3: Fix GameSave.ts type errors (TS18048/2339/2488)

`pocketArrayKey` returns `keyof GameSave` which widens to the full union. TypeScript
can't narrow `save[key]` to `string[]`.

**Fix:** Change return type to the narrower literal union:
```typescript
function pocketArrayKey(pocket: BagPocketId):
  "papersCollected" | "blogsCollected" | "keyItemsCollected" | "tmsCollected"
```

### H4: Fix `require()` in GameSave.ts (ESM violation)

`GameSave.ts:399-400` uses `require()` inside an ESM module to dodge a circular import.
Fragile in Vite prod builds.

**Fix:** Move `getTotalOpenableUrls()` to a separate file that can do static ESM imports,
or pass totals as arguments.

---

## MEDIUM: Cleanup

### M1: Delete dead files

- `src/components/game/RotateOverlay.tsx` — replaced by PortraitBanner, zero imports
- `game-map-data.json` + `map-analyzer.txt` — generated artifacts, add to `.gitignore`

### M2: Fix stale comments

- `gates.ts:60` — says `save.fieldMoves[species]`, should say `save.fieldMoves[id]`
- `researchLog.ts:5-9` — says "auto-given when first entry unlocks", no longer true

### M3: NPCSystem duplicate constants

`NPCSystem.ts:26,67` still defines local `WALK_ANIM_MAPPING` and `OPPOSITE` copies.
Import from `sceneHelpers.ts` instead.

### M4: Document urlsOpened key format

Add a comment on `GameSave.urlsOpened` documenting the format:
- Bag items: `${pocket.id}:${item.name}` (e.g. `"papers:IGARSS Paper"`)
- Pokedex: `"pokedex:${entryNumber}"` (e.g. `"pokedex:7"`)

---

## MEDIUM: Birch Speech Bugs

### B4: Gender menu still flashes twice

**Problem:** The BOY/GIRL popup appears briefly during "Are you a boy?" (before "Or are
you a girl?") despite the B2b fix (`displayedText.length > 0`).

**Root cause:** The phase may transition through two text sequences:
1. "Are you a boy?" → text finishes → `allTextShown` true → menu renders for 1 frame
2. "Or are you a girl?" → new text starts → menu hides → text finishes → menu renders correctly

**Fix:** The menu should only render when the phase is `GENDER_SELECT` AND the LAST line
of the GENDER_SELECT text has finished typing. Add a check that the current text matches
the expected gender question text, or track a `menuReady` flag that's set by a `useEffect`
with a 1-frame delay after `allTextShown` becomes true.

---

## LOW: Polish

### L1: explore.astro SEO/meta tags

Add `<meta name="description">`, Open Graph tags, social preview image.

### L2: Resize listener inconsistency between scenes

OverworldScene uses `window.addEventListener("resize")` with manual cleanup.
InteriorScene uses `this.scale.on("resize")` which auto-cleans.
Unify on Phaser's `scale.on` — 3-line edit per scene.

### L3: MOBILE_PIXEL_SCALE export cleanup

After getSceneZoom() centralizes zoom logic, `MOBILE_PIXEL_SCALE` export in config.ts
can become a local const. Not urgent.

### L4: Non-integer zoom pixel bleed

`MOBILE_PORTRAIT_PIXEL_SCALE = 1.5` may cause sub-pixel bleed lines at tile boundaries.
Verify on real device. If visible, drop to 1 (integer).

---

## TESTING STRATEGY

All testing is automated via Playwright. No manual phone testing required.
The test suite verifies EVERY fix before and after, with screenshots as proof.

### Test infrastructure

**Existing:** Playwright installed (`@playwright/test ^1.59.1`), config at
`playwright.config.mjs`, dev server at `localhost:4321`.

**New test file:** `tests/explore-mode.spec.mjs`

Covers three device profiles:
- **Desktop:** 1440×900 (existing site experience)
- **Mobile landscape:** iPhone 14 Pro (393×852, rotated → 852×393), touch enabled
- **Mobile portrait:** iPhone 14 Pro (393×852), touch enabled

### Test categories and verification methods

#### T1: Website Integration Tests (verifies C1)

```javascript
test("desktop: navbar visible on /explore", async ({ page }) => {
  await page.goto("/explore");
  // Navbar from GameLayout should be present
  const navbar = page.locator("nav");
  await expect(navbar).toBeVisible();
  await page.screenshot({ path: "tests/screenshots/explore-desktop-navbar.png" });
});

test("desktop: loading screen appears", async ({ page }) => {
  await page.goto("/explore");
  // GameLoadingScreen should show progress bar
  const loadingScreen = page.locator("text=Loading the world");
  await expect(loadingScreen).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: "tests/screenshots/explore-desktop-loading.png" });
});

test("desktop: game canvas renders after start", async ({ page }) => {
  await page.goto("/explore");
  // Wait for loading, then press key to start
  await page.waitForSelector("text=Press any key", { timeout: 30000 });
  await page.keyboard.press("Enter");
  // Canvas should exist and not be empty
  await page.waitForTimeout(2000);
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await page.screenshot({ path: "tests/screenshots/explore-desktop-game.png" });
});
```

#### T2: Mobile Layout Tests (verifies C3, C4, C6, C7)

```javascript
// Use Playwright device emulation
const iPhone = devices["iPhone 14 Pro"];

test.describe("mobile landscape", () => {
  test.use({
    ...iPhone,
    viewport: { width: 852, height: 393 },
    isMobile: true,
    hasTouch: true,
  });

  test("touch controls visible as overlay", async ({ page }) => {
    await page.goto("/explore");
    // Skip to game (press through loading + title)
    await page.waitForTimeout(3000);
    await page.tap("body"); // start
    await page.waitForTimeout(1000);

    // D-pad should be visible at bottom-left
    const dpad = page.locator("[data-testid='dpad']");
    await expect(dpad).toBeVisible();

    // A/B buttons at bottom-right
    const aBtn = page.locator("[data-testid='btn-a']");
    const bBtn = page.locator("[data-testid='btn-b']");
    await expect(aBtn).toBeVisible();
    await expect(bBtn).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/mobile-landscape-controls.png" });
  });

  test("controls have transparent background", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForTimeout(3000);
    await page.tap("body");
    await page.waitForTimeout(1000);

    const dpad = page.locator("[data-testid='dpad']");
    const bg = await dpad.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Should be transparent or semi-transparent (rgba with alpha < 0.5)
    expect(bg).toMatch(/rgba?\(.*,\s*0(\.\d+)?\)/); // alpha < 1
  });

  test("game canvas fills viewport (no separate controls zone)", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForTimeout(3000);
    await page.tap("body");
    await page.waitForTimeout(2000);

    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    // Canvas should fill most of the viewport (no 120px gap at bottom)
    expect(box.height).toBeGreaterThan(350); // 393 - some navbar
    await page.screenshot({ path: "tests/screenshots/mobile-landscape-fullview.png" });
  });

  test("button sizes meet 44px minimum", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForTimeout(3000);
    await page.tap("body");
    await page.waitForTimeout(1000);

    const aBtn = page.locator("[data-testid='btn-a']");
    const box = await aBtn.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("mobile portrait", () => {
  test.use({
    ...iPhone,
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
  });

  test("portrait banner shows", async ({ page }) => {
    await page.goto("/explore");
    const banner = page.locator("text=Rotate to landscape");
    // Banner should appear (but not block the game)
    await expect(banner).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "tests/screenshots/mobile-portrait-banner.png" });
  });

  test("game still playable in portrait", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForTimeout(3000);
    const canvas = page.locator("canvas");
    // Game should still render even in portrait
    await expect(canvas).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: "tests/screenshots/mobile-portrait-game.png" });
  });
});
```

#### T3: Touch Interaction Tests (verifies C2, C8)

```javascript
test.describe("touch controls work", () => {
  test.use({
    ...devices["iPhone 14 Pro"],
    viewport: { width: 852, height: 393 },
    isMobile: true,
    hasTouch: true,
  });

  test("d-pad touch dispatches direction", async ({ page }) => {
    await page.goto("/explore");
    // Navigate to game state (past loading + title + birch or continue)
    // ... setup to get to overworld ...

    // Get player position before
    const posBefore = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const ge = game.scene.scenes.find(s => s.gridEngine)?.gridEngine;
      return ge?.getPosition("player");
    });

    // Tap the d-pad right zone
    const dpad = page.locator("[data-testid='dpad']");
    const box = await dpad.boundingBox();
    // Right zone = center-right of d-pad
    await page.touchscreen.tap(box.x + box.width * 0.85, box.y + box.height * 0.5);
    await page.waitForTimeout(500);

    // Get player position after — should have moved right
    const posAfter = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const ge = game.scene.scenes.find(s => s.gridEngine)?.gridEngine;
      return ge?.getPosition("player");
    });

    // Player should have moved (or at least faced right)
    // Note: might be blocked by NPC — check facing direction instead
    const facing = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const ge = game.scene.scenes.find(s => s.gridEngine)?.gridEngine;
      return ge?.getFacingDirection("player");
    });
    expect(facing).toBe("right");
  });

  test("A button opens dialog when facing NPC", async ({ page }) => {
    // Setup: navigate player to face an NPC
    // ... game state setup ...

    // Tap A button
    const aBtn = page.locator("[data-testid='btn-a']");
    await aBtn.tap();
    await page.waitForTimeout(500);

    // Dialog overlay should appear
    const dialog = page.locator("[data-testid='dialog-box']");
    await expect(dialog).toBeVisible();
  });

  test("START button opens menu", async ({ page }) => {
    // In overworld...
    const startBtn = page.locator("[data-testid='btn-start']");
    await startBtn.tap();
    await page.waitForTimeout(300);

    // Start menu should be visible
    const menu = page.locator("text=POKeDEX");
    await expect(menu).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/mobile-start-menu.png" });
  });
});
```

#### T4: Birch Speech Tests (verifies B4)

```javascript
test("birch gender menu appears only once", async ({ page }) => {
  await page.goto("/explore");
  // Navigate to NEW GAME
  await page.waitForSelector("text=NEW GAME", { timeout: 30000 });
  await page.keyboard.press("ArrowDown"); // select NEW GAME
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);

  // Track how many times the gender menu appears
  let genderMenuAppearances = 0;
  const screenshots = [];

  // Advance through Birch speech by pressing A repeatedly
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(300);

    // Check if gender menu is visible
    const genderMenu = page.locator("[data-testid='gender-select']");
    const isVisible = await genderMenu.isVisible().catch(() => false);

    if (isVisible) {
      genderMenuAppearances++;
      screenshots.push(`tests/screenshots/birch-gender-visible-${i}.png`);
      await page.screenshot({ path: screenshots[screenshots.length - 1] });
    }

    await page.keyboard.press("a"); // advance text
  }

  // Gender menu should appear exactly ONCE
  // (it may stay visible across multiple frames — that's fine)
  // But it should NOT appear, disappear, then appear again
  console.log(`Gender menu appeared ${genderMenuAppearances} times across ${30} frames`);
  // We check screenshots to verify no flash
});
```

#### T5: Code Quality Tests (verifies H1-H4, M1-M4)

```javascript
// These are static checks, not browser tests

test("no checkBadges name collision", async () => {
  const { execSync } = require("child_process");
  // Count exports named checkBadges
  const result = execSync(
    "grep -rn 'export.*function checkBadges\\|export.*checkBadges' src/game/",
    { encoding: "utf-8" }
  );
  const lines = result.trim().split("\n").filter(Boolean);
  // Should be exactly 1 (after H1 fix)
  expect(lines.length).toBe(1);
});

test("DEVOTED badge in BadgeMilestones.BADGES", async () => {
  const { execSync } = require("child_process");
  const result = execSync(
    "grep -c 'devoted' src/game/systems/BadgeMilestones.ts",
    { encoding: "utf-8" }
  );
  expect(parseInt(result.trim())).toBeGreaterThan(0);
});

test("no require() in ESM files", async () => {
  const { execSync } = require("child_process");
  const result = execSync(
    "grep -rn 'require(' src/game/systems/GameSave.ts || echo 'clean'",
    { encoding: "utf-8" }
  );
  expect(result.trim()).toBe("clean");
});

test("no dead RotateOverlay file", async () => {
  const fs = require("fs");
  expect(fs.existsSync("src/components/game/RotateOverlay.tsx")).toBe(false);
});

test("generated files in gitignore", async () => {
  const fs = require("fs");
  const gitignore = fs.readFileSync(".gitignore", "utf-8");
  expect(gitignore).toContain("game-map-data.json");
  expect(gitignore).toContain("map-analyzer.txt");
});

test("typescript clean", async () => {
  const { execSync } = require("child_process");
  const result = execSync(
    "npx tsc --noEmit 2>&1 | grep -v baseUrl | grep -c error || echo '0'",
    { encoding: "utf-8" }
  );
  expect(parseInt(result.trim())).toBe(0);
});
```

#### T6: Build Verification

```javascript
test("npm run build succeeds", async () => {
  const { execSync } = require("child_process");
  // This will throw if build fails
  execSync("npm run build", { timeout: 120000 });
});
```

### Screenshot workflow

Every visual test saves a screenshot to `tests/screenshots/`. After each fix:
1. Run the specific test
2. Review the screenshot visually (I read the PNG with the Read tool)
3. If it looks wrong, fix and re-run
4. When all screenshots pass visual inspection, the fix is done

### Test execution

```bash
# Run all explore mode tests
npx playwright test tests/explore-mode.spec.mjs

# Run a specific test
npx playwright test tests/explore-mode.spec.mjs -g "navbar visible"

# Run with headed browser (for debugging)
npx playwright test tests/explore-mode.spec.mjs --headed

# Run mobile-only tests
npx playwright test tests/explore-mode.spec.mjs -g "mobile"
```

### Data-testid attributes needed

Add `data-testid` attributes to these components for reliable test selectors:
- `TouchControls.tsx`: `data-testid="dpad"`, `data-testid="btn-a"`, `data-testid="btn-b"`,
  `data-testid="btn-start"`, `data-testid="btn-run"`
- `DialogBox.tsx`: `data-testid="dialog-box"`
- `BirchGenderSelect.tsx`: `data-testid="gender-select"`
- `PortraitBanner.tsx`: `data-testid="portrait-banner"`
- `GameLoadingScreen.tsx`: `data-testid="loading-screen"`

---

## TASK ORDER

**Phase 1 — Restore website (do first, blocks everything):**
1. C1: Restore GameLayout + GameLoadingScreen + explore.astro
2. Run T1 tests → verify navbar, loading screen, game canvas

**Phase 2 — Fix mobile (do second):**
3. C2: Fix mobile controls interaction
4. C3: Switch to overlay controls
5. C4: Transparent backgrounds + size calibration
6. C5: Fullscreen button
7. C6: Fix zoom level
8. C7: Fix Birch textbox sizing on mobile
9. C8: Fix haptics
10. Run T2 + T3 tests → verify all mobile functionality with screenshots

**Phase 3 — Code quality (do before content phase):**
11. H1: Rename checkBadges collision
12. H2: Unify DEVOTED badge
13. H3: Fix GameSave type errors
14. H4: Fix require() ESM violation
15. B4: Fix gender menu double-flash
16. Run T4 + T5 tests → verify code quality + birch fix

**Phase 4 — Cleanup:**
17. M1-M4: Dead files, stale comments, duplicate constants, docs
18. L1-L4: SEO, listener consistency, export cleanup, pixel bleed check
19. Run T5 + T6 tests → verify cleanup + build

**Phase 5 — Content phase begins**
