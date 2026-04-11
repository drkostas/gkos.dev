import { useCallback, useEffect, useRef, useState } from "react";
import {
  GameEvents,
  emitGameEvent,
  onGameEvent,
} from "@/game/EventBridge";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";
import { useMenuNavigation } from "@/game/hooks/useMenuNavigation";
import { sfx } from "@/game/systems/SoundManager";
import { getSave } from "@/game/systems/GameSave";
import TrainerCard from "./TrainerCard";
import PokedexList from "./PokedexList";
import OptionsMenu from "./OptionsMenu";
import BagMenu from "./BagMenu";
import PartyMenu from "./PartyMenu";
import HelpScreen from "./HelpScreen";

/**
 * Menu items matching the original Pokemon Emerald start menu order.
 * "KOSTAS" replaces the trainer name slot.
 */
const MENU_ITEMS = [
  "POKeDEX",
  "POKeMON",
  "BAG",
  "KOSTAS",
  "HELP",
  "OPTION",
  "EXIT",
] as const;

type MenuItem = (typeof MENU_ITEMS)[number];

/** Sub-screen currently open (null = showing main menu). */
type SubScreen = "pokedex" | "trainer" | "party" | "bag" | "help" | "options" | null;

/**
 * StartMenu — Pokemon Emerald-style start menu overlay.
 *
 * Toggled by Escape key. Right-aligned dark panel with white text.
 * Navigate with arrows, select with Enter/Z, close with Escape/X.
 */
export default function StartMenu() {
  const [visible, setVisible] = useState(false);
  const nav = useMenuNavigation(MENU_ITEMS.length);
  const { index: selectedIndex, setIndex: setSelectedIndex } = nav;
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  // saveStep removed — SAVE replaced by HELP

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
    emitGameEvent(GameEvents.MENU_CLOSE);
  }, []);

  // ── Event bridge listeners ──────────────────────────────────
  useEffect(() => {
    const unsubShow = onGameEvent(GameEvents.SHOW_MENU, () => {
      openMenu();
    });
    // Listen for MENU_CLOSE from Phaser (e.g. Escape pressed while menu open)
    const unsubClose = onGameEvent(GameEvents.MENU_CLOSE, () => {
      if (visibleRef.current) {
        sfx.menuClose();
        setVisible(false);
        setSubScreen(null);
      }
    });

    return () => {
      unsubShow();
      unsubClose();
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
        case "HELP":
          setSubScreen("help");
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

  // Save flow removed — SAVE replaced by HELP

  // ── Keyboard navigation ─────────────────────────────────────
  // Sub-screens (pokedex, trainer, options, bag, party, help) all
  // handle their own input, so the main listener pauses whenever a
  // sub-screen is open.
  useGameKeyboard(visible && subScreen === null, {
    up: () => { sfx.select(); nav.moveUp(); },
    down: () => { sfx.select(); nav.moveDown(); },
    confirm: () => {
      sfx.confirm();
      handleSelect(MENU_ITEMS[selectedIndex]);
    },
    cancel: closeMenu,
    menu: closeMenu,
  });

  // ── Render ──────────────────────────────────────────────────
  if (!visible) return null;

  // Sub-screen overlays
  if (subScreen === "pokedex") {
    return <PokedexList onClose={() => { sfx.select(); setSubScreen(null); }} />;
  }

  if (subScreen === "trainer") {
    return <TrainerCard onClose={() => { sfx.select(); setSubScreen(null); }} />;
  }

  if (subScreen === "options") {
    return <OptionsMenu onClose={() => { sfx.select(); setSubScreen(null); }} />;
  }

  if (subScreen === "bag") {
    return <BagMenu onClose={() => { sfx.select(); setSubScreen(null); }} />;
  }

  if (subScreen === "party") {
    return <PartyMenu onClose={() => { sfx.select(); setSubScreen(null); }} />;
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
            {item === "KOSTAS" ? (getSave().playerName || "TRAINER") : item}
          </div>
        ))}
      </div>

      {/* Party and Bag — moved to their own components (early-return above). */}

      {/* Help screen */}
      {subScreen === "help" && (
        <HelpScreen onClose={() => { sfx.select(); setSubScreen(null); }} />
      )}
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
  fontSize: "calc(18px * var(--ui-scale-y, 1))",
  color: "#000",
  userSelect: "none",
  outline: "none",
  imageRendering: "pixelated",
};

const menuItemStyle: React.CSSProperties = {
  padding: "calc(4px * var(--ui-scale-y, 1)) calc(4px * var(--ui-scale-y, 1))",
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
  width: "calc(22px * var(--ui-scale-y, 1))",
  flexShrink: 0,
  fontSize: "calc(14px * var(--ui-scale-y, 1))",
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
  minWidth: "calc(280px * var(--ui-scale-y, 1))",
  fontFamily: FONT,
  fontSize: "calc(18px * var(--ui-scale-y, 1))",
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
  border: "calc(2px * var(--ui-scale-y, 1)) solid #000",
  borderRadius: "3px",
  color: "#000",
  fontFamily: FONT,
  fontSize: "calc(16px * var(--ui-scale-y, 1))",
  padding: "calc(5px * var(--ui-scale-y, 1)) calc(18px * var(--ui-scale-y, 1))",
  cursor: "pointer",
  letterSpacing: "0.5px",
};

const saveDots: React.CSSProperties = {
  animation: "savingDots 1s ease-in-out infinite",
};
