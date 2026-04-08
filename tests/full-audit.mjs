import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";
import sharp from "sharp";

mkdirSync("tests/audit", { recursive: true });

const PAGES = [
  { name: "home", path: "/" },
  { name: "about", path: "/about" },
  { name: "blog", path: "/blog" },
  { name: "projects", path: "/projects" },
  { name: "toolbox", path: "/toolbox" },
  { name: "speaking", path: "/speaking" },
  { name: "changelog", path: "/changelog" },
  { name: "connections", path: "/connections" },
  { name: "community-wall", path: "/community-wall" },
  { name: "links", path: "/links" },
  { name: "stats", path: "/stats" },
];

const VIEWPORTS = [375, 768, 1024, 1440];
const SITES = [
  { label: "braydon", port: 3000 },
  { label: "ours", port: 4321 },
];

const browser = await chromium.launch();

for (const page of PAGES) {
  for (const width of VIEWPORTS) {
    const screenshots = {};
    for (const site of SITES) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
      });
      await ctx.addInitScript(`Math.random = () => 0;`);
      const tab = await ctx.newPage();
      try {
        await tab.goto(`http://localhost:${site.port}${page.path}`, {
          waitUntil: "networkidle",
          timeout: 15000,
        });
        await tab.waitForTimeout(3500);
        const file = `tests/audit/${site.label}-${page.name}-${width}w.png`;
        await tab.screenshot({ path: file, fullPage: true });
        screenshots[site.label] = file;
      } catch (e) {
        console.log(`SKIP ${site.label} ${page.name} ${width}w: ${e.message.slice(0, 50)}`);
      }
      await ctx.close();
    }

    // Create side-by-side if both exist
    if (screenshots.braydon && screenshots.ours) {
      try {
        const bMeta = await sharp(screenshots.braydon).metadata();
        const oMeta = await sharp(screenshots.ours).metadata();
        const maxH = Math.max(bMeta.height, oMeta.height);
        const targetW = Math.min(width, 400);
        const bImg = await sharp(screenshots.braydon).resize({ width: targetW }).extend({ bottom: Math.max(0, maxH - bMeta.height), background: { r: 40, g: 40, b: 50 } }).toBuffer();
        const oImg = await sharp(screenshots.ours).resize({ width: targetW }).extend({ bottom: Math.max(0, maxH - oMeta.height), background: { r: 40, g: 40, b: 50 } }).toBuffer();
        
        await sharp({
          create: { width: targetW * 2 + 10, height: Math.round(maxH * targetW / width) + 20, channels: 3, background: { r: 30, g: 30, b: 40 } }
        })
          .composite([
            { input: bImg, top: 10, left: 0 },
            { input: oImg, top: 10, left: targetW + 10 },
          ])
          .toFile(`tests/audit/sbs-${page.name}-${width}w.png`);
        
        const delta = oMeta.height - bMeta.height;
        const pct = ((delta / bMeta.height) * 100).toFixed(1);
        console.log(`${page.name} ${width}w: B=${bMeta.height} O=${oMeta.height} Δ=${delta > 0 ? '+' : ''}${delta} (${pct}%)`);
      } catch(e) {
        console.log(`SBS ERROR ${page.name} ${width}w: ${e.message.slice(0, 50)}`);
      }
    }
  }
}

await browser.close();
console.log("\nDone. Side-by-side images in tests/audit/sbs-*.png");
