import { useState } from "react";

interface Post {
  id: string;
  title: string;
  summary: string;
}

export function BlogSearch({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.length < 2
    ? null
    : posts.filter((post) => {
        const q = query.toLowerCase();
        return (
          post.title.toLowerCase().includes(q) ||
          post.summary.toLowerCase().includes(q)
        );
      });

  return (
    <div className="relative mb-6">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
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
          type="text"
          placeholder="Search articles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full border border-border-primary bg-bg-primary py-2.5 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary/20"
        />
      </div>

      {filtered !== null && (
        <div className="mt-2 rounded-xl border border-border-primary bg-bg-primary p-2 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-text-tertiary">
              No articles found for "{query}"
            </p>
          ) : (
            <ul className="max-h-[300px] overflow-y-auto">
              {filtered.slice(0, 8).map((post) => (
                <li key={post.id}>
                  <a
                    href={`/blog/${post.id}`}
                    className="block rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-border-primary/30"
                  >
                    <span className="font-medium text-text-primary">
                      {post.title}
                    </span>
                    <span className="mt-0.5 line-clamp-1 block text-xs text-text-secondary">
                      {post.summary}
                    </span>
                  </a>
                </li>
              ))}
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
