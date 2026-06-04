import type { EditorState, EditorAction, EditorLayer, CatalogData, UndoEntry } from "./editorTypes";

/** Default coalesce window (ms) when an entry doesn't specify one. */
const DEFAULT_COALESCE_MS = 400;

/**
 * Append an entry to the undo stack with two behaviors layered:
 *
 * 1. **Coalescing** — consecutive entries sharing a `coalesceKey` inside
 *    their `coalesceMs` window merge into one. New forward action wins;
 *    older inverse wins (so undoing the merged range restores the
 *    pre-first state). Used for shift-drag selections, drag-paint
 *    strokes (via PAINT_TILE_BATCH), and typing in text fields.
 *
 * 2. **Middle-path selection collapse** — when a CONTENT change lands
 *    right after one or more SET_SELECTION entries, the trailing
 *    selection entries are dropped from the stack. This is the Figma-
 *    style behavior: ⌘Z after painting always undoes the paint, never
 *    the "I clicked a tile first" that preceded it. Pure selection
 *    gestures (no content change after) still stay in the stack.
 */
function pushUndo(stack: UndoEntry[], entry: UndoEntry): UndoEntry[] {
  let working = stack;

  // Middle-path: if this is a content change landing after a run of
  // selection changes, drop them first. Users rarely want to undo past
  // "I clicked that tile" — they want to undo the content change.
  if (entry.action.type !== "SET_SELECTION") {
    while (working.length > 0 && working[working.length - 1].action.type === "SET_SELECTION") {
      working = working.slice(0, -1);
    }
  }

  const last = working[working.length - 1];
  if (
    last &&
    entry.coalesceKey &&
    last.coalesceKey === entry.coalesceKey &&
    entry.timestamp !== undefined &&
    last.timestamp !== undefined &&
    entry.timestamp - last.timestamp < (entry.coalesceMs ?? last.coalesceMs ?? DEFAULT_COALESCE_MS)
  ) {
    const merged: UndoEntry = {
      action: entry.action,
      inverse: last.inverse,
      coalesceKey: entry.coalesceKey,
      timestamp: entry.timestamp,
      coalesceMs: entry.coalesceMs,
    };
    return [...working.slice(0, -1), merged];
  }
  return [...working, entry];
}

const DEFAULT_LAYERS: Record<EditorLayer, boolean> = {
  ground: true, collision: false, foreground: true,
  entities: true, heatmap: false, zones: true, movement: false, grid: false,
};

