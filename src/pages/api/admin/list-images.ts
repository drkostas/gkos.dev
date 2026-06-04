import type { APIRoute } from "astro";
import { listImages } from "@/server/adminFs";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  if (!import.meta.env.DEV) return new Response("Not Found", { status: 404 });
  const slug = url.searchParams.get("slug") || undefined;
  try {
    const images = await listImages(slug);
    return new Response(JSON.stringify({ ok: true, images }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
};
