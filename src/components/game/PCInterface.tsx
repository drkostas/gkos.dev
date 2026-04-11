import { useCallback, useEffect, useRef, useState } from "react";
import { GameEvents, onGameEvent, emitGameEvent } from "@/game/EventBridge";
import { getPCItems, withdrawItem, type PCItem } from "@/game/systems/PCStore";
import { sfx } from "@/game/systems/SoundManager";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";

type Screen = "main" | "storage" | "withdraw";

const FONT = "var(--pkmn-font, 'Courier New', monospace)";

const ITEM_ICONS: Record<string, string> = {
  "RESUME.PDF":      "/game/ui/bag/aurora_ticket.png",
  "BLOG.URL":        "/game/ui/bag/stardust.png",
  "GITHUB.URL":      "/game/ui/bag/master_ball.png",
  "LINKEDIN.URL":    "/game/ui/bag/amulet_coin.png",
  "HUGGINGFACE.URL": "/game/ui/bag/oran_berry.png",
  "SCHOLAR.URL":     "/game/ui/bag/lucky_egg.png",
  // Starter TMs pre-loaded in the PC
  "TM PYTHON":       "/game/ui/bag/tm_case.png",
  "TM GIT":          "/game/ui/bag/tm_case.png",
  "TM LINUX":        "/game/ui/bag/tm_case.png",
};

const DEFAULT_ICON = "/game/ui/bag/poke_ball.png";

/* ── 9-slice window ─────────────────────────────────────── */
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

