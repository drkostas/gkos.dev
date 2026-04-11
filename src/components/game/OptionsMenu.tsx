import { useEffect, useRef, useState } from "react";
import {
  getSettings,
  setSetting,
  type TextSpeed,
} from "@/game/systems/Settings";
import { sfx } from "@/game/systems/SoundManager";
import {
  GameEvents,
  emitGameEvent,
  setDebugMode,
} from "@/game/EventBridge";

interface OptionsMenuProps {
  onClose: () => void;
}

const TEXT_SPEEDS: TextSpeed[] = ["slow", "mid", "fast"];
const FRAME_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Row = "TEXT SPEED" | "FRAME" | "SHOW COORDS";
const ROWS: Row[] = ["TEXT SPEED", "FRAME", "SHOW COORDS"];

/**
 * Pokemon Emerald-style Options screen.
 *
 * Three settings:
 *  - TEXT SPEED  (Slow / Mid / Fast)
 *  - FRAME       (1..10, picks one of pret's text_window borders)
 *  - SHOW COORDS (debug overlay toggle)
 *
 * Use arrow keys to navigate rows; left/right to change values.
 * Escape / X / Backspace closes.
 */
export default function OptionsMenu({ onClose }: OptionsMenuProps) {
  const [settings, setSettings] = useState(() => getSettings());
  const [rowIndex, setRowIndex] = useState(0);
  // confirmingClear removed — New Game moved to HELP screen

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ── Setting modifier helpers ─────────────────────────────────
  const cycleTextSpeed = (delta: 1 | -1) => {
    const idx = TEXT_SPEEDS.indexOf(settings.textSpeed);
    const next = TEXT_SPEEDS[(idx + delta + TEXT_SPEEDS.length) % TEXT_SPEEDS.length];
    setSetting("textSpeed", next);
    setSettings((s) => ({ ...s, textSpeed: next }));
  };

  const cycleFrame = (delta: 1 | -1) => {
    const idx = FRAME_INDICES.indexOf(settings.frameIndex);
    const next = FRAME_INDICES[(idx + delta + FRAME_INDICES.length) % FRAME_INDICES.length];
    setSetting("frameIndex", next);
    setSettings((s) => ({ ...s, frameIndex: next }));
  };

  const toggleCoords = () => {
    const next = !settings.showCoords;
    setSetting("showCoords", next);
    setDebugMode(next);
    emitGameEvent(GameEvents.TOGGLE_DEBUG, next);
    setSettings((s) => ({ ...s, showCoords: next }));
  };

  // ── Keyboard input ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Confirm dialog handles its own keys.
      if (e.key === "s" || e.key === "S" || e.key === "Backspace") {
        e.preventDefault();
        sfx.select();
        onCloseRef.current();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        sfx.select();
        setRowIndex((i) => (i <= 0 ? ROWS.length - 1 : i - 1));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        sfx.select();
        setRowIndex((i) => (i >= ROWS.length - 1 ? 0 : i + 1));
        return;
      }
      const row = ROWS[rowIndex];
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        sfx.optionChange();
        if (row === "TEXT SPEED") cycleTextSpeed(-1);
        else if (row === "FRAME") cycleFrame(-1);
        else if (row === "SHOW COORDS") toggleCoords();
      } else if (e.key === "ArrowRight" || e.key === "a" || e.key === "A" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        sfx.optionChange();
        if (row === "TEXT SPEED") cycleTextSpeed(1);
        else if (row === "FRAME") cycleFrame(1);
        else if (row === "SHOW COORDS") toggleCoords();
        // CLEAR PROGRESS removed — use NEW GAME in HELP screen
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowIndex, settings]);

  // ── Render ───────────────────────────────────────────────────
  const sY = "var(--ui-scale-y, 1)";

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div style={titleStyle}>OPTION</div>

        <Row
          label="TEXT SPEED"
          value={labelForSpeed(settings.textSpeed)}
          selected={ROWS[rowIndex] === "TEXT SPEED"}
          sY={sY}
        />
        <Row
          label="FRAME"
          value={`TYPE ${settings.frameIndex}`}
          selected={ROWS[rowIndex] === "FRAME"}
          sY={sY}
        />
        <Row
          label="SHOW COORDS"
          value={settings.showCoords ? "ON" : "OFF"}
          selected={ROWS[rowIndex] === "SHOW COORDS"}
          sY={sY}
        />
        <div style={hintStyle}>
          ◀▶ change&nbsp;&nbsp;ESC back
        </div>
      </div>
    </div>
  );
}

function labelForSpeed(s: TextSpeed): string {
  return s === "slow" ? "SLOW" : s === "mid" ? "MID" : "FAST";
}

function Row({
  label,
  value,
  selected,
  sY,
}: {
  label: string;
  value: string;
  selected: boolean;
  sY: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: `calc(5px * ${sY}) calc(8px * ${sY})`,
        background: selected ? "rgba(0,0,0,0.08)" : "transparent",
        borderRadius: `calc(2px * ${sY})`,
        fontSize: `calc(17px * ${sY})`,
        color: "#000",
        gap: `calc(20px * ${sY})`,
      }}
    >
      <span>
        <span style={{ display: "inline-block", width: `calc(14px * ${sY})` }}>
          {selected ? "\u25B6" : "\u00A0"}
        </span>
        {label}
      </span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const FONT = "var(--pkmn-font, 'Courier New', monospace)";

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 250,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  // No dim — keep the world visible behind, like the main StartMenu.
  background: "transparent",
  pointerEvents: "none",
};

const panelStyle: React.CSSProperties = {
  width: "calc(320px * var(--ui-scale-y, 1))",
  borderStyle: "solid",
  borderWidth: "calc(24px * var(--ui-scale-y, 1))",
  borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
  borderImageSlice: "8 fill",
  borderImageRepeat: "stretch",
  borderImageWidth: "calc(24px * var(--ui-scale-y, 1))",
  background: "transparent",
  padding: "calc(8px * var(--ui-scale-y, 1)) calc(12px * var(--ui-scale-y, 1))",
  fontFamily: FONT,
  color: "#000",
  imageRendering: "pixelated",
  outline: "none",
  display: "flex",
  flexDirection: "column",
  gap: "calc(2px * var(--ui-scale-y, 1))",
  pointerEvents: "auto",
};

const titleStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "calc(20px * var(--ui-scale-y, 1))",
  fontWeight: 700,
  letterSpacing: "2px",
  marginBottom: "calc(8px * var(--ui-scale-y, 1))",
};

const hintStyle: React.CSSProperties = {
  marginTop: "calc(10px * var(--ui-scale-y, 1))",
  textAlign: "center",
  fontSize: "calc(13px * var(--ui-scale-y, 1))",
  color: "rgba(0, 0, 0, 0.55)",
};

