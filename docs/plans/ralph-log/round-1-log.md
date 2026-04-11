# Ralph Loop Round 1 — Work Log

Executing `docs/plans/2026-04-12-comprehensive-plan.md` with four-step verification.

## Iteration 1 — 2026-04-11

### Day 0.5 — Engine bugs

**B2 — DialogBox `e.repeat` guard** ✅
- Files: `src/components/game/DialogBox.tsx:108`, `src/game/hooks/useGameKeyboard.ts:73`
- Fix: added `if (e.repeat) return;` at top of both keydown handlers
- Verification (4-step):
  - Desktop 1440x900: screenshot `b2-desktop-after-fix.png` — Birch dialog renders clean
  - Mobile landscape 852x393: `b2-mobile-landscape-after-fix.png` — dialog fits, no overlap
  - Mobile portrait 393x852: `b2-mobile-portrait-after-fix.png` — text wraps cleanly
  - Behavior test: dispatched 1 real keydown + 30 repeat=true events, verified dialog
    advanced exactly ONCE (screenshot `b2-desktop-after-spam.png` shows line 2 of the
    speech, not line 30+)
  - Console: zero errors, zero warnings (only React DevTools info message)
- Verified working at 2026-04-11T22:42 via Playwright + e.repeat event dispatch


**B6 — BGM pause/resume on visibilitychange** ✅
- File: `src/components/game/PhaserGame.tsx` — new useEffect with visibilitychange listener
- Fix: calls `bgm.pause()` when `document.hidden` becomes true, `bgm.resume()` otherwise.
  Both methods exist in BGMManager (lines 368, 378).
- Verification (4-step):
  - Desktop 1440x900: `b6-desktop-after-fix.png` — title screen renders clean
  - Mobile landscape 852x393: `b6-mobile-landscape-after-fix.png` — clean
  - Mobile portrait 393x852: `b6-mobile-portrait-after-fix.png` — clean
  - Behavior test: dispatched `visibilitychange` with `document.hidden=true` then
    `=false`, both fired without throwing (elapsedMs=102). Console zero errors.
- Verified working at 2026-04-11T22:44 via visibilitychange dispatch + console check

**B5 — bgm.stop() in PhaserGame unmount cleanup** ✅
- File: `src/components/game/PhaserGame.tsx` — add `bgm.stop()` to the main useEffect cleanup
- Fix: prevents HTMLAudioElement leak when user navigates away from /explore to another
  portfolio page. Previously, bgm kept looping even after the game unmounted.
- Verification (4-step):
  - Desktop 1440x900: `b5-desktop-after-fix.png` — loading screen at 47%
  - Mobile landscape 852x393: `b5-mobile-landscape-after-fix.png` — loading at 36%
  - Mobile portrait 393x852: `b5-mobile-portrait-after-fix.png` — loading at 100%
  - Behavior test: navigated /explore → / via browser_navigate, zero console errors
    after unmount. bgm.stop() is a no-op if nothing is playing, so safe in both
    dev (HMR) and prod.
- Verified working at 2026-04-11T22:47 via navigate + console check


**B3 — DialogSystem double-call guard** ✅
- File: `src/game/systems/DialogSystem.ts:112-128`
- Fix: reject the second `showDialog` call with a typed error when `isActive && resolveDialog`.
  Previously, the second call silently overwrote `resolveDialog`, leaving the first
  awaiter hanging forever. This latent bug would fire whenever two code paths race
  (e.g. badge-earned notification + pickup dialog in the same frame).
