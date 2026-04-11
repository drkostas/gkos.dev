import { useCallback, useEffect, useRef, useState } from "react";
import {
  GameEvents,
  emitGameEvent,
  onGameEvent,
  type QuestionnairePayload,
} from "@/game/EventBridge";
import { giveItem, hasItem } from "@/game/systems/GameSave";
import { getItemDef } from "@/game/data/itemDefinitions";
import {
  QUESTIONS,
  QUESTIONNAIRE_REWARD_ITEM_ID,
  type QuestionnaireQuestion,
} from "@/game/data/questionnaire";
import { sfx } from "@/game/systems/SoundManager";

/**
 * QuestionnaireInterface — letter-on-the-desk text input overlay.
 *
 * Layout follows the Pokemon Emerald questionnaire screen:
 *
 *   ┌──────────────────────────────┐
 *   │  ▸ QUESTIONNAIRE             │  ← dark title bar
 *   ├──────────────────────────────┤
 *   │  1) R E A D M E _ _          │
 *   │  2) M E D I C _ _ _          │  ← all four slot rows visible
 *   │  3) A P R I L _ _ _ _ _      │     at once (predetermined slot
 *   │  4) P Y T O R C H _          │     lengths, underscore fill)
 *   ├──────────────────────────────┤
 *   │  1 Name of most starred repo │
 *   │  2 Name of most recent paper │  ← numbered questions listed
 *   │  3 Month of first blog post  │     in the footer text box
 *   │  4 Framework I use for ML    │
 *   └──────────────────────────────┘
 *
 * Keys:
 *   • printable a-z / 0-9  → append to current slot (auto UPPER CASE)
 *   • Backspace            → delete last char in current slot
 *   • ArrowUp / ArrowDown  → switch between slots
 *   • Enter                → SUBMIT (evaluate all slots)
 *   • Escape               → close without submitting (answers kept)
 *
 * On SUBMIT:
 *   • all correct → play sfx.pickup, record pickup, switch to reward phase
 *   • any wrong   → play sfx.cancel, switch to retry phase
 *
 * The outer 9-slice frame uses the `--ui-frame` CSS variable set by
 * the Options menu, so the border reflects the player's chosen frame.
 */

const FONT = "var(--pkmn-font, 'Courier New', monospace)";

const STORAGE_KEY = "gkos:explore:questionnaire";

/** Build the list of acceptable uppercase answers for a question. */
function acceptedAnswers(q: QuestionnaireQuestion): string[] {
  return [q.canonical.toUpperCase(), ...(q.accept ?? []).map((a) => a.toUpperCase())];
}

function slotLenOf(q: QuestionnaireQuestion): number {
  return q.canonical.length;
}

/**
 * The questionnaire reward is sourced from ITEM_DEFINITIONS via the
 * id exported from questionnaire.ts so the item's name, description,
 * and icon stay in sync with the rest of the bag.
 */
const REWARD_ITEM = {
  get name(): string {
    return getItemDef(QUESTIONNAIRE_REWARD_ITEM_ID)?.name ?? "REWARD";
  },
};

/* ── 9-slice window using the player's chosen UI frame ────── */
const WIN: React.CSSProperties = {
  borderStyle: "solid",
  borderColor: "transparent",
  borderWidth: "calc(24px * var(--ui-scale-y, 1))",
  borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
  borderImageSlice: "8 fill",
  borderImageRepeat: "stretch",
  borderImageWidth: "calc(24px * var(--ui-scale-y, 1))",
  background: "transparent",
  imageRendering: "pixelated",
  boxSizing: "content-box",
};

type Phase = "intro" | "input" | "reward" | "retry";

/* ── Persistence helpers ──────────────────────────────────── */

function loadAnswers(): string[] {
  if (typeof localStorage === "undefined") return QUESTIONS.map(() => "");
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return QUESTIONS.map(() => "");
    const parsed = JSON.parse(raw) as { answers?: string[] };
    const arr = parsed.answers ?? [];
    return QUESTIONS.map((q, i) => (arr[i] ?? "").slice(0, slotLenOf(q)));
  } catch {
    return QUESTIONS.map(() => "");
  }
}

function saveAnswers(answers: string[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers }));
  } catch {
    // ignore
  }
}

