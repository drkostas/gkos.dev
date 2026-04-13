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
  ADD_ENTITY_MARKER,
  REMOVE_ENTITY_MARKER,
  JUMP_TO_TILE,
  REFRESH_ENTITIES,
  SWITCH_MAP,
  SET_TOOL,
} from "../editor/EditorEvents";

const TILE_SIZE = 16;
let MAP_WIDTH = 140;
let MAP_HEIGHT = 120;

interface MapConfig {
  key: string;
  mapJson: string;
  tilesetName: string;
  tilesetImage: string;
  foreground?: string;
  width: number;
  height: number;
}

const MAP_CONFIGS: Record<string, MapConfig> = {
  mauville: { key: "mauville-map", mapJson: "/game/maps/mauville.json", tilesetName: "mauville_bottom", tilesetImage: "/game/tilesets/mauville_bottom.png", foreground: "/game/maps/mauville_foreground.png", width: 140, height: 120 },
  pokecenter: { key: "pokecenter-map", mapJson: "/game/maps/pokecenter.json", tilesetName: "pokecenter_bottom", tilesetImage: "/game/tilesets/pokecenter_bottom.png", width: 14, height: 9 },
  mart: { key: "mart-map", mapJson: "/game/maps/mart.json", tilesetName: "mart_bottom", tilesetImage: "/game/tilesets/mart_bottom.png", width: 11, height: 8 },
  gym: { key: "gym-map", mapJson: "/game/maps/gym.json", tilesetName: "gym_bottom", tilesetImage: "/game/tilesets/gym_bottom.png", width: 10, height: 21 },
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
  private spaceDown: boolean = false;
  private isDragging: boolean = false;
  private dragEntityId: string | null = null;
  private dragGhost: Phaser.GameObjects.Graphics | null = null;
  private dragTimer: ReturnType<typeof setTimeout> | null = null;
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
  private foregroundVisible: boolean = true;
  private hoverTooltip: Phaser.GameObjects.Container | null = null;
  private unsubscribers: (() => void)[] = [];
  private selectedTileGid: number = 0;
  private currentTool: string = "select";

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
    }

    // NPC spritesheets (144x32, 9 frames of 16x32)
    const npcSprites = [
      "boy_3", "school_kid_m", "rich_boy", "maniac", "woman_4", "fat_man",
      "item_ball", "lass", "fisherman", "woman_2", "youngster", "girl_2",
      "man_1", "pokefan_f", "snorlax", "aqua_member_m", "poochyena_ow",
      "magma_member_m", "aqua_member_f", "magma_member_f", "slakoth",
      "slaking", "old_man",
    ];
    for (const key of npcSprites) {
      this.load.spritesheet(`npc_${key}`, `/game/sprites/emerald/${key}.png`, {
        frameWidth: 16,
        frameHeight: 32,
      });
    }

    // Pokemon icon sprites (from /game/sprites/pokemon/icons/)
    const pokemonIcons = [
      "absol", "aggron", "altaria", "banette", "blaziken", "breloom",
      "camerupt", "claydol", "delcatty", "flygon", "glalie", "kirlia",
      "kyogre", "lairon", "latias", "manectric", "mawile", "medicham",
      "pelipper", "plusle", "sableye", "salamence", "seviper", "shedinja",
      "solrock", "swellow", "torkoal", "trapinch", "vibrava", "volbeat", "wailord",
    ];
    for (const name of pokemonIcons) {
      this.load.image(`pkmn_icon_${name}`, `/game/sprites/pokemon/icons/${name}.png`);
    }
  }

  create(): void {
    // Create tilemap
    this.tilemap = this.make.tilemap({ key: "mauville-map" });
    const tileset = this.tilemap.addTilesetImage("mauville_bottom", "mauville_bottom");
    if (tileset) {
      this.groundLayer = this.tilemap.createLayer("Ground", tileset, 0, 0);
      // Store collision layer data for overlay rendering
      const collLayer = this.tilemap.getLayer("Collision");
      if (collLayer) {
        this.collisionLayerData = collLayer.data.flat().map((t) => t.index);
      }
    }

    // Foreground image (semi-transparent overlay)
    if (this.textures.exists("mauville_foreground")) {
      this.foregroundImage = this.add.image(0, 0, "mauville_foreground");
      this.foregroundImage.setOrigin(0, 0);
      this.foregroundImage.setAlpha(1.0);
      this.foregroundImage.setDepth(100);
      this.foregroundImage.setVisible(this.foregroundVisible);
    }

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

    // Emit ready
    emitEditorEvent(VIEWPORT_READY, {});
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

    // Scroll wheel zoom — smooth continuous zoom
    this.input.on("wheel", (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const factor = deltaY > 0 ? (1 - ZOOM_SPEED) : (1 + ZOOM_SPEED);
      this.currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.currentZoom * factor));
      cam.setZoom(this.currentZoom);
    });

    // Pointer down
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

      // Left-click: tool-dependent behavior
      if (pointer.leftButtonDown()) {
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const tileX = Math.floor(worldX / TILE_SIZE);
        const tileY = Math.floor(worldY / TILE_SIZE);

        // Stamp tool: paint tile
        if (this.currentTool === "stamp" && this.selectedTileGid > 0 && this.tilemap) {
          const tile = this.tilemap.putTileAt(this.selectedTileGid, tileX, tileY, false, "Ground");
          if (tile) {
            emitEditorEvent("editor:tile-paint", { x: tileX, y: tileY, gid: this.selectedTileGid });
          }
          return;
        }

        // Eyedropper tool: pick tile GID
        if (this.currentTool === "eyedropper" && this.tilemap) {
          const tile = this.tilemap.getTileAt(tileX, tileY, false, "Ground");
          if (tile) {
            this.selectedTileGid = tile.index;
            emitEditorEvent("editor:tile-eyedrop", { gid: tile.index, x: tileX, y: tileY });
            // Auto-switch to stamp tool after picking
            this.currentTool = "stamp";
            emitEditorEvent(SET_TOOL, { tool: "stamp" });
          }
          return;
        }

        // Eraser tool: clear tile
        if (this.currentTool === "eraser" && this.tilemap) {
          this.tilemap.putTileAt(0, tileX, tileY, false, "Ground");
          emitEditorEvent("editor:tile-paint", { x: tileX, y: tileY, gid: 0 });
          return;
        }

        // Check for entity hit
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

          // Start drag timer on selected entity
          if (this.selectedId === hitEntity.id) {
            this.dragTimer = setTimeout(() => {
              this.isDragging = true;
              this.dragEntityId = hitEntity!.id;
              emitEditorEvent(DRAG_START, { entityId: hitEntity!.id });
            }, 200);
          }
        } else {
          // No entity hit — start panning with left-click drag
          this.isPanning = true;
          this.panMoved = false;
          this.panStart = { x: pointer.x, y: pointer.y };
          this.camStart = { x: cam.scrollX, y: cam.scrollY };
        }
      }
    });

    // Pointer move
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
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

    // Pointer up outside (pointer leaves canvas while dragging)
    this.input.on("pointerupoutside", () => {
      this.isPanning = false;
      this.panMoved = false;
      if (this.dragTimer) { clearTimeout(this.dragTimer); this.dragTimer = null; }
      this.isDragging = false;
      this.dragEntityId = null;
      this.clearDragGhost();
    });

    // Pointer up
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
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

      if (this.dragTimer) {
        clearTimeout(this.dragTimer);
        this.dragTimer = null;
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
        this.currentTool = detail.tool;
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

    // Destroy existing tilemap layers
    if (this.groundLayer) { this.groundLayer.destroy(); this.groundLayer = null; }
    if (this.foregroundImage) { this.foregroundImage.destroy(); this.foregroundImage = null; }
    if (this.collisionOverlay) { this.collisionOverlay.destroy(); this.collisionOverlay = null; }
    if (this.gridGraphics) { this.gridGraphics.destroy(); this.gridGraphics = null; }

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

    // Foreground for this map
    const fgKey = cfg.tilesetName + "_fg";
    if (cfg.foreground && this.textures.exists(fgKey)) {
      this.foregroundImage = this.add.image(0, 0, fgKey);
      this.foregroundImage.setOrigin(0, 0);
      this.foregroundImage.setAlpha(1.0);
      this.foregroundImage.setDepth(100);
      this.foregroundImage.setVisible(this.foregroundVisible);
    }

    // Update camera bounds
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    cam.centerOn((MAP_WIDTH * TILE_SIZE) / 2, (MAP_HEIGHT * TILE_SIZE) / 2);

    // Reset zoom for small maps
    if (MAP_WIDTH < 30) {
      this.currentZoom = 3;
      cam.setZoom(3);
    }

    // Clear entity markers (will be refreshed by React)
    this.refreshAllMarkers([]);
  }

  update(): void {
    // Update coordinate display with tile GID info
    const pointer = this.input.activePointer;
    if (pointer) {
      const tileX = Math.floor(pointer.worldX / TILE_SIZE);
      const tileY = Math.floor(pointer.worldY / TILE_SIZE);
      const clampedX = Math.max(0, Math.min(MAP_WIDTH - 1, tileX));
      const clampedY = Math.max(0, Math.min(MAP_HEIGHT - 1, tileY));

      // Get tile GID from tilemap
      let gidInfo = "";
      if (this.tilemap) {
        const groundTile = this.tilemap.getTileAt(clampedX, clampedY, false, "Ground");
        if (groundTile) gidInfo = ` GID:${groundTile.index}`;
        const isCollision = this.collisionLayerData[clampedY * MAP_WIDTH + clampedX] > 0;
        if (isCollision) gidInfo += " [BLOCKED]";
      }

      this.coordText.setText(`Tile: (${clampedX}, ${clampedY})${gidInfo}`);
    }
  }

  // --- Entity Marker Management ---

  addMarker(entity: { id: string; type: string; x: number; y: number; spriteKey?: string; iconKey?: string; speciesName?: string; movementRangeX?: number; movementRangeY?: number }): void {
    if (this.markers.has(entity.id)) return;

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

    // Pokemon icons for wild-pokemon entities
    if (entity.type === "wild-pokemon" && entity.iconKey && this.textures.exists(entity.iconKey)) {
      const icon = this.add.image(0, -2, entity.iconKey);
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

    // Center camera on selected
    this.cameras.main.centerOn(marker.container.x, marker.container.y);
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
    this.dragGhost.fillStyle(0xffffff, 0.3);
    this.dragGhost.fillRect(
      tileX * TILE_SIZE, tileY * TILE_SIZE,
      TILE_SIZE, TILE_SIZE,
    );
    this.dragGhost.lineStyle(1, 0xffffff, 0.8);
    this.dragGhost.strokeRect(
      tileX * TILE_SIZE, tileY * TILE_SIZE,
      TILE_SIZE, TILE_SIZE,
    );
  }

  private clearDragGhost(): void {
    if (this.dragGhost) {
      this.dragGhost.destroy();
      this.dragGhost = null;
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
