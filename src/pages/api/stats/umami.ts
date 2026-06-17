import type { APIRoute } from "astro";
import {
  getStats,
  getTopPages,
  getTopReferrers,
  getTopCountries,
  getTopBlogPosts,
  getTopBrowsers,
  getTopDevices,
  getTopOS,
} from "@/lib/posthog";

export const prerender = false;

export const GET: APIRoute = async () => {
  const [
    stats,
    topPages,
    topReferrers,
    topCountries,
    topBlogPosts,
    topBrowsers,
    topDevices,
    topOS,
  ] = await Promise.all([
    getStats(30),
    getTopPages(30, 10),
    getTopReferrers(30, 10),
    getTopCountries(30, 10),
    getTopBlogPosts(30, 5),
    getTopBrowsers(30, 5),
    getTopDevices(30, 5),
    getTopOS(30, 5),
  ]);

  return new Response(
    JSON.stringify({
      stats,
      topPages,
      topReferrers,
      topCountries,
      topBlogPosts,
      topBrowsers,
      topDevices,
      topOS,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
};
