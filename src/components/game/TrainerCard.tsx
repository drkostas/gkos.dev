import { useEffect, useRef, useState } from "react";
import { sfx } from "@/game/systems/SoundManager";

interface TrainerCardProps {
  onClose: () => void;
}

/**
 * Pokemon Emerald Trainer Card — pixel-faithful reproduction.
 *
 * Layout matches the OG card (per the user's reference image):
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  ┌──────────────┐         ID No.04062026     │
 *   │  │ TRAINER CARD │                            │
 *   │  └──────────────┘            ┌──────────┐    │
 *   │  ▪NAME  KOSTAS                │          │    │
 *   │  ▪MONEY    L5                 │  BRENDAN │    │
 *   │  ▪POKéDEX  10                 │   PIC    │    │
 *   │  ▪PLAY TIME 8h                │          │    │
 *   │                              └──────────┘    │
 *   │  BADGES                                       │
 *   │  ◇ ◇ ◇ ◇ ◇ ◇ ◇ ◇                              │
 *   └──────────────────────────────────────────────┘
 *
 * Each badge slot is one of the 8 Hoenn gym badges from
 * pret/pokeemerald/graphics/trainer_card/badges.png (16×16 each).
 * Custom-renamed to skill badges. Clicking a badge opens an inline
 * confirm dialog that links to the relevant project / proof.
 */
