import { useRef } from "react";
import { type ActivePartyMember, type Move } from "@/game/data/party";
import { sfx } from "@/game/systems/SoundManager";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";
import { useMenuNavigation } from "@/game/hooks/useMenuNavigation";

interface Props {
  // Widened to `ActivePartyMember` so `member.fieldMoves` is typed
  // and flows through. Not rendered yet — layout polish deferred.
  member: ActivePartyMember;
  onClose: () => void;
}

const GBA_W = 240;
const GBA_H = 160;
const FONT = "var(--pkmn-font, 'Courier New', monospace)";
const p = (v: number, of: number) => `${(v / of) * 100}%`;

// Colors matching the OG summary screen
const C = {
  headerBg: "#6870a0",       // dark purple-blue header bar
  headerText: "#f8f8f8",
  pageBg: "#c8c8e0",         // light lavender page background
  leftPanelBg: "#e8e8d0",    // beige/cream left panel (pokemon portrait area)
  leftPanelBorder: "#8888a0",
  moveBg: "#f8f0e0",         // cream move row background
  moveSelBg: "#f8d098",      // orange-highlighted move row
  moveBorder: "#c0b088",
  dark: "#383838",
  gray: "#707070",
  white: "#f8f8f8",
  ppColor: "#484848",
  descBg: "#f8f8f0",
  rightBg: "#a0a0d0",        // purple-blue right panel
  olive: "#8b9c29",          // outer bg matching party menu
};

