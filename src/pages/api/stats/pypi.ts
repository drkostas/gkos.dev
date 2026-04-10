import type { APIRoute } from "astro";
import { getTotalPyPiDownloads } from "@/lib/pypi";
import { projects } from "@/data/projects";

export const prerender = false;

export const GET: APIRoute = async () => {
  const pypiUrls = projects
    .map((p) => p.pypi)
    .filter((url): url is string => Boolean(url));

  const stats = await getTotalPyPiDownloads(pypiUrls);

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Short edge cache (5 min) but very long stale-while-revalidate (24h).
      // This means visitors always get an instant response (possibly stale),
      // while Vercel refetches in the background. Each refetch accumulates
      // more successfully fetched packages in the module-scoped cache.
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  });
};