export default function PCInterface() {
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState<Screen>("main");
  const [cursor, setCursor] = useState(0);
  const [items, setItems] = useState<PCItem[]>([]);
  /** Brief message shown after withdrawing an item. */
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);

  const screenRef = useRef(screen);
  const cursorRef = useRef(cursor);
  const itemsRef = useRef(items);
  const withdrawMsgRef = useRef(withdrawMsg);
  screenRef.current = screen;
  cursorRef.current = cursor;
  itemsRef.current = items;
  withdrawMsgRef.current = withdrawMsg;

  const close = useCallback(() => {
    sfx.pcOff();
    setVisible(false);
    setScreen("main");
    setCursor(0);
    setWithdrawMsg(null);
    emitGameEvent(GameEvents.PC_CLOSE);
  }, []);

  /* ── Open listener ─────────────────────────────────────── */
  useEffect(() => {
    const unsub = onGameEvent(GameEvents.SHOW_PC, () => {
      sfx.pcOn();
      setVisible(true);
      setScreen("main");
      setCursor(0);
      setWithdrawMsg(null);
      setItems(getPCItems());
    });
    return unsub;
  }, []);

  /* ── Keyboard ──────────────────────────────────────────── */
  // Any key press (including logical buttons) dismisses a pending
  // withdraw message and refreshes the item list.
  const dismissMessageIfAny = (): boolean => {
    if (!withdrawMsgRef.current) return false;
    setWithdrawMsg(null);
    const newItems = getPCItems();
    setItems(newItems);
    if (cursorRef.current >= newItems.length) {
      setCursor(Math.max(0, newItems.length));
    }
    return true;
  };

  useGameKeyboard(visible, {
    up: () => {
      if (dismissMessageIfAny()) return;
      const scr = screenRef.current;
      sfx.select();
      if (scr === "main" || scr === "storage") {
        setCursor((c) => (c <= 0 ? 1 : c - 1));
      } else if (scr === "withdraw") {
        const n = itemsRef.current.length + 1; // items + CANCEL
        setCursor((c) => (c <= 0 ? n - 1 : c - 1));
      }
    },
    down: () => {
      if (dismissMessageIfAny()) return;
      const scr = screenRef.current;
      sfx.select();
      if (scr === "main" || scr === "storage") {
        setCursor((c) => (c >= 1 ? 0 : c + 1));
      } else if (scr === "withdraw") {
        const n = itemsRef.current.length + 1;
        setCursor((c) => (c >= n - 1 ? 0 : c + 1));
      }
    },
    confirm: () => {
      if (dismissMessageIfAny()) return;
      const scr = screenRef.current;
      const cur = cursorRef.current;
      if (scr === "main") {
        if (cur === 0) { sfx.confirm(); setScreen("storage"); setCursor(0); }
        else close();
      } else if (scr === "storage") {
        if (cur === 0) { sfx.confirm(); setScreen("withdraw"); setCursor(0); }
        else { sfx.cancel(); setScreen("main"); setCursor(0); }
      } else if (scr === "withdraw") {
        const its = itemsRef.current;
        if (cur < its.length) {
          const item = its[cur];
          const ok = withdrawItem(item.id);
          if (ok) {
            sfx.pickup();
            setWithdrawMsg(`Withdrew ${item.name}\nand sent it to your BAG!`);
          }
        } else {
          sfx.cancel(); setScreen("storage"); setCursor(0);
        }
      }
    },
    cancel: () => {
      if (dismissMessageIfAny()) return;
      goBack();
    },
    // Escape matches `cancel` here — the old handler grouped Escape
    // into `isBack`, so it walks up one screen instead of closing.
    menu: () => {
      if (dismissMessageIfAny()) return;
      goBack();
    },
  });

  function goBack() {
    const scr = screenRef.current;
    if (scr === "main") close();
    else if (scr === "storage") { sfx.cancel(); setScreen("main"); setCursor(0); }
    else if (scr === "withdraw") { sfx.cancel(); setScreen("storage"); setCursor(0); }
  }

  if (!visible) return null;

  return (
    <div style={{
      ...OVERLAY,
      background: screen === "withdraw" ? "#000" : "transparent",
    }}>
      {screen === "main" && (
        <div style={{ ...WIN, ...MENU_POS }}>
          <MRow label="ITEM STORAGE" sel={cursor === 0} />
          <MRow label="TURN OFF" sel={cursor === 1} />
        </div>
      )}

      {screen === "storage" && (
        <div style={{ ...WIN, ...MENU_POS }}>
          <MRow label="WITHDRAW ITEM" sel={cursor === 0} />
          <MRow label="CANCEL" sel={cursor === 1} />
        </div>
      )}

      {screen === "withdraw" && (
        <div style={WD_WRAP}>
          {/* Left column */}
          <div style={WD_LEFT}>
            <div style={{
              ...WIN,
              textAlign: "center",
              padding: "calc(4px * var(--ui-scale-y, 1)) calc(8px * var(--ui-scale-y, 1))",
              fontSize: "calc(17px * var(--ui-scale-y, 1))",
            }}>
              WITHDRAW ITEM
            </div>
            <div style={WD_ICON_AREA}>
              {cursor < items.length ? (
                <div style={{
                  ...WIN,
                  padding: "calc(6px * var(--ui-scale-y, 1))",
                  lineHeight: 0,
                }}>
                  <img
                    src={ITEM_ICONS[items[cursor].name] || DEFAULT_ICON}
                    alt=""
                    style={{
                      width: "calc(32px * var(--ui-scale-y, 1))",
                      height: "calc(32px * var(--ui-scale-y, 1))",
                      imageRendering: "pixelated",
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div style={{
              ...WIN,
              padding: "calc(6px * var(--ui-scale-y, 1)) calc(8px * var(--ui-scale-y, 1))",
              fontSize: "calc(15px * var(--ui-scale-y, 1))",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              minHeight: "calc(50px * var(--ui-scale-y, 1))",
            }}>
              {cursor < items.length
                ? (items[cursor].description || "An item stored\nin the PC.")
                : ""}
            </div>
          </div>

          {/* Right column: item list */}
          <div style={{
            ...WIN,
            flex: 1,
            padding: "calc(6px * var(--ui-scale-y, 1)) calc(8px * var(--ui-scale-y, 1))",
            overflowY: "auto",
          }}>
            {items.length === 0 ? (
              <>
                <div style={{
                  padding: "calc(3px * var(--ui-scale-y, 1)) calc(4px * var(--ui-scale-y, 1)) calc(3px * var(--ui-scale-y, 1)) calc(16px * var(--ui-scale-y, 1))",
                  fontSize: "calc(17px * var(--ui-scale-y, 1))",
                  color: "#888",
                }}>
                  No items stored.
                </div>
                <MRow label="CANCEL" sel={cursor === 0} />
              </>
            ) : (
              <>
                {items.map((it, i) => (
                  <div key={it.id} style={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "calc(3px * var(--ui-scale-y, 1)) calc(4px * var(--ui-scale-y, 1)) calc(3px * var(--ui-scale-y, 1)) calc(16px * var(--ui-scale-y, 1))",
                    fontSize: "calc(17px * var(--ui-scale-y, 1))",
                    letterSpacing: "0.5px",
                    color: "#000",
                  }}>
                    {cursor === i && <CUR />}
                    <span>{it.name}</span>
                    <span style={{ color: "#585858" }}>x 1</span>
                  </div>
                ))}
                <MRow label="CANCEL" sel={cursor === items.length} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Withdraw confirmation message overlay */}
      {withdrawMsg && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 300,
        }}>
          <div style={{
            ...WIN,
            padding: "calc(12px * var(--ui-scale-y, 1)) calc(20px * var(--ui-scale-y, 1))",
            fontSize: "calc(17px * var(--ui-scale-y, 1))",
            fontFamily: FONT,
            color: "#000",
            textAlign: "center",
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}>
            {withdrawMsg}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function MRow({ label, sel }: { label: string; sel: boolean }) {
  return (
    <div style={{
      position: "relative",
      padding: "calc(3px * var(--ui-scale-y, 1)) calc(4px * var(--ui-scale-y, 1)) calc(3px * var(--ui-scale-y, 1)) calc(16px * var(--ui-scale-y, 1))",
      fontSize: "calc(17px * var(--ui-scale-y, 1))",
      letterSpacing: "0.5px",
      lineHeight: 1.3,
      color: "#000",
    }}>
      {sel && <CUR />}
      {label}
    </div>
  );
}

function CUR() {
  return (
    <span style={{
      position: "absolute",
      left: "calc(4px * var(--ui-scale-y, 1))",
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: "calc(15px * var(--ui-scale-y, 1))",
      color: "#000",
    }}>
      ▶
    </span>
  );
}

/* ── Styles ──────────────────────────────────────────────── */

const OVERLAY: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 250,
  fontFamily: FONT,
  color: "#000",
  imageRendering: "pixelated",
  pointerEvents: "auto",
};

const MENU_POS: React.CSSProperties = {
  position: "absolute",
  top: "calc(8px * var(--ui-scale-y, 1))",
  left: "calc(8px * var(--ui-scale-y, 1))",
  width: "calc(160px * var(--ui-scale-y, 1))",
  padding: "calc(6px * var(--ui-scale-y, 1)) calc(4px * var(--ui-scale-y, 1))",
};

const WD_WRAP: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  padding: "calc(8px * var(--ui-scale-y, 1))",
  display: "flex",
  gap: 0,
};

const WD_LEFT: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "42%",
  height: "100%",
};

const WD_ICON_AREA: React.CSSProperties = {
  flex: 1,
  background: "#000",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
