import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

mkdirSync("tests/audit/palettes", { recursive: true });

const palettes = [
  { name: "A", bg: "26 26 26", border: "52 52 52", surface: "36 36 36", surfaceSec: "44 44 44", textPri: "232 232 232", textSec: "158 158 158", textTer: "108 108 108", label: "#10b981", darkPri: "232 232 232" },
  { name: "B", bg: "15 23 42", border: "30 41 59", surface: "30 41 59", surfaceSec: "51 65 85", textPri: "226 232 240", textSec: "148 163 184", textTer: "100 116 139", label: "#38bdf8", darkPri: "226 232 240" },
  { name: "C", bg: "28 25 23", border: "55 50 46", surface: "41 37 36", surfaceSec: "50 46 44", textPri: "231 229 228", textSec: "168 162 158", textTer: "120 113 108", label: "#fbbf24", darkPri: "231 229 228" },
  { name: "D", bg: "23 23 23", border: "48 48 48", surface: "34 34 34", surfaceSec: "42 42 42", textPri: "229 229 229", textSec: "163 163 163", textTer: "115 115 115", label: "#2dd4bf", darkPri: "229 229 229" },
];

const browser = await chromium.launch();

for (const pal of palettes) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(`localStorage.setItem('theme', 'dark');`);
  const page = await ctx.newPage();
  
  await page.addStyleTag({ content: `
    .dark {
      --color-bg-primary: ${pal.bg} !important;
      --color-border-primary: ${pal.border} !important;
      --color-dark-primary: ${pal.darkPri} !important;
      --color-surface: ${pal.surface} !important;
      --color-surface-secondary: ${pal.surfaceSec} !important;
      --color-text-primary: ${pal.textPri} !important;
      --color-text-secondary: ${pal.textSec} !important;
      --color-text-tertiary: ${pal.textTer} !important;
    }
    .dark .text-purple-primary { color: ${pal.label} !important; }
    .dark .bg-dark-primary { background-color: rgb(${pal.surface}) !important; }
    .dark .z-30.bg-dark-primary { background-color: rgb(${pal.surfaceSec}) !important; }
  `});
  
  await page.goto("http://localhost:4321/", { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `tests/audit/palettes/${pal.name}-full.png`, fullPage: true, timeout: 15000 });
  console.log(`${pal.name}: done`);
  await ctx.close();
}

await browser.close();
console.log("Done");
