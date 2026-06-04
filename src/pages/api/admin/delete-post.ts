import type { APIRoute } from "astro";
import { deletePostFile, assertSafeSlug } from "@/server/adminFs";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return new Response("Not Found", { status: 404 });

  const body = await request.json().catch(() => null);
  const slug = body?.slug;
  if (typeof slug !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "Missing slug" }), { status: 400 });
  }
  try {
    assertSafeSlug(slug);
    await deletePostFile(slug);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