export default function TrainerCard({ onClose }: TrainerCardProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedBadge) {
        if (e.key === "Enter" || e.key === "z" || e.key === "Z") {
          e.preventDefault();
          sfx.confirm();
          window.open(selectedBadge.url, "_blank", "noopener,noreferrer");
          setSelectedBadge(null);
          return;
        }
        if (e.key === "Escape" || e.key === "x" || e.key === "X" || e.key === "Backspace") {
          e.preventDefault();
          sfx.cancel();
          setSelectedBadge(null);
          return;
        }
        return;
      }
      // Enter / Z / Space flips the card (matches OG Emerald behavior).
      if (e.key === "Enter" || e.key === " " || e.key === "z" || e.key === "Z") {
        e.preventDefault();
        sfx.flip();
        setSide((s) => (s === "front" ? "back" : "front"));
        return;
      }
      // ESC instantly exits the trainer card from either side.
      if (e.key === "Escape" || e.key === "x" || e.key === "X" || e.key === "Backspace") {
        e.preventDefault();
        sfx.cancel();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedBadge]);

  const yearsExperience = new Date().getFullYear() - 2017;

  return (
    <div style={overlayStyle}>
      <div
        onClick={(e) => {
          // Click anywhere on the card flips it (unless a badge button
          // intercepted via stopPropagation).
          e.stopPropagation();
          sfx.flip();
          setSide((s) => (s === "front" ? "back" : "front"));
        }}
        style={cardStyle}
      >
        {side === "front" ? (
          <FrontSide
            yearsExperience={yearsExperience}
            onBadgeClick={(b) => setSelectedBadge(b)}
          />
        ) : (
          <BackSide onProjectClick={(b) => setSelectedBadge(b)} />
        )}
      </div>

      {/* ── Confirm-redirect dialog ───────────────────── */}
      {selectedBadge && (
        <div style={confirmOverlayStyle}>
          <div style={confirmBoxStyle}>
            <div style={confirmTitleStyle}>{selectedBadge.name}</div>
            <div style={confirmTaglineStyle}>{selectedBadge.tagline}</div>
            <div style={confirmButtonsRowStyle}>
              <button
                style={confirmButtonStyle}
                onClick={() => {
                  window.open(selectedBadge.url, "_blank", "noopener,noreferrer");
                  setSelectedBadge(null);
                }}
              >
                ▶ YES
              </button>
              <button
                style={confirmButtonStyle}
                onClick={() => setSelectedBadge(null)}
              >
                NO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Front side ───────────────────────────────────────────────

function FrontSide({
  yearsExperience,
  onBadgeClick,
}: {
  yearsExperience: number;
  onBadgeClick: (b: Badge) => void;
}) {
  return (
    <>
      {/* ── Top bar: TRAINER CARD label + ID No. ─────── */}
      <div style={topBarStyle}>
        <div style={cardLabelStyle}>TRAINER CARD</div>
        <div style={idStyle}>
          ID No.<span style={idValueStyle}>04062026</span>
        </div>
      </div>

      {/* ── Body: fields on left, portrait on right ──── */}
      <div style={bodyStyle}>
        <div style={fieldsColStyle}>
          <Field label="NAME" value="KOSTAS" />
          <Field label="MONEY" value="$L5" />
          <Field label="POKeDEX" value="10  PAPERS" />
          <Field label="PLAY TIME" value={`${yearsExperience}h 00m`} />
        </div>
        <div style={portraitFrameStyle}>
          <img
            src="/game/ui/trainer_card/brendan_pic.png"
            alt="trainer"
            style={portraitImgStyle}
            draggable={false}
          />
        </div>
      </div>

      {/* ── Badges row ────────────────────────────────── */}
      <div style={badgesSectionStyle}>
        <div style={badgesLabelStyle}>BADGES</div>
        <div style={badgesRowStyle}>
          {SKILL_BADGES.map((b, i) => (
            <button
              key={b.name}
              onClick={(e) => {
                e.stopPropagation(); // don't flip when clicking a badge
                onBadgeClick(b);
              }}
              title={b.name}
              style={badgeButtonStyle}
            >
              <img
                src={`/game/ui/portraits/badge_${i}.png`}
                alt={b.name}
                style={badgeImgStyle}
                draggable={false}
              />
            </button>
          ))}
        </div>
      </div>

      <div style={hintStyle}>Click / Z to flip · ESC to close</div>
    </>
  );
}

// ── Back side ────────────────────────────────────────────────

function BackSide({ onProjectClick }: { onProjectClick: (b: Badge) => void }) {
  return (
    <>
      {/* Header: TRAINER label + name */}
      <div style={backHeaderStyle}>
        <span style={backTrainerLabelStyle}>TRAINER:</span>
        <span style={backTrainerNameStyle}>KOSTAS</span>
      </div>

      {/* About me block */}
      <div style={aboutMeBlockStyle}>
        <div style={aboutMeLabelStyle}>ABOUT ME</div>
        <p style={aboutMeTextStyle}>
          PhD ML Engineer from Greece. Currently L5 Applied Scientist at
          Amazon. 8+ years shipping AI: maritime optimization, expense
          intelligence, healthcare scheduling, vision distillation.
          10 papers, 102+ citations, 8.3K GitHub followers, 7 PyPi packages.
          PhD defense April 2026, UTK Bredesen Center.
        </p>
      </div>

      {/* Stats: milestones */}
      <div style={backStatsStyle}>
        <BackRow label="HALL OF FAME DEBUT" value="2018" />
        <BackRow label="PAPER CITATIONS" value="102+" />
      </div>

      {/* Bottom: 6 Pokemon icons → linked to portfolio projects */}
      <div style={backIconsRowStyle}>
        {PROJECT_POKEMON.map((p) => (
          <button
            key={p.pokemon}
            onClick={(e) => {
              e.stopPropagation();
              onProjectClick(p.badge);
            }}
            title={`${p.badge.name} — ${p.badge.tagline}`}
            style={backIconSlotStyle}
          >
            <img
              src={`/game/ui/trainer_card/icons/${p.pokemon}.png`}
              alt={p.badge.name}
              style={backIconImgStyle}
              draggable={false}
            />
          </button>
        ))}
      </div>

      <div style={hintStyle}>SPACE/Z flip · ESC back · click ⚪ for project</div>
    </>
  );
}

// Map Pokemon icon → portfolio project badge. 6 picks, each with a
// thematic Pokemon (maritime → Lapras, etc.).
const PROJECT_POKEMON: { pokemon: string; badge: Badge }[] = [
  {
    pokemon: "snorlax",
    badge: {
      name: "FleetSmart.ai",
      tagline: "AI maritime optimization platform — 40+ enterprise vessels.",
      url: "https://fleetsmart.ai",
    },
  },
  {
    pokemon: "charizard",
    badge: {
      name: "ShiftMD",
      tagline: "Hospital shift scheduling SaaS for hospitals.",
      url: "https://shiftmd.com",
    },
  },
  {
    pokemon: "mewtwo",
    badge: {
      name: "MEDiC",
      tagline: "Medical CLIP distillation paper at NeurIPS.",
      url: "https://github.com/drkostas",
    },
  },
  {
    pokemon: "pikachu",
    badge: {
      name: "XpensAI",
      tagline: "AI-powered expense management platform.",
      url: "https://xpensai.com",
    },
  },
  {
    pokemon: "dragonite",
    badge: {
      name: "MaskDistill-PyTorch",
      tagline: "PyTorch implementation of mask distillation.",
      url: "https://github.com/drkostas",
    },
  },
  {
    pokemon: "gengar",
    badge: {
      name: "Soma",
      tagline: "Personal health dashboard.",
      url: "https://github.com/drkostas",
    },
  },
];

function BackRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={backRowStyle}>
      <span style={backRowLabelStyle}>{label}</span>
      <span style={backRowValueStyle}>{value}</span>
    </div>
  );
}

// ── Field row (front side) ─────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={fieldRowStyle}>
      <span style={fieldDotStyle} />
      <span style={fieldLabelStyle}>{label}</span>
      <span style={fieldValueStyle}>{value}</span>
    </div>
  );
}

