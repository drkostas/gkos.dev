# Mauville Foreground Tile Split Analysis

## TL;DR

**Looking at every unique non-transparent 16×16 tile in `mauville_foreground.png`, here's what Mauville actually contains:**

| Category | Unique Tiles | Total Instances | Can split from grass? |
|----------|:-:|:-:|:-:|
| **Trees** (canopies) | 4 | 1,823 | ❌ No — trees use identical greens as grass |
| **Fountains** (vertical blue) | 74 | 320 | ⚠️ Partial — fountain is fully opaque, no grass to strip |
| **Walls** (building sides) | 24 | 89 | ⚠️ Partial |
| **Building roofs** (red/orange) | 24 | 67 | ⚠️ Partial |
| **Stairs/Railings** | 4 | 12 | ⚠️ Partial |
| **Flowers** | **0** | **0** | N/A — no flower tiles in this map |
| **Wood fences** | **0** | **0** | N/A — Mauville is a city; no wooden fences |

**Key finding**: Mauville is a *city* map. It has trees, fountains, and buildings — no flowers, no wooden fences. Those would be in route maps (Route 117, 118, etc.), which aren't loaded in the editor yet.

## The real problem with splitting

When I tried to split `mauville_foreground.png` tiles into foreground (decor only) and background (grass only), I hit a fundamental issue:

**The tree canopy tiles are drawn with the SAME green palette as grass.** The artist used identical colors: `RGB(131,197,98)`, `RGB(180,255,131)`, `RGB(57,139,49)`, `RGB(57,82,0)`. A program can't distinguish "this pixel is a tree leaf" from "this pixel is grass" without semantic knowledge.

**Tiles in this map fall into three groups:**

1. **Pure decor** (no grass palette) — 161 unique, 607 instances. Already clean; no splitting needed. (Fountains, building walls, signs.)
2. **Pure grass palette** — 7 unique, 1,857 instances. These ARE trees but can't be separated from grass by color. They're 100% opaque and use only grass greens.
3. **Mixed** — 31 unique, 69 instances. These have both decor AND grass pixels and can be split cleanly. (E.g., a railing tile with a strip of grass at the edge.)

## What the split comparison shows

The `MAUVILLE_COMPARISON.png` layout is:

```
[ Original PNG tile ]  =  [ Foreground Sprite ]  +  [ Ground Tile Beneath ]
```

For each row:
- **Original** = the tile as it appears in `mauville_foreground.png`
- **Foreground** = the sprite that should be rendered ON TOP of the ground (same as original because the foreground is exactly this tile)
- **Ground Tile Beneath** = the tile from Tiled's Ground layer at that position (from `mauville.json` + `mauville_bottom.png`)

In the game at runtime, the ground renders first, the foreground sprite renders on top. That's how separation actually works — not by splitting a single PNG tile, but by layering two different assets.

## Why Mauville looks "blended"

In the current asset, MOST tree tiles are 100% opaque: every pixel is a green-palette color. When rendered, the tree completely covers the grass underneath. That's why tinting a tree in the editor works: tinting the tree sprite changes ALL 256 of its green pixels (which visually are the "tree"), while the ground tile sitting underneath it is completely hidden anyway.

For tree-edge tiles (the triangular edge pieces, 2 unique, 4 instances), some edges are already transparent, so the grass beneath shows through at those edges. Those ARE pixel-perfect separated already.

## What would need manual preprocessing

To get true per-type split layers for every type of fence/flower/tree across the portfolio, you'd need source assets from `pokeemerald` — the original metatile definitions where decor elements (fence posts, flower patches, tree sections) exist as separate sprites before being composed into the foreground PNG. We don't have those in this repo.

What we have is the *rendered result* of the original game's metatile compositor. Given only the rendered PNG, full semantic separation isn't recoverable.

## See also

- `MAUVILLE_COMPARISON.png` — the big combined view (5 categories × 3 examples each)
- `sbs_tree.png` — side-by-side for trees
- `sbs_fence.png` — side-by-side for "fence" category (mostly fountains)
- `sbs_flower.png` — side-by-side for "flower" category (actually building roofs)
- `sbs_building.png` — side-by-side for building walls
