import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";

const sX = "var(--ui-scale-x, 1)";
const FONT = "var(--pkmn-font, 'Courier New', monospace)";

interface BirchTextBoxProps {
  /**
   * Currently-visible slice of the line (typewriter progress). The
   * controller owns the `useTypewriter` hook so every sub-component
   * can see consistent state; this prop is just the rendered string.
   */
  visibleText: string;
  /** Whether the typewriter is mid-reveal. Hides the ▼ bounce arrow. */
  isTyping: boolean;
  /**
   * True when at least one character has been typed for the current
   * line — gates the bounce arrow so it doesn't blink on an empty box
   * during phase transitions.
   */
  hasLine: boolean;
  /**
   * Suppress the bounce arrow when a menu is about to take over. The
   * text box is still shown in GENDER_SELECT / NAME_CONFIRM so the
   * player can read the prompt, but the "press A to continue" cue
   * would be misleading when the next input is a menu selection.
   */
  showBounceArrow: boolean;
  /**
   * True when this sub-component owns keyboard focus. The controller
   * deactivates it once the text is fully shown in menu phases so
   * BirchGenderSelect / the inline confirm menu can take over.
   */
  active: boolean;
  /**
   * Called on A-press / click. The controller decides whether that
   * means "skip to end", "next line", or "advance phase".
   */
  onAdvance: () => void;
}

/**
 * BirchTextBox — the 9-slice bordered text window shown during the
 * Birch speech. Pixel-matches DialogBox so both use the same scale
 * variables and frame art.
 *
 * Pure render + keyboard dispatch — all state (text content, cursor,
 * hook results) lives in the controller so the text box is a thin
 * leaf that can be swapped between multiple keyboard-owners cleanly.
 */
export default function BirchTextBox({
  visibleText,
  isTyping,
  hasLine,
  showBounceArrow,
  active,
  onAdvance,
}: BirchTextBoxProps) {
  // Escape should NOT dismiss the intro. Registering `menu: noop`
  // tells useGameKeyboard to swallow + preventDefault the key so
  // the browser doesn't do anything either.
  useGameKeyboard(active, {
    confirm: onAdvance,
    menu: () => {},
  });

  return (
    <div
      onClick={onAdvance}
      style={{
        position: "absolute",
        bottom: "6%",
        left: "50%",
        transform: "translateX(-50%)",
        width: `min(92%, calc(720px * ${sX}))`,
        borderStyle: "solid",
        borderWidth: `calc(24px * ${sX})`,
        borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
        borderImageSlice: "8 fill",
        borderImageRepeat: "stretch",
        borderImageWidth: `calc(24px * ${sX})`,
        background: "transparent",
        boxSizing: "content-box",
        minHeight: `calc(68px * ${sX})`,
        padding: `calc(10px * ${sX}) calc(20px * ${sX})`,
        fontFamily: FONT,
        fontSize: `calc(26px * ${sX})`,
        lineHeight: 1.5,
        color: "#000",
        cursor: "pointer",
        userSelect: "none",
        zIndex: 110,
        imageRendering: "pixelated",
      }}
    >
      {/* Speaker name pill */}
      <div
        style={{
          position: "absolute",
          top: `calc(-50px * ${sX})`,
          left: `calc(24px * ${sX})`,
          background: "#fff",
          color: "#000",
          padding: `calc(8px * ${sX}) calc(18px * ${sX})`,
          fontSize: `calc(22px * ${sX})`,
          fontWeight: 700,
          letterSpacing: "0.5px",
          border: `calc(2px * ${sX}) solid #000`,
          borderRadius: `calc(4px * ${sX})`,
          fontFamily: FONT,
        }}
      >
        KOSTAS
      </div>

      <span style={{ whiteSpace: "pre-wrap" }}>{visibleText}</span>

      {!isTyping && hasLine && showBounceArrow && (
        <span
          style={{
            display: "inline-block",
            marginLeft: `calc(6px * ${sX})`,
            animation: "birch-bounce 0.6s ease-in-out infinite alternate",
          }}
        >
          ▼
        </span>
      )}
    </div>
  );
}
