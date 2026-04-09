import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "fs";

const original = readFileSync("src/styles/global.css", "utf8");

// B-family variations — all cool/slate-based but different intensities and label colors
const palettes = [
  { name: "B1", title: "Slate Deep + Sky Blue (original B)",
    bg: "15 23 42", border: "30 41 59", surface: "30 41 59", surfaceSec: "51 65 85",
    textPri: "226 232 240", textSec: "148 163 184", textTer: "100 116 139", label: "#38bdf8" },
  
  { name: "B2", title: "Slate Medium + Cyan",
    bg: "20 27 45", border: "38 48 65", surface: "30 38 58", surfaceSec: "45 55 75",
    textPri: "230 235 242", textSec: "150 165 185", textTer: "105 118 140", label: "#22d3ee" },
  
  { name: "B3", title: "Slate Lighter + Violet",
    bg: "22 30 48", border: "40 50 68", surface: "32 42 62", surfaceSec: "48 58 78",
    textPri: "228 233 240", textSec: "152 166 186", textTer: "108 120 142", label: "#a78bfa" },
  
  { name: "B4", title: "Slate Deep + Emerald",
    bg: "15 23 42", border: "30 41 59", surface: "30 41 59", surfaceSec: "51 65 85",
    textPri: "226 232 240", textSec: "148 163 184", textTer: "100 116 139", label: "#34d399" },
  
  { name: "B5", title: "Slate Warm + Rose",
    bg: "18 25 40", border: "35 45 62", surface: "28 38 55", surfaceSec: "48 58 78",
    textPri: "230 234 240", textSec: "155 165 180", textTer: "110 120 138", label: "#fb7185" },
  
  { name: "B6", title: "Slate Deepest + Amber",
    bg: "10 18 35", border: "25 35 52", surface: "22 32 50", surfaceSec: "40 50 70",
    textPri: "222 228 238", textSec: "140 155 175", textTer: "95 108 130", label: "#fbbf24" },
];

function applyPalette(pal) {
  let css = original;
  const darkStart = css.indexOf(".dark {");
  const darkEnd = css.indexOf("}", darkStart);
  let darkBlock = css.substring(darkStart, darkEnd + 1);
  
  darkBlock = darkBlock.replace(/--color-bg-primary: [\d ]+;/, `--color-bg-primary: ${pal.bg};`);
  darkBlock = darkBlock.replace(/--color-border-primary: [\d ]+;/, `--color-border-primary: ${pal.border};`);
  darkBlock = darkBlock.replace(/--color-surface: [\d ]+;/, `--color-surface: ${pal.surface};`);
  darkBlock = darkBlock.replace(/--color-surface-secondary: [\d ]+;/, `--color-surface-secondary: ${pal.surfaceSec};`);
  darkBlock = darkBlock.replace(/--color-text-primary: [\d ]+;/, `--color-text-primary: ${pal.textPri};`);
  darkBlock = darkBlock.replace(/--color-text-secondary: [\d ]+;/, `--color-text-secondary: ${pal.textSec};`);
  darkBlock = darkBlock.replace(/--color-text-tertiary: [\d ]+;/, `--color-text-tertiary: ${pal.textTer};`);
  
  css = css.replace(css.substring(darkStart, darkEnd + 1), darkBlock);
  css += `\n.dark .text-purple-primary { color: ${pal.label} !important; }\n`;
  writeFileSync("src/styles/global.css", css);
}

const browser = await chromium.launch();

for (const pal of palettes) {
  console.log(`${pal.name}: ${pal.title}...`);
  applyPalette(pal);
  await new Promise(r => setTimeout(r, 3000));
  
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem("theme", "dark"); });
  const page = await ctx.newPage();
  await page.goto("http://localhost:4321/", { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `tests/audit/palettes/live-${pal.name}-full.png`, fullPage: true });
  
  const bgColor = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-bg-primary").trim());
  console.log(`  bg = "${bgColor}"`);
  await ctx.close();
}

writeFileSync("src/styles/global.css", original);
console.log("Original restored. Screenshots in tests/audit/palettes/live-B*-full.png");
await browser.close();
