# Pokemon Explore Mode — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a playable Pokemon Emerald-style overworld of Mauville City as a portfolio "Explore Mode," loaded on demand via a React island in the Astro site.

**Architecture:** Phaser 3 game engine wrapped in a React component (`client:only="react"`), using Grid Engine for grid-locked movement, Tiled JSON for maps, and pret/pokeemerald assets. The game canvas is the full viewport. A DOM event bridge connects Phaser scenes to React overlays (dialogs, menus, encounter screens). Portfolio data (projects, papers, experience) drives game entities (Pokemon, trainers, NPCs).

**Tech Stack:** Phaser 3 (v3.90), Grid Engine, Tiled Map Editor, React 19, Astro 6, TypeScript

**Design Document:** `docs/plans/2026-04-09-pokemon-explore-mode-design.md`

---

## Phase 1A: Proof of Concept

Goal: Phaser renders in an Astro page with a tilemap and player movement.

### Task 1: Install Dependencies and Create Directory Structure

**Files:**
- Modify: `package.json`
- Create: `src/game/` directory structure
- Create: `public/game/` directory structure

**Step 1: Install Phaser 3 and Grid Engine**

```bash
cd /Users/gkos/Insync/Gdrive/Projects/portfolio-v2/.worktrees/pokemon-explore
npm install --legacy-peer-deps phaser grid-engine
```

Expected: Both packages added to `dependencies` in `package.json`.

**Step 2: Create the game directory structure**

```bash
mkdir -p src/game/scenes
mkdir -p src/game/systems
mkdir -p src/game/data
mkdir -p src/game/types
mkdir -p src/components/game
mkdir -p public/game/tilesets
mkdir -p public/game/sprites
mkdir -p public/game/maps
```

- `src/game/scenes/` — Phaser Scene classes (OverworldScene, etc.)
- `src/game/systems/` — Game systems (dialog, encounters, menus)
- `src/game/data/` — Game-specific data transforms (project→Pokemon mapping)
- `src/game/types/` — TypeScript type definitions
- `src/components/game/` — React components (wrapper, overlays)
- `public/game/` — Static assets (tilesets, sprites, map JSON)

**Step 3: Commit**

```bash
git add package.json package-lock.json src/game src/components/game public/game
git commit -m "feat(game): install Phaser 3 + Grid Engine, create directory structure"
```

---

### Task 2: Phaser React Wrapper Component

**Files:**
- Create: `src/game/config.ts`
- Create: `src/game/scenes/BootScene.ts`
- Create: `src/game/scenes/OverworldScene.ts`
- Create: `src/components/game/PhaserGame.tsx`

**Step 1: Create the Phaser game config**

```typescript
// src/game/config.ts
import Phaser from "phaser";
import { GridEngine } from "grid-engine";
import { BootScene } from "./scenes/BootScene";
import { OverworldScene } from "./scenes/OverworldScene";

export const GAME_WIDTH = 240;  // GBA resolution
export const GAME_HEIGHT = 160; // GBA resolution
export const SCALE_FACTOR = 3;  // Scale up for modern screens

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    plugins: {
      scene: [
        {
          key: "gridEngine",
          plugin: GridEngine,
          mapping: "gridEngine",
        },
      ],
    },
    scene: [BootScene, OverworldScene],
  };
}
```

Key decisions:
- `240x160` is the actual GBA screen resolution. Phaser's `Scale.FIT` scales it up to fill the container while preserving aspect ratio.
- `pixelArt: true` enables nearest-neighbor scaling (no blurring).
- Grid Engine registered as a scene plugin — accessible as `this.gridEngine` in any scene.

**Step 2: Create the Boot scene (asset loading)**

```typescript
// src/game/scenes/BootScene.ts
import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Placeholder: load a simple tileset and map for proof of concept
    // Will be replaced with real Emerald assets in Task 6
    this.load.image("placeholder-tiles", "/game/tilesets/placeholder.png");
    this.load.tilemapTiledJSON("mauville", "/game/maps/placeholder.json");
    this.load.spritesheet("player", "/game/sprites/player.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    this.scene.start("OverworldScene");
  }
}
```

**Step 3: Create a minimal Overworld scene**

```typescript
// src/game/scenes/OverworldScene.ts
import Phaser from "phaser";
import { GridEngine, Direction } from "grid-engine";

export class OverworldScene extends Phaser.Scene {
  private gridEngine!: GridEngine;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: "OverworldScene" });
  }

  create(): void {
    const map = this.make.tilemap({ key: "mauville" });
    const tileset = map.addTilesetImage("placeholder", "placeholder-tiles");

    if (!tileset) {
      console.error("Failed to load tileset");
      return;
    }

    // Create all layers from the Tiled map
    for (let i = 0; i < map.layers.length; i++) {
      const layer = map.createLayer(i, tileset, 0, 0);
      if (layer) {
        layer.setDepth(i);
      }
    }

    // Create player sprite
    const playerSprite = this.add.sprite(0, 0, "player");
    playerSprite.setDepth(10);

    // Initialize Grid Engine
    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: playerSprite,
          startPosition: { x: 20, y: 10 },
          speed: 4,
        },
      ],
    });

    // Camera follows player
    this.cameras.main.startFollow(playerSprite, true);
    this.cameras.main.setFollowOffset(0, 0);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setRoundPixels(true);

    // Set up keyboard input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }
  }

  update(): void {
    if (!this.cursors) return;

    if (this.cursors.left.isDown) {
      this.gridEngine.move("player", Direction.LEFT);
    } else if (this.cursors.right.isDown) {
      this.gridEngine.move("player", Direction.RIGHT);
    } else if (this.cursors.up.isDown) {
      this.gridEngine.move("player", Direction.UP);
    } else if (this.cursors.down.isDown) {
      this.gridEngine.move("player", Direction.DOWN);
    }
  }
}
```

**Step 4: Create the React wrapper component**

```tsx
// src/components/game/PhaserGame.tsx
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createGameConfig } from "../../game/config";

export default function PhaserGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameContainerRef.current || gameRef.current) return;

    const config = createGameConfig(gameContainerRef.current);
    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={gameContainerRef}
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    />
  );
}
```

**Step 5: Commit**

```bash
git add src/game/ src/components/game/
git commit -m "feat(game): Phaser config, Boot/Overworld scenes, React wrapper"
```

---

### Task 3: Explore Mode Page

**Files:**
- Create: `src/pages/explore.astro`

**Step 1: Create the Astro page**

```astro
---
// src/pages/explore.astro
// No layout — the game IS the page
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GKOS.DEV — Explore Mode</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    </style>
  </head>
  <body>
    <div id="game-root">
      <!-- PhaserGame loads here client-side only -->
      <noscript>
        <p style="color: white; text-align: center; padding: 2rem;">
          JavaScript is required for Explore Mode.
          <a href="/" style="color: #6C47FF;">Return to normal site</a>
        </p>
      </noscript>
    </div>

    <!-- Load PhaserGame as a React island — client:only skips SSR entirely -->
    <script>
      import("../components/game/PhaserGame.tsx").then(({ default: PhaserGame }) => {
        import("react").then((React) => {
          import("react-dom/client").then((ReactDOM) => {
            const root = ReactDOM.createRoot(document.getElementById("game-root")!);
            root.render(React.createElement(PhaserGame));
          });
        });
      });
    </script>
  </body>
</html>
```

Note: We use a manual dynamic import rather than Astro's `client:only` directive because the explore page has NO server-rendered content — it's a pure client-side game. This avoids Astro trying to SSR Phaser (which requires `window`/`document`).

**Step 2: Verify dev server runs**

```bash
npm run dev
```

