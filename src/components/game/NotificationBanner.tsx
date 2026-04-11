import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GameEvents,
  onGameEvent,
  type NotificationPayload,
} from "@/game/EventBridge";

/**
 * NotificationBanner — non-blocking top-center pill banner.
 *
 *   ┌────────────────────────────┐
 *   │  ♪  TM PYTORCH unlocked!   │
 *   └────────────────────────────┘
 *
 * Slides in from above (300ms), holds visible (3000ms), slides back
 * up and out (300ms). Does not pause the game and does not capture
 * input — `pointerEvents: none` on the whole overlay.
 *
 * If multiple notifications fire in quick succession they are queued
 * and played sequentially. A new notification never interrupts one
 * that's currently animating.
 *
 * Visually distinct from MapNamePopup:
 *   - Top-CENTER (not top-left).
 *   - Dark semi-transparent pill (not the marble/wood popup tile).
 *   - White Pokemon text, optional ♪ / icon prefix.
 */

const SLIDE_MS = 300;
const HOLD_MS = 3000;

type Phase = "hidden" | "sliding_in" | "visible" | "sliding_out";

export default function NotificationBanner() {
  const [current, setCurrent] = useState<NotificationPayload | null>(null);
  const [phase, setPhase] = useState<Phase>("hidden");

  const queueRef = useRef<NotificationPayload[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Set synchronously the moment we start animating a payload so
   * that N rapid dispatches in the same JS tick don't each trigger
   * their own `playNext()` and race to overwrite `current` via
   * setState. Without this, `setCurrent(next)` is queued but the
   * ref stays stale inside the same event loop, so the "is a pump
   * running?" check incorrectly returned false for every dispatch.
   */
  const pumpRunningRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Play the animation for a single payload: hidden → sliding_in →
   * visible → sliding_out → hidden. When it finishes, pull the next
   * payload off the queue (if any) and start again.
   */
  const playNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      pumpRunningRef.current = false;
      setCurrent(null);
      setPhase("hidden");
      return;
    }
    pumpRunningRef.current = true;
    setCurrent(next);
    setPhase("sliding_in");
    timeoutRef.current = setTimeout(() => {
      setPhase("visible");
      timeoutRef.current = setTimeout(() => {
        setPhase("sliding_out");
        timeoutRef.current = setTimeout(() => {
          setPhase("hidden");
          setCurrent(null);
          // Chain into the next queued payload on the next tick so
          // React has a clean "hidden" frame between notifications.
          timeoutRef.current = setTimeout(playNext, 30);
        }, SLIDE_MS);
      }, HOLD_MS);
    }, SLIDE_MS);
  }, []);

  useEffect(() => {
    const unsub = onGameEvent(GameEvents.SHOW_NOTIFICATION, (detail) => {
      const payload = detail as NotificationPayload;
      if (!payload || !payload.message) return;
      queueRef.current.push(payload);
      // If the pump isn't already running, kick it off. Using a ref
      // flag instead of `current` state means rapid synchronous
      // dispatches in the same JS tick don't all race to call
      // playNext (which would overwrite `current` with setState).
      if (!pumpRunningRef.current) {
        playNext();
      }
    });
    return () => {
      unsub();
      clearTimer();
    };
  }, [playNext, clearTimer]);

  if (!current || phase === "hidden" || typeof document === "undefined") {
    return null;
  }

  const isOnScreen = phase === "sliding_in" || phase === "visible";
  const icon = current.icon ?? "♪";

  // Portal into document.body so the banner escapes the astro-island
  // stacking context (the Phaser canvas sibling was hiding it).
  return createPortal(
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        pointerEvents: "none",
        zIndex: 2147483000,
        overflow: "hidden",
        height: "calc(80px * var(--ui-scale-y, 1))",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: isOnScreen
            ? "calc(14px * var(--ui-scale-y, 1))"
            : "calc(-60px * var(--ui-scale-y, 1))",
          left: "50%",
          transform: "translateX(-50%)",
          transition: `top ${SLIDE_MS}ms ease-out`,
          display: "flex",
          alignItems: "center",
          gap: "calc(10px * var(--ui-scale-y, 1))",
          padding:
            "calc(8px * var(--ui-scale-y, 1)) calc(18px * var(--ui-scale-y, 1))",
          background: "rgba(16, 16, 16, 0.88)",
          backdropFilter: "blur(2px)",
          border: "calc(2px * var(--ui-scale-y, 1)) solid rgba(255, 255, 255, 0.18)",
          borderRadius: "calc(24px * var(--ui-scale-y, 1))",
          boxShadow:
            "0 calc(4px * var(--ui-scale-y, 1)) calc(12px * var(--ui-scale-y, 1)) rgba(0, 0, 0, 0.4)",
          fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
          color: "#ffffff",
          letterSpacing: "0.5px",
          whiteSpace: "nowrap",
          imageRendering: "pixelated",
          maxWidth: "calc(560px * var(--ui-scale-y, 1))",
        }}
      >
        <span
          style={{
            fontSize: "calc(18px * var(--ui-scale-y, 1))",
            color: "#ffe070",
            textShadow: "0 0 6px rgba(255, 224, 112, 0.6)",
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: "calc(14px * var(--ui-scale-y, 1))",
            textShadow: "1px 1px 0 rgba(0, 0, 0, 0.6)",
            lineHeight: 1.2,
          }}
        >
          {current.message}
        </span>
      </div>
    </div>,
    document.body,
  );
}