// ── Badge data ─────────────────────────────────────────────────

interface Badge {
  name: string;
  tagline: string;
  url: string;
}

const SKILL_BADGES: Badge[] = [
  { name: "Python",     tagline: "8+ years building production ML in Python.", url: "https://github.com/drkostas" },
  { name: "PyTorch",    tagline: "PyTorch core for distillation + vision.",     url: "https://github.com/drkostas" },
  { name: "AWS",        tagline: "L5 Applied Scientist at Amazon.",              url: "https://aws.amazon.com" },
  { name: "React",      tagline: "Built FleetSmart.ai + this site in React.",    url: "https://github.com/drkostas" },
  { name: "Docker",     tagline: "Containerized 6+ production services.",        url: "https://github.com/drkostas" },
  { name: "NeurIPS",    tagline: "Paper accepted at NeurIPS.",                   url: "https://scholar.google.com/citations?user=drkostas" },
  { name: "PhD",        tagline: "PhD ML — UTK Bredesen Center, April 2026.",    url: "https://scholar.google.com/citations?user=drkostas" },
  { name: "Leadership", tagline: "Led teams across FleetSmart.ai + ShiftMD.",     url: "https://linkedin.com/in/drkostas" },
];

// ── Styles ─────────────────────────────────────────────────────

const FONT = "var(--pkmn-font, 'Courier New', monospace)";
const sY = "var(--ui-scale-y, 1)";

// OG Emerald trainer card colors (sampled from the user's reference image)
const CARD_BG_LIGHT = "#f0f8f8";
const CARD_BG_MID   = "#d8e8f0";
const CARD_BORDER_DARK = "#3a4860";
const CARD_BORDER_LIGHT = "#a8c0c8";
const LABEL_BLUE_DARK = "#3868c0";
const LABEL_BLUE_LIGHT = "#a0c8f0";
const TEXT_DARK = "#1c2438";
const DOT_TEAL = "#3aa090";

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  // OG Pokemon Emerald trainer-card screen backdrop, composed from
  // pret/pokeemerald/graphics/trainer_card/{bg.bin + tiles.png} → 240×160 PNG.
  // We tile/repeat it across the whole window with crisp pixel scaling.
  backgroundImage: "url('/game/ui/trainer_card/bg_full.png')",
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  imageRendering: "pixelated",
  pointerEvents: "auto",
};

