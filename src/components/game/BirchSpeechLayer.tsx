import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface BirchSpeechLayerProps {
  onComplete: (playerName: string, playerGender: "boy" | "girl") => void;
}

type Phase =
  | "FADE_IN"
  | "BIRCH_APPEAR"
  | "WELCOME"
  | "WORLD_INTRO"
  | "MAIN_SPEECH"
  | "AND_YOU_ARE"
  | "GENDER_SELECT"
  | "WHATS_YOUR_NAME"
  | "NAME_INPUT"
  | "NAME_CONFIRM"
  | "ARE_YOU_READY"
  | "PLAYER_SHRINK"
  | "FADE_OUT"
  | "DONE";

const TYPE_SPEED_MS = 30;

const SPEECH = {
  WELCOME: [
    "Hello there! Welcome to the",
    "world of POKeMON!",
  ],
  WORLD_INTRO: [
    "My name is KOSTAS.",
    "But people call me",
    "the ML PROFESSOR!",
  ],
  MAIN_SPEECH: [
    "This world is inhabited by",
    "creatures called POKeMON...",
    "Er, I mean, PROJECTS!",
    "Walk up to them to learn about",
    "each one.",
  ],
  AND_YOU_ARE: [
    "Now tell me a little bit",
    "about yourself.",
  ],
  GENDER_QUESTION: [
    "Are you a boy?",
    "Or are you a girl?",
  ],
  NAME_QUESTION: [
    "All right.",
    "What's your name?",
  ],
  NAME_CONFIRM: (name: string) => [
    `So it's ${name}?`,
  ],
  READY: (name: string) => [
    `${name}!`,
    "Your very own adventure is",
    "about to unfold!",
    "A world of dreams and",
    "discoveries awaits! Let's go!",
  ],
};

const STYLE_ID = "birch-speech-keyframes";

