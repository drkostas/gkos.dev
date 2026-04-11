import { useCallback, useEffect, useRef, useState } from "react";
import { getSave, updateSave, clearSave } from "@/game/systems/GameSave";
import { bgm } from "@/game/systems/BGMManager";
import { sfx } from "@/game/systems/SoundManager";
import { getSteps, formatSteps } from "@/game/systems/StepStore";
import { trackGameStart } from "@/game/systems/Analytics";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";
import { useMenuNavigation } from "@/game/hooks/useMenuNavigation";
import TitleScreenLayer from "./TitleScreenLayer";
import BirchSpeechLayer from "./BirchSpeechLayer";

const FONT = "var(--pkmn-font, 'Courier New', monospace)";
const S = (px: number) => `calc(${px}px * var(--ui-scale-y, 1))`;

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

  const save = getSave();
  const isFirstVisit = save.playerName === "";
  // OPTION removed from the title menu — options are available in-game
  // via the Start Menu, and there's no value duplicating them here.
  const menuItems = isFirstVisit
    ? ["NEW GAME", "WEBSITE"]
    : ["CONTINUE", "NEW GAME", "WEBSITE"];
  const { index: menuCursor, setIndex: setMenuCursor, moveUp: menuUp, moveDown: menuDown } =
    useMenuNavigation(menuItems.length);

  // Play title music on first user gesture (browser autoplay policy)
  useEffect(() => {
    let started = false;
    const tryPlay = () => {
      if (started) return;
      started = true;
      bgm.play("intro");
    };
    // Try immediately (works if the user already interacted with the page)
    bgm.play("intro");
    // Also listen for the first gesture in case autoplay was blocked
    window.addEventListener("click", tryPlay);
    window.addEventListener("keydown", tryPlay);
    return () => {
      window.removeEventListener("click", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
  }, []);

  // Auto-advance title phases
  useEffect(() => {
    const t1 = setTimeout(() => setTitlePhase("banner"), 4300);
    const t2 = setTimeout(() => setTitlePhase("idle"), 5800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handlePressStart = useCallback(() => {
    setPhase("title-fadeout");
    setTimeout(() => {
      setPhase("main-menu");
      setMenuCursor(0);
    }, 300);
  }, []);

  // Main menu keyboard
  useGameKeyboard(phase === "main-menu", {
    up: () => { sfx.select(); menuUp(); },
    down: () => { sfx.select(); menuDown(); },
    confirm: () => {
      sfx.confirm();
      const selected = menuItems[menuCursor];
      if (selected === "CONTINUE") {
        bgm.stop();
        setPhase("done");
        onComplete();
      } else if (selected === "NEW GAME") {
        clearSave();
        bgm.stop();
        setPhase("birch");
      } else if (selected === "WEBSITE") {
        bgm.stop();
        window.location.href = "/";
      }
    },
  });

  const handleBirchComplete = useCallback(
    (playerName: string, playerGender: "boy" | "girl") => {
      updateSave({ playerName, playerGender });
      trackGameStart(playerName, playerGender);
      setPhase("done");
      onComplete();
    },
    [onComplete],
  );

  if (phase === "done") return null;

  return (
    <>
      {/* Title screen (always visible except during birch) */}
      {phase !== "birch" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          opacity: phase === "title-fadeout" ? 0 : 1,
          transition: "opacity 300ms ease-out",
          pointerEvents: phase === "title-fadeout" ? "none" : "auto",
        }}>
          <TitleScreenLayer
            phase={titlePhase}
            onPressStart={phase === "main-menu" ? () => {} : handlePressStart}
          />

          {/* ── OG-style Main Menu ── */}
          {phase === "main-menu" && (
            <div style={menuOverlayStyle}>
              <div style={menuContainerStyle}>
                {menuItems.map((item, i) => {
                  const isSel = menuCursor === i;
                  if (item === "CONTINUE") {
                    return (
                      <div key={item} style={{ ...menuCardStyle, ...(isSel ? menuCardSelStyle : {}) }}
                        onClick={() => { sfx.confirm(); bgm.stop(); setPhase("done"); onComplete(); }}>
                        <div style={menuCardHeaderStyle}>
                          <span style={curStyle}>{isSel ? "\u25B6" : "\u00A0"}</span>
                          CONTINUE
                        </div>
                        <div style={continueInfoStyle}>
                          <span style={infoLabelStyle}>PLAYER</span>
                          <span style={infoValueStyle}>{save.playerName || "RED"}</span>
                          <span style={infoLabelStyle}>BADGES</span>
                          <span style={infoValueStyle}>{save.badges.length}</span>
                        </div>
                        <div style={continueInfoStyle}>
                          <span style={infoLabelStyle}>POKeDEX</span>
                          <span style={infoValueStyle}>{save.pokedexSeen.length}</span>
                          <span style={infoLabelStyle}>STEPS</span>
                          <span style={infoValueStyle}>{formatSteps(getSteps())}</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={item} style={{ ...menuSimpleStyle, ...(isSel ? menuSimpleSelStyle : {}) }}
                      onClick={() => {
                        sfx.confirm();
                        if (item === "NEW GAME") { clearSave(); bgm.stop(); setPhase("birch"); }
                        else if (item === "WEBSITE") { bgm.stop(); window.location.href = "/"; }
                      }}>
                      <span style={curStyle}>{isSel ? "\u25B6" : "\u00A0"}</span>
                      {item}
                    </div>
                  );
                })}
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

/* ── OG Main Menu Styles ─────────────────────────────── */

const menuOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 510,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#9898d0",
  pointerEvents: "auto",
};

/** Same 3:2 container as the title screen */
const menuContainerStyle: React.CSSProperties = {
  position: "relative",
  width: "min(135vh, 90vw)",
  height: "min(90vh, 60vw)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "4%",
  gap: "2%",
  fontFamily: FONT,
  imageRendering: "pixelated",
  containerType: "inline-size",
};

/** CONTINUE card — white bg with player info */
const menuCardStyle: React.CSSProperties = {
  background: "#f8f8f8",
  border: "4px solid #484858",
  outline: "3px solid #787890",
  padding: "2cqi 3cqi",
  cursor: "pointer",
  color: "#000",
  fontSize: "3cqi",
};

/**
 * Selected-state overrides for the CONTINUE card. Swaps the outline to
 * the signature Emerald blue and adds a soft halo so the card reads as
 * selected at a glance, even without the ▶ cursor.
 */
const menuCardSelStyle: React.CSSProperties = {
  borderColor: "#3868c0",
  outlineColor: "#a0c0f0",
  boxShadow: "0 0 0 3px #a0c0f0",
};

const menuCardHeaderStyle: React.CSSProperties = {
  fontSize: "3.5cqi",
  fontWeight: 700,
  marginBottom: "0.5cqi",
  display: "flex",
  alignItems: "center",
  gap: "1cqi",
};

const continueInfoStyle: React.CSSProperties = {
  display: "flex",
  gap: "2cqi",
  fontSize: "2.8cqi",
  lineHeight: 1.6,
};

const infoLabelStyle: React.CSSProperties = {
  color: "#3868c0",
  fontWeight: 700,
};

const infoValueStyle: React.CSSProperties = {
  color: "#000",
};

/** NEW GAME / OPTION — gray bg */
const menuSimpleStyle: React.CSSProperties = {
  background: "#b0b0b8",
  border: "4px solid #484858",
  outline: "3px solid #787890",
  padding: "1.5cqi 3cqi",
  fontSize: "3.5cqi",
  fontWeight: 700,
  color: "#000",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "1cqi",
};

/** Selected-state overrides for NEW GAME / WEBSITE rows. */
const menuSimpleSelStyle: React.CSSProperties = {
  borderColor: "#3868c0",
  outlineColor: "#a0c0f0",
  boxShadow: "0 0 0 3px #a0c0f0",
};

const curStyle: React.CSSProperties = {
  fontSize: "2.5cqi",
};
