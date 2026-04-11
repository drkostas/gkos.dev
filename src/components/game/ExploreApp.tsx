import { useState } from "react";
import OpeningScreen from "./OpeningScreen";
import PhaserGame from "./PhaserGame";

/**
 * Top-level wrapper for the Explore Mode page.
 *
 * Shows the opening screen (title + Birch speech) first, then mounts
 * PhaserGame after the player has pressed Start (and completed Birch
 * if first visit). This ensures Phaser doesn't boot until the opening
 * sequence is done, and the title music plays without Phaser interference.
 */
export default function ExploreApp() {
  const [gameStarted, setGameStarted] = useState(false);

  // Mobile detection — show message instead of game
  if (typeof window !== "undefined") {
    const isMobile =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 768;
    if (isMobile) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--pkmn-font, 'Courier New', monospace)",
            textAlign: "center",
            padding: "2rem",
            gap: "1rem",
            imageRendering: "pixelated",
          }}
        >
          <img
            src="/game/ui/opening/pokemon_logo_composed.png"
            alt="Pokemon"
            style={{ width: "200px", imageRendering: "pixelated" }}
          />
          <p style={{ fontSize: "1.2rem" }}>
            Explore Mode requires a keyboard.
          </p>
          <p style={{ fontSize: "1rem", color: "#aaa" }}>
            Visit gkos.dev/explore on desktop!
          </p>
        </div>
      );
    }
  }

  return (
    <>
      {!gameStarted && (
        <OpeningScreen onComplete={() => setGameStarted(true)} />
      )}
      {gameStarted && <PhaserGame />}
    </>
  );
}
