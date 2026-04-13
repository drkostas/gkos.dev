# Session Context for IDE Ralph Loop Continuation

## What We're Building
A Pokemon World Designer IDE — a local-only dev tool at `/editor` route that lets the user visually edit every aspect of the game world. Hybrid architecture: Phaser renders the tilemap as a read-only viewport, React handles all editing panels.

## Design Doc Location
`docs/plans/2026-04-12-game-designer-ide-design.md` — 2,644 lines, 90 checkboxed tasks, 8 phases (P0-P7).

## Ralph Loop Prompt Location  
`docs/plans/2026-04-12-ide-ralph-loop-prompt.md` — copy text after line 5 into /ralph-loop.

## Current Progress: P0 + P1A-P1G + P2 (partial) COMPLETE — 12 commits

### COMPLETED:
- P0-01: `scripts/editor-data-export.mjs` — WORKING, extracts 119 entities
- P0-02: `GET /api/editor/data` endpoint — returns editor-data.json
- P0-03: `POST /api/editor/analyze` endpoint — wraps map-analyzer
- P0-04: `POST /api/editor/save` endpoint — real regex patching of TS source files
- P0-05: `dev:editor` npm script added
- P0-06: `editor-data.json` in .gitignore
- P1A-01: `src/pages/editor.astro` — loads at http://localhost:4321/editor
- P1A-02: `EditorApp.tsx` — full IDE layout with all panels
- P1A-03: `EditorContext.tsx` — useReducer state management
- P1A-04: `editorReducer.ts` — all actions with undo/redo
- P1A-05: `editorTypes.ts` — EditorEntity, EditorState, EditorAction types
- P1B-01: `EditorScene.ts` — Phaser scene with mauville.json tilemap, entity markers, camera pan/zoom
- P1B-02: `EditorViewport.tsx` — React component mounting Phaser game
- P1B-03: Entity markers with type-specific shapes/colors and NPC sprite thumbnails
- P1B-04: Click/hover/drag detection in EditorScene
- P1B-05: Layer overlays (collision red tint, grid lines, foreground)
- P1B-06: Camera controls (scroll zoom, middle-mouse pan, space+drag pan, arrow keys)
- P1B-07: Coordinate display tracking mouse position
- P1D: Editable properties panel with collapsible sections, type badge, inline inputs
- P1E: Problems panel with client-side validation + map-analyzer integration
- P1G: Save endpoint with regex-based TS file patching (position, facing, dialog)

### VERIFIED (Playwright):
- Tilemap renders correctly with all terrain, buildings, paths
- 119 entity markers visible at correct positions
- NPC sprites rendering as thumbnails on markers
- Scroll wheel zoom works
- Entity selection from sidebar → camera centers + right panel populates
- View dropdown menu (Grid, Collision, Foreground, Entity Markers, Zones toggles)
- Collision overlay shows red-tinted blocked tiles
- Toolbar buttons have hover tooltips with descriptions
- All 119 entities in scrollable sidebar with search + type filtering
- Properties panel: editable X/Y, facing dropdown, movement dropdown, dialog textareas
- Sign text editing
- Problems panel with validation (catches gates without positions)
- Production build succeeds (10.28s, no editor code in prod bundle)
- Zero console errors throughout

### NEXT: Phase 1C (Asset Library) and P1F (Drag/Drop/Context Menu)
- P1C: Asset library tabs (Pokemon, NPCs, Tiles) with real sprite previews
- P1F-01: Drag-to-move in viewport (hold 200ms on selected entity)
- P1F-02: Drag-from-library to viewport
- P1F-03: Delete mechanisms (trash zone, right-click, keyboard)
- P1F-04: Context menu (right-click on entity)

### User Feedback to Address:
- User wants tile editing (P4): specific tiles changed/copied/deleted/replaced, hue/color/brightness changes
- Need to add enhanced P4 tile editing capabilities to the plan

### Remaining Phases:
- P1C: Asset library with real sprites (Pokemon/NPC/Tile tabs)
- P1F: Drag-to-move, drag-from-library, trash, context menu
- P2: Dialog template system ({{}} autocomplete + resolver)
- P3: Debug launcher (play-from-here)
- P4: Tile/collision editing (ENHANCED: copy/delete/replace/hue/brightness)
- P5: Checkpoints
- P6: Interior editing
- P7: Advanced features (movement preview, search, multi-select)

## Key Architecture Decisions
1. EditorScene is a NEW Phaser scene — does NOT extend or import OverworldScene
2. Entity data loaded from JSON intermediate (not TS imports) to avoid circular deps
3. Save uses regex-based string replacement on TS source files (same as map-analyzer)
4. Fields that are TypeScript functions (dialogFn, spawnCondition) are READ-ONLY in editor
5. `/editor` route guarded by `import.meta.env.DEV` — not in production build
6. Communication: Phaser ↔ React via EventBridge (DOM CustomEvents)
7. Phaser uses Canvas renderer (not WebGL) to avoid z-index compositing issues with React menus

## Key File Paths
- Design doc: `docs/plans/2026-04-12-game-designer-ide-design.md`
- Data export script: `scripts/editor-data-export.mjs`
- Editor events: `src/game/editor/EditorEvents.ts`
- Editor scene: `src/game/scenes/EditorScene.ts`
- Editor viewport: `src/components/editor/EditorViewport.tsx`
- Editor app: `src/components/editor/EditorApp.tsx`
- Editor state: `src/components/editor/state/EditorContext.tsx`, `editorReducer.ts`, `editorTypes.ts`
- Save API: `src/pages/api/editor/save.ts`

## Completion Criteria (from ralph loop prompt)
All 13 must be true:
1. Every checkbox in plan checked
2. tsc clean ✅
3. build clean (editor tree-shaken from prod) ✅
4. /editor loads with Phaser viewport + all panels ✅
5. Drag-to-move + save + persist after reload
6. All 82 entities at correct positions ✅ (119 actually)
7. Asset library with real sprites
8. Dialog slide editor with pagination
9. Template {{}} autocomplete
10. Problems panel with map-analyzer validation ✅
11. Minimap navigable
12. Undo/redo works ✅
13. No editor code in production bundle ✅
