# Opening Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the OG Emerald title screen + Birch speech intro sequence as a React-based opening flow before Phaser boots.

**Architecture:** Single React state machine (`OpeningScreen.tsx`) with two visual layers (TitleScreen, BirchSpeech). CSS animations for fades/slides, canvas for logo shine, rAF loop for cloud scroll + Rayquaza pulse. Returning players skip Birch and go straight to game after pressing Start.

**Tech Stack:** React, CSS animations, Canvas 2D, existing DialogBox styling, BGMManager for music.

---

## Flow Overview

```
First visit:
  TITLE → press start → BIRCH SPEECH → gender → name → shrink → GAME

Returning visit (save exists):
  TITLE → press start → fade → GAME
```

## Phase 1: Title Screen

### Layers (back to front)

1. **Rayquaza BG** (128x128, tiled to fill) — static silhouette, pulsing gem color (cosine wave every 4 frames: R=31-i*31, G=31-i*22, B=12)
2. **Clouds BG** (128x56, repeating) — scrolls vertically 0.5px/frame, scanline wave wobble (CSS `filter` or canvas distortion)
3. **Pokemon Logo** (256x64) — starts at Y=-32, slides to Y=0 over ~64 frames (1px/2frames). Initially lightened/washed, clears on Phase 2
4. **Logo Shine** — diagonal stripe mask sweeps left→right at 4px/frame. Three sweeps:
   - Sweep 1: simple pass, no BG change
   - Sweep 2: double (two sprites at 8px/frame), BG brightens/darkens
   - Sweep 3: single with green flash (RGB 24,31,12) at center
5. **Version Banner** ("EXPLORE MODE", 128x32) — slides from Y=2 to Y=66, alpha 0→1 over 64 frames
6. **"Press Start"** (128x24) — blinks 16 frames on / 16 frames off

### Timing (at 60fps, ~16.67ms/frame)

| Event | Frame | Time |
|-------|-------|------|
| Fade in from white | 0-16 | 0-267ms |
| Music starts (mus_intro) | 0 | 0ms |
| Shine #1 (simple) | 0 | 0ms |
| Shine #2 (double + BG) | 80 | 1.33s |
| Shine #3 (single + green flash) | 192 | 3.2s |
| Version banner starts sliding | 256 | 4.27s |
| Press Start appears | 400 | 6.67s |
| Logo at final Y=0 | ~384 | 6.4s |
| Idle (press start blinks) | 400+ | 6.67s+ |
| Press Start → fade to white | user input | 16 frames (267ms) |

### Skip behavior
Any button during Phase 1 (shines + banner) → skip to idle state immediately.

---

## Phase 2: Birch Speech (first visit only)

### Background
- Solid black initially
- Platform gradient (yellow-brown, 9-step palette fade) emerges with Birch
- Platform is `shadow.png` (128x24) rendered as BG element

### Sequence

| Step | Action | Duration |
|------|--------|----------|
| 1 | Fade in from black | 267ms |
| 2 | Wait | 167ms |
| 3 | Birch + platform fade in (alpha 0→1) | 2.67s |
| 4 | Wait 1.33s, then open text box | - |
| 5 | Text: "Hello there! Welcome to the world of POKEMON!" | wait for A |
| 6 | Text: "My name is KOSTAS. But everyone calls me the ML PROFESSOR!" | wait for A |
| 7 | Text: "This world is inhabited by creatures called POKEMON... er, I mean PROJECTS!" | wait for A |
| 8 | Birch+Lotad fade out (533ms), platform slides left 60px (500ms) | ~533ms |
| 9 | Player sprite (Brendan) fades in at right side | 533ms |
| 10 | Text: "Now tell me, are you a boy? Or a girl?" | wait for A |
| 11 | Gender menu: BOY / GIRL | arrow select + A |
| 12 | On gender change: old sprite slides right (+4px/frame), new slides in from right (240→180, -4px/frame) | ~15 frames |
| 13 | Text: "All right. What's your name?" | wait for A |
| 14 | Name input screen opens | user types + confirms |
| 15 | Return from naming, sprites re-init, fade from black | 267ms |
| 16 | Text: "So it's [NAME]?" | Yes/No menu |
| 17 | If No → back to name input | - |
| 18 | Text: "[NAME]! Are you ready? Your very own adventure is about to unfold!" | wait for A |
| 19 | Player shrinks (CSS scale 1→0 over 48 frames/800ms) + moves down 0.75px/frame | 800ms |
| 20 | BG fades to black (267ms), BGM fades out | 267ms |
| 21 | Player sprite fades to white (267ms) | 267ms |
| 22 | Save playerName + playerGender to GameSave | - |
| 23 | Cleanup → start Phaser game | - |

