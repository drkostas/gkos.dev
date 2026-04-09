#!/usr/bin/env node
/**
 * fix-sprite-transparency.mjs
 *
 * Replaces the background color RGB(115, 197, 164) with full transparency
 * in all sprite PNGs under public/game/sprites/emerald/ and
 * public/game/sprites/pokemon/.
 *
 * These are 4-bit indexed PNGs where palette index 0 renders as
 * RGB(115, 197, 164) instead of being transparent.
 */

import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const SPRITE_DIRS = [
  join(ROOT, 'public/game/sprites/emerald'),
  join(ROOT, 'public/game/sprites/pokemon'),
];

// Background color to replace
const BG_R = 115;
const BG_G = 197;
const BG_B = 164;

let totalFiles = 0;
let totalPixelsFixed = 0;

for (const dir of SPRITE_DIRS) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    console.warn(`  Skipping missing directory: ${dir}`);
    continue;
  }

  const pngs = entries
    .filter((e) => e.isFile() && e.name.endsWith('.png'))
    .map((e) => e.name);

  console.log(`\nProcessing ${pngs.length} PNGs in ${dir}`);

  for (const name of pngs) {
    const filePath = join(dir, name);

    // Read as raw RGBA
    const { data, info } = await sharp(filePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let pixelsFixed = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === BG_R && data[i + 1] === BG_G && data[i + 2] === BG_B) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0; // fully transparent
        pixelsFixed++;
      }
    }

    // Write back
    await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toFile(filePath);

    totalFiles++;
    totalPixelsFixed += pixelsFixed;
    console.log(`  ${name}: ${pixelsFixed} pixels made transparent`);
  }
}

console.log(`\nDone. ${totalFiles} sprites processed, ${totalPixelsFixed} pixels made transparent.`);
