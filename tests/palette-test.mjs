import { chromium } from "@playwright/test";
import sharp from "sharp";

const palettes = [
  {
    name: "A-warm-neutral",
    desc: "Warm neutral bg + emerald section labels",
    bg: "26 26 26",
    border: "52 52 52",
    surface: "36 36 36",
    surfaceSec: "44 44 44",
    textPri: "232 232 232",
    textSec: "158 158 158",
    textTer: "108 108 108",
    labelColor: "#10b981", // emerald-500
  },
  {
    name: "B-cool-slate",
    desc: "Cool slate bg + sky blue section labels",  
    bg: "15 23 42",
    border: "30 41 59",
    surface: "30 41 59",
    surfaceSec: "51 65 85",
    textPri: "226 232 240",
    textSec: "148 163 184",
    textTer: "100 116 139",
    labelColor: "#38bdf8", // sky-400
  },
  {
    name: "C-warm-stone",
    desc: "Warm stone bg + amber gold section labels",
    bg: "28 25 23",
    border: "55 50 46",
    surface: "41 37 36",
    surfaceSec: "50 46 44",
    textPri: "231 229 228",
    textSec: "168 162 158",
    textTer: "120 113 108",
    labelColor: "#fbbf24", // amber-400
  },
  {
    name: "D-true-neutral",
    desc: "True neutral bg + teal section labels",
    bg: "23 23 23",
    border: "48 48 48",
    surface: "34 34 34",
    surfaceSec: "42 42 42",
    textPri: "229 229 229",
    textSec: "163 163 163",
    textTer: "115 115 115",
    labelColor: "#2dd4bf", // teal-400
  },
];

const browser = await chromium.launch();

for (const pal of palettes) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(`
    localStorage.setItem('theme', 'dark');
  `);
  const page = await ctx.newPage();
  
  // Inject palette overrides before navigation
  await page.addStyleTag({ content: `
    .dark {
      --color-bg-primary: ${pal.bg} !important;
      --color-border-primary: ${pal.border} !important;
      --color-surface: ${pal.surface} !important;
      --color-surface-secondary: ${pal.surfaceSec} !important;
      --color-text-primary: ${pal.textPri} !important;
      --color-text-secondary: ${pal.textSec} !important;
      --color-text-tertiary: ${pal.textTer} !important;
    }
    .dark .text-purple-primary {
      color: ${pal.labelColor} !important;
    }
  `});
  
  await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);
  
  // Scroll to show About section with label
  await page.evaluate(() => window.scrollTo(0, 650));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tests/audit/palette-${pal.name}.png` });
  
  // Also full page
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tests/audit/palette-${pal.name}-full.png`, fullPage: true });
  
  console.log(`${pal.name}: ${pal.desc}`);
  await ctx.close();
}

await browser.close();
console.log("Done — check tests/audit/palette-*.png");
