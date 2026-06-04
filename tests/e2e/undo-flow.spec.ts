import { test, expect, Page } from "@playwright/test";

/**
 * Full undo/redo coverage for the editor. Runs against the dev server
 * (Astro on :4321). Each step asserts via scene-state inspection rather
 * than pixel comparison so the tests are deterministic across runs.
 *
 * Suite deliberately hits scene methods directly (paintTile,
 * toggleCollisionAtLastTile, etc.) via `window.__EDITOR_GAME__` — the
 * same surface area the MCP audit used. This keeps the test fast and
 * independent of cursor positioning / zoom level.
 */

const BASE = "http://localhost:4321/editor";
const scene = () => `window.__EDITOR_GAME__.scene.getScene('EditorScene')`;

async function boot(page: Page) {
  await page.goto(BASE);
  // Scene ready + Phaser hooks exposed.
  await page.waitForFunction(() => (window as any).__EDITOR_GAME__?.scene?.getScene("EditorScene")?.tilemap);
  await page.mouse.click(900, 500); // focus canvas so keyboard shortcuts route here
  await page.waitForTimeout(300);
}

async function tileGid(page: Page, x: number, y: number): Promise<number> {
  return await page.evaluate(
    ({ x, y }) => {
      const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
      return s.tilemap.getTileAt(x, y, false, "Ground")?.index ?? 0;
    },
    { x, y },
  );
}

async function undoStackLen(page: Page): Promise<number> {
  // Reducer state isn't directly exposed — read via the status-bar
  // breadcrumb's presence as a heuristic: if undoStack is non-empty
  // the "↶ <desc>" span is rendered. For exact length we use a window
  // mirror set up by the editor's status effect.
  return await page.evaluate(() => {
    const el = [...document.querySelectorAll("span")].find((s) => /^↶\s/.test(s.textContent?.trim() || ""));
    // Fall back to counting the history-panel rows if no breadcrumb.
    return el ? 1 : 0;
  });
}

async function lastUndoDesc(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const el = [...document.querySelectorAll("span")].find((s) => /^↶\s/.test(s.textContent?.trim() || ""));
    return el?.textContent?.trim().replace(/^↶\s/, "") ?? null;
  });
}

