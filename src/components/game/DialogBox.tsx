import { useCallback, useEffect, useRef, useState } from "react";
import {
  GameEvents,
  emitGameEvent,
  onGameEvent,
  type DialogPayload,
} from "@/game/EventBridge";
import { getSettings, textSpeedMs } from "@/game/systems/Settings";
import { sfx } from "@/game/systems/SoundManager";
import { useTypewriter } from "@/game/hooks/useTypewriter";

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

  // Shared typewriter — the getter form of `speedMs` means live
  // Options-menu speed changes apply to in-progress lines.
  const { displayedText, isTyping, start, skipToEnd, reset } = useTypewriter({
    speedMs: getTypeSpeedMs,
    onStart: () => sfx.text(),
  });

  // Refs to give the keyboard `advance` handler access to live state
  // without re-installing the listener on every character reveal.
  const linesRef = useRef(lines);
  const lineIndexRef = useRef(lineIndex);
  const isTypingRef = useRef(isTyping);
  linesRef.current = lines;
  lineIndexRef.current = lineIndex;
  isTypingRef.current = isTyping;

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
      start(linesRef.current[nextIndex]);
    } else {
      // All lines read — close dialog
      setVisible(false);
      emitGameEvent(GameEvents.DIALOG_COMPLETE);
    }
  }, [skipToEnd, start]);

  // ---------------------------------------------------------------------------
  // Listen for SHOW_DIALOG events from Phaser
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubShow = onGameEvent(GameEvents.SHOW_DIALOG, (detail) => {
      const payload = detail as DialogPayload;
      if (!payload?.lines?.length) return;

      setLines(payload.lines);
      setSpeakerName(payload.speakerName);
      setLineIndex(0);
      setVisible(true);
      // `start` schedules the first tick synchronously — no need
      // for the previous `setTimeout(0)` hand-off dance.
      start(payload.lines[0]);
    });

    const unsubHide = onGameEvent(GameEvents.HIDE_DIALOG, () => {
      reset();
      setVisible(false);
    });

    return () => {
      unsubShow();
      unsubHide();
    };
  }, [start, reset]);

  // ---------------------------------------------------------------------------
  // Keyboard handler (A button = a/Space to advance)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!visible) return;

    const onKey = (e: KeyboardEvent) => {
      // A/Space/Enter advance dialog. B/S/Backspace also advance
      // (but these keys do NOT initiate conversations — that's handled
      // by the scene's interaction handler which only uses A).
      if (
        e.key === "a" || e.key === "A" || e.key === " " || e.key === "Enter" ||
        e.key === "s" || e.key === "S" || e.key === "Backspace"
      ) {
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
        position: "absolute",
        // Touch devices: lift the dialog above the on-screen controls
        // bar (desktop keeps --touch-bar-h = 0 so this is just 6%).
        bottom: "calc(6% + var(--touch-bar-h, 0px))",
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
        minHeight: `calc(68px * ${sX})`,
        padding: `calc(10px * ${sX}) calc(20px * ${sX})`,
        fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
        fontSize: `calc(26px * ${sX})`,
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
            top: `calc(-50px * ${sX})`,
            left: `calc(24px * ${sX})`,
            // Simple pill: solid white bg + thin black border. The 9-slice
            // frame is too thick for a small label and its transparent
            // corner pixels would reveal whatever's behind, producing a
            // halo when the pill sits over the dialog box.
            background: "#fff",
            color: "#000",
            padding: `calc(8px * ${sX}) calc(18px * ${sX})`,
            fontSize: `calc(22px * ${sX})`,
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

      <span style={{ whiteSpace: "pre-wrap" }}>{displayedText}</span>

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