export default function PokemonSummary({ member, onClose }: Props) {
  const { index: moveSel, moveUp: moveUpSel, moveDown: moveDownSel } =
    useMenuNavigation(member.moves.length);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useGameKeyboard(true, {
    cancel: () => { sfx.select(); onCloseRef.current(); },
    menu: () => { sfx.select(); onCloseRef.current(); },
    up: () => { sfx.select(); moveUpSel(); },
    down: () => { sfx.select(); moveDownSel(); },
    confirm: () => {
      sfx.confirm();
      if (member.url) window.open(member.url, "_blank", "noopener");
    },
  });

  const dexStr = String(member.dexNo).padStart(3, "0");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 260,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: C.olive, pointerEvents: "auto",
    }}>
      <div style={{
        position: "relative",
        width: "min(135vh, 90vw)",
        height: "min(90vh, 60vw)",
        overflow: "hidden",
        imageRendering: "pixelated",
        fontFamily: FONT,
        containerType: "inline-size",
        background: C.pageBg,
      }}>
        {/* ── Header bar ── */}
        <div style={{
          position: "absolute", left: 0, top: 0,
          width: "100%", height: p(16, GBA_H),
          background: C.headerBg,
          display: "flex", alignItems: "center",
          paddingLeft: p(8, GBA_W),
          zIndex: 2,
        }}>
          <span style={{ fontSize: "4cqi", color: C.headerText, letterSpacing: "0.04em" }}>
            BATTLE MOVES
          </span>
          {/* Page dots (right side) */}
          <div style={{
            position: "absolute", right: p(8, GBA_W), top: "50%", transform: "translateY(-50%)",
            display: "flex", gap: p(4, GBA_W),
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: p(4, GBA_W), height: p(4, GBA_W),
                borderRadius: "50%",
                background: i === 2 ? C.white : C.gray,
              }} />
            ))}
          </div>
        </div>

        {/* ── Left panel: portrait + dex + name ── */}
        <div style={{
          position: "absolute",
          left: p(4, GBA_W), top: p(18, GBA_H),
          width: p(88, GBA_W), height: p(110, GBA_H),
          background: C.leftPanelBg,
          border: `1px solid ${C.leftPanelBorder}`,
          zIndex: 1,
        }}>
          {/* Dex number */}
          <span style={{
            position: "absolute", left: p(4, 88), top: p(2, 110),
            fontSize: "3.5cqi", color: C.dark,
          }}>
            No.{dexStr}
          </span>

          {/* Pokemon front sprite */}
          <div style={{
            position: "absolute",
            left: "50%", top: p(14, 110),
            transform: "translateX(-50%)",
            width: p(64, 88), height: p(64, 110),
          }}>
            {/* Striped background behind sprite (like OG) */}
            <div style={{
              position: "absolute", inset: 0,
              background: `repeating-linear-gradient(0deg, #d8d8c8 0px, #d8d8c8 2px, #c8c8b8 2px, #c8c8b8 4px)`,
              borderRadius: "4%",
            }} />
            <img
              src={`/game/sprites/pokemon/${member.species}_front.png`}
              alt={member.nickname}
              style={{
                position: "relative", width: "100%", height: "100%",
                imageRendering: "pixelated", objectFit: "contain",
              }}
            />
          </div>

          {/* Pokemon name */}
          <span style={{
            position: "absolute", left: p(4, 88), bottom: p(4, 110),
            fontSize: "3.8cqi", color: C.dark, letterSpacing: "0.03em",
          }}>
            {member.nickname.toUpperCase()}
          </span>
        </div>

        {/* ── Right panel: moves list ── */}
        <div style={{
          position: "absolute",
          left: p(96, GBA_W), top: p(18, GBA_H),
          width: p(140, GBA_W), height: p(108, GBA_H),
          background: C.rightBg,
          zIndex: 1,
        }}>
          {/* MOVES header */}
          <div style={{
            position: "absolute", left: p(4, 140), top: p(2, 108),
            width: p(132, 140),
            textAlign: "center",
          }}>
            <span style={{ fontSize: "3.5cqi", color: C.white, letterSpacing: "0.04em" }}>
              MOVES
            </span>
          </div>

          {/* Move rows */}
          {member.moves.map((move, i) => (
            <MoveRow
              key={i}
              move={move}
              selected={i === moveSel}
              y={14 + i * 22}
              parentH={108}
              parentW={140}
            />
          ))}
        </div>

        {/* ── Bottom: description area ── */}
        <div style={{
          position: "absolute",
          left: 0, top: p(128, GBA_H),
          width: "100%", height: p(32, GBA_H),
          background: C.descBg,
          borderTop: `1px solid ${C.leftPanelBorder}`,
          zIndex: 2,
          display: "flex", flexDirection: "column", justifyContent: "center",
          paddingLeft: p(8, GBA_W), paddingRight: p(8, GBA_W),
        }}>
          {/* Show selected move description */}
          <span style={{ fontSize: "3.2cqi", color: C.dark, lineHeight: 1.4 }}>
            {member.moves[moveSel]?.description}
          </span>
        </div>

        {/* ── "Press A to open" hint at bottom-right ── */}
        <div style={{
          position: "absolute",
          right: p(6, GBA_W), bottom: p(2, GBA_H),
          zIndex: 3,
        }}>
          <span style={{ fontSize: "2.5cqi", color: C.gray, letterSpacing: "0.02em" }}>
            [A] Open project
          </span>
        </div>
      </div>
    </div>
  );
}

function MoveRow({ move, selected, y, parentH, parentW }: {
  move: Move; selected: boolean; y: number; parentH: number; parentW: number;
}) {
  return (
    <div style={{
      position: "absolute",
      left: p(3, parentW), top: p(y, parentH),
      width: p(134, parentW), height: p(20, parentH),
      background: selected ? C.moveSelBg : C.moveBg,
      border: selected ? "1px solid #e08030" : `1px solid ${C.moveBorder}`,
      display: "flex", alignItems: "center",
      gap: p(3, parentW),
      paddingLeft: p(2, parentW),
      paddingRight: p(2, parentW),
    }}>
      {/* Type badge (OG 32×16 asset) */}
      <img
        src={`/game/ui/types/${move.type}.png`}
        alt={move.type}
        style={{
          height: "65%",
          imageRendering: "pixelated",
          flexShrink: 0,
        }}
      />
      {/* Move name */}
      <span style={{
        fontSize: "3cqi", color: C.dark,
        flex: 1, whiteSpace: "nowrap", overflow: "hidden",
        letterSpacing: "0.03em",
      }}>
        {move.name}
      </span>
      {/* PP */}
      <span style={{
        fontSize: "2.8cqi", color: C.ppColor,
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        PP{move.pp}/{move.maxPp}
      </span>
    </div>
  );
}
