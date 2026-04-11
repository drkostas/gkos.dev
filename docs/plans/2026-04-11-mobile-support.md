# Explore Mode — Mobile Touch Controls

> Full spec for adding mobile support to the Pokemon explore mode.
> Visual style inspired by [rokobuljan/gamepad](https://github.com/rokobuljan/gamepad) —
> clean, minimal, circular buttons with subtle shadows. NOT a GBA hardware replica.

---

## 1. Architecture Overview

The game has two input consumers that work differently:

| Consumer | Pattern | Example |
|---|---|---|
| **Phaser scenes** | Poll flags every frame in `update()` | `this.cursors.up.isDown` |
| **React components** | Event-driven `window keydown` | `useGameKeyboard` hook |

Mobile touch controls feed BOTH channels:
1. **Phaser** — a shared `touchState` object with boolean flags. Scenes OR it with
   keyboard input: `this.cursors.up.isDown || touchState.up`
2. **React** — synthetic `KeyboardEvent` dispatches on `window`. The `useGameKeyboard`
   hook picks them up with zero changes to any React component.

This means **zero changes** to the 18 React overlay components. The only scene changes
are adding `|| touchState.X` to movement input checks.

---

## 2. Layout

**Landscape-only.** Controls sit BELOW the game canvas in a dedicated zone.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              GAME VIEWPORT (flex: 1)             │
│           Phaser canvas fills this area           │
│                                                  │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│   ┌───────┐                         [B]   [A]   │
│   │ D-PAD │         [RUN]                        │
│   └───────┘                      [SEL] [START]   │
│                                                  │
└──────────────────────────────────────────────────┘
     controls zone: fixed height ~110-130px
```

**Portrait:** Show a "rotate your device" overlay with the Pokemon logo. Don't boot
Phaser or show controls.

**Why below, not overlaid:** Overlay controls obscure the game world. Every major GBA
emulator (mGBA, RetroArch, EmulatorJS) puts controls in a separate zone on mobile.
The game viewport is smaller but fully visible.

---

## 3. Visual Style (rokobuljan/gamepad inspired)

**General aesthetic:**
- Dark semi-transparent background for the controls zone (`rgba(0,0,0,0.85)`)
- Rounded, slightly raised buttons with subtle inset shadows
- Muted colors — NOT bright neon. Dark grays, muted blues, soft whites
- Touch feedback: button presses show a subtle glow/highlight (CSS `is-active` class)
- Font: the game's pixel font (`--pkmn-font`) for button labels

**D-Pad:**
- NOT a joystick — a 4-directional d-pad (cross shape)
- Dark gray cross on slightly lighter background
- Each arm highlights on press (lighter gray / subtle blue glow)
- No diagonal inputs — grid movement is 4-directional only
- Size: ~90px total cross, each arm ~30px wide

**A / B Buttons:**
- Circular, ~44px diameter (Apple HIG minimum touch target)
- A button: right side, muted blue-gray with "A" label
- B button: left of A, slightly smaller or same size, darker gray with "B" label
- Diamond layout (A right, B left) matching GBA — NOT vertical stack
- Press state: subtle inset shadow + slight color shift

**START / SELECT:**
- Small pill-shaped buttons (not circular), ~28px tall
- Centered between d-pad and A/B
- Muted, low-contrast — not prominent (rarely used)
- START = opens menu (maps to Escape/M)
- SELECT = unused for now (reserve for future debug or help)

**RUN Toggle:**
- Small shoe/boot icon or "RUN" text pill near the d-pad
- Toggle state: OFF (walk) = dimmed, ON (run) = highlighted with accent color
- Tap to toggle, not hold. Stays in the selected mode until tapped again
- Default: OFF (walking)

---

## 4. Implementation

### 4a. Touch Input System — `src/game/systems/TouchInput.ts` (~50 lines)

Shared state between the React touch overlay and Phaser scenes.

```typescript
/** Mutable touch state — Phaser scenes poll this in update(). */
export const touchState = {
  up: false,
  down: false,
  left: false,
  right: false,
  confirm: false,    // A button
  cancel: false,     // B button
  menu: false,       // START
  running: false,    // RUN toggle (persistent, not momentary)
};

/** Set exactly one d-pad direction (clears others). */
export function setTouchDirection(dir: "up" | "down" | "left" | "right" | null): void {
  touchState.up = dir === "up";
  touchState.down = dir === "down";
  touchState.left = dir === "left";
  touchState.right = dir === "right";
}

/** Set a button state (momentary — true on press, false on release). */
export function setTouchButton(
  btn: "confirm" | "cancel" | "menu",
  pressed: boolean,
): void {
  touchState[btn] = pressed;
}

/** Toggle run mode. */
export function toggleRun(): void {
  touchState.running = !touchState.running;
}

/** Check if device has touch support. */
export function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );
}
```

**Key constraint:** `setTouchDirection` enforces ONE direction at a time. A real GBA
d-pad is a rocker — pressing up mechanically lifts down. Our touch d-pad replicates
this: the finger can only be in one directional zone at a time.

### 4b. Touch Controls Component — `src/components/game/TouchControls.tsx` (~250 lines)

React component rendered below the Phaser canvas.

```typescript
interface TouchControlsProps {
  visible: boolean;
}

