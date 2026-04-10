import type { APIRoute } from "astro";
import { getCurrentOrRecentTrack } from "@/lib/spotify";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const track = await getCurrentOrRecentTrack();

    // Cache for 30 seconds at the edge so we don't hit Spotify on every poll
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
    };

    if (!track) {
      return new Response(JSON.stringify({ track: null }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ track }), { status: 200, headers });
  } catch (error) {
    console.error("[api/spotify/now-playing] error:", error);
    return new Response(JSON.stringify({ track: null, error: "internal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
