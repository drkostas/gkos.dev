import { useEffect } from "react";
import { bgm } from "@/game/systems/BGMManager";

interface TitleScreenLayerProps {
  phase: "shines" | "banner" | "idle";
  onPressStart: () => void;
}

const FONT = "var(--pkmn-font, 'Courier New', monospace)";
const STYLE_ID = "title-screen-kf";

const keyframes = `
@keyframes ts-cloud-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes ts-press-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes ts-gem-pulse {
  0%, 49% { opacity: 0.9; }
  50%, 100% { opacity: 0.3; }
}
@keyframes ts-logo-drop {
  0% { transform: translateY(-20%); opacity: 0.6; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes ts-shine {
  0% { left: -25%; }
  100% { left: 125%; }
}
@keyframes ts-banner-in {
  0% { transform: translateY(-40%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
`;

export default function TitleScreenLayer({ phase, onPressStart }: TitleScreenLayerProps) {
  // Play title music on mount (user gesture unlocks audio)
  useEffect(() => {
    bgm.play("intro");
    return () => { bgm.stop(); };
  }, []);

  // Inject keyframes
  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = keyframes;
      document.head.appendChild(s);
    }
    return () => document.getElementById(STYLE_ID)?.remove();
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "shines" || phase === "banner") {
        onPressStart();
      } else if (phase === "idle") {
        if (["Enter", " ", "a", "A"].includes(e.key)) onPressStart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onPressStart]);

  const showBanner = phase === "banner" || phase === "idle";
  const showPress = phase === "idle";

  return (
    <div onClick={onPressStart} style={overlayStyle}>
      {/* GBA viewport — all layers stack inside this */}
      <div style={viewportStyle}>

        {/* 1. Rayquaza background — fills entire viewport */}
        <img
          src="/game/ui/opening/rayquaza_composed.png"
          alt=""
          style={{
            ...layerStyle,
            opacity: phase === "shines" ? 0.5 : 1,
            transition: "opacity 1s",
            objectFit: "cover",
          }}
        />

        {/* Rayquaza gem pulse overlay */}
        <div style={{
          position: "absolute",
          top: "32%",
          left: "42%",
          width: "3%",
          height: "4%",
          borderRadius: "50%",
          background: "#40e8e8",
          boxShadow: "0 0 6px 3px #40e8e8",
          animation: "ts-gem-pulse 0.27s steps(1) infinite",
          zIndex: 1,
        }} />

        {/* 2. Clouds — scroll horizontally, semi-transparent over Rayquaza */}
        <div style={{ ...layerStyle, overflow: "hidden", zIndex: 2 }}>
          <div style={{
            display: "flex",
            width: "200%",
            height: "100%",
            animation: "ts-cloud-scroll 20s linear infinite",
          }}>
            <img src="/game/ui/opening/clouds_composed.png" alt="" style={cloudImgStyle} />
            <img src="/game/ui/opening/clouds_composed.png" alt="" style={cloudImgStyle} />
          </div>
        </div>

        {/* 3. Pokemon Logo — upper portion, drops into place */}
        <div style={{
          position: "absolute",
          top: "-2%",
          left: "5%",
          width: "90%",
          zIndex: 10,
          animation: "ts-logo-drop 2s ease-out forwards",
        }}>
          <img
            src="/game/ui/opening/pokemon_logo_composed.png"
            alt="Pokemon"
            style={{
              width: "100%",
              height: "auto",
              imageRendering: "pixelated",
              display: "block",
            }}
          />

          {/* Shine sweeps over logo */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            {/* Sweep 1 */}
            <img src="/game/ui/opening/logo_shine.png" alt="" style={{
              ...shineStyle,
              animation: "ts-shine 1.5s linear 0.3s forwards",
            }} />
            {/* Sweep 2a */}
            <img src="/game/ui/opening/logo_shine.png" alt="" style={{
              ...shineStyle,
              animation: "ts-shine 1s linear 1.5s forwards",
              width: "15%",
            }} />
            {/* Sweep 2b */}
            <img src="/game/ui/opening/logo_shine.png" alt="" style={{
              ...shineStyle,
              animation: "ts-shine 1s linear 2s forwards",
              width: "12%",
            }} />
            {/* Sweep 3 */}
            <img src="/game/ui/opening/logo_shine.png" alt="" style={{
              ...shineStyle,
              animation: "ts-shine 1.5s linear 3.2s forwards",
            }} />
          </div>
        </div>

        {/* 4. "EXPLORE MODE" banner */}
        {showBanner && (
          <div style={{
            position: "absolute",
            top: "42%",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 11,
            animation: "ts-banner-in 0.8s ease-out forwards",
          }}>
            <span style={{
              fontFamily: FONT,
              fontSize: "clamp(14px, 3vw, 32px)",
              fontWeight: 700,
              color: "#fff",
              textShadow: "2px 2px 0 #e040a0, -1px -1px 0 #401030, 1px -1px 0 #401030, -1px 1px 0 #401030, 0 3px 0 #a02070",
              letterSpacing: "0.2em",
            }}>
              EXPLORE MODE
            </span>
          </div>
        )}

        {/* 5. "PRESS ENTER" blinking text */}
        {showPress && (
          <div style={{
            position: "absolute",
            bottom: "12%",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 12,
            animation: "ts-press-blink 0.53s steps(1) infinite",
          }}>
            <span style={{
              fontFamily: FONT,
              fontSize: "clamp(10px, 2vw, 20px)",
              color: "#f8f8f8",
              textShadow: "1px 1px 0 #000",
              letterSpacing: "0.15em",
            }}>
              PRESS ENTER
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────── */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#000",
  cursor: "pointer",
};

/** GBA aspect ratio container — 3:2, scaled to fill viewport */
const viewportStyle: React.CSSProperties = {
  position: "relative",
  width: "min(150vh, 100vw)",
  height: "min(100vh, 66.67vw)",
  overflow: "hidden",
  imageRendering: "pixelated",
};

/** Absolute-fill layer */
const layerStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  imageRendering: "pixelated",
};

const cloudImgStyle: React.CSSProperties = {
  width: "50%",
  height: "100%",
  objectFit: "cover",
  imageRendering: "pixelated",
  opacity: 0.45,
  mixBlendMode: "screen",
};

const shineStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: "-25%",
  width: "20%",
  height: "100%",
  objectFit: "contain",
  imageRendering: "pixelated",
  mixBlendMode: "screen",
  opacity: 0.8,
  pointerEvents: "none",
};
