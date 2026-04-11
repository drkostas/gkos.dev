# Building Interiors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Pokemon Center, Pokemart, and Gym interiors with door transitions, music, NPCs, and dialog — matching OG Pokemon Emerald.

**Architecture:** Create a reusable `InteriorScene` (separate Phaser scene) that loads per-map tilesets/tilemaps composed from pokeemerald data. OverworldScene detects warp tiles and fades to InteriorScene. InteriorScene fades back on exit warp. Each interior has its own NPCs, music, and collision. Grid Engine gets a fresh instance per scene.

**Tech Stack:** Phaser 3, Grid Engine, Web Audio API (BGMManager synth tracks), compose-metatiles.mjs pattern for tileset composition, React EventBridge for dialog.

---

## Prerequisites

Existing compose-metatiles.mjs already handles pokeemerald binary tile/metatile/palette data → Tiled JSON + tileset PNGs. We extend this pattern for interior maps.

pokeemerald data paths:
- Building primary tileset: `/tmp/pokeemerald/data/tilesets/primary/building/`
- Pokemon Center secondary: `/tmp/pokeemerald/data/tilesets/secondary/pokemon_center/`
- Shop secondary: `/tmp/pokeemerald/data/tilesets/secondary/shop/`
- Mauville Gym secondary: `/tmp/pokeemerald/data/tilesets/secondary/mauville_gym/`
- Layout map.bin files: `/tmp/pokeemerald/data/layouts/{PokemonCenter_1F,Mart,MauvilleCity_Gym}/map.bin`

Interior dimensions (tiles):
- Pokemon Center 1F: 14×9
- Pokemart: 11×8
- Gym: 10×21

OG warp tiles (Mauville outdoor, add 50 for stitched coords):
- Gym door: outdoor (8+50, 5+50) = (58, 55)
- Pokemon Center door: outdoor (22+50, 5+50) = (72, 55)
- Pokemart door: outdoor (23+50, 14+50) = (73, 64)

Interior spawn positions:
- Pokemon Center 1F: player at (7, 8) facing UP (door exit tiles)
- Pokemart: player at (3, 7) facing UP
- Gym: player at (4, 20) facing UP

Music:
- Pokemon Center: MUS_POKE_CENTER (gentle melody)
- Pokemart: MUS_POKE_MART (upbeat shopping melody)
- Gym: MUS_GYM (intense battle-ready melody)

SFX:
- SE_DOOR (entering/exiting buildings)
- SE_EXIT (stairs, alternative exit)

---

## Task 1: Compose Interior Tileset Assets

**Files:**
- Create: `scripts/compose-interior-maps.mjs`
- Output: `public/game/maps/pokecenter.json`, `public/game/tilesets/pokecenter_bottom.png`, `public/game/tilesets/pokecenter_top.png`
- Output: `public/game/maps/mart.json`, `public/game/tilesets/mart_bottom.png`, `public/game/tilesets/mart_top.png`
- Output: `public/game/maps/gym.json`, `public/game/tilesets/gym_bottom.png`, `public/game/tilesets/gym_top.png`

**What to do:**
Extend the compose-metatiles.mjs pattern to compose interior maps. Each interior uses TWO tilesets (primary=Building + secondary=specific). The script should:

1. Parse the Building primary tileset tiles.png + palettes + metatiles.bin
2. Parse each secondary tileset (pokemon_center, shop, mauville_gym)
3. Combine primary (metatiles 0-511) + secondary (metatiles 512+) into one composed tileset
4. Parse each layout map.bin (2 bytes per entry: bits 0-9 = metatile ID, bits 10-11 = collision)
5. Output Tiled JSON with Ground, Collision layers + composed tileset PNGs (bottom/top split)

Key: reuse the JASC palette parsing, metatile composition, and Tiled JSON export from compose-metatiles.mjs. The main difference is the map dimensions are small (14×9 etc.) and we combine TWO tilesets.

**Step 1:** Copy compose-metatiles.mjs as starting point, rename for interiors
**Step 2:** Adapt for Building+Secondary dual-tileset loading
**Step 3:** Generate all 3 interior maps
**Step 4:** Verify output PNGs look correct (visual check)
**Step 5:** Commit: `feat: compose interior map tilesets from pokeemerald data`

---

## Task 2: Define Warp and Interior Data

