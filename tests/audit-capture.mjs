import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

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

const SITES = [
  { label: "braydon", port: 3000 },
  { label: "ours", port: 4321 },
];

for (const site of SITES) {
  const browser = await chromium.launch();
  for (const page of PAGES) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await ctx.addInitScript(`Math.random = () => 0;`);
    const tab = await ctx.newPage();
    const url = `http://localhost:${site.port}${page.path}`;
    try {
      await tab.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      await tab.waitForTimeout(3500);
      const file = `tests/audit/${site.label}-${page.name}-1440w.png`;
      await tab.screenshot({ path: file, fullPage: true });
      console.log(`${site.label} ${page.name}: OK`);
    } catch (e) {
      console.log(`${site.label} ${page.name}: SKIP (${e.message.slice(0, 60)})`);
    }
    await ctx.close();
  }
  await browser.close();
}

console.log("Done");
