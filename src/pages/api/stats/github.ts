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

  // Coffee cups: each day's contribution level (0-4) = coffees that day.
  // Level 0 (no commits) = 0 cups, level 4 (heavy day) = 4 cups.
  // This gives a realistic ~1-2 cups/day average for an active developer.
  let coffeeCups = 0;
  if (contributions) {
    coffeeCups = contributions.weeks
      .flat()
      .reduce((sum, day) => sum + day.level, 0);
  }

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
