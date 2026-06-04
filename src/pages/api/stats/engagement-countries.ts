/**
 * Country distribution for engagement events (comments / reactions / wall).
 * Pulls from the per-table views populated by the demographics migration.
 */
import type { APIRoute } from "astro";
import {
  getCommentCountries,
  getReactionCountries,
  getWallCountries,
} from "@/lib/supabase";

export const prerender = false;

export const GET: APIRoute = async () => {
  const [comments, reactions, wall] = await Promise.all([
    getCommentCountries(),
    getReactionCountries(),
    getWallCountries(),
  ]);

  return new Response(
    JSON.stringify({ comments, reactions, wall }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
};