### Music
- `mus_birch.ogg` starts when Birch fades in
- Fades out during player shrink

---

## Phase 3: Returning Player

If `GameSave.playerName` exists in localStorage:
- Title screen plays normally
- Press Start → fade to white → start Phaser game directly
- No Birch speech, no name input

---

## Component Structure

```
src/components/game/
  OpeningScreen.tsx        — top-level state machine, mounts before Phaser
  TitleScreenLayer.tsx     — renders all title screen visuals + animations
  BirchSpeechLayer.tsx     — renders Birch intro + gender/name flow
```

### OpeningScreen.tsx
- State machine: `phase` enum drives which layer renders
- Checks localStorage for existing save on mount
- On completion: calls `onComplete()` callback → PhaserGame mounts

### TitleScreenLayer.tsx
- Canvas element for logo shine effect (OBJ_WINDOW masking)
- CSS animated elements for logo slide, banner slide, fade
- rAF loop for cloud scroll + Rayquaza pulse
- "Press Start" blink via CSS animation

### BirchSpeechLayer.tsx
- Birch sprite with CSS opacity transition
- Platform gradient (CSS gradient or image)
- Text box (reuse existing dialog box frame styling)
- Gender select menu (two-option OG-style menu)
- Name input (text field styled as OG keyboard, or simple input)
- Player sprite with CSS scale+translate animation for shrink

---

## Assets to Extract

From `/tmp/pokeemerald/graphics/`:

| Source | Destination | Notes |
|--------|------------|-------|
| title_screen/pokemon_logo.png | public/game/ui/opening/pokemon_logo.png | 256x64 |
| title_screen/rayquaza.png | public/game/ui/opening/rayquaza.png | 128x128, need RGBA conversion |
| title_screen/clouds.png | public/game/ui/opening/clouds.png | 128x56, need RGBA conversion |
| title_screen/logo_shine.png | public/game/ui/opening/logo_shine.png | 64x64 |
| title_screen/press_start.png | public/game/ui/opening/press_start.png | 128x24, remove copyright row |
| title_screen/emerald_version.png | — | Reference only, we create custom |
| birch_speech/birch.png | public/game/ui/opening/birch.png | 64x64 |
| birch_speech/shadow.png | public/game/ui/opening/shadow.png | 128x24 |
| trainers/front_pics/brendan.png | public/game/ui/opening/brendan.png | 64x64 |
| trainers/front_pics/may.png | public/game/ui/opening/may.png | 64x64 |

Custom assets to create:
- `explore_version.png` — "EXPLORE MODE" in same pixel style as "EMERALD VERSION"

---

## GameSave Extensions

Add to `GameSave` interface:
```typescript
playerName: string;    // default ""
playerGender: "boy" | "girl";  // default "boy"
```

Check `save.playerName !== ""` to determine first visit vs returning.

---

## Mobile Detection

Before mounting OpeningScreen:
```typescript
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
if (isMobile) {
  // Show "Visit gkos.dev/explore on desktop!" message
  // Don't boot Phaser
}
```
