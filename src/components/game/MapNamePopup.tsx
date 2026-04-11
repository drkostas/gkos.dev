import { useCallback, useEffect, useRef, useState } from "react";
import { GameEvents, onGameEvent } from "@/game/EventBridge";

/**
 * OG-style map name popup rendered as a React overlay on the game canvas.
 * Slides down from the top-left when entering a new zone.
 *
 * Uses the actual pokeemerald marble/wood popup background images.
 */

interface PopupData {
  name: string;
  theme: "marble" | "wood";
}

export default function MapNamePopup() {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [phase, setPhase] = useState<"hidden" | "sliding_in" | "visible" | "sliding_out">("hidden");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const unsub = onGameEvent(GameEvents.SHOW_MAP_NAME, (detail) => {
      const { name, theme } = detail as PopupData;
      clearTimers();
      setPopup({ name, theme });
      setPhase("sliding_in");

      // After slide-in animation (333ms), go to visible
      timeoutRef.current = setTimeout(() => {
        setPhase("visible");
        // Stay visible for 2s, then slide out
        timeoutRef.current = setTimeout(() => {
          setPhase("sliding_out");
          // After slide-out (333ms), hide
          timeoutRef.current = setTimeout(() => {
            setPhase("hidden");
            setPopup(null);
          }, 333);
        }, 2000);
      }, 333);
    });

    return () => {
      unsub();
      clearTimers();
    };
  }, [clearTimers]);

  if (!popup || phase === "hidden") return null;

  const bgImage = `/game/ui/popup_${popup.theme}.png`;
  const isVisible = phase === "visible" || phase === "sliding_in";
  // OG marble = greenish tan, wood = brown
  const fallbackBg = popup.theme === "marble" ? "#b8c8a0" : "#c09868";

  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      pointerEvents: "none",
      zIndex: 100,
      overflow: "hidden",
      height: 100,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        left: 12,
        top: isVisible ? 10 : -70,
        transition: "top 333ms ease-out",
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "100% 100%",
        backgroundColor: fallbackBg,
        imageRendering: "pixelated" as const,
        padding: "8px 16px",
        minWidth: 160,
        border: "3px solid #585858",
        borderRadius: 2,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
      }}>
        <span style={{
          fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
          fontSize: "calc(18px * var(--ui-scale-y, 1))",
          color: "#383838",
          textShadow: "0 0 4px rgba(255,255,255,0.9), 1px 1px 0 rgba(255,255,255,0.7)",
          whiteSpace: "nowrap",
          letterSpacing: 1,
          backgroundColor: "rgba(255,255,255,0.35)",
          padding: "calc(2px * var(--ui-scale-y, 1)) calc(6px * var(--ui-scale-y, 1))",
          borderRadius: 2,
        }}>
          {popup.name}
        </span>
      </div>
    </div>
  );
}
