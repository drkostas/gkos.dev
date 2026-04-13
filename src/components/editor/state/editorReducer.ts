import type { EditorState, EditorAction, EditorLayer } from "./editorTypes";

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
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "LOAD_DATA":
      return { ...state, entities: action.entities, loading: false };

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
      return {
        ...state,
        entities,
        dirty: true,
        undoStack: [
          ...state.undoStack,
          {
            action,
            inverse: { type: "MOVE_ENTITY", id: action.id, x: action.oldX, y: action.oldY, oldX: action.x, oldY: action.y },
          },
        ],
        redoStack: [],
      };
    }

    case "UPDATE_FIELD": {
      const entities = state.entities.map((e) =>
        e.id === action.id ? { ...e, [action.field]: action.value } : e,
      );
      return {
        ...state,
        entities,
        dirty: true,
        undoStack: [
          ...state.undoStack,
          {
            action,
            inverse: { type: "UPDATE_FIELD", id: action.id, field: action.field, value: action.oldValue, oldValue: action.value },
          },
        ],
        redoStack: [],
      };
    }

    case "ADD_ENTITY":
      return {
        ...state,
        entities: [...state.entities, action.entity],
        selectedEntityId: action.entity.id,
        dirty: true,
        undoStack: [
          ...state.undoStack,
          { action, inverse: { type: "DELETE_ENTITY", id: action.entity.id, entity: action.entity } },
        ],
        redoStack: [],
      };

    case "DELETE_ENTITY": {
      const entities = state.entities.filter((e) => e.id !== action.id);
      return {
        ...state,
        entities,
        selectedEntityId: state.selectedEntityId === action.id ? null : state.selectedEntityId,
        dirty: true,
        undoStack: [
          ...state.undoStack,
          { action, inverse: { type: "ADD_ENTITY", entity: action.entity } },
        ],
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
      return { ...state, dirty: false };

    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };

    default:
      return state;
  }
}
