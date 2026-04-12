import { useRef, useState, useCallback, useEffect } from "react";
import {
  setTouchDirection,
  setTouchButton,
  toggleRun,
  touchState,
} from "@/game/systems/TouchInput";
import {
  hapticTap,
  hapticConfirm,
  hapticToggle,
} from "@/game/systems/Haptics";

/**
 * TouchControls — on-screen d-pad + A/B + START/SELECT + RUN toggle
 * rendered below the game viewport on touch devices.
 *
 * The component feeds two input channels at once:
 *
 *   1. `touchState` in TouchInput.ts — boolean flags Phaser scenes
 *      read every frame to drive movement and running.
 *
 *   2. Synthetic `window` KeyboardEvents — fired on press for A/B/
 *      START/arrows so the React overlays that listen via
 *      `useGameKeyboard` (StartMenu, BagMenu, DialogBox, etc.) pick
 *      up touch input without any component-level changes.
 *
 * The d-pad is zone-based (not a joystick): the finger's angle from
 * the d-pad center picks one of the four cardinal directions. Sliding
 * from up to right transitions cleanly — no dead zone between
 * directions, just an 8px dead zone at the very center. A real GBA
 * d-pad can't produce diagonals and neither can this one; grid
 * movement is strictly 4-directional anyway.
 *
 * Visual style takes cues from rokobuljan/gamepad: dark rounded
 * shapes, muted blues for active states, subtle inset shadows. NOT
 * a GBA hardware replica.
 */

type DPadDir = "up" | "down" | "left" | "right";

interface TouchControlsProps {
  visible: boolean;
}

/**
 * Synthetic KeyboardEvent dispatcher. Two subtleties here:
 *
 * 1. Dispatch on `document`, not `window`. Phaser's keyboard input
 *    listens on document. React overlays that listen via `window`
 *    still receive the event because DOM events bubble from document
 *    UP to window.
 *
 * 2. Set `keyCode` alongside `key` and `code`. Phaser 3's key
 *    matching uses numeric keyCode internally. Modern React listeners
 *    use `event.key`. Setting all three keeps both happy.
 */
const KEY_CODES: Record<string, { code: string; keyCode: number }> = {
  a: { code: "KeyA", keyCode: 65 },
  A: { code: "KeyA", keyCode: 65 },
  s: { code: "KeyS", keyCode: 83 },
  S: { code: "KeyS", keyCode: 83 },
  Enter: { code: "Enter", keyCode: 13 },
  Escape: { code: "Escape", keyCode: 27 },
  " ": { code: "Space", keyCode: 32 },
  ArrowUp: { code: "ArrowUp", keyCode: 38 },
  ArrowDown: { code: "ArrowDown", keyCode: 40 },
  ArrowLeft: { code: "ArrowLeft", keyCode: 37 },
  ArrowRight: { code: "ArrowRight", keyCode: 39 },
};

function fireKey(type: "keydown" | "keyup", key: string): void {
  if (typeof document === "undefined") return;
  const meta = KEY_CODES[key] ?? { code: key, keyCode: 0 };
  const evt = new KeyboardEvent(type, {
    key,
    code: meta.code,
    keyCode: meta.keyCode,
    which: meta.keyCode,
    bubbles: true,
    cancelable: true,
  });
  // Some Phaser versions read keyCode from the readonly property
  // directly; the constructor's `keyCode` option is ignored in
  // newer browsers. Fall back to defineProperty so Phaser still
  // sees the correct code.
  try {
    Object.defineProperty(evt, "keyCode", { value: meta.keyCode });
    Object.defineProperty(evt, "which", { value: meta.keyCode });
  } catch {
    /* ignore */
  }
  document.dispatchEvent(evt);
}

export default function TouchControls({ visible }: TouchControlsProps) {
  if (!visible) return null;
  return (
    <>
      {/* Fullscreen button lives OUTSIDE the touch zone so its
          `position: fixed` anchors to the viewport top-right instead
          of being clipped/occluded by the A button in the bottom
          touch bar. Keeping it mounted alongside TouchControls means
          it only renders on touch devices. */}
      <FullscreenButton />
      <div style={controlsZoneStyle}>
        <div style={leftClusterStyle}>
          <DPad />
          <RunToggle />
        </div>
        <div style={centerClusterStyle}>
          <StartButton />
        </div>
        <div style={rightClusterStyle}>
          <ActionButtons />
        </div>
      </div>
    </>
  );
}

