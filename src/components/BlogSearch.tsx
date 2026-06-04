import { useEffect, useMemo, useRef, useState } from "react";

interface Post {
  id: string;
  title: string;
  summary: string;
  body?: string;
  categories?: string[];
}

function buildHaystack(post: Post) {
  return [
    post.title,
    post.summary,
    (post.categories || []).join(" "),
    post.body || "",
  ]
    .join("\n")
    .toLowerCase();
}

/**
 * Extract ~60 chars of context around the first body-match for `query`.
 * Returns null when the match is already satisfied by title/summary
 * (no need to duplicate context the user can already see).
 */
function extractSnippet(post: Post, query: string) {
  const q = query.toLowerCase();
  if (post.title.toLowerCase().includes(q)) return null;
  if (post.summary.toLowerCase().includes(q)) return null;
  const body = post.body || "";
  const idx = body.toLowerCase().indexOf(q);
  if (idx === -1) return null;
  const radius = 60;
  const start = Math.max(0, idx - radius);
  const end = Math.min(body.length, idx + q.length + radius);
  // Snap to word boundary so we don't chop mid-word when possible.
  const adjStart = start > 0 ? body.indexOf(" ", start) + 1 || start : start;
  const adjEnd = end < body.length ? body.lastIndexOf(" ", end) || end : end;
  return {
    before: body.slice(adjStart, idx),
    match: body.slice(idx, idx + q.length),
    after: body.slice(idx + q.length, adjEnd),
    leadingEllipsis: adjStart > 0,
    trailingEllipsis: adjEnd < body.length,
  };
}

export function BlogSearch({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMac, setIsMac] = useState(true);

  const index = useMemo(
    () => posts.map((post) => ({ post, haystack: buildHaystack(post) })),
    [posts],
  );

  const filtered = query.length < 2
    ? null
    : index
        .filter(({ haystack }) => haystack.includes(query.toLowerCase()))
        .map(({ post }) => post);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iP(hone|od|ad)/.test(navigator.userAgent));
    }

    const handler = (e: KeyboardEvent) => {
      const isMetaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isMetaK) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const modLabel = isMac ? "⌘" : "Ctrl";

  return (
    <div className="relative mb-6">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full border border-border-primary bg-bg-primary py-2.5 pl-11 pr-20 text-sm text-text-primary placeholder:text-text-tertiary focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary/20"
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-border-primary bg-bg-primary/80 px-2 py-0.5 font-mono text-[11px] text-text-tertiary shadow-sm sm:flex"
        >
          <span>{modLabel}</span>
          <span>K</span>
        </kbd>
      </div>

      {filtered !== null && (
        <div className="mt-2 rounded-xl border border-border-primary bg-bg-primary p-2 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-text-tertiary">
              No posts found for "{query}"
            </p>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto">
              {filtered.slice(0, 8).map((post) => {
                const snippet = extractSnippet(post, query);
                return (
                  <li key={post.id}>
                    <a
                      href={`/blog/${post.id}?q=${encodeURIComponent(query)}`}
                      className="block rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-border-primary/30"
                    >
                      <span className="font-medium text-text-primary">
                        {post.title}
                      </span>
                      {snippet ? (
                        <span className="mt-0.5 line-clamp-1 block text-xs text-text-secondary">
                          {snippet.leadingEllipsis ? "…" : ""}
                          {snippet.before}
                          <mark className="rounded-sm bg-yellow-200/60 px-0.5 font-medium text-text-primary dark:bg-yellow-400/30">
                            {snippet.match}
                          </mark>
                          {snippet.after}
                          {snippet.trailingEllipsis ? "…" : ""}
                        </span>
                      ) : (
                        <span className="mt-0.5 line-clamp-1 block text-xs text-text-secondary">
                          {post.summary}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
              {filtered.length > 8 && (
                <p className="px-3 py-2 text-center text-xs text-text-tertiary">
                  +{filtered.length - 8} more results
                </p>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
