/**
 * TouchInput — shared touch-state bridge between the React TouchControls
 * overlay and the Phaser scenes.
 *
 * Two input paths feed off this module:
 *
 *   1. Phaser scenes poll `touchState` every frame in `update()` and
 *      OR the boolean flags into their existing keyboard checks, e.g.
 *      `cursors.left.isDown || touchState.left`. The scenes never
 *      import React; they just see the shared module state.
 *
 *   2. React overlay components (StartMenu, BagMenu, DialogBox, …)
 *      listen for native KeyboardEvents via `useGameKeyboard`. The
 *      touch overlay dispatches synthetic KeyboardEvents on `window`
 *      when buttons are pressed so every overlay works unchanged.
 *
 * The d-pad helper `setTouchDirection` enforces ONE direction at a
 * time — a real GBA d-pad is a rocker, so pressing up mechanically
 * lifts down. This mirrors that: the finger lives in exactly one
 * directional zone.
 *
 * `running` is a persistent toggle (tapped once to enable, once to
 * disable) rather than a momentary flag — matches the run-toggle
 * button UX in the touch overlay.
 */

/** Mutable touch state. Phaser scenes read these flags each frame. */
export const touchState = {
  up: false,
  down: false,
  left: false,
  right: false,
  /** A button (confirm) — momentary. */
  confirm: false,
  /** B button (cancel) — momentary. */
  cancel: false,
  /** START — momentary. */
  menu: false,
  /** Run toggle — persistent (tap to flip). */
  running: false,
};

/** Exactly one d-pad direction, clearing the others. Pass null to release. */
export function setTouchDirection(
  dir: "up" | "down" | "left" | "right" | null,
): void {
  touchState.up = dir === "up";
  touchState.down = dir === "down";
  touchState.left = dir === "left";
  touchState.right = dir === "right";
}

/** Set a momentary button state. */
export function setTouchButton(
  btn: "confirm" | "cancel" | "menu",
  pressed: boolean,
): void {
  touchState[btn] = pressed;
}

/** Toggle the run flag. Returns the new state so the UI can reflect it. */
export function toggleRun(): boolean {
  touchState.running = !touchState.running;
  return touchState.running;
}

/**
 * Touch-device detection. We look at both `ontouchstart` (the older
 * but still widely supported signal) and `navigator.maxTouchPoints`
 * (the modern Pointer Events signal, handles iPad Safari etc.).
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
