import type { APIRoute } from "astro";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BLOG_IMAGES_DIR, assertSafeSlug, assertSafeFilename } from "@/server/adminFs";

export const prerender = false;

/**
 * Serve the untouched `.original-<name>` sidecar for editing in the Edit modal.
 * Falls back to the current file when no original has been saved yet.
 * Dotfiles in `/public/` aren't reliably served by Astro, hence this endpoint.
 */
export const GET: APIRoute = async ({ url }) => {
  if (!import.meta.env.DEV) return new Response("Not Found", { status: 404 });

  const slug = url.searchParams.get("slug") || "";
  const name = url.searchParams.get("name") || "";
  try {
    assertSafeSlug(slug);
    assertSafeFilename(name);
  } catch (err) {
    return new Response(String(err), { status: 400 });
  }

  const dir = path.join(BLOG_IMAGES_DIR, slug);
  const originalFile = path.join(dir, `.original-${name}`);
  const currentFile = path.join(dir, name);

  let buf: Buffer;
  try {
    buf = await fs.readFile(originalFile);
  } catch {
    try {
      buf = await fs.readFile(currentFile);
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  }

  const ext = path.extname(name).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" :
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".webp" ? "image/webp" :
    ext === ".gif" ? "image/gif" :
    ext === ".svg" ? "image/svg+xml" :
    ext === ".avif" ? "image/avif" :
    "application/octet-stream";

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "no-store",
    },
  });
};
