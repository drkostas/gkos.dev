/**
 * PostHog Cloud (EU region) reads — pageviews, top pages, referrers,
 * countries, devices, browsers, OS, custom events. Replaced Umami Cloud +
 * Cloudflare Web Analytics on 2026-06-17.
 *
 * The ingestion side (client-side `posthog.init`) lives in Layout.astro.
 * This file is server-only and uses the Personal API Key to read insights
 * via the HogQL query endpoint.
 *
 * Env vars:
 *   - POSTHOG_PERSONAL_API_KEY — server-side read access (prefix `phx_`).
 *                                 Get at app.posthog.com → Profile → API Keys.
 *   - POSTHOG_PROJECT_ID       — project ID (numeric). Find in project settings.
 *   - POSTHOG_API_HOST         — defaults to https://eu.posthog.com.
 *
 * API: https://posthog.com/docs/api/query
 */

const API_HOST =
  import.meta.env.POSTHOG_API_HOST ??
  process.env.POSTHOG_API_HOST ??
  "https://eu.posthog.com";
const API_KEY =
  import.meta.env.POSTHOG_PERSONAL_API_KEY ??
  process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ID =
  import.meta.env.POSTHOG_PROJECT_ID ?? process.env.POSTHOG_PROJECT_ID;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; expiresAt: number }>();

/**
 * Run a HogQL query against PostHog's events table. Returns null on any
 * auth/network failure so callers can fall back to a placeholder.
 */
async function hogql<T = any[][]>(
  query: string,
  cacheKey?: string,
): Promise<{ results: T; columns: string[] } | null> {
  if (!API_KEY || !PROJECT_ID) {
    console.warn("[posthog] missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID");
    return null;
  }
  const key = cacheKey ?? query;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  try {
    const response = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    });
    if (!response.ok) {
      console.warn(`[posthog] HTTP ${response.status} on query`);
      return null;
    }
    const data = await response.json();
    const result = { results: data.results ?? [], columns: data.columns ?? [] };
    cache.set(key, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (error) {
    console.warn("[posthog] query failed:", error);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Types — match the shape the existing /stats cards already consume so we
// don't have to rewrite the React islands. `x` is the dimension value
// (path, referrer, country), `y` is the count.
// ----------------------------------------------------------------------------

export interface PostHogStats {
  pageviews: number;
  visitors: number;
  visits: number;  // mapped to sessions (PostHog terminology)
  bounces: number; // single-pageview sessions
  totaltime: number; // sum of session durations (ms)
}

export interface PostHogMetric {
  x: string;
  y: number;
}

export interface PageViewTotals {
  pageViews: number;
  visits: number;
  uniqueVisitors: number;
  windowDays: number;
}

// ----------------------------------------------------------------------------
// Aggregate stats
// ----------------------------------------------------------------------------

/** Aggregate pageviews / unique visitors / sessions over the last N days. */
export async function getStats(days = 30): Promise<PostHogStats | null> {
  const result = await hogql(
    `
    SELECT
      count()                                 AS pageviews,
      uniq(person_id)                          AS visitors,
      uniq(properties.$session_id)             AS visits,
      countIf(event = '$pageview')             AS pv_total,
      0                                        AS bounces_placeholder,
      0                                        AS totaltime_placeholder
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL ${days} DAY
    `,
    `stats:${days}`,
  );
  const row = result?.results?.[0];
  if (!row) return null;
  return {
    pageviews: Number(row[0] ?? 0),
    visitors: Number(row[1] ?? 0),
    visits: Number(row[2] ?? 0),
    bounces: 0,
    totaltime: 0,
  };
}

/** Same shape as the legacy Cloudflare endpoint. */
export async function getPageViewTotals(days = 30): Promise<PageViewTotals> {
  const stats = await getStats(days);
  return {
    pageViews: stats?.pageviews ?? 0,
    visits: stats?.visits ?? 0,
    uniqueVisitors: stats?.visitors ?? 0,
    windowDays: days,
  };
}

// ----------------------------------------------------------------------------
// Top-N breakdowns
// ----------------------------------------------------------------------------

async function topBy(
  field: string,
  days: number,
  limit: number,
  cacheTag: string,
): Promise<PostHogMetric[]> {
  const result = await hogql(
    `
    SELECT ${field} AS x, count() AS y
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL ${days} DAY
      AND ${field} IS NOT NULL
      AND ${field} != ''
    GROUP BY ${field}
    ORDER BY y DESC
    LIMIT ${limit}
    `,
    `${cacheTag}:${days}:${limit}`,
  );
  if (!result?.results) return [];
  return result.results.map((row: any) => ({
    x: String(row[0] ?? ""),
    y: Number(row[1] ?? 0),
  }));
}

export async function getTopPages(days = 30, limit = 10): Promise<PostHogMetric[]> {
  return topBy("properties.$pathname", days, limit, "top-pages");
}

/**
 * Top blog-post pages by views. Filters /blog/<slug> from the wider top-pages
 * list, drops the listing page itself, returns up to `limit` sorted desc.
 */
export async function getTopBlogPosts(days = 30, limit = 5): Promise<PostHogMetric[]> {
  const all = await getTopPages(days, 50);
  return all.filter((m) => /^\/blog\/[^/]+\/?$/.test(m.x)).slice(0, limit);
}

export async function getTopReferrers(days = 30, limit = 10): Promise<PostHogMetric[]> {
  return topBy("properties.$referring_domain", days, limit, "top-refs");
}

export async function getTopCountries(days = 30, limit = 10): Promise<PostHogMetric[]> {
  return topBy("properties.$geoip_country_code", days, limit, "top-countries");
}

export async function getTopBrowsers(days = 30, limit = 5): Promise<PostHogMetric[]> {
  return topBy("properties.$browser", days, limit, "top-browsers");
}

export async function getTopDevices(days = 30, limit = 5): Promise<PostHogMetric[]> {
  return topBy("properties.$device_type", days, limit, "top-devices");
}

export async function getTopOS(days = 30, limit = 5): Promise<PostHogMetric[]> {
  return topBy("properties.$os", days, limit, "top-os");
}
