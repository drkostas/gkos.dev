import type { APIRoute } from "astro";
import { getLatestActivity } from "@/lib/strava";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const activity = await getLatestActivity();

    // Forward the full StravaActivity shape so the widget can compute stats
    // (distance / duration / elevation / hr / kudos / type) without us having
    // to keep the API and the React schema in sync by hand.
    return new Response(
      JSON.stringify({ activity }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.warn("[api/strava/recent] uncaught error:", error);
    return new Response(JSON.stringify({ activity: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
