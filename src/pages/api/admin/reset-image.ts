import type { APIRoute } from "astro";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BLOG_IMAGES_DIR, assertSafeSlug, assertSafeFilename } from "@/server/adminFs";

export const prerender = false;

/**
 * Restore an edited image from its `.original-<name>` sidecar and delete
 * the sidecar. After reset, next crop starts from the current file again.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return new Response("Not Found", { status: 404 });

  const body = await request.json().catch(() => null);
  const { slug, name } = body || {};
  if (typeof slug !== "string" || typeof name !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "Missing slug or name" }), { status: 400 });
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

  try {
    await fs.access(originalFile);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "No original sidecar to restore from" }), { status: 404 });
  }

  const metaFile = path.join(dir, `.meta-${name}.json`);

  try {
    await fs.copyFile(originalFile, file);
    await fs.unlink(originalFile);
    await fs.unlink(metaFile).catch(() => undefined);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
};
