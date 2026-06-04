import Phaser from "phaser";
import {
  emitEditorEvent,
  onEditorEvent,
  ENTITY_CLICKED,
  ENTITY_HOVERED,
  TILE_CLICKED,
  MOUSE_MOVE,
  DRAG_START,
  DRAG_MOVE,
  DRAG_END,
  VIEWPORT_READY,
  SELECT_ENTITY,
  DESELECT,
  TOGGLE_LAYER,
  UPDATE_ENTITY_POSITION,
  UPDATE_ENTITY_FIELD,
  ADD_ENTITY_MARKER,
  REMOVE_ENTITY_MARKER,
  JUMP_TO_TILE,
  REFRESH_ENTITIES,
  SWITCH_MAP,
  SET_TOOL,
} from "../editor/EditorEvents";
import { applyAdjustToFX, type TintAdjust } from "../data/tintPresets";

const TILE_SIZE = 16;
let MAP_WIDTH = 140;
let MAP_HEIGHT = 120;

interface MapConfig {
  key: string;
  mapJson: string;
  tilesetName: string;
  tilesetImage: string;
  tilesetTop?: string;
  foreground?: string;
  width: number;
  height: number;
}

const MAP_CONFIGS: Record<string, MapConfig> = {
  // Editor uses two split variants of the Mauville bottom tileset:
  //   _grass.png = only the teal grass-bg pixels (base layer — what gets tinted by "ground" layer)
  //   _decor.png = only the decor pixels (trees/fences/rocks/flowers) — rendered as per-tile sprites
  //                on top of the grass, tintable via "top" layer
  // Foreground PNG has mixed-tile grass stripped by scripts/split-foreground-layers.mjs.
  mauville: { key: "mauville-map", mapJson: "/game/maps/mauville.json", tilesetName: "mauville_bottom", tilesetImage: "/game/tilesets/mauville_bottom_grass.png", foreground: "/game/maps/mauville_foreground_decor.png", width: 140, height: 120 },
  pokecenter: { key: "pokecenter-map", mapJson: "/game/maps/pokecenter.json", tilesetName: "pokecenter_bottom", tilesetImage: "/game/tilesets/pokecenter_bottom.png", tilesetTop: "/game/tilesets/pokecenter_top.png", width: 14, height: 9 },
  mart: { key: "mart-map", mapJson: "/game/maps/mart.json", tilesetName: "mart_bottom", tilesetImage: "/game/tilesets/mart_bottom.png", tilesetTop: "/game/tilesets/mart_top.png", width: 11, height: 8 },
  gym: { key: "gym-map", mapJson: "/game/maps/gym.json", tilesetName: "gym_bottom", tilesetImage: "/game/tilesets/gym_bottom.png", tilesetTop: "/game/tilesets/gym_top.png", width: 10, height: 21 },
};
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 6;
const ZOOM_SPEED = 0.08; // smooth zoom per scroll tick
const DEFAULT_ZOOM = 1.5;

interface EntityMarker {
  id: string;
  type: string;
  x: number;
  y: number;
  spriteKey?: string;
  movementRangeX?: number;
  movementRangeY?: number;
  container: Phaser.GameObjects.Container;
  shape: Phaser.GameObjects.Graphics;
  sprite?: Phaser.GameObjects.Sprite;
  selectionRing?: Phaser.GameObjects.Graphics;
}

/** Captured top-sprite metadata for a block-selection cell. */
interface BlockDecor {
  textureKey: string;
  frameKey: string;
  depth: number;
  /** Captured rotation/flip — paste recreates the visual transform. */
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
}

/**
 * Per-cell metadata captured at copy time. Lets paste reproduce the
 * exact look + behavior of the source tiles — tint adjust, collision
 * flag, and decor transform are all part of "the tile" from the user's
 * perspective.
 */
interface BlockCellMeta {
  tint?: { h?: number; s?: number; l?: number; a?: number; presetId?: string };
  blocked?: boolean;
}

const TYPE_COLORS: Record<string, number> = {
  npc: 0x3b82f6,
  "pokemon-npc": 0x06b6d4,
  pickup: 0xf97316,
  "wild-pokemon": 0x22c55e,
  sign: 0xf59e0b,
  "hidden-item": 0xec4899,
  warp: 0x8b5cf6,
  gate: 0xdc2626,
};

export class EditorScene extends Phaser.Scene {
  private markers: Map<string, EntityMarker> = new Map();
  private selectedId: string | null = null;
  private currentZoom: number = DEFAULT_ZOOM;
  private isPanning: boolean = false;
  private panMoved: boolean = false;
  private panStart: { x: number; y: number } = { x: 0, y: 0 };
  private camStart: { x: number; y: number } = { x: 0, y: 0 };
  /**
   * For tools that fire on click (stamp/eraser/eyedropper/tint), we defer
   * execution to pointerup so left-drag can pan the camera in those modes.
   * If pointer moves > PAN_THRESHOLD pixels before release, the click is
   * cancelled and we pan instead. Threshold needs to be forgiving for
   * real human clicks which have natural micro-movement.
   */
  private pendingClickAction: (() => void) | null = null;
  private static readonly PAN_THRESHOLD = 10;
  private spaceDown: boolean = false;
  private isDragging: boolean = false;
  private dragEntityId: string | null = null;
  private dragGhost: Phaser.GameObjects.Graphics | null = null;
  // dragTimer removed — drag starts instantly on selected entities
  private coordText!: Phaser.GameObjects.Text;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private collisionOverlay: Phaser.GameObjects.Graphics | null = null;
  private movementGraphics: Phaser.GameObjects.Graphics | null = null;
  private gridVisible: boolean = false;
  private collisionVisible: boolean = false;
  private movementVisible: boolean = false;
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private groundLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private collisionLayerData: number[] = [];
  private foregroundImage: Phaser.GameObjects.Image | null = null;
  private topSprites: Phaser.GameObjects.Sprite[] = [];
  /**
   * Overlay sprites used to render tinted ground tiles with per-tile preFX.
   * Phaser tilemap layers share a single FX pipeline across all tiles, so we
   * can't apply a per-tile ColorMatrix to tilemap tiles directly. Instead,
   * when a ground tile is tinted we create an overlay Sprite showing the
   * same tile graphics, apply preFX to the overlay, and hide the underlying
   * tilemap tile (alpha = 0). Keyed by "x,y".
   */
  private groundTintOverlays: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private tintHighlights: Map<string, { gfx: Phaser.GameObjects.Graphics; tween: Phaser.Tweens.Tween }> = new Map();
  private foregroundVisible: boolean = true;
  private hoverTooltip: Phaser.GameObjects.Container | null = null;
  private unsubscribers: (() => void)[] = [];
  private selectedTileGid: number = 0;
  private currentTool: string = "select";
  // Block copy/paste state. `tiles` holds ground-layer GIDs per cell;
  // `decor` holds the texture/frame of any top-sprite (tree / fence /
  // building piece) at that cell, so paste can recreate them. Without
  // the decor capture, pasting into an area that was decor-only in the
  // original tileset shows as transparent/black (the grass-split image
  // has no pixels at that tile position).
  private blockSelection: {
    startX: number; startY: number;
    endX: number; endY: number;
    tiles: number[][];
    decor: (BlockDecor | null)[][];
    meta?: (BlockCellMeta | null)[][];
  } | null = null;
  private blockSelectionGraphics: Phaser.GameObjects.Graphics | null = null;
  private isShiftDragging: boolean = false;
  private shiftDragStart: { x: number; y: number } | null = null;
  /**
   * Drag-paint state. In stamp (with single-GID) or eraser mode, left-drag
   * continuously paints/erases every tile crossed. Without this, long
   * stretches of fence/path require one click per tile.
   */
  private isDragPainting: boolean = false;
  private dragPaintMode: "paint" | "erase" | null = null;
  /** Deduped set of "x,y" keys visited during the current drag-paint. */
  private dragPaintVisited: Set<string> = new Set();
  /**
   * Multi-select queue for stamp/eraser — Shift+click accumulates tiles
   * into this set with a visible outline. Enter commits the tool's action
   * to every queued tile at once. Switching tools or pressing Esc clears.
   */
  private pendingOpMode: "paint" | "erase" | null = null;
  private pendingOpTiles: Map<string, Phaser.GameObjects.Graphics> = new Map();
  /**
   * Cursor-following preview of the copied stamp block. Shown whenever
   * stamp is the active tool and a block exists, so the user sees where
   * it will land before clicking. Re-drawn on every pointer move and
   * after R/F rotations.
   */
  private blockGhost: Phaser.GameObjects.Graphics | null = null;
  private blockGhostTile: { x: number; y: number } = { x: 0, y: 0 };
  /**
   * Cmd/Meta + drag paints the block at every tile the cursor enters, like
   * drag-paint but with the full block. Lets the user stamp a run of
   * trees/fences without click-click-click.
   */
  private isBlockDragPasting: boolean = false;
  private blockDragVisited: Set<string> = new Set();
  /**
   * Most-recently-clicked tile (any modifier). Used by the T key shortcut
   * to open the tint popup without requiring an explicit tool switch.
   */
  private lastClickedTile: { x: number; y: number } | null = null;

