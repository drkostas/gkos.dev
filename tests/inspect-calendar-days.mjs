// Inspect baseline pixels to determine which calendar days are highlighted.
// Highlighted days have a white background; non-highlighted are on the grey card.
import sharp from "sharp";

const SRC = "tests/baselines/home-1440w.png";

// From our earlier crops: calendar grid starts around x=850, y=1540 in the baseline.
// Day cells are ~32px apart horizontally, ~40px vertically.
// Grid: 7 cols × ~5 rows (days 1-30).
// We check a pixel at the center of each day cell. A highlighted cell is ~250,250,250;
// the card background is ~230,231,234.

const GRID_START_X = 866;
const GRID_START_Y = 1580;
const CELL_W = 60;
const CELL_H = 48;

const { data, info } = await sharp(SRC)
  .raw()
  .toBuffer({ resolveWithObject: true });

function pixel(x, y) {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
}

const currentDate = new Date("2026-04-08T12:00:00Z");
const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

const highlightedDays = [];
for (let d = 1; d <= daysInMonth; d++) {
  const pos = firstDayOfWeek + (d - 1);
  const col = pos % 7;
  const row = Math.floor(pos / 7);
  const x = GRID_START_X + col * CELL_W;
  const y = GRID_START_Y + row * CELL_H;
  const [r, g, b] = pixel(x, y);
  const isWhite = r > 240 && g > 240 && b > 240;
  console.log(`Day ${d}: (${x},${y}) rgb(${r},${g},${b}) ${isWhite ? "HIGHLIGHTED" : ""}`);
  if (isWhite) highlightedDays.push(d);
}

console.log("\nHighlighted days:", highlightedDays);
