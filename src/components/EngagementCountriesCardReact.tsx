/**
 * Engagement-geography card for /stats. Shows how many distinct countries
 * have reacted / commented / left a wall note, with the top 3 of each.
 *
 * Data comes from the per-table country aggregation views created by
 * docs/demographics-migration.sql.
 */
import { useEffect, useState } from "react";

interface CountryRow {
  country: string;
  count: number;
}
interface PayloadResp {
  comments: CountryRow[];
  reactions: CountryRow[];
  wall: CountryRow[];
}

const EMPTY: PayloadResp = { comments: [], reactions: [], wall: [] };

function countryFlag(iso: string): string {
  if (!iso || iso.length !== 2) return "🌐";
  const codepoints = iso
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codepoints);
}

export function EngagementCountriesCardReact() {
  const [data, setData] = useState<PayloadResp>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/engagement-countries")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setData({
          comments: Array.isArray(d.comments) ? d.comments : [],
          reactions: Array.isArray(d.reactions) ? d.reactions : [],
          wall: Array.isArray(d.wall) ? d.wall : [],
        });
      })
      .catch(() => {
        if (!cancelled) setData(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, []);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-20 flex h-full flex-col">
        <h2 className="mb-1 font-medium text-text-primary">Engagement geography</h2>
        <p className="mb-4 text-xs uppercase tracking-wider text-text-tertiary">
          Where engagement comes from
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Bucket label="Comments" rows={data.comments} loading={loading} />
          <Bucket label="Reactions" rows={data.reactions} loading={loading} />
          <Bucket label="Wall notes" rows={data.wall} loading={loading} />
        </div>
      </div>
    </div>
  );
}

function Bucket({
  label,
  rows,
  loading,
}: {
  label: string;
  rows: CountryRow[];
  loading: boolean;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const topThree = rows.slice(0, 3);
  const distinctCountries = rows.length;
  return (
    <div className="rounded-xl border border-border-primary/60 bg-bg-primary/40 p-4">
      <h3 className="mb-2 text-xs font-mono uppercase tracking-widest text-text-tertiary">
        {label}
      </h3>
      <p className="mb-1 text-2xl font-bold tabular-nums tracking-tight text-purple-primary">
        {loading ? "…" : distinctCountries}
        <span className="ml-1.5 text-xs font-normal text-text-tertiary">
          {distinctCountries === 1 ? "country" : "countries"}
        </span>
      </p>
      <p className="mb-3 text-xs text-text-tertiary">
        {loading ? "…" : `${total} total`}
      </p>
      {!loading && topThree.length > 0 ? (
        <ul className="space-y-1.5">
          {topThree.map((r) => (
            <li
              key={r.country}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <span className="text-text-secondary">
                <span className="mr-1.5">{countryFlag(r.country)}</span>
                {r.country}
              </span>
              <span className="font-mono tabular-nums text-text-tertiary">
                {r.count}
              </span>
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className="text-xs text-text-tertiary">No data yet.</p>
      ) : null}
    </div>
  );
}
