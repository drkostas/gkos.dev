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
  // Block copy/paste state
  private blockSelection: { startX: number; startY: number; endX: number; endY: number; tiles: number[][] } | null = null;
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
   * Hover-preview ghost — when the user hovers over a swatch in the React
   * panel, we paint a translucent thumbnail of that GID at the cursor's
   * tile position so they can see where it would land.
   */
  private hoverPreviewGhost: Phaser.GameObjects.Sprite | null = null;
  private hoverPreviewGid: number = 0;

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
    // under the cursor stays in place while the rest scales around it.
    // Standard pattern in Figma/Adobe; ours used to zoom to the camera
    // center which forced zoom-then-pan cycles.
    this.input.on("wheel", (pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const factor = deltaY > 0 ? (1 - ZOOM_SPEED) : (1 + ZOOM_SPEED);
      const oldZoom = this.currentZoom;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));
      if (newZoom === oldZoom) return;
      // World point under the cursor before zoom
      const wx = pointer.worldX;
      const wy = pointer.worldY;
      this.currentZoom = newZoom;
      cam.setZoom(newZoom);
      // After zoom, compute the new scrollX/Y so (wx, wy) lands at the
      // same screen position as before. screenX = (wx - scrollX) * zoom
      cam.scrollX = wx - pointer.x / newZoom;
      cam.scrollY = wy - pointer.y / newZoom;
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

      // Alt: erase the starting tile immediately + enter drag-erase
      if (altDown && this.tilemap && inBounds) {
        this.tilemap.putTileAt(0, tileX, tileY, false, "Ground");
        emitEditorEvent("editor:tile-paint", { x: tileX, y: tileY, gid: 0 });
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
          this.tilemap.putTileAt(this.selectedTileGid, tileX, tileY, false, "Ground");
          emitEditorEvent("editor:tile-paint", { x: tileX, y: tileY, gid: this.selectedTileGid });
          this.isDragPainting = true;
          this.dragPaintMode = "paint";
          this.dragPaintVisited.clear();
          this.dragPaintVisited.add(`${tileX},${tileY}`);
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

      if (hitEntity) {
        emitEditorEvent(ENTITY_CLICKED, {
          entityId: hitEntity.id,
          entityType: hitEntity.type,
          x: hitEntity.x,
          y: hitEntity.y,
        });
        // Already-selected entity: drag on pointermove
        if (this.selectedId === hitEntity.id) {
          this.isDragging = true;
          this.dragEntityId = hitEntity.id;
          const dragMarker = this.markers.get(hitEntity.id);
          if (dragMarker) dragMarker.container.setAlpha(0.3);
          emitEditorEvent(DRAG_START, { entityId: hitEntity.id });
        }
        return;
      }

      // Plain click on tile: pick GID (eyedropper), remember as most-recent
      // for tint popup, and defer so drag still pans.
      if (this.tilemap) {
        deferToolClick(() => {
          const tile = this.tilemap!.getTileAt(tileX, tileY, false, "Ground");
          if (tile) {
            this.selectedTileGid = tile.index;
            this.lastClickedTile = { x: tileX, y: tileY };
            emitEditorEvent("editor:tile-eyedrop", { gid: tile.index, x: tileX, y: tileY });
            emitEditorEvent("editor:tile-selected", { x: tileX, y: tileY });
          }
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
              this.tilemap.putTileAt(this.selectedTileGid, tx, ty, false, "Ground");
              emitEditorEvent("editor:tile-paint", { x: tx, y: ty, gid: this.selectedTileGid });
            } else if (this.dragPaintMode === "erase") {
              this.tilemap.putTileAt(0, tx, ty, false, "Ground");
              emitEditorEvent("editor:tile-paint", { x: tx, y: ty, gid: 0 });
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
        emitEditorEvent(ENTITY_HOVERED, {
          entityId: hoveredEntity.id,
          entityType: hoveredEntity.type,
          x: hoveredEntity.x,
          y: hoveredEntity.y,
        });
      } else {
        this.hideTooltip();
        emitEditorEvent(ENTITY_HOVERED, null);
      }
    });

    // Handle block selection end
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.isShiftDragging && this.shiftDragStart && this.tilemap) {
        const endX = Math.floor(p.worldX / TILE_SIZE);
        const endY = Math.floor(p.worldY / TILE_SIZE);
        const sx = Math.min(this.shiftDragStart.x, endX);
        const sy = Math.min(this.shiftDragStart.y, endY);
        const w = Math.abs(endX - this.shiftDragStart.x) + 1;
        const h = Math.abs(endY - this.shiftDragStart.y) + 1;

        // Single-tile Shift+click in the unified Edit mode: add the tile
        // to the tint multi-selection. The user can then press T (or
        // change a slider if the popup is open) to tint every highlighted
        // tile at once. A 2×2+ drag still produces a block selection.
        if (w === 1 && h === 1) {
          this.isShiftDragging = false;
          this.shiftDragStart = null;
          const hasTopSprite = this.topSprites.some((spr) => {
            const ssx = Math.floor((spr.x as number) / TILE_SIZE);
            const ssy = Math.floor((spr.y as number) / TILE_SIZE);
            return ssx === sx && ssy === sy;
          });
          const layer = hasTopSprite ? "top" : "ground";
          this.addTintHighlight(sx, sy);
          this.lastClickedTile = { x: sx, y: sy };
          emitEditorEvent("editor:tint-click", {
            x: sx, y: sy, layer,
            screenX: p.x, screenY: p.y,
            append: true,
          });
          return;
        }

        // Capture tile GIDs in the selected region
        const tiles: number[][] = [];
        for (let dy = 0; dy < h; dy++) {
          const row: number[] = [];
          for (let dx = 0; dx < w; dx++) {
            const tile = this.tilemap.getTileAt(sx + dx, sy + dy, false, "Ground");
            row.push(tile?.index || 0);
          }
          tiles.push(row);
        }

        this.blockSelection = { startX: sx, startY: sy, endX: sx + w - 1, endY: sy + h - 1, tiles };
        this.isShiftDragging = false;
        this.shiftDragStart = null;

        // Auto-switch to stamp tool for pasting
        this.currentTool = "stamp";
        emitEditorEvent("editor:set-tool", { tool: "stamp" });
        emitEditorEvent("editor:block-copied", { width: w, height: h, tileCount: w * h });
        this.emitBlockStatus();
        return;
      }
      // End drag-paint (stamp/eraser continuous drag)
      if (this.isDragPainting) {
        this.isDragPainting = false;
        this.dragPaintMode = null;
        this.dragPaintVisited.clear();
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
      this.emitBlockStatus();
      // Force a ghost redraw — its cached tile is still valid but width/height changed.
      this.blockGhostTile = { x: -1, y: -1 };
    });
    this.input.keyboard?.on("keydown-F", (event: KeyboardEvent) => {
      if (!this.blockSelection || isTypingInField()) return;
      if (event.shiftKey) {
        this.blockSelection.tiles = EditorScene.flipBlockY(this.blockSelection.tiles);
      } else {
        this.blockSelection.tiles = EditorScene.flipBlockX(this.blockSelection.tiles);
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
    // Zoom presets — 0 fits the map, 1 snaps to 100% (1× world = 1× screen),
    // +/- step. The scroll wheel still does smooth zoom.
    this.input.keyboard?.on("keydown-ZERO", () => {
      if (isTypingInField()) return;
      this.fitMapToViewport();
    });
    this.input.keyboard?.on("keydown-ONE", () => {
      if (isTypingInField()) return;
      this.currentZoom = 1;
      cam.setZoom(1);
      this.syncAutoPixelGrid();
    });
    this.input.keyboard?.on("keydown-PLUS", () => this.stepZoom(1.25));
    this.input.keyboard?.on("keydown-EQUALS", () => this.stepZoom(1.25));
    this.input.keyboard?.on("keydown-MINUS", () => this.stepZoom(0.8));
    this.input.keyboard?.on("keydown-W", () => {
      if (isTypingInField()) return;
      this.magicWandSelectByGid();
    });
  }

  /** Zoom step helper — respects clamp + refreshes the auto pixel grid. */
  private stepZoom(factor: number): void {
    const cam = this.cameras.main;
    this.currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.currentZoom * factor));
    cam.setZoom(this.currentZoom);
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
   * Magic wand: when the last-clicked tile's GID is known, highlight every
   * tile on the Ground layer that shares it. The highlights piggy-back on
   * the tint multi-select so pressing T then moving sliders tints all of
   * them in one go.
   */
  private magicWandSelectByGid(): void {
    if (!this.tilemap || !this.lastClickedTile) return;
    const target = this.tilemap.getTileAt(this.lastClickedTile.x, this.lastClickedTile.y, false, "Ground");
    if (!target) return;
    const targetGid = target.index;
    this.clearTintHighlight();
    const ground = this.tilemap.getLayer("Ground");
    if (!ground) return;
    let count = 0;
    for (let y = 0; y < this.tilemap.height; y++) {
      for (let x = 0; x < this.tilemap.width; x++) {
        const t = ground.data[y]?.[x];
        if (t && t.index === targetGid) {
          this.addTintHighlight(x, y);
          emitEditorEvent("editor:tint-click", {
            x, y, layer: "ground",
            screenX: window.innerWidth / 2, screenY: window.innerHeight / 2,
            append: count > 0, // first click opens popup, rest append
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
    if (!tile || !this.tilemap) return;
    const hasTopSprite = this.topSprites.some((s) => {
      const sx = Math.floor((s.x as number) / TILE_SIZE);
      const sy = Math.floor((s.y as number) / TILE_SIZE);
      return sx === tile.x && sy === tile.y;
    });
    const layer = hasTopSprite ? "top" : "ground";
    this.showTintHighlight(tile.x, tile.y);
    emitEditorEvent("editor:tint-click", {
      x: tile.x, y: tile.y, layer,
      screenX: window.innerWidth / 2, screenY: window.innerHeight / 2,
      append: false,
    });
  }

  /** Rotate a tile grid 90° clockwise. */
  private static rotateBlock90(m: number[][]): number[][] {
    const h = m.length;
    const w = m[0]?.length ?? 0;
    const out: number[][] = [];
    for (let y = 0; y < w; y++) {
      const row: number[] = new Array(h);
      for (let x = 0; x < h; x++) row[x] = m[h - 1 - x][y];
      out.push(row);
    }
    return out;
  }

  /** Mirror a tile grid along its vertical axis (left ↔ right). */
  private static flipBlockX(m: number[][]): number[][] {
    return m.map((row) => [...row].reverse());
  }

  /** Mirror a tile grid along its horizontal axis (top ↔ bottom). */
  private static flipBlockY(m: number[][]): number[][] {
    return [...m].reverse();
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
    emitEditorEvent("editor:block-status", {
      width: rows[0]?.length ?? 0,
      height: rows.length,
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
        this.tilemap.putTileAt(this.selectedTileGid, x, y, false, "Ground");
        emitEditorEvent("editor:tile-paint", { x, y, gid: this.selectedTileGid });
      } else if (mode === "erase") {
        this.tilemap.putTileAt(0, x, y, false, "Ground");
        emitEditorEvent("editor:tile-paint", { x, y, gid: 0 });
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
    while (stack.length && painted < MAX_CELLS) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const t = this.tilemap.getTileAt(x, y, false, "Ground");
      if (!t || t.index !== targetGid) continue;
      this.tilemap.putTileAt(replacementGid, x, y, false, "Ground");
      emitEditorEvent("editor:tile-paint", { x, y, gid: replacementGid });
      painted++;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  /** Paste the current stamp block at (tileX, tileY). Skips zero gids. */
  private pasteBlockAt(tileX: number, tileY: number): void {
    if (!this.blockSelection || !this.tilemap) return;
    const { tiles } = this.blockSelection;
    for (let dy = 0; dy < tiles.length; dy++) {
      for (let dx = 0; dx < tiles[dy].length; dx++) {
        if (tiles[dy][dx] > 0) {
          this.tilemap.putTileAt(tiles[dy][dx], tileX + dx, tileY + dy, false, "Ground");
        }
      }
    }
    emitEditorEvent("editor:block-pasted", {
      x: tileX, y: tileY,
      w: tiles[0].length, h: tiles.length,
    });
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
      onEditorEvent("editor:clear-block-selection", () => {
        this.blockSelection = null;
        if (this.blockSelectionGraphics) {
          this.blockSelectionGraphics.destroy();
          this.blockSelectionGraphics = null;
        }
        this.clearBlockGhost();
        this.emitBlockStatus();
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
      onEditorEvent("editor:preview-gid", (detail: { gid: number } | null) => {
        this.hoverPreviewGid = detail?.gid ?? 0;
        if (!this.hoverPreviewGid && this.hoverPreviewGhost) {
          this.hoverPreviewGhost.destroy();
          this.hoverPreviewGhost = null;
        }
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

  addMarker(entity: { id: string; type: string; x: number; y: number; spriteKey?: string; iconKey?: string; speciesName?: string; movementRangeX?: number; movementRangeY?: number }): void {
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

  /** Reset all highlights and draw one at (x, y). */
  showTintHighlight(x: number, y: number): void {
    this.clearTintHighlight();
    this.addTintHighlight(x, y);
  }

  /** Add a highlight at (x, y) without clearing existing ones (multi-select). */
  addTintHighlight(x: number, y: number): void {
    if (!this.sys?.displayList) return;
    const key = `${x},${y}`;
    if (this.tintHighlights.has(key)) return; // already highlighted
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
  }

  clearTintHighlight(): void {
    for (const { gfx, tween } of this.tintHighlights.values()) {
      tween.destroy();
      gfx.destroy();
    }
    this.tintHighlights.clear();
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
