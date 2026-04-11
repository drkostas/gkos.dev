/**
 * EventBridge — DOM CustomEvent bridge for Phaser ↔ React communication.
 *
 * Both sides emit/listen on `window` using typed custom events.
 * This avoids any direct coupling between Phaser scenes and React components.
 */

export const GameEvents = {
  SHOW_DIALOG: "game:show-dialog",
  HIDE_DIALOG: "game:hide-dialog",
  DIALOG_COMPLETE: "game:dialog-complete",
  SHOW_MENU: "game:show-menu",
  MENU_CLOSE: "game:menu-close",
  /** Debug mode: overlays semi-transparent tile coords so user can point at exact positions. */
  TOGGLE_DEBUG: "game:toggle-debug",
  /** Map name popup: shows zone name when entering a new area. */
  SHOW_MAP_NAME: "game:show-map-name",
  /** Open the PC interface. */
  SHOW_PC: "game:show-pc",
  /** PC closed — resume game. */
  PC_CLOSE: "game:pc-close",
  /** Open the questionnaire interface (letter on the desk). */
  SHOW_QUESTIONNAIRE: "game:show-questionnaire",
  /** Questionnaire closed — resume game. */
  QUESTIONNAIRE_CLOSE: "game:questionnaire-close",
  /**
   * Show a non-blocking notification banner at the top-center of
   * the screen. Multiple fires are queued by the React banner
   * component and shown one at a time.
   */
  SHOW_NOTIFICATION: "game:show-notification",
  /** Open the research log viewer. */
  SHOW_RESEARCH_LOG: "game:show-research-log",
  /** Research log closed. */
  RESEARCH_LOG_CLOSE: "game:research-log-close",
  /** Open the Pokemart TM shop (currency = steps). */
  SHOW_MART_SHOP: "game:show-mart-shop",
  /** Mart shop closed — resume game. */
  MART_SHOP_CLOSE: "game:mart-shop-close",
} as const;

export interface QuestionnairePayload {
  /** Unique id used to persist completion / award the item. */
  id: string;
}

export interface NotificationPayload {
  /** Text shown inside the pill. */
  message: string;
  /** Optional single-char prefix (default: "♪"). */
  icon?: string;
}

/**
 * Fire a notification banner. Fire-and-forget — the banner is
 * non-blocking and queues itself. Safe to call from any scene or
 * React component.
 */
export function showNotification(
  message: string,
  icon?: string,
): void {
  emitGameEvent(GameEvents.SHOW_NOTIFICATION, { message, icon });
}

/**
 * Read the persisted debug-mode state from localStorage.
 * Defaults to false if never set.
 */
export function getDebugMode(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("gkos:explore:debug") === "1";
}

/**
 * Persist the debug-mode state to localStorage.
 */
export function setDebugMode(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("gkos:explore:debug", enabled ? "1" : "0");
}

export interface DialogPayload {
  lines: string[];
  speakerName?: string;
  choices?: { label: string; action: string; url?: string }[];
}


/**
 * Emit a game event on `window` with an optional detail payload.
 */
export function emitGameEvent(event: string, detail?: unknown): void {
  window.dispatchEvent(new CustomEvent(event, { detail }));
}

/**
 * Listen for a game event on `window`.
 * Returns an unsubscribe function for cleanup.
 */
export function onGameEvent(
  event: string,
  handler: (detail: unknown) => void,
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(event, listener);
  return () => window.removeEventListener(event, listener);
}
