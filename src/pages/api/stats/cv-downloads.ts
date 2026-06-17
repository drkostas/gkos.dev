import type { APIRoute } from "astro";
import { getCvDownloadTotals } from "@/lib/supabase";

export const prerender = false;

export const GET: APIRoute = async () => {
  const totals = await getCvDownloadTotals();
  return new Response(JSON.stringify(totals), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
};
