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

  // Coffee cups: total commits divided by 4.
  // Anchor ratio: a heavy coffee day (~3-4 cups) tends to land around 12-16
  // commits, so 1 cup ≈ 4 commits. This scales linearly with effort instead
  // of being clipped by the GitHub contribution level cap at 4.
  const coffeeCups = Math.round((contributions?.totalContributions ?? 0) / 4);

  return new Response(
    JSON.stringify({
      stars: repoStats.totalStars,
      forks: repoStats.totalForks,
      followers: userStats?.followers ?? 0,
      publicRepos: userStats?.publicRepos ?? 0,
      contributions: contributions?.totalContributions ?? 0,
      weeks: contributions?.weeks.map((w) => w.map((d) => d.level)) ?? [],
      coffeeCups,
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
