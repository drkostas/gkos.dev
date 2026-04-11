import { useEffect, useState } from "react";

/**
 * RotateOverlay — full-screen black overlay shown on touch devices
 * when the device is held in portrait orientation. The explore mode's
 * touch-control zone needs landscape aspect to be usable at all.
 *
 * The overlay disappears automatically when the device rotates back
 * to landscape, no reload required.
 *
 * Rendered unconditionally from `ExploreApp` on touch devices; the
 * orientation check is done here so the component can decide its own
 * visibility. On non-touch devices `ExploreApp` never mounts it.
 */
export default function RotateOverlay() {
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Prefer the Screen Orientation API via matchMedia since it fires
    // as soon as the OS reports the rotation; resize events lag.
    const mq = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    setIsPortrait(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!isPortrait) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
        touchAction: "none",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>
        <span role="img" aria-label="rotate phone">
          📱↻
        </span>
      </div>
      <p style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
        Rotate your device to landscape
      </p>
      <p style={{ fontSize: "0.9rem", color: "#888" }}>
        Explore Mode needs a wider screen
      </p>
    </div>
  );
}
