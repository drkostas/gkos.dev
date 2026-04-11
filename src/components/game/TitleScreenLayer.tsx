import { useEffect } from "react";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";

interface TitleScreenLayerProps {
  phase: "shines" | "banner" | "idle";
  onPressStart: () => void;
}

const FONT = "var(--pkmn-font, 'Courier New', monospace)";
const STYLE_ID = "title-screen-kf";

const keyframes = `
@keyframes ts-cloud-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
@keyframes ts-press-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes ts-shine {
  0% { left: -25%; opacity: 1; }
  90% { opacity: 1; }
  100% { left: 110%; opacity: 0; }
}
@keyframes ts-banner-in {
  0% { opacity: 0; transform: translateY(-20px); }
  100% { opacity: 1; transform: translateY(0); }
}
`;

export default function TitleScreenLayer({ phase, onPressStart }: TitleScreenLayerProps) {
  // Music is managed by OpeningScreen

  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = keyframes;
      document.head.appendChild(s);
    }
    return () => document.getElementById(STYLE_ID)?.remove();
  }, []);

  // Only the A button skips the intro. Arrows/modifiers/accidental
  // taps shouldn't blow past the logo animation before the player
  // has read anything.
  const inIntroPhase =
    phase === "shines" || phase === "banner" || phase === "idle";
  useGameKeyboard(inIntroPhase, {
    confirm: onPressStart,
  });

  const showBanner = phase === "banner" || phase === "idle";
  const showPress = phase === "idle";

  return (
    <div onClick={onPressStart} style={overlayStyle}>
      {/* 3:2 landscape container — same approach as Party/Pokedex */}
      <div style={containerStyle}>

        {/* Rayquaza background — fills container */}
        <img
          src="/game/ui/opening/rayquaza_cropped.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: "pixelated",
          }}
        />

        {/* Clouds — scroll upward */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 1, pointerEvents: "none" }}>
          <div style={{
            position: "absolute",
            top: 0, left: 0,
            width: "100%", height: "200%",
            animation: "ts-cloud-scroll 25s linear infinite",
          }}>
            <img src="/game/ui/opening/clouds_composed.png" alt="" style={cloudStyle} />
            <img src="/game/ui/opening/clouds_composed.png" alt="" style={cloudStyle} />
          </div>
        </div>

        {/* Pokemon Logo — centered horizontally, top area */}
        <div style={{
          position: "absolute",
          top: "2%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 10,
        }}>
          <div style={{ position: "relative", overflow: "hidden", width: "70%" }}>
            <img
              src="/game/ui/opening/pokemon_logo_trimmed.png"
              alt="Pokemon"
              style={{
                width: "100%",
                height: "auto",
                imageRendering: "pixelated",
                display: "block",
              }}
            />
            {/* Shine sweeps — start off-screen left, sweep right, then disappear */}
            <img src="/game/ui/opening/logo_shine.png" alt="" style={{
              ...shineStyle, animation: "ts-shine 1s linear 0.5s forwards",
            }} />
            <img src="/game/ui/opening/logo_shine.png" alt="" style={{
              ...shineStyle, animation: "ts-shine 0.7s linear 2s forwards", width: "12%",
            }} />
            <img src="/game/ui/opening/logo_shine.png" alt="" style={{
              ...shineStyle, animation: "ts-shine 0.7s linear 2.3s forwards", width: "10%",
            }} />
            <img src="/game/ui/opening/logo_shine.png" alt="" style={{
              ...shineStyle, animation: "ts-shine 1s linear 3.5s forwards",
            }} />
          </div>
        </div>

        {/* "EXPLORE MODE" — centered, below logo, OG style */}
        {showBanner && (
          <div style={{
            position: "absolute",
            top: "42%",
            left: 0, right: 0,
            textAlign: "center",
            zIndex: 11,
            animation: "ts-banner-in 0.8s ease-out forwards",
          }}>
            <span style={{
              fontFamily: FONT,
              fontSize: "5cqi",
              fontWeight: 700,
              color: "#f8f8f8",
              textShadow: "2px 2px 0 #583858, -1px -1px 0 #583858, 1px -1px 0 #583858, -1px 1px 0 #583858",
              letterSpacing: "0.25em",
            }}>
              EXPLORE MODE
            </span>
          </div>
        )}

        {/* "PRESS ENTER" blink */}
        {showPress && (
          <div style={{
            position: "absolute",
            bottom: "15%",
            left: 0, right: 0,
            textAlign: "center",
            zIndex: 12,
            animation: "ts-press-blink 0.53s steps(1) infinite",
          }}>
            <span style={{
              fontFamily: FONT,
              fontSize: "3.5cqi",
              color: "#f8f8f8",
              textShadow: "1px 1px 0 #000",
              letterSpacing: "0.2em",
            }}>
              PRESS ENTER
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────── */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#000",
  cursor: "pointer",
};

/** 3:2 landscape container — same sizing as Party/Pokedex screens */
const containerStyle: React.CSSProperties = {
  position: "relative",
  width: "min(135vh, 90vw)",
  height: "min(90vh, 60vw)",
  overflow: "hidden",
  imageRendering: "pixelated",
  containerType: "inline-size",
};

const cloudStyle: React.CSSProperties = {
  width: "100%",
  height: "50%",
  objectFit: "cover",
  imageRendering: "pixelated",
};

const shineStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: "-25%",
  width: "18%",
  height: "100%",
  objectFit: "contain",
  imageRendering: "pixelated",
  mixBlendMode: "screen",
  opacity: 0,
  pointerEvents: "none",
};