const cardStyle: React.CSSProperties = {
  width: `calc(380px * ${sY})`,
  // Light cyan / off-white card with rounded corners and a thick double border.
  background: `linear-gradient(180deg, ${CARD_BG_LIGHT} 0%, ${CARD_BG_MID} 100%)`,
  border: `calc(3px * ${sY}) solid ${CARD_BORDER_DARK}`,
  outline: `calc(2px * ${sY}) solid ${CARD_BORDER_LIGHT}`,
  borderRadius: `calc(8px * ${sY})`,
  padding: `calc(12px * ${sY}) calc(14px * ${sY})`,
  fontFamily: FONT,
  color: TEXT_DARK,
  pointerEvents: "auto",
  boxShadow: `0 calc(4px * ${sY}) calc(16px * ${sY}) rgba(0,0,0,0.5)`,
  display: "flex",
  flexDirection: "column",
  gap: `calc(10px * ${sY})`,
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const cardLabelStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${LABEL_BLUE_LIGHT} 0%, ${LABEL_BLUE_DARK} 100%)`,
  color: "#f0f8ff",
  padding: `calc(3px * ${sY}) calc(10px * ${sY})`,
  fontSize: `calc(12px * ${sY})`,
  fontWeight: 700,
  letterSpacing: "1.5px",
  border: `calc(2px * ${sY}) solid ${CARD_BORDER_DARK}`,
  borderRadius: `calc(2px * ${sY})`,
  textShadow: "1px 1px 0 rgba(0,0,0,0.4)",
};

const idStyle: React.CSSProperties = {
  fontSize: `calc(11px * ${sY})`,
  color: TEXT_DARK,
  letterSpacing: "0.5px",
};

const idValueStyle: React.CSSProperties = {
  fontWeight: 700,
  marginLeft: `calc(2px * ${sY})`,
};

const bodyStyle: React.CSSProperties = {
  display: "flex",
  gap: `calc(12px * ${sY})`,
  alignItems: "center",
};

const fieldsColStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: `calc(6px * ${sY})`,
};

const fieldRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: `calc(6px * ${sY})`,
  fontSize: `calc(12px * ${sY})`,
  borderBottom: `calc(1px * ${sY}) solid rgba(58,72,96,0.3)`,
  paddingBottom: `calc(2px * ${sY})`,
};

const fieldDotStyle: React.CSSProperties = {
  display: "inline-block",
  width: `calc(6px * ${sY})`,
  height: `calc(6px * ${sY})`,
  background: DOT_TEAL,
  flexShrink: 0,
};

const fieldLabelStyle: React.CSSProperties = {
  fontWeight: 700,
  letterSpacing: "0.5px",
  color: TEXT_DARK,
  minWidth: `calc(80px * ${sY})`,
};

const fieldValueStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontWeight: 700,
  letterSpacing: "0.5px",
  color: TEXT_DARK,
};

const portraitFrameStyle: React.CSSProperties = {
  width: `calc(96px * ${sY})`,
  height: `calc(96px * ${sY})`,
  borderRadius: "50%",
  background: `radial-gradient(circle, #c8e0c8 0%, #88b888 80%, #6a906a 100%)`,
  border: `calc(3px * ${sY}) solid ${CARD_BORDER_DARK}`,
  outline: `calc(1px * ${sY}) solid ${CARD_BORDER_LIGHT}`,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  flexShrink: 0,
  overflow: "hidden",
};

const portraitImgStyle: React.CSSProperties = {
  width: `calc(80px * ${sY})`,
  height: `calc(80px * ${sY})`,
  imageRendering: "pixelated",
  marginBottom: `calc(2px * ${sY})`,
  display: "block",
  userSelect: "none",
  pointerEvents: "none",
};

const badgesSectionStyle: React.CSSProperties = {
  paddingTop: `calc(6px * ${sY})`,
  borderTop: `calc(2px * ${sY}) solid ${CARD_BORDER_DARK}`,
};

const badgesLabelStyle: React.CSSProperties = {
  fontSize: `calc(10px * ${sY})`,
  fontWeight: 700,
  letterSpacing: "1.5px",
  color: TEXT_DARK,
  marginBottom: `calc(4px * ${sY})`,
};

const badgesRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(8, 1fr)",
  gap: `calc(6px * ${sY})`,
  justifyItems: "center",
};

const badgeButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  outline: "none",
};

const badgeImgStyle: React.CSSProperties = {
  // Each badge is its own pre-cropped 16×16 PNG
  // (badge_0.png .. badge_7.png), scaled up via width/height with
  // image-rendering: pixelated for crisp pixels.
  width: `calc(32px * ${sY})`,
  height: `calc(32px * ${sY})`,
  imageRendering: "pixelated",
  display: "block",
  userSelect: "none",
  pointerEvents: "none",
};

// ── Hint footer (both sides) ───────────────────────────────────

const hintStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: `calc(9px * ${sY})`,
  color: "rgba(28,36,56,0.55)",
  marginTop: `calc(2px * ${sY})`,
  letterSpacing: "0.5px",
};

// ── Back side ──────────────────────────────────────────────────