Navigate to `http://localhost:4321/explore`. Should see a black screen (no assets loaded yet, that's expected). Check browser console for no errors about Phaser initialization.

**Step 3: Commit**

```bash
git add src/pages/explore.astro
git commit -m "feat(game): add explore mode page with dynamic Phaser loading"
```

---

### Task 4: Placeholder Tilemap (Prove It Works)

**Files:**
- Create: `public/game/tilesets/placeholder.png` (generated)
- Create: `public/game/maps/placeholder.json` (Tiled format)
- Create: `public/game/sprites/player.png` (temporary)

**Step 1: Create a minimal placeholder tileset**

We need a tiny PNG tileset and a Tiled JSON map to prove the pipeline works before we extract real Emerald assets.

Write a Node.js script that generates a minimal 2-tile tileset (grass + wall) and a small test map:

```typescript
// scripts/generate-placeholder-map.ts
// Run with: npx tsx scripts/generate-placeholder-map.ts

import fs from "fs";
import path from "path";

// Generate a minimal Tiled JSON map (20x15 tiles, 16x16 each)
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const TILE_SIZE = 16;

// Tile IDs: 0 = empty, 1 = grass, 2 = wall
// Create a border of walls with grass inside
const groundLayer: number[] = [];
const collisionLayer: number[] = [];

for (let y = 0; y < MAP_HEIGHT; y++) {
  for (let x = 0; x < MAP_WIDTH; x++) {
    const isBorder = x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1;
    groundLayer.push(isBorder ? 2 : 1); // wall border, grass inside
    collisionLayer.push(isBorder ? 2 : 0); // collision on walls only
  }
}

const tiledMap = {
  compressionlevel: -1,
  height: MAP_HEIGHT,
  infinite: false,
  layers: [
    {
      data: groundLayer,
      height: MAP_HEIGHT,
      id: 1,
      name: "Ground",
      opacity: 1,
      type: "tilelayer",
      visible: true,
      width: MAP_WIDTH,
      x: 0,
      y: 0,
    },
    {
      data: collisionLayer,
      height: MAP_HEIGHT,
      id: 2,
      name: "Collision",
      opacity: 1,
      type: "tilelayer",
      visible: true,
      width: MAP_WIDTH,
      x: 0,
      y: 0,
      properties: [
        {
          name: "ge_collide",
          type: "bool",
          value: true,
        },
      ],
    },
  ],
  nextlayerid: 3,
  nextobjectid: 1,
  orientation: "orthogonal",
  renderorder: "right-down",
  tiledversion: "1.11.0",
  tileheight: TILE_SIZE,
  tilesets: [
    {
      columns: 2,
      firstgid: 1,
      image: "../tilesets/placeholder.png",
      imageheight: TILE_SIZE,
      imagewidth: TILE_SIZE * 2,
      margin: 0,
      name: "placeholder",
      spacing: 0,
      tilecount: 2,
      tileheight: TILE_SIZE,
      tilewidth: TILE_SIZE,
    },
  ],
  tilewidth: TILE_SIZE,
  type: "map",
  version: "1.10",
  width: MAP_WIDTH,
};

const outDir = path.join(process.cwd(), "public/game/maps");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "placeholder.json"),
  JSON.stringify(tiledMap, null, 2)
);
console.log("Created placeholder.json");
```

Run: `npx tsx scripts/generate-placeholder-map.ts`

**Step 2: Create a placeholder tileset PNG**

Use a script to create a minimal 32x16 PNG (2 tiles: green grass, dark wall). If `sharp` is already a dependency:

```typescript
// scripts/generate-placeholder-tiles.ts
import sharp from "sharp";
import path from "path";

const TILE = 16;

// Create a 2-tile tileset: [grass (green), wall (dark gray)]
const pixels = Buffer.alloc(TILE * 2 * TILE * 4); // 32x16 RGBA

for (let y = 0; y < TILE; y++) {
  for (let x = 0; x < TILE * 2; x++) {
    const idx = (y * TILE * 2 + x) * 4;
    if (x < TILE) {
      // Tile 1: grass green
      pixels[idx] = 34;     // R
      pixels[idx + 1] = 139; // G
      pixels[idx + 2] = 34;  // B
      pixels[idx + 3] = 255; // A
    } else {
      // Tile 2: wall dark gray
      pixels[idx] = 60;
      pixels[idx + 1] = 60;
      pixels[idx + 2] = 60;
      pixels[idx + 3] = 255;
    }
  }
}

const outPath = path.join(process.cwd(), "public/game/tilesets/placeholder.png");
sharp(pixels, { raw: { width: TILE * 2, height: TILE, channels: 4 } })
  .png()
  .toFile(outPath)
  .then(() => console.log("Created placeholder.png"));
```

Run: `npx tsx scripts/generate-placeholder-tiles.ts`

**Step 3: Create a placeholder player sprite**

A 64x16 spritesheet (4 frames of 16x16 — down, left, right, up) in a single color:

```typescript
// scripts/generate-placeholder-player.ts
import sharp from "sharp";
import path from "path";

const TILE = 16;
const FRAMES = 4;
const pixels = Buffer.alloc(TILE * FRAMES * TILE * 4);

// Simple colored rectangle for each frame, slightly different shades
const colors = [
  [255, 0, 0],   // down - red
  [0, 0, 255],   // left - blue
  [0, 255, 0],   // right - green
  [255, 255, 0], // up - yellow
];

for (let frame = 0; frame < FRAMES; frame++) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const idx = (y * TILE * FRAMES + (frame * TILE + x)) * 4;
      // Draw a smaller rectangle (4px margin) to look like a character
      if (x >= 4 && x < 12 && y >= 2 && y < 14) {
        pixels[idx] = colors[frame][0];
        pixels[idx + 1] = colors[frame][1];
        pixels[idx + 2] = colors[frame][2];
        pixels[idx + 3] = 255;
      } else {
        pixels[idx + 3] = 0; // transparent
      }
    }
  }
}

const outPath = path.join(process.cwd(), "public/game/sprites/player.png");
sharp(pixels, { raw: { width: TILE * FRAMES, height: TILE, channels: 4 } })
  .png()
  .toFile(outPath)
  .then(() => console.log("Created player.png"));
```

Run: `npx tsx scripts/generate-placeholder-player.ts`

**Step 4: Update OverworldScene to use Grid Engine collision**

The placeholder map has a `Collision` layer with the `ge_collide` property. Grid Engine reads this automatically. No code change needed in OverworldScene — Grid Engine detects the property on the layer.

**Step 5: Test in browser**

```bash
npm run dev
```

Navigate to `http://localhost:4321/explore`. Expected:
- Green grid with dark border
- Colored square (player) in the center
- Arrow keys move the player on the grid
- Player cannot walk through the dark border walls
- Camera follows the player

**Step 6: Commit**

```bash
git add scripts/ public/game/ src/game/
git commit -m "feat(game): placeholder tilemap, player sprite, working grid movement"
```

---

## Phase 1B: Real Emerald Assets

Goal: Replace placeholders with actual Pokemon Emerald assets from pret/pokeemerald.

### Task 5: Clone pret/pokeemerald and Extract Assets

**Files:**
- Create: `scripts/extract-emerald-assets.sh`
- Create: `public/game/tilesets/` (Emerald tileset PNGs)
- Create: `public/game/sprites/` (character spritesheets)

**Step 1: Clone pokeemerald (shallow, outside the project)**

```bash
git clone --depth 1 https://github.com/pret/pokeemerald.git /tmp/pokeemerald
```

**Step 2: Write the asset extraction script**

```bash
#!/usr/bin/env bash
# scripts/extract-emerald-assets.sh
# Copies needed assets from a pokeemerald clone into public/game/

PRET_DIR="${1:-/tmp/pokeemerald}"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/game"

echo "Extracting from: $PRET_DIR"
echo "Output to: $OUT_DIR"

# --- Overworld sprites ---
SPRITES_OUT="$OUT_DIR/sprites"
mkdir -p "$SPRITES_OUT"

# Player character (Brendan)
cp "$PRET_DIR/graphics/object_events/pics/people/brendan/brendan_normal.png" "$SPRITES_OUT/brendan.png"
# May (alternate player)
cp "$PRET_DIR/graphics/object_events/pics/people/may/may_normal.png" "$SPRITES_OUT/may.png"

# NPC sprites (select useful ones)
for npc in boy_1 girl_1 fat_man woman_1 old_man old_woman little_boy little_girl \
           scientist man_1 woman_2 psychic_m pokefan_m pokefan_f \
           nurse black_belt beauty gentleman; do
  src="$PRET_DIR/graphics/object_events/pics/people/${npc}/${npc}.png"
  if [ -f "$src" ]; then
    cp "$src" "$SPRITES_OUT/${npc}.png"
    echo "  Copied: ${npc}.png"
  fi
done

# --- Tilesets ---
TILES_OUT="$OUT_DIR/tilesets"
mkdir -p "$TILES_OUT"

# Primary tileset (general — used by all outdoor maps)
cp "$PRET_DIR/data/tilesets/primary/general/tiles.png" "$TILES_OUT/general_tiles.png"
cp "$PRET_DIR/data/tilesets/primary/general/palettes/"*.pal "$TILES_OUT/" 2>/dev/null
cp "$PRET_DIR/data/tilesets/primary/general/metatiles.bin" "$TILES_OUT/general_metatiles.bin"
cp "$PRET_DIR/data/tilesets/primary/general/metatile_attributes.bin" "$TILES_OUT/general_metatile_attrs.bin"

# Secondary tileset (Mauville-specific)
cp "$PRET_DIR/data/tilesets/secondary/mauville/tiles.png" "$TILES_OUT/mauville_tiles.png"
cp "$PRET_DIR/data/tilesets/secondary/mauville/palettes/"*.pal "$TILES_OUT/" 2>/dev/null
cp "$PRET_DIR/data/tilesets/secondary/mauville/metatiles.bin" "$TILES_OUT/mauville_metatiles.bin"
cp "$PRET_DIR/data/tilesets/secondary/mauville/metatile_attributes.bin" "$TILES_OUT/mauville_metatile_attrs.bin"

# Route tilesets
for route_tileset in route117 route110 route118; do
  src_dir="$PRET_DIR/data/tilesets/secondary/${route_tileset}"
  if [ -d "$src_dir" ]; then
    cp "$src_dir/tiles.png" "$TILES_OUT/${route_tileset}_tiles.png"
    cp "$src_dir/metatiles.bin" "$TILES_OUT/${route_tileset}_metatiles.bin"
    cp "$src_dir/metatile_attributes.bin" "$TILES_OUT/${route_tileset}_metatile_attrs.bin"
    echo "  Copied: ${route_tileset} tileset"
  fi
done

# --- Map data ---
MAPS_OUT="$OUT_DIR/maps"
mkdir -p "$MAPS_OUT"

# Map layout binaries
for mapname in MauvilleCity Route117 Route110 Route118; do
  layout_dir="$PRET_DIR/data/layouts/${mapname}"
  map_dir="$PRET_DIR/data/maps/${mapname}"
  if [ -d "$layout_dir" ]; then
    cp "$layout_dir/"*.bin "$MAPS_OUT/" 2>/dev/null
    echo "  Copied: ${mapname} layout bins"
  fi
  if [ -f "$map_dir/map.json" ]; then
    cp "$map_dir/map.json" "$MAPS_OUT/${mapname}_events.json"
    echo "  Copied: ${mapname} events JSON"
  fi
done

# Copy layouts.json for dimensions reference
cp "$PRET_DIR/data/layouts/layouts.json" "$MAPS_OUT/layouts.json"

echo ""
echo "Done! Assets extracted to $OUT_DIR"
echo "NOTE: The tiles.png files are raw 8x8 indexed tiles."
echo "You will need Porymap or a custom script to compose them into 16x16 metatile sheets."
```

Run:
```bash
chmod +x scripts/extract-emerald-assets.sh
./scripts/extract-emerald-assets.sh /tmp/pokeemerald
```

**Step 3: Commit extracted assets**

```bash
git add scripts/extract-emerald-assets.sh public/game/
git commit -m "feat(game): extract Pokemon Emerald assets from pret/pokeemerald"
```

**Important note for next task:** The raw `tiles.png` files from pret are 8x8 indexed-color tiles, NOT ready-to-use 16x16 metatile sheets. Task 6 handles composing them into usable tilesets, either via Porymap export or a custom script.

---

### Task 6: Compose Metatile Tilesets and Build Mauville Map in Tiled

**This task requires manual work with Porymap and Tiled Map Editor.**

**Step 1: Install Porymap**

Download from https://github.com/huderlem/porymap/releases — available for macOS, Windows, Linux.

```bash
# macOS via Homebrew (if available)
brew install --cask porymap
# OR download the .dmg from the GitHub releases page
```

**Step 2: Export Mauville City map image from Porymap**

1. Open Porymap
2. File -> Open Project -> select `/tmp/pokeemerald/`
3. Navigate to `MauvilleCity` in the map list
4. File -> Export Map Stitch Image -> save as `public/game/maps/mauville_reference.png`
5. Also export Route117, Route110, Route118 reference images

**Step 3: Export composed metatile tileset images from Porymap**

1. In Porymap with pokeemerald open
2. Tools -> Export Metatiles Image (for `gTileset_General`)
3. Save as `public/game/tilesets/general_metatiles.png`
4. Repeat for `gTileset_Mauville` -> `public/game/tilesets/mauville_metatiles.png`

These are the composed 16x16 metatile sheets that Tiled and Phaser can use directly.

**Step 4: Build the Mauville City map in Tiled**

1. Open Tiled Map Editor
2. New Map: 40 wide x 20 tall, 16x16 tile size, orthogonal
3. Import the metatile tilesets (general + mauville)
4. Use the Porymap reference image as a background guide layer
5. Paint the map to match the original Mauville layout
6. Create layers:
   - `Ground` — base terrain (grass, paths, dirt)
   - `Buildings` — building exteriors, roofs
   - `Above` — treetops, roof overhangs (rendered above player)
   - `Collision` — invisible layer with `ge_collide: true` property on blocked tiles
   - `Objects` — object layer for NPC spawn points, warp zones, sign locations
7. Mark collision tiles: buildings, trees, fences, water, walls
8. Add object points for:
   - `player_spawn` (x, y) — where the player starts
   - `npc_*` — NPC positions with custom properties (type, dialog_id)
   - `warp_*` — building door positions with destination
   - `sign_*` — sign positions with text content
   - `grass_*` — tall grass zones (for encounter triggers)
9. Export as JSON: `public/game/maps/mauville.json`

**Step 5: Build route maps similarly**

Repeat the Tiled process for:
- `public/game/maps/route117.json` (partial, up to Snorlax blocker)
- `public/game/maps/route110.json` (partial, up to cycling road gate)
- `public/game/maps/route118.json` (partial, up to water)

**Step 6: Commit**

```bash
git add public/game/tilesets/ public/game/maps/
git commit -m "feat(game): Mauville City + route tilemaps built in Tiled"
```

---

### Task 7: Load Real Mauville Map in Phaser

**Files:**
- Modify: `src/game/scenes/BootScene.ts`
- Modify: `src/game/scenes/OverworldScene.ts`

**Step 1: Update BootScene to load real assets**

```typescript
// src/game/scenes/BootScene.ts
import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Tilesets
    this.load.image("general-tiles", "/game/tilesets/general_metatiles.png");
    this.load.image("mauville-tiles", "/game/tilesets/mauville_metatiles.png");

    // Map
    this.load.tilemapTiledJSON("mauville", "/game/maps/mauville.json");

    // Player sprite (Brendan from Emerald)
    // The brendan.png spritesheet has 9 frames: 3 columns x 3 rows
    // Each frame is 16x32 (16 wide, 32 tall — standard GBA overworld sprite)
    this.load.spritesheet("player", "/game/sprites/brendan.png", {
      frameWidth: 16,
      frameHeight: 32,
    });

    // NPC sprites (loaded as spritesheets for walking animation)
    const npcSprites = [
      "scientist", "boy_1", "girl_1", "fat_man", "woman_1",
      "old_man", "pokefan_m", "nurse", "man_1", "beauty",
    ];
    for (const npc of npcSprites) {
      this.load.spritesheet(npc, `/game/sprites/${npc}.png`, {
        frameWidth: 16,
        frameHeight: 32,
      });
    }
  }

  create(): void {
    this.scene.start("OverworldScene");
  }
}
```

**Step 2: Update OverworldScene for real map with multiple tilesets**

```typescript
// src/game/scenes/OverworldScene.ts
import Phaser from "phaser";
import { GridEngine, Direction } from "grid-engine";

export class OverworldScene extends Phaser.Scene {
  private gridEngine!: GridEngine;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: "OverworldScene" });
  }

  create(): void {
    const map = this.make.tilemap({ key: "mauville" });

    // Add both tilesets (names must match what's in the Tiled JSON)
    const generalTileset = map.addTilesetImage("general", "general-tiles");
    const mauvilleTileset = map.addTilesetImage("mauville", "mauville-tiles");
    const tilesets = [generalTileset!, mauvilleTileset!];

    // Create visible layers
    const groundLayer = map.createLayer("Ground", tilesets, 0, 0);
    const buildingsLayer = map.createLayer("Buildings", tilesets, 0, 0);
    const aboveLayer = map.createLayer("Above", tilesets, 0, 0);

    if (groundLayer) groundLayer.setDepth(0);
    if (buildingsLayer) buildingsLayer.setDepth(1);
    if (aboveLayer) {
      aboveLayer.setDepth(20); // Above the player
    }

    // Player
    const playerSprite = this.add.sprite(0, 0, "player");
    playerSprite.setDepth(10);

    // Read player spawn from Tiled objects layer
    const spawnPoint = this.getObjectByName(map, "player_spawn");
    const startX = spawnPoint ? Math.floor(spawnPoint.x! / 16) : 20;
    const startY = spawnPoint ? Math.floor(spawnPoint.y! / 16) : 10;

    // Grid Engine init
    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: playerSprite,
          startPosition: { x: startX, y: startY },
          speed: 4,
          offsetY: -8, // Offset because sprite is 16x32 but tile is 16x16
        },
      ],
    });

    // Camera
    this.cameras.main.startFollow(playerSprite, true);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setRoundPixels(true);

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }
  }

  update(): void {
    if (!this.cursors) return;

    if (this.cursors.left.isDown) {
      this.gridEngine.move("player", Direction.LEFT);
    } else if (this.cursors.right.isDown) {
      this.gridEngine.move("player", Direction.RIGHT);
    } else if (this.cursors.up.isDown) {
      this.gridEngine.move("player", Direction.UP);
    } else if (this.cursors.down.isDown) {
      this.gridEngine.move("player", Direction.DOWN);
    }
  }

  private getObjectByName(
    map: Phaser.Tilemaps.Tilemap,
    name: string
  ): Phaser.Types.Tilemaps.TiledObject | undefined {
    const objectLayer = map.getObjectLayer("Objects");
    if (!objectLayer) return undefined;
    return objectLayer.objects.find((obj) => obj.name === name);
  }
}
```

**Step 3: Test**

```bash
npm run dev
```

Navigate to `http://localhost:4321/explore`. Expected: Mauville City renders with actual Emerald tiles. Player (Brendan sprite) can walk around. Collision works on buildings and walls.

**Step 4: Commit**

```bash
git add src/game/
git commit -m "feat(game): load real Mauville City tilemap with Emerald assets"
```

---

### Task 8: Player Walking Animation

**Files:**
- Create: `src/game/systems/AnimationSystem.ts`
- Modify: `src/game/scenes/OverworldScene.ts`

**Step 1: Create animation system**

The Brendan spritesheet from pret has frames arranged in a specific order. Grid Engine can auto-animate using `walkingAnimationMapping`.

```typescript
// src/game/systems/AnimationSystem.ts

/**
 * Creates walking animations for a character spritesheet.
 *
 * Pokemon Emerald overworld sprites are 16x32 and arranged as:
 * Row 0: walking down (3 frames: left-foot, standing, right-foot)
 * Row 1: walking up (3 frames)
 * Row 2: walking left (3 frames)
 * Row 3: walking right (3 frames) — OR mirrored from left
 *
 * Grid Engine's walkingAnimationMapping maps direction to frame indices:
 * { up: { leftFoot, standing, rightFoot }, down: {...}, left: {...}, right: {...} }
 */
export function getWalkingAnimationMapping() {
  return {
    down: {
      leftFoot: 0,
      standing: 1,
      rightFoot: 2,
    },
    up: {
      leftFoot: 3,
      standing: 4,
      rightFoot: 5,
    },
    left: {
      leftFoot: 6,
      standing: 7,
      rightFoot: 8,
    },
    right: {
      leftFoot: 9,
      standing: 10,
      rightFoot: 11,
    },
  };
}
```

Note: The exact frame order depends on how the Brendan spritesheet is structured in pret. You may need to inspect `graphics/object_events/pics/people/brendan/brendan_normal.png` and adjust indices. The `walkingAnimationMapping` tells Grid Engine which spritesheet frame to display for each direction + step.

**Step 2: Apply animation mapping in OverworldScene**

Update the Grid Engine character config in `OverworldScene.create()`:

```typescript
// In the gridEngine.create() call, update the player character config:
{
  id: "player",
  sprite: playerSprite,
  startPosition: { x: startX, y: startY },
  speed: 4,
  offsetY: -8,
  walkingAnimationMapping: getWalkingAnimationMapping(),
}
```

Import at top of file:
```typescript
import { getWalkingAnimationMapping } from "../systems/AnimationSystem";
```

**Step 3: Test**

Player should now animate (cycle through frames) when walking in each direction, and show the standing frame when stopped.

**Step 4: Commit**

```bash
git add src/game/
git commit -m "feat(game): player walking animation with Grid Engine mapping"
```

---

## Phase 1C: Core Interactions

Goal: NPCs, dialog system, wild encounters, and basic Start Menu.

### Task 9: Dialog System

**Files:**
- Create: `src/game/systems/DialogSystem.ts`
- Create: `src/components/game/DialogBox.tsx`
- Create: `src/game/EventBridge.ts`

The dialog system uses React overlays on top of the Phaser canvas, connected via a DOM event bridge. This keeps the dialog rendering in React (easy HTML/CSS) while the game logic stays in Phaser.

**Step 1: Create the event bridge**

```typescript
// src/game/EventBridge.ts

/**
 * Simple DOM event bridge between Phaser (game logic) and React (UI overlays).
 * Phaser emits events, React listens. React emits events, Phaser listens.
 */
export const GameEvents = {
  // Phaser -> React
  SHOW_DIALOG: "game:show-dialog",
  HIDE_DIALOG: "game:hide-dialog",
  SHOW_ENCOUNTER: "game:show-encounter",
  SHOW_MENU: "game:show-menu",
  HIDE_MENU: "game:hide-menu",

  // React -> Phaser
  DIALOG_COMPLETE: "game:dialog-complete",
  ENCOUNTER_CHOICE: "game:encounter-choice",
  MENU_CLOSE: "game:menu-close",
} as const;

export interface DialogPayload {
  lines: string[];
  speakerName?: string;
  onComplete?: string; // event to fire when dialog finishes
  choices?: { label: string; action: string }[];
}

export interface EncounterPayload {
  type: "wild" | "trainer";
  name: string;
  description: string;
  category: string; // "ML", "PyPI", "Fun", "Paper"
  level: number;
  stats?: Record<string, number>;
  links: { label: string; url: string }[];
  spriteKey?: string;
}

export function emitGameEvent(event: string, detail?: unknown): void {
  window.dispatchEvent(new CustomEvent(event, { detail }));
}

export function onGameEvent(
  event: string,
  handler: (detail: unknown) => void
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(event, listener);
  return () => window.removeEventListener(event, listener);
}
```

**Step 2: Create the dialog box React component**

```tsx
// src/components/game/DialogBox.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { GameEvents, onGameEvent, emitGameEvent } from "../../game/EventBridge";
import type { DialogPayload } from "../../game/EventBridge";

const CHAR_DELAY_MS = 30; // milliseconds per character (Pokemon-style typewriter)

export default function DialogBox() {
  const [visible, setVisible] = useState(false);
  const [dialog, setDialog] = useState<DialogPayload | null>(null);
  const [currentLine, setCurrentLine] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const fullTextRef = useRef("");

  useEffect(() => {
    const unsub = onGameEvent(GameEvents.SHOW_DIALOG, (detail) => {
      const payload = detail as DialogPayload;
      setDialog(payload);
      setCurrentLine(0);
      setVisible(true);
      startTyping(payload.lines[0]);
    });
    return unsub;
  }, []);

  const startTyping = useCallback((text: string) => {
    fullTextRef.current = text;
    setDisplayedText("");
    setIsTyping(true);
    let i = 0;
    const type = () => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        timerRef.current = setTimeout(type, CHAR_DELAY_MS);
      } else {
        setIsTyping(false);
      }
    };
    type();
  }, []);

  const handleAdvance = useCallback(() => {
    if (!dialog) return;

    if (isTyping) {
      // Skip to end of current line
      if (timerRef.current) clearTimeout(timerRef.current);
      setDisplayedText(fullTextRef.current);
      setIsTyping(false);
      return;
    }

    const nextLine = currentLine + 1;
    if (nextLine < dialog.lines.length) {
      setCurrentLine(nextLine);
      startTyping(dialog.lines[nextLine]);
    } else if (dialog.choices) {
      // Show choices (handled separately)
    } else {
      // Dialog complete
      setVisible(false);
      setDialog(null);
      emitGameEvent(GameEvents.DIALOG_COMPLETE);
    }
  }, [dialog, currentLine, isTyping, startTyping]);

  // Listen for Enter/Space/Z key to advance dialog
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "z") {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, handleAdvance]);

  if (!visible || !dialog) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "720px",
        padding: "8px",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "3px solid #333",
          borderRadius: "8px",
          padding: "12px 16px",
          fontFamily: '"Pokemon GB", monospace',
          fontSize: "14px",
          lineHeight: 1.6,
          color: "#333",
          minHeight: "64px",
          cursor: "pointer",
          imageRendering: "pixelated",
        }}
        onClick={handleAdvance}
      >
        {dialog.speakerName && (
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            {dialog.speakerName}
          </div>
        )}
        <div>{displayedText}</div>
        {!isTyping && (
          <div
            style={{
              position: "absolute",
              bottom: "14px",
              right: "20px",
              animation: "bounce 0.5s infinite alternate",
            }}
          >
            &#9660;
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Create the dialog system for Phaser**

```typescript
// src/game/systems/DialogSystem.ts
import { emitGameEvent, onGameEvent, GameEvents } from "../EventBridge";
import type { DialogPayload } from "../EventBridge";

export class DialogSystem {
  private scene: Phaser.Scene;
  private isActive = false;
  private resolveDialog: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Listen for dialog completion from React
    onGameEvent(GameEvents.DIALOG_COMPLETE, () => {
      this.isActive = false;
      if (this.resolveDialog) {
        this.resolveDialog();
        this.resolveDialog = null;
      }
    });
  }

  get active(): boolean {
    return this.isActive;
  }

  /**
   * Show a dialog and return a promise that resolves when it's dismissed.
   * The Phaser scene should pause player input while dialog is active.
   */
  showDialog(payload: DialogPayload): Promise<void> {
    this.isActive = true;
    emitGameEvent(GameEvents.SHOW_DIALOG, payload);
    return new Promise((resolve) => {
      this.resolveDialog = resolve;
    });
  }
}
```

**Step 4: Integrate DialogBox into PhaserGame wrapper**

Update `src/components/game/PhaserGame.tsx` to include the DialogBox overlay:

```tsx
// Add to PhaserGame.tsx imports:
import DialogBox from "./DialogBox";