  /**
   * Canonical write-path for `lastClickedTile`. Every site that advances
   * the "current tile" cursor funnels through here so the inspector, tint
   * panel, and C-key collision toggle all agree on the same target. Prior
   * to this, four call sites set the field then re-emitted the same event
   * — a fifth caller always forgot one side.
   */
  private setLastClickedTile(x: number, y: number): void {
    this.lastClickedTile = { x, y };
    emitEditorEvent("editor:tile-selected", { x, y });
  }
  /**
   * Double-click tracking. Adobe / Figma convention: single click selects
   * passively, double click drills into the thing (open properties /
   * isolation mode). We track the last click timestamp + tile so a second
   * click on the same tile within 400ms is treated as a double.
   */
  private lastClickAt: number = 0;
  private lastClickTileForDouble: { x: number; y: number } | null = null;
  private lastClickEntityId: string | null = null;
  private static readonly DOUBLE_CLICK_MS = 400;
  /**
   * Hover-preview ghost — when the user hovers over a swatch in the React
   * panel, we paint a translucent thumbnail of that GID at the cursor's
   * tile position so they can see where it would land.
   */
  private hoverPreviewGhost: Phaser.GameObjects.Sprite | null = null;
  private hoverPreviewGid: number = 0;
  /**
   * How a block-paste combines with the destination tile.
   *  - "both": overwrite ground GID AND recreate captured decor (old default)
   *  - "fg-only": keep destination ground untouched, only paint decor sprite
   *  - "bg-only": paint ground GID, skip decor sprite
   * User requested this split because pasting a fence onto a road should
   * leave the road intact — the old "both" default blew away the road
   * under every pasted fence, which was never what they wanted.
   */
  private blockPasteMode: "both" | "fg-only" | "bg-only" = "both";
  /**
   * Buffer of tile paints accumulated during a single drag stroke or fill
   * bucket operation. When non-null, `paintTile()` pushes into it
   * instead of emitting one tile-paint per cell. At drag end (or fill
   * finish) we flush as one batch so ⌘Z undoes the whole stroke in one
   * press instead of tile-by-tile.
   */
  private paintBatch: Array<{ x: number; y: number; oldGid: number; newGid: number }> | null = null;
  /**
   * Id of the entity currently under the cursor — kept in sync with the
   * ENTITY_HOVERED event so `update()` can suppress the tile tooltip
   * emission while the cursor is on an entity (otherwise the entity
   * bubble and tile readout stack confusingly).
   */
  private hoveredEntityId: string | null = null;
  /**
   * Pulsing ring drawn on top of an entity tile when the corresponding
   * row in the left panel list is hovered — so the user can preview
   * *where* an entity lives without clicking it.
   */
  private entityPreviewRing: Phaser.GameObjects.Graphics | null = null;
  private entityPreviewTween: Phaser.Tweens.Tween | null = null;
  /**
   * Subtle outlines painted over every tile that shares the currently-
   * hovered swatch's GID — lets the user see where that tile type
   * already exists on the map before committing to paint anywhere else.
   */
  private swatchMatchHighlights: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: "EditorScene" });
  }

  private currentMapId: string = "mauville";

  preload(): void {
    // Preload all map configs
    for (const [, cfg] of Object.entries(MAP_CONFIGS)) {
      this.load.tilemapTiledJSON(cfg.key, cfg.mapJson);
      this.load.image(cfg.tilesetName, cfg.tilesetImage);
      if (cfg.foreground) this.load.image(cfg.tilesetName + "_fg", cfg.foreground);
      if (cfg.tilesetTop) this.load.image(cfg.tilesetName.replace("_bottom", "_top"), cfg.tilesetTop);
    }
    // Mauville ground decor (trees/fences/rocks/flowers extracted from the bottom
    // tileset). Rendered as per-tile sprites on top of the grass-only tilemap so
    // each decor element is independently tintable.
    this.load.image("mauville_bottom_decor", "/game/tilesets/mauville_bottom_decor.png");

    // NPC spritesheets — load ALL sprites from /game/sprites/emerald/
    // Load every sprite so the user can switch any NPC to any sprite via dropdown.
    const SPECIAL_SIZES: Record<string, { w: number; h: number }> = {
      slakoth: { w: 48, h: 48 },
      slaking: { w: 48, h: 48 },
      item_ball: { w: 16, h: 16 },
      tall_grass: { w: 16, h: 16 },
      little_boy: { w: 16, h: 16 },
      little_girl: { w: 16, h: 16 },
      scott: { w: 48, h: 128 },
      wally: { w: 48, h: 128 },
    };
    // Fetch the full sprite list from editor-data.json and preload all of them.
    // This runs during Phaser's preload phase, which supports async loading.
    this.load.json("editor-data-sprites", "/api/editor/data");
    this.load.once("filecomplete-json-editor-data-sprites", () => {
      const data = this.cache.json.get("editor-data-sprites");
      const spriteList: string[] = data?.availableSprites?.npcs || [];
      for (const key of spriteList) {
        if (this.textures.exists(`npc_${key}`)) continue;
        const special = SPECIAL_SIZES[key];
        if (special) {
          if (special.w <= 16 && special.h <= 16) {
            this.load.image(`npc_${key}`, `/game/sprites/emerald/${key}.png`);
          } else {
            this.load.spritesheet(`npc_${key}`, `/game/sprites/emerald/${key}.png`, {
              frameWidth: special.w, frameHeight: special.h,
            });
          }
        } else {
          this.load.spritesheet(`npc_${key}`, `/game/sprites/emerald/${key}.png`, {
            frameWidth: 16, frameHeight: 32,
          });
        }
      }
    });

    // Pokemon icon sprites (from /game/sprites/pokemon/icons/)
    const pokemonIcons = [
      "absol", "aggron", "altaria", "banette", "blaziken", "breloom",
      "camerupt", "claydol", "delcatty", "flygon", "glalie", "kirlia",
      "kyogre", "lairon", "latias", "manectric", "mawile", "medicham",
      "pelipper", "plusle", "sableye", "salamence", "seviper", "shedinja",
      "solrock", "swellow", "torkoal", "trapinch", "vibrava", "volbeat", "wailord",
    ];
    for (const name of pokemonIcons) {
      this.load.spritesheet(`pkmn_icon_${name}`, `/game/sprites/pokemon/icons/${name}.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
    }
  }

  create(): void {
    // Create tilemap
    this.tilemap = this.make.tilemap({ key: "mauville-map" });
    // Phaser reads margin/spacing from the Tiled JSON automatically
    const tileset = this.tilemap.addTilesetImage("mauville_bottom", "mauville_bottom");
    if (tileset) {
      this.groundLayer = this.tilemap.createLayer("Ground", tileset, 0, 0);
      // Store collision layer data for overlay rendering
      const collLayer = this.tilemap.getLayer("Collision");
      if (collLayer) {
        this.collisionLayerData = collLayer.data.flat().map((t) => t.index);
      }
    }

    // Foreground — render as per-tile sprites (not a flat image) so each
    // tree/fence/rock/flower can be individually tinted by the Tint tool.
    this.createOverworldForegroundTiles();
    // Ground decor — trees/fences/rocks/flowers extracted from the bottom
    // tileset and rendered as per-tile sprites on top of the grass-only layer.
    this.createOverworldGroundDecor();

    // Camera setup
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    cam.setZoom(this.currentZoom);
    cam.centerOn((MAP_WIDTH * TILE_SIZE) / 2, (MAP_HEIGHT * TILE_SIZE) / 2);

    // Coordinate display
    this.coordText = this.add.text(8, 8, "Tile: (0, 0)", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: "#00000099",
      padding: { x: 4, y: 2 },
    });
    this.coordText.setScrollFactor(0);
    this.coordText.setDepth(1000);

    // Input setup
    this.setupInput();

    // Listen for React events
    this.setupEventListeners();

    // When the mouse leaves the canvas, hide the hover badge in React.
    // (Phaser keeps pointer.x/y at the last canvas-clamped position when the
    // pointer is outside, so we have to listen to the DOM mouseleave directly.)
    const canvas = this.game.canvas;
    if (canvas) {
      const onLeave = () => {
        this.lastEmittedTile = "OUT";
        this.coordText.setText("");
        emitEditorEvent("editor:hover-tile", null);
      };
      canvas.addEventListener("mouseleave", onLeave);
      this.events.once("shutdown", () => canvas.removeEventListener("mouseleave", onLeave));
    }

    // Emit ready after create() fully completes (next tick)
    this.time.delayedCall(0, () => {
      emitEditorEvent(VIEWPORT_READY, {});
    });
  }

  private setupInput(): void {
    const cam = this.cameras.main;

    // Space key for pan
    this.input.keyboard?.on("keydown-SPACE", () => {
      this.spaceDown = true;
    });
    this.input.keyboard?.on("keyup-SPACE", () => {
      this.spaceDown = false;
    });

    // Scroll wheel zoom — zoom toward the cursor position so the tile
    // under the cursor stays in place while everything else scales around
    // it. Phaser caches `worldView` / `midPoint` until the next
    // preRender(), so calling getWorldPoint right after setZoom returns
    // stale values and throws off cursor anchoring. Instead we derive the
    // new scroll analytically from Phaser's transform formula:
    //   worldX = scrollX + (screenX - originX*width)/zoom + originX*width
    // Solving for scrollX given the target (pointer.worldX at the same
    // screen coords post-zoom) keeps the tile under the cursor stationary.
    this.input.on("wheel", (pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const factor = deltaY > 0 ? (1 - ZOOM_SPEED) : (1 + ZOOM_SPEED);
      const oldZoom = cam.zoom;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));
      if (newZoom === oldZoom) return;
      const wx = pointer.worldX;
      const wy = pointer.worldY;
      const ox = cam.originX * cam.width;
      const oy = cam.originY * cam.height;
      cam.setZoom(newZoom);
      cam.scrollX = wx - (pointer.x - ox) / newZoom - ox;
      cam.scrollY = wy - (pointer.y - oy) / newZoom - oy;
      this.currentZoom = newZoom;
      this.syncAutoPixelGrid();
    });

    // Pointer down — unified "Edit" dispatch. Every action is driven by
    // modifier keys, not a tool mode switch:
    //   middle / space+left  → pan
    //   Alt+left             → erase (+ drag = continuous erase)
    //   Cmd/Ctrl+left        → paint picked GID (+ drag = paint stroke)
    //                          with block copied: paste block (+ drag = paint-paste)
    //   Shift+left           → defer for shift+click routing / block copy on drag
    //   plain left on entity → select entity (+ drag if already selected = move)
    //   plain left on tile   → pick GID + show info (eyedropper)
    //   plain left on empty  → pan-on-drag
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Middle-click or space+left-click: start panning
      if (pointer.middleButtonDown() || (this.spaceDown && pointer.leftButtonDown())) {
        this.isPanning = true;
        this.panStart = { x: pointer.x, y: pointer.y };
        this.camStart = { x: cam.scrollX, y: cam.scrollY };
        return;
      }

      // Right-click (handled by interaction for context menu)
      if (pointer.rightButtonDown()) return;
      if (!pointer.leftButtonDown()) return;

      const worldX = pointer.worldX;
      const worldY = pointer.worldY;
      const tileX = Math.floor(worldX / TILE_SIZE);
      const tileY = Math.floor(worldY / TILE_SIZE);
      const evt = pointer.event as MouseEvent | PointerEvent | undefined;
      const altDown = !!evt && evt.altKey;
      const cmdDown = !!evt && (evt.metaKey || evt.ctrlKey);
      const shiftDown = !!evt && evt.shiftKey;

      // Cmd+Shift+click: flood-fill the contiguous region of same-GID
      // tiles with the currently-picked GID. Checked before the plain
      // Shift handler so the composite modifier wins.
      if (cmdDown && shiftDown && this.tilemap && this.selectedTileGid > 0) {
        this.floodFillTile(tileX, tileY, this.selectedTileGid);
        return;
      }

      // Shift: defer for block copy vs 1-tile shift-click routing at pointerup
      if (shiftDown && this.tilemap) {
        this.isShiftDragging = true;
        this.shiftDragStart = { x: tileX, y: tileY };
        return;
      }

      // Clamp tile coords to map bounds for the paint/erase paths —
      // putTileAt indexes directly into the layer array and crashes if
      // the coordinate is out of range.
      const inBounds = this.tilemap &&
        tileX >= 0 && tileX < this.tilemap.width &&
        tileY >= 0 && tileY < this.tilemap.height;

      // Alt: erase the starting tile immediately + enter drag-erase.
      // Also destroys any top sprite (tree / fence / building) at that
      // cell — otherwise the ground gets cleared but the decor sprite
      // keeps floating, making the erase look broken.
      if (altDown && this.tilemap && inBounds) {
        this.beginPaintBatch();
        this.eraseTileAndDecor(tileX, tileY);
        this.isDragPainting = true;
        this.dragPaintMode = "erase";
        this.dragPaintVisited.clear();
        this.dragPaintVisited.add(`${tileX},${tileY}`);
        return;
      }

      // Cmd/Ctrl: paint with picked GID, or paste block if one is copied
      if (cmdDown && this.tilemap && inBounds) {
        if (this.blockSelection && this.blockSelection.tiles.length > 0) {
          this.pasteBlockAt(tileX, tileY);
          this.isBlockDragPasting = true;
          this.blockDragVisited.clear();
          this.blockDragVisited.add(`${tileX},${tileY}`);
          return;
        }
        if (this.selectedTileGid > 0) {
          this.beginPaintBatch();
          this.paintTile(tileX, tileY, this.selectedTileGid);
          this.isDragPainting = true;
          this.dragPaintMode = "paint";
          this.dragPaintVisited.clear();
          this.dragPaintVisited.add(`${tileX},${tileY}`);
        } else {
          emitEditorEvent("editor:toast", {
            message: "Nothing to paint — click a tile first to pick a GID, or ⇧+drag to copy a block.",
          });
        }
        return;
      }

      // Helper: start tracking potential pan, with a deferred tool action.
      // The action only fires on pointerup if the pointer didn't move > PAN_THRESHOLD.
      const deferToolClick = (action: () => void) => {
        this.pendingClickAction = action;
        this.panStart = { x: pointer.x, y: pointer.y };
        this.camStart = { x: cam.scrollX, y: cam.scrollY };
        this.panMoved = false;
      };

      // With a stamp block copied, a plain click pastes it — this was the
      // old "stamp tool" behaviour that the unified mode must preserve
      // otherwise shift-drag-to-copy has no obvious way to commit. Also
      // records the clicked tile so `C` collision-toggles the expected
      // tile instead of staying on the previous one.
      if (this.blockSelection && this.blockSelection.tiles.length > 0 && this.tilemap && inBounds) {
        deferToolClick(() => {
          this.pasteBlockAt(tileX, tileY);
          this.setLastClickedTile(tileX, tileY);
        });
        return;
      }

      // Plain click: entity takes priority over tile.
      let hitEntity: EntityMarker | null = null;
      let minDist = Infinity;
      for (const marker of this.markers.values()) {
        const mx = marker.x * TILE_SIZE + TILE_SIZE / 2;
        const my = marker.y * TILE_SIZE + TILE_SIZE / 2;
        const dist = Math.sqrt((worldX - mx) ** 2 + (worldY - my) ** 2);
        if (dist < 12 && dist < minDist) {
          hitEntity = marker;
          minDist = dist;
        }
      }

      // Double-click detection (same target within DOUBLE_CLICK_MS).
      // Routed to tile → open tint popup, entity → open properties panel.
      const now = Date.now();
      const dblElapsed = now - this.lastClickAt;
      const sameTile = this.lastClickTileForDouble
        && this.lastClickTileForDouble.x === tileX
        && this.lastClickTileForDouble.y === tileY;
      const sameEntity = hitEntity && this.lastClickEntityId === hitEntity.id;
      const isDouble = dblElapsed < EditorScene.DOUBLE_CLICK_MS && (sameEntity || (sameTile && !hitEntity));
      this.lastClickAt = now;
      this.lastClickTileForDouble = { x: tileX, y: tileY };
      this.lastClickEntityId = hitEntity ? hitEntity.id : null;

      if (hitEntity) {
        emitEditorEvent(ENTITY_CLICKED, {
          entityId: hitEntity.id,
          entityType: hitEntity.type,
          x: hitEntity.x,
          y: hitEntity.y,
        });
        if (isDouble) {
          // Double-click an entity → select the TILE beneath it instead
          // of the entity. Common case: user wants to edit the grass
          // under an NPC but every click kept grabbing the NPC. The
          // second click promotes the gesture from "entity" to "tile".
          // REPLACES the selection (Finder-style); hold Shift to add.
          if (shiftDown) {
            this.toggleTileInSelection(hitEntity.x, hitEntity.y);
          } else {
            this.setSelection([{ x: hitEntity.x, y: hitEntity.y }]);
          }
          this.setLastClickedTile(hitEntity.x, hitEntity.y);
          return;
        }
        // Enter drag mode immediately on any entity click. Pointermove
        // will show the ghost, pointerup commits the move (or falls back
        // to a plain select if the cursor never left the starting tile).
        // Without this, the user had to click once to select then again
        // to drag — "click+drag doesn't work" in a single gesture.
        this.isDragging = true;
        this.dragEntityId = hitEntity.id;
        const dragMarker = this.markers.get(hitEntity.id);
        if (dragMarker) dragMarker.container.setAlpha(0.3);
        emitEditorEvent(DRAG_START, { entityId: hitEntity.id });
        return;
      }

      // Double-click on a tile → SELECT this tile (Finder-style replace).
      // Without Shift, every dbl-click starts fresh — picking a new tile
      // drops the previous selection. Hold Shift to keep accumulating.
      // Single click is still just an eyedropper-pick (no selection).
      if (isDouble && this.tilemap) {
        if (shiftDown) {
          this.toggleTileInSelection(tileX, tileY);
        } else {
          this.setSelection([{ x: tileX, y: tileY }]);
        }
        this.setLastClickedTile(tileX, tileY);
        return;
      }

      // Plain click on tile (no shift, not a double, no entity hit):
      // CLEAR the tile selection. Single click is reserved for "release
      // any staged tile ops + start exploring/panning". To pick a GID
      // for painting, use the left tileset panel, swatch, or right-
      // click → "Pick GID here". Inspector still refreshes so the user
      // sees what tile they clicked, but no selection is staged.
      if (this.tilemap) {
        deferToolClick(() => {
          this.setSelection([]);
          this.setLastClickedTile(tileX, tileY);
        });
        return;
      }

      // No tilemap: pure pan on drag.
      this.isPanning = true;
      this.panMoved = false;
      this.panStart = { x: pointer.x, y: pointer.y };
      this.camStart = { x: cam.scrollX, y: cam.scrollY };
    });

    // Pointer move
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      // Block selection drag
      if (this.isShiftDragging && this.shiftDragStart) {
        const endX = Math.floor(pointer.worldX / TILE_SIZE);
        const endY = Math.floor(pointer.worldY / TILE_SIZE);
        // Draw selection rectangle
        if (this.blockSelectionGraphics) this.blockSelectionGraphics.destroy();
        this.blockSelectionGraphics = this.add.graphics();
        this.blockSelectionGraphics.setDepth(500);
        const sx = Math.min(this.shiftDragStart.x, endX);
        const sy = Math.min(this.shiftDragStart.y, endY);
        const w = Math.abs(endX - this.shiftDragStart.x) + 1;
        const h = Math.abs(endY - this.shiftDragStart.y) + 1;
        this.blockSelectionGraphics.lineStyle(2, 0x4a9eed, 0.8);
        this.blockSelectionGraphics.strokeRect(sx * TILE_SIZE, sy * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
        this.blockSelectionGraphics.fillStyle(0x4a9eed, 0.1);
        this.blockSelectionGraphics.fillRect(sx * TILE_SIZE, sy * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
        return;
      }

      // Block drag-paste (Cmd+drag with stamp+block): repeats the paste at
      // every new tile the cursor crosses, so the user can run a border
      // by dragging instead of click-click-click-clicking.
      if (this.isBlockDragPasting && this.tilemap && this.blockSelection) {
        const tx = Math.floor(pointer.worldX / TILE_SIZE);
        const ty = Math.floor(pointer.worldY / TILE_SIZE);
        if (tx >= 0 && tx < this.tilemap.width && ty >= 0 && ty < this.tilemap.height) {
          const key = `${tx},${ty}`;
          if (!this.blockDragVisited.has(key)) {
            this.blockDragVisited.add(key);
            this.pasteBlockAt(tx, ty);
            this.updateBlockGhost(tx, ty);
          }
        }
        return;
      }

      // Drag-paint (stamp single-GID or eraser): paint every new tile the
      // pointer crosses, deduped via a visited set so we don't thrash the
      // same tile. Runs before the pan-threshold check below so drag in
      // these tools paints instead of panning.
      if (this.isDragPainting && this.tilemap) {
        const tx = Math.floor(pointer.worldX / TILE_SIZE);
        const ty = Math.floor(pointer.worldY / TILE_SIZE);
        if (tx >= 0 && tx < this.tilemap.width && ty >= 0 && ty < this.tilemap.height) {
          const key = `${tx},${ty}`;
          if (!this.dragPaintVisited.has(key)) {
            this.dragPaintVisited.add(key);
            if (this.dragPaintMode === "paint" && this.selectedTileGid > 0) {
              this.paintTile(tx, ty, this.selectedTileGid);
            } else if (this.dragPaintMode === "erase") {
              this.eraseTileAndDecor(tx, ty);
            }
          }
        }
        return;
      }

      // Update the block ghost while idly hovering (any time a block is
      // copied — unified Edit mode shows paste targets regardless of tool).
      if (this.blockSelection && !this.isPanning && !this.isDragging) {
        const tx = Math.floor(pointer.worldX / TILE_SIZE);
        const ty = Math.floor(pointer.worldY / TILE_SIZE);
        this.updateBlockGhost(tx, ty);
      } else if (this.blockGhost) {
        this.clearBlockGhost();
      }

      // Hover-preview ghost — draws the thumbnail of the swatch the user
      // is currently hovering, at the cursor's tile.
      if (this.hoverPreviewGid > 0 && this.tilemap) {
        const tx = Math.floor(pointer.worldX / TILE_SIZE);
        const ty = Math.floor(pointer.worldY / TILE_SIZE);
        this.updateHoverPreviewGhost(tx, ty);
      } else if (this.hoverPreviewGhost) {
        this.hoverPreviewGhost.destroy();
        this.hoverPreviewGhost = null;
      }

      // Pending click action (stamp/eraser/eyedropper/tint deferred): if
      // the pointer moves beyond PAN_THRESHOLD, cancel the click and start
      // panning instead. This makes left-drag pan in every tool mode.
      if (this.pendingClickAction && !this.isPanning) {
        const dx = pointer.x - this.panStart.x;
        const dy = pointer.y - this.panStart.y;
        if (Math.sqrt(dx * dx + dy * dy) > EditorScene.PAN_THRESHOLD) {
          this.pendingClickAction = null;
          this.isPanning = true;
          this.panMoved = true;
          // panStart and camStart already set in deferToolClick
        }
      }

      // Panning (left-click drag, middle-click drag, or space+drag)
      if (this.isPanning) {
        const dx = this.panStart.x - pointer.x;
        const dy = this.panStart.y - pointer.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.panMoved = true;
        cam.scrollX = this.camStart.x + dx / cam.zoom;
        cam.scrollY = this.camStart.y + dy / cam.zoom;
        return;
      }

      // Dragging entity
      if (this.isDragging && this.dragEntityId) {
        const tileX = Math.floor(pointer.worldX / TILE_SIZE);
        const tileY = Math.floor(pointer.worldY / TILE_SIZE);
        this.updateDragGhost(tileX, tileY);
        emitEditorEvent(DRAG_MOVE, { entityId: this.dragEntityId, tileX, tileY });
      }

      // Hover detection
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;
      let hoveredEntity: EntityMarker | null = null;
      let minDist = Infinity;
      for (const marker of this.markers.values()) {
        const mx = marker.x * TILE_SIZE + TILE_SIZE / 2;
        const my = marker.y * TILE_SIZE + TILE_SIZE / 2;
        const dist = Math.sqrt((worldX - mx) ** 2 + (worldY - my) ** 2);
        if (dist < 14 && dist < minDist) {
          hoveredEntity = marker;
          minDist = dist;
        }
      }

      if (hoveredEntity) {
        this.showTooltip(hoveredEntity, pointer.worldX, pointer.worldY);
        this.hoveredEntityId = hoveredEntity.id;
        emitEditorEvent(ENTITY_HOVERED, {
          entityId: hoveredEntity.id,
          entityType: hoveredEntity.type,
          x: hoveredEntity.x,
          y: hoveredEntity.y,
        });
        // Mute the tile-level readout so it doesn't stack with the entity
        // bubble. Update() will skip re-emitting while hoveredEntityId is set.
        if (this.lastEmittedTile !== "ENTITY") {
          this.lastEmittedTile = "ENTITY";
          emitEditorEvent("editor:hover-tile", null);
        }
      } else {
        this.hideTooltip();
        this.hoveredEntityId = null;
        emitEditorEvent(ENTITY_HOVERED, null);
      }
    });

    // Handle shift-drag end — populates the unified selection.
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.isShiftDragging && this.shiftDragStart && this.tilemap) {
        const endX = Math.floor(p.worldX / TILE_SIZE);
        const endY = Math.floor(p.worldY / TILE_SIZE);
        const sx = Math.min(this.shiftDragStart.x, endX);
        const sy = Math.min(this.shiftDragStart.y, endY);
        const w = Math.abs(endX - this.shiftDragStart.x) + 1;
        const h = Math.abs(endY - this.shiftDragStart.y) + 1;
        this.isShiftDragging = false;
        this.shiftDragStart = null;

        // Single-tile ⇧+click: toggle the tile in the selection.
        if (w === 1 && h === 1) {
          this.toggleTileInSelection(sx, sy);
          this.setLastClickedTile(sx, sy);
          return;
        }

        // Rect ⇧+drag: every tile in the rectangle joins the selection.
        // Does NOT copy/capture anything — the user presses ⌘C when
        // they're ready to copy, ⌘V to paste, Backspace to delete.
        // Separating "what's selected" from "what's on the clipboard"
        // fixes the old gotcha where every shift-drag auto-overwrote
        // the clipboard.
        const rectTiles: { x: number; y: number }[] = [];
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) rectTiles.push({ x: sx + dx, y: sy + dy });
        }
        this.setSelection(rectTiles);
        return;
      }
      // End drag-paint (stamp/eraser continuous drag)
      if (this.isDragPainting) {
        this.isDragPainting = false;
        this.dragPaintMode = null;
        this.dragPaintVisited.clear();
        this.flushPaintBatch();
      }
      // End block drag-paste (Cmd+drag)
      if (this.isBlockDragPasting) {
        this.isBlockDragPasting = false;
        this.blockDragVisited.clear();
      }
    });

    // Pointer up outside (pointer leaves canvas while dragging)
    this.input.on("pointerupoutside", () => {
      this.isPanning = false;
      this.panMoved = false;
      this.isDragging = false;
      this.dragEntityId = null;
      this.clearDragGhost();
      // Cancel any deferred click — leaving the canvas means user changed mind
      this.pendingClickAction = null;
      // End drag-paint if active
      this.isDragPainting = false;
      this.dragPaintMode = null;
      this.dragPaintVisited.clear();
      this.flushPaintBatch();
    });

    // Pointer up
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      // If a tool click was deferred and pointer never moved enough to pan,
      // execute the tool action now.
      if (this.pendingClickAction) {
        const action = this.pendingClickAction;
        this.pendingClickAction = null;
        action();
        return;
      }

      if (this.isPanning) {
        const wasPanMove = this.panMoved;
        this.isPanning = false;
        this.panMoved = false;
        // If user just clicked without dragging, deselect
        if (!wasPanMove) {
          const tileX = Math.floor(pointer.worldX / TILE_SIZE);
          const tileY = Math.floor(pointer.worldY / TILE_SIZE);
          emitEditorEvent(TILE_CLICKED, { x: tileX, y: tileY });
          emitEditorEvent(ENTITY_CLICKED, { entityId: null });
        }
        return;
      }


      if (this.isDragging && this.dragEntityId) {
        const tileX = Math.floor(pointer.worldX / TILE_SIZE);
        const tileY = Math.floor(pointer.worldY / TILE_SIZE);
        emitEditorEvent(DRAG_END, { entityId: this.dragEntityId, tileX, tileY });
        this.clearDragGhost();
        this.isDragging = false;
        this.dragEntityId = null;
      }
    });

    // Double-click: center on tile
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && pointer.getDuration() < 300) {
        // Check for double click (Phaser doesn't have built-in)
      }
    });

    // Arrow keys for panning
    this.input.keyboard?.on("keydown-LEFT", () => {
      if (!this.selectedId) cam.scrollX -= 32 / cam.zoom;
    });
    this.input.keyboard?.on("keydown-RIGHT", () => {
      if (!this.selectedId) cam.scrollX += 32 / cam.zoom;
    });
    this.input.keyboard?.on("keydown-UP", () => {
      if (!this.selectedId) cam.scrollY -= 32 / cam.zoom;
    });
    this.input.keyboard?.on("keydown-DOWN", () => {
      if (!this.selectedId) cam.scrollY += 32 / cam.zoom;
    });

    // R rotates the copied stamp block 90° CW. F flips horizontally,
    // Shift+F flips vertically. No-op when no block is selected, or when
    // the user is typing in a text field (don't steal keystrokes).
    const isTypingInField = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    this.input.keyboard?.on("keydown-R", () => {
      if (!this.blockSelection || isTypingInField()) return;
      this.blockSelection.tiles = EditorScene.rotateBlock90(this.blockSelection.tiles);
      this.blockSelection.decor = EditorScene.rotateDecor90(this.blockSelection.decor);
      this.emitBlockStatus();
      // Force a ghost redraw — its cached tile is still valid but width/height changed.
      this.blockGhostTile = { x: -1, y: -1 };
    });
    this.input.keyboard?.on("keydown-F", (event: KeyboardEvent) => {
      if (!this.blockSelection || isTypingInField()) return;
      if (event.shiftKey) {
        this.blockSelection.tiles = EditorScene.flipBlockY(this.blockSelection.tiles);
        this.blockSelection.decor = EditorScene.flipBlockY(this.blockSelection.decor);
      } else {
        this.blockSelection.tiles = EditorScene.flipBlockX(this.blockSelection.tiles);
        this.blockSelection.decor = EditorScene.flipBlockX(this.blockSelection.decor);
      }
      this.emitBlockStatus();
      this.blockGhostTile = { x: -1, y: -1 };
    });
    // Enter commits the queued Shift+click tiles (paint or erase) in one go.
    this.input.keyboard?.on("keydown-ENTER", () => {
      if (isTypingInField()) return;
      if (this.pendingOpMode && this.pendingOpTiles.size > 0) {
        this.commitPendingOpQueue();
      }
    });
    // T opens the tint popup for the most-recently-clicked tile (or for the
    // currently highlighted multi-selection if any are active).
    this.input.keyboard?.on("keydown-T", () => {
      if (isTypingInField()) return;
      this.openTintForLastTile();
    });
    // Zoom presets — one table drives them all so adding a new preset
    // means adding a row, not wiring a new keyboard listener. Number key
    // → preset: 0 fits to viewport, 1 = 100%, 2/3/4 step up through
    // comfortable authoring zooms. +/- and scroll wheel still do smooth
    // zoom via stepZoom().
    const zoomPresets: Record<string, number | "fit"> = {
      ZERO: "fit", ONE: 1.0, TWO: 2.0, THREE: 4.0, FOUR: 6.0,
    };
    for (const [key, target] of Object.entries(zoomPresets)) {
      this.input.keyboard?.on(`keydown-${key}`, () => {
        if (isTypingInField()) return;
        if (target === "fit") {
          this.fitMapToViewport();
        } else {
          this.currentZoom = target;
          cam.setZoom(target);
          this.syncAutoPixelGrid();
        }
      });
    }
    this.input.keyboard?.on("keydown-PLUS", () => this.stepZoom(1.25));
    this.input.keyboard?.on("keydown-EQUALS", () => this.stepZoom(1.25));
    this.input.keyboard?.on("keydown-MINUS", () => this.stepZoom(0.8));
    this.input.keyboard?.on("keydown-W", () => {
      if (isTypingInField()) return;
      this.magicWandSelectByGid();
    });
    // B cycles the block paste mode (both → fg-only → bg-only → both).
    // Pasting a fence onto a road now preserves the road when mode is
    // fg-only. Only effective while a block is copied.
    this.input.keyboard?.on("keydown-B", () => {
      if (isTypingInField() || !this.blockSelection) return;
      const order: Array<"both" | "fg-only" | "bg-only"> = ["both", "fg-only", "bg-only"];
      const next = order[(order.indexOf(this.blockPasteMode) + 1) % order.length];
      this.blockPasteMode = next;
      emitEditorEvent("editor:block-paste-mode", { mode: next });
      emitEditorEvent("editor:toast", {
        message: `Paste mode: ${next === "both" ? "Both layers" : next === "fg-only" ? "Foreground only (preserves ground)" : "Background only (no sprites)"}`,
      });
    });
    // C toggles the collision flag on the last-clicked tile. Routes
    // through the same event as the sidebar checkbox + context-menu,
    // so all three triggers share one code path — easier to evolve and
    // guarantees consistent behavior (e.g. Bug 1's tilemapLayer guard
    // applies everywhere automatically).
    this.input.keyboard?.on("keydown-C", () => {
      if (isTypingInField()) return;
      emitEditorEvent("editor:toggle-collision", null);
    });
    this.unsubscribers.push(
      onEditorEvent("editor:toggle-collision", (detail: { x?: number; y?: number } | null) => {
        if (detail && typeof detail.x === "number" && typeof detail.y === "number") {
          this.toggleCollisionAt(detail.x, detail.y);
        } else {
          this.toggleCollisionAtLastTile();
        }
      }),
    );
  }

  /** Toggle collision at the most-recently-clicked tile (hover if none). */
  private toggleCollisionAtLastTile(): void {
    const pointer = this.input.activePointer;
    let x: number, y: number;
    if (this.lastClickedTile) {
      x = this.lastClickedTile.x; y = this.lastClickedTile.y;
    } else if (pointer) {
      x = Math.floor(pointer.worldX / TILE_SIZE);
      y = Math.floor(pointer.worldY / TILE_SIZE);
    } else {
      emitEditorEvent("editor:toast", { message: "Click a tile first, then press C to toggle its collision." });
      return;
    }
    this.toggleCollisionAt(x, y);
  }

  /** Toggle collision at an explicit (x, y). */
  private toggleCollisionAt(x: number, y: number): void {
    if (!this.tilemap) return;
    if (x < 0 || x >= this.tilemap.width || y < 0 || y >= this.tilemap.height) return;
    const idx = y * this.tilemap.width + x;
    if (idx < 0 || idx >= this.collisionLayerData.length) return;
    const wasBlocked = this.collisionLayerData[idx] > 0;
    this.collisionLayerData[idx] = wasBlocked ? 0 : 1;
    // The Collision LayerData exists (createBlankLayer was called) but its
    // `tilemapLayer` is only set if the layer was actually rendered via
    // `createLayer` — without that guard, Phaser's putTileAt dereferences
    // `layer.tilemapLayer.tilemap` and throws. The authoritative blocked
    // state still lives in `this.collisionLayerData`, so a missing visual
    // layer just means the toggle isn't re-drawn — not a functional loss.
    const collisionLayer = this.tilemap.getLayer("Collision");
    if (collisionLayer?.tilemapLayer) {
      this.tilemap.putTileAt(wasBlocked ? 0 : 1, x, y, false, "Collision");
    }
    if (this.collisionVisible) this.renderCollisionOverlay();
    // Event carries BOTH old and new state so React can push a
    // TOGGLE_COLLISION action with a proper inverse. Without oldBlocked
    // the reducer would have to guess at undo time.
    emitEditorEvent("editor:collision-toggle", { x, y, blocked: !wasBlocked, oldBlocked: wasBlocked });
  }

  /**
   * Zoom step helper — respects clamp + refreshes the auto pixel grid.
   * Anchored on the last known pointer position (or the camera center if
   * the cursor has never been tracked) so keyboard `+`/`-` feels the
   * same as scroll wheel zoom.
   */
  private stepZoom(factor: number): void {
    const cam = this.cameras.main;
    const pointer = this.input.activePointer;
    const oldZoom = cam.zoom;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));
    if (newZoom === oldZoom) return;
    const anchorX = pointer?.x ?? cam.width / 2;
    const anchorY = pointer?.y ?? cam.height / 2;
    const wx = pointer?.worldX ?? cam.scrollX + cam.width / 2;
    const wy = pointer?.worldY ?? cam.scrollY + cam.height / 2;
    const ox = cam.originX * cam.width;
    const oy = cam.originY * cam.height;
    cam.setZoom(newZoom);
    cam.scrollX = wx - (anchorX - ox) / newZoom - ox;
    cam.scrollY = wy - (anchorY - oy) / newZoom - oy;
    this.currentZoom = newZoom;
    this.syncAutoPixelGrid();
  }

  /** Zoom the camera so the entire map fits into the viewport. */
  private fitMapToViewport(): void {
    if (!this.tilemap) return;
    const cam = this.cameras.main;
    const mapW = this.tilemap.width * TILE_SIZE;
    const mapH = this.tilemap.height * TILE_SIZE;
    const scale = Math.min(cam.width / mapW, cam.height / mapH) * 0.95;
    this.currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
    cam.setZoom(this.currentZoom);
    cam.centerOn(mapW / 2, mapH / 2);
    this.syncAutoPixelGrid();
  }

  /**
   * Magic wand — selects all tiles similar to the last-clicked one. If
   * the clicked tile has a top sprite (tree / building / fence), we match
   * every top sprite with the same texture+frame. Otherwise we match
   * same-GID tiles on the ground layer. Routes the matches through the
   * unified selection so every sidebar op can target them.
   */
  private magicWandSelectByGid(): void {
    if (!this.tilemap) return;
    if (!this.lastClickedTile) {
      emitEditorEvent("editor:toast", {
        message: "Magic wand needs a starting tile — click one first, then press W.",
      });
      return;
    }
    const lcx = this.lastClickedTile.x;
    const lcy = this.lastClickedTile.y;
    this.clearTintHighlight();

    // Prefer matching the top sprite if one exists at the clicked tile —
    // otherwise the wand "only selects grass" because decor is in a
    // separate sprite layer that ground-GID matching never sees.
    const clickedSprite = this.topSprites.find((s) => {
      const sx = Math.floor((s.x as number) / TILE_SIZE);
      const sy = Math.floor((s.y as number) / TILE_SIZE);
      return sx === lcx && sy === lcy;
    });

    let count = 0;
    if (clickedSprite) {
      const texKey = clickedSprite.texture.key;
      const frameKey = String(clickedSprite.frame.name);
      for (const s of this.topSprites) {
        if (s.texture.key !== texKey) continue;
        if (String(s.frame.name) !== frameKey) continue;
        const x = Math.floor((s.x as number) / TILE_SIZE);
        const y = Math.floor((s.y as number) / TILE_SIZE);
        this.addTintHighlight(x, y);
        emitEditorEvent("editor:tint-click", {
          x, y, layer: "top",
          screenX: window.innerWidth / 2, screenY: window.innerHeight / 2,
          append: count > 0,
        });
        count++;
      }
      return;
    }

    const target = this.tilemap.getTileAt(lcx, lcy, false, "Ground");
    if (!target) return;
    const targetGid = target.index;
    const ground = this.tilemap.getLayer("Ground");
    if (!ground) return;
    for (let y = 0; y < this.tilemap.height; y++) {
      for (let x = 0; x < this.tilemap.width; x++) {
        const t = ground.data[y]?.[x];
        if (t && t.index === targetGid) {
          this.addTintHighlight(x, y);
          emitEditorEvent("editor:tint-click", {
            x, y, layer: "ground",
            screenX: window.innerWidth / 2, screenY: window.innerHeight / 2,
            append: count > 0,
          });
          count++;
        }
      }
    }
  }

  /**
   * The pixel grid should auto-appear at ≥2× zoom so individual tile
   * boundaries are legible when drawing detail. Below 2× the grid is hidden
   * unless the user explicitly toggled it from the View menu.
   */
  private syncAutoPixelGrid(): void {
    if (this.gridVisible) return; // manual toggle takes precedence
    if (this.currentZoom >= 2) this.renderPixelGrid();
    else if (this.gridGraphics) { this.gridGraphics.destroy(); this.gridGraphics = null; }
  }

  /**
   * Render the map to a PNG and trigger a browser download. Uses Phaser's
   * snapshot of the full world area, not just the viewport, so the export
   * captures the whole map even at current zoom/scroll.
   */
  private exportMapAsPng(): void {
    if (!this.tilemap) return;
    const cam = this.cameras.main;
    const prevZoom = this.currentZoom;
    const prevSx = cam.scrollX;
    const prevSy = cam.scrollY;
    // Temporarily fit the full map to the viewport before snapping
    const mapW = this.tilemap.width * TILE_SIZE;
    const mapH = this.tilemap.height * TILE_SIZE;
    const targetZoom = Math.min(cam.width / mapW, cam.height / mapH) * 0.98;
    cam.setZoom(targetZoom);
    cam.centerOn(mapW / 2, mapH / 2);
    // Phaser snapshot returns an HTMLImageElement via a callback.
    this.renderer.snapshot((img: HTMLImageElement | Phaser.Display.Color) => {
      // Restore camera
      cam.setZoom(prevZoom);
      cam.scrollX = prevSx;
      cam.scrollY = prevSy;
      this.currentZoom = prevZoom;
      if (!(img instanceof HTMLImageElement)) return;
      // Trigger download
      const a = document.createElement("a");
      a.href = img.src;
      a.download = `${this.currentMapId}-${Date.now()}.png`;
      a.click();
    });
  }

  /** Like renderGrid, but used for the automatic-at-zoom overlay. */
  private renderPixelGrid(): void {
    if (this.gridGraphics) { this.gridGraphics.destroy(); this.gridGraphics = null; }
    if (!this.tilemap) return;
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(50);
    this.gridGraphics.lineStyle(0.5, 0xffffff, 0.12);
    const w = this.tilemap.width;
    const h = this.tilemap.height;
    for (let x = 0; x <= w; x++) {
      this.gridGraphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, h * TILE_SIZE);
    }
    for (let y = 0; y <= h; y++) {
      this.gridGraphics.lineBetween(0, y * TILE_SIZE, w * TILE_SIZE, y * TILE_SIZE);
    }
  }

  /**
   * Open the tint popup for the last tile clicked. If shift-click highlights
   * already exist, the popup uses them as the multi-selection.
   */
  private openTintForLastTile(): void {
    const tile = this.lastClickedTile;
    if (!tile) return;
    this.openTintForTile(tile.x, tile.y);
  }

  /** Open the tint popup centered on a specific tile. */
  private openTintForTile(x: number, y: number, screenX?: number, screenY?: number): void {
    if (!this.tilemap) return;
    const hasTopSprite = this.topSprites.some((s) => {
      const sx = Math.floor((s.x as number) / TILE_SIZE);
      const sy = Math.floor((s.y as number) / TILE_SIZE);
      return sx === x && sy === y;
    });
    const layer = hasTopSprite ? "top" : "ground";
    this.showTintHighlight(x, y);
    emitEditorEvent("editor:tint-click", {
      x, y, layer,
      screenX: screenX ?? window.innerWidth / 2,
      screenY: screenY ?? window.innerHeight / 2,
      append: false,
    });
  }

  /** Rotate a 2D grid 90° clockwise (generic over cell type). */
  private static rotateGrid90<T>(m: T[][]): T[][] {
    const h = m.length;
    const w = m[0]?.length ?? 0;
    const out: T[][] = [];
    for (let y = 0; y < w; y++) {
      const row: T[] = new Array(h);
      for (let x = 0; x < h; x++) row[x] = m[h - 1 - x][y];
      out.push(row);
    }
    return out;
  }
  private static rotateBlock90(m: number[][]): number[][] { return this.rotateGrid90(m); }
  private static rotateDecor90(m: (BlockDecor | null)[][]): (BlockDecor | null)[][] {
    return this.rotateGrid90(m);
  }

  /** Mirror a 2D grid along its vertical axis (left ↔ right). */
  private static flipBlockX<T>(m: T[][]): T[][] {
    return m.map((row) => [...row].reverse());
  }

  /** Mirror a 2D grid along its horizontal axis (top ↔ bottom). */
  private static flipBlockY<T>(m: T[][]): T[][] {
    return [...m].reverse();
  }

  /**
   * Single write-path for ground-tile edits. Reads the old GID, paints
   * the new one, emits an event with BOTH — so the React reducer can
   * push a PAINT_TILE action to the undo stack with a complete inverse.
   * Before this helper, each paint site emitted `{x, y, gid}` without
   * the old value, which meant ⌘Z had no way to restore the prior tile.
   * Used by cmd+click, drag-paint, erase, fill-bucket, and paste.
   */
  paintTile(x: number, y: number, newGid: number): void {
    if (!this.tilemap) return;
    if (x < 0 || x >= this.tilemap.width || y < 0 || y >= this.tilemap.height) return;
    const oldTile = this.tilemap.getTileAt(x, y, false, "Ground");
    const oldGid = oldTile?.index ?? 0;
    if (oldGid === newGid) return;
    this.tilemap.putTileAt(newGid, x, y, false, "Ground");
    // Inside a drag/fill stroke: accumulate into the batch buffer. The
    // flush-on-end path emits one editor:tile-paint-batch so React
    // records a single undo entry. Single-click paints leave the buffer
    // null and emit immediately as before.
    if (this.paintBatch) {
      this.paintBatch.push({ x, y, oldGid, newGid });
    } else {
      emitEditorEvent("editor:tile-paint", { x, y, gid: newGid, oldGid });
    }
  }

  /**
   * Open a paint-buffer window. Subsequent `paintTile` calls accumulate
   * into a single batch; call `flushPaintBatch()` when the stroke ends.
   * No-op if already open (nested drags coalesce safely).
   */
  private beginPaintBatch(): void {
    if (!this.paintBatch) this.paintBatch = [];
  }

  /** Close the buffer and emit one batch event, or nothing if empty. */
  private flushPaintBatch(): void {
    if (!this.paintBatch) return;
    const changes = this.paintBatch;
    this.paintBatch = null;
    if (changes.length === 0) return;
    if (changes.length === 1) {
      // Single-tile "batch" — keep the same event shape as an unbuffered
      // paint so the React side doesn't see spurious empty batches.
      const c = changes[0];
      emitEditorEvent("editor:tile-paint", { x: c.x, y: c.y, gid: c.newGid, oldGid: c.oldGid });
      return;
    }
    emitEditorEvent("editor:tile-paint-batch", { changes });
  }

  /**
   * Erase the ground tile AND any top sprite at (x, y). Ensures the user
   * doesn't get a floating tree after clearing the ground beneath it.
   */
  private eraseTileAndDecor(x: number, y: number): void {
    if (!this.tilemap) return;
    if (x < 0 || x >= this.tilemap.width || y < 0 || y >= this.tilemap.height) return;
    this.paintTile(x, y, 0);
    const beforeLen = this.topSprites.length;
    this.topSprites = this.topSprites.filter((s) => {
      const sx = Math.floor((s.x as number) / TILE_SIZE);
      const sy = Math.floor((s.y as number) / TILE_SIZE);
      if (sx === x && sy === y) { s.destroy(); return false; }
      return true;
    });
    if (this.topSprites.length !== beforeLen) {
      emitEditorEvent("editor:decor-erased", { x, y });
    }
  }

  /**
   * Notify the React side that the stamp block dimensions/orientation
   * changed so the status HUD can refresh.
   */
  private emitBlockStatus(): void {
    if (!this.blockSelection) {
      emitEditorEvent("editor:block-status", null);
      return;
    }
    const rows = this.blockSelection.tiles;
    // Count decor entries so the HUD can show "2×1 · 1 decor" — lets the
    // user see at a glance whether a sprite was captured (especially
    // important in fg-only mode where only the decor matters).
    let decorCount = 0;
    for (const r of this.blockSelection.decor) for (const c of r) if (c) decorCount++;
    emitEditorEvent("editor:block-status", {
      width: rows[0]?.length ?? 0,
      height: rows.length,
      decorCount,
      pasteMode: this.blockPasteMode,
    });
  }

  /**
   * Toggle a tile in the pending-op queue. When the queue switches modes
   * (e.g. paint → erase on tool change), it's reset first. Emits status to
   * React so the HUD badge stays in sync.
   */
  private togglePendingOpTile(mode: "paint" | "erase", x: number, y: number): void {
    if (this.pendingOpMode && this.pendingOpMode !== mode) {
      this.clearPendingOpQueue();
    }
    this.pendingOpMode = mode;
    const key = `${x},${y}`;
    const existing = this.pendingOpTiles.get(key);
    if (existing) {
      existing.destroy();
      this.pendingOpTiles.delete(key);
      if (this.pendingOpTiles.size === 0) this.pendingOpMode = null;
    } else {
      const g = this.add.graphics();
      g.setDepth(450);
      const color = mode === "paint" ? 0x22c55e : 0xef4444;
      g.lineStyle(2, color, 0.9);
      g.strokeRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      g.fillStyle(color, 0.18);
      g.fillRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      this.pendingOpTiles.set(key, g);
    }
    this.emitPendingOpStatus();
  }

  /** Apply the queued paint/erase to every queued tile in one go. */
  private commitPendingOpQueue(): void {
    if (!this.pendingOpMode || !this.tilemap) return;
    const mode = this.pendingOpMode;
    for (const key of this.pendingOpTiles.keys()) {
      const [xs, ys] = key.split(",");
      const x = parseInt(xs, 10);
      const y = parseInt(ys, 10);
      if (mode === "paint" && this.selectedTileGid > 0) {
        this.paintTile(x, y, this.selectedTileGid);
      } else if (mode === "erase") {
        this.paintTile(x, y, 0);
      }
    }
    this.clearPendingOpQueue();
  }

  /** Drop all queued tiles and their highlights. */
  clearPendingOpQueue(): void {
    for (const g of this.pendingOpTiles.values()) g.destroy();
    this.pendingOpTiles.clear();
    this.pendingOpMode = null;
    this.emitPendingOpStatus();
  }

  private emitPendingOpStatus(): void {
    emitEditorEvent("editor:pending-op-status", this.pendingOpMode
      ? { mode: this.pendingOpMode, count: this.pendingOpTiles.size }
      : null,
    );
  }

  /**
   * Flood fill: replace every tile connected 4-way to (tileX, tileY) that
   * shares the starting tile's GID. Bounded by map dimensions and a safety
   * cap so a bad click on 140×120 tiles doesn't freeze the browser.
   */
  private floodFillTile(tileX: number, tileY: number, replacementGid: number): void {
    if (!this.tilemap) return;
    const start = this.tilemap.getTileAt(tileX, tileY, false, "Ground");
    if (!start) return;
    const targetGid = start.index;
    if (targetGid === replacementGid) return;
    const w = this.tilemap.width;
    const h = this.tilemap.height;
    const stack: [number, number][] = [[tileX, tileY]];
    const visited = new Set<string>();
    const MAX_CELLS = w * h; // safety upper bound — whole map
    let painted = 0;
    // Wrap the flood-fill in a single paint batch so one ⌘Z undoes the
    // entire filled region instead of hundreds of individual tile undos.
    this.beginPaintBatch();
    try {
      while (stack.length && painted < MAX_CELLS) {
        const [x, y] = stack.pop()!;
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const t = this.tilemap.getTileAt(x, y, false, "Ground");
        if (!t || t.index !== targetGid) continue;
        this.paintTile(x, y, replacementGid);
        painted++;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    } finally {
      this.flushPaintBatch();
    }
  }

  /**
   * Paste the current stamp block at (tileX, tileY). Also recreates any
   * captured top-sprite decor (trees, fences, building pieces) so tiles
   * that are decor-only in the grass-split don't show as transparent.
   * Destroys existing top sprites at the target cells first to avoid
   * duplicates when pasting on top of existing decor.
   */
  private pasteBlockAt(tileX: number, tileY: number): void {
    if (!this.blockSelection || !this.tilemap) return;
    const { tiles, decor, meta } = this.blockSelection;
    const wantBg = this.blockPasteMode !== "fg-only";
    const wantFg = this.blockPasteMode !== "bg-only";
    const targets = new Set<string>();

    // Ground layer — skipped entirely in fg-only mode so pasting a fence
    // onto a road preserves the road underneath.
    if (wantBg) {
      for (let dy = 0; dy < tiles.length; dy++) {
        for (let dx = 0; dx < tiles[dy].length; dx++) {
          const tx = tileX + dx;
          const ty = tileY + dy;
          if (tx < 0 || tx >= this.tilemap.width || ty < 0 || ty >= this.tilemap.height) continue;
          if (tiles[dy][dx] > 0) {
            this.tilemap.putTileAt(tiles[dy][dx], tx, ty, false, "Ground");
          }
          targets.add(`${tx},${ty}`);
        }
      }
    } else {
      // fg-only still needs to know the footprint so we can clear old
      // decor in the paste region before adding new sprites.
      for (let dy = 0; dy < tiles.length; dy++) {
        for (let dx = 0; dx < tiles[dy].length; dx++) {
          targets.add(`${tileX + dx},${tileY + dy}`);
        }
      }
    }

    // Foreground layer — destroy overlapping sprites, add captured decor.
    if (wantFg) {
      this.topSprites = this.topSprites.filter((s) => {
        const tx = Math.floor((s.x as number) / TILE_SIZE);
        const ty = Math.floor((s.y as number) / TILE_SIZE);
        if (targets.has(`${tx},${ty}`)) { s.destroy(); return false; }
        return true;
      });
      for (let dy = 0; dy < decor.length; dy++) {
        for (let dx = 0; dx < decor[dy].length; dx++) {
          const d = decor[dy][dx];
          if (!d) continue;
          const tx = tileX + dx;
          const ty = tileY + dy;
          if (tx < 0 || tx >= this.tilemap.width || ty < 0 || ty >= this.tilemap.height) continue;
          // Guard against missing texture/frame — otherwise Phaser silently
          // renders its __MISSING placeholder which shows up as a small
          // dark silhouette and looks like a bug to the user. If the
          // source texture/frame isn't registered, skip and toast.
          const tex = this.textures.get(d.textureKey);
          if (!tex || !tex.has(d.frameKey)) {
            emitEditorEvent("editor:toast", {
              message: `Skipped decor paste: texture "${d.textureKey}" frame "${d.frameKey}" not loaded.`,
            });
            continue;
          }
          const sprite = this.add.sprite(
            tx * TILE_SIZE + TILE_SIZE / 2,
            ty * TILE_SIZE + TILE_SIZE / 2,
            d.textureKey,
            d.frameKey,
          );
          sprite.setDepth(d.depth);
          // Replay the captured visual transform so a copied rotated/
          // flipped tree pastes facing the same direction as the source.
          if (d.rotation) sprite.setRotation(d.rotation);
          if (d.flipX) sprite.setFlipX(true);
          if (d.flipY) sprite.setFlipY(true);
          this.topSprites.push(sprite);
        }
      }
    }

    // Per-cell metadata (tints, collision) — applied AFTER the ground/
    // decor write so the visual state of the destination matches what
    // the user copied from. Without this, ⌘C → ⌘V silently dropped any
    // hue work or collision flags the user had set on the source.
    if (meta) {
      for (let dy = 0; dy < meta.length; dy++) {
        for (let dx = 0; dx < (meta[dy]?.length ?? 0); dx++) {
          const m = meta[dy][dx];
          if (!m) continue;
          const tx = tileX + dx;
          const ty = tileY + dy;
          if (tx < 0 || tx >= this.tilemap.width || ty < 0 || ty >= this.tilemap.height) continue;
          if (m.blocked) {
            const idx = ty * this.tilemap.width + tx;
            this.collisionLayerData[idx] = 1;
            const cl = this.tilemap.getLayer("Collision");
            if (cl?.tilemapLayer) this.tilemap.putTileAt(1, tx, ty, false, "Collision");
            emitEditorEvent("editor:collision-toggle", { x: tx, y: ty, blocked: true });
          }
          if (m.tint) {
            // Forward to React so the tileTints state owns it; the same
            // event the inspector dispatches when the user moves a slider.
            emitEditorEvent("editor:apply-tint-at", {
              x: tx, y: ty,
              tint: m.tint,
            });
          }
        }
      }
      if (this.collisionVisible) this.renderCollisionOverlay();
    }

    emitEditorEvent("editor:block-pasted", {
      x: tileX, y: tileY,
      w: tiles[0].length, h: tiles.length,
      mode: this.blockPasteMode,
    });
  }

  /**
   * Snapshot a set of cells' current ground GID + decor + collision.
   * Used to bookend a paste so ⌘Z can restore the region to its
   * pre-paste state. Decor is captured per cell (first matching sprite);
   * multiple sprites at the same tile are rare in practice.
   */
  private snapshotCells(cells: Array<{ x: number; y: number }>): Array<{ x: number; y: number; gid: number; decor: any; blocked: boolean }> {
    if (!this.tilemap) return [];
    const mapW = this.tilemap.width;
    const decorByKey = new Map<string, any>();
    for (const s of this.topSprites) {
      const sx = Math.floor((s.x as number) / TILE_SIZE);
      const sy = Math.floor((s.y as number) / TILE_SIZE);
      if (!decorByKey.has(`${sx},${sy}`)) {
        decorByKey.set(`${sx},${sy}`, {
          textureKey: s.texture.key,
          frameKey: String(s.frame.name),
          depth: s.depth as number,
          rotation: (s as any).rotation ?? 0,
          flipX: (s as any).flipX ?? false,
          flipY: (s as any).flipY ?? false,
        });
      }
    }
    return cells.map((c) => {
      const t = this.tilemap!.getTileAt(c.x, c.y, false, "Ground");
      const idx = c.y * mapW + c.x;
      return {
        x: c.x, y: c.y,
        gid: t?.index ?? 0,
        decor: decorByKey.get(`${c.x},${c.y}`) ?? null,
        blocked: (this.collisionLayerData?.[idx] ?? 0) > 0,
      };
    });
  }

  /**
   * Restore a cell snapshot — used by ⌘Z/⌘Y on a paste action. Writes
   * ground GID, destroys existing decor in footprint, recreates from
   * the snapshot, and re-applies the collision flag + overlay.
   */
  private applyPasteSnapshot(cells: Array<{ x: number; y: number; gid: number; decor: any; blocked: boolean }>): void {
    if (!this.tilemap) return;
    const mapW = this.tilemap.width;
    const cellKeys = new Set(cells.map((c) => `${c.x},${c.y}`));
    // Ground tiles
    for (const c of cells) {
      this.tilemap.putTileAt(c.gid, c.x, c.y, false, "Ground");
    }
    // Decor — destroy all sprites in the footprint, then recreate per
    // snapshot. This handles both add→remove and remove→add directions
    // cleanly because either side of the diff is symmetric.
    this.topSprites = this.topSprites.filter((s) => {
      const sx = Math.floor((s.x as number) / TILE_SIZE);
      const sy = Math.floor((s.y as number) / TILE_SIZE);
      if (cellKeys.has(`${sx},${sy}`)) { s.destroy(); return false; }
      return true;
    });
    for (const c of cells) {
      const d = c.decor;
      if (!d) continue;
      const tex = this.textures.get(d.textureKey);
      if (!tex || !tex.has(d.frameKey)) continue;
      const sprite = this.add.sprite(c.x * TILE_SIZE + TILE_SIZE / 2, c.y * TILE_SIZE + TILE_SIZE / 2, d.textureKey, d.frameKey);
      sprite.setDepth(d.depth);
      if (d.rotation) sprite.setRotation(d.rotation);
      if (d.flipX) sprite.setFlipX(true);
      if (d.flipY) sprite.setFlipY(true);
      this.topSprites.push(sprite);
    }
    // Collision
    for (const c of cells) {
      const idx = c.y * mapW + c.x;
      this.collisionLayerData[idx] = c.blocked ? 1 : 0;
      const cl = this.tilemap.getLayer("Collision");
      if (cl?.tilemapLayer) this.tilemap.putTileAt(c.blocked ? 1 : 0, c.x, c.y, false, "Collision");
    }
    if (this.collisionVisible) this.renderCollisionOverlay();
  }

  /**
   * Draw the cursor-following ghost preview of the selected block so the
   * user knows where a paste will land. Called from pointermove.
   */
  private updateBlockGhost(tileX: number, tileY: number): void {
    if (this.currentTool !== "stamp" || !this.blockSelection) {
      this.clearBlockGhost();
      return;
    }
    if (tileX === this.blockGhostTile.x && tileY === this.blockGhostTile.y && this.blockGhost) return;
    this.blockGhostTile = { x: tileX, y: tileY };
    if (!this.blockGhost) {
      this.blockGhost = this.add.graphics();
      this.blockGhost.setDepth(600);
    }
    this.blockGhost.clear();
    const w = this.blockSelection.tiles[0]?.length ?? 0;
    const h = this.blockSelection.tiles.length;
    this.blockGhost.lineStyle(2, 0x4a9eed, 0.9);
    this.blockGhost.strokeRect(tileX * TILE_SIZE, tileY * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
    this.blockGhost.fillStyle(0x4a9eed, 0.1);
    this.blockGhost.fillRect(tileX * TILE_SIZE, tileY * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
    // Faint per-cell dividers to hint the block shape
    this.blockGhost.lineStyle(1, 0x4a9eed, 0.3);
    for (let dx = 1; dx < w; dx++) {
      this.blockGhost.lineBetween((tileX + dx) * TILE_SIZE, tileY * TILE_SIZE, (tileX + dx) * TILE_SIZE, (tileY + h) * TILE_SIZE);
    }
    for (let dy = 1; dy < h; dy++) {
      this.blockGhost.lineBetween(tileX * TILE_SIZE, (tileY + dy) * TILE_SIZE, (tileX + w) * TILE_SIZE, (tileY + dy) * TILE_SIZE);
    }
  }

  private clearBlockGhost(): void {
    if (this.blockGhost) {
      this.blockGhost.destroy();
      this.blockGhost = null;
    }
  }

  /**
   * Draw a translucent thumbnail of the hovered swatch at the cursor's
   * tile, so the user can preview a swatch click before committing.
   * Reuses the active tilemap's tileset image as the source texture.
   */
  private updateHoverPreviewGhost(tileX: number, tileY: number): void {
    if (!this.tilemap || this.hoverPreviewGid <= 0) return;
    const cfg = MAP_CONFIGS[this.currentMapId];
    if (!cfg) return;
    const tilesetKey = cfg.tilesetName;
    const texture = this.textures.get(tilesetKey);
    if (!texture) return;
    const tileset = this.tilemap.getTileset(tilesetKey);
    if (!tileset) return;
    const margin = (tileset as unknown as { tileMargin?: number }).tileMargin ?? 0;
    const spacing = (tileset as unknown as { tileSpacing?: number }).tileSpacing ?? 0;
    const cols = tileset.columns;
    const firstgid = tileset.firstgid;
    const local = this.hoverPreviewGid - firstgid;
    if (local < 0 || cols <= 0) return;
    const srcX = margin + (local % cols) * (TILE_SIZE + spacing);
    const srcY = margin + Math.floor(local / cols) * (TILE_SIZE + spacing);
    const frameKey = `gp_${local}`;
    if (!texture.has(frameKey)) {
      texture.add(frameKey, 0, srcX, srcY, TILE_SIZE, TILE_SIZE);
    }
    if (!this.hoverPreviewGhost) {
      this.hoverPreviewGhost = this.add.sprite(0, 0, tilesetKey, frameKey);
      this.hoverPreviewGhost.setOrigin(0, 0);
      this.hoverPreviewGhost.setDepth(700);
      this.hoverPreviewGhost.setAlpha(0.65);
    } else {
      this.hoverPreviewGhost.setTexture(tilesetKey, frameKey);
    }
    this.hoverPreviewGhost.setPosition(tileX * TILE_SIZE, tileY * TILE_SIZE);
  }

  /**
   * Outline every tile on the map whose GID matches the hovered swatch.
   * Complements `updateHoverPreviewGhost` (cursor-following thumbnail) by
   * also showing *where the tile type already lives* — useful for spotting
   * duplicates before painting a new instance.
   */
  private renderSwatchMatchHighlights(gid: number): void {
    this.clearSwatchMatchHighlights();
    if (!this.tilemap || gid <= 0) return;
    const layer = this.tilemap.getLayer("Ground");
    if (!layer) return;
    const g = this.add.graphics();
    g.setDepth(695);
    g.lineStyle(1, 0xfacc15, 0.8);
    g.fillStyle(0xfacc15, 0.12);
    for (let y = 0; y < this.tilemap.height; y++) {
      for (let x = 0; x < this.tilemap.width; x++) {
        const t = layer.data[y]?.[x];
        if (!t || t.index !== gid) continue;
        g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        g.strokeRect(x * TILE_SIZE + 0.5, y * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }
    this.swatchMatchHighlights = g;
  }

  private clearSwatchMatchHighlights(): void {
    if (this.swatchMatchHighlights) {
      this.swatchMatchHighlights.destroy();
      this.swatchMatchHighlights = null;
    }
  }

  /**
   * Draw a pulsing ring at (tileX, tileY) so the user can preview where an
   * entity lives on the map just by hovering its row in the left-panel list.
   * Overwrites any prior ring.
   */
  private renderEntityPreview(tileX: number, tileY: number): void {
    this.clearEntityPreview();
    const cx = tileX * TILE_SIZE + TILE_SIZE / 2;
    const cy = tileY * TILE_SIZE + TILE_SIZE / 2;
    const ring = this.add.graphics();
    ring.setDepth(702);
    ring.lineStyle(2, 0x4a9eed, 0.95);
    ring.strokeCircle(0, 0, 14);
    ring.fillStyle(0x4a9eed, 0.15);
    ring.fillCircle(0, 0, 12);
    ring.setPosition(cx, cy);
    this.entityPreviewRing = ring;
    this.entityPreviewTween = this.tweens.add({
      targets: ring,
      scale: { from: 0.8, to: 1.35 },
      alpha: { from: 1.0, to: 0.35 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private clearEntityPreview(): void {
    if (this.entityPreviewTween) { this.entityPreviewTween.stop(); this.entityPreviewTween = null; }
    if (this.entityPreviewRing) { this.entityPreviewRing.destroy(); this.entityPreviewRing = null; }
  }

  private setupEventListeners(): void {
    this.unsubscribers.push(
      onEditorEvent(SELECT_ENTITY, (detail: { entityId: string }) => {
        this.selectEntity(detail.entityId);
      }),
      onEditorEvent(DESELECT, () => {
        this.clearSelection();
      }),
      onEditorEvent(TOGGLE_LAYER, (detail: { layer: string; visible: boolean }) => {
        this.toggleLayer(detail.layer, detail.visible);
      }),
      onEditorEvent(UPDATE_ENTITY_POSITION, (detail: { entityId: string; x: number; y: number }) => {
        this.updateMarkerPosition(detail.entityId, detail.x, detail.y);
      }),
      onEditorEvent(UPDATE_ENTITY_FIELD, (detail: { entityId: string; field: string; value: any }) => {
        this.updateMarkerField(detail.entityId, detail.field, detail.value);
      }),
      onEditorEvent(ADD_ENTITY_MARKER, (detail: { entity: any }) => {
        this.addMarker(detail.entity);
      }),
      onEditorEvent(REMOVE_ENTITY_MARKER, (detail: { entityId: string }) => {
        this.removeMarker(detail.entityId);
      }),
      onEditorEvent(JUMP_TO_TILE, (detail: { x: number; y: number }) => {
        this.cameras.main.centerOn(
          detail.x * TILE_SIZE + TILE_SIZE / 2,
          detail.y * TILE_SIZE + TILE_SIZE / 2,
        );
      }),
      onEditorEvent(REFRESH_ENTITIES, (detail: { entities: any[] }) => {
        this.refreshAllMarkers(detail.entities);
      }),
      onEditorEvent(SWITCH_MAP, (detail: { mapId: string }) => {
        this.switchMap(detail.mapId);
      }),
      onEditorEvent(SET_TOOL, (detail: { tool: string }) => {
        const previous = this.currentTool;
        this.currentTool = detail.tool;
        if (detail.tool !== "tint") this.clearTintHighlight();
        if (detail.tool !== "stamp") this.clearBlockGhost();
        // Leaving stamp/eraser with a pending multi-select queue clears it;
        // the queue is tool-specific and shouldn't bleed into another tool.
        if (previous !== detail.tool && this.pendingOpMode) {
          const stillApplies = (this.pendingOpMode === "paint" && detail.tool === "stamp") ||
                               (this.pendingOpMode === "erase" && detail.tool === "eraser");
          if (!stillApplies) this.clearPendingOpQueue();
        }
      }),
      onEditorEvent("editor:tint-close", () => {
        this.clearTintHighlight();
      }),
      onEditorEvent("editor:refresh-tints", () => {
        this.refreshAllTints();
      }),
      // Esc clears the copied stamp block. Also clears the blue outline
      // and the cursor-follow ghost.
      onEditorEvent("editor:erase-tile", (detail: { x: number; y: number }) => {
        if (!detail) return;
        this.eraseTileAndDecor(detail.x, detail.y);
      }),
      onEditorEvent("editor:copy-selection-as-block", (detail: { tiles: { x: number; y: number }[]; fgOnly?: boolean }) => {
        if (!this.tilemap || !detail?.tiles || detail.tiles.length === 0) return;
        // Compute bounding rect
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const t of detail.tiles) {
          if (t.x < minX) minX = t.x;
          if (t.y < minY) minY = t.y;
          if (t.x > maxX) maxX = t.x;
          if (t.y > maxY) maxY = t.y;
        }
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const inSel = new Set(detail.tiles.map((t) => `${t.x},${t.y}`));
        const decorMap = new Map<string, BlockDecor>();
        for (const s of this.topSprites) {
          const tx = Math.floor((s.x as number) / TILE_SIZE);
          const ty = Math.floor((s.y as number) / TILE_SIZE);
          decorMap.set(`${tx},${ty}`, {
            textureKey: s.texture.key,
            frameKey: String(s.frame.name),
            depth: s.depth as number,
            // Capture the live transform so paste can re-apply rotate/flip
            // (otherwise a rotated tree pastes facing the original way).
            rotation: (s as any).rotation ?? 0,
            flipX: (s as any).flipX ?? false,
            flipY: (s as any).flipY ?? false,
          });
        }
        // Pull React-side per-tile tints from the window mirror (kept in
        // sync by an effect in EditorApp). Without this, ⌘C copied the
        // raw GID and dropped the user's hue/saturation work on the floor.
        // Read the RAW tint entries (pre-preset resolution) so paste can
        // re-dispatch SET_TILE_TINT in the same shape — preserving
        // presetId references, not flattening to baked HSL.
        const tints: Record<string, BlockCellMeta["tint"]> = (window as any).__EDITOR_TILE_TINTS_RAW__ ?? {};
        const tiles: number[][] = [];
        const decor: (BlockDecor | null)[][] = [];
        const meta: (BlockCellMeta | null)[][] = [];
        const mapW = this.tilemap.width;
        for (let dy = 0; dy < h; dy++) {
          const row: number[] = [];
          const drow: (BlockDecor | null)[] = [];
          const mrow: (BlockCellMeta | null)[] = [];
          for (let dx = 0; dx < w; dx++) {
            const cellX = minX + dx;
            const cellY = minY + dy;
            const key = `${cellX},${cellY}`;
            if (inSel.has(key)) {
              const tt = this.tilemap.getTileAt(cellX, cellY, false, "Ground");
              // fgOnly: zero out the ground so plain paste (mode "both")
              // still only places the decor. Lets ⌘⌥C copy "just the
              // fence" and ⌘V drop it on a road without touching the
              // road GID — even in default paste mode.
              row.push(detail.fgOnly ? 0 : (tt?.index ?? 0));
              drow.push(decorMap.get(key) ?? null);
              // Capture every per-cell modification so paste reproduces
              // the EXACT visual the user copied — tint adjust + the
              // collision flag travel with the tile.
              const idx = cellY * mapW + cellX;
              const blocked = (this.collisionLayerData?.[idx] ?? 0) > 0;
              const tintForCell = tints[`${cellX},${cellY}`] ?? null;
              if (tintForCell || blocked) {
                mrow.push({ tint: tintForCell ?? undefined, blocked: blocked || undefined });
              } else {
                mrow.push(null);
              }
            } else {
              // Tiles outside the selection within the bounding rect
              // paste as "no-op" (zero GID, no decor, no meta)
              row.push(0);
              drow.push(null);
              mrow.push(null);
            }
          }
          tiles.push(row);
          decor.push(drow);
          meta.push(mrow);
        }
        this.blockSelection = {
          startX: minX, startY: minY,
          endX: maxX, endY: maxY,
          tiles, decor, meta,
        };
        this.blockPasteMode = "both";
        emitEditorEvent("editor:block-copied", { width: w, height: h, tileCount: detail.tiles.length });
        // Visual confirmation: the captured tiles flash green for ~1s so
        // the user can see exactly what landed on the clipboard.
        emitEditorEvent("editor:flash-tiles", { tiles: detail.tiles, color: detail.fgOnly ? 0x22c55e : 0x4ade80 });
        this.emitBlockStatus();
      }),
      onEditorEvent("editor:copy-single-tile", (detail: { x: number; y: number }) => {
        if (!this.tilemap || !detail) return;
        const t = this.tilemap.getTileAt(detail.x, detail.y, false, "Ground");
        const gid = t?.index ?? 0;
        const decorSprite = this.topSprites.find((s) => {
          const sx = Math.floor((s.x as number) / TILE_SIZE);
          const sy = Math.floor((s.y as number) / TILE_SIZE);
          return sx === detail.x && sy === detail.y;
        });
        const decor: BlockDecor | null = decorSprite ? {
          textureKey: decorSprite.texture.key,
          frameKey: String(decorSprite.frame.name),
          depth: decorSprite.depth as number,
        } : null;
        this.blockSelection = {
          startX: detail.x, startY: detail.y,
          endX: detail.x, endY: detail.y,
          tiles: [[gid]],
          decor: [[decor]],
        };
        this.blockPasteMode = "both";
        emitEditorEvent("editor:block-copied", { width: 1, height: 1, tileCount: 1 });
        this.emitBlockStatus();
      }),
      // Esc tier: clear the tile selection set. Fires before the entity-
      // selection clear so a ⇧+drag-rect state unwinds first.
      onEditorEvent("editor:clear-tile-selection", () => {
        this.setSelection([]);
      }),
      // ⇧+Arrow extends the selection one tile in that direction, using
      // `lastClickedTile` as the moving cursor. Each press adds a new
      // cell and advances the cursor — matches the path-extension UX of
      // spreadsheet editors and tile-based level designers.
      onEditorEvent("editor:extend-selection-arrow", (detail: { dx: number; dy: number } | null) => {
        if (!this.tilemap || !detail) return;
        const start = this.lastClickedTile;
        if (!start) {
          emitEditorEvent("editor:toast", { message: "No tile picked — double-click a tile first, then ⇧+Arrow extends." });
          return;
        }
        const nx = Math.max(0, Math.min(this.tilemap.width - 1, start.x + detail.dx));
        const ny = Math.max(0, Math.min(this.tilemap.height - 1, start.y + detail.dy));
        if (nx === start.x && ny === start.y) return; // clamped at the edge
        this.addTintHighlight(nx, ny);
        this.setLastClickedTile(nx, ny);
      }),
      onEditorEvent("editor:clear-block-selection", () => {
        this.blockSelection = null;
        if (this.blockSelectionGraphics) {
          this.blockSelectionGraphics.destroy();
          this.blockSelectionGraphics = null;
        }
        this.clearBlockGhost();
        this.emitBlockStatus();
      }),
      // Brief green flash on the tiles that just got copied to the
      // clipboard — visual confirmation that ⌘C / ⌘⌥C captured the
      // right cells. Auto-fades in ~1s; doesn't interfere with the
      // selection highlight (which is a separate graphics layer).
      onEditorEvent("editor:flash-tiles", (detail: { tiles: { x: number; y: number }[]; color?: number } | null) => {
        if (!detail?.tiles?.length) return;
        const color = detail.color ?? 0x4ade80;
        const g = this.add.graphics();
        g.setDepth(720);
        g.fillStyle(color, 0.55);
        g.lineStyle(2, color, 0.95);
        for (const t of detail.tiles) {
          g.fillRect(t.x * TILE_SIZE, t.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          g.strokeRect(t.x * TILE_SIZE + 0.5, t.y * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
        this.tweens.add({
          targets: g,
          alpha: { from: 1, to: 0 },
          duration: 1100,
          ease: "Quad.easeOut",
          onComplete: () => g.destroy(),
        });
      }),
      // ⌘V paste — drops the current clipboard at the pointer's tile. All
      // the same affordances as the old click-to-paste (R rotate, F flip,
      // B mode cycle) still apply; just the trigger changed. Wrapped in
      // a before/after snapshot so ⌘Z reverts the entire paste (ground
      // + decor + collision) in one action.
      onEditorEvent("editor:paste-at-cursor", () => {
        if (!this.blockSelection || !this.tilemap) {
          emitEditorEvent("editor:toast", { message: "Clipboard is empty — press ⌘C to copy a selection first." });
          return;
        }
        const p = this.input.activePointer;
        const tx = Math.floor((p?.worldX ?? 0) / TILE_SIZE);
        const ty = Math.floor((p?.worldY ?? 0) / TILE_SIZE);
        const { tiles } = this.blockSelection;
        const h = tiles.length;
        const w = tiles[0]?.length ?? 0;
        const cells: Array<{ x: number; y: number }> = [];
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
          const cx = tx + dx, cy = ty + dy;
          if (cx >= 0 && cx < this.tilemap.width && cy >= 0 && cy < this.tilemap.height) {
            cells.push({ x: cx, y: cy });
          }
        }
        const before = this.snapshotCells(cells);
        this.pasteBlockAt(tx, ty);
        const after = this.snapshotCells(cells);
        emitEditorEvent("editor:paste-snapshot", { before, after });
      }),
      // Replay a paste snapshot — fired when the user hits ⌘Z (restores
      // "before") or ⌘Y (reapplies "after"). Bypasses the normal paste
      // path so the emitted snapshot isn't re-added to the undo stack.
      onEditorEvent("editor:apply-paste-snapshot", (detail: { cells: Array<{ x: number; y: number; gid: number; decor: any; blocked: boolean }> } | null) => {
        if (!detail?.cells?.length || !this.tilemap) return;
        this.applyPasteSnapshot(detail.cells);
      }),
      // Backspace / Delete-selection — erases every tile currently in
      // the unified selection (ground + decor). Batched as one undo.
      onEditorEvent("editor:delete-selection", () => {
        if (!this.tilemap || !this.tintHighlights || this.tintHighlights.size === 0) return;
        this.beginPaintBatch();
        try {
          for (const key of this.tintHighlights.keys()) {
            const [xs, ys] = key.split(",");
            const x = parseInt(xs, 10);
            const y = parseInt(ys, 10);
            if (Number.isFinite(x) && Number.isFinite(y)) {
              this.eraseTileAndDecor(x, y);
            }
          }
        } finally {
          this.flushPaintBatch();
        }
      }),
      onEditorEvent("editor:clear-pending-ops", () => {
        this.clearPendingOpQueue();
      }),
      onEditorEvent("editor:commit-pending-ops", () => {
        this.commitPendingOpQueue();
      }),
      onEditorEvent("editor:export-png", () => {
        this.exportMapAsPng();
      }),
      onEditorEvent("editor:fit-map", () => {
        this.fitMapToViewport();
      }),
      // Replay a tile paint — fired when the user hits ⌘Z on a PAINT_TILE
      // action (inverse) or ⌘Y (redo). Bypasses `paintTile()` because
      // undo/redo shouldn't re-emit editor:tile-paint and double-push
      // to the undo stack.
      onEditorEvent("editor:apply-paint", (detail: { x: number; y: number; gid: number } | null) => {
        if (!detail || !this.tilemap) return;
        this.tilemap.putTileAt(detail.gid, detail.x, detail.y, false, "Ground");
      }),
      // Batched replay — same, for whole drag-paint strokes / fill-bucket.
      onEditorEvent("editor:apply-paint-batch", (detail: { changes: Array<{ x: number; y: number; gid: number }> } | null) => {
        if (!detail || !this.tilemap) return;
        for (const c of detail.changes) {
          this.tilemap.putTileAt(c.gid, c.x, c.y, false, "Ground");
        }
      }),
      // Undo/redo of a collision toggle. Bypasses toggleCollisionAt so
      // we don't re-emit editor:collision-toggle and push a duplicate
      // undo entry.
      onEditorEvent("editor:set-collision", (detail: { x: number; y: number; blocked: boolean } | null) => {
        if (!detail || !this.tilemap) return;
        const idx = detail.y * this.tilemap.width + detail.x;
        this.collisionLayerData[idx] = detail.blocked ? 1 : 0;
        const layer = this.tilemap.getLayer("Collision");
        if (layer?.tilemapLayer) {
          this.tilemap.putTileAt(detail.blocked ? 1 : 0, detail.x, detail.y, false, "Collision");
        }
        if (this.collisionVisible) this.renderCollisionOverlay();
      }),
      // Undo/redo of a selection change. Goes through setSelection
      // which rebuilds the highlight graphics, but flags the scene as
      // "replaying" so the selection-change emit is suppressed —
      // otherwise React would dispatch another SET_SELECTION and we'd
      // loop forever on each undo.
      onEditorEvent("editor:apply-selection", (detail: { tiles: Array<{ x: number; y: number }> } | null) => {
        if (!detail) return;
        this.isReplayingSelection = true;
        try {
          this.setSelection(detail.tiles);
        } finally {
          this.isReplayingSelection = false;
        }
      }),
      onEditorEvent("editor:preview-gid", (detail: { gid: number } | null) => {
        this.hoverPreviewGid = detail?.gid ?? 0;
        if (!this.hoverPreviewGid && this.hoverPreviewGhost) {
          this.hoverPreviewGhost.destroy();
          this.hoverPreviewGhost = null;
        }
        // Swatch hover also shows *where* that GID already lives on the map
        // so the user can spot existing instances before painting new ones.
        if (this.hoverPreviewGid > 0) this.renderSwatchMatchHighlights(this.hoverPreviewGid);
        else this.clearSwatchMatchHighlights();
      }),
      onEditorEvent("editor:preview-entity", (detail: { x: number; y: number } | null) => {
        if (!detail) { this.clearEntityPreview(); return; }
        this.renderEntityPreview(detail.x, detail.y);
      }),
      onEditorEvent("editor:select-tile-gid", (detail: { gid: number }) => {
        this.selectedTileGid = detail.gid;
      }),
    );
  }

  /** Switch to a different map (overworld or interior) */
  private switchMap(mapId: string): void {
    const cfg = MAP_CONFIGS[mapId];
    if (!cfg) return;

    this.currentMapId = mapId;
    MAP_WIDTH = cfg.width;
    MAP_HEIGHT = cfg.height;

    // Destroy existing tilemap layers and top sprites
    if (this.groundLayer) { this.groundLayer.destroy(); this.groundLayer = null; }
    if (this.foregroundImage) { this.foregroundImage.destroy(); this.foregroundImage = null; }
    if (this.collisionOverlay) { this.collisionOverlay.destroy(); this.collisionOverlay = null; }
    if (this.gridGraphics) { this.gridGraphics.destroy(); this.gridGraphics = null; }
    for (const s of this.topSprites) s.destroy();
    this.topSprites = [];
    for (const overlay of this.groundTintOverlays.values()) overlay.destroy();
    this.groundTintOverlays.clear();

    // Create new tilemap
    this.tilemap = this.make.tilemap({ key: cfg.key });
    const tileset = this.tilemap.addTilesetImage(cfg.tilesetName, cfg.tilesetName);
    if (tileset) {
      this.groundLayer = this.tilemap.createLayer("Ground", tileset, 0, 0);
      const collLayer = this.tilemap.getLayer("Collision");
      if (collLayer) {
        this.collisionLayerData = collLayer.data.flat().map((t) => t.index);
      }
    }

    // Top-layer sprites for interior maps (furniture, desks, stairs, etc.)
    const topKey = cfg.tilesetName.replace("_bottom", "_top");
    if (cfg.tilesetTop && this.textures.exists(topKey) && tileset) {
      const topTex = this.textures.get(topKey);
      const groundData = this.tilemap.getLayer("Ground")?.data;
      if (groundData) {
        const tW = tileset.tileWidth;
        const tH = tileset.tileHeight;
        const margin = (tileset as any).tileMargin ?? 1;
        const spacing = (tileset as any).tileSpacing ?? 2;
        const cols = tileset.columns;

        for (let ty = 0; ty < this.tilemap.height; ty++) {
          for (let tx = 0; tx < this.tilemap.width; tx++) {
            const tile = groundData[ty]?.[tx];
            if (!tile || tile.index <= 0) continue;
            const tileIdx = tile.index - 1;
            const srcCol = tileIdx % cols;
            const srcRow = Math.floor(tileIdx / cols);
            const srcX = margin + srcCol * (tW + spacing);
            const srcY = margin + srcRow * (tH + spacing);

            const frameKey = `${topKey}_${tileIdx}`;
            if (!topTex.has(frameKey)) {
              topTex.add(frameKey, 0, srcX, srcY, tW, tH);
            }

            const sprite = this.add.sprite(tx * tW + tW / 2, ty * tH + tH / 2, topKey, frameKey);
            sprite.setDepth(50 + ty);
            this.topSprites.push(sprite);
          }
        }
      }
    }

    // Foreground for this map (overworld — per-tile sprites for tinting)
    if (cfg.foreground) {
      this.createOverworldForegroundTiles();
    }

    // Update camera bounds
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    cam.centerOn((MAP_WIDTH * TILE_SIZE) / 2, (MAP_HEIGHT * TILE_SIZE) / 2);

    // Reset zoom for small maps, and fit to viewport
    if (MAP_WIDTH < 30) {
      // Calculate zoom to fit the map within the viewport with some padding
      const viewW = this.scale.width;
      const viewH = this.scale.height;
      const mapPixelW = MAP_WIDTH * TILE_SIZE;
      const mapPixelH = MAP_HEIGHT * TILE_SIZE;
      const fitZoom = Math.min(viewW / mapPixelW, viewH / mapPixelH) * 0.85;
      this.currentZoom = Math.max(2, Math.min(6, fitZoom));
      cam.setZoom(this.currentZoom);
    }

    // Clear entity markers (will be refreshed by React)
    this.refreshAllMarkers([]);
  }

  private lastEmittedTile = "";

  update(): void {
    // Update coordinate display with tile GID info
    const pointer = this.input.activePointer;
    if (!pointer) return;

    const tileX = Math.floor(pointer.worldX / TILE_SIZE);
    const tileY = Math.floor(pointer.worldY / TILE_SIZE);
    const mapW = this.tilemap?.width ?? MAP_WIDTH;
    const mapH = this.tilemap?.height ?? MAP_HEIGHT;

    // Freeze the readout while the user is mid-gesture — the tooltip
    // flashing during pan / drag-paint is noise, not signal.
    const gestureActive = this.isPanning || this.isDragPainting ||
                          this.isShiftDragging || this.isBlockDragPasting;
    if (gestureActive) return;

    // While the cursor is on an entity, the entity bubble owns the readout.
    // Don't re-emit the tile tooltip or they'll stack.
    if (this.hoveredEntityId) return;

    // Outside the map bounds OR pointer left the canvas → emit null so the
    // React hover badge disappears. We also clear the in-scene coordText.
    const inBounds = tileX >= 0 && tileX < mapW && tileY >= 0 && tileY < mapH;
    const inCanvas = pointer.x >= 0 && pointer.y >= 0 &&
                     pointer.x <= this.scale.width && pointer.y <= this.scale.height;
    if (!inBounds || !inCanvas) {
      if (this.lastEmittedTile !== "OUT") {
        this.lastEmittedTile = "OUT";
        this.coordText.setText("");
        emitEditorEvent("editor:hover-tile", null);
      }
      return;
    }

    // Get tile GID from tilemap
    let gidInfo = "";
    let groundGid = 0;
    let topSpriteAt = false;
    if (this.tilemap) {
      const groundTile = this.tilemap.getTileAt(tileX, tileY, false, "Ground");
      if (groundTile) { gidInfo = ` GID:${groundTile.index}`; groundGid = groundTile.index; }
      const isCollision = this.collisionLayerData[tileY * mapW + tileX] > 0;
      if (isCollision) gidInfo += " [BLOCKED]";
    }
    // Detect top sprite at hover
    topSpriteAt = this.topSprites.some((s) => {
      const sx = Math.floor((s.x as number) / TILE_SIZE);
      const sy = Math.floor((s.y as number) / TILE_SIZE);
      return sx === tileX && sy === tileY;
    });

    this.coordText.setText(`Tile: (${tileX}, ${tileY})${gidInfo}${topSpriteAt ? " [FG]" : ""}`);

    // Emit to React every frame the pointer is inside the map. Cheaper than
    // tracking signatures and ensures the badge reappears when the cursor
    // re-enters the canvas at the same tile it was at when leaving.
    this.lastEmittedTile = `${tileX},${tileY}`;
    emitEditorEvent("editor:hover-tile", {
      x: tileX, y: tileY, gid: groundGid, hasTopSprite: topSpriteAt,
      screenX: pointer.x, screenY: pointer.y,
    });
  }

  // --- Entity Marker Management ---

  addMarker(entity: { id: string; type: string; x: number; y: number; spriteKey?: string; iconKey?: string; speciesName?: string; movementRangeX?: number; movementRangeY?: number; pokemon?: { pokedexNumber?: number } | null }): void {
    if (this.markers.has(entity.id)) return;
    // Guard: scene display list must be initialized
    if (!this.sys?.displayList) return;

    const worldX = entity.x * TILE_SIZE + TILE_SIZE / 2;
    const worldY = entity.y * TILE_SIZE + TILE_SIZE / 2;
    const color = TYPE_COLORS[entity.type] || 0x888888;

    const container = this.add.container(worldX, worldY);
    container.setDepth(200);

    // Dark background circle for visibility on any tile
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.fillCircle(0, 0, 8);
    container.add(bg);

    // Draw shape based on type
    const shape = this.add.graphics();
    this.drawMarkerShape(shape, entity.type, color);
    container.add(shape);

    // Add sprite thumbnail if available
    let sprite: Phaser.GameObjects.Sprite | undefined;

    // Pokemon icons for wild-pokemon entities (spritesheet: 2 frames of 32x32)
    if (entity.type === "wild-pokemon" && entity.iconKey && this.textures.exists(entity.iconKey)) {
      const icon = this.add.sprite(0, -2, entity.iconKey, 0);
      icon.setScale(0.5);
      icon.setAlpha(0.9);
      container.add(icon);
    }
    // Pokemon-npc / wild-pokemon fallback to the national-dex PokeAPI
    // sprite. Texture is loaded on demand (Phaser supports runtime URL
    // loads) so every one of the 386 species can render without
    // bundling ~5 MB of PNGs in the repo.
    else if (
      (entity.type === "pokemon-npc" || entity.type === "wild-pokemon")
      && entity.pokemon && entity.pokemon.pokedexNumber
    ) {
      const dex = entity.pokemon.pokedexNumber;
      const key = `pkmn_${dex}`;
      const attach = () => {
        if (!this.textures.exists(key)) return;
        const sp = this.add.sprite(0, -4, key, 0);
        sp.setScale(0.22); // PokeAPI sprites are 96×96 — scale to ~21 px
        sp.setAlpha(0.95);
        container.add(sp);
      };
      if (this.textures.exists(key)) {
        attach();
      } else {
        this.load.image(key, `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`);
        this.load.once(`filecomplete-image-${key}`, attach);
        this.load.start();
      }
    }
    // NPC sprites
    else {
      const spriteTexKey = entity.spriteKey ? `npc_${entity.spriteKey}` : undefined;
      if (spriteTexKey && this.textures.exists(spriteTexKey)) {
        sprite = this.add.sprite(0, -4, spriteTexKey, 0);
        sprite.setScale(0.9);
        sprite.setAlpha(0.85);
        container.add(sprite);
      }
    }

    const marker: EntityMarker = {
      id: entity.id,
      type: entity.type,
      x: entity.x,
      y: entity.y,
      spriteKey: entity.spriteKey,
      movementRangeX: entity.movementRangeX,
      movementRangeY: entity.movementRangeY,
      container,
      shape,
      sprite,
    };

    this.markers.set(entity.id, marker);
  }

  private drawMarkerShape(gfx: Phaser.GameObjects.Graphics, type: string, color: number): void {
    gfx.clear();

    switch (type) {
      case "sign": // Diamond
        gfx.fillStyle(color, 1);
        gfx.fillPoints([
          new Phaser.Geom.Point(0, -5),
          new Phaser.Geom.Point(5, 0),
          new Phaser.Geom.Point(0, 5),
          new Phaser.Geom.Point(-5, 0),
        ], true);
        break;
      case "warp": // Square
        gfx.fillStyle(color, 1);
        gfx.fillRect(-4, -4, 8, 8);
        break;
      case "gate": // X mark
        gfx.lineStyle(2, color, 1);
        gfx.lineBetween(-4, -4, 4, 4);
        gfx.lineBetween(-4, 4, 4, -4);
        break;
      case "hidden-item": // Star (4-point)
        gfx.fillStyle(color, 1);
        gfx.fillPoints([
          new Phaser.Geom.Point(0, -6),
          new Phaser.Geom.Point(2, -2),
          new Phaser.Geom.Point(6, 0),
          new Phaser.Geom.Point(2, 2),
          new Phaser.Geom.Point(0, 6),
          new Phaser.Geom.Point(-2, 2),
          new Phaser.Geom.Point(-6, 0),
          new Phaser.Geom.Point(-2, -2),
        ], true);
        break;
      default: // Circle (NPC, Pokemon, Pickup, etc.)
        gfx.fillStyle(color, 1);
        gfx.fillCircle(0, 0, 5);
        gfx.lineStyle(1, 0xffffff, 0.5);
        gfx.strokeCircle(0, 0, 5);
        break;
    }
  }

  removeMarker(entityId: string): void {
    const marker = this.markers.get(entityId);
    if (marker) {
      marker.container.destroy();
      this.markers.delete(entityId);
    }
  }

  updateMarkerPosition(entityId: string, x: number, y: number): void {
    const marker = this.markers.get(entityId);
    if (marker) {
      marker.x = x;
      marker.y = y;
      marker.container.setPosition(
        x * TILE_SIZE + TILE_SIZE / 2,
        y * TILE_SIZE + TILE_SIZE / 2,
      );
    }
  }

  updateMarkerField(entityId: string, field: string, value: any): void {
    const marker = this.markers.get(entityId);
    if (!marker) return;

    if (field === "spriteKey") {
      marker.spriteKey = value;
      // Remove old sprite from container
      if (marker.sprite) {
        marker.sprite.destroy();
        marker.sprite = undefined;
      }
      // Add new sprite
      const texKey = `npc_${value}`;
      if (this.textures.exists(texKey)) {
        const sprite = this.add.sprite(0, -4, texKey, 0);
        sprite.setScale(0.9);
        sprite.setAlpha(0.85);
        marker.container.add(sprite);
        marker.sprite = sprite;
      }
    }

    if (field === "facingDirection") {
      // Facing maps to sprite frame: down=0, up=1, left=2, right=3 (standard GBA layout)
      const frameMap: Record<string, number> = { down: 0, up: 1, left: 2, right: 3 };
      const frame = frameMap[value] ?? 0;
      if (marker.sprite) {
        const tex = marker.sprite.texture;
        if (frame < tex.frameTotal) {
          marker.sprite.setFrame(frame);
        }
      }
    }
  }

  selectEntity(entityId: string): void {
    this.clearSelection();
    this.selectedId = entityId;

    const marker = this.markers.get(entityId);
    if (!marker) return;

    // White selection ring
    const ring = this.add.graphics();
    ring.lineStyle(2, 0xffffff, 1);
    ring.strokeCircle(0, 0, 10);
    marker.container.add(ring);
    marker.selectionRing = ring;

    // Pulse animation
    this.tweens.add({
      targets: ring,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Don't auto-center camera — user controls the viewport.
    // Use JUMP_TO_TILE event explicitly when camera movement is desired.
  }

  clearSelection(): void {
    if (this.selectedId) {
      const marker = this.markers.get(this.selectedId);
      if (marker?.selectionRing) {
        this.tweens.killTweensOf(marker.selectionRing);
        marker.selectionRing.destroy();
        marker.selectionRing = undefined;
      }
      this.selectedId = null;
    }
  }

  refreshAllMarkers(entities: any[]): void {
    // Clear existing
    for (const marker of this.markers.values()) {
      marker.container.destroy();
    }
    this.markers.clear();
    this.selectedId = null;

    // Add all
    for (const e of entities) {
      this.addMarker(e);
    }
  }

  /** Apply a single tile tint immediately (from the popup). */
  /**
   * Render the Mauville foreground PNG as individual 16x16 tile sprites
   * so each non-transparent tile can be independently tinted. Mirrors
   * OverworldScene.createForegroundTiles.
   */
  /**
   * Render decor pixels from the ground tileset (trees/fences/rocks/flowers)
   * as per-tile sprites on top of the grass-only tilemap. For each position in
   * the Ground layer, look up the tile's GID → tileset (srcX, srcY), then check
   * if mauville_bottom_decor.png has non-transparent pixels at that location.
   * If yes, create a sprite at the world position so this decor can be tinted
   * independently of the underlying grass.
   */
  private createOverworldGroundDecor(): void {
    if (!this.tilemap) return;
    const decorKey = "mauville_bottom_decor";
    if (!this.textures.exists(decorKey)) return;
    const decorTex = this.textures.get(decorKey);
    const source = decorTex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;

    // Canvas for alpha-reading
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source as CanvasImageSource, 0, 0);

    // Tileset layout (from mauville.json)
    const tileset = this.tilemap.getTileset("mauville_bottom");
    if (!tileset) return;
    const margin = (tileset as any).tileMargin ?? 1;
    const spacing = (tileset as any).tileSpacing ?? 2;
    const cols = tileset.columns;
    const firstgid = tileset.firstgid;

    const groundLayer = this.tilemap.getLayer("Ground");
    if (!groundLayer) return;

    for (let ty = 0; ty < this.tilemap.height; ty++) {
      for (let tx = 0; tx < this.tilemap.width; tx++) {
        const tile = groundLayer.data[ty]?.[tx];
        if (!tile || tile.index <= 0) continue;
        const localGid = tile.index - firstgid;
        if (localGid < 0) continue;
        const srcCol = localGid % cols;
        const srcRow = Math.floor(localGid / cols);
        const srcX = margin + srcCol * (TILE_SIZE + spacing);
        const srcY = margin + srcRow * (TILE_SIZE + spacing);

        if (srcX < 0 || srcY < 0 || srcX + TILE_SIZE > source.width || srcY + TILE_SIZE > source.height) continue;

        // Check if decor PNG has any non-transparent pixels at this tileset position
        const imgData = ctx.getImageData(srcX, srcY, TILE_SIZE, TILE_SIZE);
        let hasContent = false;
        for (let i = 3; i < imgData.data.length; i += 4) {
          if (imgData.data[i] > 0) { hasContent = true; break; }
        }
        if (!hasContent) continue;

        // Create a texture frame for this GID (dedupe across tiles of same type)
        const frameKey = `gd_${localGid}`;
        if (!decorTex.has(frameKey)) {
          decorTex.add(frameKey, 0, srcX, srcY, TILE_SIZE, TILE_SIZE);
        }

        // Sprite at world position (center origin for rotation compat)
        const sprite = this.add.sprite(
          tx * TILE_SIZE + TILE_SIZE / 2,
          ty * TILE_SIZE + TILE_SIZE / 2,
          decorKey,
          frameKey,
        );
        // Depth: just above ground (0) but below foreground sprites (100+)
        sprite.setDepth(50 + ty);
        this.topSprites.push(sprite);
      }
    }
  }

  private createOverworldForegroundTiles(): void {
    const fgKey = "mauville_bottom_fg";
    if (!this.textures.exists(fgKey)) return;
    const fgTexture = this.textures.get(fgKey);
    const source = fgTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;

    // Canvas to read alpha
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source as CanvasImageSource, 0, 0);
    const mapW = Math.floor(source.width / TILE_SIZE);
    const mapH = Math.floor(source.height / TILE_SIZE);

    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        const imgData = ctx.getImageData(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        let hasContent = false;
        for (let i = 3; i < imgData.data.length; i += 4) {
          if (imgData.data[i] > 0) { hasContent = true; break; }
        }
        if (!hasContent) continue;

        const frameKey = `fg_${tx}_${ty}`;
        if (!fgTexture.has(frameKey)) {
          fgTexture.add(frameKey, 0, tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
        // Use CENTER origin so (x, y) in tile coords reflects sprite center
        const sprite = this.add.sprite(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2, fgKey, frameKey);
        sprite.setDepth(100 + ty);
        sprite.setVisible(this.foregroundVisible);
        this.topSprites.push(sprite);
      }
    }
  }

  /**
   * Unified tile selection — one Set drives the inspector + every batch
   * op (tint sliders, collision toggle, copy, delete, rotate/flip). The
   * `tintHighlights` name is kept for backwards-compat with a few call
   * sites but the concept is "selected tiles". Every mutation emits
   * `editor:selection-change` so React's inspector can mirror it.
   */
  showTintHighlight(x: number, y: number): void {
    this.clearTintHighlight();
    this.addTintHighlight(x, y);
  }

  addTintHighlight(x: number, y: number): void {
    if (!this.sys?.displayList) return;
    const key = `${x},${y}`;
    if (this.tintHighlights.has(key)) return;
    const g = this.add.graphics();
    g.setDepth(999);
    const cx = x * TILE_SIZE + TILE_SIZE / 2;
    const cy = y * TILE_SIZE + TILE_SIZE / 2;
    g.setPosition(cx, cy);
    g.lineStyle(2, 0xffd700, 1);
    g.strokeRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xffd700, 0.15);
    g.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    const tween = this.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0.4 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tintHighlights.set(key, { gfx: g, tween });
    this.emitSelectionChange();
  }

  /** Toggle a tile's selection state (shift+click). */
  toggleTileInSelection(x: number, y: number): void {
    const key = `${x},${y}`;
    if (this.tintHighlights.has(key)) {
      const entry = this.tintHighlights.get(key)!;
      entry.tween.destroy();
      entry.gfx.destroy();
      this.tintHighlights.delete(key);
      this.emitSelectionChange();
    } else {
      this.addTintHighlight(x, y);
    }
  }

  /** Replace selection with an arbitrary list of tiles. */
  setSelection(tiles: { x: number; y: number }[]): void {
    for (const { gfx, tween } of this.tintHighlights.values()) {
      tween.destroy();
      gfx.destroy();
    }
    this.tintHighlights.clear();
    for (const t of tiles) this.addTintHighlight(t.x, t.y);
    // addTintHighlight emits selection-change each call; extra emit here
    // ensures the final state is broadcast even for empty input.
    if (tiles.length === 0) this.emitSelectionChange();
  }

  clearTintHighlight(): void {
    for (const { gfx, tween } of this.tintHighlights.values()) {
      tween.destroy();
      gfx.destroy();
    }
    this.tintHighlights.clear();
    this.emitSelectionChange();
  }

  /**
   * Suppresses `editor:selection-change` emission while the scene is
   * in the middle of replaying an undo/redo. Without this, the React
   * dispatcher would see the replay as a fresh user selection and
   * push a duplicate SET_SELECTION onto the undo stack, creating
   * an infinite loop.
   */
  private isReplayingSelection = false;

  /** Emit the full selection list so React can mirror it. */
  private emitSelectionChange(): void {
    if (this.isReplayingSelection) return;
    const tiles: { x: number; y: number; layer: "ground" | "top"; origin?: "replay" }[] = [];
    for (const key of this.tintHighlights.keys()) {
      const [xs, ys] = key.split(",");
      const x = parseInt(xs, 10);
      const y = parseInt(ys, 10);
      const hasTop = this.topSprites.some((s) =>
        Math.floor((s.x as number) / TILE_SIZE) === x &&
        Math.floor((s.y as number) / TILE_SIZE) === y,
      );
      tiles.push({ x, y, layer: hasTop ? "top" : "ground" });
    }
    emitEditorEvent("editor:selection-change", { tiles });
  }

  /**
   * Apply an HSL adjustment to a single tile.
   *
   * Uses Phaser's `preFX.addColorMatrix()` pipeline for true HSL — hue
   * rotation, desaturation, and brightening all work (unlike the legacy
   * multiplicative `setTint`). For ground tiles, an overlay sprite is
   * created on demand since tilemap layers share one FX pipeline.
   *
   * Pass `adj = null` to clear any tint at (x, y).
   */
  applySingleTileTint(
    x: number,
    y: number,
    layer: string,
    adj: TintAdjust | null,
    extra?: { rot?: number; flipX?: boolean; flipY?: boolean },
  ): void {
    if (layer === "top") {
      for (const s of this.topSprites) {
        const sx = Math.floor((s.x as number) / TILE_SIZE);
        const sy = Math.floor((s.y as number) / TILE_SIZE);
        if (sx === x && sy === y) {
          applyAdjustToFX(s, adj);
          s.setAngle(extra?.rot ?? 0);
          s.setFlip(extra?.flipX ?? false, extra?.flipY ?? false);
          // NO BREAK — apply to every matching sprite (ground-decor + foreground)
        }
      }
      return;
    }

    if (layer === "ground" && this.tilemap) {
      const key = `${x},${y}`;
      if (!adj) {
        // Remove overlay and restore the underlying tile
        const existing = this.groundTintOverlays.get(key);
        if (existing) { existing.destroy(); this.groundTintOverlays.delete(key); }
        const tile = this.tilemap.getTileAt(x, y, false, "Ground");
        if (tile) { tile.alpha = 1; tile.flipX = false; tile.flipY = false; }
        return;
      }
      // Ensure we have an overlay sprite covering this tile
      let overlay: Phaser.GameObjects.Sprite | null = this.groundTintOverlays.get(key) ?? null;
      if (!overlay) {
        overlay = this.createGroundTintOverlay(x, y);
        if (overlay) this.groundTintOverlays.set(key, overlay);
      }
      const tile = this.tilemap.getTileAt(x, y, false, "Ground");
      if (!overlay) {
        // Couldn't build an overlay — fall back to the multiplier on the tile.
        if (tile) tile.alpha = adj.a ?? 1;
        return;
      }
      // Hide the underlying tile so the overlay is the only thing visible.
      if (tile) tile.alpha = 0;
      applyAdjustToFX(overlay, adj);
      overlay.setAngle(extra?.rot ?? 0);
      overlay.setFlip(extra?.flipX ?? false, extra?.flipY ?? false);
    }
  }

  /**
   * Build a sprite that mirrors the ground tile at (x, y), used as a
   * per-tile surface for preFX manipulation. Returns null if the tile is
   * empty or the tileset texture isn't loaded.
   */
  private createGroundTintOverlay(x: number, y: number): Phaser.GameObjects.Sprite | null {
    if (!this.tilemap) return null;
    const tile = this.tilemap.getTileAt(x, y, false, "Ground");
    if (!tile || tile.index <= 0) return null;
    const cfg = MAP_CONFIGS[this.currentMapId];
    if (!cfg) return null;
    const tilesetKey = cfg.tilesetName;
    const texture = this.textures.get(tilesetKey);
    if (!texture || !texture.getSourceImage) return null;

    const tileset = this.tilemap.getTileset(tilesetKey);
    if (!tileset) return null;
    const margin = (tileset as unknown as { tileMargin?: number }).tileMargin ?? 0;
    const spacing = (tileset as unknown as { tileSpacing?: number }).tileSpacing ?? 0;
    const cols = tileset.columns;
    const firstgid = tileset.firstgid;
    const localGid = tile.index - firstgid;
    if (localGid < 0 || cols <= 0) return null;
    const srcCol = localGid % cols;
    const srcRow = Math.floor(localGid / cols);
    const srcX = margin + srcCol * (TILE_SIZE + spacing);
    const srcY = margin + srcRow * (TILE_SIZE + spacing);

    const frameKey = `gt_${localGid}`;
    if (!texture.has(frameKey)) {
      texture.add(frameKey, 0, srcX, srcY, TILE_SIZE, TILE_SIZE);
    }
    const sprite = this.add.sprite(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE + TILE_SIZE / 2,
      tilesetKey,
      frameKey,
    );
    // Depth: sit just above the ground tilemap (which is at depth 0) but
    // below ground-decor sprites (depth 50+) so decor still renders above.
    sprite.setDepth(10 + y);
    return sprite;
  }

  /**
   * Re-apply all stored tints for the current map. Called after map
   * switch or after any change to `state.tileTints`. React stashes the
   * resolved HSL adjusts on `window.__EDITOR_TILE_TINTS__` then fires
   * `editor:refresh-tints`.
   *
   * Entries on window are `{ adjust: TintAdjust, rot?, flipX?, flipY? }`.
   */
  refreshAllTints(): void {
    const tints = (window as unknown as { __EDITOR_TILE_TINTS__?: Record<string, { adjust: TintAdjust; rot?: number; flipX?: boolean; flipY?: boolean }> }).__EDITOR_TILE_TINTS__ || {};
    const mapId = this.currentMapId;
    const prefix = mapId === "mauville" ? "overworld:" : `${mapId}:`;

    // Reset every top sprite.
    for (const s of this.topSprites) {
      applyAdjustToFX(s, null);
      s.setAngle(0);
      s.setFlip(false, false);
    }
    // Tear down every ground overlay and restore the tiles beneath.
    for (const [key, overlay] of this.groundTintOverlays) {
      overlay.destroy();
      const [xs, ys] = key.split(",");
      const x = parseInt(xs, 10);
      const y = parseInt(ys, 10);
      const tile = this.tilemap?.getTileAt(x, y, false, "Ground");
      if (tile) { tile.alpha = 1; tile.flipX = false; tile.flipY = false; }
    }
    this.groundTintOverlays.clear();

    // Re-apply from stored tints.
    for (const key in tints) {
      if (!key.startsWith(prefix)) continue;
      const [, layer, xy] = key.split(":");
      const [xs, ys] = xy.split(",");
      const x = parseInt(xs, 10);
      const y = parseInt(ys, 10);
      const entry = tints[key];
      if (!entry || !entry.adjust) continue;
      this.applySingleTileTint(x, y, layer, entry.adjust, {
        rot: entry.rot,
        flipX: entry.flipX,
        flipY: entry.flipY,
      });
    }
  }

  // --- Overlays ---

  toggleLayer(layer: string, visible: boolean): void {
    switch (layer) {
      case "ground":
        if (this.groundLayer) this.groundLayer.setVisible(visible);
        break;
      case "collision":
        this.collisionVisible = visible;
        this.renderCollisionOverlay();
        break;
      case "foreground":
        this.foregroundVisible = visible;
        // Control per-tile foreground sprites (which replaced the single image).
        // Only sprites rendered for the overworld Mauville foreground respond here;
        // interior map top sprites (furniture) are kept always visible since they
        // aren't a "foreground layer" conceptually.
        if (this.currentMapId === "mauville") {
          for (const s of this.topSprites) s.setVisible(visible);
        }
        if (this.foregroundImage) this.foregroundImage.setVisible(visible);
        break;
      case "grid":
        this.gridVisible = visible;
        this.renderGrid();
        break;
      case "entities":
        for (const marker of this.markers.values()) {
          marker.container.setVisible(visible);
        }
        break;
      case "movement":
        this.movementVisible = visible;
        this.renderMovementRanges();
        break;
    }
  }

  private renderMovementRanges(): void {
    if (this.movementGraphics) {
      this.movementGraphics.destroy();
      this.movementGraphics = null;
    }
    if (!this.movementVisible) return;

    this.movementGraphics = this.add.graphics();
    this.movementGraphics.setDepth(150);

    for (const marker of this.markers.values()) {
      const rangeX = marker.movementRangeX || 0;
      const rangeY = marker.movementRangeY || 0;
      if (rangeX === 0 && rangeY === 0) continue;

      const cx = marker.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = marker.y * TILE_SIZE + TILE_SIZE / 2;
      const rx = rangeX * TILE_SIZE;
      const ry = rangeY * TILE_SIZE;

      this.movementGraphics.lineStyle(1, 0x4a9eed, 0.4);
      this.movementGraphics.strokeRect(cx - rx, cy - ry, rx * 2, ry * 2);
    }
  }

  private renderGrid(): void {
    if (this.gridGraphics) {
      this.gridGraphics.destroy();
      this.gridGraphics = null;
    }
    if (!this.gridVisible) return;

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(50);
    this.gridGraphics.lineStyle(0.5, 0xffffff, 0.1);

    for (let x = 0; x <= MAP_WIDTH; x++) {
      this.gridGraphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    }
    for (let y = 0; y <= MAP_HEIGHT; y++) {
      this.gridGraphics.lineBetween(0, y * TILE_SIZE, MAP_WIDTH * TILE_SIZE, y * TILE_SIZE);
    }
  }

  private renderCollisionOverlay(): void {
    if (this.collisionOverlay) {
      this.collisionOverlay.destroy();
      this.collisionOverlay = null;
    }
    if (!this.collisionVisible || this.collisionLayerData.length === 0) return;

    this.collisionOverlay = this.add.graphics();
    this.collisionOverlay.setDepth(80);
    this.collisionOverlay.fillStyle(0xff0000, 0.25);

    for (let i = 0; i < this.collisionLayerData.length; i++) {
      if (this.collisionLayerData[i] > 0) {
        const x = i % MAP_WIDTH;
        const y = Math.floor(i / MAP_WIDTH);
        this.collisionOverlay.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // --- Drag Ghost ---

  private updateDragGhost(tileX: number, tileY: number): void {
    if (!this.dragGhost) {
      this.dragGhost = this.add.graphics();
      this.dragGhost.setDepth(500);
    }
    this.dragGhost.clear();
    // Target tile highlight — green for safe, pulsing
    const color = this.dragEntityId ? (TYPE_COLORS[this.markers.get(this.dragEntityId)?.type || ""] || 0x4a9eed) : 0x4a9eed;
    this.dragGhost.fillStyle(color, 0.35);
    this.dragGhost.fillRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    this.dragGhost.lineStyle(2, 0xffffff, 0.9);
    this.dragGhost.strokeRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    // Also move the entity marker to follow cursor
    if (this.dragEntityId) {
      const marker = this.markers.get(this.dragEntityId);
      if (marker) {
        marker.container.setPosition(tileX * TILE_SIZE + TILE_SIZE / 2, tileY * TILE_SIZE + TILE_SIZE / 2);
        marker.container.setAlpha(0.7);
      }
    }
  }

  private clearDragGhost(): void {
    if (this.dragGhost) {
      this.dragGhost.destroy();
      this.dragGhost = null;
    }
    // Restore original marker opacity
    if (this.dragEntityId) {
      const marker = this.markers.get(this.dragEntityId);
      if (marker) marker.container.setAlpha(1);
    }
  }

  // --- Tooltip ---

  private showTooltip(marker: EntityMarker, worldX: number, worldY: number): void {
    this.hideTooltip();

    const container = this.add.container(worldX + 12, worldY - 8);
    container.setDepth(999);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(0, 0, 140, 36, 4);
    container.add(bg);

    const label = this.add.text(6, 4, marker.id, {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ffffff",
    });
    container.add(label);

    const typeLabel = this.add.text(6, 18, `${marker.type} (${marker.x}, ${marker.y})`, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#aaaaaa",
    });
    container.add(typeLabel);

    this.hoverTooltip = container;
  }

  private hideTooltip(): void {
    if (this.hoverTooltip) {
      this.hoverTooltip.destroy();
      this.hoverTooltip = null;
    }
  }

  // --- Cleanup ---

  shutdown(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    for (const marker of this.markers.values()) {
      marker.container.destroy();
    }
    this.markers.clear();
  }
}
