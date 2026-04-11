import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";

const FONT = "var(--pkmn-font, 'Courier New', monospace)";

// M0/M1/M2 — vw-based sizing that matches DialogBox.tsx exactly so the
// Birch speech and the in-game dialog render at the same pixel size.
// The previous calc(*px * --ui-scale-x) math was inflated 2-3x by mobile
// browser text autosizing, producing the "50% of viewport" dialog the
// user reported on Mobile Safari + Brave iOS.
//
// Target sizes at key breakpoints:
//  393px portrait  → font 14, border 8,  minH 42, pad 6/12
//  852px landscape → font 18, border 14, minH 54, pad 9/16
//  1280px desktop  → font 26, border 24, minH 68, pad 10/20
const BIRCH_FONT = "clamp(14px, 2.1vw, 26px)";
const BIRCH_BORDER = "clamp(8px, 1.8vw, 24px)";
const BIRCH_MIN_H = "clamp(42px, 5.3vw, 68px)";
const BIRCH_PAD_Y = "clamp(6px, 0.8vw, 10px)";
const BIRCH_PAD_X = "clamp(12px, 1.6vw, 20px)";

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
        // Sit ABOVE the on-screen touch bar so the d-pad / A-B
        // buttons don't overlap the text. --touch-bar-h is 0 on
        // desktop so `6%` is the only effective offset there; on
        // touch it lifts the textbox by ~140px so the dialog sits
        // in the upper half of the viewport, well clear of the
        // controls at the bottom.
        bottom: `calc(6% + var(--touch-bar-h, 0px))`,
        left: "50%",
        transform: "translateX(-50%)",
        // M2: 92% of the PARENT (BirchSpeechLayer's 3:2 aspect container).
        // The parent has `overflow: hidden` at width = min(135vh, 90vw),
        // so a viewport-based width would get clipped on narrow/landscape
        // screens. Percentage keeps the dialog inside the GBA screen area.
        width: "92%",
        maxWidth: "720px",
        borderStyle: "solid",
        borderWidth: BIRCH_BORDER,
        borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
        borderImageSlice: "8 fill",
        borderImageRepeat: "stretch",
        borderImageWidth: BIRCH_BORDER,
        background: "transparent",
        boxSizing: "border-box",
        minHeight: BIRCH_MIN_H,
        padding: `${BIRCH_PAD_Y} ${BIRCH_PAD_X}`,
        fontFamily: FONT,
        fontSize: BIRCH_FONT,
        lineHeight: 1.35,
        color: "#000",
        cursor: "pointer",
        userSelect: "none",
        zIndex: 110,
        imageRendering: "pixelated",
        // M1: inline `text-size-adjust: 100%` as double-safety against
        // mobile browsers that ignore the html[text-size-adjust] rule.
        WebkitTextSizeAdjust: "100%",
        textSizeAdjust: "100%",
      } as React.CSSProperties}
    >
      {/* Speaker name pill */}
      <div
        style={{
          position: "absolute",
          top: "clamp(-44px, -3.2vw, -32px)",
          left: "clamp(12px, 1.4vw, 24px)",
          background: "#fff",
          color: "#000",
          padding: "clamp(4px, 0.55vw, 8px) clamp(10px, 1.2vw, 18px)",
          fontSize: "clamp(12px, 1.65vw, 22px)",
          fontWeight: 700,
          letterSpacing: "0.5px",
          border: "2px solid #000",
          borderRadius: "4px",
          fontFamily: FONT,
          WebkitTextSizeAdjust: "100%",
          textSizeAdjust: "100%",
        } as React.CSSProperties}
      >
        KOSTAS
      </div>

      <span style={{ whiteSpace: "pre-wrap" }}>{visibleText}</span>

      {!isTyping && hasLine && showBounceArrow && (
        <span
          style={{
            display: "inline-block",
            marginLeft: "6px",
            animation: "birch-bounce 0.6s ease-in-out infinite alternate",
          }}
        >
          ▼
        </span>
      )}
    </div>
  );
}