// ── D-Pad ──────────────────────────────────────────────────────────

function DPad() {
  const padRef = useRef<HTMLDivElement>(null);
  const activeDirRef = useRef<DPadDir | null>(null);
  const [activeDir, setActiveDir] = useState<DPadDir | null>(null);

  const dirFromTouch = useCallback((clientX: number, clientY: number): DPadDir | null => {
    const pad = padRef.current;
    if (!pad) return null;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) return null; // center dead zone
    // -180..-45 = up, -45..45 = right, 45..135 = down, 135..180 = left.
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle >= -45 && angle < 45) return "right";
    if (angle >= 45 && angle < 135) return "down";
    if (angle >= -135 && angle < -45) return "up";
    return "left";
  }, []);

  const applyDir = useCallback((next: DPadDir | null) => {
    const prev = activeDirRef.current;
    if (prev === next) return;
    activeDirRef.current = next;
    setActiveDir(next);
    setTouchDirection(next);
    // Fire synthetic keyup for the previous direction so React menus
    // don't see stuck arrows, then keydown for the new one.
    if (prev) fireKey("keyup", `Arrow${prev.charAt(0).toUpperCase() + prev.slice(1)}`);
    if (next) fireKey("keydown", `Arrow${next.charAt(0).toUpperCase() + next.slice(1)}`);
    // Haptic tap only on genuine direction change (we already
    // bailed on `prev === next` above) and only when a new
    // direction is active — releases should be silent.
    if (next) hapticTap();
  }, []);

  // Native (non-passive) touch listeners so preventDefault actually
  // works. React's synthetic onTouchStart / onTouchMove attach as
  // PASSIVE listeners in modern React, which silently ignores
  // preventDefault and triggers the page-scroll behavior.
  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;
    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      applyDir(dirFromTouch(t.clientX, t.clientY));
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      applyDir(dirFromTouch(t.clientX, t.clientY));
    };
    const onEnd = (e: TouchEvent) => {
      e.preventDefault();
      applyDir(null);
    };
    pad.addEventListener("touchstart", onStart, { passive: false });
    pad.addEventListener("touchmove", onMove, { passive: false });
    pad.addEventListener("touchend", onEnd, { passive: false });
    pad.addEventListener("touchcancel", onEnd, { passive: false });
    return () => {
      pad.removeEventListener("touchstart", onStart);
      pad.removeEventListener("touchmove", onMove);
      pad.removeEventListener("touchend", onEnd);
      pad.removeEventListener("touchcancel", onEnd);
    };
  }, [dirFromTouch, applyDir]);

  return (
    <div
      ref={padRef}
      style={dpadContainerStyle}
      aria-label="Direction pad"
    >
      <div style={{ ...dpadArmBase, ...dpadArmVert, top: 0, ...(activeDir === "up" ? dpadArmActive : {}) }} />
      <div style={{ ...dpadArmBase, ...dpadArmVert, bottom: 0, ...(activeDir === "down" ? dpadArmActive : {}) }} />
      <div style={{ ...dpadArmBase, ...dpadArmHoriz, left: 0, ...(activeDir === "left" ? dpadArmActive : {}) }} />
      <div style={{ ...dpadArmBase, ...dpadArmHoriz, right: 0, ...(activeDir === "right" ? dpadArmActive : {}) }} />
      <div style={dpadCenterStyle} />
    </div>
  );
}

// ── Action buttons (A / B) ────────────────────────────────────────

function ActionButtons() {
  return (
    <div style={actionButtonsContainer}>
      <MomentaryButton
        label="B"
        styleOverride={bButtonStyle}
        touchButton="cancel"
        keyChar="s"
        haptic="tap"
      />
      <MomentaryButton
        label="A"
        styleOverride={aButtonStyle}
        touchButton="confirm"
        keyChar="a"
        haptic="confirm"
      />
    </div>
  );
}

interface MomentaryButtonProps {
  label: string;
  styleOverride: React.CSSProperties;
  touchButton: "confirm" | "cancel" | "menu";
  keyChar: string;
  /** Which haptic pulse to fire on press. Omit for no vibration. */
  haptic?: "tap" | "confirm";
}

