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
  autoGive?: {
    itemId: string;
    asideX?: number;
    asideY?: number;
    clearedDialog?: string[];
    asideSteps?: { dir: "up" | "down" | "left" | "right"; steps: number }[];
  } | null;
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

/** Catalog item definition from ITEM_DEFINITIONS */
export interface CatalogItem {
  id: string;
  name: string;
  pocket: string;
  description: string;
  url: string;
  icon: string;
}

/** Step milestone (TM shop entry) */
export interface CatalogMilestone {
  steps: number;
  itemId: string;
  tm: string;
  description: string;
}

/** Pokedex entry */
export interface CatalogPokedex {
  number: number;
  name: string;
  level: number;
  types: [string, string];
  status: string;
  pokemon: string;
  description: string;
  url: string;
}

/** Party member */
export interface CatalogPartyMember {
  id: string;
  nickname: string;
  species: string;
  level: number;
  hp: number;
  maxHp: number;
  projectName: string;
  url: string;
  description: string;
  dexNo: number;
  moves: { name: string; type: string; pp: number; maxPp: number; description: string }[];
}

/** Badge definition */
export interface CatalogBadge {
  id: string;
  name: string;
  hint: string;
  auto: boolean;
  hasCondition: boolean;
}

/** Field move award */
export interface CatalogFieldMove {
  badgeId: string;
  pokemonId: string;
  moveName: string;
  learnMessage: string;
}

/** Research log entry */
export interface CatalogLogEntry {
  number: number;
  title: string;
  threshold: number;
  text: string[];
}

/** Tint preset — named color adjustment */
export interface CatalogTintPreset {
  id: string;
  label: string;
  adjust: { h: number; s: number; l: number; a: number };
}

/**
 * One cell's snapshot inside a paste undo action. Captures everything the
 * paste path touches so ⌘Z can fully restore OR re-apply the operation.
 * `decor` is null when no top-sprite existed; `blocked` travels so a
 * pasted "make-this-walkable" state round-trips through undo/redo.
 */
export interface PasteCell {
  x: number;
  y: number;
  gid: number;
  decor: { textureKey: string; frameKey: string; depth: number; rotation?: number; flipX?: boolean; flipY?: boolean } | null;
  blocked: boolean;
}

/** Per-tile tint entry — either references a preset or inlines the adjust. */
export interface TileTintEntry {
  presetId?: string;
  h?: number;
  s?: number;
  l?: number;
  a?: number;
  /** Rotation 0/90/180/270 degrees. Top sprites only. */
  rot?: number;
  flipX?: boolean;
  flipY?: boolean;
}

/** Named NPC movement pattern — edited via the Movement tab */
export interface CatalogMovementPattern {
  id: string;
  label: string;
  lookEnabled: boolean;
  lookDirections: { up: number; down: number; left: number; right: number };
  lookFrequencyMs: [number, number];
  walkEnabled: boolean;
  walkDirections: { up: number; down: number; left: number; right: number };
  walkStepsPerMove: [number, number];
  walkFrequencyMs: [number, number];
  walkSpeed: number;
  maxRangeX: number;
  maxRangeY: number;
  paceMode: boolean;
}

/** All catalog data loaded from editor-data.json */
export interface CatalogData {
  itemDefinitions: CatalogItem[];
  stepMilestones: CatalogMilestone[];
  pokedex: CatalogPokedex[];
  party: CatalogPartyMember[];
  badges: CatalogBadge[];
  fieldMoveAwards: CatalogFieldMove[];
  researchLog: CatalogLogEntry[];
  movementPatterns: CatalogMovementPattern[];
  tintPresets: CatalogTintPreset[];
}

export type EditorLayer = "ground" | "collision" | "foreground" | "entities" | "heatmap" | "zones" | "movement" | "grid";
export type EditorTool = "select" | "move" | "stamp" | "eraser" | "eyedropper" | "tint";

