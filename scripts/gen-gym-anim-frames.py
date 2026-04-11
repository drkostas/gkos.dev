#!/usr/bin/env python3
"""
Generate two animation frame variants of the composed gym_bottom.png.

The OG Pokemon Emerald gym animates 16 raw 8x8 tiles (secondary tile
indices 144-159) every 2 frames at 60fps. The animation swaps between
electric_gates/0.png and electric_gates/1.png.

In our composed tileset, the metatiles that reference tiles 144-159
are rendered into specific regions of gym_bottom.png. This script:

  1. Loads the compiled gym_bottom.png (already written by the Node
     compositor).
  2. Loads anim frame 0 and 1 PNGs as indexed-palette images (via
     Pillow, which handles mode=P correctly — sharp cannot).
  3. Loads the secondary palette files so we can translate the anim
     frames' palette indices into the correct RGB colors used by the
     gym tileset.
  4. For each metatile that uses animated tiles 144-159 in its
     bottom layer, patches the corresponding 8x8 pixel regions in
     a copy of gym_bottom.png with the anim frame pixel data.
  5. Writes gym_bottom_frame0.png and gym_bottom_frame1.png.

The resulting files have identical layouts to gym_bottom.png but
with the electric-beam pixels replaced by their animation frame.
"""
from pathlib import Path
from PIL import Image
import struct

ROOT = Path(__file__).resolve().parent.parent
POKE_RAW = Path("/tmp/pokeemerald")
GYM_DIR = POKE_RAW / "data/tilesets/secondary/mauville_gym"
PRIMARY_DIR = POKE_RAW / "data/tilesets/primary/building"

# Compose script constants
TILE_PX = 8
META_PX = 16
COMPOSED_COLUMNS = 16
EXTRUDE = 1
TS_MARGIN = EXTRUDE
TS_SPACING = 2 * EXTRUDE

NUM_TILES_IN_PRIMARY = 512  # from tilesets.h NUM_TILES_IN_PRIMARY
ANIM_START_TILE = 144       # secondary tile index where animation begins
ANIM_TILE_COUNT = 16        # 16 tiles = 2 wide * 8 tall in the anim PNGs
ANIM_COMBINED_RANGE = (
    NUM_TILES_IN_PRIMARY + ANIM_START_TILE,
    NUM_TILES_IN_PRIMARY + ANIM_START_TILE + ANIM_TILE_COUNT,
)


def load_jasc_pal(path: Path):
    """Parse a JASC-PAL file → list of (R, G, B) tuples (16 entries)."""
    lines = path.read_text().splitlines()
    assert lines[0] == "JASC-PAL", f"not JASC: {path}"
    n = int(lines[2])
    out = []
    for i in range(n):
        r, g, b = map(int, lines[3 + i].split())
        out.append((r, g, b))
    return out


def load_palettes(dir_path: Path):
    """Load palette files 00.pal..15.pal from a palettes/ directory."""
    pals = []
    for i in range(16):
        f = dir_path / f"{i:02d}.pal"
        pals.append(load_jasc_pal(f) if f.exists() else [(0, 0, 0)] * 16)
    return pals


def parse_metatiles(bin_path: Path):
    """Parse metatiles.bin: list of metatiles, each with 8 tile refs."""
    data = bin_path.read_bytes()
    count = len(data) // 16
    out = []
    for m in range(count):
        tiles = []
        for i in range(8):
            word = struct.unpack_from("<H", data, m * 16 + i * 2)[0]
            tiles.append({
                "tile": word & 0x3FF,
                "xflip": bool(word & 0x400),
                "yflip": bool(word & 0x800),
                "pal": (word >> 12) & 0xF,
            })
        out.append(tiles)
    return out


