/**
 * DialogSystem — Phaser-side dialog manager.
 *
 * Emits SHOW_DIALOG to trigger the React DialogBox overlay,
 * then waits for DIALOG_COMPLETE before resolving the promise.
 * This lets callers `await dialogSystem.showDialog(...)` and
 * block game logic (e.g. NPC movement) until the player finishes reading.
 */

import {
  GameEvents,
  emitGameEvent,
  onGameEvent,
  type DialogPayload,
} from "@/game/EventBridge";

export class DialogSystem {
  private isActive = false;
  private resolveDialog: (() => void) | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.unsubscribe = onGameEvent(GameEvents.DIALOG_COMPLETE, () => {
      this.isActive = false;
      if (this.resolveDialog) {
        this.resolveDialog();
        this.resolveDialog = null;
      }
    });
  }

  /** Whether a dialog is currently being shown. */
  get active(): boolean {
    return this.isActive;
  }

  /**
   * Show a dialog and wait for the player to dismiss it.
   * Resolves once the React overlay fires DIALOG_COMPLETE.
   */
  showDialog(payload: DialogPayload): Promise<void> {
    this.isActive = true;
    emitGameEvent(GameEvents.SHOW_DIALOG, payload);
    return new Promise<void>((resolve) => {
      this.resolveDialog = resolve;
    });
  }

  /** Clean up the event listener (call on scene shutdown). */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
