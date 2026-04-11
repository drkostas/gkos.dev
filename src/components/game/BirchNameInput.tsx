import { useEffect, useRef, useState } from "react";
import { sfx } from "@/game/systems/SoundManager";

const sX = "var(--ui-scale-x, 1)";
const FONT = "var(--pkmn-font, 'Courier New', monospace)";

interface BirchNameInputProps {
  /** Seed value for the input — blank on first visit, preserved on retry. */
  initialName: string;
  /**
   * Called when the player presses Enter. The controller trims the
   * value and falls back to "RED" if empty, then drives the phase
   * transition to NAME_CONFIRM.
   */
  onSubmit: (name: string) => void;
}

/**
 * BirchNameInput — the name entry form. Uses a native HTML `<input>`
 * so every printable key (a-z, 0-9) types naturally, which is why
 * it cannot use `useGameKeyboard` — the hook would swallow "a" / "A"
 * / Space via its confirm dispatch and break typing.
 *
 * A lightweight window listener catches Enter only; everything else
 * falls through to the focused input. Escape is explicitly blocked
 * to match the rest of the intro.
 */
export default function BirchNameInput({
  initialName,
  onSubmit,
}: BirchNameInputProps) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  // Keep a ref so the window listener reads the latest value without
  // re-installing itself on every keystroke.
  const valueRef = useRef(value);
  valueRef.current = value;

  // Focus the input a tick after mount so the text box can finish
  // its reveal animation before we steal the caret.
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Mirror the old intro rule: Escape must not dismiss the flow.
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        sfx.confirm();
        const name = valueRef.current.trim() || "RED";
        onSubmit(name);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSubmit]);

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        borderStyle: "solid",
        borderWidth: `calc(24px * ${sX})`,
        borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
        borderImageSlice: "8 fill",
        borderImageRepeat: "stretch",
        borderImageWidth: `calc(24px * ${sX})`,
        background: "transparent",
        boxSizing: "content-box",
        padding: `calc(16px * ${sX}) calc(32px * ${sX})`,
        fontFamily: FONT,
        fontSize: `calc(26px * ${sX})`,
        color: "#000",
        zIndex: 120,
        imageRendering: "pixelated",
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: `calc(12px * ${sX})`, fontWeight: 700 }}>
        YOUR NAME?
      </div>
      <input
        ref={inputRef}
        type="text"
        maxLength={10}
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="RED"
        style={{
          fontFamily: FONT,
          fontSize: `calc(26px * ${sX})`,
          padding: `calc(6px * ${sX}) calc(12px * ${sX})`,
          border: `calc(2px * ${sX}) solid #000`,
          borderRadius: `calc(2px * ${sX})`,
          background: "#fff",
          color: "#000",
          textAlign: "center",
          width: "10em",
          outline: "none",
          imageRendering: "pixelated",
        }}
      />
      <div
        style={{
          marginTop: `calc(12px * ${sX})`,
          fontSize: `calc(16px * ${sX})`,
          opacity: 0.7,
        }}
      >
        Press ENTER to confirm
      </div>
    </div>
  );
}
