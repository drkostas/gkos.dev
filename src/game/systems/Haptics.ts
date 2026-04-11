/**
 * Haptics — small wrappers around the Vibration API.
 *
 * Short, subtle pulses intended to make touch buttons feel like GBA
 * hardware rather than a phone notification. Each helper is a silent
 * no-op on platforms without `navigator.vibrate` (notably iOS Safari,
 * which blocks the Vibration API entirely) so callers can fire them
 * unconditionally — zero risk, zero guards needed at the call site.
 *
 * ## When to fire
 *
 * Haptic feedback should ONLY fire on genuine state transitions:
 *
 *   ✅ D-pad direction changes (Up → Right), NOT every `touchmove`
 *   ✅ A / B / START presses, NOT releases
 *   ✅ RUN toggle flip
 *
 * Firing on every `touchmove` frame produces a continuous buzz that
 * feels like a phone ringing. Track `lastDirection` in the d-pad
 * handler and only call `hapticTap()` when the new direction differs.
 *
 * ## Duration tuning
 *
 *   - 15ms: tap / direction change. Barely perceptible; matches OG
 *     GBA button click.
 *   - 25ms: confirm actions (A button, menu accept). Slightly firmer.
 *   - [15, 40, 15]: double-pulse for binary toggles (RUN on/off).
 *     The pause between pulses is what communicates "state changed".
 */

/** Lazy-resolved vibrate function — avoids SSR crashes. */
function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw on invalid patterns or while backgrounded.
    // Haptics are cosmetic — swallow and move on.
  }
}

/** Subtle tap — d-pad direction change, B / START press. */
export function hapticTap(): void {
  vibrate(15);
}

/** Firmer pulse — A button press, menu confirm. */
export function hapticConfirm(): void {
  vibrate(25);
}

/** Double-pulse — RUN toggle and other on/off state flips. */
export function hapticToggle(): void {
  vibrate([15, 40, 15]);
}
