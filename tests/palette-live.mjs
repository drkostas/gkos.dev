import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "fs";

const original = readFileSync("src/styles/global.css", "utf8");

const palettes = [
  { name: "A", title: "Warm Neutral + Emerald", bg: "26 26 26", border: "52 52 52", surface: "36 36 36", surfaceSec: "44 44 44", textPri: "232 232 232", textSec: "158 158 158", textTer: "108 108 108", label: "#10b981" },
  { name: "B", title: "Cool Slate + Sky Blue", bg: "15 23 42", border: "30 41 59", surface: "30 41 59", surfaceSec: "51 65 85", textPri: "226 232 240", textSec: "148 163 184", textTer: "100 116 139", label: "#38bdf8" },
  { name: "C", title: "Warm Stone + Amber Gold", bg: "28 25 23", border: "55 50 46", surface: "41 37 36", surfaceSec: "50 46 44", textPri: "231 229 228", textSec: "168 162 158", textTer: "120 113 108", label: "#fbbf24" },
  { name: "D", title: "True Neutral + Teal", bg: "23 23 23", border: "48 48 48", surface: "34 34 34", surfaceSec: "42 42 42", textPri: "229 229 229", textSec: "163 163 163", textTer: "115 115 115", label: "#2dd4bf" },
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
  // Add label color override at end
  css += `\n.dark .text-purple-primary { color: ${pal.label} !important; }\n`;
  
  writeFileSync("src/styles/global.css", css);
}

const browser = await chromium.launch();

for (const pal of palettes) {
  console.log(`Applying palette ${pal.name}: ${pal.title}...`);
  applyPalette(pal);
  
  // Wait for Vite HMR to pick up the change
  await new Promise(r => setTimeout(r, 3000));
  
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem("theme", "dark"); });
  const page = await ctx.newPage();
  await page.goto("http://localhost:4321/", { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `tests/audit/palettes/live-${pal.name}-full.png`, fullPage: true });
  
  // Verify the bg color
  const bgColor = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue("--color-bg-primary").trim();
  });
  console.log(`  ${pal.name}: bg var = "${bgColor}"`);
  
  await ctx.close();
}

// Restore original
writeFileSync("src/styles/global.css", original);
console.log("Original CSS restored.");

await browser.close();
console.log("Done — screenshots in tests/audit/palettes/live-*-full.png");
