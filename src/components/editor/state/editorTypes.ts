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

/** Per-tile tint entry — either references a preset or inlines the adjust. */
export interface TileTintEntry {
  presetId?: string;
  h?: number;
  s?: number;
  l?: number;
  a?: number;
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
  | { type: "SET_TILE_TINT"; key: string; entry: TileTintEntry | null };
