#!/usr/bin/env bash
# Extract Pokemon Emerald assets from a pret/pokeemerald clone.
# Usage: ./scripts/extract-emerald-assets.sh [/path/to/pokeemerald]

set -euo pipefail

PRET_DIR="${1:-/tmp/pokeemerald}"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/game"

if [ ! -d "$PRET_DIR/graphics" ]; then
  echo "ERROR: $PRET_DIR doesn't look like a pokeemerald repo"
  echo "Clone it first: git clone --depth 1 https://github.com/pret/pokeemerald.git /tmp/pokeemerald"
  exit 1
fi

echo "Extracting from: $PRET_DIR"
echo "Output to: $OUT_DIR"
echo ""

# ── Overworld sprites ──────────────────────────────────────────
SPRITES_OUT="$OUT_DIR/sprites/emerald"
mkdir -p "$SPRITES_OUT"

echo "=== Overworld Sprites ==="

# Player character (Brendan walking)
cp "$PRET_DIR/graphics/object_events/pics/people/brendan/walking.png" "$SPRITES_OUT/brendan.png"
echo "  Copied: brendan.png (144x32, 9 frames)"

# NPC sprites we need for the game
NPCS=(
  scientist_1
  boy_1 boy_2 boy_3
  girl_1 girl_2 girl_3
  fat_man man_1 woman_1 woman_2
  old_man old_woman
  pokefan_m pokefan_f
  nurse
  beauty gentleman
  black_belt
  hiker
  fisherman
  bug_catcher
  youngster
  lass
  little_boy little_girl
  rich_boy
)

for npc in "${NPCS[@]}"; do
  src="$PRET_DIR/graphics/object_events/pics/people/${npc}.png"
  if [ -f "$src" ]; then
    cp "$src" "$SPRITES_OUT/${npc}.png"
    echo "  Copied: ${npc}.png"
  else
    echo "  SKIP:   ${npc}.png (not found)"
  fi
done

# ── Overworld sprite palettes ──────────────────────────────────
PALETTES_OUT="$OUT_DIR/sprites/emerald/palettes"
mkdir -p "$PALETTES_OUT"

echo ""
echo "=== Sprite Palettes ==="

for pal in brendan npc_1 npc_2 npc_3 npc_4; do
  src="$PRET_DIR/graphics/object_events/palettes/${pal}.pal"
  if [ -f "$src" ]; then
    cp "$src" "$PALETTES_OUT/${pal}.pal"
    echo "  Copied: ${pal}.pal"
  fi
done

# ── Raw tilesets (need Porymap to compose into metatiles) ──────
TILES_OUT="$OUT_DIR/tilesets/emerald-raw"
mkdir -p "$TILES_OUT"

echo ""
echo "=== Raw Tilesets (need Porymap to compose) ==="

# Primary tileset (general)
for ext in tiles.png metatiles.bin metatile_attributes.bin; do
  cp "$PRET_DIR/data/tilesets/primary/general/$ext" "$TILES_OUT/general_$ext"
done
cp -r "$PRET_DIR/data/tilesets/primary/general/palettes" "$TILES_OUT/general_palettes"
echo "  Copied: general tileset (primary)"

# Secondary tileset (mauville)
for ext in tiles.png metatiles.bin metatile_attributes.bin; do
  cp "$PRET_DIR/data/tilesets/secondary/mauville/$ext" "$TILES_OUT/mauville_$ext"
done
cp -r "$PRET_DIR/data/tilesets/secondary/mauville/palettes" "$TILES_OUT/mauville_palettes"
echo "  Copied: mauville tileset (secondary)"

# Mauville gym tileset
for ext in tiles.png metatiles.bin metatile_attributes.bin; do
  src="$PRET_DIR/data/tilesets/secondary/mauville_gym/$ext"
  if [ -f "$src" ]; then
    cp "$src" "$TILES_OUT/mauville_gym_$ext"
  fi
done
echo "  Copied: mauville_gym tileset (secondary)"

# ── Map data ───────────────────────────────────────────────────
MAPS_OUT="$OUT_DIR/maps/emerald-raw"
mkdir -p "$MAPS_OUT"

echo ""
echo "=== Map Data ==="

for mapname in MauvilleCity Route117 Route110 Route118; do
  layout_dir="$PRET_DIR/data/layouts/${mapname}"
  map_dir="$PRET_DIR/data/maps/${mapname}"

  if [ -d "$layout_dir" ]; then
    mkdir -p "$MAPS_OUT/$mapname"
    cp "$layout_dir/"*.bin "$MAPS_OUT/$mapname/"
    echo "  Copied: ${mapname} layout bins"
  fi

  if [ -f "$map_dir/map.json" ]; then
    cp "$map_dir/map.json" "$MAPS_OUT/$mapname/events.json"
    echo "  Copied: ${mapname} events.json (NPCs, warps, signs)"
  fi
done

# Master layouts reference
cp "$PRET_DIR/data/layouts/layouts.json" "$MAPS_OUT/layouts.json"
echo "  Copied: layouts.json (all map dimensions)"

# ── Pokemon sprites (for encounter screens) ────────────────────
POKEMON_OUT="$OUT_DIR/sprites/pokemon"
mkdir -p "$POKEMON_OUT"

echo ""
echo "=== Pokemon Sprites (sample for encounter screens) ==="

# A selection of Pokemon that could represent projects
POKEMON=(
  mewtwo alakazam lapras machamp porygon hitmonchan dragonite gengar
  pikachu charizard snorlax gardevoir salamence metagross blaziken
)

for mon in "${POKEMON[@]}"; do
  front="$PRET_DIR/graphics/pokemon/${mon}/anim_front.png"
  icon="$PRET_DIR/graphics/pokemon/${mon}/icon.png"
  if [ -f "$front" ]; then
    cp "$front" "$POKEMON_OUT/${mon}_front.png"
    echo "  Copied: ${mon}_front.png"
  fi
  if [ -f "$icon" ]; then
    cp "$icon" "$POKEMON_OUT/${mon}_icon.png"
  fi
done

echo ""
echo "=== Done ==="
echo ""
echo "NEXT STEPS:"
echo "  1. Install Porymap: https://github.com/huderlem/porymap/releases"
echo "  2. Open pokeemerald in Porymap: File > Open Project > $PRET_DIR"
echo "  3. Export Mauville City map image: File > Export Map Stitch Image"
echo "     Save to: $OUT_DIR/maps/mauville_reference.png"
echo "  4. Export metatile sheets: Tools > Export Metatiles Image"
echo "     - General tileset -> $OUT_DIR/tilesets/general_metatiles.png"
echo "     - Mauville tileset -> $OUT_DIR/tilesets/mauville_metatiles.png"
echo "  5. Build the map in Tiled using the exported metatile sheets"
