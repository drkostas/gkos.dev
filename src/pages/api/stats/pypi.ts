import type { APIRoute } from "astro";
import { getTotalPyPiDownloads } from "@/lib/pypi";
import { projects } from "@/data/projects";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const pypiUrls = projects
      .map((p) => p.pypi)
      .filter((url): url is string => Boolean(url));

    const stats = await getTotalPyPiDownloads(pypiUrls);

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    // Never crash — return zeroed stats so the NPC shows fallback dialog.
    console.warn("[api/stats/pypi] uncaught error:", error);
    return new Response(
      JSON.stringify({ totalLastMonth: 0, totalLastWeek: 0, totalLastDay: 0, packageCount: 0 }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
