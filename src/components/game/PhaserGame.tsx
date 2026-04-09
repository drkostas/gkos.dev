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
 */
export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config = createGameConfig(containerRef.current);
    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
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
