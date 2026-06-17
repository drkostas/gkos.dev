import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type ViewsData = {
  pageViews: number;
  visits: number;
  uniqueVisitors: number;
  windowDays: number;
};

export function SiteViewsCardReact({ demoData }: { demoData?: ViewsData } = {}) {
  const [data, setData] = useState<ViewsData | null>(demoData ?? null);
  const [isLoading, setIsLoading] = useState(!demoData);
  const [displayCount, setDisplayCount] = useState(0);

  // Fetch on mount — endpoint is edge-cached for 5 min so this is cheap.
  // Pass `demoData` to bypass the fetch (used by the /widgets catalog).
  useEffect(() => {
    if (demoData) return; // Skip network in demo mode.
    let cancelled = false;
    fetch("/api/stats/views")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoData]);

  // Count-up animation when the value lands.
  useEffect(() => {
    if (!data) return;
    const target = data.pageViews;
    if (target === 0) {
      setDisplayCount(0);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCount(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* SVG wave background — same as the original Astro card */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 320 130"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="svcWaveGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.03" />
              <stop offset="40%" stopColor="rgb(129, 140, 248)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="svcLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(167, 139, 250)" stopOpacity="0.2" />
              <stop offset="50%" stopColor="rgb(129, 140, 248)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <path
            d="M -10 105 C 20 100, 35 95, 50 88 C 65 81, 75 85, 90 82 C 105 79, 115 70, 130 65 C 145 60, 155 62, 170 58 C 185 54, 195 45, 210 42 C 225 39, 235 44, 250 38 C 265 32, 280 22, 295 15 L 310 10 L 310 150 L -10 150 Z"
            fill="url(#svcWaveGrad)"
          />
          <path
            d="M -10 105 C 20 100, 35 95, 50 88 C 65 81, 75 85, 90 82 C 105 79, 115 70, 130 65 C 145 60, 155 62, 170 58 C 185 54, 195 45, 210 42 C 225 39, 235 44, 250 38 C 265 32, 280 22, 295 15 L 310 10"
            fill="none"
            stroke="url(#svcLineGrad)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="310" cy="10" r="4" fill="rgb(99, 102, 241)" />
        </svg>
      </div>

      <div className="relative z-20 flex h-full flex-col">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-medium text-text-primary">Site views</h2>
          <div className="flex items-center gap-1 text-emerald-500">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17l5-5 5 5" />
              <path d="M7 11l5-5 5 5" />
            </svg>
          </div>
          {/* Live indicator dot — pulses while data is loading */}
          {isLoading && (
            <span className="ml-auto flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-indigo-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
            </span>
          )}
        </div>
        <p className="text-xs uppercase tracking-wider text-text-tertiary">
          Last 30 days · via PostHog
        </p>
        <motion.p
          key={data?.pageViews ?? 0}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-auto text-3xl font-semibold tabular-nums tracking-tight text-purple-primary"
        >
          {isLoading ? "—" : displayCount.toLocaleString()}
        </motion.p>
        {data && data.visits > 0 && (
          <p className="font-mono text-xs text-text-tertiary">
            <span className="font-semibold text-text-secondary">
              {data.visits.toLocaleString()}
            </span>{" "}
            visits
          </p>
        )}
      </div>
    </div>
  );
}