export default function TouchControls({ visible }: TouchControlsProps) {
  if (!visible) return null;

  return (
    <div style={controlsZoneStyle}>
      <DPad />
      <MiddleButtons />   {/* RUN toggle + START/SELECT */}
      <ActionButtons />   {/* B + A */}
    </div>
  );
}
```

**D-Pad sub-component:**

The d-pad is a cross-shaped touch area. Direction is determined by which zone the
finger is in, computed from the angle between touch point and d-pad center:

```typescript
function DPad() {
  const padRef = useRef<HTMLDivElement>(null);
  const [activeDir, setActiveDir] = useState<string | null>(null);

  const getDirection = (touch: Touch): "up" | "down" | "left" | "right" | null => {
    const rect = padRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) return null; // dead zone in center

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    // -45..45 = right, 45..135 = down, 135..-135 = left, -135..-45 = up
    if (angle >= -45 && angle < 45) return "right";
    if (angle >= 45 && angle < 135) return "down";
    if (angle >= -135 && angle < -45) return "up";
    return "left";
  };

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    const dir = getDirection(e.touches[0]);
    setActiveDir(dir);
    setTouchDirection(dir);
    // Also fire synthetic keydown for React menus (one-shot per direction change)
    if (dir) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: `Arrow${dir.charAt(0).toUpperCase() + dir.slice(1)}` }));
    }
  };

  const handleTouchEnd = () => {
    setActiveDir(null);
    setTouchDirection(null);
  };

  return (
    <div
      ref={padRef}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={dpadContainerStyle}
    >
      {/* Visual cross shape with directional highlights */}
      <div style={{ ...armStyle, ...topArm, ...(activeDir === "up" ? activeArmStyle : {}) }} />
      <div style={{ ...armStyle, ...rightArm, ...(activeDir === "right" ? activeArmStyle : {}) }} />
      <div style={{ ...armStyle, ...bottomArm, ...(activeDir === "down" ? activeArmStyle : {}) }} />
      <div style={{ ...armStyle, ...leftArm, ...(activeDir === "left" ? activeArmStyle : {}) }} />
      <div style={centerStyle} /> {/* center circle */}
    </div>
  );
}
```

**Key behavior:**
- `touchmove` continuously updates direction as finger slides — no dead zone between
  directions, instant transition from Up to Right
- `touchend` clears all directions immediately
- Synthetic `KeyboardEvent` fires on direction CHANGE only (not every touchmove frame)
  — prevents flooding React menus with repeated arrow events

**A/B Buttons sub-component:**

```typescript
function ActionButtons() {
  const fireButton = (btn: "confirm" | "cancel", key: string) => ({
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      setTouchButton(btn, true);
      window.dispatchEvent(new KeyboardEvent("keydown", { key }));
    },
    onTouchEnd: () => {
      setTouchButton(btn, false);
      window.dispatchEvent(new KeyboardEvent("keyup", { key }));
    },
    onTouchCancel: () => {
      setTouchButton(btn, false);
    },
  });

  return (
    <div style={actionButtonsContainer}>
      <button {...fireButton("cancel", "s")} style={bButtonStyle}>B</button>
      <button {...fireButton("confirm", "a")} style={aButtonStyle}>A</button>
    </div>
  );
}
```

**START / RUN buttons** follow the same pattern but START maps to `"Escape"` and RUN
calls `toggleRun()` instead of a key event.

### 4c. Rotate Overlay — `src/components/game/RotateOverlay.tsx` (~40 lines)

Shown in portrait orientation. Detects via CSS media query or JS `matchMedia`.

```typescript
export default function RotateOverlay() {
  const [isPortrait, setIsPortrait] = useState(
    window.innerHeight > window.innerWidth,
  );

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!isPortrait) return null;

  return (
    <div style={rotateOverlayStyle}>
      <div style={{ fontSize: "3rem" }}>📱↩️</div>
      <p>Rotate your device to landscape</p>
      <p style={{ color: "#aaa", fontSize: "0.9rem" }}>
        Explore Mode needs a wider screen
      </p>
    </div>
  );
}
```

Full-screen black overlay with z-index above everything. Disappears when the device
rotates to landscape.

### 4d. Scene Integration — Movement OR

Both `OverworldScene.ts` and `InteriorScene.ts` need the touch state OR'd into
movement input. The change is in the movement direction detection block.

**OverworldScene.ts (~10 lines changed):**

```typescript
// Before (lines 548-553):
const { cursors } = this;
let moveDir: Direction | null = null;
if (cursors.left.isDown) moveDir = Direction.LEFT;
else if (cursors.right.isDown) moveDir = Direction.RIGHT;
else if (cursors.up.isDown) moveDir = Direction.UP;
else if (cursors.down.isDown) moveDir = Direction.DOWN;

