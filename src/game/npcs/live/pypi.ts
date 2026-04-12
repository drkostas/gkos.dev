/**
 * PyPI downloads live-fetcher for the Pokemart Clerk NPC.
 * Mirrors the failure-safe pattern in github.ts.
 */

export interface PypiStats {
  totalDownloads: number;
  packageCount: number;
}

export const PYPI_FALLBACK_LINES: string[] = [
  "Welcome to the MART!",
  "KOSTAS built our whole checkout",
  "system. Open source, seven PyPI",
  "packages handling millions",
  "of downloads every month.",
];

export async function fetchPypiStats(
  fetchFn: typeof fetch = fetch,
): Promise<PypiStats | null> {
  try {
    const res = await fetchFn("/api/stats/pypi", {
      method: "GET",
      signal:
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? (
              AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }
            ).timeout(3500)
          : undefined,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<PypiStats>;
    if (
      typeof data.totalDownloads !== "number" ||
      typeof data.packageCount !== "number"
    ) {
      return null;
    }
    return {
      totalDownloads: data.totalDownloads,
      packageCount: data.packageCount,
    };
  } catch {
    return null;
  }
}

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export function formatPypiDialog(stats: PypiStats): string[] {
  return [
    "Welcome to the MART!",
    `${formatDownloads(stats.totalDownloads)} downloads across`,
    `${stats.packageCount} PyPI packages —`,
    `all maintained by KOSTAS.`,
    "Take your time browsing",
    "the TM catalog!",
  ];
}

export async function getPypiDialog(
  fetchFn: typeof fetch = fetch,
): Promise<string[]> {
  const stats = await fetchPypiStats(fetchFn);
  if (!stats) return PYPI_FALLBACK_LINES;
  return formatPypiDialog(stats);
}