/**
 * Shared press/release wiring for any momentary button (A, B, START).
 * Sets the `touchState` flag, fires the synthetic KeyboardEvent for
 * React overlays, highlights the visual state on press. Haptic fires
 * on press only (not release) so the player feels a single tap per
 * interaction, not a buzz on both touchstart and touchend.
 */
function MomentaryButton({ label, styleOverride, touchButton, keyChar, haptic }: MomentaryButtonProps) {
  const [pressed, setPressed] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  // Native non-passive listeners so preventDefault stops scrolling.
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      setPressed(true);
      setTouchButton(touchButton, true);
      fireKey("keydown", keyChar);
      if (haptic === "confirm") hapticConfirm();
      else if (haptic === "tap") hapticTap();
    };
    const onEnd = (e: TouchEvent) => {
      e.preventDefault();
      setPressed(false);
      setTouchButton(touchButton, false);
      fireKey("keyup", keyChar);
    };
    // Click fallback for desktop / Playwright where touch events
    // don't fire. Still useful during dev testing.
    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      setTouchButton(touchButton, true);
      fireKey("keydown", keyChar);
      setTimeout(() => {
        setTouchButton(touchButton, false);
        fireKey("keyup", keyChar);
      }, 50);
    };
    btn.addEventListener("touchstart", onStart, { passive: false });
    btn.addEventListener("touchend", onEnd, { passive: false });
    btn.addEventListener("touchcancel", onEnd, { passive: false });
    btn.addEventListener("click", onClick);
    return () => {
      btn.removeEventListener("touchstart", onStart);
      btn.removeEventListener("touchend", onEnd);
      btn.removeEventListener("touchcancel", onEnd);
      btn.removeEventListener("click", onClick);
    };
  }, [touchButton, keyChar, haptic]);

  return (
    <div
      ref={btnRef}
      style={{ ...styleOverride, ...(pressed ? pressedBtnStyle : {}) }}
      aria-label={label}
      role="button"
    >
      {label}
    </div>
  );
}

// ── START button ──────────────────────────────────────────────────

function StartButton() {
  return (
    <MomentaryButton
      label="START"
      styleOverride={systemBtnStyle}
      touchButton="menu"
      keyChar="Escape"
      haptic="tap"
    />
  );
}

// ── Fullscreen button ────────────────────────────────────────────
//
// M6/M7: iOS Safari + iOS Brave don't implement the HTML5 Fullscreen
// API (`element.requestFullscreen()` is undefined on iPhone). The
// button previously called `document.documentElement.requestFullscreen?.()`
// which silently no-op'd on iPhone, so the user saw a button that
// did nothing.
//
// Fix: two-pronged.
//
//   (a) Detect whether the real API is available. If yes, use it.
//   (b) If not, toggle a `gkos-pseudo-fullscreen` class on <html>
//       that makes the game fill 100svh, hides the Astro navbar, and
//       prevents body scroll. The browser chrome will still be
//       visible but the ENTIRE viewport below it becomes the game.
//
// M7: moved the button out of the TouchControls DOM tree into a
// separate portal rendered by the parent, so its `position: fixed`
// anchors to the viewport (not the bottom-anchored touch bar where
// `top: 12` meant "12px from the top of the 180px touch bar, which
// put it DIRECTLY above the A button").

const PSEUDO_FULLSCREEN_CLASS = "gkos-pseudo-fullscreen";

function supportsRealFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const de = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: unknown;
    msRequestFullscreen?: unknown;
  };
  return !!(
    de.requestFullscreen ||
    de.webkitRequestFullscreen ||
    de.msRequestFullscreen
  );
}

function enterPseudoFullscreen(): void {
  document.documentElement.classList.add(PSEUDO_FULLSCREEN_CLASS);
}

function exitPseudoFullscreen(): void {
  document.documentElement.classList.remove(PSEUDO_FULLSCREEN_CLASS);
}

