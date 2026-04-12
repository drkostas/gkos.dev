import type { APIRoute } from "astro";
import { getCurrentOrRecentTrack } from "@/lib/spotify";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const track = await getCurrentOrRecentTrack();

    return new Response(
      JSON.stringify({
        track: track
          ? {
              name: track.title,
              artist: track.artist,
              album: track.album || undefined,
              isPlaying: track.isPlaying,
              songUrl: track.songUrl || undefined,
            }
          : null,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.warn("[api/spotify/now-playing] uncaught error:", error);
    return new Response(JSON.stringify({ track: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
