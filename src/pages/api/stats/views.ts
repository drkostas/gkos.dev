import type { APIRoute } from "astro";
import { getCloudflareTotals } from "@/lib/cloudflare-analytics";

export const prerender = false;

export const GET: APIRoute = async () => {
  const totals = await getCloudflareTotals(30);

  // Edge cache for 5 minutes — Cloudflare data doesn't change minute-to-minute,
  // and we don't want to hammer their GraphQL API on every page view.
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  };

  if (!totals) {
    return new Response(
      JSON.stringify({
        pageViews: 0,
        visits: 0,
        uniqueVisitors: 0,
        windowDays: 30,
        error: "cloudflare not configured",
      }),
      { status: 200, headers },
    );
  }

  return new Response(JSON.stringify(totals), { status: 200, headers });
};
