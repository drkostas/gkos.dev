import { useEffect, useRef, useState } from "react";
import { type ActivePartyMember, type Gender } from "@/game/data/party";
import { getActiveParty } from "@/game/systems/PartySystem";
import { sfx } from "@/game/systems/SoundManager";
import { useGameKeyboard } from "@/game/hooks/useGameKeyboard";
import PokemonSummary from "./PokemonSummary";

interface PartyMenuProps {
  onClose: () => void;
}

const GBA_W = 240;
const GBA_H = 160;
const FONT = "var(--pkmn-font, 'Courier New', monospace)";

// Slot positions from sSinglePartyMenuWindowTemplate (tile × 8)
const SLOTS = [
  { x: 8, y: 24, w: 80, h: 56 },
  { x: 96, y: 8, w: 144, h: 24 },
  { x: 96, y: 32, w: 144, h: 24 },
  { x: 96, y: 56, w: 144, h: 24 },
  { x: 96, y: 80, w: 144, h: 24 },
  { x: 96, y: 104, w: 144, h: 24 },
];

// [icon_x, icon_y, pokeball_x, pokeball_y]
const SPRITES = [
  [16, 40, 16, 34],
  [104, 18, 102, 25],
  [104, 42, 102, 49],
  [104, 66, 102, 73],
  [104, 90, 102, 97],
  [104, 114, 102, 121],
];

// Text offsets relative to slot window — Lead (80×56) and Wide (144×24)
const TL = { nick: [24, 11], lv: [32, 20], gen: [64, 20], hp: [36, 39], bar: [24, 35, 48, 3] };
const TR = { nick: [22, 3], lv: [30, 13], gen: [62, 13], hp: [100, 14], bar: [88, 10, 48, 3] };

const C = {
  white: "#f8f8f8",
  dark: "#4a4a62",
  gray: "#525252",
  hpG: ["#73ffac", "#5ad583"] as const,
  hpY: ["#ffe639", "#cdac08"] as const,
  hpR: ["#ff7331", "#c53900"] as const,
  male: "#41cdff",
  female: "#ff9c94",
  cancel: "#735ab4",
  bgTeal: "#83c5de",
  bgDark: "#297bb4",
  // OG olive BG color (top-center pixel of composed bg.png)
  bgOlive: "#8b9c29",
};

function hpColors(hp: number, max: number) {
  if (hp >= max * 0.5) return C.hpG;
  if (hp >= max * 0.2) return C.hpY;
  return C.hpR;
}
function hpW(hp: number, max: number) {
  return max === 0 ? 0 : Math.max(hp > 0 ? 1 : 0, Math.floor((hp / max) * 48));
}
const p = (v: number, of: number) => `${(v / of) * 100}%`;

