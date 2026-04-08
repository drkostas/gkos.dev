// Crop calendar + changelog from an existing PNG baseline file using sharp
import sharp from "sharp";

const SRC = "tests/baselines/home-1440w.png";

const meta = await sharp(SRC).metadata();
console.log("Image size:", meta.width, "x", meta.height);

// From the live crop we know the calendar is roughly at x~607-1280, y~418-680 at 1440w (full page, not scrolled)
// But the baseline is a full-page screenshot so coordinates are the scroll position in-flow.
// Let me crop a wider region and we'll inspect visually.

// Full-page screenshots are tall, so I need to know where the "About" section is.
// Based on what we've seen: hero ~0-900, About heading ~1100, bento grid ~1150-1700

// Full calendar grid area — zoomed for clarity
await sharp(SRC)
  .extract({ left: 760, top: 1440, width: 560, height: 600 })
  .resize({ width: 1680 })
  .toFile("tests/baseline-calendar-area.png");

// Zoomed changelog
await sharp(SRC)
  .extract({ left: 90, top: 2350, width: 500, height: 400 })
  .resize({ width: 1000 })
  .toFile("tests/baseline-changelog-area.png");

console.log("Done");
