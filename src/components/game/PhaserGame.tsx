import { useEffect, useRef, useState, useCallback } from "react";
import Phaser from "phaser";
import { createGameConfig } from "@/game/config";
import { initSettings } from "@/game/systems/Settings";
import DialogBox from "./DialogBox";
import StartMenu from "./StartMenu";
import { GameLoadingScreen } from "./GameLoadingScreen";

/**
 * React wrapper that creates and destroys a Phaser.Game instance.
 *
 * Mount this component inside an Astro page with `client:only="react"` so
 * Phaser never runs during SSR (it requires `window`/`document`).
 *
 * HMR-safe: the Phaser.Game instance is stored on window and reused across
 * remounts, so Vite/React Fast Refresh doesn't blow away the game state
 * every time a CSS or TSX file changes. In production the cleanup runs
 * normally.
 */
export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [loadComplete, setLoadComplete] = useState(false);

  // Wire Phaser's loader progress to the React loading screen
  const attachLoadListeners = useCallback((game: Phaser.Game) => {
    game.events.on("step", () => {
      const bootScene = game.scene.getScene("BootScene");
      if (bootScene && bootScene.load) {
        setLoadProgress(bootScene.load.progress * 100);
      }
    });

    // Wait for OverworldScene to be active — assets loaded, world built
    const checkScene = () => {
      const overworld = game.scene.getScene("OverworldScene");
      if (overworld && overworld.scene.isActive()) {
        setLoadProgress(100);
        setAssetsReady(true);
        // Don't setLoadComplete yet — wait for user interaction to start BGM
      } else {
        requestAnimationFrame(checkScene);
      }
    };
    requestAnimationFrame(checkScene);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // ── UI scale CSS variables ─────────────────────────────
    // We use two separate scale variables so different UI elements can
    // grow with the most natural axis:
    //   --ui-scale-y → menu (start menu, vertical lists) — based on
    //                  window height vs the reference 720px
    //   --ui-scale-x → text/dialog box — based on window width vs the
    //                  reference 1280px
    // A floor of 0.6 prevents the UI from getting unreadably small.
    const REFERENCE_HEIGHT = 720;
    const REFERENCE_WIDTH = 1280;
    const updateUiScale = () => {
      const sy = Math.max(0.6, window.innerHeight / REFERENCE_HEIGHT);
      const sx = Math.max(0.6, window.innerWidth / REFERENCE_WIDTH);
      document.documentElement.style.setProperty("--ui-scale-y", String(sy));
      document.documentElement.style.setProperty("--ui-scale-x", String(sx));
    };
    updateUiScale();
    window.addEventListener("resize", updateUiScale);

    // Initialize settings (text speed, frame style, debug coords) and
    // apply the --ui-frame CSS var so the dialog/menu pick it up.
    initSettings();

    // Inject the actual Pokemon DS font as a self-hosted @font-face.
    // We host the TTF in /public/fonts/pokemon-ds.ttf — sourced from
    // boranblok/PokemonRomTools, this is the font Pokemon Gen3+ games
    // use for Latin glyphs and is very close to Pokemon Emerald's text.
    if (!document.getElementById("pkmn-font-style")) {
      const style = document.createElement("style");
      style.id = "pkmn-font-style";
      style.textContent = `
        @font-face {
          font-family: 'Pokemon DS';
          src: url('/fonts/pokemon-ds.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Pokemon GB';
          src: url('/fonts/pokemon-gb.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `;
      document.head.appendChild(style);
    }
    document.documentElement.style.setProperty(
      "--pkmn-font",
      "'Pokemon DS', 'Courier New', monospace",
    );

    const existing = (window as any).__PHASER_GAME__ as Phaser.Game | undefined;
    if (existing) {
      // HMR remount: reuse the existing game. Move its canvas into the
      // new container div so rendering stays visible.
      const canvas = existing.canvas as HTMLCanvasElement | undefined;
      if (canvas && canvas.parentElement !== containerRef.current) {
        containerRef.current.appendChild(canvas);
      }
      return () => {
        window.removeEventListener("resize", updateUiScale);
      };
    }

    const config = createGameConfig(containerRef.current);
    const game = new Phaser.Game(config);
    (window as any).__PHASER_GAME__ = game;
    attachLoadListeners(game);

    return () => {
      window.removeEventListener("resize", updateUiScale);
      // In prod, fully destroy. In dev, keep the game alive for HMR —
      // the new mount will reattach the canvas via the branch above.
      if (import.meta.env.PROD) {
        game.destroy(true);
        delete (window as any).__PHASER_GAME__;
      }
    };
  }, [attachLoadListeners]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", background: "#000" }}
      />
      <GameLoadingScreen
        progress={loadProgress}
        assetsReady={assetsReady}
        isComplete={loadComplete}
        onStart={() => setLoadComplete(true)}
      />
      <DialogBox />
      <StartMenu />
    </div>
  );
}