export interface UndoEntry {
  action: EditorAction;
  inverse: EditorAction;
  /**
   * Consecutive entries with the same `coalesceKey` inside the same
   * `coalesceMs` window merge into one — so a ⇧+drag-rect that adds
   * 50 tiles one event at a time collapses to a single undo step, and
   * a burst of keystrokes in a dialog field collapses to one edit.
   * Undefined = never coalesce.
   */
  coalesceKey?: string;
  /** Wall-clock timestamp of the push; used by the coalesce window. */
  timestamp?: number;
  /**
   * Per-entry override for the coalesce window. Typing wants 800ms
   * (humans pause); drag-rect wants 400ms (fast pixel fire).
   */
  coalesceMs?: number;
}

export interface EditorState {
  entities: EditorEntity[];
  selectedEntityId: string | null;
  /** Multi-select: additional selected entity IDs (Shift+click) */
  selectedEntityIds: string[];
  layers: Record<EditorLayer, boolean>;
  tool: EditorTool;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  dirty: boolean;
  loading: boolean;
  error: string | null;
  /** Catalog data for the Data Manager panel */
  catalog: CatalogData | null;
  /** Available sprites scanned from the filesystem */
  availableSprites: { npcs: string[]; pokemonOverworld: string[]; itemIcons: string[] } | null;
  /** Per-tile tints keyed by "{map}:{layer}:{x},{y}" */
  tileTints: Record<string, TileTintEntry>;
}

export type EditorAction =
  | { type: "LOAD_DATA"; entities: EditorEntity[] }
  | { type: "LOAD_CATALOG"; catalog: CatalogData }
  | { type: "LOAD_SPRITES"; sprites: { npcs: string[]; pokemonOverworld: string[]; itemIcons: string[] } }
  | { type: "UPDATE_CATALOG"; dataType: keyof CatalogData; index: number; field: string; value: any }
  | { type: "ADD_CATALOG_ENTRY"; dataType: keyof CatalogData; entry: any }
  | { type: "DELETE_CATALOG_ENTRY"; dataType: keyof CatalogData; index: number }
  | { type: "SELECT_ENTITY"; id: string }
  | { type: "TOGGLE_SELECT"; id: string }
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
  | { type: "SET_ERROR"; error: string | null }
  | { type: "LOAD_TILE_TINTS"; tints: Record<string, TileTintEntry> }
  | { type: "SET_TILE_TINT"; key: string; entry: TileTintEntry | null }
  // Tile-level edits — pushed to the undo stack so ⌘Z can reverse a
  // ⌘+click paint or ⌥+click erase, matching entity-edit behavior. The
  // reducer doesn't own the tile data (Phaser does), it just bookkeeps
  // the inverse; execution is replayed via the editor:paint-tile event.
  | { type: "PAINT_TILE"; x: number; y: number; newGid: number; oldGid: number }
  // Batched stroke — every tile touched during a single ⌘+drag (or ⌥+drag
  // erase, or fill bucket) collapses into ONE undo entry so ⌘Z reverts
  // the entire stroke at once instead of tile-by-tile.
  | { type: "PAINT_TILE_BATCH"; changes: Array<{ x: number; y: number; newGid: number; oldGid: number }> }
  // ⌘V paste — captures the full region state before + after so a single
  // ⌘Z can restore ground GIDs, decor sprites, and collision flags in
  // one shot. Tints already travel via SET_TILE_TINT (separately undoable).
  | { type: "PASTE_SNAPSHOT"; before: PasteCell[]; after: PasteCell[] }
  // Collision flag flip — previously mutated `collisionLayerData` silently;
  // now every C key / sidebar checkbox / context-menu toggle pushes one
  // entry so ⌘Z reverses it.
  | { type: "TOGGLE_COLLISION"; x: number; y: number; blocked: boolean; oldBlocked: boolean }
  // Tile selection replaced with a new set. Consecutive SET_SELECTION
  // entries coalesce so a ⇧+drag that adds 50 cells = 1 undo step.
  | { type: "SET_SELECTION"; tiles: Array<{ x: number; y: number }>; oldTiles: Array<{ x: number; y: number }> };
