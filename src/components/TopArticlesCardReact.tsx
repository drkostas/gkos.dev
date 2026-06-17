/**
 * Top viewed (or top reacted) blog posts card for /stats.
 *
 * `mode="views"`     → calls /api/stats/traffic and reads topBlogPosts.
 * `mode="reactions"` → calls /api/reactions?view=top.
 */
import { useEffect, useState } from "react";

type Row = { slug: string; metric: number; metricLabel: string };

export function TopArticlesCardReact({ mode }: { mode: "views" | "reactions" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const heading = mode === "views" ? "Top viewed articles" : "Most reacted articles";

  useEffect(() => {
    let cancelled = false;
    const url = mode === "views" ? "/api/stats/traffic" : "/api/reactions?view=top";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (mode === "views") {
          const posts = (data.topBlogPosts ?? []) as Array<{ x: string; y: number }>;
          setRows(
            posts.slice(0, 5).map((p) => ({
              slug: slugFromPath(p.x),
              metric: p.y,
              metricLabel: "views",
            })),
          );
        } else {
          const top = (data.top ?? []) as Array<{ postSlug: string; totalReactions: number }>;
          setRows(
            top.slice(0, 5).map((p) => ({
              slug: p.postSlug,
              metric: p.totalReactions,
              metricLabel: "reactions",
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-indigo-400 hover:bg-white">
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-20 flex h-full flex-col">
        <h2 className="mb-4 font-medium text-text-primary">{heading}</h2>
        {loading ? (
          <p className="text-sm text-text-tertiary">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            {mode === "views"
              ? "Not enough traffic yet. Check back in a few weeks."
              : "No reactions yet. Be the first."}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((row, i) => (
              <li key={row.slug}>
                <a
                  href={`/blog/${row.slug}`}
                  className="group/row flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-border-primary/20"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 font-mono text-xs text-text-tertiary tabular-nums">
                      {i + 1}.
                    </span>
                    <span className="truncate text-sm font-medium text-text-primary group-hover/row:text-purple-primary">
                      /{row.slug}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-text-tertiary">
                    {row.metric.toLocaleString()} {row.metricLabel}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function slugFromPath(path: string): string {
  // "/blog/hello-world/" → "hello-world"
  return path.replace(/^\/blog\//, "").replace(/\/$/, "");
}