export default function QuestionnaireInterface() {
  const [visible, setVisible] = useState(false);
  const [payloadId, setPayloadId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [activeSlot, setActiveSlot] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => QUESTIONS.map(() => ""));
  const [caretVisible, setCaretVisible] = useState(true);

  const phaseRef = useRef(phase);
  const activeSlotRef = useRef(activeSlot);
  const answersRef = useRef(answers);
  phaseRef.current = phase;
  activeSlotRef.current = activeSlot;
  answersRef.current = answers;

  // Persist answers on change (but not on initial mount)
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    saveAnswers(answers);
  }, [answers]);

  const close = useCallback(() => {
    sfx.cancel();
    setVisible(false);
    setPayloadId(null);
    setPhase("intro");
    setActiveSlot(0);
    emitGameEvent(GameEvents.QUESTIONNAIRE_CLOSE);
  }, []);

  // ── Open listener ───────────────────────────────────────────
  useEffect(() => {
    const unsub = onGameEvent(GameEvents.SHOW_QUESTIONNAIRE, (detail) => {
      const payload = detail as QuestionnairePayload;
      sfx.confirm();
      setPayloadId(payload.id);
      setVisible(true);
      setActiveSlot(0);
      setAnswers(loadAnswers());
      setPhase("intro");
    });
    return unsub;
  }, []);

  // ── Caret blink ─────────────────────────────────────────────
  useEffect(() => {
    if (!visible || phase !== "input") return;
    const t = setInterval(() => setCaretVisible((v) => !v), 450);
    return () => clearInterval(t);
  }, [visible, phase]);

  // ── Evaluate all answers ────────────────────────────────────
  const evaluateAll = useCallback((): boolean[] => {
    return QUESTIONS.map((q, i) => {
      const a = (answersRef.current[i] || "").trim().toUpperCase();
      if (!a) return false;
      return acceptedAnswers(q).some((k) => k === a);
    });
  }, []);

  // ── Submit all answers ──────────────────────────────────────
  const submitAll = useCallback(() => {
    const results = evaluateAll();
    const allCorrect = results.every(Boolean);
    if (allCorrect) {
      // Route the reward through GameSave so it lands in the
      // pocket declared by its item definition.
      if (!hasItem(QUESTIONNAIRE_REWARD_ITEM_ID)) {
        giveItem(QUESTIONNAIRE_REWARD_ITEM_ID);
      }
      sfx.pickup();
      setPhase("reward");
    } else {
      sfx.cancel();
      setPhase("retry");
    }
  }, [evaluateAll]);

  // ── Keyboard input ──────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      const ph = phaseRef.current;

      // Escape always cancels (answers preserved in storage)
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (ph === "intro") {
        if (
          e.key === "a" || e.key === "A" ||
          e.key === "Enter" || e.key === " "
        ) {
          e.preventDefault();
          sfx.select();
          setPhase("input");
        }
        return;
      }

      if (ph === "reward") {
        if (
          e.key === "a" || e.key === "A" ||
          e.key === "Enter" || e.key === " "
        ) {
          e.preventDefault();
          setVisible(false);
          setPayloadId(null);
          setPhase("intro");
          setActiveSlot(0);
          emitGameEvent(GameEvents.QUESTIONNAIRE_CLOSE);
        }
        return;
      }

      if (ph === "retry") {
        if (
          e.key === "a" || e.key === "A" ||
          e.key === "Enter" || e.key === " "
        ) {
          e.preventDefault();
          sfx.select();
          const results = evaluateAll();
          const firstWrong = results.findIndex((r) => !r);
          setActiveSlot(firstWrong >= 0 ? firstWrong : 0);
          setPhase("input");
        }
        return;
      }

      // Input phase ────────────────────────────────────────────
      if (ph !== "input") return;

      if (e.key === "Enter") {
        e.preventDefault();
        submitAll();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        sfx.select();
        setActiveSlot((i) => (i <= 0 ? QUESTIONS.length - 1 : i - 1));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        sfx.select();
        setActiveSlot((i) => (i >= QUESTIONS.length - 1 ? 0 : i + 1));
        return;
      }
      // Left/Right move between slots too — some players reach for them
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        sfx.select();
        setActiveSlot((i) => (i <= 0 ? QUESTIONS.length - 1 : i - 1));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        sfx.select();
        setActiveSlot((i) => (i >= QUESTIONS.length - 1 ? 0 : i + 1));
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        setAnswers((prev) => {
          const next = prev.slice();
          const idx = activeSlotRef.current;
          next[idx] = (next[idx] || "").slice(0, -1);
          return next;
        });
        sfx.select();
        return;
      }

      // Printable character — auto UPPER CASE
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // One-word answers — allow letters / digits / hyphen only
        if (!/^[a-zA-Z0-9\-]$/.test(e.key)) return;
        e.preventDefault();
        const ch = e.key.toUpperCase();
        setAnswers((prev) => {
          const next = prev.slice();
          const idx = activeSlotRef.current;
          const q = QUESTIONS[idx];
          if ((next[idx] || "").length >= slotLenOf(q)) return prev;
          next[idx] = (next[idx] || "") + ch;
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, close, submitAll, evaluateAll]);

  if (!visible) return null;

  return (
    <div style={OVERLAY}>
      <div
        data-testid="questionnaire"
        style={{
          ...WIN,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "calc(320px * var(--ui-scale-y, 1))",
          padding:
            "calc(6px * var(--ui-scale-y, 1)) calc(10px * var(--ui-scale-y, 1))",
          fontFamily: FONT,
          color: "#101010",
          letterSpacing: "0",
        }}
      >
        {/* ── Title row ───────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: "calc(18px * var(--ui-scale-y, 1))",
            fontWeight: "bold",
            color: "#101010",
            paddingBottom: "calc(4px * var(--ui-scale-y, 1))",
            borderBottom: "calc(2px * var(--ui-scale-y, 1)) solid #101010",
          }}
        >
          <span>Questionnaire</span>
          {phase === "input" && (
            <span
              style={{
                fontSize: "calc(14px * var(--ui-scale-y, 1))",
                color: "#585858",
                fontWeight: "normal",
              }}
            >
              {QUESTIONS.length} words
            </span>
          )}
        </div>

        {/* ── Main content ────────────────────────────────── */}
        <div
          style={{
            padding: "calc(8px * var(--ui-scale-y, 1)) calc(4px * var(--ui-scale-y, 1))",
            minHeight: "calc(120px * var(--ui-scale-y, 1))",
          }}
        >
          {phase === "intro" && <IntroBody />}

          {phase === "input" && (
            <SlotTable
              answers={answers}
              activeSlot={activeSlot}
              caretVisible={caretVisible}
            />
          )}

          {phase === "reward" && (
            <>
              <p style={bodyText}>
                KOSTAS handed you a{"\n"}
                <b>{REWARD_ITEM.name}</b>!
              </p>
              <p
                style={{
                  ...bodyText,
                  marginTop: "calc(6px * var(--ui-scale-y, 1))",
                  color: "#585858",
                }}
              >
                It has been placed in your BAG.
              </p>
            </>
          )}

          {phase === "retry" && (
            <RetryBody answers={answers} evaluateAll={evaluateAll} />
          )}
        </div>

        {/* ── Footer: enumerated questions / instructions ── */}
        <div
          style={{
            borderTop: "calc(2px * var(--ui-scale-y, 1)) solid #101010",
            paddingTop: "calc(5px * var(--ui-scale-y, 1))",
            fontSize: "calc(13px * var(--ui-scale-y, 1))",
            lineHeight: 1.5,
            color: "#101010",
          }}
        >
          {phase === "input" ? (
            <>
              <div
                style={{
                  fontSize: "calc(13px * var(--ui-scale-y, 1))",
                  color: "#585858",
                  marginBottom: "calc(4px * var(--ui-scale-y, 1))",
                  whiteSpace: "pre-line",
                }}
              >
                By answering all {QUESTIONS.length} questions{"\n"}
                complete the questionnaire.
              </div>
              {QUESTIONS.map((q, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "calc(13px * var(--ui-scale-y, 1))",
                    color: i === activeSlot ? "#101010" : "#585858",
                    fontWeight: i === activeSlot ? "bold" : "normal",
                  }}
                >
                  {i + 1}. {q.label}
                </div>
              ))}
              <div
                style={{
                  marginTop: "calc(4px * var(--ui-scale-y, 1))",
                  color: "#808080",
                  fontSize: "calc(11px * var(--ui-scale-y, 1))",
                  textAlign: "center",
                }}
              >
                ▲▼ switch &nbsp;·&nbsp; ENTER submit
              </div>
            </>
          ) : phase === "intro" ? (
            <div
              style={{
                textAlign: "center",
                fontSize: "calc(14px * var(--ui-scale-y, 1))",
              }}
            >
              ▶ Press A to begin
            </div>
          ) : phase === "reward" ? (
            <div
              style={{
                textAlign: "center",
                fontSize: "calc(14px * var(--ui-scale-y, 1))",
              }}
            >
              ▶ Press A to close
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                fontSize: "calc(14px * var(--ui-scale-y, 1))",
              }}
            >
              ▶ Press A to keep editing
            </div>
          )}
          {/* ESC hint — always visible across every phase */}
          <div
            style={{
              marginTop: "calc(4px * var(--ui-scale-y, 1))",
              color: "#808080",
              fontSize: "calc(11px * var(--ui-scale-y, 1))",
              textAlign: "center",
            }}
          >
            Press ESC to exit
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function IntroBody() {
  return (
    <>
      <p style={bodyText}>
        A letter lies on the desk.
        {"\n"}
        It contains {QUESTIONS.length} questions{"\n"}
        about KOSTAS.
      </p>
      <p
        style={{
          ...bodyText,
          marginTop: "calc(10px * var(--ui-scale-y, 1))",
        }}
      >
        Fill in all {QUESTIONS.length} answers to{"\n"}
        receive a {REWARD_ITEM.name}!
      </p>
    </>
  );
}

