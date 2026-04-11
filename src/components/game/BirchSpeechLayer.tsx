import { useCallback, useEffect, useRef, useState } from "react";
import { bgm } from "@/game/systems/BGMManager";
import { sfx } from "@/game/systems/SoundManager";
import { getSettings, textSpeedMs } from "@/game/systems/Settings";
import { useTypewriter } from "@/game/hooks/useTypewriter";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";
import BirchTextBox from "./BirchTextBox";
import BirchGenderSelect from "./BirchGenderSelect";
import BirchNameInput from "./BirchNameInput";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

const sX = "var(--ui-scale-x, 1)";
const FONT = "var(--pkmn-font, 'Courier New', monospace)";

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

/**
 * Resolve the current text speed. Reads from Options (same as
 * DialogBox) so a player who has adjusted text speed in an earlier
 * session sees the intro at their preferred pace.
 */
const getTypeSpeedMs = () => textSpeedMs(getSettings().textSpeed);

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
// Controller
// ---------------------------------------------------------------------------

/**
 * BirchSpeechLayer — state-machine controller for the new-game intro.
 *
 * Responsibilities kept here:
 *   - Phase transitions (14 phases driven by effects + onComplete)
 *   - Animation state (fade, birch opacity, platform shift, player
 *     sprite visibility / transforms)
 *   - The shared `useTypewriter` hook — every text phase plays
 *     through the same state so switching lines is seamless.
 *   - Final `onComplete` callback with the chosen name + gender.
 *
 * Delegated to sub-components:
 *   - `BirchTextBox`     — 9-slice frame + speaker name + typewriter
 *                          render + A-to-advance keyboard handling.
 *   - `BirchGenderSelect` — BOY / GIRL mini-menu + keyboard.
 *   - `BirchNameInput`   — name entry form + Enter-to-confirm.
 *
 * A small inline YES / NO confirm menu handles the NAME_CONFIRM
 * phase — it's too thin to justify its own file.
 */