test.describe("Editor undo/redo — end-to-end", () => {
  test("PAINT_TILE: single ⌘+click paint undoes", async ({ page }) => {
    await boot(page);
    const before = await tileGid(page, 50, 50);
    await page.evaluate(() => {
      const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
      s.selectedTileGid = 500;
      s.paintTile(50, 50, 500);
    });
    await page.waitForTimeout(200);
    expect(await tileGid(page, 50, 50)).toBe(500);
    expect(await lastUndoDesc(page)).toContain("paint (50, 50)");
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);
    expect(await tileGid(page, 50, 50)).toBe(before);
  });

  test("PAINT_TILE_BATCH: drag-paint stroke is one undo entry", async ({ page }) => {
    await boot(page);
    const before = [60, 61, 62, 63].map(() => 0);
    for (let i = 0; i < 4; i++) before[i] = await tileGid(page, 60 + i, 60);
    await page.evaluate(() => {
      const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
      s.selectedTileGid = 777;
      s.beginPaintBatch();
      s.paintTile(60, 60, 777);
      s.paintTile(61, 60, 777);
      s.paintTile(62, 60, 777);
      s.paintTile(63, 60, 777);
      s.flushPaintBatch();
    });
    await page.waitForTimeout(200);
    for (let i = 0; i < 4; i++) expect(await tileGid(page, 60 + i, 60)).toBe(777);
    const desc = await lastUndoDesc(page);
    expect(desc).toContain("paint stroke · 4 tiles");
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);
    for (let i = 0; i < 4; i++) expect(await tileGid(page, 60 + i, 60)).toBe(before[i]);
  });

  test("TOGGLE_COLLISION: C key flip is undoable (Phase 2)", async ({ page }) => {
    await boot(page);
    // Seed lastClickedTile via scene API so the test is independent of
    // viewport-specific canvas offset. The C-key path still runs through
    // the real keyboard shortcut → event → handler chain.
    const seed = { x: 75, y: 55 };
    await page.evaluate(({ x, y }) => {
      const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
      s.lastClickedTile = { x, y };
    }, seed);
    const read = async () =>
      await page.evaluate(({ x, y }) => {
        const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
        const idx = y * s.tilemap.width + x;
        return { blocked: (s.collisionLayerData?.[idx] || 0) > 0 };
      }, seed);
    const before = await read();
    await page.keyboard.press("c");
    await page.waitForTimeout(300);
    const afterToggle = await read();
    expect(afterToggle.blocked).toBe(!before.blocked);
    expect(await lastUndoDesc(page)).toContain("collision");
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);
    const afterUndo = await read();
    expect(afterUndo.blocked).toBe(before.blocked);
  });

  test("SET_SELECTION: ⇧+arrow extends, ⌘Z collapses coalesced burst (Phase 2)", async ({ page }) => {
    await boot(page);
    // Seed the selection + lastClickedTile via the scene API so
    // ⇧+Arrow has a cursor anchor regardless of canvas offset.
    await page.evaluate(() => {
      const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
      s.setSelection([{ x: 75, y: 55 }]);
      s.lastClickedTile = { x: 75, y: 55 };
    });
    await page.waitForTimeout(200);
    // ⇧+Right ×4 within the 400ms coalesce window
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Shift+ArrowRight");
      await page.waitForTimeout(30); // well under 400ms
    }
    await page.waitForTimeout(450); // let coalesce window close
    const selSize = await page.evaluate(() => {
      return ((window as any).__EDITOR_GAME__.scene.getScene("EditorScene").tintHighlights?.size ?? 0) as number;
    });
    expect(selSize).toBeGreaterThan(1);
    // One ⌘Z should drop the whole burst (coalesced)
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      return ((window as any).__EDITOR_GAME__.scene.getScene("EditorScene").tintHighlights?.size ?? 0) as number;
    });
    expect(after).toBeLessThan(selSize);
  });

  test("Middle-path: selection entries collapse when content change lands (Phase 3)", async ({ page }) => {
    await boot(page);
    // 1. Make some selection activity
    await page.mouse.click(700, 400);
    await page.waitForTimeout(200);
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await page.waitForTimeout(200);
    // 2. Apply a content change (paint)
    await page.evaluate(() => {
      const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
      s.selectedTileGid = 321;
      s.paintTile(85, 55, 321);
    });
    await page.waitForTimeout(200);
    // 3. Breadcrumb should show the paint (selection entries collapsed)
    const desc = await lastUndoDesc(page);
    expect(desc).toContain("paint (85, 55)");
    // 4. ⌘Z should undo the paint directly, not step through selection
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);
    expect(await tileGid(page, 85, 55)).not.toBe(321);
  });

  test("PASTE_SNAPSHOT: ⌘V fully reverses on ⌘Z (Phase earlier)", async ({ page }) => {
    await boot(page);
    // Paint 2 tiles, select them, copy, paste elsewhere, then undo
    await page.evaluate(() => {
      const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
      s.selectedTileGid = 888;
      s.beginPaintBatch();
      s.paintTile(30, 30, 888);
      s.paintTile(31, 30, 888);
      s.flushPaintBatch();
    });
    await page.waitForTimeout(200);
    // Build selection + capture clipboard via the scene API
    await page.evaluate(() => {
      const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
      s.setSelection([{ x: 30, y: 30 }, { x: 31, y: 30 }]);
    });
    await page.waitForTimeout(300);
    // Fire ⌘C via keyboard so the React copy path runs
    await page.keyboard.press("Meta+c");
    await page.waitForTimeout(300);
    const hasClipboard = await page.evaluate(() => {
      return !!(window as any).__EDITOR_GAME__.scene.getScene("EditorScene").blockSelection;
    });
    expect(hasClipboard).toBe(true);
    // Paste at cursor position (40, 40). Move mouse there first.
    await page.evaluate(() => {
      const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
      // Force the active-pointer world coord
      s.input.activePointer.worldX = 40 * 16 + 8;
      s.input.activePointer.worldY = 40 * 16 + 8;
    });
    const pasteBefore = await tileGid(page, 40, 40);
    await page.keyboard.press("Meta+v");
    await page.waitForTimeout(400);
    const pasteAfter = await tileGid(page, 40, 40);
    expect(pasteAfter).toBe(888);
    // Undo should restore
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);
    expect(await tileGid(page, 40, 40)).toBe(pasteBefore);
  });

  test("describeAction renders in History panel (Phase 3)", async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      const s = (window as any).__EDITOR_GAME__.scene.getScene("EditorScene");
      s.selectedTileGid = 111;
      s.paintTile(90, 90, 111);
    });
    await page.waitForTimeout(200);
    // Open history
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("editor:show-history")));
    await page.waitForTimeout(300);
    const rows = await page.evaluate(() => {
      return [...document.querySelectorAll("div")]
        .filter((d) => /^#\d+/.test(d.textContent?.trim() || ""))
        .map((d) => d.textContent?.trim())
        .slice(0, 5);
    });
    expect(rows.some((r) => r?.includes("paint (90, 90)"))).toBe(true);
  });
});
