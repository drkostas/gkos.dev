import { useCallback, useEffect, useRef, useState } from "react";
import { getSave, updateSave, clearSave } from "@/game/systems/GameSave";
import { bgm } from "@/game/systems/BGMManager";
import { sfx } from "@/game/systems/SoundManager";
import TitleScreenLayer from "./TitleScreenLayer";
import BirchSpeechLayer from "./BirchSpeechLayer";

const FONT = "var(--pkmn-font, 'Courier New', monospace)";

type Phase =
  | "title-shines"
  | "title-banner"
  | "title-idle"
  | "title-fadeout"
  | "main-menu"
  | "birch"
  | "done";

interface OpeningScreenProps {
  onComplete: () => void;
}

export default function OpeningScreen({ onComplete }: OpeningScreenProps) {
  const [phase, setPhase] = useState<Phase>("title-shines");
  const [titlePhase, setTitlePhase] = useState<"shines" | "banner" | "idle">("shines");
  const [menuCursor, setMenuCursor] = useState(0);

  const isFirstVisit = getSave().playerName === "";
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Auto-advance title phases
  useEffect(() => {
    const t1 = setTimeout(() => setTitlePhase("banner"), 4300);
    const t2 = setTimeout(() => setTitlePhase("idle"), 5800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handlePressStart = useCallback(() => {
    setPhase("title-fadeout");
    setTimeout(() => {
      if (isFirstVisit) {
        bgm.stop();
        setPhase("birch");
      } else {
        setPhase("main-menu");
      }
    }, 300);
  }, [isFirstVisit]);

  // Main menu keyboard
  useEffect(() => {
    if (phase !== "main-menu") return;
    const menuItems = isFirstVisit ? ["NEW GAME", "OPTION"] : ["RESUME", "NEW GAME", "OPTION"];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault(); sfx.select();
        setMenuCursor((c) => (c <= 0 ? menuItems.length - 1 : c - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault(); sfx.select();
        setMenuCursor((c) => (c >= menuItems.length - 1 ? 0 : c + 1));
      } else if (["a", "A", " ", "Enter"].includes(e.key)) {
        e.preventDefault(); sfx.confirm();
        const selected = menuItems[menuCursor];
        if (selected === "RESUME") {
          bgm.stop();
          setPhase("done");
          onComplete();
        } else if (selected === "NEW GAME") {
          // Clear save and start Birch speech
          clearSave();
          bgm.stop();
          setPhase("birch");
        } else if (selected === "OPTION") {
          // For now, just resume — Options will be in-game
          bgm.stop();
          setPhase("done");
          onComplete();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, menuCursor, isFirstVisit, onComplete]);

  const handleBirchComplete = useCallback(
    (playerName: string, playerGender: "boy" | "girl") => {
      updateSave({ playerName, playerGender });
      setPhase("done");
      onComplete();
    },
    [onComplete],
  );

  if (phase === "done") return null;

  const menuItems = isFirstVisit ? ["NEW GAME", "OPTION"] : ["RESUME", "NEW GAME", "OPTION"];

  return (
    <>
      {/* Title screen + optional menu overlay */}
      {phase !== "birch" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            opacity: phase === "title-fadeout" ? 0 : 1,
            transition: "opacity 300ms ease-out",
            pointerEvents: phase === "title-fadeout" ? "none" : "auto",
          }}
        >
          <TitleScreenLayer
            phase={titlePhase}
            onPressStart={phase === "main-menu" ? () => {} : handlePressStart}
          />

          {/* Main menu overlay (on top of title screen) */}
          {phase === "main-menu" && (
            <div style={menuOverlayStyle}>
              <div style={menuBoxStyle}>
                {menuItems.map((item, i) => (
                  <div
                    key={item}
                    onClick={() => {
                      setMenuCursor(i);
                      sfx.confirm();
                      if (item === "RESUME") { bgm.stop(); setPhase("done"); onComplete(); }
                      else if (item === "NEW GAME") { clearSave(); bgm.stop(); setPhase("birch"); }
                      else if (item === "OPTION") { bgm.stop(); setPhase("done"); onComplete(); }
                    }}
                    style={{
                      ...menuRowStyle,
                      ...(menuCursor === i ? menuRowSelectedStyle : {}),
                    }}
                  >
                    <span style={menuCursorStyle}>
                      {menuCursor === i ? "\u25B6" : "\u00A0"}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Birch speech */}
      {phase === "birch" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500 }}>
          <BirchSpeechLayer onComplete={handleBirchComplete} />
        </div>
      )}
    </>
  );
}

/* ── Menu styles ─────────────────────────────────────── */

const menuOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 510,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "auto",
};

const menuBoxStyle: React.CSSProperties = {
  borderStyle: "solid",
  borderColor: "transparent",
  borderWidth: "calc(24px * var(--ui-scale-y, 1))",
  borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
  borderImageSlice: "8 fill",
  borderImageRepeat: "stretch",
  borderImageWidth: "calc(24px * var(--ui-scale-y, 1))",
  background: "transparent",
  imageRendering: "pixelated",
  boxSizing: "content-box",
  padding: "calc(8px * var(--ui-scale-y, 1)) calc(12px * var(--ui-scale-y, 1))",
  fontFamily: FONT,
  color: "#000",
  fontSize: "calc(18px * var(--ui-scale-y, 1))",
  minWidth: "calc(160px * var(--ui-scale-y, 1))",
};

const menuRowStyle: React.CSSProperties = {
  padding: "calc(4px * var(--ui-scale-y, 1)) calc(6px * var(--ui-scale-y, 1))",
  cursor: "pointer",
  letterSpacing: "0.5px",
  lineHeight: 1.4,
  display: "flex",
  alignItems: "center",
  gap: "calc(4px * var(--ui-scale-y, 1))",
};

const menuRowSelectedStyle: React.CSSProperties = {
  // No visual highlight needed — cursor arrow shows selection
};

const menuCursorStyle: React.CSSProperties = {
  fontSize: "calc(14px * var(--ui-scale-y, 1))",
  width: "calc(16px * var(--ui-scale-y, 1))",
};
