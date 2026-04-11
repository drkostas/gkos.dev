import { useRef, useState, useCallback } from "react";
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
 * Fire a synthetic `KeyboardEvent` so React overlays that listen via
 * `useGameKeyboard` pick up touch input. Bubble + cancelable so any
 * `preventDefault` guards behave as they would for real keystrokes.
 */
function fireKey(type: "keydown" | "keyup", key: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new KeyboardEvent(type, { key, bubbles: true, cancelable: true }),
  );
}

export default function TouchControls({ visible }: TouchControlsProps) {
  if (!visible) return null;
  return (
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

  const handleTouch = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      applyDir(dirFromTouch(t.clientX, t.clientY));
    },
    [dirFromTouch, applyDir],
  );

  const handleEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      applyDir(null);
    },
    [applyDir],
  );

  return (
    <div
      ref={padRef}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
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
  const onStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setPressed(true);
      setTouchButton(touchButton, true);
      fireKey("keydown", keyChar);
      if (haptic === "confirm") hapticConfirm();
      else if (haptic === "tap") hapticTap();
    },
    [touchButton, keyChar, haptic],
  );
  const onEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setPressed(false);
      setTouchButton(touchButton, false);
      fireKey("keyup", keyChar);
    },
    [touchButton, keyChar],
  );
  return (
    <div
      onTouchStart={onStart}
      onTouchEnd={onEnd}
      onTouchCancel={onEnd}
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

// ── RUN toggle ────────────────────────────────────────────────────

function RunToggle() {
  const [active, setActive] = useState(touchState.running);
  const onTap = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const next = toggleRun();
    setActive(next);
    hapticToggle();
  }, []);
  return (
    <div
      onTouchStart={onTap}
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

const controlsZoneStyle: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  height: "var(--touch-bar-h, 120px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 20px",
  background: "rgba(0, 0, 0, 0.88)",
  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  userSelect: "none",
  WebkitUserSelect: "none",
  touchAction: "none",
  zIndex: 9000,
  fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
};

const leftClusterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const centerClusterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const rightClusterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
};

// D-Pad ----------------------------------------------------------

const DPAD_SIZE = 96;
const ARM_LENGTH = 32;
const ARM_THICKNESS = 32;

const dpadContainerStyle: React.CSSProperties = {
  position: "relative",
  width: DPAD_SIZE,
  height: DPAD_SIZE,
};

const dpadArmBase: React.CSSProperties = {
  position: "absolute",
  background: "#2a2a2a",
  borderRadius: 4,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.5)",
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
  background: "#3a4a5a",
  boxShadow:
    "inset 0 2px 4px rgba(0,0,0,0.3), 0 0 8px rgba(100,150,255,0.3)",
};

const dpadCenterStyle: React.CSSProperties = {
  position: "absolute",
  left: (DPAD_SIZE - ARM_THICKNESS) / 2,
  top: (DPAD_SIZE - ARM_THICKNESS) / 2,
  width: ARM_THICKNESS,
  height: ARM_THICKNESS,
  background: "#1a1a1a",
  borderRadius: 2,
};

// A / B buttons --------------------------------------------------

const BTN_SIZE = 54;

const actionButtonsContainer: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const actionBtnBase: React.CSSProperties = {
  width: BTN_SIZE,
  height: BTN_SIZE,
  borderRadius: "50%",
  border: "2px solid rgba(255,255,255,0.15)",
  color: "rgba(255,255,255,0.75)",
  fontSize: 18,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow:
    "0 2px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const aButtonStyle: React.CSSProperties = {
  ...actionBtnBase,
  background: "#283848",
};

const bButtonStyle: React.CSSProperties = {
  ...actionBtnBase,
  background: "#2a2a2a",
};

const pressedBtnStyle: React.CSSProperties = {
  background: "#3a4a5a",
  boxShadow:
    "0 0 8px rgba(100,150,255,0.35), inset 0 2px 4px rgba(0,0,0,0.4)",
};

// START / RUN pills ----------------------------------------------

const systemBtnStyle: React.CSSProperties = {
  minWidth: 56,
  padding: "6px 12px",
  borderRadius: 12,
  background: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.55)",
  fontSize: 11,
  letterSpacing: 1.5,
  textAlign: "center",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const runActiveStyle: React.CSSProperties = {
  background: "#2a3a4a",
  borderColor: "rgba(100,150,255,0.4)",
  color: "rgba(140,180,255,0.95)",
};
