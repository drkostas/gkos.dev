import type { APIRoute } from "astro";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureImageDir, assertSafeFilename, slugify } from "@/server/adminFs";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return new Response("Not Found", { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  const slug = form.get("slug");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ ok: false, error: "Missing file" }), { status: 400 });
  }
  if (typeof slug !== "string" || !slug) {
    return new Response(JSON.stringify({ ok: false, error: "Missing slug" }), { status: 400 });
  }
  try {
    const dir = await ensureImageDir(slug);
    const ext = path.extname(file.name).toLowerCase() || ".png";
    const base = slugify(path.basename(file.name, ext)) || "image";
    let name = `${base}${ext}`;
    assertSafeFilename(name);
    // Avoid overwriting existing files — append -2, -3, etc.
    let counter = 2;
    while (await exists(path.join(dir, name))) {
      name = `${base}-${counter}${ext}`;
      counter++;
    }
    const dest = path.join(dir, name);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(dest, buf);
    return new Response(JSON.stringify({ ok: true, path: `/blog/${slug}/${name}`, slug, name }), {
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
