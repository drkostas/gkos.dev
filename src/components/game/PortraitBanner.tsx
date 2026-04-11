import { useEffect, useState } from "react";

/**
 * PortraitBanner — dismissible "rotate to landscape" suggestion.
 *
 * Non-blocking alternative to a full-screen rotate overlay. The game
 * is fully playable in portrait; this just lets the player know
 * landscape gives them more screen. Appears once when the page loads
 * in portrait and:
 *
 *   - auto-hides when the device rotates to landscape
 *   - stays hidden for the rest of the session once dismissed
 *   - does NOT re-show if the player rotates back to portrait after
 *     dismissing — one-shot per session
 *
 * Renders nothing on non-touch devices. Fixed-position overlay at
 * the very top of the viewport (~30px tall, semi-transparent) so it
 * works with any parent layout. Floats over the top edge of the
 * game view — the top ~30px of the map bleeds behind it, which is
 * fine because the banner auto-dismisses and the bleed-through
 * background is barely perceptible through the semi-transparent
 * dark fill.
 */

export interface PortraitBannerProps {
  /**
   * When false the banner never renders. Pass `isTouchDevice()` so
   * desktop users never see it even if their window is tall.
   */
  enabled?: boolean;
}

export default function PortraitBanner({ enabled = true }: PortraitBannerProps) {
  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    typeof window === "undefined"
      ? false
      : window.innerHeight > window.innerWidth,
  );
  const [dismissed, setDismissed] = useState(false);

  // Track orientation with matchMedia — cheaper than listening to
  // resize and fires only when the actual orientation flips.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    // Safari < 14 uses the deprecated addListener; fall back if needed.
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  if (!enabled) return null;
  if (!isPortrait) return null;
  if (dismissed) return null;

  return (
    <div style={bannerStyle} role="note">
      <span style={textStyle}>
        Rotate to landscape for the best experience
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={dismissStyle}
      >
        ✕
      </button>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────── */

const bannerStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 12px",
  background: "rgba(0, 0, 0, 0.85)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  color: "rgba(255, 255, 255, 0.85)",
  fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
  fontSize: 11,
  letterSpacing: "0.5px",
  userSelect: "none",
  WebkitUserSelect: "none",
  // Above TouchControls (9000) and any in-game overlays, below
  // modal full-screen overlays (like a hypothetical hard rotate
  // block at 10000). 9500 gives us a clean middle slot.
  zIndex: 9500,
};

const textStyle: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  // Leave room for the dismiss button on the right without shifting
  // the text off-center.
  paddingLeft: 20,
};

const dismissStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  background: "transparent",
  border: "none",
  color: "rgba(255, 255, 255, 0.6)",
  fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
  fontSize: 14,
  cursor: "pointer",
  padding: 0,
  lineHeight: 1,
};
