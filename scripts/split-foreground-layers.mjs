#!/usr/bin/env node
/**
 * Split mauville_foreground.png into two layers:
 *   - mauville_foreground_decor.png — only decorative pixels (trees, fences,
 *     rocks, signs, doors, etc.). Grass/dirt pixels are transparent, so the
 *     ground tilemap shows through.
 *   - (the original stays as-is for backward compat)
 *
 * The GBA foreground PNG has grass pixels baked into many tiles (a fence post
 * tile contains both the fence AND the grass on either side of it). That means
 * when the editor's Tint tool applies a color to a "fence" tile, it also tints
 * the grass. This preprocessing step removes the grass pixels from the
 * foreground layer so trees/fences/etc. can be tinted independently.
 *
 * Usage: node scripts/split-foreground-layers.mjs
 * Output: public/game/maps/mauville_foreground_decor.png
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const IN = resolve(ROOT, "public/game/maps/mauville_foreground.png");
const OUT = resolve(ROOT, "public/game/maps/mauville_foreground_decor.png");

// Grass/dirt colors commonly baked into foreground tiles in the source.
// These are drawn from the Pokemon Emerald route 118 tileset palette.
// Pixels matching these (within tolerance) become transparent in the output.
const GRASS_COLORS = [
  [131, 197, 98],   // medium grass
  [180, 255, 131],  // bright grass highlight
  [57, 139, 49],    // grass shadow
  [57, 82, 0],      // dark grass/leaf
  [115, 197, 164],  // GBA transparency key (legacy, should already be alpha=0)
  // Dirt path
  [222, 180, 148],
  [189, 148, 115],
  [197, 156, 115],
  // Sand
  [238, 213, 172],
  [222, 197, 148],
];

// Distance threshold for color matching (euclidean in RGB space, 0-441)
const TOLERANCE = 8;

function colorDist(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function main() {
  console.log(`Reading ${IN}...`);
  const img = sharp(IN);
  const { width, height, channels } = await img.metadata();
  console.log(`Size: ${width}x${height}, channels: ${channels}`);

  const raw = await img.raw().toBuffer();
  // raw layout: [R, G, B, A, R, G, B, A, ...]
  const out = Buffer.from(raw);

  let stripped = 0;
  let kept = 0;
  const pixelCount = width * height;

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const alpha = out[idx + 3];
    if (alpha === 0) continue;

    const r = out[idx], g = out[idx + 1], b = out[idx + 2];
    const isGrass = GRASS_COLORS.some((c) => colorDist([r, g, b], c) <= TOLERANCE);

    if (isGrass) {
      out[idx + 3] = 0; // make transparent
      stripped++;
    } else {
      kept++;
    }
  }

  console.log(`Stripped ${stripped} grass/dirt pixels, kept ${kept} decor pixels`);

  await sharp(out, { raw: { width, height, channels } })
    .png()
    .toFile(OUT);

  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
