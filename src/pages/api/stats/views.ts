import type { APIRoute } from "astro";
import { getPageViewTotals } from "@/lib/posthog";

export const prerender = false;

/**
 * Site-views card on /stats. Backed by PostHog Cloud (EU) since 2026-06-17.
 * Replaced the Cloudflare Web Analytics integration, whose RUM beacon was
 * mostly blocked by browser extensions so the count almost always read 0.
 */
export const GET: APIRoute = async () => {
  const totals = await getPageViewTotals(30);
  return new Response(JSON.stringify(totals), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
};
