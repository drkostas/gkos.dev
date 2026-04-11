import { useEffect, useRef, useState } from "react";
import { sfx } from "@/game/systems/SoundManager";
import { getSave } from "@/game/systems/GameSave";
import { BADGES, getBadgeStatuses } from "@/game/systems/BadgeMilestones";
import { getSteps, formatSteps } from "@/game/systems/StepStore";
import { getItemsByPocket } from "@/game/data/itemDefinitions";
import { POKEDEX } from "@/game/data/pokemon";

interface HelpScreenProps {
  onClose: () => void;
}

const FONT = "var(--pkmn-font, 'Courier New', monospace)";
/** Scale a pixel value by --ui-scale-y. */
const S = (px: number) => `calc(${px}px * var(--ui-scale-y, 1))`;

export default function HelpScreen({ onClose }: HelpScreenProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetCursor, setResetCursor] = useState(0);

  const doReset = () => {
    if (typeof localStorage !== "undefined") {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("gkos:explore:"));
      for (const k of keys) localStorage.removeItem(k);
    }
    window.location.reload();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmReset) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault(); sfx.select(); setResetCursor((c) => (c === 0 ? 1 : 0));
        } else if (e.key === "a" || e.key === "A" || e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (resetCursor === 1) { sfx.confirm(); doReset(); }
          else { sfx.select(); setConfirmReset(false); }
        } else if (e.key === "s" || e.key === "S" || e.key === "Backspace") {
          e.preventDefault(); sfx.select(); setConfirmReset(false);
        }
        return;
      }
      if (e.key === "a" || e.key === "A" || e.key === " " || e.key === "Enter") {
        e.preventDefault(); sfx.select(); setConfirmReset(true); setResetCursor(0);
        return;
      }
      if (e.key === "s" || e.key === "S" || e.key === "Backspace" || e.key === "Escape" || e.key === "m" || e.key === "M") {
        e.preventDefault(); sfx.select(); onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmReset, resetCursor]);

  const save = getSave();
  const badgeStatuses = getBadgeStatuses();
  const steps = getSteps();
  const totalPapers = getItemsByPocket("papers").length;
  const totalBlogs = getItemsByPocket("blogs").length;
  const totalTMs = getItemsByPocket("tms").length;
  const totalPokedex = POKEDEX.length;
  const totalKeyItems = getItemsByPocket("keyItems").length;

  return (
    <div style={overlayStyle}>
      <div style={frameStyle}>
        {/* Two-column layout */}
        <div style={columnsStyle}>

          {/* ── Left column: Controls + Objectives ── */}
          <div style={colStyle}>
            <div style={sectionTitleStyle}>CONTROLS</div>
            <div style={lineStyle}>Arrows: Move</div>
            <div style={lineStyle}>Shift: Run</div>
            <div style={lineStyle}>A/Enter: Interact</div>
            <div style={lineStyle}>S/Backspace: Back</div>
            <div style={lineStyle}>Esc/M: Menu</div>

            <div style={{ ...sectionTitleStyle, marginTop: "1.5cqi" }}>OBJECTIVES</div>
            {badgeStatuses.map(({ badge, earned }) => (
              <div key={badge.id} style={objectiveRowStyle}>
                <span style={checkColStyle}>
                  {badge.id === "champion" && !earned ? "" : earned ? "\u2713" : "\u25A1"}
                </span>
                <span style={badgeNameStyle}>
                  {badge.id === "champion" && !earned ? "???" : badge.name}
                </span>
              </div>
            ))}
          </div>

          {/* ── Right column: Progress + New Game ── */}
          <div style={colStyle}>
            <div style={sectionTitleStyle}>PROGRESS</div>
            <ProgressRow label="Badges" cur={save.badges.length} total={BADGES.length} />
            <ProgressRow label="Papers" cur={save.papersCollected.length} total={totalPapers} />
            <ProgressRow label="Blogs" cur={save.blogsCollected.length} total={totalBlogs} />
            <ProgressRow label="Pokemon" cur={save.pokedexSeen.length} total={totalPokedex} />
            <ProgressRow label="TMs" cur={save.tmsCollected.length} total={totalTMs} />
            <ProgressRow label="Key Items" cur={save.keyItemsCollected.length} total={totalKeyItems} />
            <ProgressRow label="Steps" cur={steps} total={0} raw={formatSteps(steps)} />
            <ProgressRow label="Zones" cur={save.zonesVisited.length} total={5} />

            <div style={{ ...sectionTitleStyle, marginTop: "1.5cqi" }}>&nbsp;</div>
            <div
              style={newGameStyle}
              onClick={() => { sfx.select(); setConfirmReset(true); setResetCursor(0); }}
            >
              {"\u25B6"} NEW GAME
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>A: New Game&nbsp;&nbsp;&nbsp;B: Close</div>
      </div>

      {/* ── Confirmation overlay ── */}
      {confirmReset && (
        <div style={confirmOverlayStyle}>
          <div style={confirmBoxStyle}>
            <div style={{ fontSize: S(20), fontWeight: 700, marginBottom: S(8) }}>
              NEW GAME
            </div>
            <div style={{ fontSize: S(16), color: "#444", lineHeight: 1.5, marginBottom: S(12) }}>
              Are you sure? All progress will
              be erased permanently.
            </div>
            <div style={{ display: "flex", gap: S(20), justifyContent: "center" }}>
              <span
                style={{ ...confirmOptStyle, ...(resetCursor === 0 ? confirmSelStyle : {}) }}
                onClick={() => { sfx.select(); setConfirmReset(false); }}
              >
                {resetCursor === 0 ? "\u25B6 " : "\u00A0\u00A0"}NO
              </span>
              <span
                style={{ ...confirmOptStyle, ...(resetCursor === 1 ? confirmSelStyle : {}), color: resetCursor === 1 ? "#c03028" : undefined }}
                onClick={() => { sfx.confirm(); doReset(); }}
              >
                {resetCursor === 1 ? "\u25B6 " : "\u00A0\u00A0"}YES
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressRow({ label, cur, total, raw }: { label: string; cur: number; total: number; raw?: string }) {
  return (
    <div style={progRowStyle}>
      <span style={progLabelStyle}>{label}</span>
      <span style={progValueStyle}>{raw ?? `${cur}/${total}`}</span>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────── */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 250,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.6)",
  pointerEvents: "auto",
};

const frameStyle: React.CSSProperties = {
  position: "relative",
  width: "min(135vh, 90vw)",
  height: "min(90vh, 60vw)",
  overflow: "hidden",
  imageRendering: "pixelated",
  fontFamily: FONT,
  containerType: "inline-size",
  background: "#f8f8f8",
  borderStyle: "solid",
  borderColor: "transparent",
  borderWidth: "calc(24px * var(--ui-scale-y, 1))",
  borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
  borderImageSlice: "8 fill",
  borderImageRepeat: "stretch",
  borderImageWidth: "calc(24px * var(--ui-scale-y, 1))",
  boxSizing: "content-box",
  padding: "2cqi 3cqi",
  color: "#1c2438",
  display: "flex",
  flexDirection: "column",
};

const columnsStyle: React.CSSProperties = {
  display: "flex",
  gap: "3cqi",
  flex: 1,
  minHeight: 0,
};

const colStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "2.8cqi",
  fontWeight: 700,
  letterSpacing: "0.5px",
  borderBottom: "1px solid #bbb",
  paddingBottom: "0.5cqi",
  marginBottom: "0.8cqi",
  color: "#3868c0",
};

const lineStyle: React.CSSProperties = {
  fontSize: "2.2cqi",
  lineHeight: 1.6,
};

const objectiveRowStyle: React.CSSProperties = {
  fontSize: "2.2cqi",
  lineHeight: 1.7,
  display: "flex",
  gap: "0.5cqi",
};

const checkColStyle: React.CSSProperties = {
  width: "2.5cqi",
  flexShrink: 0,
};

const badgeNameStyle: React.CSSProperties = {
  fontWeight: 700,
};

const progRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "2.2cqi",
  lineHeight: 1.7,
};

const progLabelStyle: React.CSSProperties = {
  fontWeight: 700,
};

const progValueStyle: React.CSSProperties = {
  color: "#585858",
};

const newGameStyle: React.CSSProperties = {
  fontSize: "2.2cqi",
  fontWeight: 700,
  color: "#c03028",
  cursor: "pointer",
  marginTop: "0.5cqi",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "2cqi",
  color: "#888",
  marginTop: "1cqi",
  flexShrink: 0,
};

const confirmOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.5)",
  pointerEvents: "auto",
};

const confirmBoxStyle: React.CSSProperties = {
  fontFamily: FONT,
  color: "#000",
  textAlign: "center",
  borderStyle: "solid",
  borderColor: "transparent",
  borderWidth: S(24),
  borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
  borderImageSlice: "8 fill",
  borderImageRepeat: "stretch",
  borderImageWidth: S(24),
  background: "transparent",
  imageRendering: "pixelated",
  boxSizing: "content-box",
  padding: `${S(14)} ${S(24)}`,
};

const confirmOptStyle: React.CSSProperties = {
  fontSize: S(18),
  fontFamily: FONT,
  fontWeight: 700,
  cursor: "pointer",
  padding: `${S(4)} ${S(14)}`,
};

const confirmSelStyle: React.CSSProperties = {
  background: "rgba(56,104,192,0.15)",
};
