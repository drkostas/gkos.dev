import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { createGameConfig } from "@/game/config";
import { initSettings } from "@/game/systems/Settings";
import { initPC } from "@/game/systems/PCStore";
import { bgm } from "@/game/systems/BGMManager";
import DialogBox from "./DialogBox";
import StartMenu from "./StartMenu";
import MapNamePopup from "./MapNamePopup";
import PCInterface from "./PCInterface";
import QuestionnaireInterface from "./QuestionnaireInterface";
import NotificationBanner from "./NotificationBanner";
import ResearchLogWrapper from "./ResearchLogWrapper";

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
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Unlock audio on first user gesture (click/tap/keypress on THIS page).
  // Browser autoplay policy requires a gesture on the current document.
  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => {
      // Pre-warm audio by playing BGM immediately on gesture
      bgm.play("mauville");
      setAudioUnlocked(true);
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [audioUnlocked]);

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
    // Seed the PC with default items on first play.
    initPC();
    // Auto-register party Pokemon as CAUGHT in the Pokedex so the
    // list shows them (filled ball) even before the player has
    // triggered their first overworld encounter. Idempotent, safe
    // to call on every boot. Runs async but lands before the
    // player can open the Pokedex themselves.
    import("@/game/systems/PartyDexRegistrar").then(
      ({ registerPartyInPokedex }) => registerPartyInPokedex(),
    );
    // Inject the self-hosted @font-face declarations for the Pokemon
    // fan-made font recreations we use across the UI.
    //
    // - 'Pokemon Emerald Pro' by crystalwalrein (CC BY-SA 3.0) is a
    //   recreation of the Gen 3 Ruby/Sapphire/Emerald GBA dialogue
    //   font. Hosted in /public/fonts/pokemon-emerald-pro.ttf.
    // - 'Pokemon DS' is the Gen 4+ DS Latin glyph font kept as a
    //   fallback for anywhere the thinner DS-era look is wanted.
    // - 'Pokemon GB' is the Gen 1/2 Game Boy monospace font kept as
    //   a secondary fallback.
    if (!document.getElementById("pkmn-font-style")) {
      const style = document.createElement("style");
      style.id = "pkmn-font-style";
      style.textContent = `
        @font-face {
          font-family: 'Pokemon Emerald Pro';
          src: url('/fonts/pokemon-emerald-pro.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
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
      "'Pokemon Emerald Pro', 'Pokemon DS', 'Courier New', monospace",
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

    // Run new-content detection AFTER the Phaser game has booted and
    // the NotificationBanner has had a tick to mount its listener.
    // The banner queues multiple fires, so the slight delay just
    // ensures the boot notification isn't dropped on the floor if
    // the banner component hasn't hydrated yet on cold starts.
    const newContentTimer = window.setTimeout(() => {
      import("@/game/systems/NewContentDetector").then(
        ({ detectNewContent }) => {
          detectNewContent();
        },
      );
    }, 1500);

    return () => {
      window.removeEventListener("resize", updateUiScale);
      window.clearTimeout(newContentTimer);
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
      <MapNamePopup />
      <PCInterface />
      <QuestionnaireInterface />
      <NotificationBanner />
      <ResearchLogWrapper />
    </div>
  );
}