**Files:**
- Create: `src/game/data/warps.ts`
- Create: `src/game/data/interiors.ts`

**What to do:**

`warps.ts` — define door tiles on the overworld that trigger transitions:
```typescript
export interface Warp {
  /** Tile position on stitched overworld map */
  overworldTile: { x: number; y: number };
  /** Target interior map key */
  targetMap: string;
  /** Spawn position inside interior */
  spawnTile: { x: number; y: number };
  /** Player facing direction on arrival */
  spawnFacing: "up" | "down" | "left" | "right";
}

export const WARPS: Warp[] = [
  { overworldTile: { x: 72, y: 55 }, targetMap: "pokecenter", spawnTile: { x: 7, y: 8 }, spawnFacing: "up" },
  { overworldTile: { x: 73, y: 64 }, targetMap: "mart", spawnTile: { x: 3, y: 7 }, spawnFacing: "up" },
  { overworldTile: { x: 58, y: 55 }, targetMap: "gym", spawnTile: { x: 4, y: 20 }, spawnFacing: "up" },
];
```

`interiors.ts` — define metadata per interior:
```typescript
export interface InteriorDef {
  key: string;
  mapJson: string;        // path to Tiled JSON
  tilesetBottom: string;  // path to bottom tileset PNG
  tilesetTop: string;     // path to top tileset PNG
  width: number;
  height: number;
  music: string;          // BGM track name
  exitWarpTiles: { x: number; y: number }[]; // tiles that return to overworld
  npcs: InteriorNPC[];
}
```

**Step 1:** Create warps.ts with the 3 building warps (verify tile coords against stitched map)
**Step 2:** Create interiors.ts with metadata + NPC arrays for each interior
**Step 3:** Commit: `feat: define warp and interior map data`

---

## Task 3: Add Door SFX and Interior BGM Tracks

**Files:**
- Modify: `src/game/systems/SoundManager.ts` — add `door()` and `exit()` SFX
- Modify: `src/game/systems/BGMManager.ts` — add pokecenter, mart, gym melody tracks

**What to do:**

SoundManager — add two new synthesized SFX:
- `door()`: brief descending glide (440→220Hz, 120ms triangle wave) mimicking SE_DOOR
- `exit()`: brief ascending glide (220→440Hz, 120ms) mimicking SE_EXIT

BGMManager — add 3 new melody tracks:
- `pokecenter`: gentle, warm 4-bar loop (C major, slower tempo ~100 BPM)
- `mart`: cheerful, upbeat 4-bar loop (G major, ~130 BPM)
- `gym`: intense, minor-key 4-bar loop (E minor, ~160 BPM, square wave for edginess)

Each track follows the existing pattern: melody (square wave) + bass (triangle wave), scheduled with the lookahead buffer system.

**Step 1:** Add `door()` and `exit()` to SoundManager
**Step 2:** Add pokecenter track to BGMManager
**Step 3:** Add mart track to BGMManager
**Step 4:** Add gym track to BGMManager
**Step 5:** Commit: `feat: add door SFX and interior BGM tracks`

---

## Task 4: Build InteriorScene

**Files:**
- Create: `src/game/scenes/InteriorScene.ts`
- Modify: `src/game/config.ts` — register InteriorScene

**What to do:**

New Phaser scene that:
1. Receives `{ interiorKey: string }` via `scene.start("InteriorScene", data)`
2. In `init()`: looks up `InteriorDef` from interiors.ts
3. In `preload()`: loads the interior tilemap JSON + tileset PNGs (if not already cached)
4. In `create()`:
   - Creates tilemap from the loaded JSON
   - Adds tileset images, creates Ground + Collision layers
   - Initializes Grid Engine with the small interior map
   - Creates player sprite at the spawn position
   - Creates interior NPCs (subset of NPCSystem logic — simpler, stationary)
   - Sets camera bounds to interior dimensions
   - Plays interior BGM via BGMManager
   - Starts fade-in (camera.fadeIn)
5. In `update()`:
   - Handles player movement (same walk/run logic as OverworldScene)
   - Checks if player steps on an exit warp tile → triggers exit transition
   - Handles interaction key (talk to NPCs)

Exit transition:
- Player steps on exit tile → play SE_EXIT SFX → camera.fadeOut → save overworld restore position → scene.start("OverworldScene", { restorePosition: true })