// After:
import { touchState } from "@/game/systems/TouchInput";

const { cursors } = this;
let moveDir: Direction | null = null;
if (cursors.left.isDown || touchState.left) moveDir = Direction.LEFT;
else if (cursors.right.isDown || touchState.right) moveDir = Direction.RIGHT;
else if (cursors.up.isDown || touchState.up) moveDir = Direction.UP;
else if (cursors.down.isDown || touchState.down) moveDir = Direction.DOWN;
```

**Also update the running check:**

```typescript
// Before:
const wantsRun = this.shiftKey.isDown;

// After:
const wantsRun = this.shiftKey.isDown || touchState.running;
```

**InteriorScene.ts** — same two changes in its equivalent movement block.

### 4e. Camera Zoom — More Zoomed Out on Mobile

The user wants to see MORE of the map on mobile (more zoomed out than desktop).

**Current:** Both scenes use `PIXEL_SCALE = 3` as camera zoom.

**Change:** Detect mobile and use a lower zoom factor.

```typescript
// In config.ts:
export const MOBILE_PIXEL_SCALE = 2;  // shows more tiles, smaller sprites

// In OverworldScene.ts and InteriorScene.ts:
import { isTouchDevice } from "@/game/systems/TouchInput";

const zoom = isTouchDevice() ? MOBILE_PIXEL_SCALE : PIXEL_SCALE;
this.cameras.main.setZoom(zoom);
```

At zoom 2 (vs 3 on desktop), the player sees 50% more tiles in each direction. Tiles
are smaller but the wider viewport compensates for the smaller screen. Tune the value
in-browser — try 2.0, 2.5, or even 1.5 depending on how it feels on a real phone.

### 4f. ExploreApp.tsx — Remove Mobile Blocker

Replace the current mobile detection (lines 17-54) that shows "requires keyboard":

```typescript
// Before:
if (isMobile) {
  return <div>Explore Mode requires a keyboard...</div>;
}

