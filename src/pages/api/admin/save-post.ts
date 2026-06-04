import type { APIRoute } from "astro";
import { writePostFile, slugify, assertSafeSlug } from "@/server/adminFs";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return new Response("Not Found", { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400 });
  }

  const { slug: providedSlug, frontmatter, content, isNew } = body as {
    slug?: string;
    frontmatter?: Record<string, unknown>;
    content?: string;
    isNew?: boolean;
  };

  if (!frontmatter || typeof frontmatter !== "object") {
    return new Response(JSON.stringify({ ok: false, error: "Missing frontmatter" }), { status: 400 });
  }
  if (typeof content !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "Missing content" }), { status: 400 });
  }
  if (typeof frontmatter.title !== "string" || !frontmatter.title.trim()) {
    return new Response(JSON.stringify({ ok: false, error: "Title is required" }), { status: 400 });
  }

  // Derive the slug for new posts from the title; keep it for existing posts.
  let slug = providedSlug || slugify(frontmatter.title as string);
  try {
    assertSafeSlug(slug);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 400 });
  }

  // Fill in defaults for required fields so partial saves don't blow up Zod.
  const data: Record<string, unknown> = {
    title: frontmatter.title,
    publishedAt: frontmatter.publishedAt || new Date().toISOString().replace(/\.\d{3}Z$/, ""),
    summary: frontmatter.summary || "",
    imageName: frontmatter.imageName || undefined,
    categories: Array.isArray(frontmatter.categories) ? frontmatter.categories : [],
    draft: frontmatter.draft ?? false,
  };

  try {
    await writePostFile(slug, data, content);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, slug, isNew: Boolean(isNew) }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
