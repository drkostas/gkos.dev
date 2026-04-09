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
  SHOW_ENCOUNTER: "game:show-encounter",
  ENCOUNTER_CHOICE: "game:encounter-choice",
  SHOW_MENU: "game:show-menu",
  MENU_CLOSE: "game:menu-close",
} as const;

export interface DialogPayload {
  lines: string[];
  speakerName?: string;
  choices?: { label: string; action: string; url?: string }[];
}

export interface EncounterPayload {
  type: "wild" | "trainer";
  name: string;
  description: string;
  category: string;
  level: number;
  links: { label: string; url: string }[];
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
