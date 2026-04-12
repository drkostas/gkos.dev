/**
 * GitHub stats live-fetcher for the Day Care Man NPC.
 *
 * Calls `/api/stats/github` (backed by src/lib/github.ts) and formats
 * the response into a dialog that says something specific and live
 * about KOSTAS's repos. Falls back to a static message when the API
 * is unreachable, returns a non-2xx status, or the response JSON
 * doesn't match the expected shape.
 *
 * Kept small + pure so it can be unit-tested with a mocked fetch.
 */

export interface GithubStats {
  followers: number;
  publicRepos: number;
  stars: number;
  forks: number;
  contributions?: number;
}

export const GITHUB_FALLBACK_LINES: string[] = [
  "Welcome to the ML MODEL DAY CARE!",
  "We train your models while you",
  "work on other projects.",
  "KOSTAS is our top trainer.",
  "You'll have to visit github.com",
  "to see his latest repos.",
];

/**
 * Fetch GitHub stats from the in-site API route. Returns `null` on
 * ANY failure (network, non-2xx, JSON parse, missing fields) so the
 * NPC's dialogFn can cleanly fall back to a static greeting.
 */
export async function fetchGithubStats(
  fetchFn: typeof fetch = fetch,
): Promise<GithubStats | null> {
  try {
    const res = await fetchFn("/api/stats/github", {
      method: "GET",
      // Short timeout so a dead API doesn't hang the NPC conversation.
      // AbortSignal.timeout is supported on every modern browser and
      // the current Node versions we target.
      signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal })
            .timeout(3500)
        : undefined,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<GithubStats>;
    if (
      typeof data.followers !== "number" ||
      typeof data.publicRepos !== "number"
    ) {
      return null;
    }
    return {
      followers: data.followers,
      publicRepos: data.publicRepos,
      stars: typeof data.stars === "number" ? data.stars : 0,
      forks: typeof data.forks === "number" ? data.forks : 0,
      contributions:
        typeof data.contributions === "number" ? data.contributions : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Build the Day Care Man's dialog lines from a fetched stats object.
 * Each line is ≤ 36 characters so the dialog box word-wrap doesn't
 * break weirdly on portrait phones.
 */
export function formatGithubDialog(stats: GithubStats): string[] {
  const lines: string[] = [
    "Welcome to the ML MODEL DAY CARE!",
    "We train your models while you",
    "work on other projects.",
  ];
  lines.push(`KOSTAS has ${stats.followers} GitHub`);
  lines.push(`followers — a trusted name.`);
  if (stats.stars > 0) {
    lines.push(`${stats.stars} stars across`);
    lines.push(`${stats.publicRepos} public repos.`);
  } else {
    lines.push(`Check out his ${stats.publicRepos} repos!`);
  }
  if (stats.contributions && stats.contributions > 0) {
    lines.push(`${stats.contributions} contributions this year.`);
  }
  return lines;
}

/**
 * One-shot helper combining fetch + format. Returns the fallback
 * lines if the fetch fails or returns malformed data.
 */
export async function getGithubDialog(
  fetchFn: typeof fetch = fetch,
): Promise<string[]> {
  const stats = await fetchGithubStats(fetchFn);
  if (!stats) return GITHUB_FALLBACK_LINES;
  return formatGithubDialog(stats);
}
