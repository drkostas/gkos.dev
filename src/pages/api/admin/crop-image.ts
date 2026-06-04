import type { APIRoute } from "astro";
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BLOG_IMAGES_DIR, assertSafeSlug, assertSafeFilename } from "@/server/adminFs";

export const prerender = false;

/**
 * Crop + optional resize of an existing image, preserving the untouched
 * original in `.original-<name>` and recording the crop params in
 * `.meta-<name>.json` so the Edit modal can re-open with the previous
 * crop region pre-selected.
 *
 * Request body:
 *   { slug, name,
 *     crop?: { x, y, width, height } in PIXELS of ORIGINAL image,
 *     resize?: { width?, height? } }
 */
export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return new Response("Not Found", { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400 });

  const { slug, name, crop, resize } = body as {
    slug?: string;
    name?: string;
    crop?: { x: number; y: number; width: number; height: number };
    resize?: { width?: number; height?: number };
  };

  if (typeof slug !== "string" || typeof name !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "Missing slug or name" }), { status: 400 });
  }
  if (crop && [crop.x, crop.y, crop.width, crop.height].some((n) => typeof n !== "number" || n < 0)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid crop" }), { status: 400 });
  }
  if (!crop && !resize) {
    return new Response(JSON.stringify({ ok: false, error: "Provide crop, resize, or both" }), { status: 400 });
  }

  try {
    assertSafeSlug(slug);
    assertSafeFilename(name);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 400 });
  }

  const dir = path.join(BLOG_IMAGES_DIR, slug);
  const file = path.join(dir, name);
  const originalFile = path.join(dir, `.original-${name}`);
  const metaFile = path.join(dir, `.meta-${name}.json`);

  try {
    if (!(await exists(originalFile))) {
      await fs.copyFile(file, originalFile);
    }

    const src = await fs.readFile(originalFile);
    // Read raw metadata (width/height are STORAGE dimensions — .metadata()
    // bypasses pipeline operations, so the `.rotate()` we call in the
    // pipeline below doesn't change what's reported here).
    const rawMeta = await sharp(src).metadata();
    // EXIF orientations 5,6,7,8 physically rotate 90° or 270° so width and
    // height swap when displayed. The browser already swaps them when it
    // reports naturalWidth/Height, so we do the same so our coord space
    // matches what the user drew their crop in.
    const needsSwap = (rawMeta.orientation ?? 1) >= 5 && (rawMeta.orientation ?? 1) <= 8;
    const naturalSize = {
      width: needsSwap ? (rawMeta.height || 0) : (rawMeta.width || 0),
      height: needsSwap ? (rawMeta.width || 0) : (rawMeta.height || 0),
    };

    // `.rotate()` (no args) applies the EXIF orientation to pixel data and
    // strips the tag. Subsequent operations now work in the "displayed"
    // orientation the browser was showing.
    let pipeline = sharp(src).rotate();
    if (crop) {
      // Clamp so the crop rectangle always falls entirely inside the image
      // pixel grid. sharp throws "extract_area: bad extract area" otherwise.
      const nw = naturalSize.width || 1;
      const nh = naturalSize.height || 1;
      const left = Math.max(0, Math.min(Math.round(crop.x), nw - 1));
      const top = Math.max(0, Math.min(Math.round(crop.y), nh - 1));
      const width = Math.max(1, Math.min(Math.round(crop.width), nw - left));
      const height = Math.max(1, Math.min(Math.round(crop.height), nh - top));
      pipeline = pipeline.extract({ left, top, width, height });
    }
    if (resize && (resize.width || resize.height)) {
      pipeline = pipeline.resize({
        width: resize.width ? Math.round(resize.width) : undefined,
        height: resize.height ? Math.round(resize.height) : undefined,
        fit: "inside",
      });
    }
    const out = await pipeline.toBuffer();
    await fs.writeFile(file, out);

    // Persist editing state so re-opening the modal restores exactly what
    // was saved (original image + same crop region + same resize width).
    await fs.writeFile(
      metaFile,
      JSON.stringify({ crop: crop || null, resize: resize || null, naturalSize }, null, 2),
    );

    return new Response(JSON.stringify({ ok: true, path: `/blog/${slug}/${name}`, hasOriginal: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
};

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