export default function PartyMenu({ onClose }: PartyMenuProps) {
  const [sel, setSel] = useState(0);
  const [frame, setFrame] = useState(0);
  const [summaryMon, setSummaryMon] = useState<ActivePartyMember | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const frameRef = useRef<HTMLDivElement>(null);
  // Read fresh party from the save on each open (mid-game joins
  // won't show up if we cache this in useState).
  const party = getActiveParty();
  const N = party.length;

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => 1 - f), 500);
    return () => clearInterval(id);
  }, []);

  // Summary overlay handles its own keys — pause the party menu
  // listener while it's open.
  useGameKeyboard(!summaryMon, {
    cancel: () => { sfx.select(); onCloseRef.current(); },
    up: () => { sfx.select(); setSel((i) => (i <= 0 ? N : i - 1)); },
    down: () => { sfx.select(); setSel((i) => (i >= N ? 0 : i + 1)); },
    left: () => { sfx.select(); setSel((i) => (i >= 1 && i <= 5 ? 0 : i)); },
    right: () => { sfx.select(); setSel((i) => (i === 0 ? 1 : i)); },
    confirm: () => {
      sfx.confirm();
      if (sel === N) onCloseRef.current();
      else if (sel < N) setSummaryMon(party[sel]);
    },
  });

  // If a summary screen is open, render it instead
  if (summaryMon) {
    return <PokemonSummary member={summaryMon} onClose={() => setSummaryMon(null)} />;
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 250,
        display: "flex", alignItems: "center", justifyContent: "center",
        /* Solid olive matching the OG party menu BG — fills entire screen */
        background: C.bgOlive,
        pointerEvents: "auto",
      }}
    >
      <div
        ref={frameRef}
        style={{
          position: "relative",
          width: "min(135vh, 90vw)",
          height: "min(90vh, 60vw)",
          overflow: "hidden",
          imageRendering: "pixelated",
          fontFamily: FONT,
          containerType: "inline-size",
          /* Solid olive fill so edges don't show stripe bg behind */
          background: C.bgOlive,
        }}
      >
        {/* Inner BG: composed olive background from pokeemerald tilemap */}
        <img
          src="/game/ui/party/bg.png"
          alt="" draggable={false}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            imageRendering: "pixelated",
          }}
        />

        {/* ── Slot panels ── */}
        {SLOTS.map((s, i) => {
          const mon = i < N ? party[i] : null;
          const isSel = sel === i;
          const lead = i === 0;
          const type = lead ? "slot_main" : "slot_wide";
          const state = !mon ? "empty" : isSel ? "selected" : "normal";
          return (
            <div
              key={i}
              onClick={() => { sfx.select(); setSel(i); }}
              style={{
                position: "absolute",
                left: p(s.x, GBA_W), top: p(s.y, GBA_H),
                width: p(s.w, GBA_W), height: p(s.h, GBA_H),
                cursor: "pointer",
              }}
            >
              <img
                src={`/game/ui/party/${type}_${state}.png`}
                alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
              />
              {mon && (lead ? <SlotLead m={mon} /> : <SlotWide m={mon} />)}
            </div>
          );
        })}

        {/* ── Pokemon icons (z:3, above pokeballs) ── */}
        {party.map((m, i) => {
          const [ix, iy] = SPRITES[i];
          return (
            <div key={`i${i}`} style={{
              position: "absolute",
              left: p(ix - 16, GBA_W), top: p(iy - 16, GBA_H),
              width: p(32, GBA_W), height: p(32, GBA_H),
              overflow: "hidden", zIndex: 3, pointerEvents: "none",
            }}>
              <img
                src={`/game/sprites/pokemon/icons/${m.species}.png`} alt=""
                style={{ width: "100%", height: "200%", imageRendering: "pixelated", marginTop: frame === 0 ? "0%" : "-100%" }}
              />
            </div>
          );
        })}

        {/* ── Pokeball icons (z:2, behind Pokemon) ── */}
        {SPRITES.slice(0, N).map(([, , bx, by], i) => (
          <div key={`b${i}`} style={{
            position: "absolute",
            left: p(bx - 16, GBA_W), top: p(by - 16, GBA_H),
            width: p(32, GBA_W), height: p(32, GBA_H),
            overflow: "hidden", zIndex: 2, pointerEvents: "none",
          }}>
            <img src="/game/ui/party/pokeball.png" alt="" style={{ width: "100%", height: "200%", imageRendering: "pixelated" }} />
          </div>
        ))}

        {/* ── Bottom black bar (y=128 so Soma name+icon are visible above) ── */}
        <div style={{
          position: "absolute",
          left: 0, top: p(128, GBA_H),
          width: "100%", height: p(32, GBA_H),
          background: "#000",
          zIndex: 4,
        }} />

        {/* ── Message box (inside the black bar) ── */}
        <div style={{
          position: "absolute",
          left: p(4, GBA_W), top: p(129, GBA_H),
          width: p(186, GBA_W), height: p(26, GBA_H),
          background: "#fff",
          border: `1px solid ${C.dark}`,
          zIndex: 5,
          display: "flex", alignItems: "center",
          paddingLeft: p(8, GBA_W),
        }}>
          <span style={{ fontSize: "3.8cqi", fontFamily: FONT, color: C.dark, whiteSpace: "nowrap" }}>
            Choose a POK&eacute;MON.
          </span>
        </div>

        {/* ── Cancel button with small pokeball icon (OG asset) ── */}
        <div
          onClick={() => { sfx.select(); onClose(); }}
          style={{
            position: "absolute",
            left: p(194, GBA_W), top: p(131, GBA_H),
            width: p(42, GBA_W), height: p(20, GBA_H),
            background: sel === N
              ? `linear-gradient(180deg, #a473f6, ${C.cancel})`
              : `linear-gradient(180deg, ${C.cancel}, #5a3a8a)`,
            borderRadius: "15%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6%",
            cursor: "pointer",
            border: sel === N ? "1px solid #fff" : "1px solid #5a3a8a",
            zIndex: 5,
          }}
        >
          <img
            src="/game/ui/party/pokeball_small_icon.png"
            alt=""
            style={{
              width: `${(8 / 42) * 100}%`,
              imageRendering: "pixelated",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "3cqi", color: "#fff", fontFamily: FONT, letterSpacing: "0.04em" }}>
            CANCEL
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Slot text: Lead (80×56) ───────────────────────────────────────────
function SlotLead({ m }: { m: ActivePartyMember }) {
  const W = 80, H = 56;
  const [hL, hD] = hpColors(m.hp, m.maxHp);
  const bw = hpW(m.hp, m.maxHp);
  const t = (x: number, y: number, sz: number, color = C.white): React.CSSProperties => ({
    position: "absolute",
    left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`,
    fontSize: `${(sz / GBA_W) * 100}cqi`,
    fontFamily: FONT, color, lineHeight: 1,
    whiteSpace: "nowrap", pointerEvents: "none",
  });
  return (
    <>
      <span style={t(TL.nick[0], TL.nick[1], 10)}>{m.nickname}</span>
      <span style={t(TL.lv[0], TL.lv[1], 8)}>
        <span style={{ fontSize: "0.7em" }}>Lv</span>{m.level}
      </span>
      <Gen g={m.gender} style={{ ...t(TL.gen[0], TL.gen[1], 9, m.gender === "male" ? C.male : C.female) }} />
      {/* HP bar */}
      <div style={barStyle(TL.bar[0], TL.bar[1], TL.bar[2], TL.bar[3], W, H, C.dark)} />
      {bw > 0 && <div style={barStyle(TL.bar[0], TL.bar[1], bw, TL.bar[3], W, H, `linear-gradient(180deg,${hL},${hD})`)} />}
      {/* HP numbers — white (OG palette 3 color 3 = #ffffff) */}
      <span style={{ ...t(TL.hp[0], TL.hp[1], 7), textAlign: "right", width: `${(38 / W) * 100}%` }}>
        {m.hp}/{m.maxHp}
      </span>
    </>
  );
}

// ── Slot text: Wide (144×24) ──────────────────────────────────────────
function SlotWide({ m }: { m: ActivePartyMember }) {
  const W = 144, H = 24;
  const [hL, hD] = hpColors(m.hp, m.maxHp);
  const bw = hpW(m.hp, m.maxHp);
  const t = (x: number, y: number, sz: number, color = C.white): React.CSSProperties => ({
    position: "absolute",
    left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`,
    fontSize: `${(sz / GBA_W) * 100}cqi`,
    fontFamily: FONT, color, lineHeight: 1,
    whiteSpace: "nowrap", pointerEvents: "none",
  });
  return (
    <>
      <span style={t(TR.nick[0], TR.nick[1], 10)}>{m.nickname}</span>
      <span style={t(TR.lv[0], TR.lv[1], 8)}>
        <span style={{ fontSize: "0.7em" }}>Lv</span>{m.level}
      </span>
      <Gen g={m.gender} style={{ ...t(TR.gen[0], TR.gen[1], 9, m.gender === "male" ? C.male : C.female) }} />
      {/* HP bar */}
      <div style={barStyle(TR.bar[0], TR.bar[1], TR.bar[2], TR.bar[3], W, H, C.dark)} />
      {bw > 0 && <div style={barStyle(TR.bar[0], TR.bar[1], bw, TR.bar[3], W, H, `linear-gradient(180deg,${hL},${hD})`)} />}
      {/* HP numbers */}
      <span style={{ ...t(TR.hp[0], TR.hp[1], 7), textAlign: "right", width: `${(40 / W) * 100}%` }}>
        {m.hp}/{m.maxHp}
      </span>
    </>
  );
}

function barStyle(x: number, y: number, w: number, h: number, sw: number, sh: number, bg: string): React.CSSProperties {
  return {
    position: "absolute",
    left: `${(x / sw) * 100}%`, top: `${(y / sh) * 100}%`,
    width: `${(w / sw) * 100}%`, height: `${(h / sh) * 100}%`,
    background: bg,
  };
}

function Gen({ g, style }: { g: Gender; style: React.CSSProperties }) {
  if (g === "none") return null;
  return <span style={style}>{g === "male" ? "♂" : "♀"}</span>;
}
