import { useCallback, useEffect, useRef, useState } from "react";
import { POKEDEX, POKEDEX_CAUGHT, POKEDEX_SEEN, type PokedexEntry } from "@/game/data/pokemon";

interface PokedexListProps {
  onClose: () => void;
}

/** Number of visible entries in the scrollable list. */
const VISIBLE_ROWS = 8;

/**
 * PokedexList — Pokemon Emerald-style Pokedex screen.
 *
 * Full-screen red overlay listing all projects as Pokedex entries.
 * Navigate with Up/Down arrows, Enter to open project link, Escape to go back.
 */
export default function PokedexList({ onClose }: PokedexListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const moveSelection = useCallback((delta: number) => {
    setSelectedIndex((prev) => {
      const next = Math.max(0, Math.min(POKEDEX.length - 1, prev + delta));
      // Adjust scroll window
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
          moveSelection(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          moveSelection(1);
          break;
        case "Enter":
        case "z":
        case "Z":
          e.preventDefault();
          openSelected();
          break;
        case "Escape":
        case "x":
        case "X":
        case "Backspace":
          e.preventDefault();
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
    <div style={overlayStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={headerTitleStyle}>POKeDEX</span>
        <span style={headerStatsStyle}>
          {POKEDEX_SEEN} seen / {POKEDEX_CAUGHT} caught
        </span>
      </div>

      {/* Entry list */}
      <div style={listContainerStyle}>
        {/* Scroll indicator top */}
        {scrollOffset > 0 && (
          <div style={scrollIndicatorStyle}>{"\u25B2"}</div>
        )}

        {visibleEntries.map((entry) => {
          const isSelected = entry.number - 1 === selectedIndex;
          return (
            <EntryRow
              key={entry.number}
              entry={entry}
              isSelected={isSelected}
              onClick={() => {
                setSelectedIndex(entry.number - 1);
                if (entry.url) {
                  window.open(entry.url, "_blank", "noopener,noreferrer");
                }
              }}
            />
          );
        })}

        {/* Scroll indicator bottom */}
        {scrollOffset + VISIBLE_ROWS < POKEDEX.length && (
          <div style={scrollIndicatorStyle}>{"\u25BC"}</div>
        )}
      </div>

      {/* Detail panel for selected entry */}
      {selectedEntry && (
        <div style={detailPanelStyle}>
          <div style={detailHeaderStyle}>
            <span style={detailNumberStyle}>
              #{String(selectedEntry.number).padStart(3, "0")}
            </span>
            <span style={detailNameStyle}>{selectedEntry.name}</span>
          </div>

          <div style={detailTypesStyle}>
            {selectedEntry.types.map((type) => (
              <span key={type} style={{ ...typeTagStyle, background: getTypeColor(type) }}>
                {type}
              </span>
            ))}
            <span style={levelStyle}>Lv.{selectedEntry.level}</span>
          </div>

          <div style={detailDescStyle}>{selectedEntry.description}</div>

          {selectedEntry.url && (
            <div style={detailUrlStyle}>
              ENTER to visit {"\u2192"}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={footerStyle}>
        {"\u2191\u2193"} Navigate {"  "} ENTER Open {"  "} ESC Back
      </div>
    </div>
  );
}

// ── Entry row sub-component ────────────────────────────────────

function EntryRow({
  entry,
  isSelected,
  onClick,
}: {
  entry: PokedexEntry;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusIcon =
    entry.status === "caught"
      ? "\u25CF" // filled circle
      : entry.status === "seen"
        ? "\u25CB" // empty circle
        : "\u2500"; // dash

  return (
    <div
      onClick={onClick}
      style={{
        ...entryRowStyle,
        ...(isSelected ? entryRowSelectedStyle : {}),
      }}
    >
      <span style={entryArrowStyle}>
        {isSelected ? "\u25B6" : "\u00A0"}
      </span>
      <span style={entryStatusStyle}>{statusIcon}</span>
      <span style={entryNumberStyle}>
        {String(entry.number).padStart(3, "0")}
      </span>
      <span style={entryNameStyle}>{entry.name}</span>
      <span style={entryLevelStyle}>Lv.{entry.level}</span>
    </div>
  );
}

// ── Type color mapping (Pokemon-inspired) ──────────────────────

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
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
  return colors[type] ?? "#888";
}

// ── Styles ─────────────────────────────────────────────────────

const FONT = "'Geist Mono', 'Courier New', monospace";

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 300,
  background: "linear-gradient(180deg, #c03028 0%, #a82820 40%, #881818 100%)",
  display: "flex",
  flexDirection: "column",
  fontFamily: FONT,
  color: "#f8f8f8",
  userSelect: "none",
  padding: "8px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 8px",
  marginBottom: "4px",
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  letterSpacing: "2px",
  textShadow: "1px 1px 2px rgba(0, 0, 0, 0.4)",
};

const headerStatsStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "rgba(255, 255, 255, 0.65)",
};

const listContainerStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(0, 0, 0, 0.25)",
  borderRadius: "6px",
  border: "2px solid rgba(255, 255, 255, 0.2)",
  padding: "4px 0",
  overflow: "hidden",
};

const scrollIndicatorStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "10px",
  color: "rgba(255, 255, 255, 0.4)",
  lineHeight: "1",
  padding: "1px 0",
};

const entryRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "3px 8px",
  fontSize: "11px",
  cursor: "pointer",
  borderRadius: "3px",
  margin: "0 4px",
};

const entryRowSelectedStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.15)",
};

const entryArrowStyle: React.CSSProperties = {
  width: "10px",
  fontSize: "8px",
  flexShrink: 0,
};

const entryStatusStyle: React.CSSProperties = {
  width: "12px",
  fontSize: "8px",
  flexShrink: 0,
  textAlign: "center",
};

const entryNumberStyle: React.CSSProperties = {
  width: "28px",
  color: "rgba(255, 255, 255, 0.5)",
  fontSize: "10px",
  flexShrink: 0,
};

const entryNameStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: 600,
};

const entryLevelStyle: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.5)",
  fontSize: "10px",
  flexShrink: 0,
};

const detailPanelStyle: React.CSSProperties = {
  marginTop: "4px",
  background: "rgba(0, 0, 0, 0.3)",
  borderRadius: "6px",
  border: "2px solid rgba(255, 255, 255, 0.2)",
  padding: "8px 10px",
};

const detailHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "8px",
  marginBottom: "4px",
};

const detailNumberStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "rgba(255, 255, 255, 0.5)",
};

const detailNameStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.5px",
};

const detailTypesStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  alignItems: "center",
  marginBottom: "4px",
};

const typeTagStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  padding: "1px 8px",
  borderRadius: "3px",
  color: "#fff",
  textShadow: "0 1px 1px rgba(0, 0, 0, 0.3)",
  letterSpacing: "0.5px",
};

const levelStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "rgba(255, 255, 255, 0.6)",
  marginLeft: "auto",
};

const detailDescStyle: React.CSSProperties = {
  fontSize: "10px",
  lineHeight: "1.4",
  color: "rgba(255, 255, 255, 0.8)",
};

const detailUrlStyle: React.CSSProperties = {
  fontSize: "9px",
  color: "rgba(255, 255, 255, 0.5)",
  marginTop: "4px",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "9px",
  color: "rgba(255, 255, 255, 0.4)",
  padding: "4px 0 0",
  letterSpacing: "0.5px",
};
