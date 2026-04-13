# Pokemon World Designer IDE - Master Design Document

**Date:** 2026-04-12
**Status:** Draft - Ready for Ralph Loop execution
**Route:** `/editor` (dev-only, guarded by `import.meta.env.DEV`)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Model Reference](#3-data-model-reference)
4. [File Structure](#4-file-structure)
5. [Phase 1: MVP Core Editor](#5-phase-1-mvp-core-editor)
6. [Phase 2: Dialog & Template System](#6-phase-2-dialog--template-system)
7. [Phase 3: Debug Launcher & Testing](#7-phase-3-debug-launcher--testing)
8. [Phase 4: Tile & Collision Editing](#8-phase-4-tile--collision-editing)
9. [Phase 5: Checkpoints & History](#9-phase-5-checkpoints--history)
10. [Phase 6: Interior Editing](#10-phase-6-interior-editing)
11. [Phase 7: Advanced Features](#11-phase-7-advanced-features)
12. [Save Mechanism](#12-save-mechanism)
13. [Map Analyzer Integration](#13-map-analyzer-integration)
14. [Key Technical Decisions](#14-key-technical-decisions)
15. [Task Checklist](#15-task-checklist)

---

## 1. Executive Summary

The Pokemon World Designer IDE is a local-only, dev-mode interactive map editor served at the `/editor` route of the portfolio-v2 Astro project. It enables the developer to visually edit every aspect of the Pokemon game world — NPC placements, dialog, wild Pokemon, hidden items, gates, warps, signs, research log entries, badges, and tile maps — without touching TypeScript source files directly.

The editor uses a **hybrid architecture**: Phaser 3 renders the actual game tilemap as a read-only viewport with entity markers, while React handles all editing panels (asset library, properties inspector, dialog editor, problems/validation). Changes are saved back to the TypeScript source files via a dev-only API endpoint that applies regex-based patches — the same approach already proven by `scripts/map-analyzer.mjs`.

**Why this matters:** The game world has 1,170 lines in `npcs.ts` alone, 31 wild Pokemon, 8+ hidden items, 6 warps, 5 zones, 8 badges, 12+ research log entries, and 3 interior maps. Manual coordinate editing is error-prone and slow. The IDE reduces placement from "grep for coordinates, edit, run analyzer, check screenshot" to "drag and drop, see validation live, Ctrl+S."

---

## 2. Architecture Overview

### 2.1 High-Level Data Flow

```
TS Source Files                  Editor State (React)               TS Source Files
     |                                |                                  |
     v                                v                                  v
[dev server start]           [user edits in panels]              [Ctrl+S save]
     |                                |                                  |
     v                                v                                  v
editor-data-export.mjs  -->  editor-data.json  -->  EditorState  -->  /api/editor/save
     |                        (flat JSON array)      (React ctx)         |
     |                                                                   v
     |                                                          regex patch TS files
     |                                                                   |
     v                                                                   v
Phaser EditorScene                                              Vite HMR reload
(renders tilemap +                                              (viewport refreshes)
 entity markers)
```

### 2.2 Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Page shell | `src/pages/editor.astro` | Dev-only Astro page with `import.meta.env.DEV` guard |
| Viewport | Phaser 3 (`EditorScene`) | Renders `mauville.json` tilemap, entity markers, overlays |
| UI Panels | React 19 (via `@astrojs/react`) | Left panel, right panel, bottom panel, toolbar |
| State management | React Context + `useReducer` | Undo stack, selection, layer toggles, entity data |
| Styling | Tailwind CSS | Dark theme, matches existing project setup |
| Save API | Astro server endpoint | `src/pages/api/editor/save.ts` — writes to disk |
| Analyzer API | Astro server endpoint | `src/pages/api/editor/analyze.ts` — wraps map-analyzer.mjs |
| Data export | Node.js script | `scripts/editor-data-export.mjs` — TS files to JSON |

### 2.3 Rendering Split

**Phaser handles (read-only viewport):**
- Tilemap rendering (Ground, Collision, Foreground layers from `mauville.json`)
- Entity markers (colored circles/sprites for NPCs, Pokemon, Signs, Items)
- Camera pan/zoom
- Selection rings (white outline around selected entity)
- Drag ghost preview (semi-transparent sprite following cursor)
- Heatmap overlay (BFS reachability gradient)
- Zone boundaries (colored border outlines)
- Movement range rectangles (dotted outlines for WANDER NPCs)
- Minimap rendering (downscaled overview with entity dots)
- Grid lines toggle

**React handles (all editing):**
- Left panel: Asset Library (Pokemon, NPCs, Tiles tabs)
- Right panel: Properties Inspector (position, movement, dialog, autoGive, pickup, pokemon)
- Bottom panel: Problems tab (validation), Debug Launcher tab, Checkpoints tab
- Toolbar: tools, menus, search
- Dialog slide editor
- Template `{{}}` autocomplete
- Context menu (right-click)
- Keyboard shortcut routing
- Undo/redo state
- Save diff viewer

### 2.4 Communication: Phaser <-> React

The existing codebase uses `EventBridge.ts` (DOM CustomEvents on `window`) for Phaser-to-React communication. The editor extends this pattern:

```typescript
// New events added to EventBridge.ts for editor mode
export const EditorEvents = {
  // Phaser -> React
  ENTITY_CLICKED: "editor:entity-clicked",       // { entityId, entityType, x, y }
  ENTITY_HOVERED: "editor:entity-hovered",        // { entityId, entityType, x, y } | null
  TILE_CLICKED: "editor:tile-clicked",            // { x, y, tileId }
  MOUSE_MOVE: "editor:mouse-move",                // { tileX, tileY, worldX, worldY }
  DRAG_START: "editor:drag-start",                // { entityId }
  DRAG_MOVE: "editor:drag-move",                  // { entityId, tileX, tileY }
  DRAG_END: "editor:drag-end",                    // { entityId, tileX, tileY }
  VIEWPORT_READY: "editor:viewport-ready",        // {}

  // React -> Phaser
  SELECT_ENTITY: "editor:select-entity",          // { entityId }
  DESELECT: "editor:deselect",                    // {}
  TOGGLE_LAYER: "editor:toggle-layer",            // { layer, visible }
  UPDATE_ENTITY_POSITION: "editor:update-pos",    // { entityId, x, y }
  ADD_ENTITY_MARKER: "editor:add-marker",         // { entity }
  REMOVE_ENTITY_MARKER: "editor:remove-marker",   // { entityId }
  JUMP_TO_TILE: "editor:jump-to",                 // { x, y }
  SET_TOOL: "editor:set-tool",                    // { tool }
  REFRESH_ENTITIES: "editor:refresh-entities",     // { entities[] }
  SHOW_HEATMAP: "editor:show-heatmap",            // { data: number[][] }
  HIDE_HEATMAP: "editor:hide-heatmap",            // {}
} as const;
```

---

## 3. Data Model Reference

Every data file the editor reads and writes, with exact TypeScript interfaces and source locations.

### 3.1 NPCs (`src/game/data/npcs.ts`)

**Exported arrays:**
- `MAUVILLE_NPCS_RAW: NPCDefinition[]` — raw NPC definitions with Mauville-local coordinates (offset by +50,+50 when building the final list)
- `ROUTE_NPCS: NPCDefinition[]` — NPCs on routes (stitched-map coordinates, no offset)
- `MAUVILLE_SIGNS_RAW: SignDefinition[]` — signs with Mauville-local coordinates
- `MAUVILLE_NPCS` — exported computed array (offset-applied MAUVILLE_NPCS_RAW + ROUTE_NPCS + WILD_POKEMON)
- `MAUVILLE_SIGNS` — exported computed array (offset-applied MAUVILLE_SIGNS_RAW)

**NPCDefinition interface** (from `src/game/types/npc.ts`):
```typescript
interface NPCDefinition {
  id: string;                          // unique identifier
  spriteKey: string;                   // Phaser spritesheet key (e.g. "boy_3")
  position: { x: number; y: number };  // tile position
  facingDirection: Direction;           // grid-engine Direction enum
  movementBehavior: MovementBehavior;   // enum: STATIONARY, WANDER_LEFT_RIGHT, etc.
  movementRangeX: number;              // horizontal wander range (tiles)
  movementRangeY: number;              // vertical wander range (tiles)
  speed?: number;                      // tiles-per-second override
  behaviorIntervalMs?: { min: number; max: number };  // tick interval override
  dialog: string[];                    // static dialog lines
  speakerName?: string;                // name in dialog box
  dialogFn?: (save: GameSave) => DynamicDialogResult | Promise<DynamicDialogResult>;  // READ-ONLY in editor
  animated: boolean;                   // true = 9-frame spritesheet, false = static
  tileWidth?: number;                  // collision footprint width (default 1)
  tileHeight?: number;                 // collision footprint height (default 1)
  scale?: number;                      // uniform sprite scale
  offsetY?: number;                    // pixel offset for rendering
  flipX?: boolean;                     // horizontal flip
  spawnCondition?: () => boolean;       // READ-ONLY in editor
  pickup?: {                           // makes NPC a pickup item
    itemId?: string;                   // ITEM_DEFINITIONS reference
    itemName?: string;                 // legacy display name
    itemUrl?: string;                  // legacy URL
  };
  autoGive?: {                         // gives item on first interaction
    itemId?: string;                   // ITEM_DEFINITIONS reference
    itemName?: string;                 // legacy
    itemUrl?: string;                  // legacy
    pocket?: string;                   // legacy
    description?: string;              // legacy
    asidePosition: { x: number; y: number };  // walk-to position after giving
    clearedDialog?: string[];          // dialog after item given
  };
  pokemon?: {                          // overworld Pokemon registration
    pokedexNumber: number;
    speciesName: string;
    projectName: string;
    projectDescription: string;
    projectUrl?: string;
    repeatDialog?: string[];
    joinsParty?: string;               // party member id
  };
  ephemeral?: EphemeralConfig;         // transient spawn cycling
}
```

**SignDefinition interface:**
```typescript
interface SignDefinition {
  position: { x: number; y: number };
  text: string[];
}
```

**MovementBehavior enum values:**
- `STATIONARY` — no movement
- `WANDER_LEFT_RIGHT` — random left/right within movementRangeX
- `WANDER_UP_DOWN` — random up/down within movementRangeY
- `WANDER_AREA` — random 4-direction within range box
- `PACE_HORIZONTAL` — predictable bounce horizontal
- `PACE_VERTICAL` — predictable bounce vertical
- `RUN_HORIZONTAL` — fast horizontal pace
- `RUN_VERTICAL` — fast vertical pace
- `LOOK_AROUND` — random facing changes

### 3.2 Wild Pokemon (`src/game/data/wild-pokemon.ts`)

Uses a `wild()` factory function:
```typescript
function wild(pokedexNum: number, x: number, y: number, repeatDialog?: string[]): NPCDefinition
```

Produces NPCDefinition with:
- `id: "wild_${species.toLowerCase()}"`
- `spriteKey: "pkmn_${species.toLowerCase()}"`
- `movementBehavior: MovementBehavior.STATIONARY`
- `animated: false`
- `pokemon: { pokedexNumber, speciesName, projectName, projectDescription, projectUrl, repeatDialog }`

**31 Pokemon icons** at `public/game/sprites/pokemon/icons/*.png` (64x32, 2 frames each).

Currently 30 wild Pokemon placed across 4 zones: Route 117 (7), Route 118 (7), Route 110 (8), Route 111 (8 including Mew).

### 3.3 Interiors (`src/game/data/interiors.ts`)

**InteriorDef interface:**
```typescript
interface InteriorDef {
  key: string;                    // "pokecenter", "mart", "gym"
  displayName: string;
  mapJson: string;                // path to Tiled JSON
  tilesetBottom: string;
  tilesetTop: string;
  width: number;
  height: number;
  music: string;
  exitWarpTiles: { x: number; y: number }[];
  pcTiles?: { x: number; y: number }[];
  questionnaireTiles?: QuestionnaireTile[];
  npcs: InteriorNPC[];
}
```

**InteriorNPC interface:**
```typescript
interface InteriorNPC {
  id: string;
  spriteKey: string;
  position: { x: number; y: number };
  facingDirection: "up" | "down" | "left" | "right";
  dialog: string[];
  speakerName: string;
  dialogFn?: (save: GameSave) => DynamicDialogResult | Promise<DynamicDialogResult>;
  shopMenu?: boolean;
  autoGive?: {
    itemId: string;
    asidePosition: { x: number; y: number };
    clearedDialog?: string[];
  };
}
```

**3 interiors:** pokecenter (14x9), mart (8x8), gym (10x22).

### 3.4 Gates (`src/game/data/gates.ts`)

```typescript
interface GateDefinition {
  id: string;
  description: string;
  type: "npc" | "terrain";
  map: "overworld" | string;
  npcId?: string;           // for NPC gates
  tiles?: { x: number; y: number }[];  // for terrain gates
  spriteKey?: string;       // for terrain gates
  requiredMove: string;     // field move name
  clearMessage: string;     // shown when cleared ({POKEMON} placeholder)
  lockedMessage?: string;   // shown when locked (terrain gates only)
}
```

### 3.5 Hidden Items (`src/game/data/hiddenItems.ts`)

```typescript
interface HiddenItemTile {
  id: string;
  map: string;              // "overworld" or interior key
  x: number;
  y: number;
  itemId: string;           // references ITEM_DEFINITIONS
  difficulty: "easy" | "medium" | "hard";
  placement: "rock" | "flower" | "grass";
}
```

Currently 8+ hidden items across the overworld.

### 3.6 Item Definitions (`src/game/data/itemDefinitions.ts`)

```typescript
type BagPocketId = "papers" | "blogs" | "keyItems" | "tms";

interface ItemDef {
  id: string;
  name: string;
  pocket: BagPocketId;
  description: string;
  url?: string;
  icon?: string;
}
```

`ITEM_DEFINITIONS: Record<string, ItemDef>` — keyed by item id.

### 3.7 Research Log (`src/game/data/researchLog.ts`)

```typescript
interface LogEntry {
  number: number;       // 1-based entry number
  title: string;
  threshold: number;    // total discoveries needed to unlock
  text: string[];       // 4-6 lines of content
}
```

### 3.8 Pokemon / Pokedex (`src/game/data/pokemon.ts`)

```typescript
interface PokedexEntry {
  number: number;
  name: string;
  level: number;
  types: [string, string];
  status: "caught" | "seen" | "unseen";
  description: string;
  url?: string;
  pokemon: string;      // species name for sprite lookup
}
```

31 entries in `POKEDEX: PokedexEntry[]`.

### 3.9 Zones (`src/game/data/zones.ts`)

```typescript
interface ZoneDef {
  id: string;           // "mauville", "route117", etc.
  name: string;         // display name
  music: string;        // BGM track key
  popupTheme: "marble" | "wood";
  contains: (x: number, y: number) => boolean;  // READ-ONLY in editor
}
```

5 zones: Mauville City (50-89, 50-69), Route 117 (<50, 50-69), Route 118 (>=90, 50-69), Route 110 (y>=70), Route 111 (y<50).

### 3.10 Warps (`src/game/data/warps.ts`)

```typescript
interface Warp {
  overworldTile: { x: number; y: number };
  targetMap: string;           // interior key
  spawnTile: { x: number; y: number };
  spawnFacing: "up" | "down" | "left" | "right";
}
```

6 warps: 2 gym doors, 2 pokecenter doors, 2 mart doors.

### 3.11 Badges (`src/game/systems/BadgeMilestones.ts`)

```typescript
interface BadgeDef {
  id: string;
  name: string;
  hint: string;
  condition: (save: GameSave) => boolean;  // READ-ONLY in editor
  auto?: boolean;
}
```

8 badges: gym, publication, connected, pokedex, blogger, engineer, completionist, champion.

### 3.12 Tilemap (`public/game/maps/mauville.json`)

- Tiled JSON format, 140x120 tiles (16x16 pixels each)
- Layers: Ground (tile data), Collision (blocking markers)
- Tileset: `public/game/tilesets/mauville_bottom.png` (16x16 grid)
- Foreground: `public/game/maps/mauville_foreground.png` (rendered on top of player)
- Player spawn: tile (72, 58)

### 3.13 Sprite Assets

| Category | Path | Format | Count |
|----------|------|--------|-------|
| NPC sprites | `public/game/sprites/emerald/*.png` | 144x32 (9 frames, 16x32 each) | 58 files |
| Pokemon icons | `public/game/sprites/pokemon/icons/*.png` | 64x32 (2 frames, 32x32 each) | 31 files |
| Bag item icons | `public/game/ui/bag/*.png` | Various | ~20 files |
| Tilesets | `public/game/tilesets/*.png` | 16x16 grid | 8 files |

---

## 4. File Structure

### 4.1 New Files Created by This Project

```
src/pages/editor.astro                    # Dev-only Astro page
src/components/editor/
  EditorApp.tsx                           # Top-level React component, state provider
  EditorViewport.tsx                      # Phaser viewport wrapper (mounts EditorScene)
  panels/
    AssetLibrary.tsx                      # Left panel — Pokemon, NPCs, Tiles tabs
    AssetLibraryPokemonTab.tsx            # Pokemon browser with icon sprites
    AssetLibraryNPCTab.tsx                # NPC browser with sprite previews
    AssetLibraryTileTab.tsx               # Tile palette from tileset
    PropertiesPanel.tsx                   # Right panel — selected entity properties
    PropertySection.tsx                   # Collapsible section wrapper
    PositionSection.tsx                   # X/Y inputs, facing, movement, sprite key
    DialogSection.tsx                     # Dialog slides list with drag/reorder
    AutoGiveSection.tsx                   # Item picker, aside position, cleared dialog
    PickupSection.tsx                     # Pickup item id picker
    PokemonSection.tsx                    # Pokedex number, species, project info
    RelationshipsSection.tsx              # Badge contribution, zone, distance
    ProblemsPanel.tsx                     # Bottom panel — validation errors/warnings
    DebugLauncher.tsx                     # Bottom panel tab — test launch controls
    CheckpointsPanel.tsx                  # Bottom panel tab — named snapshots
  dialog/
    DialogSlideEditor.tsx                 # Visual slide cards with drag reorder
    DialogSlide.tsx                       # Single slide card with pixel-art preview
    DialogPlayback.tsx                    # "Play" button with typewriter animation
    TemplateAutocomplete.tsx              # {{}} floating dropdown
  toolbar/
    Toolbar.tsx                           # Top toolbar — tools, menus, search
    ToolButton.tsx                        # Individual tool button
    SearchBar.tsx                         # Entity search + filter
  viewport/
    Minimap.tsx                           # 140x120 overview with entity dots
    ContextMenu.tsx                       # Right-click menu
    StatusBar.tsx                         # Bottom status: zone, coords, counts
    SaveDiffViewer.tsx                    # Visual diff before saving
  state/
    EditorContext.tsx                     # React context provider
    editorReducer.ts                     # useReducer for all editor state
    editorTypes.ts                       # TypeScript types for editor state
    undoStack.ts                         # Undo/redo action history
    selectionUtils.ts                    # Multi-select, batch operations
  hooks/
    useEditorState.ts                    # Convenience hook for context
    useKeyboardShortcuts.ts              # Keyboard shortcut bindings
    useDragDrop.ts                       # Drag from asset library to viewport
    usePhaser.ts                         # Phaser instance lifecycle management
    useAnalyzer.ts                       # Map analyzer API integration
src/game/scenes/EditorScene.ts           # Phaser scene for editor viewport
src/game/editor/
  EditorEvents.ts                        # Editor-specific event bridge extensions
  EditorEntityRenderer.ts                # Draws entity markers on the viewport
  EditorOverlays.ts                      # Heatmap, zone boundaries, grid lines
  EditorInteraction.ts                   # Click, hover, drag handling in Phaser
  EditorMinimap.ts                       # Minimap rendering in Phaser
src/pages/api/editor/
  save.ts                               # POST — writes patches to TS source files
  analyze.ts                            # POST — runs map-analyzer and returns JSON
  data.ts                               # GET — serves editor-data.json
scripts/
  editor-data-export.mjs                 # Generates editor-data.json from TS sources
```

### 4.2 Modified Existing Files

```
src/game/EventBridge.ts                  # Add EditorEvents constants
package.json                             # Add editor dev script
```

### 4.3 Generated Artifacts (gitignored)

```
editor-data.json                         # Flat JSON of all entities (generated at dev start)
```

---

## 5. Phase 1: MVP Core Editor

Phase 1 delivers a working editor where you can see the map, click entities, edit their properties, drag them around, and save changes back to source files.

### 5.1 Editor Page (`src/pages/editor.astro`)

**Requirements:**
- Serve at `/editor` route
- Guard with `import.meta.env.DEV` — in production, return 404 or redirect to `/`
- Full-viewport layout (no header/footer from the portfolio site)
- Dark theme background (`#1a1a2e` or similar)
- Load `EditorApp.tsx` as a React island with `client:only="react"`
- Import Phaser and grid-engine only in the client component (no SSR)

**Layout structure:**
```
+-------------------------------------------------------------+
|  Toolbar (48px)                                              |
+----------+----------------------------------+----------------+
|  Left    |  Phaser Viewport                 |  Right Panel   |
|  Panel   |  (fills remaining space)         |  (320px)       |
|  (280px) |                                  |                |
|          |                                  |                |
|          |                                  |                |
|          |                                  |                |
|          |                                  |                |
|          +----------------------------------+                |
|          |  Bottom Panel (200px, resizable) |                |
+----------+----------------------------------+----------------+
|  Status Bar (24px)                                           |
+-------------------------------------------------------------+
```

Panels are resizable via drag handles. Collapsed state persisted to localStorage.

### 5.2 Phaser Viewport (`EditorScene`)

**EditorScene** extends `Phaser.Scene` and renders the exact same tilemap as the game's `OverworldScene`, but with editing interaction logic instead of player movement.

**Tilemap loading:**
- Load `public/game/maps/mauville.json` with `mauville_bottom.png` tileset
- Render Ground layer
- Render Collision layer as a toggleable red-tinted overlay
- Render foreground image as a toggleable semi-transparent overlay

**Camera controls:**
- Middle-mouse drag OR Space+left-mouse drag to pan
- Scroll wheel to zoom (discrete steps: 0.5, 1, 1.5, 2, 3, 4)
- Zoom centered on cursor position
- Double-click to center on tile
- Keyboard: arrow keys pan when no entity selected

**Entity markers (drawn on top of tilemap):**

| Entity Type | Color | Shape | Size |
|-------------|-------|-------|------|
| NPC (normal) | Blue `#3b82f6` | Filled circle with 1px white border | 12px |
| NPC (live/API) | Cyan `#06b6d4` | Filled circle with pulse animation | 12px |
| Wild Pokemon | Green `#22c55e` | Filled circle | 12px |
| Sign | Amber `#f59e0b` | Filled diamond (rotated square) | 10px |
| Hidden Item | Pink `#ec4899` | Filled star (4-point) | 10px |
| Pickup Item | Orange `#f97316` | Filled circle | 12px |
| Player spawn | Red `#ef4444` | Filled triangle (pointing down) | 14px |
| Warp tile | Purple `#8b5cf6` | Filled square | 10px |
| Gate tile | Red `#dc2626` | X mark | 10px |

**Selection:**
- Click entity marker to select. White ring appears (2px outline, 16px radius).
- Selection info tooltip: entity id, type, coordinates
- Click empty tile to deselect
- Selected entity highlighted in asset library and properties panel

**Hover:**
- Hover over entity marker shows tooltip: sprite preview (first frame, 32x32) + id + `(x, y)` + type badge
- Tooltip follows cursor with 8px offset
- Hover highlight: marker grows 2px and brightens

**Coordinate display:**
- Bottom-left corner of viewport: `Tile: (X, Y)` tracking mouse position
- Updates at 60fps from Phaser pointer
- Shows zone name next to coordinates: `Tile: (72, 58) — MAUVILLE CITY`

### 5.3 Left Panel: Asset Library

Three tabs with icons: Pokemon (pokeball icon), NPCs (person icon), Tiles (grid icon).

**Pokemon Tab:**
- Scrollable list of all 31 POKEDEX entries
- Each row: 32x32 icon sprite (cropped from the 64x32 icon sheet, first frame) + `#NNN NAME` + project name tag
- Click to inspect (shows details in right panel without placing)
- Drag to viewport to place as wild Pokemon
- Search/filter input at top: filter by name, project name, species
- Sort: by Pokedex number (default), by name, by zone

**NPCs Tab:**
- Scrollable list of all NPC sprite keys (58 sprites)
- Each row: sprite preview (first frame, 16x32, scaled to 32x64) + sprite key name + type badges
- Type badges: colored pills showing usage (Blog Giver, Paper Giver, Live API, Decorative, Gym Trainer)
- Also lists placed NPCs grouped by zone
- Drag sprite from palette to viewport to create new NPC with defaults
- Smart Templates section at bottom:
  - **Blog Giver NPC** — pre-fills: animated=true, dialog with 4 lines, autoGive with blog pocket item, aside position 1 tile right
  - **Paper Giver NPC** — pre-fills: animated=true, dialog with 4 lines, autoGive with paper pocket item
  - **Live Data NPC** — pre-fills: animated=true, LOOK_AROUND movement, dialogFn placeholder (read-only badge), fallback dialog
  - **Wild Pokemon** — pre-fills: animated=false, STATIONARY, pokemon fields
  - **Item Ball** — pre-fills: spriteKey="item_ball", animated=false, STATIONARY, pickup fields
  - **Decorative NPC** — pre-fills: animated=true, generic dialog

**Tiles Tab (Phase 4 — stubbed in Phase 1):**
- Tile palette grid rendered from `mauville_bottom.png`
- Each tile: 16x16 at 2x zoom = 32x32 clickable square
- Click to select tile for painting
- Hover shows tile GID and collision status

**Layer toggles (bottom of left panel):**

| Layer | Default | Indicator Color |
|-------|---------|-----------------|
| Ground | ON | none (always visible when on) |
| Collision | OFF | Red tint overlay |
| Foreground | OFF | Semi-transparent overlay |
| Entities | ON | Colored dots |
| Heatmap | OFF | Green-red gradient |
| Zones | OFF | Colored boundary outlines |
| Movement Ranges | OFF | Dotted rectangles per NPC |
| Grid Lines | OFF | 1px lines at tile boundaries |

Each toggle: checkbox + label + colored dot. Fires `EditorEvents.TOGGLE_LAYER` to Phaser.

### 5.4 Right Panel: Properties Inspector

Shows properties of the currently selected entity. Empty state: "Select an entity on the map or in the asset library."

**Section layout (collapsible accordion):**

**A) Identity & Position:**
- ID: read-only text field (gray background)
- Type badge: NPC / Wild Pokemon / Sign / Hidden Item / Warp / Gate (colored)
- Sprite Key: dropdown of all available sprite keys (with preview thumbnail)
- Position X: number input (0-139)
- Position Y: number input (0-119)
- "Safe" indicator: green checkmark if tile is reachable, red X if not (from analyzer)
- Facing Direction: dropdown (UP, DOWN, LEFT, RIGHT)
- Animated: checkbox

**B) Movement:**
- Movement Behavior: dropdown of MovementBehavior enum values
- Range X: number input (0-10)
- Range Y: number input (0-10)
- Speed: number input (optional override)
- Behavior Interval: min/max inputs (optional override)
- Visual: movement range preview rectangle drawn on viewport when this section is expanded

**C) Dialog:**
- Speaker Name: text input
- Dialog Slides: list of slide cards (see DialogSlideEditor below)
- Each slide shows the text + estimated display lines
- Drag to reorder slides
- "+" button to add new slide
- Trash icon on each slide to delete
- "Play Preview" button to animate the dialog sequence

**D) Dynamic Dialog (if entity has dialogFn):**
- Read-only badge: "This NPC uses a dynamic dialog function (dialogFn). Edit in source."
- Shows the function location in source: `npcs.ts:65`
- "Open in VS Code" button (launches `code --goto` command via API)

**E) Auto-Give (if entity has autoGive):**
- Item ID: dropdown of all ITEM_DEFINITIONS entries (shows name + pocket badge)
- Aside Position X: number input
- Aside Position Y: number input
- "Show aside" button: draws dashed line from NPC to aside position on viewport
- Cleared Dialog: text area (one line per dialog line, Enter for newline)

**F) Pickup (if entity has pickup):**
- Item ID: dropdown of all ITEM_DEFINITIONS entries
- Legacy fields (itemName, itemUrl) shown read-only if present

**G) Pokemon (if entity has pokemon data):**
- Pokedex Number: dropdown showing all POKEDEX entries
- Species Name: auto-filled from POKEDEX selection
- Project Name: text input
- Project Description: text area
- Project URL: text input
- Repeat Dialog: text area
- Joins Party: dropdown of party member ids (optional)

**H) Ephemeral Config (if entity has ephemeral):**
- Spawn Points: list of (x, y) pairs with "+" button
- Visible Duration: number input (seconds)
- Hidden Duration: number input (seconds)
- Visible Behavior: dropdown (idle, wander, hop)
- Randomness: slider (0-1)

**I) Spawn Condition (if entity has spawnCondition):**
- Read-only badge: "Conditional spawn — hand-edit in source."
- Shows the condition code snippet

**J) Relationships:**
- Zone: auto-detected from position, shown as a badge
- Distance from spawn: BFS distance in tiles
- Badge contribution: which badge(s) this entity contributes to
  - NPC with autoGive blog → BLOGGER badge
  - NPC with autoGive paper → PUBLICATION badge
  - Wild Pokemon → POKEDEX badge
  - Hidden item → CONNECTED badge (if key item)
- Progress: e.g., "This is blog 3 of 8 total blogs"

### 5.5 Bottom Panel: Problems Tab

**Validation rules (run on every state change):**

| Rule | Severity | Description |
|------|----------|-------------|
| `no-duplicate-ids` | Error | No two entities share the same id |
| `entity-on-collision` | Error | Entity placed on a collision tile |
| `entity-unreachable` | Warning | Entity on a tile unreachable by BFS from spawn |
| `npc-range-into-collision` | Warning | NPC movement range extends into collision tiles |
| `missing-autogive-item` | Error | autoGive.itemId not found in ITEM_DEFINITIONS |
| `missing-pickup-item` | Error | pickup.itemId not found in ITEM_DEFINITIONS |
| `missing-pokemon-entry` | Error | pokemon.pokedexNumber not found in POKEDEX |
| `badge-unachievable` | Error | A badge condition requires N items but fewer than N exist |
| `orphan-item` | Warning | An ITEM_DEFINITIONS entry has no NPC giver or hidden item |
| `template-unresolved` | Warning | Dialog contains `{{...}}` that doesn't match a known template |
| `sign-no-text` | Warning | Sign with empty text array |
| `warp-no-interior` | Error | Warp targetMap doesn't match any INTERIORS key |
| `gate-no-npc` | Error | NPC gate references a nonexistent NPC id |
| `hidden-item-map-mismatch` | Error | Hidden item references a map that doesn't exist |

**Panel UI:**
- List of problems sorted by severity (errors first, then warnings)
- Each row: severity icon (red circle / yellow triangle), rule name, entity id, message
- Click a problem to select the entity on the map and scroll viewport to it
- Problem count shown in status bar: "3 errors, 7 warnings"
- "Refresh" button to re-run validation manually
- Auto-refresh on every entity change (debounced 300ms)

### 5.6 Drag to Move Entities

**Workflow:**
1. Select an entity (click marker)
2. Click and hold the selected entity marker (200ms threshold to distinguish from click)
3. Ghost preview appears: semi-transparent sprite at 50% opacity following cursor, snapped to tile grid
4. Dashed outline remains at original position
5. Status bar shows: `Moving npc_boy_3: (29, 66) -> (32, 68)`
6. Live coordinate updates while dragging
7. Drop preview: tile tinted green (safe) or red (collision/unreachable)
8. Release to place at new position
9. Entity position updates in editor state
10. Undo action recorded: `{ type: "MOVE", entityId, from: {x,y}, to: {x,y} }`

**Constraints during drag:**
- Cannot drop on collision tiles (red flash + bounce back)
- Cannot drop on occupied tiles (another entity already there)
- Snap to 16x16 tile grid
- Escape key cancels drag, entity returns to original position

### 5.7 Drag from Asset Library to Viewport

**Workflow:**
1. Mouse down on a Pokemon/NPC template in the left panel
2. Drag starts — cursor changes to grabbing, ghost preview appears on viewport
3. Green pulsing drop preview on viewport tile under cursor
4. Release on a valid tile → creates new entity at that position
5. Properties panel opens, pre-filled with template defaults
6. Entity assigned a generated id (e.g., `npc_boy_3_2` with dedup counter)
7. Entity added to editor state; marker appears on viewport
8. Undo action recorded: `{ type: "ADD", entity }`

### 5.8 Delete Entities

**Three methods:**

1. **Trash zone:** When dragging an entity, a trash zone appears at bottom-right of viewport (red background, trash icon, "Drop to delete" label). Dropping on it removes the entity.

2. **Right-click > Delete:** Context menu option. Confirmation dialog: "Delete npc_boy_3? This cannot be undone without Ctrl+Z."

3. **Keyboard:** Delete or Backspace key when entity selected. Same confirmation.

All deletions are undoable.

### 5.9 Right-Click Context Menu

Appears on right-click anywhere on the viewport.

**On entity:**
- Edit Properties (opens right panel focused on entity)
- Duplicate (creates copy 1 tile to the right)
- Delete
- Move to Safe Tile (BFS nearest safe tile from current position)
- Play from Here (launches game at this entity's tile — Phase 3)
- Measure Distance (click another entity to show BFS distance)
- Copy ID to Clipboard

**On empty tile:**
- Place NPC Here (opens template picker)
- Place Wild Pokemon Here (opens Pokemon picker)
- Place Sign Here (opens sign text editor)
- Place Hidden Item Here (opens item picker)
- Mark Tile Info (shows collision status, zone, reachability)
- Jump to This Tile (centers viewport)

### 5.10 Save to Disk

**Trigger:** Ctrl+S or File > Save in toolbar.

**Flow:**
1. Compute diff between editor state and original loaded state
2. Show SaveDiffViewer modal:
   - List of changes grouped by file
   - Moved entities: old position -> new position with arrow on mini-map
   - Changed dialog: side-by-side diff with highlights
   - Added entities: green background
   - Deleted entities: red background with strikethrough
3. User clicks "Save" or "Cancel"
4. On Save: `POST /api/editor/save` with the changes payload
5. API endpoint:
   - Reads each affected TS source file
   - Applies regex patches (see Section 12 for details)
   - Writes files back to disk
   - Returns success/failure per file
6. On success: Vite HMR detects file changes, viewport refreshes
7. Status bar shows "Saved at 14:32:01" with green checkmark
8. Editor state resets "dirty" flag

### 5.11 Undo/Redo

**State machine:**
- Undo stack: array of action records
- Redo stack: array of action records (cleared on new action)
- Max 100 actions in undo stack

**Action types:**
```typescript
type EditorAction =
  | { type: "MOVE"; entityId: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: "ADD"; entity: EditorEntity }
  | { type: "DELETE"; entity: EditorEntity }
  | { type: "UPDATE_FIELD"; entityId: string; field: string; oldValue: any; newValue: any }
  | { type: "UPDATE_DIALOG"; entityId: string; oldDialog: string[]; newDialog: string[] }
  | { type: "REORDER_DIALOG"; entityId: string; oldOrder: number[]; newOrder: number[] }
  | { type: "BATCH"; actions: EditorAction[] }   // for multi-select operations
  | { type: "PAINT_TILE"; x: number; y: number; oldTileId: number; newTileId: number }
  | { type: "TOGGLE_COLLISION"; x: number; y: number; oldBlocked: boolean; newBlocked: boolean }
```

**Keyboard shortcuts:**
- `Ctrl+Z` — Undo
- `Ctrl+Y` or `Ctrl+Shift+Z` — Redo

### 5.12 Toolbar

**Layout:** horizontal bar across top of editor, 48px tall.

**Left section — File/Edit/View menus:**

| Menu | Items |
|------|-------|
| File | Save (Ctrl+S), Export JSON, Import JSON, separator, Close Editor |
| Edit | Undo (Ctrl+Z), Redo (Ctrl+Y), separator, Select All, Deselect (Esc), separator, Duplicate (Ctrl+D), Delete (Del) |
| View | Toggle Ground, Toggle Collision, Toggle Foreground, Toggle Entities, Toggle Heatmap, Toggle Zones, Toggle Movement Ranges, Toggle Grid, separator, Zoom In, Zoom Out, Zoom to Fit |

**Center section — Tool buttons:**

| Tool | Icon | Shortcut | Description |
|------|------|----------|-------------|
| Select | Arrow cursor | `1` | Click to select, drag to move |
| Move | Crosshair | `2` | Pan viewport (Space+drag also works) |
| Stamp | Grid stamp | `3` | Tile painting (Phase 4) |
| Eraser | Eraser | `4` | Remove tiles (Phase 4) |
| Eyedropper | Eyedropper | `5` | Pick tile under cursor (Phase 4) |

**Right section — Search bar + status:**
- Search input: type to filter entities on map + in panels
- Entity count: "47 NPCs, 30 Pokemon, 12 Signs, 8 Items"

### 5.13 Minimap

**Position:** Bottom-left corner of viewport, 180x120px (matching 140:120 aspect ratio, ~1.3px per tile).

**Rendering:**
- Solid background matching terrain colors per zone
- Colored dots for all entities (same color scheme as markers, 1-2px dots)
- White rectangle showing current viewport bounds
- Click on minimap to jump viewport to that area
- Drag the viewport rectangle to pan

**Interaction:**
- Always visible (can be toggled off in View menu)
- Semi-transparent background (80% opacity)
- Rounded corners, 1px border

### 5.14 Reachability Heatmap Overlay

**Trigger:** Toggle "Heatmap" in layer panel.

**Rendering:**
- Green (#22c55e at 30% opacity) for reachable tiles
- Red (#ef4444 at 30% opacity) for blocked/unreachable tiles
- Gradient by BFS distance from spawn: close=bright green, far=dark green
- Player spawn tile: bright white dot

**Data source:** Computed by calling the map analyzer API endpoint, which runs the existing BFS from `scripts/map-analyzer.mjs`.

**Updates:**
- Recompute when an entity moves (debounced 500ms)
- Show "Reachability: computing..." indicator during computation
- Cache last result; only recompute when entity positions change

---

## 6. Phase 2: Dialog & Template System

### 6.1 Dialog Slide Editor (Enhanced)

**Visual storyboard layout:**
- Horizontal scrollable row of slide cards
- Each card: 240x80px, pixel-art styled border (matching the game's dialog box)
- Card shows:
  - Speaker name pill (top-left, colored by NPC type)
  - Text content rendered with the game's exact word-wrap algorithm
  - 2-line preview matching the Pokemon dialog box format
  - Continuation arrow (triangle) if text spans multiple pages
  - Slide number badge (top-right)
- Drag slides to reorder (smooth animation)
- Click slide to expand inline editor (full text input)
- "+" button at end to add new slide
- Delete (X) button on hover

**Word-wrap preview algorithm:**
The game uses a 2-line dialog box. Each line fits approximately 35 characters in the Pokemon font. The editor must replicate this wrapping exactly:
- Split text into lines at explicit `\n` or at word boundary within 35-char limit
- Show each 2-line pair as a separate "page" within the slide card
- If text needs 3+ pages, show page count badge: "1/3", "2/3", "3/3"

### 6.2 Live Dialog Playback

**"Play" button on the dialog section:**
1. Opens a floating preview panel (centered, 480x160px)
2. Renders the exact game dialog box UI (pixel-art border, dark background)
3. Speaker name pill at top-left
4. Typewriter effect: characters appear one at a time (50ms interval)
5. After each 2-line page, shows continuation arrow; click/Enter to advance
6. Resolves `{{}}` templates with current placeholder values
7. When dialog ends, "Close" button appears
8. Shows page indicator: "Page 2 of 5"

### 6.3 Template `{{}}` Autocomplete

**Trigger:** Typing `{{` in any dialog text input.

**Available template commands:**
```
{{ spotify.last_song }}        — Title of last/current Spotify track
{{ spotify.artist }}           — Artist name
{{ spotify.is_playing }}       — "true" / "false"
{{ strava.last_km }}           — Distance of last activity (km)
{{ strava.last_type }}         — Activity type (Run, Ride, etc.)
{{ strava.last_name }}         — Activity name
{{ github.commits_24h }}       — Commit count in last 24 hours
{{ github.followers }}         — GitHub follower count
{{ github.stars }}             — Total star count across repos
{{ github.repos }}             — Public repo count
{{ pypi.total_downloads }}     — Total PyPI downloads
{{ pypi.package_count }}       — Number of PyPI packages
{{ steps.count }}              — Player step count
{{ badges.count }}             — Earned badge count
{{ player.name }}              — Player name from save
{{ pokedex.seen }}             — Pokedex seen count
{{ pokedex.caught }}           — Pokedex caught count
```

**Autocomplete UI:**
- Floating dropdown appears below the cursor position in the text input
- VS Code-style: icon + command name + description + example resolved value
- Arrow keys to navigate, Enter to insert, Escape to dismiss
- Fuzzy matching: typing `{{spot` filters to spotify.* commands
- Inserted text: `{{ spotify.last_song }}` (with spaces for readability)

**Inline preview:**
- After inserting a template, the editor shows the resolved value inline in gray text
- E.g., `{{ spotify.last_song }}` shows as `{{ spotify.last_song }} → "Hakuna Matata"` (grayed)
- Resolved values fetched from the game's API endpoints asynchronously

### 6.4 Conditional Template Blocks

```
{{#if badges.count >= 3}}
  You've earned many badges!
{{else}}
  Keep exploring for badges!
{{/if}}
```

**Visual block editor:**
- Condition line: `if badges.count >= 3` with editable expression
- Two branches shown as indented blocks with different background colors
- "then" branch: green tint
- "else" branch: amber tint
- Can nest conditions (up to 2 levels)

### 6.5 Template Runtime Resolver (`src/game/systems/TemplateResolver.ts`)

**New game system** that processes `{{ }}` tokens in dialog text at display time.

```typescript
class TemplateResolver {
  // Cache for API results (TTL 60 seconds)
  private cache: Map<string, { value: string; timestamp: number }>;

  // Resolve all {{ }} tokens in a dialog line array
  async resolve(lines: string[]): Promise<string[]>;

  // Register a resolver for a namespace
  registerNamespace(ns: string, resolver: (key: string) => Promise<string>): void;
}
```

**Integration:** Called by `DialogSystem.showDialog()` before rendering text. Replaces the current hard-coded `dialogFn` approach for live NPCs — existing `dialogFn` implementations can be gradually migrated to `{{ }}` templates.

**Fallback:** If an API call fails, the resolver uses a fallback value (e.g., `{{ spotify.last_song }}` → `"a great track"` on failure). Fallbacks defined per namespace.

---

## 7. Phase 3: Debug Launcher & Testing

### 7.1 Debug Launcher Panel

**Bottom panel tab** next to "Problems" and "Checkpoints."

**Layout — two columns:**

**Left column — Player State:**
| Control | Type | Range |
|---------|------|-------|
| Player X | number input | 0-139 |
| Player Y | number input | 0-119 |
| Facing | dropdown | UP/DOWN/LEFT/RIGHT |
| Player Name | text input | default "RED" |
| Step Count | number input | 0-99999 |
| Pokedex Seen | number input | 0-31 |
| Pokedex Caught | number input | 0-31 |

**Right column — Badges & Items:**
| Control | Type |
|---------|------|
| GYM badge | checkbox |
| PUBLICATION badge | checkbox |
| CONNECTED badge | checkbox |
| POKEDEX badge | checkbox |
| BLOGGER badge | checkbox |
| ENGINEER badge | checkbox |
| COMPLETIONIST badge | checkbox |
| CHAMPION badge | checkbox |
| Papers collected | multi-select |
| Blogs collected | multi-select |
| TMs collected | multi-select |
| Key items collected | multi-select |
| Field moves (FORCE PUSH) | checkbox |
| Field moves (CUT) | checkbox |
| Gates cleared | multi-select |
| Gym complete | checkbox |

**Buttons:**
- **LAUNCH GAME** — opens game in new browser tab with this save state injected via localStorage
- **PLAY FROM HERE** — uses the currently selected tile on the viewport as spawn position
- **Reset to Default** — clears all debug state

### 7.2 Play-from-Here

**Also available in right-click context menu.**

**Flow:**
1. User right-clicks a tile or entity > "Play from Here"
2. Debug launcher state is captured (badges, items, etc.)
3. A temporary `GameSave` object is constructed:
   - `playerPosition: { x, y }` from the clicked tile
   - All badge/item state from the debug launcher
4. Save is written to `localStorage` under a special key `__editor_debug_save`
5. Game opened in new tab at `/explore`
6. `GameSave.loadFromStorage()` checks for `__editor_debug_save` and uses it if present
7. After loading, the debug key is cleared from localStorage

### 7.3 Save State Presets

**Pre-built presets:**
- **Fresh start** — no badges, no items, default spawn
- **Mid-game (4 badges)** — gym + publication + connected + pokedex badges, 6 papers, 5 blogs, 15 TMs, FORCE PUSH move
- **Near champion** — 7 badges (all except champion), all papers/blogs/TMs, both field moves, all gates cleared
- **All badges** — everything unlocked, Mew found, all items collected

**Custom presets:**
- "Save Preset" button: names the current debug state and stores in localStorage
- "Load Preset" dropdown: list of saved presets
- "Delete Preset" button on each saved preset

---

## 8. Phase 4: Tile & Collision Editing

### 8.1 Tile Painting

**Prerequisite:** Phase 1 Tiles tab in asset library shows the tile palette.

**Workflow:**
1. Select the Stamp tool (shortcut `3`)
2. Click a tile in the Tiles tab palette to select it (highlighted with blue border)
3. Click on the viewport to paint that tile onto the Ground layer
4. Hold mouse and drag to paint continuously (brush mode)
5. Each painted tile is an undo action

**Implementation:**
- Modifies the `mauville.json` Ground layer data array
- Tile GID written to `collisionLayer.data[y * 140 + x]` for the Ground layer
- Save writes modified JSON back to `public/game/maps/mauville.json`
- Phaser tilemap refreshes on each paint (immediate visual feedback)

### 8.2 Block Copy/Paste with Ghost Stamp

**Selection:**
1. Hold Shift + drag on viewport to select a rectangular region
2. Selected region highlighted with dashed blue border
3. "Block selected: 5x3 tiles" shown in status bar

**Stamping:**
1. After selection, cursor shows the selected block as a red-transparent ghost
2. Click to stamp copies of the selected block at cursor position
3. Each click stamps and stays in stamp mode
4. Escape to exit stamp mode
5. Each stamp is one undo action

**Multi-select stamp:**
- Ctrl+click individual tiles to add to selection (non-rectangular)
- Selected tiles form a "brush shape"
- Stamp places all selected tiles relative to cursor

### 8.3 Collision Layer Editing

**Toggle:** Collision overlay in layer toggles (red tint on blocked tiles).

**Editing:**
1. Select the Stamp tool
2. Hold Ctrl while clicking to toggle individual tiles between walkable/blocked
3. Or select a "collision brush" from a special collision palette
4. Click to paint collision ON, right-click to paint collision OFF
5. Brush sizes: 1x1, 2x2, 3x3 (selectable in toolbar)

**Implementation:**
- Modifies `mauville.json` Collision layer data
- Blocked tiles: sets GID to the collision marker tile
- Walkable tiles: sets GID to 0
- Immediate visual feedback via Phaser tilemap refresh

### 8.4 Foreground Depth Editing

**Toggle:** Foreground overlay in layer toggles (semi-transparent).

**Current implementation:** The foreground is a single PNG image (`mauville_foreground.png`) rendered on top of the player at a fixed depth. The editor doesn't modify this image directly — it's authored in Tiled.

**What the editor shows:**
- Toggle foreground visibility for reference while placing entities
- Indicator showing which areas render in front of the player
- No direct editing of the foreground PNG in Phase 4

---

## 9. Phase 5: Checkpoints & History

### 9.1 Checkpoints Panel

**Bottom panel tab.**

**Features:**
- "Save Checkpoint" button: prompts for a name, saves current entity state
- Checkpoint list: name, timestamp, entity counts (NPCs, Pokemon, Signs, Items)
- "Restore" button: reverts all entity state to the checkpoint (with confirmation)
- "Diff" button: shows a diff between the checkpoint and current state
- "Cherry-pick" button: opens a dialog to select individual entities from the checkpoint

**Storage:** Checkpoints stored in localStorage under `__editor_checkpoints`. Each checkpoint is a JSON blob of the full entity array.

**Auto-checkpoint:** A checkpoint named "Session Start" is automatically created when the editor loads.

### 9.2 Visual Diff Before Save

**Triggered by Ctrl+S (before the actual save).**

**Modal layout:**
- Full-screen overlay with semi-transparent dark background
- Left side: mini-map with change annotations
- Right side: grouped list of changes by file

**Change types displayed:**

| Change | Visual |
|--------|--------|
| Moved entity | Yellow highlight on map, arrow from old to new position, "Moved npc_boy_3: (29,66) -> (32,68)" |
| Changed dialog | Side-by-side text diff with green/red highlighting |
| Changed field | "npc_boy_3.movementBehavior: WANDER_LEFT_RIGHT -> LOOK_AROUND" |
| Added entity | Green highlight on map, green row in list |
| Deleted entity | Red X on map at old position, red strikethrough row in list |

**Buttons:** "Save Changes" (primary) and "Cancel" (secondary).

### 9.3 Full Undo History Viewer

**Accessible from Edit > Show History.**

**Timeline UI:**
- Vertical list of all actions since session start (most recent at top)
- Each row: timestamp, action icon, description
- Examples:
  - "14:32:01 — Moved npc_maniac to (65, 60)"
  - "14:31:45 — Changed dialog for npc_boy_3 (4 lines -> 5 lines)"
  - "14:31:20 — Added wild_latias at (27, 59)"
  - "14:30:55 — Deleted npc_old_woman_1"
- Click any row to revert to that state (confirmation: "Revert to this point? You will lose N subsequent actions.")
- Current position shown with blue arrow indicator

---

## 10. Phase 6: Interior Editing

### 10.1 Interior Map Switching

**Viewport dropdown (top-left of viewport area):**
- Options: "Overworld" (default), "Pokemon Center", "Mart", "Gym"
- Selecting an interior:
  1. Unloads the overworld tilemap
  2. Loads the interior's `mapJson` with its tilesets
  3. Renders interior NPCs with the same marker system
  4. Shows exit warp tiles as purple squares
  5. Shows PC tiles (pokecenter) and questionnaire tiles (mart/gym)
  6. All editing tools work the same as overworld
  7. Properties panel adapts to InteriorNPC fields
  8. Problems panel validates interior entities

**Interior-specific entities:**
- Exit warp tiles: purple squares at `exitWarpTiles` positions
- PC tiles: cyan squares at `pcTiles` positions (pokecenter only)
- Questionnaire tiles: yellow squares at `questionnaireTiles` positions (mart)

**Save writes to:** `src/game/data/interiors.ts` instead of `npcs.ts`.

### 10.2 Gym Puzzle Editor

**Gym-specific view when "Gym" interior is selected:**

**Switch visualization:**
- Switch tiles highlighted with orange border
- "Press" button on each switch to simulate toggling
- Barrier tiles highlighted: green = passable state, red = blocking state
- Animation shows barriers toggling between ON/OFF states

**Testing:**
- "Simulate Puzzle" mode: step through the puzzle state machine
- Each switch press updates barrier visualization in real-time
- Path highlighting: shows the solved path from entrance to KOSTAS
- Reset button returns all barriers to initial state

**Data:** Reads from `src/game/data/gym-puzzle.ts` (`GYM_TILE_SWAP` record and `GYM_BLOCKING_TILES` set). These are complex tile-swap mappings and are displayed read-only with "Edit in source" badge.

---

## 11. Phase 7: Advanced Features

### 11.1 NPC Movement Preview

When "Movement Ranges" layer toggle is ON:

| Behavior | Visualization |
|----------|--------------|
| STATIONARY | Small dot at position (no range box) |
| WANDER_LEFT_RIGHT | Horizontal dotted line from (x-rangeX) to (x+rangeX) |
| WANDER_UP_DOWN | Vertical dotted line from (y-rangeY) to (y+rangeY) |
| WANDER_AREA | Dotted rectangle from (x-rangeX, y-rangeY) to (x+rangeX, y+rangeY) |
| PACE_HORIZONTAL | Animated arrow bouncing left-right within range |
| PACE_VERTICAL | Animated arrow bouncing up-down within range |
| LOOK_AROUND | Rotating arrow showing scan pattern (4 directions) |
| RUN_HORIZONTAL | Faster animated arrow bouncing left-right |
| RUN_VERTICAL | Faster animated arrow bouncing up-down |

### 11.2 Search & Filter Bar

**Location:** Right side of toolbar.

**Search behavior:**
- Type any text → filters:
  - Entity IDs containing the text
  - Entity dialog lines containing the text
  - Speaker names containing the text
  - Item names/descriptions containing the text
  - Pokemon project names containing the text
- Matching entities highlighted on map with yellow glow
- Non-matching entity markers dimmed to 30% opacity
- Asset library filtered to matching entries

**Filter dropdowns (adjacent to search):**
- Zone: All / Mauville City / Route 117 / Route 118 / Route 110 / Route 111
- Type: All / NPC / Wild Pokemon / Sign / Hidden Item / Gate / Warp
- Movement: All / Stationary / Wander / Pace / Run / Look Around
- Has autoGive: All / Yes / No
- Has dialogFn: All / Yes / No (identifies API-powered NPCs)
- Has Pokemon: All / Yes / No

### 11.3 Multi-Select & Batch Edit

**Selection methods:**
- Shift+click to add/remove from selection
- Drag rectangle (hold Shift + drag on empty area) to select all entities inside
- Ctrl+A to select all visible entities

**Batch operations:**
- Batch move: drag any selected entity to move entire group (relative positions preserved)
- Batch change movement behavior: dropdown in a floating toolbar above selection
- Batch change facing direction: dropdown
- Batch delete: Delete key deletes all selected (with confirmation showing count)
- Batch copy: Ctrl+C copies selected entities to clipboard
- Batch paste: Ctrl+V pastes at cursor position (offset from original positions)

### 11.4 Sound Preview

**In zone properties (when a zone boundary is clicked):**
- BGM track name with "Play" button
- Click plays the BGM file from `public/game/music/`

**In entity properties:**
- If entity has autoGive: "Play pickup jingle" button
- If entity is Wild Pokemon: "Play discovery sound" button
- Badge jingle preview on badge entities

### 11.5 Entity Relationship Graph

**Accessible from:** View > Entity Relationships (or a toolbar button).

**Visual graph (rendered with a simple force-directed layout in a modal):**
- Nodes: entities (colored by type), items (colored by pocket), badges
- Edges:
  - NPC --autoGive--> Item
  - Item --contributes--> Badge
  - Wild Pokemon --registers--> Pokedex Badge
  - Hidden Item --grants--> Key Item --contributes--> Connected Badge
  - Gate --requires--> Field Move
  - Badge --teaches--> Field Move (via FIELD_MOVE_AWARDS)

**Highlights orphaned content:**
- Items with no giver (red border)
- NPCs that give nonexistent items (red border)
- Badges with unachievable conditions (red border)

### 11.6 Screenshot/Export Tool

**File > Export menu:**
- **Screenshot** — captures current viewport as PNG (using Phaser's `game.renderer.snapshot()`)
- **Full Map Export** — renders the entire 140x120 map at 1x scale with entity annotations as PNG
- **Entity JSON Export** — exports current entity state as `editor-export.json`
- **Entity CSV Export** — exports entity positions, types, and IDs as CSV

### 11.7 Guided Onboarding

**First launch (detected via localStorage flag):**
- 3-step interactive overlay:
  1. Arrow pointing at an NPC marker: "Click any NPC to select it"
  2. Arrow at right panel: "Edit properties here — position, dialog, items"
  3. Keyboard hint: "Press Ctrl+S to save changes back to source files"
- "Got it!" button to dismiss each step
- Checkbox: "Don't show again"

**Tips button in toolbar:** Replays the onboarding at any time.

### 11.8 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save |
| `Ctrl+D` | Duplicate selected entity |
| `Delete` / `Backspace` | Delete selected entity |
| `Escape` | Deselect / exit mode / close modal |
| `Space + drag` | Pan viewport |
| `Ctrl + scroll` | Zoom viewport |
| `1` | Select tool |
| `2` | Move (pan) tool |
| `3` | Stamp tool |
| `4` | Eraser tool |
| `5` | Eyedropper tool |
| `Tab` | Cycle to next entity |
| `Shift+Tab` | Cycle to previous entity |
| `Enter` | Open properties for selected entity |
| `Ctrl+A` | Select all entities |
| `Ctrl+C` | Copy selected entities |
| `Ctrl+V` | Paste entities at cursor |
| `Ctrl+F` | Focus search bar |
| `G` | Toggle grid lines |
| `H` | Toggle heatmap |
| `C` | Toggle collision overlay |
| `F` | Toggle foreground overlay |
| `M` | Toggle minimap |

---

## 12. Save Mechanism

### 12.1 API Endpoint (`src/pages/api/editor/save.ts`)

**Method:** `POST`
**Guard:** Only available when `import.meta.env.DEV === true`. Returns 403 in production.

**Request payload:**
```typescript
interface SaveRequest {
  changes: EntityChange[];
}

interface EntityChange {
  type: "move" | "update_field" | "update_dialog" | "add" | "delete";
  entityType: "npc" | "wild_pokemon" | "sign" | "hidden_item" | "interior_npc" | "warp" | "gate";
  entityId: string;
  sourceFile: string;       // relative path from project root
  sourceArray: string;      // array name in the source file
  applyOffset: boolean;     // whether to subtract MAUVILLE_ORIGIN before writing

  // For "move":
  newPosition?: { x: number; y: number };

  // For "update_field":
  fieldPath?: string;       // e.g. "movementBehavior", "facingDirection", "speakerName"
  newValue?: string | number | boolean;

  // For "update_dialog":
  newDialog?: string[];

  // For "add":
  newEntity?: Record<string, any>;  // full entity definition to insert

  // For "delete":
  // (entityId is sufficient)
}
```

### 12.2 Regex-Based Patching Strategy

The save endpoint uses the same regex approach as `scripts/map-analyzer.mjs` which already successfully parses all TS data files with regex. This is NOT AST transformation — it's targeted string replacement.

**Pattern for each patch type:**

**Move NPC (change position):**
```javascript
// Find the NPC block by id
const idRegex = new RegExp(`id:\\s*"${entityId}"`);
const idMatch = source.match(idRegex);
// From the id match, find the nearest position field
const posRegex = /position:\s*\{\s*x:\s*\d+,\s*y:\s*\d+\s*\}/;
// Replace with new coordinates (subtracting offset if needed)
const newPos = `position: { x: ${x}, y: ${y} }`;
```

**Update dialog:**
```javascript
// Find the NPC block by id, then find its dialog array
// Match: dialog: [\n  "line1",\n  "line2",\n]
const dialogRegex = /dialog:\s*\[[\s\S]*?\]/;
// Replace with new dialog lines
const newDialogStr = `dialog: [\n${lines.map(l => `      "${l}",`).join('\n')}\n    ]`;
```

**Update movement behavior:**
```javascript
// Find: movementBehavior: MovementBehavior.OLD_VALUE
const regex = /movementBehavior:\s*MovementBehavior\.\w+/;
// Replace: movementBehavior: MovementBehavior.NEW_VALUE
```

**Update facing direction:**
```javascript
// Find: facingDirection: Direction.OLD
const regex = /facingDirection:\s*Direction\.\w+/;
// Replace: facingDirection: Direction.NEW
```

**Update simple string/number fields (speakerName, movementRangeX, etc.):**
```javascript
// Find within NPC block: fieldName: oldValue
// Replace: fieldName: newValue
```

**Add new NPC:**
```javascript
// Find the end of the target array (last ] before the export)
// Insert the new NPC definition string before the closing ]
```

**Delete NPC:**
```javascript
// Find the entire NPC block by id (from opening { to closing },)
// Remove it (replace with empty string)
// Clean up any dangling commas
```

### 12.3 Source File Mapping

| Entity Type | Source File | Array Name | Offset Applied |
|-------------|-----------|------------|----------------|
| Mauville NPC | `src/game/data/npcs.ts` | `MAUVILLE_NPCS_RAW` | Yes (-50,-50) |
| Route NPC | `src/game/data/npcs.ts` | `ROUTE_NPCS` | No |
| Mauville Sign | `src/game/data/npcs.ts` | `MAUVILLE_SIGNS_RAW` | Yes (-50,-50) |
| Wild Pokemon | `src/game/data/wild-pokemon.ts` | `WILD_POKEMON` | No |
| Interior NPC | `src/game/data/interiors.ts` | `INTERIORS.{key}.npcs` | No |
| Hidden Item | `src/game/data/hiddenItems.ts` | `HIDDEN_ITEMS` | No |
| Gate | `src/game/data/gates.ts` | `GATES` | No |
| Warp | `src/game/data/warps.ts` | `WARPS` | No |
| Item Definition | `src/game/data/itemDefinitions.ts` | `ITEM_DEFINITIONS` | No |
| Research Log | `src/game/data/researchLog.ts` | `LOG_ENTRIES` | No |

### 12.4 READ-ONLY Fields

These fields contain TypeScript functions and cannot be edited via the visual editor:

| Field | Reason |
|-------|--------|
| `dialogFn` | Async function with API calls |
| `spawnCondition` | Closure referencing `isGateCleared()` |
| `condition` (BadgeDef) | Complex save state comparison |
| `contains` (ZoneDef) | Boundary function |

The editor shows these with a "Hand-edit in source" badge and a link to open the file in VS Code.

---

## 13. Map Analyzer Integration

### 13.1 API Endpoint (`src/pages/api/editor/analyze.ts`)

**Method:** `POST`
**Guard:** Dev-only.

**Wraps `scripts/map-analyzer.mjs`** by spawning it as a child process and parsing its JSON output.

**Request:**
```typescript
interface AnalyzeRequest {
  // Optional: virtual entities to add to the analysis (for preview)
  virtualEntities?: { x: number; y: number; tileWidth?: number; tileHeight?: number }[];
  // Optional: test a specific tile placement
  testTile?: { x: number; y: number };
}
```

**Response:**
```typescript
interface AnalyzeResponse {
  safeTiles: { x: number; y: number }[];
  reachableTiles: { x: number; y: number; distance: number }[];
  unreachableEntities: { id: string; x: number; y: number; reason: string }[];
  articulationPoints: { x: number; y: number }[];
  entityDensityByZone: Record<string, number>;
  warnings: string[];
  // If testTile was provided:
  testResult?: {
    tileSafe: boolean;
    newlyUnreachable: { x: number; y: number }[];
    entitiesCutOff: { id: string; x: number; y: number }[];
  };
}
```

### 13.2 Real-Time Validation

The editor calls the analyze API:
- On initial load (full analysis)
- When an entity moves (debounced 500ms, only changed entities)
- When the user requests a heatmap refresh
- When the problems panel "Refresh" button is clicked

**Cached data:** `game-map-data.json` (1,406 safe tiles) is loaded once at editor start for fast tile lookups. The full BFS analysis is only re-run when entity positions change.

### 13.3 Placement Validation

Before an entity is placed (drag-drop or manual coordinate entry):
1. Check if tile is in the collision layer → Error: "Cannot place on collision tile"
2. Check if tile is reachable from spawn → Warning: "Tile is unreachable from spawn"
3. Check if tile is occupied by another entity → Error: "Tile already occupied by npc_boy_3"
4. Check if tile is a warp → Warning: "Placing on a warp tile"
5. Check if tile is an articulation point → Warning: "Placing here could disconnect part of the map"
6. Run `--test X,Y` mode of analyzer to check if placement disconnects anything → Error if entities become unreachable

---

## 14. Key Technical Decisions

### 14.1 EditorScene is NOT OverworldScene

`EditorScene` extends `Phaser.Scene` directly. It is NOT a subclass of `OverworldScene`. Reasons:
- OverworldScene has player movement, NPC AI, dialog systems, step counting, badge checking — none of which the editor needs
- OverworldScene initializes Grid Engine with full character management — the editor only needs tilemap rendering
- Sharing code would create tight coupling and make both harder to maintain

`EditorScene` loads the same tilemap JSON and tileset PNGs but renders them independently with its own camera/input handling.

### 14.2 Flat JSON for Editor Data

Entity data is loaded as a flat JSON array at editor start, NOT imported from TS modules. Reasons:
- TS data files import from each other (npcs.ts imports from wild-pokemon.ts, interiors.ts imports from GameSave.ts) — importing them in the editor context would pull in the entire game engine
- The map-analyzer.mjs already solves this problem with regex extraction
- `scripts/editor-data-export.mjs` runs the same regex extraction and produces a single `editor-data.json`
- The editor loads this JSON via `GET /api/editor/data` at startup

### 14.3 Regex Patching Over AST

Save uses regex-based patching, not TypeScript AST transformation. Reasons:
- The existing `map-analyzer.mjs` already successfully parses all data files with regex
- AST transformation (ts-morph, babel) would add large dependencies and complexity
- The data files have predictable, consistent formatting (prettier-enforced)
- Regex is sufficient for the structured field replacements we need
- If regex fails (e.g., user added unusual formatting), the save endpoint returns an error with the specific match failure — the user can then hand-edit

### 14.4 No Production Build

The editor is dev-only. It is completely excluded from production builds:
- `editor.astro` has `import.meta.env.DEV` guard
- API endpoints return 403 if `!import.meta.env.DEV`
- `editor-data-export.mjs` only runs in dev mode
- No editor components are imported by any production page
- Tree-shaking removes all editor code from the production bundle

### 14.5 Event Bridge Pattern

Phaser <-> React communication uses the existing DOM CustomEvent pattern from `EventBridge.ts`. This is the proven approach in the existing codebase (used for dialog, menus, PC, questionnaire, notifications, etc.). The editor adds new event types prefixed with `editor:`.

### 14.6 Template System is a New Game Feature

The `{{ }}` template system is not just an editor feature — it's a new game runtime capability. `TemplateResolver.ts` runs in the actual game to resolve live data in NPC dialog. This means:
- Templates work in both the editor preview and the real game
- Live NPCs can gradually migrate from `dialogFn` to `{{ }}` templates
- The editor's template autocomplete reflects the actual available resolvers

---

## 15. Task Checklist

Every implementation task, organized by phase. Each task is concrete, independently verifiable, and includes file paths and expected behavior.

### Phase 0: Infrastructure & Data Pipeline

- [x] **P0-01** Create `scripts/editor-data-export.mjs`
  - File: `scripts/editor-data-export.mjs`
  - Reads: `src/game/data/npcs.ts`, `src/game/data/wild-pokemon.ts`, `src/game/data/hiddenItems.ts`, `src/game/data/interiors.ts`, `src/game/data/gates.ts`, `src/game/data/warps.ts`, `src/game/data/zones.ts`, `src/game/data/itemDefinitions.ts`, `src/game/data/researchLog.ts`, `src/game/data/pokemon.ts`, `src/game/systems/BadgeMilestones.ts`
  - Writes: `editor-data.json` at repo root
  - Uses regex extraction (same approach as `map-analyzer.mjs`)
  - Extracts: NPC positions+ids+fields, wild pokemon positions, signs, hidden items, gates, warps, item defs, pokedex entries, badge ids, research log entries
  - Applies MAUVILLE_ORIGIN offset (+50,+50) to MAUVILLE_NPCS_RAW and MAUVILLE_SIGNS_RAW positions
  - Verification: `node scripts/editor-data-export.mjs` produces valid JSON with all entity counts matching source files

- [x] **P0-02** Create `GET /api/editor/data` endpoint
  - File: `src/pages/api/editor/data.ts`
  - Returns: contents of `editor-data.json`
  - Guard: returns 403 if `!import.meta.env.DEV`
  - Verification: `curl http://localhost:4321/api/editor/data` returns JSON with entities

- [x] **P0-03** Create `POST /api/editor/analyze` endpoint
  - File: `src/pages/api/editor/analyze.ts`
  - Spawns `node scripts/map-analyzer.mjs --quiet` and parses stdout
  - Accepts optional `testTile` parameter → passes `--test X,Y` to analyzer
  - Returns parsed analysis JSON (safe tiles, unreachable entities, etc.)
  - Guard: returns 403 if `!import.meta.env.DEV`
  - Verification: `POST /api/editor/analyze` with `{}` body returns safe tile count ~1400

- [x] **P0-04** Create `POST /api/editor/save` endpoint (skeleton)
  - File: `src/pages/api/editor/save.ts`
  - Accepts `SaveRequest` payload
  - For now: logs payload and returns `{ success: true, message: "dry run" }`
  - Guard: returns 403 if `!import.meta.env.DEV`
  - Verification: POST with a test payload returns success response

- [x] **P0-05** Add `"editor"` dev script to `package.json`
  - Adds: `"dev:editor": "node scripts/editor-data-export.mjs && astro dev"`
  - Verification: `npm run dev:editor` generates `editor-data.json` then starts Astro dev server

- [x] **P0-06** Add `editor-data.json` to `.gitignore`
  - Verification: `git status` after generating does not show `editor-data.json`

### Phase 1A: Page Shell & Layout

- [x] **P1A-01** Create `src/pages/editor.astro`
  - Dev-only guard: if `!import.meta.env.DEV`, return `Response` with 404
  - Full HTML page (no BaseLayout, no site header/footer)
  - Dark theme: `bg-[#0f0f23]` body
  - Mounts `<EditorApp client:only="react" />`
  - Loads Tailwind CSS
  - Viewport meta: `width=device-width, initial-scale=1`
  - Title: "Pokemon World Designer IDE"
  - Verification: navigate to `http://localhost:4321/editor` shows dark page

- [x] **P1A-02** Create `src/components/editor/EditorApp.tsx`
  - Top-level React component
  - Wraps everything in `<EditorProvider>` (state context)
  - Layout: CSS Grid with areas for toolbar, left panel, viewport, right panel, bottom panel, status bar
  - Fetches `GET /api/editor/data` on mount and passes to context
  - Shows loading spinner until data arrives
  - Verification: EditorApp renders with "Loading editor data..." then switches to panel layout

- [x] **P1A-03** Create `src/components/editor/state/EditorContext.tsx`
  - React context with `useReducer`
  - State shape: `{ entities, selectedEntityId, layers, tool, undoStack, redoStack, dirty, analysisData }`
  - Dispatch actions: `SELECT_ENTITY`, `DESELECT`, `MOVE_ENTITY`, `UPDATE_FIELD`, `ADD_ENTITY`, `DELETE_ENTITY`, `TOGGLE_LAYER`, `SET_TOOL`, `UNDO`, `REDO`, `LOAD_DATA`, `SET_ANALYSIS`
  - Verification: context provides state and dispatch to children

- [x] **P1A-04** Create `src/components/editor/state/editorReducer.ts`
  - Handles all action types from above
  - MOVE_ENTITY: updates entity position, pushes to undo stack
  - UPDATE_FIELD: updates any entity field, pushes to undo stack
  - ADD_ENTITY: adds entity to entities array, pushes to undo stack
  - DELETE_ENTITY: removes entity by id, pushes to undo stack
  - UNDO: pops undo stack, applies inverse, pushes to redo stack
  - REDO: pops redo stack, applies action, pushes to undo stack
  - Verification: unit tests for each action type

- [x] **P1A-05** Create `src/components/editor/state/editorTypes.ts`
  - TypeScript types: `EditorEntity`, `EditorState`, `EditorAction`, `EditorLayer`, `EditorTool`
  - `EditorEntity` is a superset union: all entity types flattened with a `type` discriminator field
  - `EditorLayer`: `"ground" | "collision" | "foreground" | "entities" | "heatmap" | "zones" | "movement" | "grid"`
  - `EditorTool`: `"select" | "move" | "stamp" | "eraser" | "eyedropper"`
  - Verification: types compile with no errors

- [x] **P1A-06** Create `src/components/editor/state/undoStack.ts`
  - `pushAction(stack, action)` — pushes to undo stack, returns new stacks (undo + cleared redo)
  - `undo(stacks)` — pops undo, computes inverse, pushes to redo, returns new stacks + inverse action
  - `redo(stacks)` — pops redo, pushes to undo, returns new stacks + action
  - Max 100 items in undo stack (oldest discarded)
  - Verification: unit tests for push/undo/redo/max-size

### Phase 1B: Phaser Viewport

- [x] **P1B-01** Create `src/game/scenes/EditorScene.ts`
  - Extends `Phaser.Scene` with key `"EditorScene"`
  - `preload()`: loads `mauville.json` tilemap, `mauville_bottom.png` tileset, foreground image, all NPC sprites, all Pokemon icon sprites
  - `create()`: creates tilemap layers (Ground, Collision as invisible), sets up camera with zoom controls
  - `update()`: handles camera pan via pointer drag, emits `MOUSE_MOVE` event with tile coordinates
  - Camera zoom: scroll wheel, discrete steps [0.5, 1, 1.5, 2, 3, 4], default 1.5
  - Camera bounds: 0,0 to 140*16, 120*16 (full map extent)
  - Verification: tilemap renders correctly at `/editor`, can pan and zoom

- [x] **P1B-02** Create `src/components/editor/EditorViewport.tsx`
  - React component that mounts a Phaser game instance
  - Container div with `ref` for Phaser parent
  - Creates Phaser game with `EditorScene` only (no BootScene, no OverworldScene)
  - Handles resize: Phaser scale manager follows container
  - Cleanup: destroys Phaser game on unmount
  - Verification: Phaser viewport renders inside the editor layout

- [x] **P1B-03** Create `src/game/editor/EditorEntityRenderer.ts`
  - Called by `EditorScene.create()` after tilemap loads
  - Receives entity array from editor state (via DOM event)
  - For each entity, creates a Phaser graphic:
    - Colored circle/shape at the entity's tile position (see color scheme in 5.2)
    - If entity has a spritesheet: load first frame as thumbnail overlay
  - Methods: `addMarker(entity)`, `removeMarker(entityId)`, `updateMarkerPosition(entityId, x, y)`, `setSelected(entityId)`, `clearSelection()`
  - Selected entity: white ring (2px, 16px radius), pulsing animation
  - Verification: entity markers appear on the map at correct tile positions

- [x] **P1B-04** Create `src/game/editor/EditorInteraction.ts`
  - Click detection: pointer down on entity marker → emit `ENTITY_CLICKED`
  - Hover detection: pointer move near entity marker → emit `ENTITY_HOVERED`
  - Drag detection: pointer down + hold 200ms on selected entity → enter drag mode
  - During drag: emit `DRAG_MOVE` with snapped tile coordinates
  - On release: emit `DRAG_END` with final tile position
  - Right-click: emit custom event for context menu
  - Verification: clicking an entity marker emits the correct event

- [x] **P1B-05** Create `src/game/editor/EditorOverlays.ts`
  - Layer management: toggle visibility of overlays
  - Collision overlay: red-tinted semi-transparent tiles over collision GIDs
  - Foreground overlay: foreground PNG rendered at reduced opacity
  - Grid lines: 1px lines at every 16px (tile boundaries)
  - Zone boundaries: colored outlines around zone regions (Mauville=blue, routes=green/amber/etc.)
  - Heatmap: receives reachability data, renders gradient tiles (green=near, red=far/blocked)
  - Methods: `setLayerVisible(layer, visible)`, `setHeatmapData(data)`, `clearHeatmap()`
  - Verification: toggling collision overlay shows red tiles over blocked areas

- [x] **P1B-06** Handle camera controls in `EditorScene`
  - Middle-mouse button drag: pan camera
  - Space+left-mouse drag: pan camera
  - Scroll wheel: zoom in/out (centered on cursor)
  - Double-click: center camera on clicked tile
  - Arrow keys: pan camera when no entity selected
  - Zoom steps: [0.5, 0.75, 1, 1.5, 2, 3, 4]
  - Verification: all pan/zoom controls work smoothly

- [x] **P1B-07** Coordinate display in viewport
  - Bottom-left corner text: `Tile: (X, Y) — ZONE_NAME`
  - Updated from `EditorScene.update()` pointer position
  - Font: monospace, 12px, white with dark shadow
  - Zone name from zone definitions
  - Verification: coordinates track mouse movement correctly

### Phase 1C: Left Panel (Asset Library)

- [x] **P1C-01** Create `src/components/editor/panels/AssetLibrary.tsx`
  - Vertical panel, 280px wide
  - Tab bar: Pokemon | NPCs | Tiles
  - Each tab renders its sub-component
  - Layer toggles section at bottom
  - Verification: tabs switch correctly, panel scrolls

- [x] **P1C-02** Create `src/components/editor/panels/AssetLibraryPokemonTab.tsx`
  - Scrollable list of all POKEDEX entries
  - Each row: 32x32 icon sprite (rendered from `/game/sprites/pokemon/icons/{species}.png`, first frame crop) + `#NNN` + project name
  - Search input at top: filters by name, species, project name
  - Click: selects Pokemon in editor state (shows in properties panel)
  - Drag start: initiates drag-to-viewport flow
  - Verification: all 31 Pokemon listed with correct icons

- [x] **P1C-03** Create `src/components/editor/panels/AssetLibraryNPCTab.tsx`
  - Scrollable list of available NPC sprites (58 sprite keys)
  - Each row: sprite preview (first frame, scaled) + sprite key name
  - Grouped: "Placed NPCs" (by zone) + "Available Sprites" (all keys)
  - Smart Templates section (Blog Giver, Paper Giver, Live Data, Wild Pokemon, Item Ball, Decorative)
  - Search input
  - Drag: initiates drag-to-viewport flow
  - Verification: all 58 sprites listed, templates expand with correct defaults

- [x] **P1C-04** Create `src/components/editor/panels/AssetLibraryTileTab.tsx`
  - Tile palette rendered from `mauville_bottom.png` as a grid of 16x16 tiles at 2x zoom
  - Click to select tile for painting (Phase 4 — in Phase 1, just displays the palette)
  - Hover shows tile GID
  - Stubbed: "Tile painting available in Phase 4" banner
  - Verification: tileset renders as a grid, tiles are clickable

- [x] **P1C-05** Layer toggle checkboxes
  - 8 toggles: Ground, Collision, Foreground, Entities, Heatmap, Zones, Movement Ranges, Grid Lines
  - Each: checkbox + label + colored indicator dot
  - Toggle dispatches `TOGGLE_LAYER` to editor state + emits `EditorEvents.TOGGLE_LAYER` to Phaser
  - State persisted to localStorage
  - Verification: toggling each layer shows/hides the corresponding overlay

### Phase 1D: Right Panel (Properties Inspector)

- [x] **P1D-01** Create `src/components/editor/panels/PropertiesPanel.tsx`
  - Vertical panel, 320px wide
  - Shows properties of `selectedEntityId` from editor state
  - Empty state: "Select an entity on the map or in the asset library"
  - Accordion sections (collapsible)
  - Verification: selecting an entity populates the panel

- [x] **P1D-02** Create `src/components/editor/panels/PositionSection.tsx`
  - ID: read-only text field
  - Type badge: colored pill (NPC/Pokemon/Sign/Item/Warp/Gate)
  - Sprite Key: dropdown with preview thumbnails
  - Position X/Y: number inputs (0-139, 0-119)
  - "Safe" indicator: green/red based on analyzer data
  - Facing Direction: dropdown (UP, DOWN, LEFT, RIGHT)
  - Animated: checkbox
  - Changes dispatch `UPDATE_FIELD` with undo recording
  - Verification: changing X/Y updates entity position on map

- [x] **P1D-03** Create movement section
  - Movement Behavior dropdown (all MovementBehavior enum values)
  - Range X/Y number inputs
  - Speed override (optional)
  - Behavior interval min/max (optional)
  - When section expanded: draw movement range rectangle on viewport
  - Verification: changing movement behavior updates the entity

- [x] **P1D-04** Create `src/components/editor/panels/DialogSection.tsx`
  - Speaker Name text input
  - Dialog slides list (vertical stack of cards)
  - Each card: slide text, estimated line count, page count
  - Drag to reorder (react-dnd or native drag)
  - "+" add slide button
  - Delete (X) on each slide
  - Changes dispatch `UPDATE_DIALOG` action
  - Verification: editing dialog text and reordering persists in state

- [x] **P1D-05** Create `src/components/editor/panels/AutoGiveSection.tsx`
  - Conditional: only shown if entity has autoGive or is a template that includes it
  - Item ID dropdown (all ITEM_DEFINITIONS, grouped by pocket)
  - Aside Position X/Y inputs
  - Cleared Dialog text area
  - "Show aside" button: draws dashed line on viewport
  - Verification: selecting an item updates the autoGive config

- [x] **P1D-06** Create `src/components/editor/panels/PickupSection.tsx`
  - Conditional: only shown if entity has pickup
  - Item ID dropdown
  - Legacy fields (read-only if present)
  - Verification: selecting a pickup item updates the entity

- [x] **P1D-07** Create `src/components/editor/panels/PokemonSection.tsx`
  - Conditional: only shown if entity has pokemon data
  - Pokedex Number dropdown (all entries)
  - Auto-fill: species, project name, description, URL from POKEDEX
  - Repeat Dialog text area
  - Joins Party dropdown (optional)
  - Verification: changing pokedex number auto-fills species info

- [x] **P1D-08** Create `src/components/editor/panels/RelationshipsSection.tsx`
  - Zone: auto-detected, shown as badge
  - Distance from spawn: BFS distance
  - Badge contribution: which badge(s) this entity counts toward
  - Progress: "Blog 3 of 8 total blogs"
  - Read-only — computed from entity data and badge definitions
  - Verification: shows correct badge relationship for a blog-giver NPC

### Phase 1E: Bottom Panel & Status

- [x] **P1E-01** Create `src/components/editor/panels/ProblemsPanel.tsx`
  - Tab in bottom panel
  - List of validation problems: severity icon, rule name, entity id, message
  - Click problem → select entity on map + scroll viewport to it
  - Problem count: errors and warnings separately
  - "Refresh" button
  - Auto-refresh on entity changes (debounced 300ms)
  - Verification: validation rules produce correct problems for test data

- [x] **P1E-02** Implement validation rules
  - File: `src/components/editor/state/validationRules.ts`
  - Each rule: `(entities, itemDefs, pokedex, badges) => Problem[]`
  - Rules: `no-duplicate-ids`, `entity-on-collision`, `entity-unreachable`, `npc-range-into-collision`, `missing-autogive-item`, `missing-pickup-item`, `missing-pokemon-entry`, `badge-unachievable`, `orphan-item`, `template-unresolved`, `sign-no-text`, `warp-no-interior`, `gate-no-npc`, `hidden-item-map-mismatch`
  - Verification: unit tests for each validation rule

- [x] **P1E-03** Create `src/components/editor/viewport/StatusBar.tsx`
  - 24px bar at bottom of editor
  - Left: zone name, tile coordinates (mirrors viewport coordinate display)
  - Center: entity counts ("47 NPCs, 30 Pokemon, 12 Signs, 8 Items")
  - Right: problem count ("3 errors, 7 warnings"), save state ("Saved" / "Unsaved changes")
  - Verification: status bar shows correct counts and updates live

### Phase 1F: Drag/Drop, Delete, Context Menu

- [x] **P1F-01** Implement drag-to-move in viewport
  - Selected entity: hold 200ms to enter drag mode
  - Ghost preview: semi-transparent sprite at 50% opacity, snapped to grid
  - Dashed outline at original position
  - Drop preview: green (safe) or red (blocked) tile tint
  - Release: dispatch `MOVE_ENTITY` action
  - Escape: cancel drag
  - Verification: drag an NPC from one tile to another, see position update

- [ ] **P1F-02** Implement drag-from-library to viewport
  - Mouse down on library item starts drag
  - Green pulsing preview on viewport
  - Release on valid tile: dispatch `ADD_ENTITY` with template defaults
  - Open properties panel
  - Generate unique id
  - Verification: drag a Pokemon from library to viewport, see new entity created

- [x] **P1F-03** Implement delete mechanisms
  - Trash zone: bottom-right corner during drag
  - Right-click > Delete: confirmation dialog
  - Keyboard Delete/Backspace: confirmation dialog
  - All dispatch `DELETE_ENTITY` action (undoable)
  - Verification: delete an entity, Ctrl+Z brings it back

- [x] **P1F-04** Create `src/components/editor/viewport/ContextMenu.tsx`
  - React component rendered as a portal
  - Positioned at right-click location
  - Entity context: Edit Properties, Duplicate, Delete, Move to Safe Tile, Play from Here, Measure Distance, Copy ID
  - Empty tile context: Place NPC, Place Pokemon, Place Sign, Place Item, Mark Tile Info, Jump to Tile
  - Closes on click outside or Escape
  - Verification: right-click shows menu, clicking an option performs the action

### Phase 1G: Save, Undo, Toolbar, Minimap

- [x] **P1G-01** Implement save flow
  - Ctrl+S triggers save
  - Compute diff between current state and original loaded state
  - Show SaveDiffViewer modal
  - On confirm: POST to `/api/editor/save` with changes
  - On success: mark state as clean, show "Saved" in status bar
  - On error: show error message, mark which changes failed
  - Verification: edit an NPC position, Ctrl+S, verify source file changed on disk

- [x] **P1G-02** Implement full save endpoint
  - File: `src/pages/api/editor/save.ts` (replace skeleton from P0-04)
  - For each change in the payload:
    - Read the target source file
    - Find the entity block by id (regex)
    - Apply the patch (position, dialog, field, add, delete)
    - Write the file back
  - Return per-change success/failure
  - Handle errors gracefully (regex match failure → detailed error message)
  - Verification: save a position change, check source file has new coordinates

- [ ] **P1G-03** Create `src/components/editor/viewport/SaveDiffViewer.tsx`
  - Full-screen modal overlay
  - Groups changes by file
  - Shows: moved (arrow), changed dialog (diff), added (green), deleted (red)
  - "Save Changes" and "Cancel" buttons
  - Verification: making changes shows correct diff in viewer

- [x] **P1G-04** Implement undo/redo keyboard shortcuts
  - `useKeyboardShortcuts` hook
  - Ctrl+Z dispatches `UNDO`
  - Ctrl+Y / Ctrl+Shift+Z dispatches `REDO`
  - Verification: move an entity, undo, entity returns to original position

- [x] **P1G-05** Create `src/components/editor/toolbar/Toolbar.tsx`
  - File/Edit/View dropdown menus
  - Tool buttons: Select, Move, Stamp, Eraser, Eyedropper
  - Search bar (right side)
  - Entity count display
  - Verification: menus open, tools switch, search filters

- [x] **P1G-06** Create `src/components/editor/viewport/Minimap.tsx`
  - 180x120px canvas in bottom-left of viewport
  - Renders zone colors as background
  - Entity dots (1-2px, colored by type)
  - White viewport rectangle
  - Click to jump to area
  - Drag viewport rectangle to pan
  - Verification: minimap shows entity dots, clicking jumps viewport

- [x] **P1G-07** Implement reachability heatmap
  - Toggle "Heatmap" layer
  - Calls `/api/editor/analyze` to get reachability data
  - Renders green gradient (reachable, by distance) and red (unreachable)
  - Loading indicator while computing
  - Cache last result
  - Verification: enabling heatmap shows green/red overlay matching map-analyzer output

- [x] **P1G-08** Implement all remaining keyboard shortcuts
  - Full shortcut table from Section 11.8
  - Prevent browser defaults (Ctrl+S, Ctrl+D, etc.)
  - Shortcuts only active when editor has focus (not in text inputs)
  - Verification: each shortcut performs its action

### Phase 2: Dialog & Template System

- [x] **P2-01** Create `src/components/editor/dialog/DialogSlideEditor.tsx`
  - Visual storyboard: horizontal scrollable row of slide cards
  - Each card: 240x80px with pixel-art border
  - Shows speaker name, text with word-wrap preview, page count badge
  - Drag to reorder with smooth animation
  - "+" button at end
  - Verification: slides render with correct word-wrap, reorder works

- [x] **P2-02** Create `src/components/editor/dialog/DialogSlide.tsx`
  - Single slide card component
  - 35-character word-wrap preview (matching game's dialog box)
  - Page indicator: "1/3" if text spans multiple pages
  - Click to expand inline editor
  - Delete (X) button on hover
  - Verification: word-wrap matches game rendering

- [ ] **P2-03** Create `src/components/editor/dialog/DialogPlayback.tsx`
  - Floating preview panel (480x160px, centered)
  - Pixel-art dialog box rendering
  - Typewriter effect (50ms per character)
  - Page advancement (click/Enter)
  - Speaker name pill
  - Page indicator
  - Resolves `{{ }}` templates
  - Verification: clicking Play animates dialog with correct timing

- [x] **P2-04** Create `src/components/editor/dialog/TemplateAutocomplete.tsx`
  - Triggered by typing `{{` in dialog text inputs
  - Floating dropdown below cursor
  - Lists all available template commands with icons and descriptions
  - Fuzzy matching as user types
  - Arrow keys navigate, Enter inserts, Escape dismisses
  - Verification: typing `{{spot` shows spotify.* commands, Enter inserts

- [ ] **P2-05** Implement inline template preview
  - After inserting `{{ command }}`, show resolved value inline (grayed)
  - Async fetch from game API endpoints for live values
  - Fallback: "[loading...]" then actual value
  - Verification: inserting `{{ github.followers }}` shows the resolved count

- [ ] **P2-06** Create conditional template block editor
  - Visual editor for `{{#if}}...{{else}}...{{/if}}`
  - Condition expression editor
  - Two branch editors with colored backgrounds
  - Up to 2 nesting levels
  - Verification: creating a conditional block produces correct template syntax

- [x] **P2-07** Create `src/game/systems/TemplateResolver.ts`
  - `resolve(lines: string[]): Promise<string[]>` — processes all `{{ }}` tokens
  - Namespace registry: spotify, strava, github, pypi, steps, badges, player, pokedex
  - Cache with 60-second TTL
  - Fallback values per namespace
  - Verification: `resolve(["Hello {{ player.name }}!"])` returns `["Hello RED!"]`

- [ ] **P2-08** Register template namespaces
  - spotify: calls existing `/api/spotify/now-playing` → extracts track/artist
  - strava: calls existing `/api/strava/recent` → extracts distance/type/name
  - github: calls existing `/api/stats/github` → extracts commits/followers/stars/repos
  - pypi: calls existing `/api/stats/pypi` → extracts downloads/package_count
  - steps: reads from StepStore
  - badges: reads from GameSave.badges.length
  - player: reads from GameSave.playerName
  - pokedex: reads from GameSave.pokedexSeen/pokedexCaught
  - Verification: each namespace resolves correctly with live API data

- [ ] **P2-09** Integrate TemplateResolver into DialogSystem
  - `DialogSystem.showDialog()` calls `templateResolver.resolve(lines)` before rendering
  - Transparent to the caller — existing dialog calls work unchanged
  - Only processes lines containing `{{ }}`
  - Verification: an NPC with `{{ }}` dialog shows resolved values in the game

### Phase 3: Debug Launcher & Testing

- [x] **P3-01** Create `src/components/editor/panels/DebugLauncher.tsx`
  - Bottom panel tab
  - Two-column layout: Player State (left), Badges & Items (right)
  - All controls from Section 7.1
  - State stored in React local state (not editor context)
  - Verification: all controls render and update state

- [x] **P3-02** Implement LAUNCH GAME button
  - Constructs GameSave object from debug launcher state
  - Writes to localStorage as `__editor_debug_save`
  - Opens `/explore` in new tab
  - Verification: clicking LAUNCH GAME opens game with debug state applied

- [x] **P3-03** Implement PLAY FROM HERE
  - Uses selected tile position as spawn
  - Combines with debug launcher state
  - Available in context menu and debug launcher panel
  - Verification: right-click > Play from Here opens game at that position

- [x] **P3-04** Modify `GameSave.loadFromStorage()` to check for debug save
  - If `__editor_debug_save` exists in localStorage, load it instead of regular save
  - Clear `__editor_debug_save` after loading
  - Verification: debug save is consumed once and cleared

- [x] **P3-05** Implement save state presets
  - Pre-built: Fresh Start, Mid-game, Near Champion, All Badges
  - Custom: Save/Load/Delete presets in localStorage
  - Dropdown selector in debug launcher
  - Verification: loading "Mid-game" preset sets 4 badges + items

### Phase 4: Tile & Collision Editing

- [ ] **P4-01** Implement tile painting with Stamp tool
  - Select Stamp tool (shortcut `3`)
  - Click tile palette to select tile GID
  - Click viewport to paint tile on Ground layer
  - Hold + drag for continuous painting
  - Each paint action is undoable
  - Modifies mauville.json data
  - Verification: paint a tile, see it update on viewport, undo reverts it

- [ ] **P4-02** Implement block copy/paste
  - Shift+drag to select rectangular region
  - Region highlighted with dashed blue border
  - Selected block follows cursor as ghost stamp
  - Click to stamp copies
  - Escape to exit stamp mode
  - Verification: select a 3x3 block, stamp it elsewhere

- [ ] **P4-03** Implement Ctrl+click multi-tile selection
  - Ctrl+click adds individual tiles to selection
  - Non-rectangular brush shape
  - Stamp places all selected tiles at relative positions
  - Verification: select scattered tiles, stamp as group

- [ ] **P4-04** Implement collision layer editing
  - Ctrl+click on collision overlay toggles walkable/blocked
  - Collision brush: 1x1, 2x2, 3x3 (toolbar selector)
  - Click paints collision ON, right-click paints collision OFF
  - Modifies mauville.json Collision layer data
  - Verification: toggle a tile's collision, see red overlay change

- [ ] **P4-05** Implement Eraser tool
  - Select Eraser tool (shortcut `4`)
  - Click on viewport to clear tile to empty (GID 0)
  - Works on both Ground and Collision layers (Ctrl for collision)
  - Verification: eraser clears a painted tile

- [ ] **P4-06** Implement Eyedropper tool
  - Select Eyedropper tool (shortcut `5`)
  - Click on viewport to pick the tile GID under cursor
  - Auto-switches to Stamp tool with picked tile selected
  - Verification: eyedrop a tile, stamp tool activated with that tile

- [ ] **P4-07** Save tilemap changes
  - Save endpoint extended to handle mauville.json writes
  - Writes modified Ground and Collision layer data arrays
  - Verification: paint tiles, save, verify mauville.json file changed

### Phase 5: Checkpoints & History

- [x] **P5-01** Create `src/components/editor/panels/CheckpointsPanel.tsx`
  - Bottom panel tab
  - "Save Checkpoint" button with name prompt
  - List of checkpoints: name, timestamp, counts
  - Restore, Diff, Cherry-pick buttons
  - Auto-checkpoint "Session Start" on load
  - Stored in localStorage
  - Verification: save checkpoint, make changes, restore → reverts to checkpoint

- [ ] **P5-02** Implement checkpoint diff view
  - Click "Diff" on a checkpoint
  - Shows changes between checkpoint and current state
  - Grouped by entity: added, removed, moved, changed
  - Verification: diff correctly identifies moved entities

- [ ] **P5-03** Implement cherry-pick from checkpoint
  - Dialog showing entities from checkpoint
  - Select individual entities to restore
  - Selected entities replace their current-state counterparts
  - Verification: cherry-pick one entity from old checkpoint

- [ ] **P5-04** Enhance SaveDiffViewer
  - Map mini-view with arrows for moved entities
  - Side-by-side dialog diffs with green/red highlights
  - Added entities: green background
  - Deleted entities: red strikethrough
  - Verification: all change types displayed correctly

- [ ] **P5-05** Create undo history viewer
  - Edit > Show History
  - Timeline: vertical list of all actions
  - Click to revert to any point
  - Confirmation dialog for reverting
  - Current position indicator
  - Verification: click a past action to revert, verify state matches

### Phase 6: Interior Editing

- [x] **P6-01** Add interior map dropdown to viewport
  - Dropdown: Overworld / Pokemon Center / Mart / Gym
  - Positioned at top-left of viewport area
  - Verification: dropdown renders with all 4 options

- [x] **P6-02** Implement interior tilemap loading
  - Selecting an interior:
    - Unloads current tilemap in EditorScene
    - Loads interior's mapJson with its tilesets
    - Adjusts camera bounds to interior dimensions
  - Verification: selecting "Pokemon Center" renders the 14x9 pokecenter map

- [ ] **P6-03** Render interior NPCs
  - Load interior NPCs from editor data
  - Same marker system as overworld
  - Properties panel adapts to InteriorNPC fields (no movement behavior, no ephemeral)
  - Verification: pokecenter NPCs (nurse, old man, researcher) appear on map

- [ ] **P6-04** Render interior special tiles
  - Exit warp tiles: purple squares
  - PC tiles: cyan squares
  - Questionnaire tiles: yellow squares
  - Click to inspect in properties panel
  - Verification: pokecenter shows purple exit tiles and cyan PC tile

- [ ] **P6-05** Save interior changes
  - Save endpoint handles `src/game/data/interiors.ts` patches
  - Regex finds `INTERIORS.{key}.npcs` array and patches within it
  - Verification: edit pokecenter NPC dialog, save, verify interiors.ts changed

- [ ] **P6-06** Gym puzzle visualization
  - When gym interior selected: show switch tiles (orange), barrier tiles (green/red)
  - "Press" button simulates switch toggle
  - Barrier tiles toggle between blocking/passable states
  - Uses `GYM_TILE_SWAP` data from `gym-puzzle.ts`
  - Verification: pressing a switch visually toggles barrier tiles

- [ ] **P6-07** Gym puzzle path solving
  - "Solve Puzzle" button: highlights the path from entrance to KOSTAS
  - Shows minimum switch presses needed
  - Read-only — puzzle data is complex and stays source-edited
  - Verification: solved path highlighted correctly

### Phase 7: Advanced Features

- [x] **P7-01** NPC movement preview visualization
  - Movement Ranges layer toggle
  - STATIONARY: dot only
  - WANDER_*: dotted rectangle showing range box
  - PACE_*: animated arrow bouncing
  - LOOK_AROUND: rotating direction arrow
  - RUN_*: faster animated arrow
  - Verification: each movement type shows correct visualization

- [x] **P7-02** Search & filter bar
  - Search input in toolbar
  - Filters entities by: id, dialog text, speaker name, item name, project name
  - Matching entities highlighted yellow on map
  - Non-matching dimmed to 30% opacity
  - Asset library filtered in sync
  - Verification: typing "spotify" highlights the spotify NPC

- [ ] **P7-03** Filter dropdowns
  - Zone filter: All / per-zone
  - Type filter: All / NPC / Pokemon / Sign / Item / Gate / Warp
  - Movement filter: All / per-behavior
  - Has autoGive: All / Yes / No
  - Has dialogFn: All / Yes / No
  - Has Pokemon: All / Yes / No
  - Verification: filtering by zone shows only entities in that zone

- [ ] **P7-04** Multi-select
  - Shift+click to add/remove from selection
  - Shift+drag to rectangle-select
  - Ctrl+A to select all visible
  - Selection count shown in status bar
  - Verification: Shift+click two entities, both highlighted

- [ ] **P7-05** Batch operations
  - Batch move: drag group (relative positions preserved)
  - Batch change movement behavior: floating dropdown
  - Batch change facing: floating dropdown
  - Batch delete: with count confirmation
  - Batch copy/paste: Ctrl+C/V
  - Verification: select 3 NPCs, batch change movement to STATIONARY

- [ ] **P7-06** Sound preview
  - Zone properties: BGM "Play" button
  - NPC autoGive: pickup jingle preview
  - Pokemon: discovery sound preview
  - Badge: jingle preview
  - Uses `<audio>` elements with game's sound files
  - Verification: clicking play on a zone previews the BGM track

- [ ] **P7-07** Entity relationship graph
  - View > Entity Relationships
  - Modal with force-directed graph
  - Nodes: entities, items, badges
  - Edges: gives/contributes/requires relationships
  - Orphan highlights: red borders
  - Verification: graph shows NPC -> item -> badge chain

- [ ] **P7-08** Screenshot/export tools
  - File > Export > Screenshot: Phaser snapshot as PNG
  - File > Export > Full Map: render at 1x with annotations
  - File > Export > Entity JSON: current state as JSON
  - File > Export > Entity CSV: positions + types + ids
  - Verification: each export produces correct output file

- [ ] **P7-09** Guided onboarding
  - First launch detection (localStorage flag)
  - 3-step overlay with arrows
  - "Got it!" dismissal per step
  - "Don't show again" checkbox
  - "Tips" button in toolbar to replay
  - Verification: first launch shows onboarding, subsequent launches don't

- [ ] **P7-10** Keyboard shortcuts implementation
  - Complete shortcut table from Section 11.8
  - Prevent browser defaults for captured shortcuts
  - Shortcuts disabled when focus is in text inputs
  - Visual shortcut reference (? key shows overlay)
  - Verification: each shortcut works as documented

---

## Appendix A: Editor Entity JSON Schema

The `editor-data.json` produced by `editor-data-export.mjs` has this top-level shape:

```json
{
  "version": 1,
  "exportedAt": "2026-04-12T14:00:00Z",
  "map": {
    "width": 140,
    "height": 120,
    "tileSize": 16,
    "spawn": { "x": 72, "y": 58 }
  },
  "entities": [
    {
      "type": "npc",
      "sourceFile": "src/game/data/npcs.ts",
      "sourceArray": "MAUVILLE_NPCS_RAW",
      "applyOffset": true,
      "id": "npc_mauville_spotify",
      "spriteKey": "boy_3",
      "position": { "x": 58, "y": 64 },
      "facingDirection": "DOWN",
      "movementBehavior": "LOOK_AROUND",
      "movementRangeX": 0,
      "movementRangeY": 0,
      "dialog": ["KOSTAS's Spotify is offline right now.", "..."],
      "speakerName": "MUSIC FAN",
      "animated": true,
      "hasDialogFn": true,
      "hasSpawnCondition": false,
      "autoGive": null,
      "pickup": null,
      "pokemon": null,
      "ephemeral": null
    },
    {
      "type": "wild_pokemon",
      "sourceFile": "src/game/data/wild-pokemon.ts",
      "sourceArray": "WILD_POKEMON",
      "applyOffset": false,
      "id": "wild_latias",
      "spriteKey": "pkmn_latias",
      "position": { "x": 27, "y": 59 },
      "facingDirection": "DOWN",
      "movementBehavior": "STATIONARY",
      "movementRangeX": 0,
      "movementRangeY": 0,
      "dialog": [],
      "animated": false,
      "pokemon": {
        "pokedexNumber": 1,
        "speciesName": "LATIAS",
        "projectName": "MEDiC",
        "projectDescription": "CLIP distillation framework for medical imaging"
      }
    },
    {
      "type": "sign",
      "sourceFile": "src/game/data/npcs.ts",
      "sourceArray": "MAUVILLE_SIGNS_RAW",
      "applyOffset": true,
      "id": "MAUVILLE_SIGNS_RAW_0",
      "position": { "x": 60, "y": 55 },
      "text": ["MAUVILLE CITY GYM", "LEADER: KOSTAS"]
    },
    {
      "type": "hidden_item",
      "sourceFile": "src/game/data/hiddenItems.ts",
      "sourceArray": "HIDDEN_ITEMS",
      "applyOffset": false,
      "id": "ow_test_rock",
      "position": { "x": 72, "y": 59 },
      "itemId": "key_rock_potion",
      "difficulty": "easy",
      "placement": "rock"
    },
    {
      "type": "warp",
      "sourceFile": "src/game/data/warps.ts",
      "sourceArray": "WARPS",
      "applyOffset": false,
      "id": "warp_58_55",
      "overworldTile": { "x": 58, "y": 55 },
      "targetMap": "gym",
      "spawnTile": { "x": 4, "y": 20 },
      "spawnFacing": "up"
    }
  ],
  "itemDefinitions": { "paper_explore": { "id": "paper_explore", "name": "ExPLoRe", "pocket": "papers", "..." : "..." } },
  "pokedex": [ { "number": 1, "name": "MEDiC", "pokemon": "Latias", "..." : "..." } ],
  "badges": [ { "id": "gym", "name": "GYM", "hint": "Complete the GYM puzzle" } ],
  "zones": [ { "id": "mauville", "name": "MAUVILLE CITY", "bounds": { "xMin": 50, "xMax": 89, "yMin": 50, "yMax": 69 } } ],
  "researchLog": [ { "number": 1, "title": "Why I left Greece", "threshold": 5 } ],
  "fieldMoveAwards": [ { "badgeId": "pokedex", "pokemonId": "fleetsmart", "moveName": "FORCE PUSH" } ],
  "sprites": {
    "npcs": ["aqua_member_f", "aqua_member_m", "beauty", "..."],
    "pokemon": ["absol", "aggron", "altaria", "..."]
  }
}
```

## Appendix B: Regex Patterns for Source File Patching

These patterns are used by the save endpoint to modify TypeScript source files.

### B.1 Find NPC Block by ID

```javascript
// Matches from the id field to the next closing brace + comma at the same indent level
// Works for both MAUVILLE_NPCS_RAW and ROUTE_NPCS arrays
function findNpcBlock(source, entityId) {
  const idPattern = `id:\\s*"${escapeRegex(entityId)}"`;
  const idRegex = new RegExp(idPattern);
  const idMatch = source.match(idRegex);
  if (!idMatch) return null;

  // Walk backwards from id match to find opening {
  let braceDepth = 0;
  let blockStart = idMatch.index;
  for (let i = idMatch.index; i >= 0; i--) {
    if (source[i] === '}') braceDepth++;
    if (source[i] === '{') {
      if (braceDepth === 0) { blockStart = i; break; }
      braceDepth--;
    }
  }

  // Walk forward from id match to find closing },
  braceDepth = 0;
  let blockEnd = idMatch.index;
  for (let i = blockStart; i < source.length; i++) {
    if (source[i] === '{') braceDepth++;
    if (source[i] === '}') {
      braceDepth--;
      if (braceDepth === 0) { blockEnd = i + 1; break; }
    }
  }

  return { start: blockStart, end: blockEnd, block: source.slice(blockStart, blockEnd) };
}
```

### B.2 Replace Position in Block

```javascript
function replacePosition(block, newX, newY) {
  return block.replace(
    /position:\s*\{\s*x:\s*\d+,\s*y:\s*\d+\s*\}/,
    `position: { x: ${newX}, y: ${newY} }`
  );
}
```

### B.3 Replace Dialog in Block

```javascript
function replaceDialog(block, newLines) {
  // Match the dialog array including multi-line content
  const dialogRegex = /dialog:\s*\[[\s\S]*?\]/;
  const indent = '      '; // 6 spaces (standard for NPC entries)
  const newDialog = `dialog: [\n${newLines.map(l => `${indent}"${escapeString(l)}",`).join('\n')}\n    ]`;
  return block.replace(dialogRegex, newDialog);
}
```

### B.4 Replace Enum Field

```javascript
function replaceEnumField(block, fieldName, enumName, newValue) {
  const regex = new RegExp(`${fieldName}:\\s*${enumName}\\.\\w+`);
  return block.replace(regex, `${fieldName}: ${enumName}.${newValue}`);
}
```

### B.5 Replace Simple Field

```javascript
function replaceField(block, fieldName, newValue) {
  const stringValue = typeof newValue === 'string' ? `"${escapeString(newValue)}"` : String(newValue);
  const regex = new RegExp(`${fieldName}:\\s*(?:"[^"]*"|\\d+|true|false)`);
  return block.replace(regex, `${fieldName}: ${stringValue}`);
}
```

### B.6 Wild Pokemon Position Patch

Wild Pokemon use the `wild(num, x, y)` factory pattern, not field-by-field:

```javascript
function replaceWildPosition(source, pokedexNum, newX, newY) {
  // Match: wild(NUM, OLD_X, OLD_Y)
  const regex = new RegExp(`wild\\(\\s*${pokedexNum}\\s*,\\s*\\d+\\s*,\\s*\\d+`);
  return source.replace(regex, `wild(${pokedexNum},${' '.repeat(3 - String(pokedexNum).length)}${newX}, ${newY})`);
}
```

## Appendix C: Editor State Shape (Full)

```typescript
interface EditorState {
  // Data
  entities: EditorEntity[];
  itemDefinitions: Record<string, ItemDef>;
  pokedex: PokedexEntry[];
  badges: { id: string; name: string; hint: string }[];
  zones: { id: string; name: string; bounds: { xMin: number; xMax: number; yMin: number; yMax: number } }[];
  researchLog: LogEntry[];
  fieldMoveAwards: FieldMoveAward[];
  sprites: { npcs: string[]; pokemon: string[] };

  // Map metadata
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  spawn: { x: number; y: number };

  // Selection
  selectedEntityIds: string[];  // supports multi-select
  hoveredEntityId: string | null;

  // Layers
  layers: Record<EditorLayer, boolean>;

  // Tools
  activeTool: EditorTool;
  selectedTileGid: number | null;  // for stamp tool

  // Undo/redo
  undoStack: EditorAction[];
  redoStack: EditorAction[];

  // Analysis
  analysisData: AnalyzeResponse | null;
  analysisLoading: boolean;

  // Current map
  currentMap: "overworld" | "pokecenter" | "mart" | "gym";

  // Problems
  problems: ValidationProblem[];

  // Save state
  dirty: boolean;
  lastSavedAt: string | null;
  originalEntities: EditorEntity[];  // snapshot for diff computation

  // Search/filter
  searchQuery: string;
  filters: {
    zone: string | null;
    entityType: string | null;
    movementBehavior: string | null;
    hasAutoGive: boolean | null;
    hasDialogFn: boolean | null;
    hasPokemon: boolean | null;
  };

  // UI
  onboardingComplete: boolean;
  panelSizes: { left: number; right: number; bottom: number };
}
```

## Appendix D: Implementation Order Rationale

The phases are ordered by value delivery:

| Phase | Value | Prerequisite |
|-------|-------|-------------|
| **Phase 0** | Data pipeline — everything else depends on this | None |
| **Phase 1** | See the map, select entities, edit properties, drag, save — the MVP that replaces manual coordinate editing | Phase 0 |
| **Phase 2** | Dialog editing is the most time-consuming manual task; templates add a new runtime capability | Phase 1 |
| **Phase 3** | Debug testing catches bugs early; reduces the edit-build-test cycle | Phase 1 |
| **Phase 4** | Tile editing is less critical (Tiled exists) but completes the "edit everything" promise | Phase 1 |
| **Phase 5** | Checkpoints and history are safety nets; less urgent but reduce "oh no I broke it" anxiety | Phase 1 |
| **Phase 6** | Interior editing extends the editor to the 3 building maps | Phase 1 |
| **Phase 7** | Polish, search, batch ops, visualization — nice to have, makes power users faster | Phases 1-2 |

**Within Phase 1**, the sub-phases are ordered:
1. **1A (Shell)** — the page and state management must exist first
2. **1B (Viewport)** — the Phaser canvas that everything is drawn on
3. **1C (Asset Library)** — browse what exists, prepare for drag-drop
4. **1D (Properties)** — edit what's selected
5. **1E (Problems)** — validation gives confidence
6. **1F (Interaction)** — drag, delete, context menu make the editor usable
7. **1G (Save)** — the payoff: changes written to disk

---

## Appendix E: Risk Registry

| Risk | Mitigation |
|------|-----------|
| Regex patching breaks on unusual formatting | Enforce prettier on data files; save endpoint validates regex matches before writing; show diff for manual review |
| Phaser + React communication race conditions | EditorScene emits `VIEWPORT_READY` event; React waits before sending commands; all events are fire-and-forget with state reconciliation |
| Large entity count causes slow rendering | Entity markers are simple Phaser graphics (not full sprites); marker pool pattern for reuse; viewport culling (only render visible markers) |
| Map analyzer is slow (BFS on 140x120) | Cache analysis results; only re-run when entity positions change; debounce 500ms; show loading indicator |
| Editor accidentally included in prod build | `import.meta.env.DEV` guard on page; API endpoints guard; no production imports; tree-shaking verification in build |
| Lost work due to browser crash | Auto-save to localStorage every 30 seconds; auto-checkpoint on load; "Unsaved changes" warning on page unload |

---

*End of design document. Total: ~85 tasks across 8 phases (0-7). Ready for Ralph Loop execution.*
