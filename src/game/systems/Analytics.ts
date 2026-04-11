/**
 * Analytics — thin wrapper around the Umami tracker.
 *
 * The main site loads the Umami script globally, so `window.umami` is
 * available in the browser. If the script isn't loaded (e.g. ad blocker,
 * SSR, tests), every call is a silent no-op so gameplay never breaks.
 *
 * This module is intentionally pure — it does NOT import from any other
 * game system. GameSave / NPCSystem / etc. import FROM this module in
 * one direction to avoid circular dependencies. Session-end reads the
 * save and step localStorage keys directly.
 */

interface UmamiGlobal {
  track: (event: string, data?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    umami?: UmamiGlobal;
  }
}

/** localStorage key for GameSave (kept in sync with GameSave.ts). */
const SAVE_KEY = "gkos:explore:save";
/** localStorage key for StepStore (kept in sync with StepStore.ts). */
const STEPS_KEY = "gkos:explore:steps";

const sessionStart = typeof Date !== "undefined" ? Date.now() : 0;
let sessionTracked = false;

/**
 * Core tracking primitive. Silently no-ops if `window.umami` is not
 * available. Analytics must never throw — any error is swallowed.
 */
export function track(event: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const u = window.umami;
  if (!u) return;
  try {
    u.track(event, data);
  } catch {
    // Never let analytics break gameplay.
  }
}

// ── Typed event helpers ───────────────────────────────────────

export function trackGameStart(
  playerName: string,
  playerGender: "boy" | "girl",
): void {
  track("game-start", { name: playerName, gender: playerGender });
}

export function trackPokedexRegister(
  pokemon: string,
  project: string,
): void {
  track("pokedex-register", { pokemon, project });
}

export function trackPaperCollected(paper: string): void {
  track("paper-collected", { paper });
}

export function trackBlogCollected(blog: string): void {
  track("blog-collected", { blog });
}

/**
 * Badge earned. Fires `badge-earned` for every badge and also emits
 * the dedicated `champion-badge` event for the 8th/final badge so
 * dashboards can highlight game completions.
 */
export function trackBadgeEarned(badge: string): void {
  track("badge-earned", { badge });
  if (badge === "champion") {
    track("champion-badge");
  }
}

export function trackUrlOpened(type: string, id: string): void {
  track("url-opened", { type, id });
}

// ── Session end ───────────────────────────────────────────────

/**
 * Read session snapshot directly from localStorage so this module
 * stays dependency-free. Returns safe defaults if nothing is stored
 * (e.g. first session with no saved progress yet).
 */
function readSessionSnapshot(): { steps: number; badges: number } {
  if (typeof localStorage === "undefined") return { steps: 0, badges: 0 };
  let steps = 0;
  let badges = 0;
  try {
    const rawSteps = localStorage.getItem(STEPS_KEY);
    if (rawSteps) {
      const n = parseInt(rawSteps, 10);
      if (Number.isFinite(n) && n >= 0) steps = n;
    }
  } catch {
    // ignore
  }
  try {
    const rawSave = localStorage.getItem(SAVE_KEY);
    if (rawSave) {
      const parsed = JSON.parse(rawSave);
      if (Array.isArray(parsed?.badges)) badges = parsed.badges.length;
    }
  } catch {
    // ignore
  }
  return { steps, badges };
}

/**
 * Fire the `game-session` end-of-session event at most once per page
 * lifetime. Called from pagehide + visibilitychange listeners so we
 * capture both normal unloads and tab-background events.
 */
function trackSessionEnd(): void {
  if (sessionTracked) return;
  sessionTracked = true;
  const duration = Math.round((Date.now() - sessionStart) / 1000);
  const snap = readSessionSnapshot();
  track("game-session", {
    duration,
    steps: snap.steps,
    badges: snap.badges,
  });
}

// Wire session-end listeners as a module side effect so every game
// entry point gets them without needing to remember to call anything.
// pagehide is the most reliable signal across desktop + mobile and
// plays nicely with the browser back-forward cache. visibilitychange
// covers tab-background scenarios where pagehide may not fire.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", trackSessionEnd);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") trackSessionEnd();
  });
}
