/**
 * Total-reactions card for /stats. Fetches /api/reactions on mount and shows
 * a 2×2 breakdown by emoji type plus the running total.
 */
import { useEffect, useState } from "react";

type Counts = { like: number; heart: number; celebrate: number; insightful: number };

const ZERO: Counts = { like: 0, heart: 0, celebrate: 0, insightful: 0 };

export function ReactionsStatsCardReact() {
  const [counts, setCounts] = useState<Counts>(ZERO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reactions")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCounts(data.totals ?? ZERO);
      })
      .catch(() => {
        if (!cancelled) setCounts(ZERO);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = counts.like + counts.heart + counts.celebrate + counts.insightful;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-20 flex h-full flex-col">
        <h2 className="mb-2 font-medium text-text-primary">Reactions</h2>
        <p className="mb-4 text-3xl font-bold tabular-nums tracking-tight text-purple-primary">
          {loading ? "…" : total.toLocaleString()}
          <span className="ml-2 text-sm font-normal text-text-tertiary">total</span>
        </p>
        <div className="grid flex-1 grid-cols-2 gap-3">
          <Cell label="Likes" value={counts.like} emoji="👍" />
          <Cell label="Hearts" value={counts.heart} emoji="❤️" />
          <Cell label="Celebrates" value={counts.celebrate} emoji="🎉" />
          <Cell label="Insightful" value={counts.insightful} emoji="💡" />
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border-primary/50 bg-white/50 p-3">
      <div className="mb-2 text-2xl leading-none" aria-hidden>
        {emoji}
      </div>
      <span className="text-lg font-semibold tabular-nums text-text-primary">{value.toLocaleString()}</span>
      <span className="text-xs text-text-tertiary">{label}</span>
    </div>
  );
}
