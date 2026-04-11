import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { createGameConfig } from "@/game/config";
import { initSettings } from "@/game/systems/Settings";
import { initPC } from "@/game/systems/PCStore";
import { bgm } from "@/game/systems/BGMManager";
import { flushSave, getSave, updateSave } from "@/game/systems/GameSave";
import DialogBox from "./DialogBox";
import StartMenu from "./StartMenu";
import MapNamePopup from "./MapNamePopup";
import PCInterface from "./PCInterface";
import QuestionnaireInterface from "./QuestionnaireInterface";
import MartShopInterface from "./MartShopInterface";
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

  // Tick the in-save play time once per second while the tab is visible.
  // Pauses automatically when backgrounded so a forgotten tab doesn't
  // inflate the timer.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      const save = getSave();
      updateSave({ playTimeSeconds: save.playTimeSeconds + 1 });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Pause BGM when the tab is backgrounded, resume when it returns.
  // Without this, HTMLAudioElement keeps playing in the background
  // tab (wasting the audio pipe and annoying the user). Phaser's
  // requestAnimationFrame already stops on hidden; this handles the
  // audio side. Resume only if the player hadn't manually stopped
  // playback between hide/show.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        bgm.pause();
        // B1: also force-flush any pending save mutations so mobile
        // browsers that kill backgrounded tabs don't lose state.
        flushSave();
      } else {
        bgm.resume();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // B1: flush pending save writes on page unload. queueMicrotask usually
  // fires before the beforeunload handler, but explicit flush ensures
  // correctness when tab close races a synchronous updateSave().
  useEffect(() => {
    const onBeforeUnload = () => flushSave();
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onBeforeUnload);
    };
  }, []);

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
    //
    // M4/M5: Floor of 0.6 was too high for iPhone 14 Pro portrait
    // (393px × 0.6 = 236px effective base, which overshot real
    // dimensions) — menu borders and buttons looked chonky. New
    // clamp(0.35, viewport/reference, 1.3) gives a smoother scale:
    //   393px  portrait  → 0.35 (floor hit)
    //   852px  landscape → 0.67
    //   1280px desktop   → 1.00
    //   1920px+          → 1.30 (cap)
    // Every existing `calc(Npx * var(--ui-scale-x))` now scales down
    // proportionally on small screens, and inflated mobile text is
    // already blocked by the text-size-adjust: 100% rule in global.css.
    const REFERENCE_HEIGHT = 720;
    const REFERENCE_WIDTH = 1280;
    const SCALE_MIN = 0.35;
    const SCALE_MAX = 1.3;
    const clampScale = (raw: number) =>
      Math.min(SCALE_MAX, Math.max(SCALE_MIN, raw));
    const updateUiScale = () => {
      const sy = clampScale(window.innerHeight / REFERENCE_HEIGHT);
      const sx = clampScale(window.innerWidth / REFERENCE_WIDTH);
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
    // - 'Pokemon DS' is the Gen 4+ DS Latin glyph font — primary for
    //   dialogue boxes and menus. Hosted in /public/fonts/pokemon-ds.ttf.
    // - 'Pokemon GB' is the Gen 1/2 Game Boy monospace font kept as
    //   a secondary fallback.
    //
    // The 'Pokemon Emerald Pro' @font-face that used to live here
    // pointed at a file that was never shipped to public/fonts/, so
    // every /explore load fired a 404 for pokemon-emerald-pro.ttf.
    // The CSS var now leads with 'Pokemon DS' which is what the
    // browser was already falling back to anyway.
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
      "'Pokemon DS', 'Pokemon GB', 'Courier New', monospace",
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

    // Handle WebGL context loss. GPU resets, tab suspend, or low-memory
    // pressure can invalidate the canvas's WebGL context mid-session;
    // without a handler the game silently freezes (Phaser's renderer
    // has limited support for graceful recovery). We preventDefault so
    // the browser keeps the canvas around, then reload after a short
    // delay so the player sees the problem acknowledged instead of a
    // frozen frame.
    //
    // The canvas isn't ready until Phaser's BootScene fires BOOT, so
    // attach the listener once the game reports ready.
    const onContextLost = (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line no-console
      console.warn("[PhaserGame] WebGL context lost — reloading");
      window.setTimeout(() => window.location.reload(), 250);
    };
    const onContextRestored = () => {
      // Rare: context came back on its own. Reload anyway since Phaser
      // hasn't rebuilt its texture uploads.
      // eslint-disable-next-line no-console
      console.warn("[PhaserGame] WebGL context restored — reloading to rebuild");
      window.location.reload();
    };
    game.events.once("ready", () => {
      const canvas = game.canvas as HTMLCanvasElement | undefined;
      if (!canvas) return;
      canvas.addEventListener("webglcontextlost", onContextLost, false);
      canvas.addEventListener("webglcontextrestored", onContextRestored, false);
    });

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
      // Clean up the context-loss listeners so they don't fire against
      // a torn-down game instance during HMR.
      const canvas = game.canvas as HTMLCanvasElement | undefined;
      if (canvas) {
        canvas.removeEventListener("webglcontextlost", onContextLost, false);
        canvas.removeEventListener("webglcontextrestored", onContextRestored, false);
      }
      // Stop BGM on unmount. Without this, navigating away from
      // /explore to a different portfolio page would leak an
      // HTMLAudioElement that keeps looping the track forever.
      // Safe to call in both dev and prod — bgm.stop is a no-op
      // when nothing is playing.
      bgm.stop();
      // In prod, fully destroy. In dev, keep the game alive for HMR —
      // the new mount will reattach the canvas via the branch above.
      if (import.meta.env.PROD) {
        game.destroy(true);
        delete (window as any).__PHASER_GAME__;
      }
    };
  }, []);

  return (
    <div
      style={{
        // Fill the parent GameLayout slot (which is `flex-1` below
        // the navbar). The touch controls are a transparent overlay
        // ON TOP of the canvas — they don't shrink the game viewport.
        position: "absolute",
        inset: 0,
      }}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", background: "#000" }}
      />
      <DialogBox />
      <StartMenu />
      <MapNamePopup />
      <PCInterface />
      <QuestionnaireInterface />
      <MartShopInterface />
      <NotificationBanner />
      <ResearchLogWrapper />
    </div>
  );
}
