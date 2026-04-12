/**
 * PyPI statistics helpers. Fetches download counts from pypistats.org.
 * Free public API, no auth needed, no rate limits for small-scale use.
 *
 * Used at build time to show real download numbers for published packages.
 */

export interface PyPiStats {
  lastDay: number;
  lastWeek: number;
  lastMonth: number;
}

const PYPISTATS_BASE = "https://pypistats.org/api";

// Module-scoped cache — avoids re-fetching on every dev page render.
type CacheEntry<T> = { value: T; expires: number };
const cache = new Map<string, CacheEntry<unknown>>();
// 24 hours — PyPI stats update daily, and keeping successful results for a full
// day means they accumulate across requests even when some packages get 429'd.
// On Vercel Fluid Compute, module-scoped state persists across requests on the
// same instance, so: request 1 gets packages A,B,C → request 2 still has A,B,C
// cached and only re-fetches D,E,F,G → eventually all 7 are cached.
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

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

async function fetchPyPi<T = any>(path: string): Promise<T | null> {
  const cacheKey = `pypi:${path}`;
  const cached = getCached<T>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(`${PYPISTATS_BASE}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn(`[pypi] ${path} → ${response.status}`);
      // Don't cache 429 (rate limit) — let the next build retry
      if (response.status !== 429) {
        setCached(cacheKey, null);
      }
      return null;
    }
    const data = (await response.json()) as T;
    setCached(cacheKey, data);
    return data;
  } catch (error) {
    console.warn(`[pypi] ${path} failed:`, error);
    setCached(cacheKey, null);
    return null;
  }
}

/**
 * Extract a PyPI package slug from a pypi.org URL.
 * e.g. "https://pypi.org/project/garmin-auth/" → "garmin-auth"
 */
export function parsePyPiPackage(url: string): string | null {
  const match = url.match(/pypi\.org\/project\/([^/?#]+)/);
  if (!match) return null;
  return match[1];
}

/**
 * Fetch last-day / last-week / last-month download counts for a single package.
 * pypistats returns: { data: { last_day, last_week, last_month }, package, type }
 */
export async function getPackageStats(pkg: string): Promise<PyPiStats | null> {
  const data = await fetchPyPi<{ data: Record<string, number> }>(
    `/packages/${pkg}/recent`,
  );
  if (!data || !data.data) return null;

  return {
    lastDay: data.data.last_day ?? 0,
    lastWeek: data.data.last_week ?? 0,
    lastMonth: data.data.last_month ?? 0,
  };
}

/**
 * Fetch stats for every PyPI package referenced via URL.
 * Sequential with a 1.5s delay between requests to avoid pypistats.org
 * rate limits (which were causing all packages to return 429 when fetched
 * in parallel). Returns a Map keyed by package slug.
 */
export async function getManyPackageStats(
  urls: string[],
): Promise<Map<string, PyPiStats | null>> {
  const result = new Map<string, PyPiStats | null>();
  for (const url of urls) {
    const pkg = parsePyPiPackage(url);
    if (!pkg) {
      result.set(url, null);
      continue;
    }
    const stats = await getPackageStats(pkg);
    result.set(pkg, stats);
    // 1s delay between requests to avoid pypistats.org rate limits.
    // Reduced from 3s → 1s (with per-request 5s timeout) so the
    // total wall time is ~12s instead of ~24s for 7 packages.
    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return result;
}

/**
 * Sum downloads across a set of PyPI packages.
 */
export async function getTotalPyPiDownloads(urls: string[]): Promise<{
  totalLastMonth: number;
  totalLastWeek: number;
  totalLastDay: number;
  packageCount: number;
}> {
  const stats = await getManyPackageStats(urls);
  let totalLastMonth = 0;
  let totalLastWeek = 0;
  let totalLastDay = 0;
  let packageCount = 0;
  for (const [, pkgStats] of stats) {
    if (pkgStats) {
      totalLastMonth += pkgStats.lastMonth;
      totalLastWeek += pkgStats.lastWeek;
      totalLastDay += pkgStats.lastDay;
      packageCount++;
    }
  }
  return { totalLastMonth, totalLastWeek, totalLastDay, packageCount };
}