export const initialState: EditorState = {
  entities: [],
  selectedEntityId: null,
  selectedEntityIds: [],
  layers: DEFAULT_LAYERS,
  tool: "select",
  undoStack: [],
  redoStack: [],
  dirty: false,
  loading: true,
  error: null,
  catalog: null,
  availableSprites: null,
  tileTints: {},
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "LOAD_DATA":
      return { ...state, entities: action.entities, loading: false };

    case "LOAD_CATALOG":
      return { ...state, catalog: action.catalog };

    case "LOAD_SPRITES":
      return { ...state, availableSprites: action.sprites };

    case "UPDATE_CATALOG": {
      if (!state.catalog) return state;
      const arr = [...(state.catalog[action.dataType] as any[])];
      arr[action.index] = { ...arr[action.index], [action.field]: action.value };
      return { ...state, catalog: { ...state.catalog, [action.dataType]: arr }, dirty: true };
    }

    case "ADD_CATALOG_ENTRY": {
      if (!state.catalog) return state;
      const arr = [...(state.catalog[action.dataType] as any[]), action.entry];
      return { ...state, catalog: { ...state.catalog, [action.dataType]: arr }, dirty: true };
    }

    case "DELETE_CATALOG_ENTRY": {
      if (!state.catalog) return state;
      const arr = (state.catalog[action.dataType] as any[]).filter((_, i) => i !== action.index);
      return { ...state, catalog: { ...state.catalog, [action.dataType]: arr }, dirty: true };
    }

    case "SELECT_ENTITY":
      return { ...state, selectedEntityId: action.id, selectedEntityIds: [action.id] };

    case "TOGGLE_SELECT": {
      const ids = state.selectedEntityIds.includes(action.id)
        ? state.selectedEntityIds.filter((id) => id !== action.id)
        : [...state.selectedEntityIds, action.id];
      return { ...state, selectedEntityId: ids[ids.length - 1] || null, selectedEntityIds: ids };
    }

    case "DESELECT":
      return { ...state, selectedEntityId: null, selectedEntityIds: [] };

    case "MOVE_ENTITY": {
      const entities = state.entities.map((e) =>
        e.id === action.id ? { ...e, x: action.x, y: action.y } : e,
      );
      const inverse = {
        type: "MOVE_ENTITY" as const,
        id: action.id,
        x: action.oldX, y: action.oldY,
        oldX: action.x, oldY: action.y,
      };
      return {
        ...state,
        entities,
        dirty: true,
        undoStack: pushUndo(state.undoStack, { action, inverse, timestamp: Date.now() }),
        redoStack: [],
      };
    }

    case "UPDATE_FIELD": {
      const entities = state.entities.map((e) =>
        e.id === action.id ? { ...e, [action.field]: action.value } : e,
      );
      // Typing in a dialog field fires UPDATE_FIELD per keystroke. The
      // coalesce key + 800ms window collapse a burst of edits on the
      // same field into ONE undo entry so ⌘Z reverts the whole edit
      // instead of one character at a time. Pause > 800ms = new entry.
      const inverse = {
        type: "UPDATE_FIELD" as const,
        id: action.id, field: action.field,
        value: action.oldValue, oldValue: action.value,
      };
      return {
        ...state,
        entities,
        dirty: true,
        undoStack: pushUndo(state.undoStack, {
          action, inverse,
          coalesceKey: `field:${action.id}:${action.field}`,
          coalesceMs: 800,
          timestamp: Date.now(),
        }),
        redoStack: [],
      };
    }

    case "ADD_ENTITY":
      return {
        ...state,
        entities: [...state.entities, action.entity],
        selectedEntityId: action.entity.id,
        dirty: true,
        undoStack: pushUndo(state.undoStack, {
          action,
          inverse: { type: "DELETE_ENTITY", id: action.entity.id, entity: action.entity },
          timestamp: Date.now(),
        }),
        redoStack: [],
      };

    case "DELETE_ENTITY": {
      const entities = state.entities.filter((e) => e.id !== action.id);
      return {
        ...state,
        entities,
        selectedEntityId: state.selectedEntityId === action.id ? null : state.selectedEntityId,
        dirty: true,
        undoStack: pushUndo(state.undoStack, {
          action,
          inverse: { type: "ADD_ENTITY", entity: action.entity },
          timestamp: Date.now(),
        }),
        redoStack: [],
      };
    }

    case "TOGGLE_LAYER":
      return {
        ...state,
        layers: { ...state.layers, [action.layer]: !state.layers[action.layer] },
      };

    case "SET_TOOL":
      return { ...state, tool: action.tool };

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const last = state.undoStack[state.undoStack.length - 1];
      const newState = editorReducer(
        { ...state, undoStack: state.undoStack.slice(0, -1) },
        last.inverse,
      );
      // Move to redo stack (without double-pushing to undo)
      return {
        ...newState,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, last],
        dirty: true,
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const last = state.redoStack[state.redoStack.length - 1];
      const newState = editorReducer(
        { ...state, redoStack: state.redoStack.slice(0, -1) },
        last.action,
      );
      return {
        ...newState,
        redoStack: state.redoStack.slice(0, -1),
        dirty: true,
      };
    }

    case "MARK_CLEAN":
      return { ...state, dirty: false, undoStack: [], redoStack: [] };

    case "LOAD_TILE_TINTS":
      return { ...state, tileTints: action.tints };

    case "SET_TILE_TINT": {
      const next = { ...state.tileTints };
      if (action.entry === null) delete next[action.key];
      else next[action.key] = action.entry;
      return { ...state, tileTints: next, dirty: true };
    }

    case "PAINT_TILE": {
      const inverse = {
        type: "PAINT_TILE" as const,
        x: action.x, y: action.y,
        newGid: action.oldGid, oldGid: action.newGid,
      };
      return {
        ...state,
        dirty: true,
        undoStack: pushUndo(state.undoStack, { action, inverse, timestamp: Date.now() }),
        redoStack: [],
      };
    }

    case "PAINT_TILE_BATCH": {
      if (action.changes.length === 0) return state;
      const inverse = {
        type: "PAINT_TILE_BATCH" as const,
        changes: action.changes.map((c) => ({ x: c.x, y: c.y, newGid: c.oldGid, oldGid: c.newGid })),
      };
      return {
        ...state,
        dirty: true,
        undoStack: pushUndo(state.undoStack, { action, inverse, timestamp: Date.now() }),
        redoStack: [],
      };
    }

    case "PASTE_SNAPSHOT": {
      if (action.before.length === 0) return state;
      const inverse = {
        type: "PASTE_SNAPSHOT" as const,
        before: action.after,
        after: action.before,
      };
      return {
        ...state,
        dirty: true,
        undoStack: pushUndo(state.undoStack, { action, inverse, timestamp: Date.now() }),
        redoStack: [],
      };
    }

    case "TOGGLE_COLLISION": {
      if (action.blocked === action.oldBlocked) return state;
      const inverse = {
        type: "TOGGLE_COLLISION" as const,
        x: action.x, y: action.y,
        blocked: action.oldBlocked, oldBlocked: action.blocked,
      };
      return {
        ...state,
        dirty: true,
        undoStack: pushUndo(state.undoStack, { action, inverse, timestamp: Date.now() }),
        redoStack: [],
      };
    }

    case "SET_SELECTION": {
      // Tile selection commits (double-click, ⇧+click, ⇧+drag, ⇧+Arrow,
      // Esc-clear) push here. Coalesces within 400 ms so a drag-rect
      // that fires 50 add-events = 1 undo entry.
      const sameAsOld =
        action.tiles.length === action.oldTiles.length &&
        action.tiles.every((t, i) => t.x === action.oldTiles[i]?.x && t.y === action.oldTiles[i]?.y);
      if (sameAsOld) return state;
      const inverse = {
        type: "SET_SELECTION" as const,
        tiles: action.oldTiles,
        oldTiles: action.tiles,
      };
      return {
        ...state,
        undoStack: pushUndo(state.undoStack, {
          action, inverse,
          coalesceKey: "selection",
          timestamp: Date.now(),
        }),
        redoStack: [],
      };
    }

    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };

    default:
      return state;
  }
}
