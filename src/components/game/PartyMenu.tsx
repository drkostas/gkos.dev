import { useCallback, useEffect, useRef, useState } from "react";
import { PARTY, type PartyMember, type Gender } from "@/game/data/party";
import { sfx } from "@/game/systems/SoundManager";

interface PartyMenuProps {
  onClose: () => void;
}

// ── GBA Constants ─────────────────────────────────────────────────────
const GBA_W = 240;
const GBA_H = 160;

// Slot window positions (from sSinglePartyMenuWindowTemplate, tile×8)
const SLOT_POSITIONS = [
  { x: 8, y: 24, w: 80, h: 56 },   // Slot 0 (lead, left column)
  { x: 96, y: 8, w: 144, h: 24 },   // Slot 1
  { x: 96, y: 32, w: 144, h: 24 },  // Slot 2
  { x: 96, y: 56, w: 144, h: 24 },  // Slot 3
  { x: 96, y: 80, w: 144, h: 24 },  // Slot 4
  { x: 96, y: 104, w: 144, h: 24 }, // Slot 5
];

// Sprite positions (from sPartyMenuSpriteCoords PARTY_LAYOUT_SINGLE)
// [icon_x, icon_y, pokeball_x, pokeball_y]
const SPRITE_POS = [
  [16, 40, 16, 34],
  [104, 18, 102, 25],
  [104, 42, 102, 49],
  [104, 66, 102, 73],
  [104, 90, 102, 97],
  [104, 114, 102, 121],
];

// Text positions within each slot window (from sPartyBoxInfoRects)
const TEXT_LEFT = {
  nickname: { x: 24, y: 11 },
  level: { x: 32, y: 20 },
  gender: { x: 64, y: 20 },
  hp: { x: 36, y: 37 },
  hpBar: { x: 24, y: 35, w: 48, h: 3 },
};
const TEXT_RIGHT = {
  nickname: { x: 22, y: 3 },
  level: { x: 30, y: 12 },
  gender: { x: 62, y: 12 },
  hp: { x: 100, y: 12 },
  hpBar: { x: 88, y: 10, w: 48, h: 3 },
};

// Palette colors from pokeemerald bg.png
const C = {
  bgTeal: "#83c5de",
  bgTealDark: "#297bb4",
  white: "#f8f8f8",
  gray: "#737373",
  darkOutline: "#4a4a62",
  darkGray: "#525252",
  hpGreenLight: "#73ffac",
  hpGreenDark: "#5ad583",
  hpYellowLight: "#ffe639",
  hpYellowDark: "#cdac08",
  hpRedLight: "#ff7331",
  hpRedDark: "#c53900",
  maleLight: "#41cdff",
  maleDark: "#006294",
  femaleLight: "#ff9c94",
  femaleDark: "#9c4139",
  cancelBg: "#735ab4",
};

const FONT = "var(--pkmn-font, 'Courier New', monospace)";

function getHpBarColors(hp: number, maxHp: number) {
  if (hp === maxHp || hp > maxHp * 0.5) return [C.hpGreenLight, C.hpGreenDark];
  if (hp > maxHp * 0.2) return [C.hpYellowLight, C.hpYellowDark];
  return [C.hpRedLight, C.hpRedDark];
}

const HP_BAR_MAX_PX = 48;
function hpBarWidth(hp: number, maxHp: number) {
  if (maxHp === 0) return 0;
  return Math.max(hp > 0 ? 1 : 0, Math.floor((hp / maxHp) * HP_BAR_MAX_PX));
}

