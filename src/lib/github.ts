/**
 * GitHub API helpers. Used at build time to fetch live repo and user stats.
 *
 * Rate limits:
 *   - Unauthenticated: 60 requests/hour per IP
 *   - Authenticated (PAT in GITHUB_TOKEN env var): 5000 requests/hour
 *
 * A repo build touches ~20-30 URLs, so unauthenticated works for most cases.
 * Set GITHUB_TOKEN in .env for headroom (read-only, public scope is enough).
 *
 * All fetches are wrapped in try/catch and return null on failure so build
 * never breaks if the API is down or rate-limited.
 */

export interface RepoStats {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  lastPushedAt: string | null;
  language: string | null;
}

export interface UserStats {
  followers: number;
  publicRepos: number;
  publicGists: number;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

const GITHUB_API_BASE = "https://api.github.com";
// Optional env var — works without it, just lower rate limit.
const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;

// Module-scoped cache so the dev server doesn't re-fetch on every page refresh.
// In build mode the whole process is short-lived, so this effectively dedupes
// calls across pages within a single build.
type CacheEntry<T> = { value: T; expires: number };
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes — long enough for a dev session

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T): void {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

async function fetchGitHub<T = any>(path: string): Promise<T | null> {
  const cacheKey = `gh:${path}`;
  const cached = getCached<T>(cacheKey);
  if (cached !== undefined) return cached;

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE}${path}`, { headers });
    if (!response.ok) {
      // Cache the failure briefly too, so we don't hammer the API on repeated misses
      console.warn(`[github] ${path} → ${response.status}`);
      setCached(cacheKey, null);
      return null;
    }
    const data = (await response.json()) as T;
    setCached(cacheKey, data);
    return data;
  } catch (error) {
    console.warn(`[github] ${path} failed:`, error);
    setCached(cacheKey, null);
    return null;
  }
}

/**
 * Parse {owner, repo} from a GitHub URL.
 * Handles variations: https://github.com/owner/repo, https://github.com/owner/repo.git,
 * https://github.com/owner/repo/tree/main, etc.
 */
export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

/**
 * Fetch public stats for a single repo by URL.
 */
export async function getRepoStats(url: string): Promise<RepoStats | null> {
  const parsed = parseGitHubRepo(url);
  if (!parsed) return null;

  const data = await fetchGitHub<Record<string, any>>(`/repos/${parsed.owner}/${parsed.repo}`);
  if (!data) return null;

  return {
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    watchers: data.subscribers_count ?? 0,
    openIssues: data.open_issues_count ?? 0,
    lastPushedAt: data.pushed_at ?? null,
    language: data.language ?? null,
  };
}

/**
 * Fetch public user stats.
 */
export async function getUserStats(username: string): Promise<UserStats | null> {
  const data = await fetchGitHub<Record<string, any>>(`/users/${username}`);
  if (!data) return null;

  return {
    followers: data.followers ?? 0,
    publicRepos: data.public_repos ?? 0,
    publicGists: data.public_gists ?? 0,
    name: data.name ?? null,
    bio: data.bio ?? null,
    avatarUrl: data.avatar_url ?? null,
  };
}

/**
 * Fetch stats for an array of repo URLs in parallel.
 * Returns a map from URL to stats (null for failed/invalid URLs).
 */
export async function getManyRepoStats(
  urls: string[],
): Promise<Map<string, RepoStats | null>> {
  const entries = await Promise.all(
    urls.map(async (url) => [url, await getRepoStats(url)] as const),
  );
  return new Map(entries);
}

/**
 * Sum stars and forks across a set of repos.
 * Handy for computing totals shown on the Stats page.
 */
export async function getTotalRepoStats(
  urls: string[],
): Promise<{ totalStars: number; totalForks: number; repoCount: number }> {
  const stats = await getManyRepoStats(urls);
  let totalStars = 0;
  let totalForks = 0;
  let repoCount = 0;
  for (const [, repoStats] of stats) {
    if (repoStats) {
      totalStars += repoStats.stars;
      totalForks += repoStats.forks;
      repoCount++;
    }
  }
  return { totalStars, totalForks, repoCount };
}

// ----------------------------------------------------------------------------
// Contribution graph (GraphQL — needs auth)
// ----------------------------------------------------------------------------

export interface ContributionDay {
  date: string; // YYYY-MM-DD
  count: number;
  /** Level 0-4 mapped from contributionCount, matching GitHub's bins */
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionCalendar {
  weeks: ContributionDay[][];
  totalContributions: number;
}

/**
 * Map a raw contribution count to GitHub's 0-4 intensity scale.
 * GitHub doesn't expose the exact thresholds — these mirror what their UI uses
 * for an "active developer" calendar (bins shift slightly per user but this
 * approximation is close enough for a viz).
 */
function bucketLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}

/**
 * Fetch the user's contribution calendar via GitHub's GraphQL API.
 *
 * This requires GITHUB_TOKEN (a fine-grained or classic PAT — public scope is
 * enough; private contributions need the `read:user` scope to also be visible).
 *
 * Returns null if no token, network error, or rate limit. Caller should fall
 * back to a placeholder graph in that case.
 */
export async function getUserContributions(
  username: string,
): Promise<ContributionCalendar | null> {
  if (!GITHUB_TOKEN) {
    console.warn("[github] no GITHUB_TOKEN — skipping contribution graph");
    return null;
  }

  const cacheKey = `gh:contributions:${username}`;
  const cached = getCached<ContributionCalendar>(cacheKey);
  if (cached !== undefined) return cached;

  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { username } }),
    });

    if (!response.ok) {
      console.warn(`[github] graphql contributions ${response.status}`);
      setCached(cacheKey, null);
      return null;
    }

    const json = (await response.json()) as any;
    const calendar =
      json?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) {
      console.warn("[github] empty contribution calendar in response");
      setCached(cacheKey, null);
      return null;
    }

    const weeks: ContributionDay[][] = calendar.weeks.map((w: any) =>
      w.contributionDays.map((d: any) => ({
        date: d.date,
        count: d.contributionCount,
        level: bucketLevel(d.contributionCount),
      })),
    );

    const result: ContributionCalendar = {
      weeks,
      totalContributions: calendar.totalContributions,
    };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[github] graphql contributions failed:", error);
    setCached(cacheKey, null);
    return null;
  }
}