def extract_anim_frame_tiles(png_path: Path):
    """
    Read an indexed-palette PNG (16x64) and return 16 raw tiles,
    each as a list of 64 (R, G, B, A) tuples (top-left to bottom-right).

    Each tile is 8x8. The PNG layout is 2 cols × 8 rows of tiles.
    """
    img = Image.open(png_path).convert("RGBA")
    w, h = img.size
    assert (w, h) == (16, 64), f"unexpected anim size {w}x{h}"
    tiles = []
    for ty in range(h // TILE_PX):
        for tx in range(w // TILE_PX):
            tile = []
            for py in range(TILE_PX):
                for px in range(TILE_PX):
                    tile.append(img.getpixel((tx * TILE_PX + px, ty * TILE_PX + py)))
            tiles.append(tile)
    return tiles


def extruded_pos(col: int, row: int):
    """Top-left pixel of metatile at (col, row) in extruded tileset."""
    x = TS_MARGIN + col * (META_PX + TS_SPACING)
    y = TS_MARGIN + row * (META_PX + TS_SPACING)
    return x, y


def main():
    print("Generating gym animation frames…")

    # ── Load primary metatiles to get full ID range ───────────────
    # (We only need the secondary metatiles since the gym puzzle
    # pieces live there.)
    sec_metatiles = parse_metatiles(GYM_DIR / "metatiles.bin")
    print(f"  Loaded {len(sec_metatiles)} secondary metatiles")

    # Load composed gym map to know which metatile IDs are in the tileset
    import json
    gym_json = json.loads((ROOT / "public/game/maps/gym.json").read_text())
    # Tileset tile IDs in the composed atlas are 1-based GIDs.
    # To map back to OG metatile IDs we need to recreate the
    # usedIds ordering the Node compositor used.
    map_bin = (POKE_RAW / "data/layouts/MauvilleCity_Gym/map.bin").read_bytes()
    used_ids = set()
    for i in range(0, len(map_bin), 2):
        used_ids.add(struct.unpack_from("<H", map_bin, i)[0] & 0x3FF)

    # Add the barrier pairs that compose-interior-maps.mjs injects
    barrier_pairs = [
        (0x220, 0x230), (0x221, 0x231), (0x228, 0x238), (0x229, 0x239),
        (0x222, 0x232), (0x223, 0x233), (0x22a, 0x23a), (0x22b, 0x23b),
        (0x242, 0x243), (0x250, 0x251),
        (0x240, 0x248), (0x241, 0x249),
        (0x205, 0x206),
    ]
    for a, b in barrier_pairs:
        used_ids.add(a)
        used_ids.add(b)
    used_ids.add(0x21a)
    used_ids = sorted(used_ids)

    # Build compact index → original metatile ID
    compact_to_og = {i: og for i, og in enumerate(used_ids)}

    # Find metatiles that reference any animated tile.
    # Track which LAYER ("bottom" for sub 0-3, "top" for sub 4-7)
    # contains the animated tiles so we know which tileset PNG to patch.
    animated_compact_indices = []
    anim_lo, anim_hi = ANIM_COMBINED_RANGE
    for compact_idx, og_id in compact_to_og.items():
        if og_id < 0x200 or (og_id - 0x200) >= len(sec_metatiles):
            continue
        sec_idx = og_id - 0x200
        for sub_i, tile_ref in enumerate(sec_metatiles[sec_idx]):
            if anim_lo <= tile_ref["tile"] < anim_hi:
                layer = "bottom" if sub_i < 4 else "top"
                animated_compact_indices.append(
                    (compact_idx, og_id, sec_idx, layer)
                )
                break

    print(
        f"  Found {len(animated_compact_indices)} metatiles in the tileset "
        f"that reference animated tiles:"
    )
    for compact_idx, og_id, _sec_idx, layer in animated_compact_indices:
        print(f"    compact {compact_idx} (OG 0x{og_id:03x}) layer={layer}")

    # ── Load palettes ─────────────────────────────────────────────
    primary_pals = load_palettes(PRIMARY_DIR / "palettes")
    sec_pals = load_palettes(GYM_DIR / "palettes")
    combined = []
    for i in range(16):
        combined.append(primary_pals[i] if i < 6 else sec_pals[i])

    # Also record the transparent color (palette index 0 for each pal)
    # to match the compositor's "skip index 0" rule.

    # ── Load both anim frames as (R,G,B,A) tile arrays ────────────
    frame_tile_data = {}
    for fname in ("0.png", "1.png"):
        tiles = extract_anim_frame_tiles(
            GYM_DIR / "anim/electric_gates" / fname
        )
        frame_tile_data[fname] = tiles
        print(f"  Loaded {fname}: {len(tiles)} tiles")

    # ── Base tilesets to patch ────────────────────────────────────
    # All animated tiles in the gym live in the TOP layer of their
    # metatiles, so we patch gym_top.png. We still also output a
    # gym_bottom_frame*.png (identical to gym_bottom.png) so the
    # scene code can naively swap both frames in lockstep without
    # special-casing.
    base_bottom = Image.open(
        ROOT / "public/game/tilesets/gym_bottom.png"
    ).convert("RGBA")
    base_top = Image.open(
        ROOT / "public/game/tilesets/gym_top.png"
    ).convert("RGBA")
    print(f"  Base bottom: {base_bottom.size}")
    print(f"  Base top:    {base_top.size}")

    # Sub-tile offsets within a metatile (2x2 grid of 8x8 tiles)
    sub_positions = [
        (0, 0), (TILE_PX, 0), (0, TILE_PX), (TILE_PX, TILE_PX),
    ]

    for idx, fname in enumerate(("0.png", "1.png")):
        out_bottom = base_bottom.copy()
        out_top = base_top.copy()
        pix_top = out_top.load()
        frame_tiles = frame_tile_data[fname]

        patched = 0
        for compact_idx, _og_id, sec_idx, layer in animated_compact_indices:
            col = compact_idx % COMPOSED_COLUMNS
            row = compact_idx // COMPOSED_COLUMNS
            mx, my = extruded_pos(col, row)

            meta = sec_metatiles[sec_idx]
            # Iterate the appropriate layer's 4 sub-tiles
            sub_range = range(0, 4) if layer == "bottom" else range(4, 8)
            target_pix = pix_top if layer == "top" else out_bottom.load()

            for sub_i in sub_range:
                tile_ref = meta[sub_i]
                if not (anim_lo <= tile_ref["tile"] < anim_hi):
                    continue
                anim_tile_offset = tile_ref["tile"] - anim_lo
                src_tile = frame_tiles[anim_tile_offset]

                # Sub-index within this layer (0-3)
                local_sub = sub_i % 4
                off_x, off_y = sub_positions[local_sub]

                for py in range(TILE_PX):
                    for px in range(TILE_PX):
                        sx = TILE_PX - 1 - px if tile_ref["xflip"] else px
                        sy = TILE_PX - 1 - py if tile_ref["yflip"] else py
                        r, g, b, a = src_tile[sy * TILE_PX + sx]
                        if a == 0:
                            continue
                        target_pix[mx + off_x + px, my + off_y + py] = (r, g, b, 255)
                patched += 1

        # Re-extrude edges of patched metatiles on both layers
        for compact_idx, _og, _sec, _layer in animated_compact_indices:
            col = compact_idx % COMPOSED_COLUMNS
            row = compact_idx // COMPOSED_COLUMNS
            mx, my = extruded_pos(col, row)
            for tgt_pix in (pix_top,):
                for px in range(META_PX):
                    tgt_pix[mx + px, my - 1] = tgt_pix[mx + px, my]
                    tgt_pix[mx + px, my + META_PX] = tgt_pix[mx + px, my + META_PX - 1]
                for py in range(META_PX):
                    tgt_pix[mx - 1, my + py] = tgt_pix[mx, my + py]
                    tgt_pix[mx + META_PX, my + py] = tgt_pix[mx + META_PX - 1, my + py]
                tgt_pix[mx - 1, my - 1] = tgt_pix[mx, my]
                tgt_pix[mx + META_PX, my - 1] = tgt_pix[mx + META_PX - 1, my]
                tgt_pix[mx - 1, my + META_PX] = tgt_pix[mx, my + META_PX - 1]
                tgt_pix[mx + META_PX, my + META_PX] = tgt_pix[mx + META_PX - 1, my + META_PX - 1]

        out_bottom.save(ROOT / f"public/game/tilesets/gym_bottom_frame{idx}.png")
        out_top.save(ROOT / f"public/game/tilesets/gym_top_frame{idx}.png")
        print(
            f"  ✓ Wrote gym_{{bottom,top}}_frame{idx}.png "
            f"({patched} sub-tiles patched on top)"
        )


if __name__ == "__main__":
    main()
