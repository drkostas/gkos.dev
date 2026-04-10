import { useCallback, useEffect, useRef, useState } from "react";
import {
  POKEDEX,
  POKEDEX_CAUGHT,
  POKEDEX_SEEN,
} from "@/game/data/pokemon";
import { sfx } from "@/game/systems/SoundManager";

interface PokedexListProps {
  onClose: () => void;
}

const VISIBLE_ROWS = 8;

/**
 * PokedexList — OG Emerald-style Pokedex screen.
 *
 * Uses actual pret/pokeemerald Pokedex BG tiles (Hoenn palette)
 * composed into bg_full.png, with OG button sprites from interface.png.
 */
export default function PokedexList({ onClose }: PokedexListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const overlayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // ── Align backdrop stripes with bg_full.png ──
  useEffect(() => {
    const syncStripes = () => {
      if (!overlayRef.current || !frameRef.current) return;
      const fRect = frameRef.current.getBoundingClientRect();
      const oRect = overlayRef.current.getBoundingClientRect();
      const offsetY = fRect.top - oRect.top;
      const tileW = fRect.width / 60;
      overlayRef.current.style.setProperty("--stripe-off", `${offsetY}px`);
      overlayRef.current.style.setProperty("--frame-h", `${fRect.height}px`);
      overlayRef.current.style.setProperty("--tile-w", `${tileW}px`);
    };
    syncStripes();
    window.addEventListener("resize", syncStripes);
    return () => window.removeEventListener("resize", syncStripes);
  }, []);

  const moveSelection = useCallback((delta: number) => {
    setSelectedIndex((prev) => {
      const next = Math.max(0, Math.min(POKEDEX.length - 1, prev + delta));
      setScrollOffset((scroll) => {
        if (next < scroll) return next;
        if (next >= scroll + VISIBLE_ROWS) return next - VISIBLE_ROWS + 1;
        return scroll;
      });
      return next;
    });
  }, []);

  const openSelected = useCallback(() => {
    const entry = POKEDEX[selectedIndexRef.current];
    if (entry?.url) {
      window.open(entry.url, "_blank", "noopener,noreferrer");
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          sfx.select();
          moveSelection(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          sfx.select();
          moveSelection(1);
          break;
        case "Enter":
        case "z":
        case "Z":
          e.preventDefault();
          sfx.confirm();
          openSelected();
          break;
        case "Escape":
        case "x":
        case "X":
        case "Backspace":
          e.preventDefault();
          sfx.cancel();
          onCloseRef.current();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveSelection, openSelected]);

  const visibleEntries = POKEDEX.slice(scrollOffset, scrollOffset + VISIBLE_ROWS);
  const selectedEntry = POKEDEX[selectedIndex];

  return (
    <div ref={overlayRef} style={overlayStyle}>
      <div ref={frameRef} style={menuFrameStyle}>

        {/* ── SEEN / OWN stat boxes (green area, upper-left) ── */}
        <div style={statsAreaStyle}>
          <div style={statBoxStyle}>
            <span style={statLabelStyle}>SEEN</span>
            <span style={statValueStyle}>{POKEDEX_SEEN}</span>
          </div>
          <div style={statBoxStyle}>
            <span style={statLabelStyle}>OWN</span>
            <span style={statValueStyle}>{POKEDEX_CAUGHT}</span>
          </div>
        </div>

        {/* ── Detail panel (left white preview area) — Pokemon sprite + info ── */}
        <div style={detailAreaStyle}>
          {selectedEntry && (
            <>
              <img
                key={selectedEntry.number}
                src={`/game/ui/pokedex/sprites/${String(selectedEntry.number).padStart(3, "0")}.png`}
                alt={selectedEntry.pokemon}
                style={spriteStyle}
              />
              <div style={detailPokemonNameStyle}>{selectedEntry.pokemon}</div>
              <div style={detailProjectNameStyle}>{selectedEntry.name}</div>
              <div style={detailDescStyle}>{selectedEntry.description}</div>
              <div style={typeBadgeRowStyle}>
                {selectedEntry.types.map((t) => (
                  <span
                    key={t}
                    style={{
                      ...typeBadgeStyle,
                      background: TYPE_COLORS[t] ?? "#888",
                    }}
                  >
                    {t.toUpperCase()}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Right list panel ── */}
        <div style={listPanelStyle}>
          {visibleEntries.map((entry) => {
            const idx = entry.number - 1;
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={entry.number}
                onClick={() => {
                  setSelectedIndex(idx);
                  if (entry.url) window.open(entry.url, "_blank", "noopener,noreferrer");
                }}
                style={{
                  ...entryRowStyle,
                  ...(isSelected ? entryRowSelectedStyle : {}),
                }}
              >
                <span style={cursorStyle}>
                  {isSelected ? "\u25B6" : "\u00A0"}
                </span>
                {entry.status === "caught" ? (
                  <img src="/game/ui/pokedex_caught_ball.png" alt="" style={ballIconStyle} />
                ) : (
                  <span style={ballPlaceholderStyle} />
                )}
                <span style={entryNumberStyle}>
                  No{String(entry.number).padStart(3, "0")}
                </span>
                <span style={entryNameTextStyle}>
                  {entry.status !== "unseen" ? entry.name.toUpperCase() : "----------"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scroll indicators */}
        {scrollOffset > 0 && <div style={scrollUpStyle}>{"\u25B2"}</div>}
        {scrollOffset + VISIBLE_ROWS < POKEDEX.length && (
          <div style={scrollDownStyle}>{"\u25BC"}</div>
        )}

        {/* ── Footer: OG button sprites ── */}
        <div style={footerStyle}>
          <img
            src="/game/ui/pokedex/footer_start_menu.png"
            alt="START: MENU"
            style={footerSpriteStyle}
          />
          <img
            src="/game/ui/pokedex/footer_select_search.png"
            alt="SELECT: SEARCH"
            style={footerSpriteStyle}
          />
        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const FONT = "var(--pkmn-font, 'Courier New', monospace)";

/** Scaled fonts — proportional to the 3:2 frame. */
const F = "min(2.2vh, 1.47vw)";    // main text (bumped from 2vh)
const F_SM = "min(1.8vh, 1.2vw)";  // small text (bumped from 1.6vh)
const F_LG = "min(2.8vh, 1.87vw)"; // large (detail name)

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 250,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundImage: "url('/game/ui/pokedex/stripe_col.png')",
  backgroundRepeat: "repeat",
  backgroundSize: "var(--tile-w, 8px) var(--frame-h, 792px)",
  backgroundPositionY: "var(--stripe-off, 0px)",
  imageRendering: "pixelated",
  pointerEvents: "auto",
};

const menuFrameStyle: React.CSSProperties = {
  position: "relative",
  width: "min(82.5vh, 55vw)",
  height: "min(55vh, 36.67vw)",
  backgroundImage: "url('/game/ui/pokedex/bg_full.png?v=4')",
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
  imageRendering: "pixelated",
  fontFamily: FONT,
  color: "#000",
  overflow: "hidden",
};

// ── SEEN / OWN stat boxes ─────────────────────────────────────
// Positioned on the green area between POKéDEX header and pokeball
const statsAreaStyle: React.CSSProperties = {
  position: "absolute",
  top: "11%",
  left: "1%",
  width: "24%",
  display: "flex",
  flexDirection: "column",
  gap: "min(0.6vh, 0.4vw)",
};

const statBoxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "min(0.15vh, 0.1vw) min(0.4vh, 0.27vw)",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: F,
  fontWeight: 700,
  color: "#fff",
  textShadow: "1px 1px 0 #186020",
};

const statValueStyle: React.CSSProperties = {
  fontSize: F,
  fontWeight: 700,
  color: "#fff",
  textShadow: "1px 1px 0 #186020",
  fontVariantNumeric: "tabular-nums",
};

// ── Detail panel (left white preview) ─────────────────────────
// Interior: x=62-113, y=22-137
const detailAreaStyle: React.CSSProperties = {
  position: "absolute",
  top: "16%",
  left: "26%",
  width: "21%",
  height: "72%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "min(0.4vh, 0.27vw) min(0.4vh, 0.27vw) min(1vh, 0.67vw)",
  overflow: "hidden",
};

// Pokemon sprite — top of the detail panel
const spriteStyle: React.CSSProperties = {
  width: "65%",
  height: "auto",
  maxHeight: "42%",
  objectFit: "contain",
  imageRendering: "pixelated",
  marginTop: "min(0.4vh, 0.27vw)",
};

const detailPokemonNameStyle: React.CSSProperties = {
  fontSize: F_SM,
  fontWeight: 700,
  color: "#333",
  textAlign: "center",
  marginTop: "min(0.2vh, 0.13vw)",
  lineHeight: 1.1,
};

const detailProjectNameStyle: React.CSSProperties = {
  fontSize: F,
  fontWeight: 700,
  color: "#000",
  textAlign: "center",
  marginTop: "min(0.3vh, 0.2vw)",
  lineHeight: 1.1,
};

const detailDescStyle: React.CSSProperties = {
  fontSize: "min(1.5vh, 1vw)",
  color: "#444",
  textAlign: "center",
  marginTop: "min(0.3vh, 0.2vw)",
  lineHeight: 1.2,
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
};

const typeBadgeRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "min(0.4vh, 0.27vw)",
  marginTop: "min(0.5vh, 0.33vw)",
};

const typeBadgeStyle: React.CSSProperties = {
  fontSize: "min(1.3vh, 0.87vw)",
  fontWeight: 700,
  color: "#fff",
  padding: "min(0.15vh, 0.1vw) min(0.5vh, 0.33vw)",
  borderRadius: "2px",
  textShadow: "1px 1px 0 rgba(0,0,0,0.3)",
  lineHeight: 1.2,
};

/** Standard Pokemon type colors (Gen III palette) */
const TYPE_COLORS: Record<string, string> = {
  Normal: "#A8A878",
  Fire: "#F08030",
  Water: "#6890F0",
  Electric: "#F8D030",
  Grass: "#78C850",
  Ice: "#98D8D8",
  Fighting: "#C03028",
  Poison: "#A040A0",
  Ground: "#E0C068",
  Flying: "#A890F0",
  Psychic: "#F85888",
  Bug: "#A8B820",
  Rock: "#B8A038",
  Ghost: "#705898",
  Dragon: "#7038F8",
  Dark: "#705848",
  Steel: "#B8B8D0",
  Fairy: "#EE99AC",
};

// ── Right list panel ──────────────────────────────────────────
// Interior: x=134-229, y=14-145
const listPanelStyle: React.CSSProperties = {
  position: "absolute",
  top: "9.5%",
  left: "56%",
  width: "39%",
  height: "81%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const entryRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  height: "12.5%",
  minHeight: "12.5%",
  padding: "0 min(0.4vh, 0.27vw)",
  fontSize: F,
  cursor: "pointer",
  color: "#000",
  gap: "min(0.3vh, 0.2vw)",
};

// OG uses a light highlight bar for the selected entry
const entryRowSelectedStyle: React.CSSProperties = {
  background: "rgba(80, 160, 220, 0.18)",
};

const cursorStyle: React.CSSProperties = {
  width: "min(1.4vh, 0.93vw)",
  fontSize: "min(1.2vh, 0.8vw)",
  flexShrink: 0,
  textAlign: "center",
};

const ballIconStyle: React.CSSProperties = {
  width: "min(2vh, 1.33vw)",
  height: "min(2vh, 1.33vw)",
  imageRendering: "pixelated",
  flexShrink: 0,
};

const ballPlaceholderStyle: React.CSSProperties = {
  width: "min(2vh, 1.33vw)",
  flexShrink: 0,
};

const entryNumberStyle: React.CSSProperties = {
  fontSize: F,
  color: "#000",
  flexShrink: 0,
};

const entryNameTextStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: F,
};

// ── Scroll indicators ─────────────────────────────────────────
const scrollUpStyle: React.CSSProperties = {
  position: "absolute",
  top: "8%",
  right: "6%",
  fontSize: F_SM,
  color: "#555",
};

const scrollDownStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "10%",
  right: "6%",
  fontSize: F_SM,
  color: "#555",
};

// ── Footer: OG button sprites from interface.png ──────────────
const footerStyle: React.CSSProperties = {
  position: "absolute",
  top: "92%",
  left: 0,
  width: "100%",
  height: "7%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-around",
};

const footerSpriteStyle: React.CSSProperties = {
  height: "80%",
  width: "auto",
  imageRendering: "pixelated",
};