// Update the return JSX:
return (
  <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
    <div
      ref={gameContainerRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
      }}
    />
    <DialogBox />
  </div>
);
```

**Step 5: Commit**

```bash
git add src/game/ src/components/game/
git commit -m "feat(game): dialog system with event bridge and React overlay"
```

---

### Task 10: NPC System and Interaction

**Files:**
- Create: `src/game/systems/NPCSystem.ts`
- Create: `src/game/data/npcs.ts`
- Modify: `src/game/scenes/OverworldScene.ts`

**Step 1: Define NPC data types and initial NPCs**

```typescript
// src/game/types/npc.ts
export type NPCType = "blog" | "bio" | "scientist" | "shopkeeper" | "nurse" | "blocker";

export interface NPCData {
  id: string;
  name: string;
  spriteKey: string;
  type: NPCType;
  position: { x: number; y: number };
  facingDirection?: "up" | "down" | "left" | "right";
  dialog: string[];
  /** Optional: choices shown after dialog completes */
  choices?: { label: string; url?: string; action?: string }[];
  /** Does this NPC wander randomly? */
  wanders?: boolean;
}
```

```typescript
// src/game/data/npcs.ts
import type { NPCData } from "../types/npc";

export const mauvilleNPCs: NPCData[] = [
  // Bio/Pokefan NPCs
  {
    id: "pokefan_github",
    name: "POKEFAN",
    spriteKey: "pokefan_m",
    type: "bio",
    position: { x: 15, y: 8 },
    dialog: ["Did you know KOSTAS has", "8,300 followers on GitHub?", "That's incredible!"],
  },
  {
    id: "pokefan_phd",
    name: "POKEFAN",
    spriteKey: "pokefan_m",
    type: "bio",
    position: { x: 25, y: 12 },
    dialog: ["KOSTAS is defending his PhD", "at UTK this April!", "I'm so excited for him!"],
  },
  {
    id: "pokefan_greece",
    name: "POKEFAN",
    spriteKey: "beauty",
    type: "bio",
    position: { x: 30, y: 8 },
    dialog: ["KOSTAS came all the way", "from Greece to study ML!", "What dedication!"],
  },

  // Placeholder blog NPCs
  {
    id: "blog_placeholder_1",
    name: "YOUNGSTER",
    spriteKey: "boy_1",
    type: "blog",
    position: { x: 18, y: 14 },
    dialog: [
      "I'm waiting for KOSTAS to",
      "share his thoughts on ML",
      "training tricks!",
    ],
  },
  {
    id: "blog_placeholder_2",
    name: "LASS",
    spriteKey: "girl_1",
    type: "blog",
    position: { x: 12, y: 10 },
    dialog: [
      "Soon I'll have an amazing",
      "tutorial about CLIP",
      "distillation to share!",
    ],
  },

  // Nurse Joy (outside Pokemon Center)
  {
    id: "nurse_joy",
    name: "NURSE JOY",
    spriteKey: "nurse",
    type: "nurse",
    position: { x: 22, y: 6 },
    facingDirection: "down",
    dialog: [
      "Welcome to the POKEMON",
      "CENTER!",
      "We'll restore your",
      "POKEMON to full health!",
      "...",
      "Your POKEMON are fully",
      "healed! We hope to see",
      "you again!",
    ],
  },

  // Route blockers
  {
    id: "blocker_south",
    name: "WORKER",
    spriteKey: "fat_man",
    type: "blocker",
    position: { x: 20, y: 19 }, // South exit
    dialog: [
      "Sorry, the CYCLING ROAD",
      "is closed for repairs!",
      "Come back later!",
    ],
  },
];
```

**Step 2: Create the NPC system**

```typescript
// src/game/systems/NPCSystem.ts
import Phaser from "phaser";
import { GridEngine, Direction } from "grid-engine";
import { DialogSystem } from "./DialogSystem";
import type { NPCData } from "../types/npc";