// ── Component ─────────────────────────────────────────────────────────
export default function PartyMenu({ onClose }: PartyMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [iconFrame, setIconFrame] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const overlayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const partySize = PARTY.length;

  // Sync background stripes with the game frame (same approach as BagMenu)
  useEffect(() => {
    const syncStripes = () => {
      if (!overlayRef.current || !frameRef.current) return;
      const fRect = frameRef.current.getBoundingClientRect();
      const oRect = overlayRef.current.getBoundingClientRect();
      const offsetY = fRect.top - oRect.top;
      const stripeH = fRect.height / 80; // 80 stripes across the GBA height
      overlayRef.current.style.setProperty("--stripe-off", `${offsetY}px`);
      overlayRef.current.style.setProperty("--sh", `${stripeH}px`);
    };
    syncStripes();
    window.addEventListener("resize", syncStripes);
    return () => window.removeEventListener("resize", syncStripes);
  }, []);

  // Icon bobbing animation (~500ms, like the OG)
  useEffect(() => {
    const interval = setInterval(() => setIconFrame((f) => 1 - f), 500);
    return () => clearInterval(interval);
  }, []);

  // Open a party member's project URL
  const openPartyMember = useCallback((index: number) => {
    const member = index < PARTY.length ? PARTY[index] : null;
    if (member?.url) window.open(member.url, "_blank", "noopener");
  }, []);

  // Keyboard navigation — sequential like OG Emerald
  const handleKey = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    if (key === "Escape" || key === "x" || key === "X" || key === "Backspace") {
      e.preventDefault();
      sfx.cancel();
      onCloseRef.current();
      return;
    }
    const last = partySize; // cancel index
    if (key === "ArrowUp") {
      e.preventDefault(); sfx.select();
      setSelectedIndex((i) => (i <= 0 ? last : i - 1));
    } else if (key === "ArrowDown") {
      e.preventDefault(); sfx.select();
      setSelectedIndex((i) => (i >= last ? 0 : i + 1));
    } else if (key === "ArrowLeft") {
      e.preventDefault(); sfx.select();
      setSelectedIndex((i) => (i >= 1 && i <= 5 ? 0 : i));
    } else if (key === "ArrowRight") {
      e.preventDefault(); sfx.select();
      setSelectedIndex((i) => (i === 0 ? 1 : i));
    } else if (key === "Enter" || key === "z" || key === "Z") {
      e.preventDefault(); sfx.confirm();
      if (selectedIndex === last) onCloseRef.current();
      else openPartyMember(selectedIndex);
    }
  }, [selectedIndex, openPartyMember, partySize]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Striped background matching the bag menu pattern — synced to frame
        background: [
          "repeating-linear-gradient(to bottom,",
          `${C.bgTeal} 0px,`,
          `${C.bgTeal} var(--sh, 5px),`,
          `${C.bgTealDark} var(--sh, 5px),`,
          `${C.bgTealDark} calc(var(--sh, 5px) * 2))`,
        ].join(" "),
        backgroundPositionY: "var(--stripe-off, 0px)",
        pointerEvents: "auto",
      }}
    >
      {/* GBA-sized frame — container for cqi font sizing */}
      <div
        ref={frameRef}
        style={{
          position: "relative",
          width: "min(82.5vh, 55vw)",
          height: "min(55vh, 36.67vw)",
          imageRendering: "pixelated",
          fontFamily: FONT,
          overflow: "hidden",
          containerType: "inline-size",
        }}
      >
        {/* BG: teal base fill inside the frame */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, ${C.bgTeal} 0%, ${C.bgTealDark} 100%)`,
        }} />

        {/* ── Slot panels ──────────────────────────────────── */}
        {SLOT_POSITIONS.map((pos, i) => {
          const member = i < partySize ? PARTY[i] : null;
          const isSelected = selectedIndex === i;
          const isLead = i === 0;
          const panelType = isLead ? "slot_main" : "slot_wide";
          const panelState = !member ? "empty" : isSelected ? "selected" : "normal";
          const panelSrc = `/game/ui/party/${panelType}_${panelState}.png`;

          return (
            <div
              key={i}
              onClick={() => { sfx.select(); setSelectedIndex(i); }}
              style={{
                position: "absolute",
                left: pct(pos.x, GBA_W),
                top: pct(pos.y, GBA_H),
                width: pct(pos.w, GBA_W),
                height: pct(pos.h, GBA_H),
              }}
            >
              <img
                src={panelSrc}
                alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
              />
              {member && (isLead
                ? <LeadSlotText member={member} />
                : <WideSlotText member={member} />
              )}
            </div>
          );
        })}

        {/* ── Pokemon icon sprites ── */}
        {PARTY.map((member, i) => {
          const [ix, iy] = SPRITE_POS[i];
          return (
            <div
              key={`icon-${i}`}
              style={{
                position: "absolute",
                left: pct(ix - 16, GBA_W),
                top: pct(iy - 16, GBA_H),
                width: pct(32, GBA_W),
                height: pct(32, GBA_H),
                overflow: "hidden",
                zIndex: 3,
                pointerEvents: "none",
              }}
            >
              <img
                src={`/game/sprites/pokemon/icons/${member.species}.png`}
                alt={member.nickname}
                style={{
                  width: "100%",
                  height: "200%", // 32×64 → show 50% at a time
                  imageRendering: "pixelated",
                  marginTop: iconFrame === 0 ? "0%" : "-100%",
                }}
              />
            </div>
          );
        })}

        {/* ── Pokeball icons (behind Pokemon) ── */}
        {SPRITE_POS.slice(0, partySize).map((pos, i) => {
          const [, , pbx, pby] = pos;
          return (
            <div
              key={`pb-${i}`}
              style={{
                position: "absolute",
                left: pct(pbx - 16, GBA_W),
                top: pct(pby - 16, GBA_H),
                width: pct(32, GBA_W),
                height: pct(32, GBA_H),
                overflow: "hidden",
                zIndex: 2,
                pointerEvents: "none",
              }}
            >
              <img
                src="/game/ui/party/pokeball.png"
                alt=""
                style={{ width: "100%", height: "200%", imageRendering: "pixelated" }}
              />
            </div>
          );
        })}

        {/* ── Bottom area (covers slot 5 overlap) ── */}
        <div style={{
          position: "absolute",
          left: 0,
          top: pct(122, GBA_H),
          width: "100%",
          height: pct(38, GBA_H),
          background: C.darkOutline,
          zIndex: 4,
        }} />

        {/* ── Message window ── */}
        <div style={{
          position: "absolute",
          left: pct(8, GBA_W),
          top: pct(122, GBA_H),
          width: pct(180, GBA_W),
          height: pct(30, GBA_H),
          background: "#fff",
          border: `1px solid ${C.darkOutline}`,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          paddingLeft: pct(10, GBA_W),
        }}>
          <span style={{
            fontSize: "clamp(8px, 1.2vw, 16px)",
            fontFamily: FONT,
            color: C.darkOutline,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}>
            Choose a POK&eacute;MON.
          </span>
        </div>

        {/* ── Cancel button ── */}
        <div
          onClick={() => { sfx.cancel(); onClose(); }}
          style={{
            position: "absolute",
            left: pct(192, GBA_W),
            top: pct(136, GBA_H),
            width: pct(44, GBA_W),
            height: pct(16, GBA_H),
            background: selectedIndex === 6
              ? `linear-gradient(180deg, #a473f6, ${C.cancelBg})`
              : `linear-gradient(180deg, ${C.cancelBg}, #5a3a8a)`,
            borderRadius: "12%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            border: selectedIndex === 6 ? "1px solid #fff" : `1px solid #4a3a6a`,
            zIndex: 5,
          }}
        >
          <span style={{
            fontSize: "clamp(6px, 0.9vw, 14px)",
            color: "#fff",
            fontFamily: FONT,
            letterSpacing: "0.04em",
          }}>
            CANCEL
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Convert GBA pixel to CSS % of the frame */
function pct(px: number, total: number) {
  return `${(px / total) * 100}%`;
}

