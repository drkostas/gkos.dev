import { chromium } from "playwright";
const BASE = "https://portfolio-v2-one-pied.vercel.app";
const ROUTES = [
  { path: "/", title: "Home" },
  { path: "/about", title: "About" },
  { path: "/blog", title: "Blog list" },
  { path: "/blog/hello-world", title: "Blog post" },
  { path: "/blog/how-i-got-here", title: "Blog post 2" },
  { path: "/projects", title: "Projects" },
  { path: "/publications", title: "Publications" },
  { path: "/inspirations", title: "Inspirations" },
  { path: "/contact", title: "Contact" },
  { path: "/stats", title: "Stats" },
  { path: "/community-wall", title: "Community wall" },
  { path: "/changelog", title: "Changelog" },
  { path: "/workbench", title: "Workbench" },
  { path: "/explore", title: "Explore (coming soon)" },
  { path: "/anything-random-route-xyz", title: "404 fallback" },
];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const results = [];
for (const { path, title } of ROUTES) {
  const errors = [];
  const consoleErrs = [];
  page.removeAllListeners("pageerror");
  page.removeAllListeners("console");
  page.on("pageerror", (e) => errors.push("ERR: " + e.message.substring(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text().substring(0, 200)); });
  try {
    const r = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 20000 });
    const status = r ? r.status() : -1;
    await page.waitForTimeout(1500);
    const h1 = await page.evaluate(() => document.querySelector("h1")?.textContent?.substring(0, 80) ?? "(no h1)");
    results.push({ path, title, status, h1, errors: errors.length, consoleErrs: consoleErrs.length });
  } catch (err) {
    results.push({ path, title, status: -1, h1: "(load failed)", error: err.message.substring(0, 100) });
  }
}
await browser.close();
console.log("\n=== Smoke test results ===\n");
for (const r of results) {
  const flag = r.status >= 200 && r.status < 400 ? "✓" : "✗";
  console.log(`${flag} ${r.status}  ${r.path.padEnd(35)} h1:${(r.h1 || "").padEnd(40)}  err:${r.errors}/${r.consoleErrs}`);
}
const failed = results.filter((r) => r.status === -1 || r.status >= 500);
const hasErrors = results.filter((r) => (r.errors ?? 0) > 0 || (r.consoleErrs ?? 0) > 0);
console.log(`\nfailed: ${failed.length} · routes with JS errors: ${hasErrors.length}\n`);
