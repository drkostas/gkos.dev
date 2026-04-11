# Pokemon Explore Mode — Known Issues

**Date:** 2026-04-09
**Branch:** feature/pokemon-explore

## Rendering

### Foreground depth is flat (single image at depth 1000)
When the player walks sideways at door-level (e.g. in front of a building), the entire building wall covers them — not just the overhang. The foreground PNG is a single flat image, so it can't do per-tile depth sorting.

**Fix needed:** Replace the single foreground image with per-tile foreground sprites. Each top-layer tile that has content should be its own Phaser sprite at `depth = 10 + tileY_pixels`. This way:
- Tiles ABOVE the player's Y position render in front (rooftops, overhangs)
- Tiles at or BELOW the player's Y position render behind (the player walks in front)

This matches how the chriscourses repo handles it — but with individual tile sprites instead of one flat layer.

### Alternative: Use Phaser tilemap layer with per-tile depth
Grid Engine may support a `charLayer` or depth sorting mode that handles this. Research Grid Engine's y-sorting with tilemap layers.

## Collision

### Missing collision on bikes, some fences
The original map.bin collision data has 323 blocked tiles. Some visual obstacles (bikes, certain fences) don't have collision bits because in the original game:
- They're unreachable due to adjacent route maps blocking access
- Or the collision is handled by object events (item balls, cut trees)

**Fix needed:** Manually add collision for specific tile positions that should be blocked:
- Bike rack area near Bike Shop
- Fence posts along roads
- Any tiles at map borders that connect to routes

### Border collision
Currently adding 48 border tiles. This prevents walking off the map edges but doesn't perfectly match the original game's route transitions.

**Future fix:** Implement route map transitions so the borders are natural.

## Walking Animation
**FIXED** — Frame mapping now matches the original pokeemerald source:
- Frames 0/1/2 = standing (down/up/left)
- Frames 3-8 = walking pairs per direction
- Running uses frames 9-17 from running.png

## NPC Interaction
**Working** via programmatic testing. Keyboard input from the browser may not reach Phaser if the canvas doesn't have focus. Need to ensure the canvas captures keyboard events.

**Fix needed:** Add `tabIndex` to the canvas or the wrapper div, and auto-focus on mount.

## Start Menu
**Working** via programmatic testing. Same keyboard focus issue.

## Dialog Box
**Working** — renders at `position: fixed` over the game canvas.