export class NPCSystem {
  private scene: Phaser.Scene;
  private gridEngine: GridEngine;
  private dialogSystem: DialogSystem;
  private npcs: Map<string, NPCData> = new Map();

  constructor(
    scene: Phaser.Scene,
    gridEngine: GridEngine,
    dialogSystem: DialogSystem
  ) {
    this.scene = scene;
    this.gridEngine = gridEngine;
    this.dialogSystem = dialogSystem;
  }

  addNPC(data: NPCData): void {
    this.npcs.set(data.id, data);

    const sprite = this.scene.add.sprite(0, 0, data.spriteKey);
    sprite.setDepth(10);

    this.gridEngine.addCharacter({
      id: data.id,
      sprite,
      startPosition: data.position,
      speed: 2,
      offsetY: -8,
      facingDirection: data.facingDirection
        ? (data.facingDirection as Direction)
        : Direction.DOWN,
    });

    // Random wandering for some NPCs
    if (data.wanders) {
      this.scene.time.addEvent({
        delay: Phaser.Math.Between(3000, 6000),
        callback: () => this.randomMove(data.id),
        loop: true,
      });
    }
  }

  /**
   * Check if there's an NPC in the tile the player is facing.
   * If so, trigger their dialog.
   */
  async interactWithFacing(): Promise<boolean> {
    if (this.dialogSystem.active) return false;

    const playerPos = this.gridEngine.getPosition("player");
    const playerDir = this.gridEngine.getFacingDirection("player");

    const targetPos = { ...playerPos };
    switch (playerDir) {
      case Direction.UP: targetPos.y -= 1; break;
      case Direction.DOWN: targetPos.y += 1; break;
      case Direction.LEFT: targetPos.x -= 1; break;
      case Direction.RIGHT: targetPos.x += 1; break;
    }

    // Find NPC at target position
    for (const [id, data] of this.npcs) {
      const npcPos = this.gridEngine.getPosition(id);
      if (npcPos.x === targetPos.x && npcPos.y === targetPos.y) {
        // Face NPC toward player
        this.gridEngine.turnTowards(id, "player");

        await this.dialogSystem.showDialog({
          lines: data.dialog,
          speakerName: data.name,
          choices: data.choices,
        });
        return true;
      }
    }
    return false;
  }