function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(
        !!document.fullscreenElement ||
          document.documentElement.classList.contains(PSEUDO_FULLSCREEN_CLASS),
      );
    };
    document.addEventListener("fullscreenchange", handler);
    // Also listen for the pseudo-fullscreen class changes so the
    // button label updates when we toggle it manually.
    const mo = new MutationObserver(handler);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    handler();
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const toggle = () => {
      const hasReal = supportsRealFullscreen();
      const isCurrentlyFull =
        !!document.fullscreenElement ||
        document.documentElement.classList.contains(PSEUDO_FULLSCREEN_CLASS);

      if (isCurrentlyFull) {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
        exitPseudoFullscreen();
        hapticTap();
        return;
      }

      // Try the real API first. requestFullscreen() can throw
      // synchronously OR return a rejecting promise depending on
      // browser + gesture context (non-gesture calls fail both ways).
      // Wrap in try/catch + .then/.catch so both failure modes fall
      // through to the CSS pseudo-fullscreen path.
      let realFailed = !hasReal;
      if (hasReal) {
        try {
          const de = document.documentElement as HTMLElement & {
            webkitRequestFullscreen?: () => Promise<void> | void;
          };
          const req =
            de.requestFullscreen?.bind(de) ||
            de.webkitRequestFullscreen?.bind(de);
          const result = req?.();
          if (result && typeof (result as Promise<void>).then === "function") {
            (result as Promise<void>).catch(() => {
              enterPseudoFullscreen();
            });
          }
        } catch {
          realFailed = true;
        }
      }
      if (realFailed) {
        enterPseudoFullscreen();
      }
      hapticTap();
    };
    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    };
    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    };
    btn.addEventListener("touchstart", onStart, { passive: false });
    btn.addEventListener("click", onClick);
    return () => {
      btn.removeEventListener("touchstart", onStart);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div
      ref={btnRef}
      style={fullscreenBtnStyle}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      role="button"
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFullscreen ? "✕" : "⛶"}
    </div>
  );
}

// ── RUN toggle ────────────────────────────────────────────────────

function RunToggle() {
  const [active, setActive] = useState(touchState.running);
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const handleTap = () => {
      const next = toggleRun();
      setActive(next);
      hapticToggle();
    };
    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      handleTap();
    };
    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      handleTap();
    };
    btn.addEventListener("touchstart", onStart, { passive: false });
    btn.addEventListener("click", onClick);
    return () => {
      btn.removeEventListener("touchstart", onStart);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div
      ref={btnRef}
      style={{
        ...systemBtnStyle,
        ...(active ? runActiveStyle : {}),
        marginTop: 8,
      }}
      aria-label="Run toggle"
      role="button"
    >
      RUN
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────
//
// Plain style objects. The button look is inspired by rokobuljan's
// gamepad: dark rounded surfaces, muted blue-gray accents on press,
// subtle inset shadows for depth. No bright colors.

// Controls zone is a transparent overlay ON TOP of the game canvas.
// The zone ITSELF doesn't block clicks — only the d-pad / buttons
// inside it accept touches (via touchAction: none on each control).
// `pointerEvents: "none"` on the zone + `pointerEvents: "auto"` on
// each interactive child lets touches PASS THROUGH the empty space
// between controls so the game world remains tappable underneath.
const controlsZoneStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: "var(--touch-bar-h, 180px)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  padding: "0 16px 20px 16px",
  background: "transparent",
  pointerEvents: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  zIndex: 9000,
  fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
};

const leftClusterStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  pointerEvents: "auto",
};

const centerClusterStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  pointerEvents: "auto",
  alignSelf: "flex-end",
  paddingBottom: 4,
};

const rightClusterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  pointerEvents: "auto",
};

// D-Pad ----------------------------------------------------------
// Sized up from 96px to 140px (and 44px arms) so it's a proper
// thumb-sized target on a real phone. Semi-transparent dark fill
// so the game world shows through when the d-pad sits on grass.

const DPAD_SIZE = 140;
const ARM_LENGTH = 46;
const ARM_THICKNESS = 46;

const dpadContainerStyle: React.CSSProperties = {
  position: "relative",
  width: DPAD_SIZE,
  height: DPAD_SIZE,
  touchAction: "none",
};

const dpadArmBase: React.CSSProperties = {
  position: "absolute",
  background: "rgba(30, 30, 35, 0.55)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  borderRadius: 6,
  // Border split into individual properties so the active-state
  // override can set `borderColor` without React warning about
  // mixing shorthand (`border`) and non-shorthand (`borderColor`).
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "rgba(255, 255, 255, 0.12)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.4)",
};

const dpadArmVert: React.CSSProperties = {
  width: ARM_THICKNESS,
  height: ARM_LENGTH,
  left: (DPAD_SIZE - ARM_THICKNESS) / 2,
};