const backHeaderStyle: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: `calc(6px * ${sY})`,
  borderBottom: `calc(2px * ${sY}) solid ${CARD_BORDER_DARK}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: `calc(8px * ${sY})`,
};

const backTrainerLabelStyle: React.CSSProperties = {
  fontSize: `calc(13px * ${sY})`,
  fontWeight: 700,
  color: LABEL_BLUE_DARK,
  letterSpacing: "1.5px",
};

const backTrainerNameStyle: React.CSSProperties = {
  fontSize: `calc(15px * ${sY})`,
  fontWeight: 700,
  color: TEXT_DARK,
  letterSpacing: "1px",
};

const backStatsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `calc(8px * ${sY})`,
  padding: `calc(8px * ${sY}) calc(4px * ${sY})`,
};

const backRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: `calc(12px * ${sY})`,
  borderBottom: `calc(1px * ${sY}) solid rgba(58,72,96,0.25)`,
  paddingBottom: `calc(4px * ${sY})`,
};

const backRowLabelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: TEXT_DARK,
  letterSpacing: "0.5px",
};

const backRowValueStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#d04020",
  fontSize: `calc(13px * ${sY})`,
};

const backIconsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: `calc(4px * ${sY})`,
  marginTop: `calc(8px * ${sY})`,
  paddingTop: `calc(6px * ${sY})`,
  borderTop: `calc(2px * ${sY}) solid ${CARD_BORDER_DARK}`,
  justifyItems: "center",
};

const backIconSlotStyle: React.CSSProperties = {
  width: `calc(40px * ${sY})`,
  height: `calc(40px * ${sY})`,
  borderRadius: "50%",
  background: "rgba(58,72,96,0.12)",
  border: `calc(2px * ${sY}) solid rgba(58,72,96,0.4)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  cursor: "pointer",
  padding: 0,
  transition: "transform 80ms",
};

const aboutMeBlockStyle: React.CSSProperties = {
  padding: `calc(6px * ${sY}) calc(2px * ${sY})`,
  borderBottom: `calc(1px * ${sY}) solid rgba(58,72,96,0.3)`,
};

const aboutMeLabelStyle: React.CSSProperties = {
  fontSize: `calc(10px * ${sY})`,
  fontWeight: 700,
  letterSpacing: "1px",
  color: LABEL_BLUE_DARK,
  marginBottom: `calc(4px * ${sY})`,
};

const aboutMeTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: `calc(11px * ${sY})`,
  lineHeight: 1.45,
  color: TEXT_DARK,
};

const backIconImgStyle: React.CSSProperties = {
  width: `calc(32px * ${sY})`,
  height: `calc(32px * ${sY})`,
  imageRendering: "pixelated",
  display: "block",
};

// ── Confirm dialog ─────────────────────────────────────────────

const confirmOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.4)",
  pointerEvents: "auto",
};

const confirmBoxStyle: React.CSSProperties = {
  borderStyle: "solid",
  borderWidth: `calc(24px * ${sY})`,
  borderImageSource: "var(--ui-frame, url('/game/ui/text_window/1.png'))",
  borderImageSlice: "8 fill",
  borderImageRepeat: "stretch",
  borderImageWidth: `calc(24px * ${sY})`,
  background: "transparent",
  padding: `calc(12px * ${sY}) calc(20px * ${sY})`,
  fontFamily: FONT,
  color: "#000",
  fontSize: `calc(13px * ${sY})`,
  textAlign: "center",
  imageRendering: "pixelated",
  outline: "none",
  minWidth: `calc(260px * ${sY})`,
};

const confirmTitleStyle: React.CSSProperties = {
  fontSize: `calc(16px * ${sY})`,
  fontWeight: 700,
  marginBottom: `calc(6px * ${sY})`,
};

const confirmTaglineStyle: React.CSSProperties = {
  fontSize: `calc(11px * ${sY})`,
  color: "#444",
  marginBottom: `calc(10px * ${sY})`,
};

const confirmButtonsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: `calc(16px * ${sY})`,
  justifyContent: "center",
};

const confirmButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: `calc(2px * ${sY}) solid #000`,
  borderRadius: `calc(3px * ${sY})`,
  color: "#000",
  fontFamily: FONT,
  fontSize: `calc(13px * ${sY})`,
  padding: `calc(4px * ${sY}) calc(14px * ${sY})`,
  cursor: "pointer",
  letterSpacing: "0.5px",
};
