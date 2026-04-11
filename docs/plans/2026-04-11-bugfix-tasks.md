# Explore Mode — Bug Fix Tasks

> Three tasks covering 6 issues found during playtesting.
> Each subtask is small and independent within its parent task.

---

## TASK B1: Sprite & Asset Fixes [LOW RISK]

### B1a: May sprites have green chroma key background

**Problem:** All three May (girl player) sprite sheets have a solid green background
instead of transparency. The green is the GBA-standard chroma key color. Brendan (boy
player) sprites are already transparent.

**Files affected:**
- `public/game/sprites/emerald/may.png` (standing — 9 frames)
- `public/game/sprites/emerald/may_walk.png` (walk cycle)
- `public/game/sprites/emerald/may_run.png` (run cycle)

**Visible in-game:** Green rectangle surrounds the girl character in the overworld
(see screenshot in the bug report). Especially noticeable on non-green terrain (paths,
sand, water edges).

**Fix:** Strip the green background to transparency. The exact green color is likely
`#88C070` (the standard GBA sprite background) — verify by sampling the pixel at (0,0)
in any image editor.

**Option A — ImageMagick (one command per file):**
```bash
magick may.png -transparent "#88C070" may.png
magick may_walk.png -transparent "#88C070" may_walk.png
magick may_run.png -transparent "#88C070" may_run.png
```

If the green doesn't match exactly, use a fuzz tolerance:
```bash
magick may.png -fuzz 5% -transparent "#88C070" may.png
```

**Option B — Any image editor:** Open each file, magic wand select the green background,
delete, save as PNG with transparency.

**After fix:** Verify in-game by selecting "GIRL" in Birch speech → overworld loads with
transparent May sprite. Check all 4 directions + running animation — no green artifacts.

### B1b: Trainer Card hint text says "Z to flip" — Z doesn't work

**Problem:** The front side of the Trainer Card shows:
```
Click / Z to flip · ESC to close
```

But the actual flip key is A (confirm), not Z. The `useGameKeyboard` hook maps confirm
to `["a", "A", " ", "Enter"]`. Z is not a recognized key.

**File:** `src/components/game/TrainerCard.tsx`

**Line 216 (front side hint):**
```typescript
// Before:
<div style={hintStyle}>Click / Z to flip · ESC to close</div>

// After:
<div style={hintStyle}>A to flip · B to close</div>
```

**Line 281 (back side hint):** Already says `"A flip · B back · click icon for project"`
— this is correct. Just make the front side consistent.

**Testing:** Open Trainer Card from menu → front shows "A to flip · B to close" →
press A → card flips → back shows "A flip · B back" → press B → returns to menu.

---

## TASK B2: Birch Speech Intro Fixes [LOW RISK]

### B2a: Typing SFX too frequent during Birch speech

**Problem:** The typewriter sound effect ("dri dri dri") plays too frequently during
Professor Birch's intro speech. It fires on start + every 3rd character, producing
~11 blips per 30-character line. OG Pokemon Emerald plays ~4-5 blips per line — a
much calmer pace.

**File:** `src/components/game/BirchSpeechLayer.tsx:141-147`

```typescript
// Current:
const { ... } = useTypewriter({
  speedMs: getTypeSpeedMs,
  onStart: () => sfx.text(),
  onChar: (idx) => {
    if (idx % 3 === 0) sfx.text();
  },
});

// Fix — reduce to every 8th character, remove onStart (idx=1 covers first blip):
const { ... } = useTypewriter({
  speedMs: getTypeSpeedMs,
  onChar: (idx) => {
    if (idx === 1 || idx % 8 === 0) sfx.text();
  },
});
```

**Tuning:** The exact interval depends on taste. `idx % 8` gives ~4 blips per 30-char
line. Test in-browser and adjust — try 6, 8, or 10 until the pace matches OG Emerald.

**Compare with DialogBox:** `DialogBox.tsx:38` only fires `onStart` (1 blip per line).
That's intentionally sparser since in-game NPC dialog is faster-paced. Birch's intro
should be denser than NPCs but less than current (every 3rd char is too much).

### B2b: Gender menu flashes for one frame before text finishes typing

**Problem:** When the Birch speech transitions to the "Are you a boy or a girl?" phase
(`GENDER_SELECT`), the BOY/GIRL selection menu appears for a single render frame, then
hides, then reappears correctly after the text finishes typing. The flash is subtle but
visible — especially on slower devices or when text speed is set to fast.

**Root cause:** When `phase` changes to `GENDER_SELECT`, there's one render cycle where:
1. `phase === "GENDER_SELECT"` is true (phase just changed)
2. `allTextShown` evaluates true because `isTyping` is still false from the PREVIOUS
   text and `textLineIndex >= textLines.length - 1` holds from the previous sequence
3. `showGenderMenu = phase === "GENDER_SELECT" && allTextShown` → true for one frame
4. Next frame: `showText()` fires, `isTyping` becomes true, `allTextShown` flips false
5. Menu hides, text types out, menu reappears correctly when text finishes

**File:** `src/components/game/BirchSpeechLayer.tsx:372-377`

