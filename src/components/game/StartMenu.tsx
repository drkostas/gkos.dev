import { useCallback, useEffect, useRef, useState } from "react";
import {
  GameEvents,
  emitGameEvent,
  onGameEvent,
} from "@/game/EventBridge";
import { sfx } from "@/game/systems/SoundManager";
import TrainerCard from "./TrainerCard";
import PokedexList from "./PokedexList";
import OptionsMenu from "./OptionsMenu";
import BagMenu from "./BagMenu";
import PartyMenu from "./PartyMenu";

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
type SubScreen = "pokedex" | "trainer" | "party" | "bag" | "save-confirm" | "saving" | "options" | null;

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
    sfx.menuOpen();
  }, []);

  const closeMenu = useCallback(() => {
    sfx.menuClose();
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
        case "OPTION":
          setSubScreen("options");
          break;
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
      sfx.confirm();
      setSaveStep("saving");
      // Trigger PDF download after brief animation
      setTimeout(() => {
        sfx.save();
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
      sfx.cancel();
      setSubScreen(null);
      setSaveStep("confirm");
    }
  }, []);

  // ── Keyboard navigation ─────────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    const onKey = (e: KeyboardEvent) => {
      // Sub-screens handle their own input
      if (
        subScreenRef.current === "pokedex" ||
        subScreenRef.current === "trainer" ||
        subScreenRef.current === "options" ||
        subScreenRef.current === "bag" ||
        subScreenRef.current === "party"
      ) return;

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

      // Party menu handles its own input (early return above)

      // Main menu navigation
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          sfx.select();
          setSelectedIndex((i) => (i <= 0 ? MENU_ITEMS.length - 1 : i - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          sfx.select();
          setSelectedIndex((i) => (i >= MENU_ITEMS.length - 1 ? 0 : i + 1));
          break;
        case "Enter":
        case "z":
        case "Z":
          e.preventDefault();
          sfx.confirm();
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

  if (subScreen === "options") {
    return <OptionsMenu onClose={() => setSubScreen(null)} />;
  }

  if (subScreen === "bag") {
    return <BagMenu onClose={() => setSubScreen(null)} />;
  }

  if (subScreen === "party") {
    return <PartyMenu onClose={() => setSubScreen(null)} />;
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

      {/* Party and Bag — moved to their own components (early-return above). */}

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

const FONT = "var(--pkmn-font, 'Courier New', monospace)";

const backdropStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 200,
  // No backdrop dimming for main menu — Emerald keeps the world visible
};

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(8px * var(--ui-scale-y, 1))",
  right: "calc(8px * var(--ui-scale-y, 1))",
  width: "calc(160px * var(--ui-scale-y, 1))",
  // Original Pokemon Emerald 24×24 frame as a 9-slice border.
  // Scales with the window height ratio.
  borderStyle: "solid",
  borderWidth: "calc(24px * var(--ui-scale-y, 1))",
  borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
  borderImageSlice: "8 fill",
  borderImageRepeat: "stretch",
  borderImageWidth: "calc(24px * var(--ui-scale-y, 1))",
  // No background — the slice's center 8x8 (white) is already painted
  // into the content area. A solid bg would leak through the now-
  // transparent corner pixels and produce a white halo.
  background: "transparent",
  padding: "calc(6px * var(--ui-scale-y, 1)) calc(4px * var(--ui-scale-y, 1))",
  fontFamily: FONT,
  fontSize: "calc(14px * var(--ui-scale-y, 1))",
  color: "#000",
  userSelect: "none",
  outline: "none",
  imageRendering: "pixelated",
};

const menuItemStyle: React.CSSProperties = {
  padding: "3px 4px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  letterSpacing: "0.5px",
  lineHeight: "1.3",
  color: "#000",
};

const menuItemSelectedStyle: React.CSSProperties = {
  // Emerald uses a small ▶ caret + slight bg highlight on selected item.
  background: "rgba(0, 0, 0, 0.08)",
  borderRadius: "2px",
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
  // No dim — keep the world visible behind.
  background: "transparent",
  zIndex: 210,
  pointerEvents: "none",
};

const stubBoxStyle: React.CSSProperties = {
  // Same Emerald 24×24 9-slice frame as the main panel — scales with Y.
  borderStyle: "solid",
  borderWidth: "calc(24px * var(--ui-scale-y, 1))",
  borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
  borderImageSlice: "8 fill",
  borderImageRepeat: "stretch",
  borderImageWidth: "calc(24px * var(--ui-scale-y, 1))",
  background: "transparent",
  padding: "calc(12px * var(--ui-scale-y, 1)) calc(18px * var(--ui-scale-y, 1))",
  minWidth: "calc(260px * var(--ui-scale-y, 1))",
  fontFamily: FONT,
  fontSize: "calc(14px * var(--ui-scale-y, 1))",
  color: "#000",
  textAlign: "center",
  outline: "none",
  imageRendering: "pixelated",
  pointerEvents: "auto",
};

const saveBoxStyle: React.CSSProperties = {
  ...stubBoxStyle,
  minWidth: "240px",
};

const saveButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "2px solid #000",
  borderRadius: "3px",
  color: "#000",
  fontFamily: FONT,
  fontSize: "13px",
  padding: "4px 16px",
  cursor: "pointer",
  letterSpacing: "0.5px",
};

const saveDots: React.CSSProperties = {
  animation: "savingDots 1s ease-in-out infinite",
};
