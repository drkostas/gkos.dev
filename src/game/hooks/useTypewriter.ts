import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useTypewriter — shared character-by-character text reveal hook.
 *
 * Unifies the typewriter logic that previously lived inline in
 * DialogBox and BirchSpeechLayer. Handles the setTimeout loop, live
 * speed resolution (for Options-menu speed changes mid-line), start /
 * skip / reset transitions, and cleanup on unmount.
 *
 * Consumers pass a `speedMs` value or getter plus optional callbacks:
 *   - `onStart`    — fires at the beginning of every `start()` call,
 *                    before the first tick. Used by DialogBox and
 *                    BirchSpeechLayer to play the initial `sfx.text()`
 *                    blip, matching OG Pokemon Emerald behavior.
 *   - `onChar`     — fires after each character reveal. The 1-based
 *                    char index lets callers throttle SFX (e.g. Birch
 *                    plays an extra blip every 3 chars).
 *   - `onComplete` — fires exactly once when the full text is shown,
 *                    whether via natural typing or `skipToEnd()`.
 */

interface UseTypewriterOptions {
  /**
   * Milliseconds between characters. Pass a getter function to make
   * live Options-menu speed changes take effect immediately — the
   * hook re-evaluates the speed before every tick.
   */
  speedMs: number | (() => number);
  onStart?: () => void;
  onChar?: (charIndex: number) => void;
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  /** The text currently visible. Grows character by character. */
  displayedText: string;
  /** True while a typing animation is in progress. */
  isTyping: boolean;
  /**
   * Begin revealing a new string. Cancels any in-flight animation,
   * resets `displayedText`, plays `onStart`, and schedules the first
   * tick. Safe to call with an empty string — emits `onComplete`
   * immediately and leaves `displayedText` empty.
   */
  start: (text: string) => void;
  /**
   * Cancel the pending timer and display the full target text.
   * `isTyping` flips to false and `onComplete` fires (once).
   */
  skipToEnd: () => void;
  /**
   * Cancel any in-flight animation and clear state without firing
   * `onComplete`. Use when closing a dialog that was mid-type.
   */
  reset: () => void;
}

export function useTypewriter(
  opts: UseTypewriterOptions,
): UseTypewriterReturn {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Pending setTimeout handle — cleared on every start/skip/reset
  // and on unmount so we never leak a timer beyond the component.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Full target text of the current animation. skipToEnd() reads
  // this to restore the final string without re-running any logic.
  const targetTextRef = useRef("");
  // Tracks whether onComplete has fired for the current target so
  // natural-finish + skipToEnd can't both fire it.
  const completedRef = useRef(true);

  // Mirror options in a ref so callers don't need to memoize their
  // callbacks; the returned `start`/`skipToEnd` stay stable across
  // renders even when the options object identity changes.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const resolveSpeed = useCallback((): number => {
    const s = optsRef.current.speedMs;
    return typeof s === "function" ? s() : s;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fireComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    optsRef.current.onComplete?.();
  }, []);

  const start = useCallback(
    (text: string) => {
      clearTimer();
      targetTextRef.current = text;
      completedRef.current = false;
      setDisplayedText("");

      if (text.length === 0) {
        setIsTyping(false);
        fireComplete();
        return;
      }

      setIsTyping(true);
      optsRef.current.onStart?.();

      let charIndex = 0;
      const tick = () => {
        charIndex++;
        setDisplayedText(text.slice(0, charIndex));
        optsRef.current.onChar?.(charIndex);
        if (charIndex < text.length) {
          timerRef.current = setTimeout(tick, resolveSpeed());
        } else {
          timerRef.current = null;
          setIsTyping(false);
          fireComplete();
        }
      };
      timerRef.current = setTimeout(tick, resolveSpeed());
    },
    [clearTimer, resolveSpeed, fireComplete],
  );

  const skipToEnd = useCallback(() => {
    clearTimer();
    setDisplayedText(targetTextRef.current);
    setIsTyping(false);
    fireComplete();
  }, [clearTimer, fireComplete]);

  const reset = useCallback(() => {
    clearTimer();
    targetTextRef.current = "";
    completedRef.current = true;
    setDisplayedText("");
    setIsTyping(false);
  }, [clearTimer]);

  // Unmount cleanup — if the component tears down mid-type, clear
  // the pending timer so React's dev-time double-invoke and normal
  // teardown don't leak a setTimeout past the DOM lifetime.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { displayedText, isTyping, start, skipToEnd, reset };
}
