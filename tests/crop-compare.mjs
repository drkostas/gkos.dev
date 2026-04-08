// Crop specific regions from baseline + current and stack them side by side
import sharp from "sharp";

const page = process.argv[2] || "about";
const vp = process.argv[3] || "1440w";
const top = parseInt(process.argv[4] || "0", 10);
const height = parseInt(process.argv[5] || "600", 10);
const name = process.argv[6] || `crop`;

const baseline = await sharp(`tests/baselines/${page}-${vp}.png`).metadata();
const current = await sharp(`tests/current/${page}-${vp}.png`).metadata();

const bl = await sharp(`tests/baselines/${page}-${vp}.png`)
  .extract({ left: 0, top, width: baseline.width, height: Math.min(height, baseline.height - top) })
  .toBuffer();

const cu = await sharp(`tests/current/${page}-${vp}.png`)
  .extract({ left: 0, top, width: current.width, height: Math.min(height, current.height - top) })
  .toBuffer();

const outW = baseline.width * 2 + 40;
const outH = height + 40;

await sharp({
  create: { width: outW, height: outH, channels: 3, background: { r: 30, g: 30, b: 40 } },
})
  .composite([
    { input: bl, top: 20, left: 0 },
    { input: cu, top: 20, left: baseline.width + 40 },
  ])
  .png()
  .toFile(`tests/compare-${page}-${name}.png`);

console.log(`Saved tests/compare-${page}-${name}.png`);
