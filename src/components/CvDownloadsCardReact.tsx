import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type CvData = {
  total: number;
  last_30_days: number;
  last_7_days: number;
  last_24_hours: number;
};

export function CvDownloadsCardReact({ demoData }: { demoData?: CvData } = {}) {
  const [data, setData] = useState<CvData | null>(demoData ?? null);
  const [isLoading, setIsLoading] = useState(!demoData);
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    if (demoData) return;
    let cancelled = false;
    fetch("/api/stats/cv-downloads")
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

  useEffect(() => {
    if (!data) return;
    const target = data.last_30_days;
    if (target === 0) {
      setDisplayCount(0);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCount(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-emerald-400 hover:bg-white">
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-emerald-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Document-stack background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <svg
          className="absolute -right-2 -top-2 h-32 w-32 opacity-20"
          viewBox="0 0 100 100"
          fill="none"
        >
          <defs>
            <linearGradient id="cvDocGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="rgb(5, 150, 105)" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <rect x="28" y="14" width="44" height="56" rx="3" fill="rgb(255,255,255)" stroke="url(#cvDocGrad)" strokeWidth="1.5" transform="rotate(-6 50 42)" />
          <rect x="24" y="22" width="44" height="56" rx="3" fill="rgb(255,255,255)" stroke="url(#cvDocGrad)" strokeWidth="1.5" transform="rotate(-2 46 50)" />
          <rect x="22" y="28" width="44" height="56" rx="3" fill="rgb(255,255,255)" stroke="url(#cvDocGrad)" strokeWidth="1.5" />
          <line x1="28" y1="40" x2="58" y2="40" stroke="rgb(16, 185, 129)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="28" y1="48" x2="52" y2="48" stroke="rgb(16, 185, 129)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="28" y1="56" x2="60" y2="56" stroke="rgb(16, 185, 129)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="28" y1="64" x2="48" y2="64" stroke="rgb(16, 185, 129)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="28" y1="72" x2="55" y2="72" stroke="rgb(16, 185, 129)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>

      <div className="relative z-20 flex h-full flex-col">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-medium text-text-primary">CV downloads</h2>
          <svg
            className="h-4 w-4 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {isLoading && (
            <span className="ml-auto flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
        <p className="text-xs uppercase tracking-wider text-text-tertiary">
          Last 30 days · via Supabase
        </p>
        <motion.p
          key={data?.last_30_days ?? 0}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-auto text-3xl font-semibold tabular-nums tracking-tight text-emerald-600"
        >
          {isLoading ? "—" : displayCount.toLocaleString()}
        </motion.p>
        {data && data.total > 0 && (
          <p className="font-mono text-xs text-text-tertiary">
            <span className="font-semibold text-text-secondary">
              {data.total.toLocaleString()}
            </span>{" "}
            total
          </p>
        )}
      </div>
    </div>
  );
}
