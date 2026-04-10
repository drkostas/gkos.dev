import { useCallback, useEffect, useRef, useState } from "react";
import {
  GameEvents,
  emitGameEvent,
  onGameEvent,
  getDebugMode,
  setDebugMode,
} from "@/game/EventBridge";
import TrainerCard from "./TrainerCard";
import PokedexList from "./PokedexList";
import { getCollectedItems } from "@/game/systems/PickupStore";

/**
 * Menu items matching the original Pokemon Emerald start menu order.
 * "KOSTAS" replaces the trainer name slot.
 */
const MENU_ITEMS = [
  "POKeDEX",
  "POKeMON",
  "BAG",
  "KOSTAS",
  "SAVE",
  "OPTION",
  "EXIT",
] as const;

type MenuItem = (typeof MENU_ITEMS)[number];

/** Sub-screen currently open (null = showing main menu). */
type SubScreen = "pokedex" | "trainer" | "party" | "bag" | "save-confirm" | "saving" | null;

/**
 * StartMenu — Pokemon Emerald-style start menu overlay.
 *
 * Toggled by Escape key. Right-aligned dark panel with white text.
 * Navigate with arrows, select with Enter/Z, close with Escape/X.
 */
export default function StartMenu() {
  const [visible, setVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [saveStep, setSaveStep] = useState<"confirm" | "saving" | "done">("confirm");

  const visibleRef = useRef(visible);
  const subScreenRef = useRef(subScreen);
  visibleRef.current = visible;
  subScreenRef.current = subScreen;

  // ── Open / close ────────────────────────────────────────────
  const openMenu = useCallback(() => {
    setVisible(true);
    setSelectedIndex(0);
    setSubScreen(null);
  }, []);

  const closeMenu = useCallback(() => {
    setVisible(false);
    setSubScreen(null);
    setSaveStep("confirm");
    emitGameEvent(GameEvents.MENU_CLOSE);
  }, []);

  // ── Event bridge listeners ──────────────────────────────────
  useEffect(() => {
    const unsubShow = onGameEvent(GameEvents.SHOW_MENU, () => {
      openMenu();
    });

    return () => {
      unsubShow();
    };
  }, [openMenu]);

  // ── Menu item selection handler ─────────────────────────────
  const handleSelect = useCallback(
    (item: MenuItem) => {
      switch (item) {
        case "POKeDEX":
          setSubScreen("pokedex");
          break;
        case "POKeMON":
          setSubScreen("party");
          break;
        case "BAG":
          setSubScreen("bag");
          break;
        case "KOSTAS":
          setSubScreen("trainer");
          break;
        case "SAVE":
          setSubScreen("save-confirm");
          setSaveStep("confirm");
          break;
        case "OPTION": {
          // Toggle debug overlay (tile coordinates). Persisted in
          // localStorage so the setting survives page reloads.
          const next = !getDebugMode();
          setDebugMode(next);
          emitGameEvent(GameEvents.TOGGLE_DEBUG, next);
          closeMenu();
          break;
        }
        case "EXIT":
          closeMenu();
          break;
      }
    },
    [closeMenu],
  );

  // ── Save flow ───────────────────────────────────────────────
  const handleSaveConfirm = useCallback((yes: boolean) => {
    if (yes) {
      setSaveStep("saving");
      // Trigger PDF download after brief animation
      setTimeout(() => {
        setSaveStep("done");
        // Trigger the actual download
        const link = document.createElement("a");
        link.href = "/resume.pdf";
        link.download = "Kostas_Georgiou_CV.pdf";
        link.click();
        // Auto-close save dialog after 1.5s
        setTimeout(() => {
          setSubScreen(null);
          setSaveStep("confirm");
        }, 1500);
      }, 1200);
    } else {
      setSubScreen(null);
      setSaveStep("confirm");
    }
  }, []);

  // ── Keyboard navigation ─────────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    const onKey = (e: KeyboardEvent) => {
      // Sub-screens handle their own input
      if (subScreenRef.current === "pokedex" || subScreenRef.current === "trainer") return;

      // Save confirmation sub-screen
      if (subScreenRef.current === "save-confirm") {
        if (e.key === "Enter" || e.key === "z" || e.key === "Z") {
          e.preventDefault();
          // Default to "Yes"
          handleSaveConfirm(true);
        } else if (e.key === "Escape" || e.key === "x" || e.key === "X") {
          e.preventDefault();
          handleSaveConfirm(false);
        }
        return;
      }

      // Saving animation — block input
      if (subScreenRef.current === "saving") return;

      // Party / Bag stubs
      if (subScreenRef.current === "party" || subScreenRef.current === "bag") {
        if (e.key === "Escape" || e.key === "x" || e.key === "X" || e.key === "Backspace") {
          e.preventDefault();
          setSubScreen(null);
        }
        return;
      }

      // Main menu navigation
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (i <= 0 ? MENU_ITEMS.length - 1 : i - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (i >= MENU_ITEMS.length - 1 ? 0 : i + 1));
          break;
        case "Enter":
        case "z":
        case "Z":
          e.preventDefault();
          handleSelect(MENU_ITEMS[selectedIndex]);
          break;
        case "Escape":
        case "x":
        case "X":
          e.preventDefault();
          closeMenu();
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selectedIndex, closeMenu, handleSelect, handleSaveConfirm]);

  // ── Render ──────────────────────────────────────────────────
  if (!visible) return null;

  // Sub-screen overlays
  if (subScreen === "pokedex") {
    return <PokedexList onClose={() => setSubScreen(null)} />;
  }

  if (subScreen === "trainer") {
    return <TrainerCard onClose={() => setSubScreen(null)} />;
  }

  return (
    <div style={backdropStyle}>
      {/* Main menu panel — right-aligned like Emerald */}
      <div style={panelStyle}>
        {MENU_ITEMS.map((item, i) => (
          <div
            key={item}
            onClick={() => handleSelect(item)}
            style={{
              ...menuItemStyle,
              ...(i === selectedIndex ? menuItemSelectedStyle : {}),
            }}
          >
            <span style={arrowStyle}>
              {i === selectedIndex ? "\u25B6" : "\u00A0\u00A0"}
            </span>
            {item}
          </div>
        ))}
      </div>

      {/* Party stub */}
      {subScreen === "party" && (
        <div style={stubOverlayStyle}>
          <div style={stubBoxStyle}>
            <p style={{ margin: 0 }}>No POKeMON data yet.</p>
            <p style={{ margin: "8px 0 0", fontSize: "11px", opacity: 0.7 }}>
              Press ESC or X to go back
            </p>
          </div>
        </div>
      )}

      {/* Bag — shows collected KEY ITEMS */}
      {subScreen === "bag" && (
        <div style={stubOverlayStyle}>
          <div style={stubBoxStyle}>
            <p style={{ margin: 0, fontWeight: "bold" }}>KEY ITEMS</p>
            <div style={{ marginTop: "12px", textAlign: "left" }}>
              {(() => {
                const items = getCollectedItems();
                if (items.length === 0) {
                  return <p style={{ margin: 0, opacity: 0.7 }}>BAG is empty.</p>;
                }
                return items.map((item, i) => (
                  <div key={i} style={{ padding: "4px 0" }}>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#fff", textDecoration: "underline" }}
                      >
                        {"\u25B6"} {item.name}
                      </a>
                    ) : (
                      <span>{"\u25B6"} {item.name}</span>
                    )}
                  </div>
                ));
              })()}
            </div>
            <p style={{ margin: "12px 0 0", fontSize: "11px", opacity: 0.7 }}>
              Press ESC or X to go back
            </p>
          </div>
        </div>
      )}

      {/* Save confirmation */}
      {subScreen === "save-confirm" && (
        <div style={stubOverlayStyle}>
          <div style={saveBoxStyle}>
            {saveStep === "confirm" && (
              <>
                <p style={{ margin: 0 }}>Would you like to save the game?</p>
                <div style={{ marginTop: "12px", display: "flex", gap: "16px" }}>
                  <button
                    onClick={() => handleSaveConfirm(true)}
                    style={saveButtonStyle}
                  >
                    {"\u25B6"} YES
                  </button>
                  <button
                    onClick={() => handleSaveConfirm(false)}
                    style={saveButtonStyle}
                  >
                    NO
                  </button>
                </div>
              </>
            )}
            {saveStep === "saving" && (
              <p style={{ margin: 0 }}>
                SAVING... DON&apos;T TURN OFF THE POWER.
                <span style={saveDots}>...</span>
              </p>
            )}
            {saveStep === "done" && (
              <p style={{ margin: 0 }}>KOSTAS saved the game!</p>
            )}
          </div>
        </div>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes savingDots {
          0%   { opacity: 0; }
          33%  { opacity: 1; }
          66%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const FONT = "'Geist Mono', 'Courier New', monospace";

const backdropStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 200,
  // No backdrop dimming for main menu — Emerald keeps the world visible
};

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "140px",
  background: "rgba(24, 56, 88, 0.92)",
  border: "3px solid #f8f8f8",
  borderRadius: "8px",
  padding: "8px 4px",
  fontFamily: FONT,
  fontSize: "13px",
  color: "#f8f8f8",
  userSelect: "none",
  boxShadow: "inset 0 0 0 2px rgba(24, 56, 88, 0.6), 2px 2px 8px rgba(0,0,0,0.4)",
};

const menuItemStyle: React.CSSProperties = {
  padding: "4px 6px",
  cursor: "pointer",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  letterSpacing: "0.5px",
  lineHeight: "1.4",
};

const menuItemSelectedStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.12)",
};

const arrowStyle: React.CSSProperties = {
  width: "18px",
  flexShrink: 0,
  fontSize: "10px",
};

const stubOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0, 0, 0, 0.5)",
  zIndex: 210,
};

const stubBoxStyle: React.CSSProperties = {
  background: "rgba(24, 56, 88, 0.95)",
  border: "3px solid #f8f8f8",
  borderRadius: "8px",
  padding: "16px 24px",
  fontFamily: FONT,
  fontSize: "13px",
  color: "#f8f8f8",
  textAlign: "center",
};

const saveBoxStyle: React.CSSProperties = {
  ...stubBoxStyle,
  minWidth: "240px",
};

const saveButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "2px solid #f8f8f8",
  borderRadius: "4px",
  color: "#f8f8f8",
  fontFamily: FONT,
  fontSize: "13px",
  padding: "4px 16px",
  cursor: "pointer",
  letterSpacing: "0.5px",
};

const saveDots: React.CSSProperties = {
  animation: "savingDots 1s ease-in-out infinite",
};