const dpadArmHoriz: React.CSSProperties = {
  width: ARM_LENGTH,
  height: ARM_THICKNESS,
  top: (DPAD_SIZE - ARM_THICKNESS) / 2,
};

const dpadArmActive: React.CSSProperties = {
  background: "rgba(80, 130, 200, 0.7)",
  borderColor: "rgba(140, 180, 255, 0.6)",
  boxShadow:
    "inset 0 2px 4px rgba(0,0,0,0.3), 0 0 12px rgba(100,150,255,0.5)",
};

const dpadCenterStyle: React.CSSProperties = {
  position: "absolute",
  left: (DPAD_SIZE - ARM_THICKNESS) / 2,
  top: (DPAD_SIZE - ARM_THICKNESS) / 2,
  width: ARM_THICKNESS,
  height: ARM_THICKNESS,
  background: "rgba(15, 15, 20, 0.55)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  borderRadius: 4,
};

// A / B buttons --------------------------------------------------
// Up from 54px to 68px — bigger touch target for the most-used
// buttons. Stacked diamond layout: B to the left, A to the right,
// matching real GBA button positions.

const BTN_SIZE = 68;

const actionButtonsContainer: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  marginBottom: 12,
};

const actionBtnBase: React.CSSProperties = {
  width: BTN_SIZE,
  height: BTN_SIZE,
  borderRadius: "50%",
  border: "2px solid rgba(255,255,255,0.18)",
  color: "rgba(255,255,255,0.85)",
  fontSize: 22,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  boxShadow:
    "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
  cursor: "pointer",
  touchAction: "none",
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
};

const aButtonStyle: React.CSSProperties = {
  ...actionBtnBase,
  background: "rgba(50, 70, 100, 0.55)",
};

const bButtonStyle: React.CSSProperties = {
  ...actionBtnBase,
  background: "rgba(40, 40, 50, 0.55)",
};

const pressedBtnStyle: React.CSSProperties = {
  background: "rgba(80, 130, 200, 0.75)",
  boxShadow:
    "0 0 12px rgba(100,150,255,0.5), inset 0 2px 4px rgba(0,0,0,0.4)",
};

// START / RUN pills ----------------------------------------------

const systemBtnStyle: React.CSSProperties = {
  minWidth: 64,
  padding: "7px 14px",
  borderRadius: 14,
  background: "rgba(20, 20, 25, 0.55)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "rgba(255,255,255,0.65)",
  fontSize: 11,
  letterSpacing: 1.5,
  fontWeight: 600,
  textAlign: "center",
  cursor: "pointer",
  touchAction: "none",
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
};

const runActiveStyle: React.CSSProperties = {
  background: "rgba(60, 100, 160, 0.7)",
  borderColor: "rgba(140, 180, 255, 0.5)",
  color: "rgba(180, 210, 255, 0.95)",
};

// ── Fullscreen button ─────────────────────────────────────────────
// M7: Anchored to the VIEWPORT top-right via `position: fixed` so it
// sits above the Astro navbar on touch devices. Previously used
// `position: absolute` which resolved against the bottom-anchored
// controlsZoneStyle — that put the button directly above the A
// button, occluding the action controls.
//
// safe-area-inset-top pushes the button below the iPhone notch in
// landscape / status bar in portrait. Z-index is above the navbar
// (z-50) so the button is always tappable.

const fullscreenBtnStyle: React.CSSProperties = {
  position: "fixed",
  // Positioned TOP-LEFT so it doesn't collide with the
  // PortraitBanner's dismiss ✕ button (which sits top-right on
  // portrait devices). The banner is 30px tall absolute under the
  // navbar, so we drop the button below both: navbar (~60) + banner
  // (30) + a bit of breathing room. Safe-area insets handle the
  // iPhone notch in both portrait and landscape.
  top: "calc(env(safe-area-inset-top, 0px) + 100px)",
  left: "calc(env(safe-area-inset-left, 0px) + 10px)",
  width: 44,
  height: 44,
  borderRadius: 10,
  background: "rgba(20, 20, 25, 0.82)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  touchAction: "none",
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
  pointerEvents: "auto",
  // Above the PortraitBanner (9500) and the touch bar (9000) and
  // everything else. 9600 gives a clean headroom.
  zIndex: 9600,
  boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
};
