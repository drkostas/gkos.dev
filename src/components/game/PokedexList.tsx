import { useCallback, useEffect, useRef, useState } from "react";
import { POKEDEX } from "@/game/data/pokemon";
import { isPokedexSeen, getPokedexSeenCount } from "@/game/systems/PokedexStore";
import {
  markUrlOpened,
  hasUrlOpened,
  hasBadge,
  isPokedexCaughtInSave,
} from "@/game/systems/GameSave";
import { checkBadges } from "@/game/systems/BadgeMilestones";
import { showNotification } from "@/game/EventBridge";
import { sfx } from "@/game/systems/SoundManager";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";

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

  /**
   * Open a Pokedex entry's project URL and record that it's been
   * viewed so the list can render a ✓ mark next time the player
   * visits the page, and so the DEVOTED badge-check count moves up.
   */
  const openEntry = useCallback((entry: (typeof POKEDEX)[number]) => {
    if (!entry.url || !isPokedexSeen(entry.number)) return;
    window.open(entry.url, "_blank", "noopener,noreferrer");
    const key = `pokedex:${entry.number}`;
    const wasFirstOpen = markUrlOpened(key);
    if (wasFirstOpen) {
      // checkBadges auto-awards COMPLETIONIST when the last URL is opened.
      // Check before + after so we can show the earned notification.
      const hadCompletionist = hasBadge("completionist");
      checkBadges();
      if (!hadCompletionist && hasBadge("completionist")) {
        showNotification("COMPLETIONIST badge earned!", "★");
      }
    }
  }, []);

  const openSelected = useCallback(() => {
    const entry = POKEDEX[selectedIndexRef.current];
    if (entry) openEntry(entry);
  }, [openEntry]);

  useGameKeyboard(true, {
    up: () => { sfx.select(); moveSelection(-1); },
    down: () => { sfx.select(); moveSelection(1); },
    confirm: () => { sfx.confirm(); openSelected(); },
    cancel: () => { sfx.select(); onCloseRef.current(); },
  });

  const visibleEntries = POKEDEX.slice(scrollOffset, scrollOffset + VISIBLE_ROWS);
  const selectedEntry = POKEDEX[selectedIndex];
  const selectedSeen = selectedEntry ? isPokedexSeen(selectedEntry.number) : false;
  const seenCount = getPokedexSeenCount();
  // "OWN" = entries the player has actually encountered in the
  // overworld. Party-roster entries are counted as SEEN but NOT
  // OWN, so the counter jumps up only after real catches.
  const ownCount = POKEDEX.filter(
    (p) => p.status === "caught" && isPokedexCaughtInSave(p.number),
  ).length;

  return (
    <div ref={overlayRef} style={overlayStyle}>
      <div ref={frameRef} style={menuFrameStyle}>

        {/* ── SEEN / OWN stat boxes (green area, upper-left) ── */}
        <div style={statsAreaStyle}>
          <div style={statBoxStyle}>
            <span style={statLabelStyle}>SEEN</span>
            <span style={statValueStyle}>{seenCount}</span>
          </div>
          <div style={statBoxStyle}>
            <span style={statLabelStyle}>OWN</span>
            <span style={statValueStyle}>{ownCount}</span>
          </div>
        </div>

        {/* ── Detail panel (left white preview area) — Pokemon sprite + info ── */}
        <div style={detailAreaStyle}>
          {selectedEntry && selectedSeen ? (
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
          ) : selectedEntry ? (
            <div style={detailUnseenStyle}>
              <div style={detailPokemonNameStyle}>???</div>
              <div style={detailDescStyle}>Not yet discovered.</div>
            </div>
          ) : null}
        </div>

        {/* ── Right list panel ── */}
        <div style={listPanelStyle}>
          {visibleEntries.map((entry) => {
            const idx = entry.number - 1;
            const isSelected = idx === selectedIndex;
            const seen = isPokedexSeen(entry.number);
            // "Caught" = actually encountered in the overworld. Party
            // roster entries are `seen` but NOT `caught`, so they
            // render with a desaturated outline ball instead of the
            // red-and-white filled ball.
            const caught = seen && isPokedexCaughtInSave(entry.number);
            const opened = seen && hasUrlOpened(`pokedex:${entry.number}`);
            return (
              <div
                key={entry.number}
                onClick={() => {
                  setSelectedIndex(idx);
                  openEntry(entry);
                }}
                style={{
                  ...entryRowStyle,
                  ...(isSelected ? entryRowSelectedStyle : {}),
                }}
              >
                <span style={cursorStyle}>
                  {isSelected ? "\u25B6" : "\u00A0"}
                </span>
                {caught && entry.status === "caught" ? (
                  <img src="/game/ui/pokedex_caught_ball.png" alt="" style={ballIconStyle} />
                ) : seen && entry.status === "caught" ? (
                  // Party-only entry: show the same ball icon but
                  // desaturated + half-opacity so the player can
                  // tell it came from the party roster, not from an
                  // overworld encounter.
                  <img
                    src="/game/ui/pokedex_caught_ball.png"
                    alt=""
                    style={{
                      ...ballIconStyle,
                      filter: "grayscale(1) brightness(1.3)",
                      opacity: 0.45,
                    }}
                    title="Seen via party — not yet encountered in the overworld"
                  />
                ) : (
                  <span style={ballPlaceholderStyle} />
                )}
                <span style={entryNumberStyle}>
                  No{String(entry.number).padStart(3, "0")}
                </span>
                <span style={entryNameTextStyle}>
                  {seen ? entry.name.toUpperCase() : "----------"}
                </span>
                {opened && (
                  <span
                    style={{
                      marginLeft: "auto",
                      paddingRight: "0.6cqi",
                      color: "#2aa33a",
                      fontSize: "1.9cqi",
                      flexShrink: 0,
                    }}
                    aria-label="opened"
                    title="Project already opened"
                  >
                    ✓
                  </span>
                )}
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
// Container-relative font sizing (frame = 100cqi)
const F = "2.6cqi";     // main text (list entries)
const F_SM = "2.2cqi";  // small text
const F_LG = "3.2cqi";  // large (detail name)

const overlayStyle: React.CSSProperties = {
  position: "absolute",
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
  width: "min(135vh, 90vw)",
  height: "min(90vh, 60vw)",
  containerType: "inline-size",
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
// Background bg_full.png detail box interior: x=62-129 (25.8%-53.8%),
// y~20-140 (12.5%-87.5%). Shifted slightly down for better visual balance.
const detailAreaStyle: React.CSSProperties = {
  position: "absolute",
  top: "16%",
  left: "25.8%",
  width: "28%",
  height: "75%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "2.5cqi 0 0.5cqi 0",
  boxSizing: "border-box",
  overflow: "hidden",
};

// Pokemon sprite — top of the detail panel
const spriteStyle: React.CSSProperties = {
  width: "60%",
  height: "auto",
  maxHeight: "35%",
  objectFit: "contain",
  imageRendering: "pixelated",
  marginTop: "0.5cqi",
};

const detailPokemonNameStyle: React.CSSProperties = {
  fontSize: F_SM,
  fontWeight: 700,
  color: "#333",
  textAlign: "center",
  marginTop: "0.8cqi",
  lineHeight: 1.1,
  width: "100%",
};

const detailProjectNameStyle: React.CSSProperties = {
  fontSize: F,
  fontWeight: 700,
  color: "#000",
  textAlign: "center",
  marginTop: "0.4cqi",
  lineHeight: 1.1,
  width: "100%",
};

const detailDescStyle: React.CSSProperties = {
  fontSize: "1.7cqi",
  color: "#444",
  textAlign: "center",
  marginTop: "0.6cqi",
  lineHeight: 1.2,
  overflow: "hidden",
  width: "100%",
  boxSizing: "border-box",
  padding: "0 1cqi",
  wordWrap: "break-word",
  overflowWrap: "break-word",
  maxHeight: "18%",
};

const detailUnseenStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  opacity: 0.5,
};

const typeBadgeRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5cqi",
  marginTop: "0.8cqi",
};

const typeBadgeStyle: React.CSSProperties = {
  fontSize: "1.7cqi",
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
  width: "3cqi",
  fontSize: "3cqi",
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
  marginRight: "2cqi", // space between "No001" and the name
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