// After:
// Mobile detection removed — touch controls handle mobile input.
// Portrait orientation is handled by RotateOverlay inside PhaserGame.
```

The `isMobile` check is deleted entirely. All devices get the game. Touch controls
render conditionally based on `isTouchDevice()`.

### 4g. PhaserGame.tsx — Mount Touch Controls

Add `TouchControls` and `RotateOverlay` to the render tree. Adjust the container
layout to flex column so the controls zone sits below the canvas.

```typescript
// Before:
return (
  <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
    <div ref={containerRef} style={{ width: "100%", height: "100%", background: "#000" }} />
    <DialogBox />
    {/* ... overlays ... */}
  </div>
);

// After:
import TouchControls from "./TouchControls";
import RotateOverlay from "./RotateOverlay";
import { isTouchDevice } from "@/game/systems/TouchInput";

const isTouch = isTouchDevice();

return (
  <div style={{
    display: "flex",
    flexDirection: "column",
    width: "100vw",
    height: "100vh",
  }}>
    {/* Game viewport — takes remaining space */}
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", background: "#000" }} />
      <DialogBox />
      <StartMenu />
      {/* ... all existing overlays stay here ... */}
    </div>

    {/* Touch controls — only on touch devices, fixed height */}
    <TouchControls visible={isTouch} />

    {/* Portrait orientation overlay */}
    {isTouch && <RotateOverlay />}
  </div>
);
```

**Phaser scale mode:** The canvas currently uses `Scale.RESIZE` filling `window.innerWidth`
× `window.innerHeight`. With the flex layout, the canvas container's height is
`100vh - controls_height`. Phaser's `RESIZE` mode auto-adapts — it reads the parent
element's dimensions, not the window. This should work without changing `config.ts`.

Verify: if the canvas doesn't resize to fit the flex container, switch to explicit
dimensions:
```typescript
width: containerRef.current.clientWidth,
height: containerRef.current.clientHeight,
```

### 4h. Birch Name Input — Touch Support

The name input in `BirchSpeechLayer` (or `BirchNameInput` if R5 split is done) has
an on-screen letter grid navigated by keyboard. Add `onClick` to each cell:

```typescript
// Each letter cell in the grid:
<div
  key={letter}
  onClick={() => handleLetterInput(letter)}
  style={letterCellStyle}
>
  {letter}
</div>
```

Also add touch-tap on OK and BACKSPACE buttons. This is ~10 lines of `onClick`
handlers on existing elements.

### 4i. Opening Screen + Title Screen — Touch Support

These screens are React-only (no Phaser). They already use `useGameKeyboard` which
receives synthetic `KeyboardEvent`s from the touch A/B buttons. **No changes needed**
— touching A advances the title screen, touching A on the menu selects, etc.

Verify: the touch controls component should render during these screens too (before
PhaserGame mounts). This means `TouchControls` needs to be mounted in `ExploreApp`,
not just `PhaserGame`.

**Updated ExploreApp:**
```typescript
export default function ExploreApp() {
  const [gameStarted, setGameStarted] = useState(false);
  const isTouch = isTouchDevice();

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {!gameStarted && <OpeningScreen onComplete={() => setGameStarted(true)} />}
        {gameStarted && <PhaserGame />}
      </div>
      <TouchControls visible={isTouch} />
      {isTouch && <RotateOverlay />}
    </div>
  );
}
```

This way touch controls are available from the title screen through gameplay.

### 4j. Viewport Meta Tag

Update `explore.astro` to prevent zooming and ensure correct mobile viewport:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
/>
```

`user-scalable=no` prevents double-tap zoom and pinch zoom — both interfere with
game touch input. `viewport-fit=cover` handles notched phones.

---

## 5. What Changes vs. What Doesn't

### New files (~350 lines):
| File | Lines | Purpose |
|---|---|---|
| `src/game/systems/TouchInput.ts` | ~50 | Shared touch state + helpers |
| `src/components/game/TouchControls.tsx` | ~250 | D-pad + A/B + START + RUN overlay |
| `src/components/game/RotateOverlay.tsx` | ~40 | Portrait "rotate device" message |

