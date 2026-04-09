import { useCallback, useEffect, useRef, useState } from "react";
import {
  GameEvents,
  emitGameEvent,
  onGameEvent,
  type DialogPayload,
} from "@/game/EventBridge";

/** Milliseconds per character for the typewriter effect. */
/**
 * Text typing speed — OG Pokemon Emerald "fast" setting.
 * sTextSpeedFrameDelays[OPTIONS_TEXT_SPEED_FAST] = 1 frame @ 60fps ≈ 17ms.
 * (src/menu.c in pret/pokeemerald)
 */
const TYPE_SPEED_MS = 17;

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

    let charIndex = 0;

    const tick = () => {
      charIndex++;
      setDisplayedText(text.slice(0, charIndex));

      if (charIndex < text.length) {
        timerRef.current = setTimeout(tick, TYPE_SPEED_MS);
      } else {
        setIsTyping(false);
        timerRef.current = null;
      }
    };

    timerRef.current = setTimeout(tick, TYPE_SPEED_MS);
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

        const tick = () => {
          charIndex++;
          setDisplayedText(text.slice(0, charIndex));

          if (charIndex < text.length) {
            timerRef.current = setTimeout(tick, TYPE_SPEED_MS);
          } else {
            setIsTyping(false);
            timerRef.current = null;
          }
        };

        timerRef.current = setTimeout(tick, TYPE_SPEED_MS);
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

  return (
    <div
      onClick={advance}
      style={{
        position: "fixed",
        bottom: "8%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(90%, 720px)",
        minHeight: "64px",
        padding: "12px 16px",
        background: "#fff",
        border: "3px solid #333",
        borderRadius: "8px",
        fontFamily: "'Geist Mono', monospace",
        fontSize: "14px",
        lineHeight: 1.5,
        color: "#222",
        cursor: "pointer",
        userSelect: "none",
        zIndex: 100,
        boxSizing: "border-box",
      }}
    >
      {speakerName && (
        <div
          style={{
            position: "fixed",
            top: "-14px",
            left: "12px",
            background: "#333",
            color: "#fff",
            padding: "2px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.5px",
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