/**
 * Positioned text within a slot. Coords are relative to slot window (GBA px).
 * Font size in GBA px → cqi units (% of frame inline size).
 * slotW/slotH define the GBA pixel size of the containing slot.
 */
function slotText(x: number, y: number, sizePx: number, slotW: number, slotH: number): React.CSSProperties {
  return {
    position: "absolute",
    left: `${(x / slotW) * 100}%`,
    top: `${(y / slotH) * 100}%`,
    fontSize: `${(sizePx / GBA_W) * 100}cqi`,
    fontFamily: FONT,
    color: C.white,
    lineHeight: 1,
    whiteSpace: "nowrap",
    pointerEvents: "none",
    letterSpacing: "0.02em",
  };
}

function barPos(x: number, y: number, w: number, h: number, slotW: number, slotH: number): React.CSSProperties {
  return {
    position: "absolute",
    left: `${(x / slotW) * 100}%`,
    top: `${(y / slotH) * 100}%`,
    width: `${(w / slotW) * 100}%`,
    height: `${(h / slotH) * 100}%`,
  };
}

// ── Lead Slot (slot 0, 80×56) ─────────────────────────────────────────
function LeadSlotText({ member }: { member: PartyMember }) {
  const L = TEXT_LEFT;
  const W = 80, H = 56;
  const [hpL, hpD] = getHpBarColors(member.hp, member.maxHp);
  const barW = hpBarWidth(member.hp, member.maxHp);
  return (
    <>
      <span style={slotText(L.nickname.x, L.nickname.y, 9, W, H)}>{member.nickname}</span>
      <span style={slotText(L.level.x, L.level.y, 7, W, H)}>
        <span style={{ fontSize: "0.75em" }}>Lv</span>{member.level}
      </span>
      <GenderIcon gender={member.gender} x={`${(L.gender.x / W) * 100}%`} y={`${(L.gender.y / H) * 100}%`} size={`${(8 / GBA_W) * 100}cqi`} />
      <div style={{ ...barPos(L.hpBar.x, L.hpBar.y, L.hpBar.w, L.hpBar.h, W, H), background: C.darkOutline }} />
      {barW > 0 && <div style={{ ...barPos(L.hpBar.x, L.hpBar.y, barW, L.hpBar.h, W, H), background: `linear-gradient(180deg, ${hpL}, ${hpD})` }} />}
      <span style={{ ...slotText(L.hp.x, L.hp.y, 7, W, H), textAlign: "right", width: `${(38 / W) * 100}%` }}>
        {member.hp}/{member.maxHp}
      </span>
    </>
  );
}

