/** All entity types flattened with a type discriminator */
export interface EditorEntity {
  type: "npc" | "pokemon-npc" | "pickup" | "wild-pokemon" | "sign" | "hidden-item" | "warp" | "gate";
  id: string;
  x: number;
  y: number;
  // NPC fields
  spriteKey?: string;
  facingDirection?: string;
  movementBehavior?: string;
  movementRangeX?: number;
  movementRangeY?: number;
  dialog?: string[];
  speakerName?: string;
  animated?: boolean;
  tileWidth?: number;
  tileHeight?: number;
  autoGive?: { itemId: string; asideX?: number; asideY?: number } | null;
  pickup?: { itemId: string } | null;
  pokemon?: { pokedexNumber: number; speciesName: string; projectName: string } | null;
  hasDialogFn?: boolean;
  hasSpawnCondition?: boolean;
  // Sign fields
  text?: string[];
  // Hidden item fields
  map?: string;
  itemId?: string;
  difficulty?: string;
  placement?: string;
  // Warp fields
  targetMap?: string;
  spawnX?: number;
  spawnY?: number;
  spawnFacing?: string;
  // Gate fields
  gateType?: string;
  requiredMove?: string;
  npcId?: string;
  // Source tracking
  sourceFile?: string;
  sourceOffset?: boolean;
  // Wild pokemon
  pokedexNumber?: number;
}

export type EditorLayer = "ground" | "collision" | "foreground" | "entities" | "heatmap" | "zones" | "movement" | "grid";
export type EditorTool = "select" | "move" | "stamp" | "eraser" | "eyedropper";

export interface UndoEntry {
  action: EditorAction;
  inverse: EditorAction;
}

export interface EditorState {
  entities: EditorEntity[];
  selectedEntityId: string | null;
  layers: Record<EditorLayer, boolean>;
  tool: EditorTool;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  dirty: boolean;
  loading: boolean;
  error: string | null;
}

export type EditorAction =
  | { type: "LOAD_DATA"; entities: EditorEntity[] }
  | { type: "SELECT_ENTITY"; id: string }
  | { type: "DESELECT" }
  | { type: "MOVE_ENTITY"; id: string; x: number; y: number; oldX: number; oldY: number }
  | { type: "UPDATE_FIELD"; id: string; field: string; value: any; oldValue: any }
  | { type: "ADD_ENTITY"; entity: EditorEntity }
  | { type: "DELETE_ENTITY"; id: string; entity: EditorEntity }
  | { type: "TOGGLE_LAYER"; layer: EditorLayer }
  | { type: "SET_TOOL"; tool: EditorTool }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "MARK_CLEAN" }
  | { type: "SET_ERROR"; error: string | null };