function RetryBody({
  answers,
  evaluateAll,
}: {
  answers: string[];
  evaluateAll: () => boolean[];
}) {
  const results = evaluateAll();
  const wrongCount = results.filter((r) => !r).length;
  const filled = answers.filter((a) => a.trim().length > 0).length;
  return (
    <>
      <p style={bodyText}>
        {wrongCount === QUESTIONS.length
          ? "None of the answers\nlook right..."
          : `${wrongCount} answer${wrongCount === 1 ? "" : "s"} ${
              wrongCount === 1 ? "is" : "are"
            }\nnot quite right.`}
      </p>
      <p
        style={{
          ...bodyText,
          marginTop: "calc(10px * var(--ui-scale-y, 1))",
          color: "#585858",
        }}
      >
        ({filled} / {QUESTIONS.length} filled)
      </p>
      <p
        style={{
          ...bodyText,
          marginTop: "calc(10px * var(--ui-scale-y, 1))",
        }}
      >
        Keep trying!
      </p>
    </>
  );
}

/**
 * SlotTable — renders the 4 answer rows. Each row shows the slot
 * number on the left and then `slotLen` character cells. Filled
 * cells show the uppercase character; empty cells show `_`. The
 * active row has a blinking caret at the next empty cell (or the
 * last cell if the slot is full).
 */