  private randomMove(id: string): void {
    if (this.dialogSystem.active) return;
    const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    this.gridEngine.move(id, dir);
  }
}
```

**Step 3: Integrate NPC system into OverworldScene**

Add to `OverworldScene.ts`:

```typescript
// Add imports
import { DialogSystem } from "../systems/DialogSystem";
import { NPCSystem } from "../systems/NPCSystem";
import { mauvilleNPCs } from "../data/npcs";

// Add class properties
private dialogSystem!: DialogSystem;
private npcSystem!: NPCSystem;

// In create(), after gridEngine.create():
this.dialogSystem = new DialogSystem(this);
this.npcSystem = new NPCSystem(this, this.gridEngine, this.dialogSystem);

// Add all NPCs
for (const npcData of mauvilleNPCs) {
  this.npcSystem.addNPC(npcData);
}

// Add interaction key (Enter/Z)
if (this.input.keyboard) {
  this.input.keyboard.on("keydown-ENTER", () => {
    this.npcSystem.interactWithFacing();
  });
  this.input.keyboard.on("keydown-Z", () => {
    this.npcSystem.interactWithFacing();
  });
}

// In update(), skip movement when dialog is active:
update(): void {
  if (!this.cursors || this.dialogSystem.active) return;
  // ... existing movement code
}
```

**Step 4: Test**

Walk up to NPCs, press Enter. Dialog should appear with typewriter text. Press Enter to advance. Player movement blocked during dialog.

**Step 5: Commit**

```bash
git add src/game/
git commit -m "feat(game): NPC system with dialog interaction"
```

---

### Task 11: Wild Pokemon Encounter System

**Files:**
- Create: `src/game/systems/EncounterSystem.ts`
- Create: `src/game/data/pokemon.ts`
- Create: `src/components/game/EncounterScreen.tsx`
- Modify: `src/game/scenes/OverworldScene.ts`

**Step 1: Define Pokemon data from portfolio projects**

```typescript
// src/game/data/pokemon.ts
import type { EncounterPayload } from "../EventBridge";