### Modified files (~60 lines of changes):
| File | Change |
|---|---|
| `src/components/game/ExploreApp.tsx` | Remove mobile blocker, add flex layout + TouchControls + RotateOverlay |
| `src/components/game/PhaserGame.tsx` | Adjust container to flex child, pass through touch control mount if needed |
| `src/game/scenes/OverworldScene.ts` | Movement OR (`\|\| touchState.X`), running OR (~10 lines) |
| `src/game/scenes/InteriorScene.ts` | Same movement + running OR (~10 lines) |
| `src/game/config.ts` | Add `MOBILE_PIXEL_SCALE` constant |
| `src/pages/explore.astro` | Update viewport meta tag |
| `src/components/game/BirchSpeechLayer.tsx` | Add onClick to name input grid cells (~10 lines) |

### Zero changes:
- All 18 React overlay components (useGameKeyboard receives synthetic events)
- All game systems (NPCSystem, GateSystem, DialogSystem, etc.)
- All data files (npcs.ts, gates.ts, party.ts, etc.)
- GameSave, EventBridge, useTypewriter, useMenuNavigation
- Sound effects and BGM

---

## 6. Testing Plan

### Desktop regression:
1. Open `/explore` on desktop browser
2. Touch controls should NOT appear (not a touch device)
3. All keyboard controls work identically to before
4. No layout shift — game fills full viewport

### Mobile (Chrome DevTools device emulation):
1. Toggle device toolbar → select iPhone 14 or Pixel 7
2. Touch controls appear below game canvas
3. Rotate overlay appears in portrait → disappears in landscape
4. D-pad: tap/hold each direction → character moves
5. D-pad: slide finger from Up to Right → direction changes smoothly, no stuck input
6. A button: tap → interacts with NPC / advances dialog
7. B button: tap → closes menu / cancels
8. START: tap → opens start menu
9. RUN toggle: tap → character speed changes, toggle persists
10. All menus (Bag, Party, Pokedex, etc.) respond to A/B/arrows via touch
11. Birch speech: A advances text, name input grid responds to touch taps

### Real device (if available):
12. Connect phone via USB debugging or serve on local network
13. Verify touch responsiveness — no lag between touch and movement
14. Verify d-pad dead zone feels right (8px center)
15. Verify buttons are large enough for fingers (44px minimum)
16. Verify no accidental zoom on double-tap (viewport meta)

---

## 7. CSS Reference (rokobuljan/gamepad style)

```css
/* Controls zone */
.controls-zone {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;  /* prevent browser gestures */
}

/* D-Pad arm */
.dpad-arm {
  background: #2a2a2a;
  border-radius: 4px;
  transition: background 0.05s;
}
.dpad-arm.active {
  background: #3a4a5a;
  box-shadow: 0 0 8px rgba(100, 150, 255, 0.3);
}

/* Action button (A/B) */
.action-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
  background: #2a2a2a;
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--pkmn-font);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: background 0.05s, box-shadow 0.05s;
}
.action-btn:active, .action-btn.pressed {
  background: #3a4a5a;
  box-shadow: 0 0 8px rgba(100, 150, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* START/SELECT pills */
.system-btn {
  padding: 4px 12px;
  border-radius: 10px;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  font-family: var(--pkmn-font);
  font-size: 9px;
  letter-spacing: 1px;
}

/* RUN toggle */
.run-toggle {
  /* same as system-btn but with active state */
}
.run-toggle.active {
  background: #2a3a4a;
  border-color: rgba(100, 150, 255, 0.4);
  color: rgba(100, 150, 255, 0.9);
}
```

---

## 8. Implementation Order

