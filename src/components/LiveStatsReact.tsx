import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type GitHubData = {
  stars: number;
  forks: number;
  followers: number;
  publicRepos: number;
  contributions: number;
  weeks: number[][];
  coffeeCups: number;
};

type PyPIData = {
  totalLastMonth: number;
  totalLastWeek: number;
  totalLastDay: number;
  packageCount: number;
};

type HFData = {
  totalDownloads: number;
  totalLikes: number;
  modelCount: number;
};

function CountUp({ target, label }: { target: number; label: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const duration = 1000;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <div className="relative z-20 flex h-full flex-col">
      <h2 className="mb-1 text-sm font-medium text-text-primary">{label}</h2>
      <p className="mt-auto text-2xl font-semibold tabular-nums tracking-tight text-purple-primary">
        {display.toLocaleString()}
      </p>
    </div>
  );
}

// Purple ramp matched to the site palette (was GitHub-green).
const LEVEL_COLORS = [
  "bg-gray-200 dark:bg-[#1e2740]",
  "bg-purple-200 dark:bg-[#2d1b4e]",
  "bg-purple-400 dark:bg-[#5b21b6]",
  "bg-purple-500 dark:bg-[#8b5cf6]",
  "bg-purple-600 dark:bg-[#a78bfa]",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ContributionGraph({ weeks, contributions }: { weeks: number[][]; contributions: number }) {
  return (
    <div className="group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-20 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-[rgba(20,80,50,0.5)]">
            <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </div>
          <div>
            <h2 className="font-medium text-text-primary">Contributions</h2>
            <p className="text-sm text-text-secondary">This year</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-purple-primary">
            {contributions.toLocaleString()}
          </span>
          <p className="text-xs text-text-tertiary">this year</p>
        </div>
      </div>
      <div className="relative z-20 mt-2 flex-1">
        <div className="mb-1 flex text-[10px] text-text-tertiary" style={{ paddingLeft: 28 }}>
          <div className="flex flex-1 justify-between">
            {MONTHS.map((m) => <span key={m}>{m}</span>)}
          </div>
        </div>
        <div className="flex gap-[3px]">
          <div className="flex w-6 shrink-0 flex-col justify-between py-[2px] text-[9px] text-text-tertiary">
            <span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span>
          </div>
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)`, gap: 3 }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((level, di) => (
                  <div key={di} className="relative aspect-square">
                    <div className={`h-full w-full rounded-sm transition-colors duration-150 lg:rounded ${LEVEL_COLORS[level] ?? LEVEL_COLORS[0]}`} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="relative z-20 mt-3 flex items-center justify-center gap-1 text-[10px] text-text-tertiary md:justify-end">
        <span>Less</span>
        {LEVEL_COLORS.map((c, i) => <div key={i} className={`h-[10px] w-[10px] rounded-[2px] ${c}`} />)}
        <span>More</span>
      </div>
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-4 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
        <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {children}
      </div>
    </div>
  );
}

export function GitHubStatsReact() {
  const [data, setData] = useState<GitHubData | null>(null);

  useEffect(() => {
    fetch("/api/stats/github").then(r => r.json()).then(setData).catch(() => {});
  }, []);

  const weeks = data?.weeks ?? Array.from({ length: 52 }, () => Array(7).fill(0));

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
      <div className="h-full md:col-span-9">
        <ContributionGraph weeks={weeks} contributions={data?.contributions ?? 0} />
      </div>
      <div className="flex h-full flex-col gap-2 md:col-span-3">
        <StatCard label="GitHub stars">
          <CountUp target={data?.stars ?? 0} label="GitHub stars" />
        </StatCard>
        <StatCard label="Forks">
          <CountUp target={data?.forks ?? 0} label="Forks" />
        </StatCard>
        <StatCard label="Followers">
          <CountUp target={data?.followers ?? 0} label="Followers" />
        </StatCard>
      </div>
    </div>
  );
}

export function CoffeeCupsReact() {
  const [cups, setCups] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats/github")
      .then((r) => r.json())
      .then((d) => setCups(d.coffeeCups ?? 0))
      .catch(() => {});
  }, []);

  // perDay assumes ~250 active workdays/year (≈365 − weekends − holidays).
  // Using 365 understates intensity because it averages in days of zero commits.
  const perDay = cups !== null && cups > 0 ? (cups / 250).toFixed(1) : "0";

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute text-2xl" style={{ left: "10%", top: "20%", opacity: 0.15, transform: "rotate(-15deg)" }}>&#9749;</span>
        <span className="absolute text-2xl" style={{ left: "75%", top: "15%", opacity: 0.15, transform: "rotate(10deg)" }}>&#9749;</span>
        <span className="absolute text-2xl" style={{ left: "85%", top: "60%", opacity: 0.15, transform: "rotate(-8deg)" }}>&#9749;</span>
        <span className="absolute text-2xl" style={{ left: "15%", top: "70%", opacity: 0.15, transform: "rotate(12deg)" }}>&#9749;</span>
      </div>
      <div className="relative z-20 flex h-full flex-col">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl dark:bg-[rgba(120,90,30,0.5)]">
          &#9749;
        </div>
        <h2 className="mb-2 font-medium text-text-primary">Coffee consumed</h2>
        <p className="text-sm text-text-secondary">~1 cup per 4 commits</p>
        <div className="mt-auto">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-purple-primary">
              ~{cups !== null ? cups.toLocaleString() : "—"}
            </span>
            <span className="text-sm text-text-secondary">cups</span>
          </div>
          <p className="mt-2 text-xs text-text-tertiary">
            ~{perDay} cups/workday
          </p>
        </div>
      </div>
    </div>
  );
}

export function PyPIStatsReact() {
  const [data, setData] = useState<PyPIData | null>(null);

  useEffect(() => {
    fetch("/api/stats/pypi").then(r => r.json()).then(setData).catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
      <div className="md:col-span-3">
        <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-20 flex h-full flex-col">
            <h2 className="mb-1 font-medium text-text-primary">PyPI packages</h2>
            <p className="mt-auto text-3xl font-semibold tabular-nums tracking-tight text-purple-primary">
              {data?.packageCount ?? "—"}
            </p>
          </div>
        </div>
      </div>
      <div className="md:col-span-5">
        <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-20 flex h-full flex-col">
            <h2 className="mb-1 font-medium text-text-primary">PyPI downloads</h2>
            <p className="text-xs text-text-tertiary">Last 30 days</p>
            <div className="mt-auto">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-purple-primary">
                {data ? data.totalLastMonth.toLocaleString() : "—"}
              </p>
              {data && (
                <p className="text-xs text-text-tertiary">
                  <span className="tabular-nums">{data.totalLastWeek.toLocaleString()}</span> this week ·{" "}
                  <span className="tabular-nums">{data.totalLastDay.toLocaleString()}</span> today
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="md:col-span-4">
        <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-20 flex h-full flex-col">
            <h2 className="mb-1 font-medium text-text-primary">HuggingFace</h2>
            <HFStatsInner />
          </div>
        </div>
      </div>
    </div>
  );
}

function HFStatsInner() {
  const [data, setData] = useState<HFData | null>(null);

  useEffect(() => {
    fetch("/api/stats/huggingface").then(r => r.json()).then(setData).catch(() => {});
  }, []);

  return (
    <>
      <p className="mt-auto text-3xl font-semibold tabular-nums tracking-tight text-purple-primary">
        {data ? data.modelCount : "—"}
      </p>
      <p className="text-xs text-text-tertiary">
        models · {data ? data.totalDownloads.toLocaleString() : "—"} downloads
      </p>
    </>
  );
}