export interface PokemonProject {
  id: string;
  name: string;
  type: string; // "Psychic/Dragon", "Electric/Steel", etc.
  level: number;
  description: string;
  category: "ML" | "PyPI" | "Fun";
  links: { label: string; url: string }[];
  /** Which routes this Pokemon appears on */
  routes: string[];
}

// Auto-generated from portfolio data
// In production, this would import from src/data/ shared files
export const allPokemon: PokemonProject[] = [
  {
    id: "medic",
    name: "MEDiC",
    type: "Psychic/Dragon",
    level: 85,
    description: "Multi-objective Exploration of Distillation from CLIP",
    category: "ML",
    links: [
      { label: "CODE", url: "https://github.com/drkostas/MEDiC" },
      { label: "PAPER", url: "#" },
    ],
    routes: ["route117"],
  },
  {
    id: "fleetsmart",
    name: "FleetSmart.ai",
    type: "Water/Steel",
    level: 72,
    description: "AI-powered fleet management platform for vessel tracking and compliance",
    category: "ML",
    links: [
      { label: "LIVE", url: "https://fleetsmart.ai" },
    ],
    routes: ["route117"],
  },
  {
    id: "high-sql",
    name: "HighSQL",
    type: "Electric/Steel",
    level: 35,
    description: "High-level MySQL utility wrapper for Python",
    category: "PyPI",
    links: [
      { label: "CODE", url: "https://github.com/drkostas/high-sql" },
      { label: "PyPI", url: "https://pypi.org/project/high-sql/" },
    ],
    routes: ["route118"],
  },
  {
    id: "tunecraft",
    name: "TuneCraft",
    type: "Normal/Fire",
    level: 40,
    description: "Personalized Spotify playlist generator",
    category: "Fun",
    links: [
      { label: "CODE", url: "https://github.com/drkostas/TuneCraft" },
    ],
    routes: ["route110"],
  },
  // ... Add remaining projects following this pattern
];
```

**Step 2: Create encounter system**

```typescript
// src/game/systems/EncounterSystem.ts
import Phaser from "phaser";
import { GridEngine } from "grid-engine";
import { emitGameEvent, onGameEvent, GameEvents } from "../EventBridge";
import type { EncounterPayload } from "../EventBridge";
import { allPokemon } from "../data/pokemon";
import type { PokemonProject } from "../data/pokemon";

