/**
 * Umami Cloud API client.
 *
 * Pulls per-page views, top pages, referrers, and aggregate stats from Umami
 * Cloud's REST API. Used by the /stats page and the /api/stats/umami endpoint.
 *
 * Env vars:
 *   - UMAMI_API_KEY      — API key from Umami Cloud Settings → API Keys
 *   - UMAMI_WEBSITE_ID   — Website UUID from Umami Cloud dashboard
 *
 * API base: https://api.umami.is/v1
 * Docs: https://umami.is/docs/api
 */

const API_BASE = "https://api.umami.is/v1";
const API_KEY =
  import.meta.env.UMAMI_API_KEY ?? process.env.UMAMI_API_KEY;
const WEBSITE_ID =
  import.meta.env.UMAMI_WEBSITE_ID ?? process.env.UMAMI_WEBSITE_ID;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; expiresAt: number }>();

async function umamiFetch<T = any>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!API_KEY || !WEBSITE_ID) {
    console.warn("[umami] missing UMAMI_API_KEY or UMAMI_WEBSITE_ID");
    return null;
  }

  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}/websites/${WEBSITE_ID}${path}${qs ? `?${qs}` : ""}`;
  const cacheKey = url;

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;

  try {
    const response = await fetch(url, {
      headers: { "x-umami-api-key": API_KEY },
    });
    if (!response.ok) {
      console.warn(`[umami] ${path} → ${response.status}`);
      return null;
    }
    const data = (await response.json()) as T;
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (error) {
    console.warn(`[umami] ${path} failed:`, error);
    return null;
  }
}

// Helpers for time ranges
function daysAgoMs(days: number): string {
  return String(Date.now() - days * 24 * 60 * 60 * 1000);
}
function nowMs(): string {
  return String(Date.now());
}

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface UmamiStats {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}

export interface UmamiMetric {
  x: string; // the dimension value (URL path, referrer domain, etc.)
  y: number; // count
}

export interface UmamiPageview {
  x: string; // date string
  y: number; // count
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/** Aggregate stats for the last N days. */
export async function getStats(days = 30): Promise<UmamiStats | null> {
  return umamiFetch<UmamiStats>("/stats", {
    startAt: daysAgoMs(days),
    endAt: nowMs(),
  });
}

/** Top pages by views for the last N days. */
export async function getTopPages(days = 30, limit = 10): Promise<UmamiMetric[]> {
  const data = await umamiFetch<UmamiMetric[]>("/metrics", {
    startAt: daysAgoMs(days),
    endAt: nowMs(),
    type: "url",
    limit: String(limit),
  });
  return data ?? [];
}

/** Top referrers for the last N days. */
export async function getTopReferrers(days = 30, limit = 10): Promise<UmamiMetric[]> {
  const data = await umamiFetch<UmamiMetric[]>("/metrics", {
    startAt: daysAgoMs(days),
    endAt: nowMs(),
    type: "referrer",
    limit: String(limit),
  });
  return data ?? [];
}

/** Top browsers for the last N days. */
export async function getTopBrowsers(days = 30, limit = 5): Promise<UmamiMetric[]> {
  const data = await umamiFetch<UmamiMetric[]>("/metrics", {
    startAt: daysAgoMs(days),
    endAt: nowMs(),
    type: "browser",
    limit: String(limit),
  });
  return data ?? [];
}

/** Top countries for the last N days. */
export async function getTopCountries(days = 30, limit = 10): Promise<UmamiMetric[]> {
  const data = await umamiFetch<UmamiMetric[]>("/metrics", {
    startAt: daysAgoMs(days),
    endAt: nowMs(),
    type: "country",
    limit: String(limit),
  });
  return data ?? [];
}

/** Pageview time series for the last N days (daily buckets). */
export async function getPageviewSeries(days = 30): Promise<UmamiPageview[]> {
  const data = await umamiFetch<{ pageviews: UmamiPageview[] }>("/pageviews", {
    startAt: daysAgoMs(days),
    endAt: nowMs(),
    unit: "day",
  });
  return data?.pageviews ?? [];
}
