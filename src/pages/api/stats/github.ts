import type { APIRoute } from "astro";
import { getUserStats, getTotalRepoStats, getUserContributions } from "@/lib/github";
import { projects } from "@/data/projects";

export const prerender = false;

export const GET: APIRoute = async () => {
  const projectRepoUrls = projects
    .map((p) => p.source_code)
    .filter((url): url is string => Boolean(url));

  const [repoStats, userStats, contributions] = await Promise.all([
    getTotalRepoStats(projectRepoUrls),
    getUserStats("drkostas"),
    getUserContributions("drkostas"),
  ]);

  return new Response(
    JSON.stringify({
      stars: repoStats.totalStars,
      forks: repoStats.totalForks,
      followers: userStats?.followers ?? 0,
      publicRepos: userStats?.publicRepos ?? 0,
      contributions: contributions?.totalContributions ?? 0,
      weeks: contributions?.weeks ?? [],
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600",
      },
    },
  );
};