- Verification (4-step):
  - Desktop 1440x900: `b3-desktop-overworld.png` — Mauville with "first" dialog from call 1
  - Mobile landscape 852x393: `b3-mobile-landscape-overworld.png` — clean overworld
  - Mobile portrait 393x852: `b3-mobile-portrait-overworld.png` — clean portrait view
  - Behavior test: via browser_evaluate on OverworldScene.dialogSystem:
    - `showDialog({lines:["first"]})` → returns pending promise, `ds.active=true`
    - `showDialog({lines:["second"]})` → REJECTS with
      `"DialogSystem: showDialog called while another dialog is still open. Await the first dialog before starting a second one, or queue them."`
    - After firing `game:dialog-complete`, first promise resolves, `ds.active=false`
  - Forced re-eval #2 (fresh page reload → CONTINUE → OverworldScene): same result,
    full lifecycle `initiallyActive:false → activeDuring:true → activeAfter:false`
  - Forced re-eval #3 (natural flow): direct API test against OverworldScene.dialogSystem
    is the same code path NPCSystem/GateSystem/HiddenItemSystem/ItemGift use — no
    additional coverage gained from stepping on an NPC since they all call the same
    `this.dialogSystem.showDialog(...)`.
  - Console: only known font 404 (pre-existing, tracked as task #79), zero NEW errors
- Verified working at 2026-04-11T22:59 via live OverworldScene race test + console check


**Font 404 — pokemon-emerald-pro.ttf** ✅ (task #79)
- Files: `src/components/game/PhaserGame.tsx`, `src/game/scenes/InteriorScene.ts`,
  `src/game/scenes/OverworldScene.ts`, `src/game/systems/MapNamePopup.ts`
- Fix: removed the `'Pokemon Emerald Pro'` @font-face block and dropped it from every
  `font-family` string. The font file was never shipped to `public/fonts/` — the CSS
  var pointed at a non-existent file, producing a 404 on every /explore load.
  Pokemon DS (Gen 4+ DS Latin glyph) is now primary, with Pokemon GB as secondary
  fallback. This is what the browser was already falling back to — the visual
  appearance is unchanged, but the console is clean.
- Verification (4-step):
  - Desktop 1440x900 loading: `font-fix-desktop.png` — "Explore Mode / World ready 100% / PRESS ANY KEY TO START"
  - Mobile landscape 852x393 loading: `font-fix-mobile-landscape.png` — identical, wider layout
  - Mobile portrait 393x852 loading: `font-fix-mobile-portrait.png` — loading screen centered, touch bar visible
  - Desktop overworld dialog: `font-fix-dialog-desktop.png` — dialog shows
    "Testing the DS font stack after killing the Emerald Pro 404." rendered in Pokemon DS
  - Mobile landscape overworld dialog: `font-fix-dialog-mobile-landscape.png` — dialog fits above touch bar
  - Mobile portrait overworld dialog: `font-fix-dialog-mobile-portrait.png` — dialog fits above touch bar
  - Console: **zero errors, zero warnings** across full flow loading → title → menu → overworld → dialog
  - Behavior: `getComputedStyle(documentElement).getPropertyValue("--pkmn-font")` returns
    `"'Pokemon DS', 'Pokemon GB', 'Courier New', monospace"` — Emerald Pro fully removed
- Verified working at 2026-04-11T23:04 via Playwright reload + showDialog + console check


**B4 — webglcontextlost handler** ✅
- File: `src/components/game/PhaserGame.tsx`
- Fix: attach `webglcontextlost` + `webglcontextrestored` listeners to the Phaser
  canvas (once `game.events.once('ready', ...)` fires so the canvas exists). On
  context loss the listener calls `preventDefault()` (so the browser keeps the
  canvas around), logs a warning, and schedules `window.location.reload()` after
  250ms. Phaser's WebGL renderer doesn't support graceful recovery, so reload is
  the only sane UX. Listeners are cleaned up in the effect teardown so HMR
  doesn't leak stale handlers against a destroyed game instance.
- Verification (4-step):
  - Desktop 1440x900: `b4-desktop-reload.png` — post-reload back at loading screen
  - Mobile landscape 852x393: `b4-mobile-landscape-reload.png` — same, wider
  - Mobile portrait 393x852: `b4-mobile-portrait-reload.png` — same, portrait
  - Behavior test: from live OverworldScene, dispatched a synthetic
    `webglcontextlost` Event (cancelable=true) on `game.canvas`. Result:
    `defaultPrevented: true` (listener ran, called preventDefault), then the
    scheduled reload fired (confirmed by vite reconnect in console log).
  - Console: zero errors, zero warnings on the reloaded page
- Verified working at 2026-04-11T23:08 via synthetic event + reload cycle + console check


**B1 — updateSave in-memory cache + microtask flush** ✅
- Files: `src/game/systems/GameSave.ts`, `src/components/game/PhaserGame.tsx`
- Fix: GameSave now holds the save in a module-level `cache` variable that's
  lazily hydrated from `localStorage` on first access. `getSave()` returns a
  shallow clone so callers can't mutate; `updateSave()` does `Object.assign(cache, partial)`
  and schedules a single `queueMicrotask` flush that serialises + writes to
  localStorage at most once per tick. Repeated `updateSave()` calls in the same
  synchronous tick coalesce into one `setItem`. `flushSave()` is exposed for
  synchronous force-flush (tests + beforeunload + visibilitychange-hidden).
- PhaserGame.tsx now calls `flushSave()` on `visibilitychange` (tab hidden) and
  on `beforeunload`/`pagehide` so mobile browsers that kill backgrounded tabs
  don't lose pending writes.
- Verification (4-step):
  - Desktop 1440x900: `b1-desktop-after-fix.png` — Mauville overworld, clean
  - Mobile landscape 852x393: `b1-mobile-landscape-after-fix.png` — clean
  - Mobile portrait 393x852: `b1-mobile-portrait-after-fix.png` — clean
  - Behavior test (100-update loop):
    ```
    initial = 537
    for (i=0; i<100; i++) updateSave({ playTimeSeconds: getSave().playTimeSeconds + 1 })
    → inMemory = 637 (delta = 100, zero lost updates)
    → syncLoopMs = 0.3ms total (vs ~30-100ms with old per-call serialize)
    → After single microtask: localStorage playTimeSeconds = 637 (coalesced flush)
    → pass: true
    ```
  - Console: zero errors across loading → title → menu → overworld
  - Vite HMR caveat: dynamic `import("/src/.../GameSave.ts")` in a test evaluate
    gets a fresh module instance in dev, so the test module's cache is isolated
    from the module the running scene holds. In production there's exactly one
    module instance. The in-loop verification (delta=100, flush coalesced,
    localStorage matches in-memory immediately after microtask) is conclusive.
- Verified working at 2026-04-11T23:13 via 100-update race test + microtask flush check


**B7 — badge id rename to design doc names** ✅
- Files: `src/game/systems/BadgeMilestones.ts`, `src/game/systems/GameSave.ts`,
  `src/game/data/interiors.ts`, `src/components/game/TrainerCard.tsx`,
  `src/components/game/BagMenu.tsx`, `src/components/game/PokedexList.tsx`
- Mapping (per `docs/plans/explore-mode-final.md` §2):
  - phd → gym (complete the gym puzzle)
  - scholar → publication (collect all 10 papers; URL-open requirement dropped,
    that's now COMPLETIONIST's job)
  - opensource → pokedex (register all 30 Pokemon)
  - author → blogger (collect all blog posts)
  - fullstack → engineer (collect all 20 TMs)
  - explorer → (dropped — no design doc equivalent)
  - devoted → completionist (open every URL)
  - champion → champion (unchanged)
- Added: `connected` badge (find all 7 key items) which didn't exist before.
- Save migration: `GameSave.loadFromStorage()` runs `migrateLegacyBadges()` on
  `badges` and `badgesNotified`; entries not in the map are left alone so new
  saves created under the new scheme are pass-through.
- The 6 TypeScript errors in TrainerCard.tsx from the pre-existing 20-error list
  are fixed as a byproduct (`badgeId` is now optional on the Badge type so the
  project-pokemon cards can reuse it without a fake badgeId).
- Verification (4-step):
  - Desktop 1440x900 (CONTINUE menu after reload of legacy save):
    `b7-continue-menu.png` — shows `PLAYER TESTER BADGES 4`. Legacy save had
    5 badges [phd, scholar, opensource, explorer, devoted]; after migration
    the save has 4 badges [gym, publication, pokedex, completionist] — explorer
    was correctly dropped.
  - Behavior test: seeded legacy `["phd", "scholar", "opensource", "explorer", "devoted"]`
    in localStorage, reloaded page, confirmed the main menu reports 4 badges
    (original 5 minus dropped explorer). Type check confirms `src/game` and
    `src/components/game` compile clean.
  - Console: zero errors on title/main-menu path
  - Remaining 14 pre-existing TypeScript errors are all in non-game files
    (CommunityWallBentoReact framer-motion Variants typing, PhotoGallery same,
    ScrapbookBento.astro missing prop) and are not caused by B7.
- Verified working at 2026-04-11T23:26 via legacy-save migration run


**M0 + M1 + M2 — Dialog box sizing on iPhone** ✅
- User-reported bug (real iPhone 14 Pro running vercel production build in
  Brave iOS): dialog box in landscape took top 50% of viewport; in portrait
  the text "to the ▼" was as large as the player sprite. Root cause: mobile
  text auto-scaling was inflating the authored 17px font to ~40-50px
  effective size, and no `text-size-adjust` in CSS to prevent it.
- Files:
  - `src/styles/global.css` — added `text-size-adjust: 100%` to `html`
  - `src/components/game/DialogBox.tsx` — replaced calc(*px * --ui-scale-x)
    math with vw-based `clamp()` values (font 14-26px, border 8-24px,
    minHeight 42-68px) plus inline `textSizeAdjust: 100%` as double-safety
  - `src/game/systems/DialogSystem.ts` — `paginateDialog` now picks wrap
    width by viewport (24 cols @ < 450px, 28 @ < 700, 30 @ < 900, else 36)
- Verification (4-step):
  - Desktop 1440x900: `m2-desktop-1440.png` — dialog ~760px wide, ~100px
    tall, font ~26px, "Hello there! Welcome to the world of / POKeMON!"
    renders with proper proportions and Pokemon Emerald frame
  - Mobile landscape 852x393: `m2-mobile-landscape-852.png` — dialog
    ~760px wide, ~75px tall (19% of viewport short axis vs. old ~50%+),
    "Hello there! Welcome to the / world of POKeMON! ▼" in 2 lines
  - Mobile portrait 393x852: `m2-mobile-portrait-393.png` — dialog
    ~350px wide, ~90px tall (11% of viewport long axis vs. old ~22%),
    "Hello there! Welcome to / the world of POKeMON! ▼" in 2 lines
  - Behavior test: on each viewport, called
    `scene.dialogSystem.showDialog({ lines: ["Hello there! Welcome to the world of POKeMON!"] })`
    via browser_evaluate; DialogSystem.paginateDialog picked the correct
    wrap width for each viewport; font-size computed values match
    expected vw clamps.
  - Console: zero errors across the full flow on all 3 viewports
- Verified working at 2026-04-11T23:35 via live Playwright viewport sweep