**Step 1:** Create InteriorScene skeleton (init, preload, create, update)
**Step 2:** Implement tilemap loading + Grid Engine setup
**Step 3:** Implement player movement (extract shared logic from OverworldScene)
**Step 4:** Implement NPC rendering + interaction
**Step 5:** Implement exit warp detection + transition
**Step 6:** Register in config.ts scene list
**Step 7:** Commit: `feat: InteriorScene with map loading, NPCs, and exit warps`

---

## Task 5: Add Door Detection to OverworldScene

**Files:**
- Modify: `src/game/scenes/OverworldScene.ts`

**What to do:**

In the `update()` method, after movement handling:
1. On `positionChangeFinished`, check if new tile matches any warp in `WARPS`
2. If match found:
   - Play `sfx.door()` SFX
   - Pause player input
   - Camera fadeOut (300ms, black)
   - On fade complete: `this.scene.start("InteriorScene", { interiorKey: warp.targetMap })`
   - Save current overworld position + facing to localStorage for restore on return

Also handle the RETURN from InteriorScene:
- OverworldScene receives `restorePosition: true` in init data
- Restores player to the warp tile position (facing away from door)
- Plays SE_EXIT, fades in
- Resumes overworld BGM

**Step 1:** Import WARPS data, add warp detection in positionChangeFinished handler
**Step 2:** Implement fadeOut → scene transition
**Step 3:** Handle restorePosition on scene re-entry
**Step 4:** Commit: `feat: door detection and scene transitions on overworld`

---

## Task 6: Interior NPCs with Dialog

**Files:**
- Modify: `src/game/data/interiors.ts` — flesh out NPC data with dialog
- The InteriorScene NPC rendering from Task 4 handles display

**What to do:**

Add portfolio-themed NPCs per interior:

**Pokemon Center (5 NPCs):**
- Nurse Joy (center counter): "Welcome! Let me heal your projects... All your repos are looking healthy!"
- Old Man: talks about Kostas's PhD journey
- Woman: mentions NeurIPS publication
- Youngster: excited about GitHub followers
- Woman 2: mentions HuggingFace datasets

**Pokemart (3 NPCs):**
- Clerk: "Welcome! We have PyPI packages for sale!" → lists Kostas's PyPI packages
- Expert Man: talks about YAML configs and tooling
- Man: mentions cloud deployment

**Gym (Wattson + 4 trainers + guide):**
- Gym Guide: explains the ML Engineering "gym challenge"
- Wattson (gym leader): talks about Kostas's core ML expertise, links to papers
- Trainers: each mentions a different skill area (DevOps, Full-Stack, Data Science, Cloud)

**Step 1:** Write dialog arrays for Pokemon Center NPCs
**Step 2:** Write dialog arrays for Mart NPCs
**Step 3:** Write dialog arrays for Gym NPCs
**Step 4:** Add NPC sprite keys (reuse existing: nurse=woman_4, clerk=school_kid_m, etc.)
**Step 5:** Commit: `feat: interior NPC dialog for all 3 buildings`

---

## Task 7: Visual Polish and Testing

**Files:**
- Various tweaks across InteriorScene, OverworldScene, data files

**What to do:**
1. Test all 3 door transitions (enter + exit each building)
2. Verify music changes correctly (overworld → interior → overworld)
3. Verify NPCs are interactable and dialogs display correctly
4. Check collision — player shouldn't walk through walls or counters
5. Verify camera bounds are correct in small interiors
6. Check that returning to overworld restores correct position + facing
7. Screenshot each interior for visual verification

**Step 1:** Playtest Pokemon Center flow
**Step 2:** Playtest Pokemart flow
**Step 3:** Playtest Gym flow
**Step 4:** Fix any visual/collision issues found
**Step 5:** Final commit: `feat: building interiors with transitions, NPCs, and music`

---

## Estimated Scope

| Task | New Lines | Files |
|------|-----------|-------|
| 1. Compose tileset assets | ~400 (script) | 1 script + 9 output files |
| 2. Warp & interior data | ~200 | 2 new data files |
| 3. Door SFX + BGM tracks | ~150 | 2 modified systems |
| 4. InteriorScene | ~500 | 1 new scene + config |
| 5. Door detection | ~80 | 1 modified scene |
| 6. NPC dialog data | ~200 | 1 modified data file |
| 7. Polish & testing | ~50 | Various |
| **Total** | **~1,580** | **~8 files** |