const ENCOUNTER_RATE = 0.15; // 15% chance per grass tile step
const STEPS_BEFORE_ENCOUNTER = 4; // Minimum steps in grass before encounter possible

export class EncounterSystem {
  private scene: Phaser.Scene;
  private gridEngine: GridEngine;
  private grassTiles: Set<string> = new Set(); // "x,y" keys
  private stepsInGrass = 0;
  private encounterActive = false;
  private currentRoute = "mauville";

  constructor(scene: Phaser.Scene, gridEngine: GridEngine) {
    this.scene = scene;
    this.gridEngine = gridEngine;

    // Listen for encounter choices from React
    onGameEvent(GameEvents.ENCOUNTER_CHOICE, (detail) => {
      const choice = detail as { action: string; url?: string };
      if (choice.action === "run") {
        this.encounterActive = false;
      } else if (choice.url) {
        window.open(choice.url, "_blank");
      }
    });

    // Listen for movement to check grass
    this.gridEngine.movementStopped().subscribe(({ charId }) => {
      if (charId === "player" && !this.encounterActive) {
        this.checkForEncounter();
      }
    });
  }

  setRoute(route: string): void {
    this.currentRoute = route;
    this.stepsInGrass = 0;
  }

  /** Register grass tile positions from Tiled object layer */
  registerGrassZone(x: number, y: number, width: number, height: number): void {
    for (let ty = y; ty < y + height; ty++) {
      for (let tx = x; tx < x + width; tx++) {
        this.grassTiles.add(`${tx},${ty}`);
      }
    }
  }

  get active(): boolean {
    return this.encounterActive;
  }

  private checkForEncounter(): void {
    const pos = this.gridEngine.getPosition("player");
    const key = `${pos.x},${pos.y}`;

    if (!this.grassTiles.has(key)) {
      this.stepsInGrass = 0;
      return;
    }

    this.stepsInGrass++;

    if (this.stepsInGrass >= STEPS_BEFORE_ENCOUNTER && Math.random() < ENCOUNTER_RATE) {
      this.triggerEncounter();
      this.stepsInGrass = 0;
    }
  }

  private triggerEncounter(): void {
    // Pick a random Pokemon from this route
    const available = allPokemon.filter((p) =>
      p.routes.includes(this.currentRoute)
    );
    if (available.length === 0) return;

    const pokemon = available[Math.floor(Math.random() * available.length)];
    this.encounterActive = true;

    // Flash effect (classic Pokemon encounter transition)
    this.scene.cameras.main.flash(500, 0, 0, 0);

    this.scene.time.delayedCall(500, () => {
      const payload: EncounterPayload = {
        type: "wild",
        name: pokemon.name,
        description: pokemon.description,
        category: pokemon.category,
        level: pokemon.level,
        links: pokemon.links,
      };
      emitGameEvent(GameEvents.SHOW_ENCOUNTER, payload);
    });
  }
}
```

**Step 3: Create encounter screen React component**

```tsx
// src/components/game/EncounterScreen.tsx
import { useState, useEffect, useCallback } from "react";
import { GameEvents, onGameEvent, emitGameEvent } from "../../game/EventBridge";
import type { EncounterPayload } from "../../game/EventBridge";

