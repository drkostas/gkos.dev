import { test, expect } from "@playwright/test";

const PAGES = [
  { name: "home", path: "/" },
  { name: "about", path: "/about" },
  { name: "blog", path: "/blog" },
  { name: "projects", path: "/projects" },
  { name: "toolbox", path: "/toolbox" },
  { name: "speaking", path: "/speaking" },
  { name: "changelog", path: "/changelog" },
];

const VIEWPORTS = [
  { name: "375w", width: 375, height: 812 },
  { name: "768w", width: 768, height: 1024 },
  { name: "1024w", width: 1024, height: 768 },
  { name: "1440w", width: 1440, height: 900 },
];

for (const page of PAGES) {
  for (const vp of VIEWPORTS) {
    test(`${page.name} @ ${vp.name} matches baseline`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      const tab = await context.newPage();

      await tab.goto(page.path, { waitUntil: "networkidle", timeout: 30000 });
      await tab.waitForTimeout(1000);

      await expect(tab).toHaveScreenshot(`${page.name}-${vp.name}.png`, {
        fullPage: true,
        maxDiffPixels: 0,
      });

      await context.close();
    });
  }
}
