import { useCallback, useEffect, useRef, useState } from "react";
import {
  GameEvents,
  emitGameEvent,
  onGameEvent,
  type DialogPayload,
} from "@/game/EventBridge";
import { getSettings, textSpeedMs } from "@/game/systems/Settings";
import { sfx } from "@/game/systems/SoundManager";

/**
 * Read the current text-speed setting at the moment a dialog opens.
 * Pokemon Emerald sTextSpeedFrameDelays:
 *   slow = 8 frames (133ms), mid = 4 frames (66ms), fast = 1 frame (17ms).
 */
const getTypeSpeedMs = () => textSpeedMs(getSettings().textSpeed);

/**
 * Pokemon-style dialog box rendered as a React overlay.
 *
 * Listens for SHOW_DIALOG events from the Phaser EventBridge,
 * displays lines with a typewriter effect, and fires
 * DIALOG_COMPLETE when the player has advanced through all lines.
 *
 * Controls: Enter / Space / Z key, or click/tap to advance.
 */
export default function DialogBox() {
  const [visible, setVisible] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [speakerName, setSpeakerName] = useState<string | undefined>();
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Refs to access latest state inside event handlers / timers
  const linesRef = useRef(lines);
  const lineIndexRef = useRef(lineIndex);
  const isTypingRef = useRef(isTyping);
  const displayedTextRef = useRef(displayedText);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync
  linesRef.current = lines;
  lineIndexRef.current = lineIndex;
  isTypingRef.current = isTyping;
  displayedTextRef.current = displayedText;

  // ---------------------------------------------------------------------------
  // Typewriter effect
  // ---------------------------------------------------------------------------
  const startTyping = useCallback((text: string) => {
    setDisplayedText("");
    setIsTyping(true);
    sfx.text(); // single blip when line starts

    let charIndex = 0;

    const tick = () => {
      charIndex++;
      setDisplayedText(text.slice(0, charIndex));

      if (charIndex < text.length) {
        timerRef.current = setTimeout(tick, getTypeSpeedMs());
      } else {
        setIsTyping(false);
        timerRef.current = null;
      }
    };

    timerRef.current = setTimeout(tick, getTypeSpeedMs());
  }, []);

  /** Skip to end of current line instantly. */
  const skipToEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const fullLine = linesRef.current[lineIndexRef.current] ?? "";
    setDisplayedText(fullLine);
    setIsTyping(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Advance handler (called on keypress / click)
  // ---------------------------------------------------------------------------
  const advance = useCallback(() => {
    if (isTypingRef.current) {
      // Still typing — skip to end of current line
      skipToEnd();
      return;
    }

    sfx.select();
    const nextIndex = lineIndexRef.current + 1;

    if (nextIndex < linesRef.current.length) {
      // More lines to show
      setLineIndex(nextIndex);
      startTyping(linesRef.current[nextIndex]);
    } else {
      // All lines read — close dialog
      setVisible(false);
      emitGameEvent(GameEvents.DIALOG_COMPLETE);
    }
  }, [skipToEnd, startTyping]);

  // ---------------------------------------------------------------------------
  // Listen for SHOW_DIALOG events from Phaser
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubShow = onGameEvent(GameEvents.SHOW_DIALOG, (detail) => {
      const payload = detail as DialogPayload;
      if (!payload?.lines?.length) return;

      // Reset state
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setLines(payload.lines);
      setSpeakerName(payload.speakerName);
      setLineIndex(0);
      setDisplayedText("");
      setIsTyping(false);
      setVisible(true);

      // Kick off typing for the first line on the next tick so
      // state updates have flushed (refs will be current).
      setTimeout(() => {
        // Re-read from payload directly so we don't depend on stale ref
        let charIndex = 0;
        const text = payload.lines[0];

        setIsTyping(true);
        sfx.text(); // single blip when line starts

        const tick = () => {
          charIndex++;
          setDisplayedText(text.slice(0, charIndex));

          if (charIndex < text.length) {
            timerRef.current = setTimeout(tick, getTypeSpeedMs());
          } else {
            setIsTyping(false);
            timerRef.current = null;
          }
        };

        timerRef.current = setTimeout(tick, getTypeSpeedMs());
      }, 0);
    });

    const unsubHide = onGameEvent(GameEvents.HIDE_DIALOG, () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(false);
    });

    return () => {
      unsubShow();
      unsubHide();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []); // stable — no deps needed, uses refs internally

  // ---------------------------------------------------------------------------
  // Keyboard handler (Enter / Space / Z to advance)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!visible) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "z" || e.key === "Z") {
        e.preventDefault();
        advance();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, advance]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!visible) return null;

  // All dimensions scale with the X-axis ratio (window.innerWidth / 1280)
  // so the dialog grows on wider screens. Computed via CSS calc() so it
  // updates live with --ui-scale-x.
  const sX = "var(--ui-scale-x, 1)";

  return (
    <div
      onClick={advance}
      style={{
        position: "fixed",
        bottom: "6%",
        left: "50%",
        transform: "translateX(-50%)",
        width: `min(92%, calc(720px * ${sX}))`,
        // Original Pokemon Emerald 24×24 frame from
        // pret/pokeemerald/graphics/text_window/1.png as a 9-slice
        // background. Using `slice 8 fill` so the center white pixels
        // become the content background — no transparent gap, no outline.
        borderStyle: "solid",
        borderWidth: `calc(24px * ${sX})`,
        borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
        borderImageSlice: "8 fill",
        borderImageRepeat: "stretch",
        borderImageWidth: `calc(24px * ${sX})`,
        // No background-color: the slice's center 8x8 (white) is already
        // painted into the content area by `slice 8 fill`. A solid bg
        // would leak through the now-transparent corner pixels of the
        // frame and produce a white halo around the rounded corners.
        background: "transparent",
        // Use content-box so minHeight describes the inner content area
        // (not including border + padding). This prevents the squeeze
        // where border+padding ate all of minHeight.
        boxSizing: "content-box",
        minHeight: `calc(48px * ${sX})`,
        padding: `calc(6px * ${sX}) calc(16px * ${sX})`,
        fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
        fontSize: `calc(16px * ${sX})`,
        lineHeight: 1.5,
        color: "#000",
        cursor: "pointer",
        userSelect: "none",
        outline: "none",
        zIndex: 100,
        imageRendering: "pixelated",
      }}
    >
      {speakerName && (
        <div
          style={{
            position: "absolute",
            // Sit just above the dialog's top edge with no overlap.
            // The negative top equals the pill's full height + a few px.
            top: `calc(-32px * ${sX})`,
            left: `calc(20px * ${sX})`,
            // Simple pill: solid white bg + thin black border. The 9-slice
            // frame is too thick for a small label and its transparent
            // corner pixels would reveal whatever's behind, producing a
            // halo when the pill sits over the dialog box.
            background: "#fff",
            color: "#000",
            padding: `calc(4px * ${sX}) calc(12px * ${sX})`,
            fontSize: `calc(13px * ${sX})`,
            fontWeight: 700,
            letterSpacing: "0.5px",
            border: `calc(2px * ${sX}) solid #000`,
            borderRadius: `calc(4px * ${sX})`,
            // No image-rendering: pixelated here — keeps the rounded
            // border anti-aliased rather than jaggy.
          }}
        >
          {speakerName}
        </div>
      )}

      <span>{displayedText}</span>

      {/* Bouncing ▼ indicator when waiting for input */}
      {!isTyping && (
        <span
          style={{
            display: "inline-block",
            marginLeft: "6px",
            animation: "dialogBounce 0.6s ease-in-out infinite alternate",
          }}
        >
          ▼
        </span>
      )}

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes dialogBounce {
          from { transform: translateY(0); }
          to   { transform: translateY(4px); }
        }
      `}</style>
    </div>
  );
}
