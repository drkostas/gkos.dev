# Ralph Loop Prompt — Pokemon World Designer IDE

Copy the text below the line into `/ralph-loop`:

---

Execute every checkbox in docs/plans/2026-04-12-game-designer-ide-design.md in phase order (P0 through P7). Each phase has a gate — you may not start Phase N+1 until Phase N's tasks are all checked. Every checkbox must have evidence (commit hash, working dev server test, screenshot). This is a ralph loop — the same prompt feeds back repeatedly, each iteration must make measurable forward progress.

ARCHITECTURE RULES. This is a Hybrid Phaser+React editor at /editor route (dev-only). Phaser renders the tilemap read-only as a viewport. React handles all panels (asset library, properties, dialog editor, problems). Communication between Phaser and React uses the existing EventBridge pattern (DOM CustomEvents). The editor does NOT touch the game's OverworldScene or InteriorScene — it has its own EditorScene. Entity data is loaded from a JSON intermediate (generated at dev start from TS sources), NOT by importing TS modules directly.

SAVE MECHANISM. Changes write back to TypeScript source files via a dev-only API endpoint using regex-based string replacement (same approach as scripts/map-analyzer.mjs). Fields that are TypeScript functions (dialogFn, spawnCondition, afterDialog) are READ-ONLY in the editor — shown with a "hand-edit in source" badge. Never attempt AST transformation. After save, Vite HMR reloads the viewport automatically.

TESTING DISCIPLINE. After every significant feature: run npx tsc --noEmit (must be clean), run npm run dev and verify the /editor route loads without errors, test the feature manually in the browser. For Phase 1 completion: the editor must load the full 140x120 tilemap, show all 82 entity markers at correct positions, allow click-to-select, drag-to-move with coordinate validation, and save changes that persist after page reload.

PHASE GATES.
- P0 gate: editor.astro loads in dev mode, shows blank page with "Editor" title, dev API endpoint responds to POST
- P1 gate: Phaser viewport renders tilemap + all entities, left panel shows asset library with real sprites, right panel shows properties of selected entity, drag-to-move works, save writes to disk and HMR reloads, undo/redo works, minimap navigable, reachability heatmap toggleable
- P2 gate: dialog slide editor shows paginated slides, template {{}} autocomplete dropdown works with all commands, live dialog preview plays with typewriter effect
- P3 gate: debug launcher can set custom save state and launch game at any position/badge configuration
- P4 gate: tile painting modifies mauville.json, block copy/paste stamps regions, collision toggle works
- P5 gate: checkpoints save/restore world state, visual diff shows before save
- P6 gate: interior maps load and edit (pokecenter, mart, gym)
- P7 gate: movement preview, search/filter, multi-select all functional

COMMIT DISCIPLINE. Each feature gets its own commit. Commit messages reference the plan task (e.g., "feat(P1.2): Phaser viewport with pan/zoom and entity markers"). Push at phase boundaries.

FILE STRUCTURE. Follow the plan's Section 4 exactly. New files go in src/components/editor/, src/game/scenes/EditorScene.ts, src/game/systems/EditorData.ts, src/pages/editor.astro, src/pages/api/editor/save.ts. Do not scatter editor code across existing game files.

SPRITE HANDLING. NPC sprites are 144x32 (9 frames of 16x32). Pokemon icons are 64x32 (2 frames of 32x32). When rendering in the editor, crop to show only the first frame using CSS object-position or canvas clipping. The tileset is 16x16 tiles in mauville_bottom.png.

MAP ANALYZER INTEGRATION. The validation panel should run map-analyzer logic to check: no entities on unreachable tiles, no movement ranges extending into collision, all badge conditions achievable, no orphaned items. Use the existing game-map-data.json for safe placement tiles. Run node scripts/map-analyzer.mjs after placement changes to verify.

IMPORTANT CONSTRAINTS.
- The /editor route must NOT exist in production builds (guard with import.meta.env.DEV)
- The editor must NOT import from src/game/scenes/OverworldScene.ts or InteriorScene.ts
- The editor must NOT modify any existing game component or system
- All editor state lives in React — Phaser is a pure renderer in the editor context
- Template {{}} syntax is a NEW system that needs both editor UI AND runtime resolver (Phase 2)

COMPLETION CRITERIA. All of the following must be true simultaneously:
1. Every checkbox in the plan is checked
2. npx tsc --noEmit clean
3. npm run build clean (editor code tree-shaken from production)
4. npm run dev serves /editor with working Phaser viewport + all panels
5. Drag-to-move an NPC, save, refresh — NPC stays at new position
6. All 82 entities visible at correct positions on the map
7. Asset library shows real Pokemon/NPC sprites with proper frame cropping
8. Dialog slide editor renders paginated dialog preview
9. Template {{}} autocomplete shows commands when typing in dialog
10. Problems panel shows real validation results from map-analyzer
11. Minimap is navigable (click to jump)
12. Undo/redo works for all edit operations
13. No editor code in production bundle (verified by npm run build)

--completion-promise IDE_COMPLETE
