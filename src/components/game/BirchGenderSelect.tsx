import { sfx } from "@/game/systems/SoundManager";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";

const sX = "var(--ui-scale-x, 1)";
const FONT = "var(--pkmn-font, 'Courier New', monospace)";

interface BirchGenderSelectProps {
  /** 0 = BOY, 1 = GIRL. */
  cursor: number;
  /**
   * Fired on ArrowUp / ArrowDown. The hook only flips between two
   * options, so the controller re-computes the new value by toggling
   * from the passed-in cursor.
   */
  onCursorChange: (nextCursor: number) => void;
  /** Fired on A-press. The controller advances to the NAME phase. */
  onConfirm: () => void;
  /**
   * True when this menu owns the keyboard. Set by the controller
   * only after the BirchTextBox finishes revealing its prompt, so
   * A-presses during the typewriter fall through to the text box.
   */
  active: boolean;
}

/**
 * BirchGenderSelect — the BOY / GIRL mini-menu shown in the top-right
 * during GENDER_SELECT after the text box finishes asking. Pure
 * presentation + keyboard dispatch; the controller owns the cursor
 * state and gender side effects (the sprite swap animation runs in
 * the controller because it mutates multiple animation states).
 */
export default function BirchGenderSelect({
  cursor,
  onCursorChange,
  onConfirm,
  active,
}: BirchGenderSelectProps) {
  useGameKeyboard(active, {
    up: () => {
      sfx.select();
      onCursorChange(cursor === 0 ? 1 : 0);
    },
    down: () => {
      sfx.select();
      onCursorChange(cursor === 0 ? 1 : 0);
    },
    confirm: () => {
      sfx.confirm();
      onConfirm();
    },
    // Block Escape — same rule as the rest of the intro.
    menu: () => {},
  });

  return (
    <div
      style={{
        position: "absolute",
        top: "30%",
        right: "8%",
        borderStyle: "solid",
        borderWidth: `calc(24px * ${sX})`,
        borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
        borderImageSlice: "8 fill",
        borderImageRepeat: "stretch",
        borderImageWidth: `calc(24px * ${sX})`,
        background: "transparent",
        boxSizing: "content-box",
        padding: `calc(8px * ${sX}) calc(24px * ${sX})`,
        fontFamily: FONT,
        fontSize: `calc(26px * ${sX})`,
        lineHeight: 2,
        color: "#000",
        zIndex: 120,
        imageRendering: "pixelated",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ width: "1.2em", display: "inline-block" }}>
          {cursor === 0 ? "▶" : " "}
        </span>
        <span>BOY</span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ width: "1.2em", display: "inline-block" }}>
          {cursor === 1 ? "▶" : " "}
        </span>
        <span>GIRL</span>
      </div>
    </div>
  );
}
