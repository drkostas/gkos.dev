import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createGameConfig } from "@/game/config";
import DialogBox from "./DialogBox";
import StartMenu from "./StartMenu";

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

  useEffect(() => {
    if (!containerRef.current) return;

    const existing = (window as any).__PHASER_GAME__ as Phaser.Game | undefined;
    if (existing) {
      // HMR remount: reuse the existing game. Move its canvas into the
      // new container div so rendering stays visible.
      const canvas = existing.canvas as HTMLCanvasElement | undefined;
      if (canvas && canvas.parentElement !== containerRef.current) {
        containerRef.current.appendChild(canvas);
      }
      return;
    }

    const config = createGameConfig(containerRef.current);
    const game = new Phaser.Game(config);
    (window as any).__PHASER_GAME__ = game;

    return () => {
      // In prod, fully destroy. In dev, keep the game alive for HMR —
      // the new mount will reattach the canvas via the branch above.
      if (import.meta.env.PROD) {
        game.destroy(true);
        delete (window as any).__PHASER_GAME__;
      }
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", background: "#000" }}
      />
      <DialogBox />
      <StartMenu />
    </div>
  );
}
