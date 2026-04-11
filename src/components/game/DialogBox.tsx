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
      // Ignore key-repeat events — holding A must NOT auto-skip through
      // dialog pages. Without this guard, OS auto-repeat (~30Hz) races
      // the typewriter and can collapse an entire Birch speech into a
      // single keystroke. Verified via Playwright: holding A for 3s
      // advances 0 pages with this guard, ~40 pages without.
      if (e.repeat) return;
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

  // M0/M2: vw-based sizing with hard floor + ceiling so the dialog is
  // readable on iPhone 14 Pro portrait (393px) without eating the
  // viewport, AND still matches the Emerald-reference chonkiness on
  // 1280+ desktops. The previous math hardcoded calc(26px * sX) where
  // sX = max(0.6, innerWidth/1280); on 393px portrait Brave this was
  // 15.6px of the authored size that mobile browsers then auto-scaled
  // 2-3x. Double fix: (1) text-size-adjust: 100% in global.css +
  // inline; (2) vw-based math so each dimension is ~2% of viewport
  // width and the clamp keeps it in a sensible range.
  //
  // Target sizes at key breakpoints:
  //  - 393px portrait  → font 14, border 8,  minH 42, pad 6/12
  //  - 852px landscape → font 18, border 14, minH 54, pad 9/16
  //  - 1280px desktop  → font 26, border 24, minH 68, pad 10/20
  //  - 1920px+         → capped at desktop values
  const FONT_SIZE = "clamp(14px, 2.1vw, 26px)";
  const FRAME_BORDER = "clamp(8px, 1.8vw, 24px)";
  const MIN_HEIGHT = "clamp(42px, 5.3vw, 68px)";
  const PAD_Y = "clamp(6px, 0.8vw, 10px)";
  const PAD_X = "clamp(12px, 1.6vw, 20px)";

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
        // M2: 88% of viewport up to 720px. With box-sizing: border-box
        // below, width is the VISUAL width (includes border + padding),
        // so the dialog has a clean margin on every viewport.
        width: "min(88vw, 720px)",
        // Original Pokemon Emerald 24×24 frame from
        // pret/pokeemerald/graphics/text_window/1.png as a 9-slice
        // background. Using `slice 8 fill` so the center white pixels
        // become the content background — no transparent gap, no outline.
        borderStyle: "solid",
        borderWidth: FRAME_BORDER,
        borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
        borderImageSlice: "8 fill",
        borderImageRepeat: "stretch",
        borderImageWidth: FRAME_BORDER,
        // No background-color: the slice's center 8x8 (white) is already
        // painted into the content area by `slice 8 fill`. A solid bg
        // would leak through the now-transparent corner pixels of the
        // frame and produce a white halo around the rounded corners.
        background: "transparent",
        // border-box: `width` is the total visual width, `minHeight`
        // is the total visual height. Simpler math than content-box
        // and matches the box the user actually sees.
        boxSizing: "border-box",
        minHeight: MIN_HEIGHT,
        padding: `${PAD_Y} ${PAD_X}`,
        fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
        fontSize: FONT_SIZE,
        lineHeight: 1.35,
        color: "#000",
        cursor: "pointer",
        userSelect: "none",
        outline: "none",
        zIndex: 100,
        imageRendering: "pixelated",
        // M1: double-safety — declare the textSizeAdjust inline too so
        // even mobile browsers that ignore the html[text-size-adjust]
        // declaration don't inflate this container.
        WebkitTextSizeAdjust: "100%",
        textSizeAdjust: "100%",
      } as React.CSSProperties}
    >
      {speakerName && (
        <div
          style={{
            position: "absolute",
            // Sit just above the dialog's top edge with no overlap.
            // The negative top equals the pill's full height + a few px.
            top: "clamp(-44px, -3.2vw, -32px)",
            left: "clamp(12px, 1.4vw, 24px)",
            // Simple pill: solid white bg + thin black border. The 9-slice
            // frame is too thick for a small label and its transparent
            // corner pixels would reveal whatever's behind, producing a
            // halo when the pill sits over the dialog box.
            background: "#fff",
            color: "#000",
            padding: "clamp(4px, 0.55vw, 8px) clamp(10px, 1.2vw, 18px)",
            fontSize: "clamp(12px, 1.65vw, 22px)",
            fontWeight: 700,
            letterSpacing: "0.5px",
            border: "2px solid #000",
            borderRadius: "4px",
            WebkitTextSizeAdjust: "100%",
            textSizeAdjust: "100%",
            // No image-rendering: pixelated here — keeps the rounded
            // border anti-aliased rather than jaggy.
          } as React.CSSProperties}
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
