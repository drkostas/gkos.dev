// Show current and baseline side-by-side for calendar and changelog regions
import sharp from "sharp";

const regions = [
  { name: "calendar", left: 760, top: 1440, width: 560, height: 400 },
  { name: "changelog", left: 90, top: 2350, width: 500, height: 400 },
];

for (const r of regions) {
  await sharp("tests/baselines/home-1440w.png")
    .extract({ left: r.left, top: r.top, width: r.width, height: r.height })
    .resize({ width: 1120 })
    .toFile(`tests/diff-${r.name}-baseline.png`);
  await sharp("tests/current/home-1440w.png")
    .extract({ left: r.left, top: r.top, width: r.width, height: r.height })
    .resize({ width: 1120 })
    .toFile(`tests/diff-${r.name}-current.png`);
}
console.log("Done");
