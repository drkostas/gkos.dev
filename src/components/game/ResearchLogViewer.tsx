import { useRef, useState } from "react";
import { LOG_ENTRIES, getUnlockedEntries, type LogEntry } from "@/game/data/researchLog";
import { sfx } from "@/game/systems/SoundManager";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";
import { useMenuNavigation } from "@/game/hooks/useMenuNavigation";

interface Props {
  onClose: () => void;
}

const FONT = "var(--pkmn-font, 'Courier New', monospace)";
const sY = "var(--ui-scale-y, 1)";

export default function ResearchLogViewer({ onClose }: Props) {
  const { index: cursor, moveUp: cursorUp, moveDown: cursorDown } =
    useMenuNavigation(LOG_ENTRIES.length);
  const [reading, setReading] = useState<LogEntry | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  const unlocked = getUnlockedEntries();

  // Reading an entry: A or B closes the read view. List mode: arrows
  // navigate, A opens a read, B exits the log entirely. Two separate
  // hook calls so only one listener is active at a time.
  useGameKeyboard(reading !== null, {
    confirm: () => { sfx.select(); setReading(null); },
    cancel: () => { sfx.select(); setReading(null); },
  });

  useGameKeyboard(reading === null, {
    up: () => { sfx.select(); cursorUp(); },
    down: () => { sfx.select(); cursorDown(); },
    confirm: () => {
      const entry = LOG_ENTRIES[cursorRef.current];
      if (entry && unlocked.some((u) => u.number === entry.number)) {
        sfx.confirm();
        setReading(entry);
      }
    },
    cancel: () => { sfx.select(); onCloseRef.current(); },
    menu: () => { sfx.select(); onCloseRef.current(); },
  });

  // ── Reading an entry ──────────────────────────────────
  if (reading) {
    return (
      <div style={overlayStyle}>
        <div style={frameStyle}>
          <div style={readingTitleStyle}>#{reading.number}: {reading.title}</div>
          <div style={readingBodyStyle}>
            {reading.text.map((line, i) => (
              <div key={i} style={readingLineStyle}>{line}</div>
            ))}
          </div>
          <div style={footerStyle}>Press A or B to close</div>
        </div>
      </div>
    );
  }

  // ── Entry list ────────────────────────────────────────
  return (
    <div style={overlayStyle}>
      <div style={frameStyle}>
        <div style={headerStyle}>RESEARCH LOG</div>
        <div style={listStyle}>
          {LOG_ENTRIES.map((entry, i) => {
            const isUnlocked = unlocked.some((u) => u.number === entry.number);
            const isSel = cursor === i;
            return (
              <div
                key={entry.number}
                style={{
                  ...rowStyle,
                  ...(isSel ? rowSelectedStyle : {}),
                }}
              >
                <span style={cursorCol}>{isSel ? "\u25B6" : "\u00A0"}</span>
                <span style={numberCol}>#{entry.number}:</span>
                {isUnlocked ? (
                  <>
                    <span style={titleCol}>{entry.title}</span>
                    <span style={checkCol}>{"\u2713"}</span>
                  </>
                ) : (
                  <>
                    <span style={{ ...titleCol, color: "#888" }}>
                      ??? ({entry.threshold - (unlocked.length > 0 ? unlocked[unlocked.length - 1].threshold : 0)} more needed)
                    </span>
                    <span style={checkCol} />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div style={footerStyle}>A: Read  B: Close</div>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 260,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.6)",
  pointerEvents: "auto",
};

const frameStyle: React.CSSProperties = {
  position: "relative",
  width: `calc(380px * ${sY})`,
  maxHeight: "80vh",
  overflow: "hidden",
  fontFamily: FONT,
  color: "#000",
  borderStyle: "solid",
  borderColor: "transparent",
  borderWidth: `calc(24px * ${sY})`,
  borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
  borderImageSlice: "8 fill",
  borderImageRepeat: "stretch",
  borderImageWidth: `calc(24px * ${sY})`,
  background: "transparent",
  imageRendering: "pixelated",
  boxSizing: "content-box",
  padding: `calc(8px * ${sY}) calc(10px * ${sY})`,
};

const headerStyle: React.CSSProperties = {
  fontSize: `calc(18px * ${sY})`,
  fontWeight: 700,
  textAlign: "center",
  marginBottom: `calc(8px * ${sY})`,
  letterSpacing: "1px",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `calc(2px * ${sY})`,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  fontSize: `calc(14px * ${sY})`,
  padding: `calc(2px * ${sY}) calc(4px * ${sY})`,
  lineHeight: 1.4,
};

const rowSelectedStyle: React.CSSProperties = {
  background: "rgba(56,104,192,0.15)",
};

const cursorCol: React.CSSProperties = {
  width: `calc(14px * ${sY})`,
  flexShrink: 0,
  fontSize: `calc(12px * ${sY})`,
};

const numberCol: React.CSSProperties = {
  width: `calc(30px * ${sY})`,
  flexShrink: 0,
  fontWeight: 700,
};

const titleCol: React.CSSProperties = {
  flex: 1,
};

const checkCol: React.CSSProperties = {
  width: `calc(16px * ${sY})`,
  textAlign: "right",
  color: "#2a7a2a",
  flexShrink: 0,
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: `calc(12px * ${sY})`,
  color: "#888",
  marginTop: `calc(8px * ${sY})`,
};

const readingTitleStyle: React.CSSProperties = {
  fontSize: `calc(16px * ${sY})`,
  fontWeight: 700,
  marginBottom: `calc(10px * ${sY})`,
  borderBottom: `calc(1px * ${sY}) solid #ccc`,
  paddingBottom: `calc(4px * ${sY})`,
};

const readingBodyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `calc(4px * ${sY})`,
};

const readingLineStyle: React.CSSProperties = {
  fontSize: `calc(15px * ${sY})`,
  lineHeight: 1.6,
};