const keyframesCSS = `
@keyframes birch-bounce {
  from { transform: translateY(0); }
  to   { transform: translateY(4px); }
}
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BirchSpeechLayer({ onComplete }: BirchSpeechLayerProps) {
  // State machine
  const [phase, setPhase] = useState<Phase>("FADE_IN");
  const [gender, setGender] = useState<"boy" | "girl">("boy");
  const [playerName, setPlayerName] = useState("");
  const [genderCursor, setGenderCursor] = useState(0); // 0=boy, 1=girl
  const [confirmCursor, setConfirmCursor] = useState(0); // 0=yes, 1=no

  // Text display state
  const [textLines, setTextLines] = useState<string[]>([]);
  const [textLineIndex, setTextLineIndex] = useState(0);
  const [displayedChars, setDisplayedChars] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  // Animation state
  const [fadeOpacity, setFadeOpacity] = useState(0); // screen fade (0=black, 1=visible)
  const [birchOpacity, setBirchOpacity] = useState(0);
  const [platformOpacity, setPlatformOpacity] = useState(0);
  const [platformShift, setPlatformShift] = useState(false); // slide left
  const [birchVisible, setBirchVisible] = useState(true);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerShrink, setPlayerShrink] = useState(false);
  const [finalFade, setFinalFade] = useState(false);
  const [playerSwapDir, setPlayerSwapDir] = useState<"in" | "out" | null>(null);

  // Refs
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef(phase);
  const textLinesRef = useRef(textLines);
  const textLineIndexRef = useRef(textLineIndex);
  const isTypingRef = useRef(isTyping);
  const displayedCharsRef = useRef(displayedChars);
  const inputRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef(gender);
  const playerNameRef = useRef(playerName);

  // Sync refs
  phaseRef.current = phase;
  textLinesRef.current = textLines;
  textLineIndexRef.current = textLineIndex;
  isTypingRef.current = isTyping;
  displayedCharsRef.current = displayedChars;
  genderRef.current = gender;
  playerNameRef.current = playerName;

  // ---------------------------------------------------------------------------
  // Inject keyframes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = keyframesCSS;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Typewriter engine
  // ---------------------------------------------------------------------------
  const startTypingLine = useCallback((lines: string[], index: number) => {
    setDisplayedChars(0);
    const line = lines[index] ?? "";
    if (line.length === 0) {
      // Empty line — immediately "done"
      setIsTyping(false);
      return;
    }
    setIsTyping(true);

    let charIdx = 0;
    const tick = () => {
      charIdx++;
      setDisplayedChars(charIdx);
      if (charIdx < line.length) {
        typeTimerRef.current = setTimeout(tick, TYPE_SPEED_MS);
      } else {
        setIsTyping(false);
        typeTimerRef.current = null;
      }
    };
    typeTimerRef.current = setTimeout(tick, TYPE_SPEED_MS);
  }, []);

  const skipToEnd = useCallback(() => {
    if (typeTimerRef.current) {
      clearTimeout(typeTimerRef.current);
      typeTimerRef.current = null;
    }
    const line = textLinesRef.current[textLineIndexRef.current] ?? "";
    setDisplayedChars(line.length);
    setIsTyping(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Start a text sequence for a phase
  // ---------------------------------------------------------------------------
  const showText = useCallback((lines: string[]) => {
    setTextLines(lines);
    setTextLineIndex(0);
    startTypingLine(lines, 0);
  }, [startTypingLine]);

  // ---------------------------------------------------------------------------
  // Phase transitions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase === "FADE_IN") {
      // Fade the screen from black
      const t = setTimeout(() => {
        setFadeOpacity(1);
      }, 50);
      const t2 = setTimeout(() => {
        setPhase("BIRCH_APPEAR");
      }, 350);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "BIRCH_APPEAR") {
      // Fade in Birch + platform over 2.5s
      const t = setTimeout(() => {
        setBirchOpacity(1);
        setPlatformOpacity(1);
      }, 50);
      const t2 = setTimeout(() => {
        setPhase("WELCOME");
      }, 2600);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "WELCOME") {
      showText(SPEECH.WELCOME);
    }
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "WORLD_INTRO") {
      showText(SPEECH.WORLD_INTRO);
    }
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "MAIN_SPEECH") {
      showText(SPEECH.MAIN_SPEECH);
    }
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "AND_YOU_ARE") {
      // Transition: Birch fades out, platform slides left, player fades in
      setBirchVisible(false);
      setPlatformShift(true);
      const t = setTimeout(() => {
        setPlayerVisible(true);
      }, 300);
      const t2 = setTimeout(() => {
        showText(SPEECH.AND_YOU_ARE);
      }, 600);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "GENDER_SELECT") {
      showText(SPEECH.GENDER_QUESTION);
    }
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "WHATS_YOUR_NAME") {
      showText(SPEECH.NAME_QUESTION);
    }
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "NAME_INPUT") {
      setTextLines([]);
      setTextLineIndex(0);
      setDisplayedChars(0);
      setIsTyping(false);
      // Focus the input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "NAME_CONFIRM") {
      const name = playerNameRef.current || "RED";
      showText(SPEECH.NAME_CONFIRM(name));
    }
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "ARE_YOU_READY") {
      const name = playerNameRef.current || "RED";
      showText(SPEECH.READY(name));
    }
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "PLAYER_SHRINK") {
      setPlayerShrink(true);
      const t = setTimeout(() => {
        setFinalFade(true);
      }, 400);
      const t2 = setTimeout(() => {
        setPhase("FADE_OUT");
      }, 800);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "FADE_OUT") {
      const t = setTimeout(() => {
        setPhase("DONE");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "DONE") {
      const finalName = playerNameRef.current || "RED";
      onComplete(finalName, genderRef.current);
    }
  }, [phase, onComplete]);

  // ---------------------------------------------------------------------------
  // Text advance handler
  // ---------------------------------------------------------------------------
  const advanceText = useCallback(() => {
    if (isTypingRef.current) {
      skipToEnd();
      return;
    }

    const nextIdx = textLineIndexRef.current + 1;
    if (nextIdx < textLinesRef.current.length) {
      setTextLineIndex(nextIdx);
      startTypingLine(textLinesRef.current, nextIdx);
    } else {
      // Text sequence done — advance phase
      const currentPhase = phaseRef.current;
      switch (currentPhase) {
        case "WELCOME":
          setPhase("WORLD_INTRO");
          break;
        case "WORLD_INTRO":
          setPhase("MAIN_SPEECH");
          break;
        case "MAIN_SPEECH":
          setPhase("AND_YOU_ARE");
          break;
        case "AND_YOU_ARE":
          setPhase("GENDER_SELECT");
          break;
        case "GENDER_SELECT":
          // Don't auto-advance — wait for menu selection
          break;
        case "WHATS_YOUR_NAME":
          setPhase("NAME_INPUT");
          break;
        case "NAME_CONFIRM":
          // Don't auto-advance — wait for yes/no
          break;
        case "ARE_YOU_READY":
          setPhase("PLAYER_SHRINK");
          break;
        default:
          break;
      }
    }
  }, [skipToEnd, startTypingLine]);

  // ---------------------------------------------------------------------------
  // Gender swap animation
  // ---------------------------------------------------------------------------
  const swapGender = useCallback((newGender: "boy" | "girl") => {
    if (newGender === genderRef.current) return;
    setPlayerSwapDir("out");
    setTimeout(() => {
      setGender(newGender);
      setPlayerSwapDir("in");
      setTimeout(() => {
        setPlayerSwapDir(null);
      }, 250);
    }, 250);
  }, []);

  // ---------------------------------------------------------------------------
  // Keyboard handler
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const currentPhase = phaseRef.current;

      // During NAME_INPUT, let the input handle keys
      if (currentPhase === "NAME_INPUT") {
        if (e.key === "Enter") {
          e.preventDefault();
          const name = playerNameRef.current.trim() || "RED";
          setPlayerName(name);
          setPhase("NAME_CONFIRM");
        }
        return;
      }

      // Block dismissal keys
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }

      // GENDER_SELECT menu navigation
      if (currentPhase === "GENDER_SELECT") {
        // Only respond to menu keys after text is done
        if (isTypingRef.current) {
          if (["a", "A", " ", "Enter"].includes(e.key)) {
            e.preventDefault();
            skipToEnd();
          }
          return;
        }
        // Check if all text lines are shown
        const allTextDone = textLineIndexRef.current >= textLinesRef.current.length - 1 &&
          displayedCharsRef.current >= (textLinesRef.current[textLineIndexRef.current]?.length ?? 0);

        if (!allTextDone) {
          if (["a", "A", " ", "Enter"].includes(e.key)) {
            e.preventDefault();
            advanceText();
          }
          return;
        }

        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          setGenderCursor(prev => {
            const next = prev === 0 ? 1 : 0;
            swapGender(next === 0 ? "boy" : "girl");
            return next;
          });
        } else if (["a", "A", " ", "Enter"].includes(e.key)) {
          e.preventDefault();
          setPhase("WHATS_YOUR_NAME");
        }
        return;
      }

      // NAME_CONFIRM yes/no navigation
      if (currentPhase === "NAME_CONFIRM") {
        if (isTypingRef.current) {
          if (["a", "A", " ", "Enter"].includes(e.key)) {
            e.preventDefault();
            skipToEnd();
          }
          return;
        }
        const allTextDone = textLineIndexRef.current >= textLinesRef.current.length - 1 &&
          displayedCharsRef.current >= (textLinesRef.current[textLineIndexRef.current]?.length ?? 0);

        if (!allTextDone) {
          if (["a", "A", " ", "Enter"].includes(e.key)) {
            e.preventDefault();
            advanceText();
          }
          return;
        }

        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          setConfirmCursor(prev => prev === 0 ? 1 : 0);
        } else if (["a", "A", " ", "Enter"].includes(e.key)) {
          e.preventDefault();
          if (confirmCursor === 0) {
            // Yes
            setPhase("ARE_YOU_READY");
          } else {
            // No — go back to name input
            setPlayerName("");
            setPhase("NAME_INPUT");
          }
        } else if (["b", "B", "Backspace"].includes(e.key)) {
          e.preventDefault();
          // B = No
          setPlayerName("");
          setPhase("NAME_INPUT");
        }
        return;
      }

      // Standard text phases: A/Enter/Space advances
      if (["a", "A", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        // Don't advance during non-text phases
        if (
          currentPhase === "FADE_IN" ||
          currentPhase === "BIRCH_APPEAR" ||
          currentPhase === "PLAYER_SHRINK" ||
          currentPhase === "FADE_OUT" ||
          currentPhase === "DONE"
        ) {
          return;
        }
        advanceText();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advanceText, skipToEnd, swapGender, confirmCursor]);

  // ---------------------------------------------------------------------------
  // Click handler for text advancement
  // ---------------------------------------------------------------------------
  const handleTextBoxClick = useCallback(() => {
    const currentPhase = phaseRef.current;
    if (
      currentPhase === "FADE_IN" ||
      currentPhase === "BIRCH_APPEAR" ||
      currentPhase === "PLAYER_SHRINK" ||
      currentPhase === "FADE_OUT" ||
      currentPhase === "DONE" ||
      currentPhase === "NAME_INPUT"
    ) {
      return;
    }
    if (currentPhase === "GENDER_SELECT" || currentPhase === "NAME_CONFIRM") {
      // Only advance text, not confirm selection
      if (isTypingRef.current) {
        skipToEnd();
      }
      return;
    }
    advanceText();
  }, [advanceText, skipToEnd]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const currentLine = textLines[textLineIndex] ?? "";
  const visibleText = currentLine.slice(0, displayedChars);

  const showTextBox =
    phase === "WELCOME" ||
    phase === "WORLD_INTRO" ||
    phase === "MAIN_SPEECH" ||
    phase === "AND_YOU_ARE" ||
    phase === "GENDER_SELECT" ||
    phase === "WHATS_YOUR_NAME" ||
    phase === "NAME_CONFIRM" ||
    phase === "ARE_YOU_READY";

  const showGenderMenu =
    phase === "GENDER_SELECT" &&
    !isTyping &&
    textLineIndex >= textLines.length - 1 &&
    displayedChars >= currentLine.length;

  const showConfirmMenu =
    phase === "NAME_CONFIRM" &&
    !isTyping &&
    textLineIndex >= textLines.length - 1 &&
    displayedChars >= currentLine.length;

  const playerSprite = gender === "boy" ? "/game/ui/opening/brendan.png" : "/game/ui/opening/may.png";

  // Player transform for shrink animation
  let playerTransform = "translateX(-50%)";
  if (playerShrink) {
    playerTransform = "translateX(-50%) scale(0) translateY(50px)";
  }
  if (playerSwapDir === "out") {
    playerTransform = "translateX(100%)";
  } else if (playerSwapDir === "in") {
    playerTransform = "translateX(-50%)";
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (phase === "DONE") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
      }}
    >
      {/* GBA aspect-ratio container */}
      <div
        style={{
          position: "relative",
          width: "min(150vh, 100vw)",
          height: "min(100vh, 66.67vw)",
          overflow: "hidden",
          opacity: finalFade ? 0 : fadeOpacity,
          transition: phase === "FADE_IN"
            ? "opacity 300ms ease-in"
            : finalFade
              ? "opacity 300ms ease-out"
              : undefined,
          background: "#000",
        }}
      >
        {/* OG Birch speech background (green gradient + yellow platform) */}
        <img
          src="/game/ui/opening/birch_bg.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: "pixelated",
            opacity: platformOpacity,
            transition: "opacity 2.5s ease-in",
          }}
        />

        {/* Birch sprite */}
        {birchVisible && (
          <div
            style={{
              position: "absolute",
              bottom: "28%",
              left: "50%",
              transform: "translateX(-50%)",
              opacity: birchOpacity,
              transition: phase === "AND_YOU_ARE"
                ? "opacity 500ms ease-out"
                : "opacity 2.5s ease-in",
              width: "18%",
              maxWidth: "200px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src="/game/ui/opening/birch.png"
              alt="Professor Kostas"
              style={{
                width: "100%",
                height: "auto",
                imageRendering: "pixelated",
              }}
            />
          </div>
        )}

        {/* Birch fade out during AND_YOU_ARE */}
        {phase === "AND_YOU_ARE" && !birchVisible && (
          <div
            style={{
              position: "absolute",
              bottom: "28%",
              left: "50%",
              transform: "translateX(-50%)",
              opacity: 0,
              transition: "opacity 500ms ease-out",
              width: "18%",
              maxWidth: "200px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src="/game/ui/opening/birch.png"
              alt=""
              style={{
                width: "100%",
                height: "auto",
                imageRendering: "pixelated",
              }}
            />
          </div>
        )}

        {/* Player sprite */}
        {playerVisible && (
          <div
            style={{
              position: "absolute",
              bottom: "28%",
              left: platformShift ? "25%" : "50%",
              transform: playerTransform,
              opacity: playerSwapDir === "out" ? 0 : 1,
              transition: playerShrink
                ? "transform 800ms ease-in, opacity 800ms ease-in"
                : "transform 250ms ease-in-out, opacity 250ms ease-in-out, left 500ms ease-in-out",
              width: "18%",
              maxWidth: "200px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src={playerSprite}
              alt="Player"
              style={{
                width: "100%",
                height: "auto",
                imageRendering: "pixelated",
              }}
            />
          </div>
        )}

        {/* Text box */}
        {showTextBox && (
          <div
            onClick={handleTextBoxClick}
            style={{
              position: "absolute",
              bottom: "6%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(92%, 720px)",
              borderStyle: "solid",
              borderWidth: "24px",
              borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
              borderImageSlice: "8 fill",
              borderImageRepeat: "stretch",
              borderImageWidth: "24px",
              background: "transparent",
              boxSizing: "content-box",
              minHeight: "68px",
              padding: "10px 20px",
              fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
              fontSize: "clamp(14px, 2.2vw, 26px)",
              lineHeight: 1.5,
              color: "#000",
              cursor: "pointer",
              userSelect: "none",
              zIndex: 110,
              imageRendering: "pixelated",
            }}
          >
            {/* Speaker name */}
            <div
              style={{
                position: "absolute",
                top: "-50px",
                left: "24px",
                background: "#fff",
                color: "#000",
                padding: "8px 18px",
                fontSize: "clamp(11px, 1.8vw, 22px)",
                fontWeight: 700,
                letterSpacing: "0.5px",
                border: "2px solid #000",
                borderRadius: "4px",
                fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
              }}
            >
              KOSTAS
            </div>

            <span>{visibleText}</span>

            {/* Bouncing arrow when waiting for input */}
            {!isTyping && currentLine.length > 0 && phase !== "GENDER_SELECT" && phase !== "NAME_CONFIRM" && (
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
        )}

        {/* Gender select menu */}
        {showGenderMenu && (
          <div
            style={{
              position: "absolute",
              top: "30%",
              right: "8%",
              borderStyle: "solid",
              borderWidth: "24px",
              borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
              borderImageSlice: "8 fill",
              borderImageRepeat: "stretch",
              borderImageWidth: "24px",
              background: "transparent",
              boxSizing: "content-box",
              padding: "8px 24px",
              fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
              fontSize: "clamp(14px, 2.2vw, 26px)",
              lineHeight: 2,
              color: "#000",
              zIndex: 120,
              imageRendering: "pixelated",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ width: "1.2em", display: "inline-block" }}>
                {genderCursor === 0 ? "▶" : " "}
              </span>
              <span>BOY</span>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ width: "1.2em", display: "inline-block" }}>
                {genderCursor === 1 ? "▶" : " "}
              </span>
              <span>GIRL</span>
            </div>
          </div>
        )}

        {/* Name input */}
        {phase === "NAME_INPUT" && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              borderStyle: "solid",
              borderWidth: "24px",
              borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
              borderImageSlice: "8 fill",
              borderImageRepeat: "stretch",
              borderImageWidth: "24px",
              background: "transparent",
              boxSizing: "content-box",
              padding: "16px 32px",
              fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
              fontSize: "clamp(14px, 2.2vw, 26px)",
              color: "#000",
              zIndex: 120,
              imageRendering: "pixelated",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "12px", fontWeight: 700 }}>
              YOUR NAME?
            </div>
            <input
              ref={inputRef}
              type="text"
              maxLength={10}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
              placeholder="RED"
              style={{
                fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
                fontSize: "clamp(14px, 2.2vw, 26px)",
                padding: "6px 12px",
                border: "2px solid #000",
                borderRadius: "2px",
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
                marginTop: "12px",
                fontSize: "clamp(10px, 1.5vw, 16px)",
                opacity: 0.7,
              }}
            >
              Press ENTER to confirm
            </div>
          </div>
        )}

        {/* Name confirm menu (YES / NO) */}
        {showConfirmMenu && (
          <div
            style={{
              position: "absolute",
              top: "30%",
              right: "8%",
              borderStyle: "solid",
              borderWidth: "24px",
              borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
              borderImageSlice: "8 fill",
              borderImageRepeat: "stretch",
              borderImageWidth: "24px",
              background: "transparent",
              boxSizing: "content-box",
              padding: "8px 24px",
              fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
              fontSize: "clamp(14px, 2.2vw, 26px)",
              lineHeight: 2,
              color: "#000",
              zIndex: 120,
              imageRendering: "pixelated",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ width: "1.2em", display: "inline-block" }}>
                {confirmCursor === 0 ? "▶" : " "}
              </span>
              <span>YES</span>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ width: "1.2em", display: "inline-block" }}>
                {confirmCursor === 1 ? "▶" : " "}
              </span>
              <span>NO</span>
            </div>
          </div>
        )}
      </div>

      {/* Final black overlay for FADE_OUT */}
      {(phase === "FADE_OUT") && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#000",
            opacity: 1,
            zIndex: 600,
          }}
        />
      )}
    </div>
  );
}
