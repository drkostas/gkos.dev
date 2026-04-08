// Create a side-by-side image of baseline + current for visual comparison.
import sharp from "sharp";

const page = process.argv[2] || "about";
const vp = process.argv[3] || "1440w";

const baseline = await sharp(`tests/baselines/${page}-${vp}.png`).metadata();
const current = await sharp(`tests/current/${page}-${vp}.png`).metadata();

console.log(`Baseline: ${baseline.width}x${baseline.height}`);
console.log(`Current:  ${current.width}x${current.height}`);
console.log(`Delta height: ${current.height - baseline.height}`);

// Scale both down to 400px wide for display
const targetW = 400;
const bScale = targetW / baseline.width;
const cScale = targetW / current.width;
const bH = Math.round(baseline.height * bScale);
const cH = Math.round(current.height * cScale);

const maxH = Math.max(bH, cH);
const outW = targetW * 2 + 20;

// Create white canvas
const canvas = sharp({
  create: {
    width: outW,
    height: maxH + 40,
    channels: 3,
    background: { r: 40, g: 40, b: 50 },
  },
});

const baselineImg = await sharp(`tests/baselines/${page}-${vp}.png`)
  .resize({ width: targetW })
  .toBuffer();

const currentImg = await sharp(`tests/current/${page}-${vp}.png`)
  .resize({ width: targetW })
  .toBuffer();

await canvas
  .composite([
    { input: baselineImg, top: 20, left: 0 },
    { input: currentImg, top: 20, left: targetW + 20 },
  ])
  .toFile(`tests/side-by-side-${page}-${vp}.png`);

console.log(`Saved tests/side-by-side-${page}-${vp}.png`);