function SlotTable({
  answers,
  activeSlot,
  caretVisible,
}: {
  answers: string[];
  activeSlot: number;
  caretVisible: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "calc(4px * var(--ui-scale-y, 1))",
        paddingLeft: "calc(10px * var(--ui-scale-y, 1))",
      }}
    >
      {QUESTIONS.map((q, i) => {
        const raw = answers[i] || "";
        const len = slotLenOf(q);
        const isActive = i === activeSlot;
        const caretPos = Math.min(raw.length, len - 1);
        const cells: React.ReactNode[] = [];
        for (let c = 0; c < len; c++) {
          const ch = raw[c];
          const showCaret =
            isActive && caretVisible && c === caretPos && raw.length < len;
          cells.push(
            <span
              key={c}
              style={{
                display: "inline-block",
                width: "calc(16px * var(--ui-scale-y, 1))",
                textAlign: "center",
                color: ch ? "#101010" : "#a0a0a0",
                fontSize: "calc(20px * var(--ui-scale-y, 1))",
                fontFamily: FONT,
              }}
            >
              {ch ?? (showCaret ? "_" : "_")}
              {showCaret && (
                <span
                  style={{
                    position: "relative",
                    top: "calc(-2px * var(--ui-scale-y, 1))",
                    color: "#d04040",
                  }}
                >
                  ▌
                </span>
              )}
            </span>,
          );
        }
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding:
                "calc(2px * var(--ui-scale-y, 1)) calc(4px * var(--ui-scale-y, 1))",
            }}
          >
            <span
              style={{
                width: "calc(18px * var(--ui-scale-y, 1))",
                fontSize: "calc(16px * var(--ui-scale-y, 1))",
                color: "#101010",
                visibility: isActive ? "visible" : "hidden",
              }}
            >
              ▶
            </span>
            <span
              style={{
                fontSize: "calc(16px * var(--ui-scale-y, 1))",
                color: "#585858",
                marginRight: "calc(6px * var(--ui-scale-y, 1))",
                minWidth: "calc(20px * var(--ui-scale-y, 1))",
              }}
            >
              {i + 1}.
            </span>
            <span style={{ letterSpacing: "0", display: "inline-block" }}>
              {cells}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────── */

const OVERLAY: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 260,
  fontFamily: FONT,
  color: "#101010",
  imageRendering: "pixelated",
  pointerEvents: "auto",
  background: "rgba(0, 0, 0, 0.45)",
};

const bodyText: React.CSSProperties = {
  margin: 0,
  fontSize: "calc(16px * var(--ui-scale-y, 1))",
  whiteSpace: "pre-line",
  lineHeight: 1.5,
  letterSpacing: "0",
};
