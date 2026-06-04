import { test, expect } from "@playwright/test";

const ADMIN = "http://localhost:4321/admin/blog/how-i-got-here";
const PUBLISHED = "http://localhost:4321/blog/how-i-got-here";

async function measure(page: any, selector: string) {
  return await page.evaluate((sel: string) => {
    const row = document.querySelector(sel);
    if (!row) return null;
    (row as HTMLElement).scrollIntoView({ block: "center" });
    const imgs = Array.from(row.querySelectorAll("img"));
    const rowR = row.getBoundingClientRect();
    const colW = parseFloat(getComputedStyle(row as HTMLElement).gridTemplateColumns.split(/\s+/)[0]);
    const backdrop = imgs.find((i: any) => (i.getAttribute("src") || "").includes("backdrop")) as HTMLImageElement | undefined;
    const chalkboard = imgs.find((i: any) => (i.getAttribute("src") || "").includes("chalkboard")) as HTMLImageElement | undefined;
    const bR = backdrop?.getBoundingClientRect();
    const cR = chalkboard?.getBoundingClientRect();
    return {
      rowW: Math.round(rowR.width),
      colW: Math.round(colW),
      backdrop: bR ? { w: Math.round(bR.width), centerX: Math.round(bR.left + bR.width / 2) } : null,
      chalkboard: cR ? { w: Math.round(cR.width), centerX: Math.round(cR.left + cR.width / 2) } : null,
      // For each image, the cell center x (used to assert "centered in cell")
      backdropCellCenter: Math.round(rowR.left + colW / 2),
      chalkboardCellCenter: Math.round(rowR.left + colW + 16 + colW / 2),
    };
  }, selector);
}

for (const [label, width] of [
  ["1440", 1440],
  ["720", 720],
] as const) {
  test(`img-row parity at ${label}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: Number(width), height: 900 } });
    const page = await context.newPage();

    await page.goto(ADMIN);
    await page.waitForSelector(".mdxeditor .img-row img");
    const admin = await measure(page, ".mdxeditor .img-row");

    await page.goto(PUBLISHED);
    await page.waitForSelector(".img-row img");
    const pub = await measure(page, ".img-row");

    console.log(`[${label}] admin:`, admin);
    console.log(`[${label}] published:`, pub);

    // Column widths must match
    expect(admin!.colW).toBe(pub!.colW);
    // Image widths must match (they come from the stamped width attribute)
    expect(admin!.backdrop!.w).toBe(pub!.backdrop!.w);
    expect(admin!.chalkboard!.w).toBe(pub!.chalkboard!.w);
    // Each image should be centered in its cell (within 2px)
    expect(Math.abs(admin!.backdrop!.centerX - admin!.backdropCellCenter)).toBeLessThanOrEqual(2);
    expect(Math.abs(admin!.chalkboard!.centerX - admin!.chalkboardCellCenter)).toBeLessThanOrEqual(2);
    expect(Math.abs(pub!.backdrop!.centerX - pub!.backdropCellCenter)).toBeLessThanOrEqual(2);
    expect(Math.abs(pub!.chalkboard!.centerX - pub!.chalkboardCellCenter)).toBeLessThanOrEqual(2);

    await context.close();
  });
}
