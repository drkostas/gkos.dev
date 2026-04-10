import type { APIRoute } from "astro";
import { getRecentActivities, getAthlete, getAthleteStats } from "@/lib/strava";

export const prerender = false;

// Sport types we want to surface on the site. Anything else (WeightTraining,
// Yoga, Workout, etc.) is filtered out — the widget is meant to showcase the
// "outdoor adventure" side, not the gym work.
const ALLOWED_SPORT_TYPES = new Set([
  "Run",
  "TrailRun",
  "VirtualRun",
  "Snowboard",
  "Kitesurf",
]);

export const GET: APIRoute = async () => {
  try {
    // Pull a wider window so we can skip non-allowed activities and still find
    // a recent one. 30 activities ≈ a few weeks of training for an active user.
    const [activities, athlete] = await Promise.all([
      getRecentActivities(30),
      getAthlete(),
    ]);

    const activity =
      activities.find((a) => ALLOWED_SPORT_TYPES.has(a.type)) ?? null;

    const stats = athlete ? await getAthleteStats(athlete.id) : null;

    const headers = {
      "Content-Type": "application/json",
      // Cache for 5 minutes — activities don't change that often
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    };

    return new Response(
      JSON.stringify({
        activity,
        stats,
      }),
      { status: 200, headers },
    );
  } catch (error) {
    console.error("[api/strava/recent] error:", error);
    return new Response(JSON.stringify({ activity: null, stats: null, error: "internal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