// ── Wide Slot (slots 1-5, 144×24) ─────────────────────────────────────
function WideSlotText({ member }: { member: PartyMember }) {
  const R = TEXT_RIGHT;
  const W = 144, H = 24;
  const [hpL, hpD] = getHpBarColors(member.hp, member.maxHp);
  const barW = hpBarWidth(member.hp, member.maxHp);
  return (
    <>
      <span style={slotText(R.nickname.x, R.nickname.y, 9, W, H)}>{member.nickname}</span>
      <span style={slotText(R.level.x, R.level.y, 7, W, H)}>
        <span style={{ fontSize: "0.75em" }}>Lv</span>{member.level}
      </span>
      <GenderIcon gender={member.gender} x={`${(R.gender.x / W) * 100}%`} y={`${(R.gender.y / H) * 100}%`} size={`${(8 / GBA_W) * 100}cqi`} />
      <div style={{ ...barPos(R.hpBar.x, R.hpBar.y, R.hpBar.w, R.hpBar.h, W, H), background: C.darkOutline }} />
      {barW > 0 && <div style={{ ...barPos(R.hpBar.x, R.hpBar.y, barW, R.hpBar.h, W, H), background: `linear-gradient(180deg, ${hpL}, ${hpD})` }} />}
      <span style={{ ...slotText(R.hp.x, R.hp.y, 7, W, H), textAlign: "right", width: `${(40 / W) * 100}%` }}>
        {member.hp}/{member.maxHp}
      </span>
    </>
  );
}

// ── Gender icon ───────────────────────────────────────────────────────
function GenderIcon({ gender, x, y, size }: { gender: Gender; x: string; y: string; size: string }) {
  if (gender === "none") return null;
  const male = gender === "male";
  return (
    <span style={{
      position: "absolute", left: x, top: y, fontSize: size,
      fontFamily: FONT, lineHeight: 1, pointerEvents: "none",
      color: male ? C.maleLight : C.femaleLight,
    }}>
      {male ? "♂" : "♀"}
    </span>
  );
}
