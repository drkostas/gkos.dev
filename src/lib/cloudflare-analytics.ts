/**
 * Cloudflare Web Analytics — GraphQL API client.
 *
 * Cloudflare Web Analytics exposes data through their GraphQL Analytics API,
 * not through a dedicated REST endpoint. We query the
 * `rumPageloadEventsAdaptiveGroups` dataset to get total pageviews and visits
 * for our site over a rolling window.
 *
 * Required env vars:
 *   - CLOUDFLARE_API_TOKEN  — API token with "Account Analytics: Read" perm.
 *                              Create at https://dash.cloudflare.com/profile/api-tokens
 *                              Use the "Account Analytics" template (read-only).
 *   - CLOUDFLARE_ACCOUNT_ID — Find at https://dash.cloudflare.com → right sidebar
 *                              of any account page.
 *   - CLOUDFLARE_SITE_TAG   — Same value as CLOUDFLARE_ANALYTICS_TOKEN; the
 *                              beacon "site tag" identifies which site's data
 *                              to pull. We re-export it under the analytics
 *                              name for clarity, but reading from the existing
 *                              CLOUDFLARE_ANALYTICS_TOKEN env var works too.
 *
 * Caching: results are memoized for 1 hour per (siteTag, days) tuple. Web
 * analytics doesn't change minute-to-minute and the page is built rarely.
 */

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql/";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const API_TOKEN =
  import.meta.env.CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID =
  import.meta.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;
const SITE_TAG =
  import.meta.env.CLOUDFLARE_SITE_TAG ??
  process.env.CLOUDFLARE_SITE_TAG ??
  import.meta.env.CLOUDFLARE_ANALYTICS_TOKEN ??
  process.env.CLOUDFLARE_ANALYTICS_TOKEN;

export interface CloudflareAnalyticsTotals {
  pageViews: number;
  visits: number;
  uniqueVisitors: number;
  windowDays: number;
}

interface CacheEntry {
  data: CloudflareAnalyticsTotals;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Fetch total page views, visits, and unique visitors for the configured site
 * over the last `windowDays` days. Returns null on any auth/network failure
 * (caller can fall back to a placeholder).
 */
export async function getCloudflareTotals(
  windowDays = 30,
): Promise<CloudflareAnalyticsTotals | null> {
  if (!API_TOKEN || !ACCOUNT_ID || !SITE_TAG) {
    console.warn(
      "[cloudflare-analytics] missing env: need CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_SITE_TAG",
    );
    return null;
  }

  const cacheKey = `${SITE_TAG}:${windowDays}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const end = new Date();
  const start = new Date(end.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // GraphQL query: rumPageloadEventsAdaptiveGroups returns aggregated RUM
  // (Real User Monitoring) data. `count` is total page views.
  // `visits` and `visitors` come from the sum block.
  const query = `
    query GetSiteTotals($accountTag: String!, $siteTag: String!, $start: Date!, $end: Date!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          total: rumPageloadEventsAdaptiveGroups(
            limit: 1
            filter: {
              siteTag: $siteTag
              date_geq: $start
              date_leq: $end
              bot: 0
            }
          ) {
            count
            sum {
              visits
            }
          }
          unique: rumPageloadEventsAdaptiveGroups(
            limit: 10000
            filter: {
              siteTag: $siteTag
              date_geq: $start
              date_leq: $end
              bot: 0
            }
          ) {
            dimensions {
              metric: userAgentBrowser
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          accountTag: ACCOUNT_ID,
          siteTag: SITE_TAG,
          start: isoDate(start),
          end: isoDate(end),
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[cloudflare-analytics] HTTP ${response.status}`);
      return null;
    }

    const json = (await response.json()) as any;
    if (json.errors) {
      console.warn("[cloudflare-analytics] GraphQL errors:", json.errors);
      return null;
    }

    const account = json?.data?.viewer?.accounts?.[0];
    if (!account) {
      console.warn("[cloudflare-analytics] no account in response");
      return null;
    }

    const totalRow = account.total?.[0];
    const pageViews = totalRow?.count ?? 0;
    const visits = totalRow?.sum?.visits ?? 0;
    // Unique visitors isn't directly exposed; the closest proxy is
    // distinct browser fingerprints from the dimensions block. For now we
    // approximate uniques as visits (Cloudflare counts a visit as a unique
    // session). If we need true uniques later we can add a separate query.
    const uniqueVisitors = visits;

    const result: CloudflareAnalyticsTotals = {
      pageViews,
      visits,
      uniqueVisitors,
      windowDays,
    };

    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (error) {
    console.warn("[cloudflare-analytics] fetch failed:", error);
    return null;
  }
}
