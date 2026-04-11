import { useEffect, useState } from "react";
import OpeningScreen from "./OpeningScreen";
import PhaserGame from "./PhaserGame";
import TouchControls from "./TouchControls";
import PortraitBanner from "./PortraitBanner";
import { isTouchDevice } from "@/game/systems/TouchInput";

/**
 * Top-level wrapper for the Explore Mode page.
 *
 * Desktop: OpeningScreen → PhaserGame fill the viewport via their
 * existing `position: fixed` overlays. The touch bar is not mounted
 * and `--touch-bar-h` stays at 0.
 *
 * Touch devices: mount `TouchControls` fixed at the bottom, mount
 * `PortraitBanner` for a non-blocking "rotate to landscape"
 * suggestion, and set `--touch-bar-h` so the Phaser canvas container
 * and any bottom-anchored overlays (DialogBox) leave room at the
 * bottom. Portrait is fully playable — the banner is purely
 * informational and auto-hides when the player rotates or dismisses.
 */
export default function ExploreApp() {
  const [gameStarted, setGameStarted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // Touch detection runs only on the client — isTouchDevice reads
  // window/navigator, which SSR doesn't have.
  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  // Set the `--touch-bar-h` CSS variable on :root so CSS rules can
  // reserve space at the bottom for the on-screen touch bar. On
  // desktop this stays 0 and nothing reserves space.
  useEffect(() => {
    const h = isTouch ? "120px" : "0px";
    document.documentElement.style.setProperty("--touch-bar-h", h);
    return () => {
      document.documentElement.style.setProperty("--touch-bar-h", "0px");
    };
  }, [isTouch]);

  return (
    <>
      {!gameStarted && (
        <OpeningScreen onComplete={() => setGameStarted(true)} />
      )}
      {gameStarted && <PhaserGame />}
      <TouchControls visible={isTouch} />
      <PortraitBanner enabled={isTouch} />
    </>
  );
}
