/**
 * Player-facing settings (Options menu) — persisted in localStorage so
 * they survive page reloads. Mirrors the original Pokemon Emerald Options
 * screen where the player picks text speed, window frame style, etc.
 */

const STORAGE_KEY = "gkos:explore:settings";

export type TextSpeed = "slow" | "mid" | "fast";

export interface Settings {
  /** Show tile coordinate overlay (debug mode). */
  showCoords: boolean;
  /** Dialog typewriter speed. */
  textSpeed: TextSpeed;
  /**
   * Window frame style index (1..10). Maps to
   * `/game/ui/text_window/{n}.png` from pret/pokeemerald.
   */
  frameIndex: number;
}

const DEFAULTS: Settings = {
  showCoords: false,
  textSpeed: "fast",
  frameIndex: 1,
};

/**
 * Convert TextSpeed to milliseconds per character. Values match
 * pret's sTextSpeedFrameDelays in src/menu.c (1, 4, 8 frames @ 60fps).
 */
export function textSpeedMs(speed: TextSpeed): number {
  switch (speed) {
    case "slow": return 133; // 8 frames
    case "mid":  return 66;  // 4 frames
    case "fast": return 17;  // 1 frame
  }
}

/** Read all settings from localStorage with defaults. */
export function getSettings(): Settings {
  if (typeof localStorage === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Update one setting and persist. */
export function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): void {
  if (typeof localStorage === "undefined") return;
  const current = getSettings();
  current[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  // Apply CSS-variable side effects so the dialog/menu can update live.
  if (key === "frameIndex") {
    document.documentElement.style.setProperty(
      "--ui-frame",
      `url('/game/ui/text_window/${value}.png')`,
    );
  }
}

/**
 * Initialize settings on page load — applies the CSS variable for the
 * frame style so the dialog/menu pick it up immediately. Call once
 * from a top-level component.
 */
export function initSettings(): Settings {
  const s = getSettings();
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty(
      "--ui-frame",
      `url('/game/ui/text_window/${s.frameIndex}.png')`,
    );
  }
  return s;
}
