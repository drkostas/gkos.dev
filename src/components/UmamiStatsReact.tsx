import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type UmamiMetric = { x: string; y: number };
type UmamiStats = {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
};
type UmamiData = {
  stats: UmamiStats | null;
  topPages: UmamiMetric[];
  topReferrers: UmamiMetric[];
  topCountries: UmamiMetric[];
};

function formatPath(path: string): string {
  if (path === "/") return "Home";
  return path
    .replace(/^\//, "")
    .split("/")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" / ");
}

/**
 * Renders top pages, visitors, referrers from Umami Cloud API.
 * Fetches /api/stats/umami on mount (edge-cached for 5 min).
 * Pass `demoData` to bypass the fetch (used by the /widgets catalog).
 */
export function UmamiStatsReact({ demoData }: { demoData?: UmamiData } = {}) {
  const [data, setData] = useState<UmamiData | null>(demoData ?? null);
  const [isLoading, setIsLoading] = useState(!demoData);

  useEffect(() => {
    if (demoData) return; // Skip network in demo mode.
    let cancelled = false;
    fetch("/api/stats/umami")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoData]);

  const stats = data?.stats;
  const topPages = data?.topPages ?? [];
  const topReferrers = data?.topReferrers ?? [];
  const topCountries = data?.topCountries ?? [];
  const hasData = stats && stats.pageviews > 0;
  const maxPageViews = topPages.length > 0 ? Math.max(...topPages.map((p) => p.y)) : 1;

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
      {/* Visitors + Pageviews summary */}
      <div className="md:col-span-3">
        <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-20 flex h-full flex-col">
            <h2 className="mb-1 font-medium text-text-primary">Unique Visitors</h2>
            <p className="text-xs uppercase tracking-wider text-text-tertiary">
              Last 30 days · via Umami
            </p>
            <p className="mt-auto text-3xl font-semibold tabular-nums tracking-tight text-purple-primary">
              {isLoading ? "—" : (stats?.visitors ?? 0).toLocaleString()}
            </p>
            {hasData && (
              <p className="font-mono text-xs text-text-tertiary">
                <span className="font-semibold text-text-secondary">
                  {stats.pageviews.toLocaleString()}
                </span>{" "}
                pageviews
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top Pages */}
      <div className="md:col-span-5">
        <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-20 flex h-full flex-col">
            <h2 className="mb-4 font-medium text-text-primary">Top Pages</h2>
            {isLoading ? (
              <p className="text-sm text-text-tertiary">Loading...</p>
            ) : topPages.length === 0 ? (
              <p className="text-sm text-text-tertiary">No data yet — check back soon</p>
            ) : (
              <div className="space-y-2.5">
                {topPages.slice(0, 7).map((page, i) => (
                  <div key={page.x}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate text-xs font-medium text-text-secondary">
                        {formatPath(page.x)}
                      </span>
                      <span className="ml-2 shrink-0 text-xs font-semibold tabular-nums text-text-tertiary">
                        {page.y}
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-border-primary/30">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(page.y / maxPageViews) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Referrers */}
      <div className="md:col-span-4">
        <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-20 flex h-full flex-col">
            <h2 className="mb-4 font-medium text-text-primary">Referrers</h2>
            {isLoading ? (
              <p className="text-sm text-text-tertiary">Loading...</p>
            ) : topReferrers.length === 0 ? (
              <p className="text-sm text-text-tertiary">No referrer data yet</p>
            ) : (
              <div className="space-y-3">
                {topReferrers.slice(0, 7).map((ref) => (
                  <div key={ref.x} className="flex items-center justify-between">
                    <span className="truncate text-xs text-text-secondary">
                      {ref.x || "(direct)"}
                    </span>
                    <span className="ml-2 shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      {ref.y}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
