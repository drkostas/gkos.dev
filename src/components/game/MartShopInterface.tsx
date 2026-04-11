import { useCallback, useEffect, useRef, useState } from "react";
import { GameEvents, onGameEvent, emitGameEvent } from "@/game/EventBridge";
import { getSteps, formatSteps } from "@/game/systems/StepStore";
import {
  STEP_MILESTONES,
  buyTM,
  canAfford,
  type StepMilestone,
} from "@/game/systems/StepMilestones";
import { hasItem } from "@/game/systems/GameSave";
import { getItemDef } from "@/game/data/itemDefinitions";
import { sfx } from "@/game/systems/SoundManager";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";

/**
 * MartShopInterface — TM shop overlay for the Pokemart.
 *
 * Steps are the shop currency. Every purchase debits the player's
 * running step count, so the player has to walk more to buy more.
 *
 * Layout follows OG Pokemon Emerald shop menus:
 *
 *   ┌──────────────┐  ┌──────────────────────┐
 *   │ Steps: 2,450 │  │ ▶ TM:TAILWIND   250  │
 *   │──────────────│  │   TM:FASTAPI    500  │
 *   │ Containerize │  │   TM:DOCKER    1500  │
 *   │ platform.    │  │   TM:PYTORCH   2000 ✗│
 *   │              │  │   CANCEL             │
 *   └──────────────┘  └──────────────────────┘
 *
 * Controls:
 *   • ArrowUp / ArrowDown  → move selector
 *   • A / Enter / Space    → select / confirm purchase
 *   • B / S / Backspace    → cancel / back
 *   • Escape               → close shop
 */

const FONT = "var(--pkmn-font, 'Courier New', monospace)";

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

type Phase = "list" | "confirm" | "success" | "notEnough" | "alreadyOwned";

interface Row {
  kind: "item" | "cancel";
  milestone?: StepMilestone;
  label: string;
  price?: number;
  owned?: boolean;
  affordable?: boolean;
}

function buildRows(currentSteps: number): Row[] {
  const rows: Row[] = STEP_MILESTONES.map((m) => ({
    kind: "item",
    milestone: m,
    label: `TM ${m.tm}`,
    price: m.steps,
    owned: hasItem(m.itemId),
    affordable: currentSteps >= m.steps,
  }));
  rows.push({ kind: "cancel", label: "CANCEL" });
  return rows;
}