export default function EncounterScreen() {
  const [visible, setVisible] = useState(false);
  const [encounter, setEncounter] = useState<EncounterPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const unsub = onGameEvent(GameEvents.SHOW_ENCOUNTER, (detail) => {
      setEncounter(detail as EncounterPayload);
      setSelectedIndex(0);
      setVisible(true);
    });
    return unsub;
  }, []);

  const options = encounter
    ? [...encounter.links.map((l) => l), { label: "RUN", url: undefined }]
    : [];

  const handleSelect = useCallback(() => {
    const option = options[selectedIndex];
    if (option.label === "RUN") {
      setVisible(false);
      emitGameEvent(GameEvents.ENCOUNTER_CHOICE, { action: "run" });
    } else if (option.url) {
      window.open(option.url, "_blank");
    }
  }, [options, selectedIndex]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowDown") {
        setSelectedIndex((i) => Math.min(options.length - 1, i + 1));
      } else if (e.key === "Enter" || e.key === "z") {
        handleSelect();
      } else if (e.key === "Escape" || e.key === "x") {
        setVisible(false);
        emitGameEvent(GameEvents.ENCOUNTER_CHOICE, { action: "run" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, options, handleSelect]);

  if (!visible || !encounter) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"Pokemon GB", monospace',
        color: "#fff",
        zIndex: 200,
        imageRendering: "pixelated",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
          {encounter.type === "wild" ? "Wild" : "Trainer"}{" "}
          {encounter.category} project appeared!
        </div>
        <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "4px" }}>
          {encounter.name}
        </div>
        <div style={{ fontSize: "11px", color: "#ccc", marginBottom: "8px" }}>
          Lv. {encounter.level}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#ddd",
            maxWidth: "400px",
            lineHeight: 1.5,
          }}
        >
          {encounter.description}
        </div>
      </div>

      <div
        style={{
          background: "#222",
          border: "2px solid #fff",
          borderRadius: "8px",
          padding: "12px 24px",
          minWidth: "200px",
        }}
      >
        {options.map((option, i) => (
          <div
            key={option.label}
            style={{
              padding: "6px 0",
              cursor: "pointer",
              color: i === selectedIndex ? "#ff0" : "#fff",
            }}
          >
            {i === selectedIndex ? ">" : " "} {option.label}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Add EncounterScreen to PhaserGame wrapper**

```tsx
// In PhaserGame.tsx, add import and render:
import EncounterScreen from "./EncounterScreen";

// In return JSX, add after DialogBox:
<EncounterScreen />
```

**Step 5: Integrate EncounterSystem into OverworldScene**

```typescript
// Add to OverworldScene imports + properties + create()
import { EncounterSystem } from "../systems/EncounterSystem";

private encounterSystem!: EncounterSystem;

// In create(), after gridEngine.create():
this.encounterSystem = new EncounterSystem(this, this.gridEngine);

// Register grass zones from Tiled objects
const grassObjects = map.getObjectLayer("Objects")?.objects.filter(
  (obj) => obj.name.startsWith("grass_")
) ?? [];
for (const grass of grassObjects) {
  this.encounterSystem.registerGrassZone(
    Math.floor(grass.x! / 16),
    Math.floor(grass.y! / 16),
    Math.floor(grass.width! / 16),
    Math.floor(grass.height! / 16)
  );
}

// Update movement guard:
update(): void {
  if (!this.cursors || this.dialogSystem.active || this.encounterSystem.active) return;
  // ... existing movement
}
```

**Step 6: Commit**

```bash
git add src/game/ src/components/game/
git commit -m "feat(game): wild Pokemon encounter system with React overlay"
```

---

### Task 12: Basic Start Menu

**Files:**
- Create: `src/components/game/StartMenu.tsx`
- Create: `src/components/game/TrainerCard.tsx`
- Create: `src/components/game/PokedexList.tsx`
- Modify: `src/game/scenes/OverworldScene.ts`
- Modify: `src/components/game/PhaserGame.tsx`

**Step 1: Create the Start Menu component**

```tsx
// src/components/game/StartMenu.tsx
import { useState, useEffect, useCallback } from "react";
import { GameEvents, onGameEvent, emitGameEvent } from "../../game/EventBridge";
import TrainerCard from "./TrainerCard";
import PokedexList from "./PokedexList";

const MENU_ITEMS = [
  { key: "pokedex", label: "POKeDEX" },
  { key: "pokemon", label: "POKeMON" },
  { key: "bag", label: "BAG" },
  { key: "trainercard", label: "TRAINER CARD" },
  { key: "save", label: "SAVE" },
  { key: "option", label: "OPTION" },
] as const;

type SubScreen = "pokedex" | "trainercard" | null;

export default function StartMenu() {
  const [visible, setVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subScreen, setSubScreen] = useState<SubScreen>(null);

  // Toggle on Escape/Start key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !subScreen) {
        if (visible) {
          setVisible(false);
          emitGameEvent(GameEvents.MENU_CLOSE);
        } else {
          setVisible(true);
          emitGameEvent(GameEvents.SHOW_MENU);
        }
      } else if (e.key === "Escape" && subScreen) {
        setSubScreen(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, subScreen]);

  const handleSelect = useCallback(() => {
    const item = MENU_ITEMS[selectedIndex];
    switch (item.key) {
      case "pokedex":
        setSubScreen("pokedex");
        break;
      case "trainercard":
        setSubScreen("trainercard");
        break;
      case "save":
        // Trigger CV download
        window.open("/resume.pdf", "_blank");
        break;
      case "option":
        setVisible(false);
        emitGameEvent(GameEvents.MENU_CLOSE);
        // TODO: Exit to normal mode
        window.location.href = "/";
        break;
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (!visible || subScreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowDown") {
        setSelectedIndex((i) => Math.min(MENU_ITEMS.length - 1, i + 1));
      } else if (e.key === "Enter" || e.key === "z") {
        handleSelect();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, subScreen, handleSelect]);

  if (!visible) return null;

  if (subScreen === "pokedex") return <PokedexList onBack={() => setSubScreen(null)} />;
  if (subScreen === "trainercard") return <TrainerCard onBack={() => setSubScreen(null)} />;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "#fff",
        border: "3px solid #333",
        borderRadius: "8px",
        padding: "8px 16px",
        fontFamily: '"Pokemon GB", monospace',
        fontSize: "14px",
        color: "#333",
        zIndex: 150,
        minWidth: "160px",
      }}
    >
      {MENU_ITEMS.map((item, i) => (
        <div
          key={item.key}
          style={{
            padding: "4px 0",
            cursor: "pointer",
            fontWeight: i === selectedIndex ? "bold" : "normal",
          }}
        >
          {i === selectedIndex ? ">" : " "} {item.label}
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Create TrainerCard component**

```tsx
// src/components/game/TrainerCard.tsx
interface Props {
  onBack: () => void;
}

export default function TrainerCard({ onBack }: Props) {
  // Listen for Escape to go back
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "x") onBack();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.8)",
        zIndex: 200,
        fontFamily: '"Pokemon GB", monospace',
      }}
      onKeyDown={(e) => handleKey(e.nativeEvent)}
      tabIndex={0}
      ref={(el) => el?.focus()}
    >
      <div
        style={{
          background: "#4a90d9",
          border: "4px solid #333",
          borderRadius: "12px",
          padding: "24px",
          color: "#fff",
          width: "360px",
        }}
      >
        <div style={{ fontSize: "16px", fontWeight: "bold", textAlign: "center", marginBottom: "16px" }}>
          TRAINER CARD
        </div>
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <div style={{ width: "64px", height: "64px", background: "#fff", borderRadius: "4px" }} />
          <div>
            <div>Name: KOSTAS</div>
            <div>Class: ML ENGINEER</div>
            <div>Region: Greece &gt; US</div>
            <div>ID: PhD-2026</div>
          </div>
        </div>
        <div style={{ fontSize: "11px", marginBottom: "8px" }}>
          POKEDEX: 31 seen / 24 caught
        </div>
        <div style={{ fontSize: "11px" }}>
          TIME: 8+ years experience
        </div>
        <div style={{ marginTop: "16px", fontSize: "10px", color: "#cce" }}>
          Press ESC to go back
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Create PokedexList component (minimal)**

```tsx
// src/components/game/PokedexList.tsx
import { useState, useEffect } from "react";
import { allPokemon } from "../../game/data/pokemon";

interface Props {
  onBack: () => void;
}

export default function PokedexList({ onBack }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "x") onBack();
      if (e.key === "ArrowUp") setSelectedIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowDown") setSelectedIndex((i) => Math.min(allPokemon.length - 1, i + 1));
      if ((e.key === "Enter" || e.key === "z") && allPokemon[selectedIndex]?.links[0]?.url) {
        window.open(allPokemon[selectedIndex].links[0].url, "_blank");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack, selectedIndex]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#c00",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Pokemon GB", monospace',
        color: "#fff",
        zIndex: 200,
        padding: "16px",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>
        POKeDEX
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {allPokemon.map((p, i) => (
          <div
            key={p.id}
            style={{
              padding: "6px 8px",
              background: i === selectedIndex ? "#fff" : "transparent",
              color: i === selectedIndex ? "#333" : "#fff",
              display: "flex",
              justifyContent: "space-between",
              borderRadius: "4px",
              marginBottom: "2px",
            }}
          >
            <span>#{String(i + 1).padStart(3, "0")} {p.name}</span>
            <span style={{ fontSize: "10px" }}>Lv.{p.level}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: "10px", marginTop: "8px" }}>
        ESC: back | ENTER: view project
      </div>
    </div>
  );
}
```

**Step 4: Add StartMenu to PhaserGame wrapper and wire up pause**

```tsx
// In PhaserGame.tsx:
import StartMenu from "./StartMenu";

// In return JSX:
<StartMenu />
```

In OverworldScene, listen for menu events:

```typescript
// In create():
onGameEvent(GameEvents.SHOW_MENU, () => {
  this.menuActive = true;
});
onGameEvent(GameEvents.MENU_CLOSE, () => {
  this.menuActive = false;
});

// Add property:
private menuActive = false;

// Update guard:
update(): void {
  if (!this.cursors || this.dialogSystem.active || this.encounterSystem.active || this.menuActive) return;
  // ...
}
```

**Step 5: Commit**

```bash
git add src/game/ src/components/game/
git commit -m "feat(game): Start Menu with Pokedex, Trainer Card, and Save"
```

---

## What's Next (Phase 2+)

After completing Phase 1 (Tasks 1-12), the following can be tackled as separate implementation plans:

### Phase 2: Building Interiors
- Gym interior scene (papers as trainers, badge case)
- Pokemon Center interior (Nurse Joy healing, PC terminal for CV)
- Mart interior (GitHub repo shop)
- House interiors (blog NPCs)
- Scene transitions (door entry/exit with fade)

### Phase 3: Polish
- Full Bag system (Skills pocket, TMs pocket, Key Items)
- Battle-style paper encounter UI (more elaborate than current)
- Sound effects (walking, encounter, dialog, healing jingle)
- Pokemon party screen
- NPC walking animations
- Mobile virtual d-pad
- Encounter transition animation (not just flash)
- Trainer encounter system (scientists who challenge you)

### Phase 4: Routes
- Full Route 117 map with Day Care
- Route 110 partial with Cycling Road gate
- Route 118 partial with water blocker
- Map transitions between city and routes
- Route-specific encounter tables
- Snorlax blocker event

### Phase 5: Normal Mode Integration
- Gamepad toggle button in portfolio navbar
- Lazy-load Phaser bundle on toggle
- Shared data layer between normal and explore modes
- "Exit to Normal Mode" in Options menu
