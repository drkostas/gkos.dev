/**
 * Command bus — single source of truth for describing + replaying every
 * undoable action. Before this, three sites (StatusBar breadcrumb,
 * Toolbar chip tooltips, handleUndo/Redo) each had their own switch on
 * action.type. Each time we added a new undoable (PAINT_TILE_BATCH,
 * PASTE_SNAPSHOT, …) we had to edit all three — and one always got
 * missed, causing "⌘Z did nothing" bugs.
 *
 * Now every action type has ONE entry here: a describe function for
 * the UI and a replay function for the scene. The reducer still owns
 * state bookkeeping (stack push/pop + inverse storage); this module
 * owns the side-effects that keep Phaser in sync on undo/redo.
 */

import type { EditorAction } from "./editorTypes";

export type ReplayDirection = "forward" | "inverse";

/** One-line human summary used by the status bar breadcrumb + tooltips. */
export function describeAction(a: EditorAction | null | undefined): string {
  if (!a) return "";
  switch (a.type) {
    case "MOVE_ENTITY":
      return `move ${a.id} → (${a.x}, ${a.y})`;
    case "UPDATE_FIELD":
      return `${a.id}.${a.field} = ${JSON.stringify(a.value)?.slice(0, 30)}`;
    case "ADD_ENTITY":
      return `add ${a.entity?.id}`;
    case "DELETE_ENTITY":
      return `delete ${a.id}`;
    case "SET_TILE_TINT":
      return `tint ${a.key}`;
    case "PAINT_TILE":
      return `paint (${a.x}, ${a.y}) → GID ${a.newGid}`;
    case "PAINT_TILE_BATCH":
      return `paint stroke · ${a.changes.length} tiles`;
    case "PASTE_SNAPSHOT":
      return `paste · ${a.after.length} tiles`;
    case "TOGGLE_COLLISION":
      return `collision (${a.x}, ${a.y}) → ${a.blocked ? "blocked" : "walkable"}`;
    case "SET_SELECTION": {
      const n = a.tiles.length;
      if (n === 0) return "clear selection";
      if (n === 1) return `select (${a.tiles[0].x}, ${a.tiles[0].y})`;
      return `select ${n} tiles`;
    }
    default:
      // Falls back to the type — still useful in the breadcrumb while
      // we grow the catalog of known actions.
      return (a as { type: string }).type;
  }
}

/**
 * Replay a side-effect for an action in either direction. Called by
 * handleUndo/Redo/peekAndDispatch BEFORE dispatching the reducer UNDO/
 * REDO — the reducer handles state bookkeeping, this handles Phaser.
 *
 * Actions whose effect lives entirely in React state (MOVE_ENTITY,
 * UPDATE_FIELD, ADD_ENTITY, DELETE_ENTITY, SET_TILE_TINT) have no
 * scene-side work — the reducer's inverse dispatch already restores
 * the React state, which flows back to the scene via existing
 * useEffect listeners. Returning `null` here means "nothing extra".
 *
 * Actions that mutate Phaser state directly (PAINT_TILE, PAINT_TILE_
 * BATCH, PASTE_SNAPSHOT) emit scene events to restore the canvas.
 */
export function replayAction(
  a: EditorAction | null | undefined,
  direction: ReplayDirection,
  emit: (event: string, detail: unknown) => void,
): void {
  if (!a) return;
  switch (a.type) {
    case "PAINT_TILE": {
      const gid = direction === "forward" ? a.newGid : a.oldGid;
      emit("editor:apply-paint", { x: a.x, y: a.y, gid });
      return;
    }
    case "PAINT_TILE_BATCH": {
      emit("editor:apply-paint-batch", {
        changes: a.changes.map((c) => ({
          x: c.x,
          y: c.y,
          gid: direction === "forward" ? c.newGid : c.oldGid,
        })),
      });
      return;
    }
    case "PASTE_SNAPSHOT": {
      emit("editor:apply-paste-snapshot", {
        cells: direction === "forward" ? a.after : a.before,
      });
      return;
    }
    case "TOGGLE_COLLISION": {
      // Scene owns collisionLayerData — push the target state directly
      // and bypass the editor:toggle-collision path (which would record
      // another undoable entry and create an infinite loop).
      emit("editor:set-collision", {
        x: a.x, y: a.y,
        blocked: direction === "forward" ? a.blocked : a.oldBlocked,
      });
      return;
    }
    case "SET_SELECTION": {
      emit("editor:apply-selection", {
        tiles: direction === "forward" ? a.tiles : a.oldTiles,
      });
      return;
    }
    // React-only actions — no scene replay needed.
    case "MOVE_ENTITY":
    case "UPDATE_FIELD":
    case "ADD_ENTITY":
    case "DELETE_ENTITY":
    case "SET_TILE_TINT":
      return;
    default:
      return;
  }
}

/**
 * Convenience wrapper for the "peek top of stack → replay forward|
 * inverse → dispatch" pattern used by keyboard shortcuts, toolbar
 * chips, and the Edit menu. Centralizing this means the three call
 * sites can't drift apart when a new action type lands.
 */
export function peekReplayAndDispatch(
  kind: "UNDO" | "REDO",
  undoStack: Array<{ action: EditorAction; inverse: EditorAction }>,
  redoStack: Array<{ action: EditorAction; inverse: EditorAction }>,
  dispatch: (a: { type: "UNDO" | "REDO" }) => void,
  emit: (event: string, detail: unknown) => void,
): void {
  const top = kind === "UNDO"
    ? undoStack[undoStack.length - 1]
    : redoStack[redoStack.length - 1];
  if (top) {
    // UNDO replays the *inverse* direction of the stored action; REDO
    // replays the *forward* direction. The reducer then moves the
    // command between stacks.
    const dir: ReplayDirection = kind === "UNDO" ? "inverse" : "forward";
    replayAction(top.action, dir, emit);
  }
  dispatch({ type: kind });
}
