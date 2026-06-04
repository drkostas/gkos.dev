/**
 * Total-comments card for /stats. Fetches /api/blog/comments on mount and
 * shows the total count + the top-3 most-commented posts.
 */
import { useEffect, useState } from "react";

interface TopPost {
  postSlug: string;
  totalComments: number;
}

export function CommentsStatsCardReact() {
  const [total, setTotal] = useState(0);
  const [top, setTop] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/blog/comments")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setTotal(typeof d.total === "number" ? d.total : 0);
        setTop(Array.isArray(d.top) ? d.top : []);
      })
      .catch(() => {
        if (!cancelled) {
          setTotal(0);
          setTop([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, []);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-all duration-300 hover:border-purple-primary hover:bg-white">
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tl from-purple-primary/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-20 flex h-full flex-col">
        <h2 className="mb-2 font-medium text-text-primary">Comments</h2>
        <p className="mb-4 text-3xl font-bold tabular-nums tracking-tight text-purple-primary">
          {loading ? "…" : total.toLocaleString()}
          <span className="ml-2 text-sm font-normal text-text-tertiary">total</span>
        </p>
        <div className="flex-1">
          {!loading && top.length === 0 ? (
            <p className="text-sm text-text-tertiary">
              No comments yet. Be the first to leave one.
            </p>
          ) : (
            <ul className="space-y-2">
              {top.slice(0, 3).map((p) => (
                <li
                  key={p.postSlug}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <a
                    href={`/blog/${p.postSlug}`}
                    className="truncate text-text-secondary hover:text-purple-primary"
                  >
                    /{p.postSlug}
                  </a>
                  <span className="font-mono text-xs tabular-nums text-text-tertiary">
                    {p.totalComments}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
