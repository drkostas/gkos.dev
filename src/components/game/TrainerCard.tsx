import { useEffect, useRef } from "react";
import { POKEDEX_CAUGHT, POKEDEX_SEEN } from "@/game/data/pokemon";

interface TrainerCardProps {
  onClose: () => void;
}

/**
 * Pokemon Emerald-style Trainer Card overlay.
 *
 * Full-screen blue gradient card showing:
 * - Name, Class, ID, Money/Experience
 * - Badge row (8 skill badges)
 * - Pokedex stats
 * - Play time / adventure started
 */
export default function TrainerCard({ onClose }: TrainerCardProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" ||
        e.key === "x" ||
        e.key === "X" ||
        e.key === "Backspace" ||
        e.key === "Enter" ||
        e.key === "z" ||
        e.key === "Z"
      ) {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const yearsExperience = new Date().getFullYear() - 2017;

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={cardOuterStyle}>
        {/* Card border frame (Emerald uses a double-border look) */}
        <div style={cardInnerStyle}>
          {/* Header bar */}
          <div style={headerStyle}>
            TRAINER CARD
          </div>

          {/* Main content area */}
          <div style={contentStyle}>
            {/* Left side: info fields */}
            <div style={infoSectionStyle}>
              <InfoRow label="NAME" value="KOSTAS" />
              <InfoRow label="CLASS" value="ML ENGINEER" />
              <InfoRow label="ID No." value="PhD-2026" />
              <InfoRow label="EXP" value={`${yearsExperience}+ YEARS`} />
              <InfoRow label="MONEY" value="L5 AMAZON" />
            </div>

            {/* Right side: photo placeholder */}
            <div style={photoStyle}>
              <div style={photoInnerStyle}>
                <span style={{ fontSize: "20px" }}>K</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={dividerStyle} />

          {/* Pokedex / play time stats */}
          <div style={statsRowStyle}>
            <div>
              <span style={labelStyle}>POKeDEX</span>
              <span style={valueStyle}>
                {POKEDEX_SEEN} seen / {POKEDEX_CAUGHT} caught
              </span>
            </div>
          </div>

          <div style={statsRowStyle}>
            <div>
              <span style={labelStyle}>PLAY TIME</span>
              <span style={valueStyle}>{yearsExperience} yrs 0 min</span>
            </div>
          </div>

          <div style={statsRowStyle}>
            <div>
              <span style={labelStyle}>ADVENTURE</span>
              <span style={valueStyle}>Started 2017</span>
            </div>
          </div>

          {/* Divider */}
          <div style={dividerStyle} />

          {/* Badge row */}
          <div style={badgeSectionStyle}>
            <div style={badgeLabelStyle}>BADGES</div>
            <div style={badgeRowStyle}>
              {BADGES.map((badge) => (
                <div
                  key={badge.name}
                  style={badge.earned ? badgeEarnedStyle : badgeEmptyStyle}
                  title={badge.name}
                >
                  {badge.earned && (
                    <span style={{ fontSize: "9px" }}>{badge.icon}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer hint */}
          <div style={footerStyle}>
            Press any key to close
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Info row sub-component ─────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

// ── Badge data ─────────────────────────────────────────────────

const BADGES = [
  { name: "Python", icon: "\uD83D\uDC0D", earned: true },
  { name: "PyTorch", icon: "\uD83D\uDD25", earned: true },
  { name: "React", icon: "\u269B", earned: true },
  { name: "AWS", icon: "\u2601", earned: true },
  { name: "Docker", icon: "\uD83D\uDC33", earned: true },
  { name: "NeurIPS", icon: "\uD83C\uDFC6", earned: true },
  { name: "PhD", icon: "\uD83C\uDF93", earned: true },
  { name: "Leadership", icon: "\u2B50", earned: true },
];

// ── Styles ─────────────────────────────────────────────────────

const FONT = "'Geist Mono', 'Courier New', monospace";

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0, 0, 0, 0.6)",
};

const cardOuterStyle: React.CSSProperties = {
  width: "min(92%, 380px)",
  background: "linear-gradient(180deg, #3868a8 0%, #2850a0 30%, #2048b0 100%)",
  border: "4px solid #f8f8f8",
  borderRadius: "10px",
  padding: "4px",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.5)",
};

const cardInnerStyle: React.CSSProperties = {
  border: "2px solid rgba(255, 255, 255, 0.3)",
  borderRadius: "7px",
  padding: "10px 12px",
  fontFamily: FONT,
  color: "#f8f8f8",
  userSelect: "none",
};

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "2px",
  marginBottom: "10px",
  textShadow: "1px 1px 2px rgba(0, 0, 0, 0.4)",
};

const contentStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  marginBottom: "8px",
};

const infoSectionStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

const infoRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  fontSize: "11px",
  lineHeight: "1.5",
};

const labelStyle: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.65)",
  fontSize: "10px",
  minWidth: "60px",
  flexShrink: 0,
  letterSpacing: "0.5px",
};

const valueStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.3px",
};

const photoStyle: React.CSSProperties = {
  width: "60px",
  height: "60px",
  border: "2px solid rgba(255, 255, 255, 0.5)",
  borderRadius: "4px",
  background: "rgba(0, 0, 0, 0.2)",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const photoInnerStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  background: "rgba(255, 255, 255, 0.1)",
  borderRadius: "3px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  fontWeight: 700,
  color: "rgba(255, 255, 255, 0.5)",
};

const dividerStyle: React.CSSProperties = {
  height: "1px",
  background: "rgba(255, 255, 255, 0.2)",
  margin: "6px 0",
};

const statsRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "11px",
  padding: "2px 0",
};

const badgeSectionStyle: React.CSSProperties = {
  marginTop: "2px",
};

const badgeLabelStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "rgba(255, 255, 255, 0.65)",
  letterSpacing: "1px",
  marginBottom: "6px",
};

const badgeRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  justifyContent: "center",
};

const badgeEarnedStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #ffd700, #ffaa00)",
  border: "2px solid rgba(255, 255, 255, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.3)",
};

const badgeEmptyStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: "rgba(0, 0, 0, 0.3)",
  border: "2px solid rgba(255, 255, 255, 0.2)",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "10px",
  color: "rgba(255, 255, 255, 0.4)",
  marginTop: "8px",
};