1. `TouchInput.ts` — pure data, no dependencies
2. `RotateOverlay.tsx` — standalone component
3. `TouchControls.tsx` — depends on TouchInput
4. `ExploreApp.tsx` — remove mobile blocker, wire layout + components
5. `explore.astro` — viewport meta tag
6. `OverworldScene.ts` + `InteriorScene.ts` — movement OR + running OR
7. `config.ts` — MOBILE_PIXEL_SCALE
8. `BirchSpeechLayer.tsx` — name input grid onClick
9. Test on Chrome DevTools mobile emulation
10. Test on real device if available

**Estimated effort:** ~400 lines new code, ~60 lines modified. One focused session.

---

## 9. Haptic Feedback

Add subtle vibration on button presses using the Vibration API. Short pulses that
match the GBA button feel — not a phone-call buzz.

### Implementation

Add a `haptic` helper to `TouchInput.ts`:

```typescript
/** Fire a short haptic pulse. No-op on devices without vibration support. */
export function hapticTap(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(15);  // 15ms — subtle tap feel
  }
}

/** Slightly longer pulse for confirm actions (A button, menu select). */
export function hapticConfirm(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(25);
  }
}

/** Double-pulse for toggle state changes (RUN on/off). */
export function hapticToggle(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([15, 40, 15]);  // tap-pause-tap
  }
}
```

### Where to call it

| Action | Haptic | Function |
|---|---|---|
| D-pad direction change | `hapticTap()` | In DPad `handleTouch` when direction changes (not every touchmove) |
| A button press | `hapticConfirm()` | In ActionButtons `onTouchStart` for confirm |
| B button press | `hapticTap()` | In ActionButtons `onTouchStart` for cancel |
| START press | `hapticTap()` | In MiddleButtons `onTouchStart` |
| RUN toggle | `hapticToggle()` | In RUN button handler |

**Key rule:** Only fire haptic on STATE CHANGE, not continuously. The d-pad fires
`hapticTap()` when the direction changes (Up → Right), NOT on every `touchmove` frame
while the finger stays in the same zone. Track `lastDirection` and only fire when it
differs from the new direction.

### Browser support

`navigator.vibrate()` is supported on Android Chrome, Firefox, Samsung Internet. NOT
supported on iOS Safari (Apple blocks the Vibration API). The `if (navigator.vibrate)`
guard makes it a silent no-op on unsupported platforms — zero risk.

### Testing

1. Android device: press A → feel a subtle tap. Press RUN toggle → feel double-tap.
2. iOS device: press A → no vibration, no error, button still works.
3. Desktop: no vibration, no error.

---

## 10. Portrait Mode Support

Instead of blocking portrait with a "rotate" overlay, support it with a stacked layout:
game viewport on top, controls below. The game is playable in portrait — just shows
fewer horizontal tiles.

### Layout — Portrait

```
┌──────────────────────┐
│                      │
│   GAME VIEWPORT      │
│   (wider view,       │
│    less tall)         │
│                      │
├──────────────────────┤
│                      │
│  ┌─────┐    [B] [A]  │
│  │DPAD │             │
│  └─────┘  [SEL][STR] │
│     [RUN]            │
│                      │
└──────────────────────┘
```

The game viewport gets the top portion (flex: 1), controls get the bottom (~130px).
In portrait, the viewport is wider than tall — the camera shows more horizontal tiles
but fewer vertical tiles. This is acceptable because:
- The map is wider than tall (140×120)
- Most navigation is horizontal (routes go left/right)
- The player can still see enough vertically to navigate

### Implementation

**Remove the `RotateOverlay` component entirely.** Replace the orientation-based
blocking with responsive layout:

**ExploreApp / PhaserGame layout:**

```typescript
// The flex-column layout from Section 4g already handles both orientations.
// Portrait: game viewport is short and wide, controls below.
// Landscape: game viewport is tall and wide, controls below.
// Same layout structure — Phaser's RESIZE mode adapts automatically.
```

No layout changes needed — the flex column layout from Section 4g works in both
orientations. The controls zone has a fixed height, the game takes the rest. Phaser
`Scale.RESIZE` reads the parent container dimensions and adapts.

**Camera zoom adjustment for portrait:**