export default function MartShopInterface() {
  const [visible, setVisible] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [steps, setSteps] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [phase, setPhase] = useState<Phase>("list");
  /** Milestone the current confirm / success prompt refers to. */
  const [pending, setPending] = useState<StepMilestone | null>(null);
  /** 0 = YES, 1 = NO in the confirm prompt. */
  const [confirmCursor, setConfirmCursor] = useState(0);
  /** Slide-in/out transition state. */
  const [anim, setAnim] = useState<"in" | "out" | "idle">("idle");

  const phaseRef = useRef(phase);
  const cursorRef = useRef(cursor);
  const rowsRef = useRef(rows);
  const pendingRef = useRef(pending);
  const confirmCursorRef = useRef(confirmCursor);
  phaseRef.current = phase;
  cursorRef.current = cursor;
  rowsRef.current = rows;
  pendingRef.current = pending;
  confirmCursorRef.current = confirmCursor;

  /** How many item rows fit in the visible list at once. */
  const PAGE_SIZE = 6;

  const refresh = useCallback(() => {
    const s = getSteps();
    setSteps(s);
    setRows(buildRows(s));
  }, []);

  const close = useCallback(() => {
    sfx.cancel();
    // Play the slide-out animation, then actually unmount.
    setAnim("out");
    window.setTimeout(() => {
      setVisible(false);
      setPhase("list");
      setPending(null);
      setConfirmCursor(0);
      setCursor(0);
      setScrollTop(0);
      setAnim("idle");
      emitGameEvent(GameEvents.MART_SHOP_CLOSE);
    }, 160);
  }, []);

  /* ── Open listener ─────────────────────────────────────── */
  useEffect(() => {
    const unsub = onGameEvent(GameEvents.SHOW_MART_SHOP, () => {
      refresh();
      setCursor(0);
      setScrollTop(0);
      setPhase("list");
      setPending(null);
      setConfirmCursor(0);
      setVisible(true);
      setAnim("in");
      window.setTimeout(() => setAnim("idle"), 200);
    });
    return unsub;
  }, [refresh]);

  /* ── Keep scroll window in sync with the cursor ──────────── */
  useEffect(() => {
    if (cursor < scrollTop) setScrollTop(cursor);
    else if (cursor >= scrollTop + PAGE_SIZE) setScrollTop(cursor - PAGE_SIZE + 1);
  }, [cursor, scrollTop]);

  /* ── Keyboard ──────────────────────────────────────────── */
  // Phase-based dispatch. Escape (menu) always closes; the rest
  // flows through the hook's logical buttons. "b"/"B" is caught
  // via `other` since it isn't a standard game cancel key.
  const onBack = () => {
    const ph = phaseRef.current;
    if (ph === "list") { close(); return; }
    if (ph === "confirm") {
      sfx.cancel();
      setPhase("list");
      setPending(null);
      return;
    }
    if (ph === "success" || ph === "notEnough" || ph === "alreadyOwned") {
      sfx.select();
      refresh();
      setPending(null);
      setPhase("list");
    }
  };

  useGameKeyboard(visible, {
    menu: close,
    up: () => {
      const ph = phaseRef.current;
      if (ph === "list") {
        sfx.select();
        setCursor((c) => (c <= 0 ? rowsRef.current.length - 1 : c - 1));
      } else if (ph === "confirm") {
        sfx.select();
        setConfirmCursor((c) => (c === 0 ? 1 : 0));
      }
    },
    down: () => {
      const ph = phaseRef.current;
      if (ph === "list") {
        sfx.select();
        setCursor((c) => (c >= rowsRef.current.length - 1 ? 0 : c + 1));
      } else if (ph === "confirm") {
        sfx.select();
        setConfirmCursor((c) => (c === 0 ? 1 : 0));
      }
    },
    confirm: () => {
      const ph = phaseRef.current;
      if (ph === "list") {
        const row = rowsRef.current[cursorRef.current];
        if (!row) return;
        if (row.kind === "cancel") { close(); return; }
        if (row.owned) {
          sfx.cancel();
          setPending(row.milestone ?? null);
          setPhase("alreadyOwned");
          return;
        }
        if (!row.affordable) {
          sfx.cancel();
          setPending(row.milestone ?? null);
          setPhase("notEnough");
          return;
        }
        sfx.confirm();
        setPending(row.milestone ?? null);
        setConfirmCursor(0);
        setPhase("confirm");
      } else if (ph === "confirm") {
        const m = pendingRef.current;
        if (!m) return;
        if (confirmCursorRef.current === 0) {
          const ok = buyTM(m);
          if (ok) { sfx.pickup(); setPhase("success"); }
          else { sfx.cancel(); setPhase("notEnough"); }
        } else {
          sfx.cancel();
          setPhase("list");
          setPending(null);
        }
      } else if (ph === "success" || ph === "notEnough" || ph === "alreadyOwned") {
        sfx.select();
        refresh();
        setPending(null);
        setPhase("list");
      }
    },
    cancel: onBack,
    // "b" / "B" aren't in the global cancel set (BirchSpeech name
    // input would lose the letter), but the mart treats them as
    // back, so handle them here.
    other: (e) => {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        onBack();
      }
    },
  });

  if (!visible) return null;

  const selRow = rows[cursor];
  const selItem = selRow?.kind === "item" ? selRow : null;
  const selMilestone = selItem?.milestone;
  const selItemDef = selMilestone ? getItemDef(selMilestone.itemId) : null;

  const description = (() => {
    if (phase === "list") {
      if (!selRow) return "";
      if (selRow.kind === "cancel") return "Quit shopping.";
      if (selRow.owned) return `Already in your BAG.`;
      return selMilestone?.description ?? "";
    }
    if (phase === "confirm") {
      return `${pending?.steps.toLocaleString()} steps. OK?`;
    }
    if (phase === "success") {
      return `Here you go, thank\nyou very much!`;
    }
    if (phase === "notEnough") {
      return `You don't have\nenough steps.`;
    }
    if (phase === "alreadyOwned") {
      return `You already own\nthat TM.`;
    }
    return "";
  })();

  const visibleRows = rows.slice(scrollTop, scrollTop + PAGE_SIZE);

  return (
    <div
      style={{
        ...OVERLAY,
        // Slight dimming, matching Emerald's interior shop scrim.
        background: "rgba(0, 0, 0, 0.30)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "calc(8px * var(--ui-scale-y, 1))",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          gap: "calc(6px * var(--ui-scale-y, 1))",
          // Slide in from the right, slide out to the right.
          transform:
            anim === "in" || anim === "out"
              ? "translateX(8%)"
              : "translateX(0)",
          opacity: anim === "out" ? 0 : 1,
          transition: "transform 180ms ease-out, opacity 160ms ease-out",
        }}
      >
        {/* ── Balance / header ──────────────────── */}
        <div
          style={{
            ...WIN,
            padding: "calc(6px * var(--ui-scale-y, 1)) calc(14px * var(--ui-scale-y, 1))",
            minWidth: "calc(200px * var(--ui-scale-y, 1))",
            display: "flex",
            justifyContent: "space-between",
            gap: "calc(12px * var(--ui-scale-y, 1))",
            fontFamily: FONT,
            fontSize: "calc(17px * var(--ui-scale-y, 1))",
            color: "#000",
          }}
        >
          <span>STEPS</span>
          <span>{formatSteps(steps)}</span>
        </div>

        {/* ── Item list ─────────────────────────── */}
        <div
          style={{
            ...WIN,
            width: "calc(300px * var(--ui-scale-y, 1))",
            padding:
              "calc(4px * var(--ui-scale-y, 1)) calc(8px * var(--ui-scale-y, 1))",
            fontFamily: FONT,
          }}
        >
          {scrollTop > 0 && (
            <div
              style={{
                textAlign: "center",
                fontSize: "calc(13px * var(--ui-scale-y, 1))",
                color: "#585858",
              }}
            >
              ▲
            </div>
          )}
          {visibleRows.map((row, i) => {
            const realIndex = scrollTop + i;
            const selected = realIndex === cursor;
            return (
              <MartRow
                key={row.label}
                row={row}
                selected={selected}
              />
            );
          })}
          {scrollTop + PAGE_SIZE < rows.length && (
            <div
              style={{
                textAlign: "center",
                fontSize: "calc(13px * var(--ui-scale-y, 1))",
                color: "#585858",
              }}
            >
              ▼
            </div>
          )}
        </div>
      </div>

      {/* ── Description / dialog box bottom-left ─ */}
      <div
        style={{
          position: "absolute",
          left: "calc(8px * var(--ui-scale-y, 1))",
          bottom: "calc(8px * var(--ui-scale-y, 1))",
          right: "calc(8px * var(--ui-scale-y, 1))",
          display: "flex",
          gap: "calc(8px * var(--ui-scale-y, 1))",
          alignItems: "stretch",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            ...WIN,
            flex: 1,
            padding:
              "calc(8px * var(--ui-scale-y, 1)) calc(12px * var(--ui-scale-y, 1))",
            fontFamily: FONT,
            fontSize: "calc(17px * var(--ui-scale-y, 1))",
            color: "#000",
            lineHeight: 1.4,
            whiteSpace: "pre-line",
            minHeight: "calc(48px * var(--ui-scale-y, 1))",
            display: "flex",
            alignItems: "center",
          }}
        >
          {selItemDef && phase === "list" && !selItem?.owned && (
            <img
              src={selItemDef.icon}
              alt=""
              style={{
                width: "calc(32px * var(--ui-scale-y, 1))",
                height: "calc(32px * var(--ui-scale-y, 1))",
                imageRendering: "pixelated",
                marginRight: "calc(10px * var(--ui-scale-y, 1))",
              }}
            />
          )}
          <span>{description}</span>
        </div>

        {/* ── Confirm Yes/No mini-menu ─────────── */}
        {phase === "confirm" && (
          <div
            style={{
              ...WIN,
              padding:
                "calc(6px * var(--ui-scale-y, 1)) calc(18px * var(--ui-scale-y, 1))",
              fontFamily: FONT,
              fontSize: "calc(17px * var(--ui-scale-y, 1))",
              color: "#000",
              pointerEvents: "auto",
              alignSelf: "flex-end",
              minWidth: "calc(90px * var(--ui-scale-y, 1))",
            }}
          >
            <YesNoRow label="YES" sel={confirmCursor === 0} />
            <YesNoRow label="NO" sel={confirmCursor === 1} />
          </div>
        )}
      </div>

      {/* ── ESC hint (always visible) ───────────── */}
      <div
        style={{
          position: "absolute",
          top: "calc(8px * var(--ui-scale-y, 1))",
          left: "calc(8px * var(--ui-scale-y, 1))",
          padding:
            "calc(4px * var(--ui-scale-y, 1)) calc(10px * var(--ui-scale-y, 1))",
          background: "rgba(0, 0, 0, 0.55)",
          color: "#fff",
          fontFamily: FONT,
          fontSize: "calc(12px * var(--ui-scale-y, 1))",
          borderRadius: "calc(4px * var(--ui-scale-y, 1))",
          pointerEvents: "none",
        }}
      >
        Press ESC to exit
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function MartRow({ row, selected }: { row: Row; selected: boolean }) {
  const owned = row.owned === true;
  const unaffordable = row.kind === "item" && !row.affordable && !owned;
  const color = owned || unaffordable ? "#888" : "#000";
  const mark = owned ? "✓" : unaffordable ? "✗" : "";
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding:
          "calc(3px * var(--ui-scale-y, 1)) calc(4px * var(--ui-scale-y, 1)) calc(3px * var(--ui-scale-y, 1)) calc(16px * var(--ui-scale-y, 1))",
        fontSize: "calc(17px * var(--ui-scale-y, 1))",
        letterSpacing: "0.5px",
        lineHeight: 1.3,
        color,
      }}
    >
      {selected && (
        <span
          style={{
            position: "absolute",
            left: "calc(2px * var(--ui-scale-y, 1))",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "calc(15px * var(--ui-scale-y, 1))",
            color: "#000",
          }}
        >
          ▶
        </span>
      )}
      <span>{row.label}</span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          gap: "calc(6px * var(--ui-scale-y, 1))",
          color,
        }}
      >
        {row.price !== undefined && (
          <span>{row.price.toLocaleString()}</span>
        )}
        {mark && (
          <span
            style={{
              width: "calc(14px * var(--ui-scale-y, 1))",
              textAlign: "center",
            }}
          >
            {mark}
          </span>
        )}
      </span>
    </div>
  );
}

function YesNoRow({ label, sel }: { label: string; sel: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        padding:
          "calc(2px * var(--ui-scale-y, 1)) calc(4px * var(--ui-scale-y, 1)) calc(2px * var(--ui-scale-y, 1)) calc(16px * var(--ui-scale-y, 1))",
        fontSize: "calc(17px * var(--ui-scale-y, 1))",
        color: "#000",
      }}
    >
      {sel && (
        <span
          style={{
            position: "absolute",
            left: "calc(2px * var(--ui-scale-y, 1))",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "calc(15px * var(--ui-scale-y, 1))",
          }}
        >
          ▶
        </span>
      )}
      {label}
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────── */

const OVERLAY: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 255,
  fontFamily: FONT,
  color: "#000",
  imageRendering: "pixelated",
  pointerEvents: "auto",
};
