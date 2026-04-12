import { Suspense, lazy, useEffect, useState } from "react";
import OpeningScreen from "./OpeningScreen";
import TouchControls from "./TouchControls";
import PortraitBanner from "./PortraitBanner";
import { GameLoadingScreen } from "./GameLoadingScreen";
import { isTouchDevice } from "@/game/systems/TouchInput";

/**
 * PhaserGame carries the full Phaser runtime (~2.8MB) plus
 * OverworldScene / InteriorScene / NPCSystem / all game data. It's
 * lazy-loaded so the /explore landing page and title screen can
 * paint on a low-end mobile network without waiting for the engine.
 * The import starts as soon as the user has selected CONTINUE or
 * finished the Birch intro (gameStarted=true), which is the first
 * moment we know they'll actually play.
 */
const PhaserGame = lazy(() => import("./PhaserGame"));

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
  const [loadingDone, setLoadingDone] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // Fake loading progress — 2.5s total. Phaser preloads assets inside
  // BootScene on its own; this gives the player a polished intro
  // transition from the portfolio aesthetic into the pixel-art world.
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const DURATION = 2500;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setLoadingProgress(pct);
      if (pct >= 100) {
        setAssetsReady(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Touch detection runs only on the client — isTouchDevice reads
  // window/navigator, which SSR doesn't have.
  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  // `--touch-bar-h` reserves BOTTOM space for dialog boxes / menus
  // so text doesn't render under the player's thumbs. The touch
  // controls themselves are a TRANSPARENT OVERLAY on top of the game
  // canvas — they don't shrink the game viewport. Only UI elements
  // that use `bottom: calc(... + var(--touch-bar-h))` respect it.
  useEffect(() => {
    const h = isTouch ? "140px" : "0px";
    document.documentElement.style.setProperty("--touch-bar-h", h);
    return () => {
      document.documentElement.style.setProperty("--touch-bar-h", "0px");
    };
  }, [isTouch]);

  return (
    <>
      {!loadingDone && (
        <GameLoadingScreen
          progress={loadingProgress}
          assetsReady={assetsReady}
          isComplete={loadingDone}
          onStart={() => setLoadingDone(true)}
        />
      )}
      {loadingDone && !gameStarted && (
        <OpeningScreen onComplete={() => setGameStarted(true)} />
      )}
      {gameStarted && (
        // Suspense fallback is null — the previous OpeningScreen frame
        // stays on-screen during the 100-500ms Phaser-chunk fetch so
        // the transition from title → game is visually clean.
        <Suspense fallback={null}>
          <PhaserGame />
        </Suspense>
      )}
      {loadingDone && <TouchControls visible={isTouch} />}
      {loadingDone && <PortraitBanner enabled={isTouch} />}
    </>
  );
}
