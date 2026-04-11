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