```typescript
// Current:
const allTextShown =
  !isTyping && textLineIndex >= textLines.length - 1;

// Fix — require that displayed text actually has content (not stale from previous phase):
const allTextShown =
  !isTyping && textLineIndex >= textLines.length - 1 && displayedText.length > 0;
```

This ensures the menu only renders AFTER the current phase's text has actually been
displayed, not when residual state from the previous phase is still in the refs.

**Testing:**
1. Start NEW GAME → Birch speech begins
2. Advance through all lines until "Are you a boy? Or a girl?"
3. Watch carefully — BOY/GIRL menu should NOT flash before the text finishes typing
4. After text finishes → BOY/GIRL menu appears cleanly
5. Also test NAME_CONFIRM phase — same `allTextShown` guard applies to `showConfirmMenu`

### B2c: Verify opening/intro music loops correctly

**Status:** Likely NOT a code bug — `BGMManager.ts` sets `audio.loop = true` for all
file-based tracks including "birch" (line 304, 350). Both the title screen ("intro")
and Birch speech ("birch") are in `TRACK_MAP`.

**Verification steps:**
1. Open `/explore` → title screen music plays
2. Wait 3+ minutes — does the music loop seamlessly or stop/gap?
3. Select NEW GAME → Birch music starts
4. Wait through the full Birch speech without pressing A — does music loop?
5. If music stops: check the `.ogg` file duration (`public/game/audio/bgm/mus_birch.ogg`)
   vs audible content — there may be trailing silence making it seem like it stopped

**If music genuinely doesn't loop:** The `audio.loop` property should handle it. If
there's a gap, the audio file may need its silence trimmed, or the `ended` event may
be firing before `loop` kicks in (unlikely but browser-dependent). Add a fallback:
```typescript
audio.addEventListener("ended", () => {
  if (audio.loop) { audio.currentTime = 0; audio.play(); }
});
```

**If music loops fine:** Close this subtask — no fix needed.

---

## TASK B3: Badge Condition Refinement [LOW RISK]

### B3a: PUBLICATION badge requires opening all paper URLs (not just collecting)

**Current behavior:** The PUBLICATION (SCHOLAR) badge is awarded when the player
collects all 10 papers (`papersCollected.length >= TOTAL_PAPERS`). The player can
collect every paper without ever opening a single link.

**New behavior:** The badge requires collecting ALL papers AND opening every paper's URL.
This teaches the player early that "opening links matters" — which primes them for the
COMPLETIONIST badge later (open ALL URLs across all categories).

**File:** `src/game/systems/BadgeMilestones.ts:42-46`

```typescript
// Current:
{
  id: "scholar",
  name: "SCHOLAR",
  hint: `Collect all ${TOTAL_PAPERS} papers`,
  condition: (s) => s.papersCollected.length >= TOTAL_PAPERS,
},

// New:
{
  id: "scholar",
  name: "SCHOLAR",
  hint: `Collect and read all ${TOTAL_PAPERS} papers`,
  condition: (s) => {
    if (s.papersCollected.length < TOTAL_PAPERS) return false;
    return s.papersCollected.every(
      (id) => s.urlsOpened.includes(`papers:${id}`),
    );
  },
},
```

**How URL tracking works (already implemented):**
- When the player selects a paper in the Bag and presses USE, it opens the URL and
  records `papers:<itemId>` in `save.urlsOpened`
- `hasUrlOpened("papers:paper_neurips")` → true after the player opened that paper's link
- The badge condition checks that EVERY collected paper has a corresponding urlsOpened entry

**KOSTAS dialog update (content phase):**
KOSTAS's hint for this badge should say: "You've collected the papers, but have you
READ them? Open each one from your BAG." — this nudges the player without being too explicit.

**Testing:**
1. Collect all 10 papers (6 gym + 4 route)
2. Check badge → NOT awarded (papers not opened yet)
3. Open all 10 paper URLs from the Bag (USE action)
4. Check badge → awarded
5. Partial: open 9 of 10 → badge NOT awarded → open the 10th → badge awarded

### B3b: Update KOSTAS gym dialog hint for SCHOLAR badge

**This is a content-phase task (Claude does it).** When KOSTAS's state machine checks
"close to SCHOLAR badge (>80%)", his guidance should mention opening the papers:

```
"You've collected most of the papers."
"But have you READ them?"
"Open each one from your BAG."
"Knowledge isn't collected — it's consumed."
```

No engine work — just dialog text in `interiors.ts` KOSTAS dialogFn. Noted here for
completeness so it doesn't get lost.

---

## Priority Summary

| Task | Subtask | Risk | Effort | Depends on |
|---|---|---|---|---|
| **B1** | B1a: May sprite transparency | None | 5 min | ImageMagick or editor |
| **B1** | B1b: Trainer Card hint text | None | 1 min | Nothing |
| **B2** | B2a: Birch SFX frequency | None | 5 min | Nothing |
| **B2** | B2b: Gender menu flash | None | 1 min | Nothing |
| **B2** | B2c: Music loop verification | None | 5 min | Just testing |
| **B3** | B3a: SCHOLAR badge condition | Low | 5 min | Nothing |
| **B3** | B3b: KOSTAS dialog (content) | None | Content phase | B3a |

All subtasks are independent — can be done in any order. Total effort: ~25 minutes.
