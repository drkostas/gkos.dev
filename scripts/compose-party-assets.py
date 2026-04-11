#!/usr/bin/env python3
"""
Compose party menu panel PNGs from pokeemerald tileset + tilemaps.

Reads the bg.png tileset and slot .bin tile-index files, and produces
panel images with correct palette colors for each visual state (normal,
selected, empty).

Also composes the full 240×160 BG1 background and re-palettes it.

Output: public/game/ui/party/
"""
import sys
from pathlib import Path
from PIL import Image
import numpy as np

SRC = Path("/tmp/pokeemerald/graphics/party_menu")
OUT = Path(__file__).resolve().parent.parent / "public" / "game" / "ui" / "party"
OUT.mkdir(parents=True, exist_ok=True)

TILE_PX = 8

# ── Load the tileset as indexed pixel data ─────────────────────────────
tileset_img = Image.open(SRC / "bg.png")
tileset_pal = tileset_img.getpalette()  # flat [R,G,B, R,G,B, ...]
tileset_arr = np.array(tileset_img)     # 2D array of palette indices
TS_W = tileset_img.width   # 64
TS_COLS = TS_W // TILE_PX  # 8 tile columns

def get_tile_pixels(tile_idx):
    """Return 8×8 array of palette indices for a tile."""
    tx = (tile_idx % TS_COLS) * TILE_PX
    ty = (tile_idx // TS_COLS) * TILE_PX
    return tileset_arr[ty:ty+TILE_PX, tx:tx+TILE_PX].copy()

def pal_color(idx):
    """Get (R, G, B) for palette index."""
    return (tileset_pal[idx*3], tileset_pal[idx*3+1], tileset_pal[idx*3+2])

# ── Define palette color mappings for each state ───────────────────────
# Base palette 3 (indices 48-63) is the default slot palette.
# For different states, specific palette offsets get replaced with new colors.

# Palette offset mappings (within the 16-color palette):
# PalOffsets1 = {4, 5, 6}  → the main fill colors
# PalOffsets2 = {1, 7, 8}  → the border/accent colors

PAL3_BASE = 48  # palette 3 starts at index 48

# State color overrides: {palette_offset: palette_index_to_read_color_from}
STATE_NORMAL = {
    # EmptySlotPalIds1 = {52, 53, 54} → offsets {4, 5, 6}
    4: 52, 5: 53, 6: 54,
    # EmptySlotPalIds2 = {49, 55, 56} → offsets {1, 7, 8}
    1: 49, 7: 55, 8: 56,
}

STATE_SELECTED = {
    # SelectedForActionPalIds1 = {100, 101, 102} → offsets {4, 5, 6}
    4: 100, 5: 101, 6: 102,
    # CurrSelectionPalIds2 = {97, 103, 104} → offsets {1, 7, 8}
    1: 97, 7: 103, 8: 104,
}

STATE_FAINTED = {
    4: 84, 5: 85, 6: 86,
    1: 81, 7: 87, 8: 88,
}

STATE_EMPTY = {
    # No mon → darker colors
    1: 17, 7: 27, 8: 28,   # from sPartyBoxNoMonPalIds / sPartyBoxNoMonPalOffsets {1,11,12}
}
# For empty slots, offsets {1, 11, 12} with IDs {17, 27, 28}
STATE_EMPTY_WIDE = {
    1: 17, 11: 27, 12: 28,
    4: 52, 5: 53, 6: 54,
    7: 55, 8: 56,
}

def build_palette_lut(state_overrides):
    """Build a full 256-entry LUT: old_index → (R,G,B,A) using palette 3 as base."""
    lut = {}
    # Start with base palette 3 mapping
    for offset in range(16):
        old_idx = PAL3_BASE + offset
        lut[old_idx] = pal_color(old_idx)
    # Apply state overrides
    for offset, new_pal_idx in state_overrides.items():
        old_idx = PAL3_BASE + offset
        lut[old_idx] = pal_color(new_pal_idx)
    return lut

def compose_panel(bin_path, width_tiles, height_tiles, state, transparent_idx=48):
    """Compose a panel image from a .bin tile-index file."""
    data = (SRC / bin_path).read_bytes()
    assert len(data) == width_tiles * height_tiles, \
        f"{bin_path}: expected {width_tiles*height_tiles} bytes, got {len(data)}"

    lut = build_palette_lut(state)
    w = width_tiles * TILE_PX
    h = height_tiles * TILE_PX
    out = np.zeros((h, w, 4), dtype=np.uint8)

    for ty in range(height_tiles):
        for tx in range(width_tiles):
            tile_idx = data[ty * width_tiles + tx]
            tile_pix = get_tile_pixels(tile_idx)

            for py in range(TILE_PX):
                for px in range(TILE_PX):
                    pal_idx = int(tile_pix[py, px])
                    if pal_idx == transparent_idx:
                        out[ty*TILE_PX+py, tx*TILE_PX+px] = (0, 0, 0, 0)
                    elif pal_idx in lut:
                        r, g, b = lut[pal_idx]
                        out[ty*TILE_PX+py, tx*TILE_PX+px] = (r, g, b, 255)
                    else:
                        # Fall back to raw palette color
                        r, g, b = pal_color(pal_idx)
                        out[ty*TILE_PX+py, tx*TILE_PX+px] = (r, g, b, 255)

    return Image.fromarray(out, 'RGBA')

def compose_bg():
    """Compose the 240×160 BG1 background from bg.bin tilemap."""
    bg_bin = (SRC / "bg.bin").read_bytes()
    w, h = 240, 160
    MAP_STRIDE = 32
    out = np.zeros((h, w, 4), dtype=np.uint8)

    for ty in range(h // TILE_PX):
        for tx in range(w // TILE_PX):
            map_idx = ty * MAP_STRIDE + tx
            entry = int.from_bytes(bg_bin[map_idx*2:map_idx*2+2], 'little')
            tile_idx = entry & 0x3FF
            hflip = bool(entry & 0x400)
            vflip = bool(entry & 0x800)

            tile_pix = get_tile_pixels(tile_idx)
            if hflip:
                tile_pix = np.fliplr(tile_pix)
            if vflip:
                tile_pix = np.flipud(tile_pix)

            for py in range(TILE_PX):
                for px in range(TILE_PX):
                    pal_idx = int(tile_pix[py, px])
                    r, g, b = pal_color(pal_idx)
                    out[ty*TILE_PX+py, tx*TILE_PX+px] = (r, g, b, 255)

    return Image.fromarray(out, 'RGBA')


# ── Produce all assets ─────────────────────────────────────────────────
print("Composing party menu assets...")

# Slot panels (main = lead, 10×7 tiles; wide = others, 18×3 tiles)
for name, state in [("normal", STATE_NORMAL), ("selected", STATE_SELECTED)]:
    img = compose_panel("slot_main.bin", 10, 7, state)
    path = OUT / f"slot_main_{name}.png"
    img.save(path)
    print(f"  ✓ {path.name} ({img.width}×{img.height})")

for name, state in [("normal", STATE_NORMAL), ("selected", STATE_SELECTED)]:
    img = compose_panel("slot_wide.bin", 18, 3, state)
    path = OUT / f"slot_wide_{name}.png"
    img.save(path)
    print(f"  ✓ {path.name} ({img.width}×{img.height})")

# Empty wide slot
img = compose_panel("slot_wide_empty.bin", 18, 3, STATE_EMPTY_WIDE)
img.save(OUT / "slot_wide_empty.png")
print(f"  ✓ slot_wide_empty.png")

# BG1 background
bg = compose_bg()
bg.save(OUT / "bg.png")
print(f"  ✓ bg.png ({bg.width}×{bg.height})")

# Also copy the pokeball sprite
import shutil
shutil.copy2(SRC / "pokeball.png", OUT / "pokeball.png")
print(f"  ✓ pokeball.png (copied)")

print("\nDone! All assets in:", OUT)
