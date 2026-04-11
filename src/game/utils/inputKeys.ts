/**
 * Centralized key matching for game UI.
 *
 * Every React overlay (StartMenu, BagMenu, DialogBox, …) listens for
 * the same logical buttons: A / B / arrows / Start. These helpers
 * map raw `KeyboardEvent.key` strings to those logical buttons so
 * each component doesn't re-implement its own chained `e.key === …`
 * checks.
 *
 * A button (confirm)  : a, A, Space, Enter
 * B button (cancel)   : s, S, Backspace
 * Start button (menu) : Escape, m, M
 * D-pad (arrows)      : ArrowUp / Down / Left / Right
 */

const CONFIRM_KEYS = new Set(["a", "A", " ", "Enter"]);
const CANCEL_KEYS = new Set(["s", "S", "Backspace"]);
const MENU_KEYS = new Set(["Escape", "m", "M"]);

export const isConfirmKey = (k: string): boolean => CONFIRM_KEYS.has(k);
export const isCancelKey = (k: string): boolean => CANCEL_KEYS.has(k);
export const isMenuKey = (k: string): boolean => MENU_KEYS.has(k);
export const isUpKey = (k: string): boolean => k === "ArrowUp";
export const isDownKey = (k: string): boolean => k === "ArrowDown";
export const isLeftKey = (k: string): boolean => k === "ArrowLeft";
export const isRightKey = (k: string): boolean => k === "ArrowRight";