In portrait, the viewport is shorter. The zoom should be slightly MORE zoomed out
than landscape-mobile to compensate:

```typescript
// In scene create():
const isTouch = isTouchDevice();
const isPortrait = window.innerHeight > window.innerWidth;

let zoom = PIXEL_SCALE; // desktop default: 3
if (isTouch) {
  zoom = isPortrait ? 1.5 : MOBILE_PIXEL_SCALE; // portrait: 1.5, landscape: 2
}
this.cameras.main.setZoom(zoom);
```

**Listen for orientation changes** to update zoom at runtime:

```typescript
// In scene create():
const updateZoom = () => {
  if (!isTouchDevice()) return;
  const portrait = window.innerHeight > window.innerWidth;
  this.cameras.main.setZoom(portrait ? 1.5 : MOBILE_PIXEL_SCALE);
};

window.addEventListener("resize", updateZoom);
// Store for cleanup in shutdown:
this.orientationCleanup = () => window.removeEventListener("resize", updateZoom);
```

**Phaser canvas resize:** The canvas needs to resize when orientation changes.
Phaser's `Scale.RESIZE` should handle this automatically since the parent flex
container resizes. If it doesn't, force a resize:

```typescript
window.addEventListener("resize", () => {
  this.scale.resize(
    this.scale.gameSize.width,
    this.scale.gameSize.height,
  );
});
```

### Controls layout in portrait

The controls zone layout should adapt slightly for portrait — the screen is narrower,
so buttons might need tighter spacing:

```css
/* Portrait: tighter padding, slightly smaller d-pad */
@media (orientation: portrait) {
  .controls-zone {
    padding: 8px 12px;
  }
  .dpad-container {
    transform: scale(0.85);
  }
}
```

Or use the CSS container query approach — the controls zone reads its own width and
scales accordingly.

### Landscape suggestion banner

Instead of blocking portrait, show a **dismissible banner** at the top of the screen
suggesting landscape mode. Non-intrusive — the player can ignore it.

```typescript
// Inside TouchControls or as a sibling component
const [showBanner, setShowBanner] = useState(
  window.innerHeight > window.innerWidth,
);

// Auto-dismiss when user rotates to landscape
useEffect(() => {
  const mq = window.matchMedia("(orientation: landscape)");
  const handler = (e: MediaQueryListEvent) => {
    if (e.matches) setShowBanner(false);
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}, []);

// Render (only in portrait, only until dismissed or rotated):
{showBanner && (
  <div style={bannerStyle}>
    <span>📱 Rotate to landscape for the best experience</span>
    <button onClick={() => setShowBanner(false)} style={dismissBtnStyle}>✕</button>
  </div>
)}
```

**Behavior:**
- Shows ONCE when the game loads in portrait
- Auto-hides when the player rotates to landscape
- Dismiss button (✕) hides it permanently for the session
- Does NOT block gameplay — sits as a thin bar above the game viewport
- Does NOT reappear after dismissal (even if player rotates back to portrait)

**Style:** Semi-transparent dark bar, one line of text, dismiss X on the right.
Same font as the rest of the game UI. ~30px tall, doesn't steal significant viewport.

### What to change from the original spec

- `RotateOverlay.tsx` becomes a **banner**, not a full-screen blocker
- It no longer prevents the game from rendering
- The flex column layout works identically in both orientations
- Banner is the only portrait-specific UI element

### Testing

1. **Portrait phone:** Game renders in top portion, controls below. Viewport shows
   fewer vertical tiles but gameplay is functional.
2. **Rotate to landscape:** Game viewport expands, zoom adjusts to 2. Controls stay
   at bottom.
3. **Rotate back to portrait:** Zoom adjusts to 1.5. No crash, no layout break.
4. **Desktop browser resize (tall narrow window):** No controls shown (not touch
   device). Game fills full viewport as before.

---

## 11. Future Enhancements (NOT in this task)

- Customizable button size/position (settings menu)
- Swipe gestures for menu navigation
- Physical gamepad support (Gamepad API for Bluetooth controllers)
