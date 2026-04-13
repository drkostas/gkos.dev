/**
 * EditorEvents — typed event constants for Phaser <-> React communication.
 * Uses DOM CustomEvents on `window`, same pattern as EventBridge.ts.
 */

// Phaser -> React
export const ENTITY_CLICKED = "editor:entity-clicked";
export const ENTITY_HOVERED = "editor:entity-hovered";
export const TILE_CLICKED = "editor:tile-clicked";
export const MOUSE_MOVE = "editor:mouse-move";
export const DRAG_START = "editor:drag-start";
export const DRAG_MOVE = "editor:drag-move";
export const DRAG_END = "editor:drag-end";
export const VIEWPORT_READY = "editor:viewport-ready";

// React -> Phaser
export const SELECT_ENTITY = "editor:select-entity";
export const DESELECT = "editor:deselect";
export const TOGGLE_LAYER = "editor:toggle-layer";
export const UPDATE_ENTITY_POSITION = "editor:update-pos";
export const ADD_ENTITY_MARKER = "editor:add-marker";
export const REMOVE_ENTITY_MARKER = "editor:remove-marker";
export const JUMP_TO_TILE = "editor:jump-to";
export const SET_TOOL = "editor:set-tool";
export const REFRESH_ENTITIES = "editor:refresh-entities";
export const SHOW_HEATMAP = "editor:show-heatmap";
export const HIDE_HEATMAP = "editor:hide-heatmap";
export const SWITCH_MAP = "editor:switch-map";
export const TILE_PAINT = "editor:tile-paint";
export const TILE_EYEDROP = "editor:tile-eyedrop";

/** Emit an editor event on window */
export function emitEditorEvent(event: string, detail?: unknown): void {
  window.dispatchEvent(new CustomEvent(event, { detail }));
}

/** Listen for an editor event. Returns unsubscribe function. */
export function onEditorEvent(
  event: string,
  handler: (detail: any) => void,
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(event, listener);
  return () => window.removeEventListener(event, listener);
}
