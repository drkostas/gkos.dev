import type { APIRoute } from "astro";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BLOG_IMAGES_DIR, assertSafeSlug, assertSafeFilename } from "@/server/adminFs";

export const prerender = false;

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
    const dir = path.join(BLOG_IMAGES_DIR, slug);
    await fs.unlink(path.join(dir, name));
    await fs.unlink(path.join(dir, `.original-${name}`)).catch(() => undefined);
    await fs.unlink(path.join(dir, `.meta-${name}.json`)).catch(() => undefined);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