export default function BirchSpeechLayer({ onComplete }: BirchSpeechLayerProps) {
  // ── State machine ──────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("FADE_IN");
  const [gender, setGender] = useState<"boy" | "girl">("boy");
  const [playerName, setPlayerName] = useState("");
  const [genderCursor, setGenderCursor] = useState(0); // 0=boy, 1=girl
  const [confirmCursor, setConfirmCursor] = useState(0); // 0=yes, 1=no

  // ── Text display ───────────────────────────────────────────
  const [textLines, setTextLines] = useState<string[]>([]);
  const [textLineIndex, setTextLineIndex] = useState(0);

  // Shared typewriter. Birch plays an extra blip every 3 chars to
  // match OG Emerald's denser intro feel; DialogBox keeps only the
  // onStart blip. Speed reads from Options so preferences set in a
  // prior session apply here too.
  const {
    displayedText,
    isTyping,
    start: startTyping,
    skipToEnd,
    reset: resetTypewriter,
  } = useTypewriter({
    speedMs: getTypeSpeedMs,
    // Fire on the first char then every 8th — ~4 blips per 30-char
    // line, matching the calmer pace of the OG Emerald intro.
    onChar: (idx) => {
      if (idx === 1 || idx % 8 === 0) sfx.text();
    },
  });

  // ── Animation state ────────────────────────────────────────
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [birchOpacity, setBirchOpacity] = useState(0);
  const [platformOpacity, setPlatformOpacity] = useState(0);
  const [platformShift, setPlatformShift] = useState(false);
  const [birchVisible, setBirchVisible] = useState(true);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerShrink, setPlayerShrink] = useState(false);
  const [finalFade, setFinalFade] = useState(false);
  const [playerSwapDir, setPlayerSwapDir] = useState<"in" | "out" | null>(null);

  // ── Refs so the advance callback reads latest values without
  // re-installing keyboard listeners on every character reveal. ──
  const phaseRef = useRef(phase);
  const textLinesRef = useRef(textLines);
  const textLineIndexRef = useRef(textLineIndex);
  const isTypingRef = useRef(isTyping);
  const genderRef = useRef(gender);
  const playerNameRef = useRef(playerName);
  phaseRef.current = phase;
  textLinesRef.current = textLines;
  textLineIndexRef.current = textLineIndex;
  isTypingRef.current = isTyping;
  genderRef.current = gender;
  playerNameRef.current = playerName;

  // ── Keyframes injection ────────────────────────────────────
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

  // ── Birch speech music ─────────────────────────────────────
  useEffect(() => {
    bgm.play("birch");
    return () => { bgm.stop(); };
  }, []);

  // ── showText helper — kicks off a text sequence ────────────
  const showText = useCallback((lines: string[]) => {
    setTextLines(lines);
    setTextLineIndex(0);
    startTyping(lines[0] ?? "");
  }, [startTyping]);

  // ── Phase transition effects ───────────────────────────────
  useEffect(() => {
    if (phase === "FADE_IN") {
      const t = setTimeout(() => setFadeOpacity(1), 50);
      const t2 = setTimeout(() => setPhase("BIRCH_APPEAR"), 350);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "BIRCH_APPEAR") {
      const t = setTimeout(() => {
        setBirchOpacity(1);
        setPlatformOpacity(1);
      }, 50);
      const t2 = setTimeout(() => setPhase("WELCOME"), 2600);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "WELCOME") showText(SPEECH.WELCOME);
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "WORLD_INTRO") showText(SPEECH.WORLD_INTRO);
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "MAIN_SPEECH") showText(SPEECH.MAIN_SPEECH);
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "AND_YOU_ARE") {
      // Transition: Birch fades out, platform slides left, player fades in.
      setBirchVisible(false);
      setPlatformShift(true);
      const t = setTimeout(() => setPlayerVisible(true), 300);
      const t2 = setTimeout(() => showText(SPEECH.AND_YOU_ARE), 600);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "GENDER_SELECT") showText(SPEECH.GENDER_QUESTION);
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "WHATS_YOUR_NAME") showText(SPEECH.NAME_QUESTION);
  }, [phase, showText]);

  useEffect(() => {
    if (phase === "NAME_INPUT") {
      setTextLines([]);
      setTextLineIndex(0);
      // Clear any in-flight reveal — the text box hides in NAME_INPUT
      // and we don't want a stale line peeking through.
      resetTypewriter();
    }
  }, [phase, resetTypewriter]);

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
      const t = setTimeout(() => setFinalFade(true), 400);
      const t2 = setTimeout(() => setPhase("FADE_OUT"), 800);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "FADE_OUT") {
      const t = setTimeout(() => setPhase("DONE"), 300);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "DONE") {
      const finalName = playerNameRef.current || "RED";
      onComplete(finalName, genderRef.current);
    }
  }, [phase, onComplete]);

  // ── Text advance — shared by text-phase A-press and click ──
  const advanceText = useCallback(() => {
    if (isTypingRef.current) {
      skipToEnd();
      return;
    }

    const nextIdx = textLineIndexRef.current + 1;
    if (nextIdx < textLinesRef.current.length) {
      setTextLineIndex(nextIdx);
      startTyping(textLinesRef.current[nextIdx] ?? "");
      return;
    }

    // On the last line — drive the phase transition. GENDER_SELECT
    // and NAME_CONFIRM deliberately don't auto-advance; they wait
    // for the dedicated menu sub-component to take over.
    const currentPhase = phaseRef.current;
    switch (currentPhase) {
      case "WELCOME":        setPhase("WORLD_INTRO"); break;
      case "WORLD_INTRO":    setPhase("MAIN_SPEECH"); break;
      case "MAIN_SPEECH":    setPhase("AND_YOU_ARE"); break;
      case "AND_YOU_ARE":    setPhase("GENDER_SELECT"); break;
      case "WHATS_YOUR_NAME": setPhase("NAME_INPUT"); break;
      case "ARE_YOU_READY":  setPhase("PLAYER_SHRINK"); break;
      default: break;
    }
  }, [skipToEnd, startTyping]);

  // ── Gender swap animation ─────────────────────────────────
  const swapGender = useCallback((newGender: "boy" | "girl") => {
    if (newGender === genderRef.current) return;
    setPlayerSwapDir("out");
    setTimeout(() => {
      setGender(newGender);
      setPlayerSwapDir("in");
      setTimeout(() => setPlayerSwapDir(null), 250);
    }, 250);
  }, []);

  // ── Sub-component callbacks ───────────────────────────────
  const handleGenderCursorChange = useCallback(
    (next: number) => {
      setGenderCursor(next);
      swapGender(next === 0 ? "boy" : "girl");
    },
    [swapGender],
  );

  const handleGenderConfirm = useCallback(() => {
    setPhase("WHATS_YOUR_NAME");
  }, []);

  const handleNameSubmit = useCallback((name: string) => {
    setPlayerName(name);
    setPhase("NAME_CONFIRM");
  }, []);

  // ── Render helpers ────────────────────────────────────────
  const currentLine = textLines[textLineIndex] ?? "";
  const visibleText = displayedText;

  const showTextBox =
    phase === "WELCOME" ||
    phase === "WORLD_INTRO" ||
    phase === "MAIN_SPEECH" ||
    phase === "AND_YOU_ARE" ||
    phase === "GENDER_SELECT" ||
    phase === "WHATS_YOUR_NAME" ||
    phase === "NAME_CONFIRM" ||
    phase === "ARE_YOU_READY";

  // "Full text shown" = not typing AND on the last line of the sequence
  // AND the typewriter has actually rendered the CURRENT line to completion.
  //
  // Two flash scenarios guarded here:
  //
  // 1. PHASE TRANSITION FLASH (B2b): when `phase` flips ahead of the
  //    typewriter's next `start()`, the previous phase's `isTyping` and
  //    `textLineIndex` values are still stale in refs. Checking
  //    `displayedText.length > 0` alone is NOT enough — stale text
  //    from the previous phase satisfies that.
  //
  // 2. LINE ADVANCE FLASH (B4): when advancing from "Are you a boy?"
  //    to "Or are you a girl?", `setTextLineIndex(1)` commits one
  //    render BEFORE `startTyping(line1)` mutates the typewriter.
  //    For that single render: textLineIndex=1 (last line),
  //    isTyping=false (just finished line 0), displayedText="Are you
  //    a boy?" (still full from line 0). All three guards pass, so
  //    the gender menu flashes for one frame, then disappears when
  //    the new line starts typing.
  //
  // The fix: compare `displayedText` against the EXPECTED current
  // line (`currentLine` is derived above from `textLines[textLineIndex]`).
  // If they don't match, the typewriter hasn't caught up with
  // `textLineIndex` yet, and we're in the one-frame gap.
  const allTextShown =
    !isTyping &&
    textLineIndex >= textLines.length - 1 &&
    displayedText.length > 0 &&
    displayedText === currentLine;

  const showGenderMenu = phase === "GENDER_SELECT" && allTextShown;
  const showConfirmMenu = phase === "NAME_CONFIRM" && allTextShown;

  // The text box owns keyboard focus whenever it's rendered, EXCEPT
  // when a menu is ready to take over (GENDER_SELECT/NAME_CONFIRM with
  // all text shown). This keeps A-press from double-firing.
  const textBoxKeyboardActive = showTextBox && !showGenderMenu && !showConfirmMenu;

  const playerSprite =
    gender === "boy" ? "/game/ui/opening/brendan.png" : "/game/ui/opening/may.png";

  let playerTransform = "translateX(-50%)";
  if (playerShrink) {
    playerTransform = "translateX(-50%) scale(0) translateY(50px)";
  }
  if (playerSwapDir === "out") {
    playerTransform = "translateX(100%)";
  } else if (playerSwapDir === "in") {
    playerTransform = "translateX(-50%)";
  }

  // ── Inline NAME_CONFIRM YES/NO menu keyboard handling ─────
  // Too small to justify a fourth sub-component file; kept here
  // alongside the rest of the confirm-phase state.
  useGameKeyboard(showConfirmMenu, {
    up: () => {
      sfx.select();
      setConfirmCursor((c) => (c === 0 ? 1 : 0));
    },
    down: () => {
      sfx.select();
      setConfirmCursor((c) => (c === 0 ? 1 : 0));
    },
    confirm: () => {
      sfx.confirm();
      if (confirmCursor === 0) {
        setPhase("ARE_YOU_READY");
      } else {
        setPlayerName("");
        setPhase("NAME_INPUT");
      }
    },
    cancel: () => {
      sfx.cancel();
      setPlayerName("");
      setPhase("NAME_INPUT");
    },
    menu: () => {},
    // The OG B-button maps to "s" in the rest of the game, but the
    // original confirm menu also treated literal "b" / "B" as NO.
    other: (e) => {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        sfx.cancel();
        setPlayerName("");
        setPhase("NAME_INPUT");
      }
    },
  });

  // ── Render ────────────────────────────────────────────────
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
          width: "min(135vh, 90vw)",
          height: "min(90vh, 60vw)",
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
        {/* Green + yellow platform backdrop */}
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
              top: "22%",
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

        {/* Birch fade-out stage during AND_YOU_ARE */}
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
          <BirchTextBox
            visibleText={visibleText}
            isTyping={isTyping}
            hasLine={currentLine.length > 0}
            showBounceArrow={!showGenderMenu && !showConfirmMenu}
            active={textBoxKeyboardActive}
            onAdvance={advanceText}
          />
        )}

        {/* Gender select mini-menu */}
        {showGenderMenu && (
          <BirchGenderSelect
            cursor={genderCursor}
            onCursorChange={handleGenderCursorChange}
            onConfirm={handleGenderConfirm}
            active
          />
        )}

        {/* Name input form */}
        {phase === "NAME_INPUT" && (
          <BirchNameInput
            initialName={playerName}
            onSubmit={handleNameSubmit}
          />
        )}

        {/* Name confirm YES/NO menu (inline render — keyboard is
            handled by the hook call near the top of the component). */}
        {showConfirmMenu && (
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
      {phase === "FADE_OUT" && (
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
