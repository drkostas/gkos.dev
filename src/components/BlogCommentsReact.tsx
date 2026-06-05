/**
 * Blog post comments thread. Renders below the reaction picker on each post.
 * Anonymous by default; optional display name.
 */
import { useEffect, useRef, useState } from "react";

interface Comment {
  id: string;
  postSlug: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}

interface Props {
  postSlug: string;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return new Date(iso).toLocaleDateString();
}

function ownedStorageKey(slug: string) {
  return `ownedComments:${slug}`;
}

function readOwned(slug: string): Set<string> {
  try {
    const raw = localStorage.getItem(ownedStorageKey(slug));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeOwned(slug: string, owned: Set<string>) {
  try {
    localStorage.setItem(ownedStorageKey(slug), JSON.stringify(Array.from(owned)));
  } catch {
    /* ignore */
  }
}

export function BlogCommentsReact({ postSlug }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOwned(readOwned(postSlug));
  }, [postSlug]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/blog/comments?post=${encodeURIComponent(postSlug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setComments(Array.isArray(d.comments) ? d.comments : []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postSlug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccess(false);

    const trimmed = body.trim();
    if (trimmed.length < 1) {
      setError("Write something first.");
      return;
    }
    if (trimmed.length > 1000) {
      setError("Comment is over the 1,000-character limit.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: postSlug,
          author: name.trim(),
          body: trimmed,
          website: honeypotRef.current?.value ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not post your comment.");
      } else if (data.comment) {
        setComments((prev) => [data.comment, ...prev]);
        // Mark this comment as owned-by-this-browser so the Delete button shows.
        const nextOwned = new Set(owned);
        nextOwned.add(data.comment.id);
        setOwned(nextOwned);
        writeOwned(postSlug, nextOwned);
        setBody("");
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (deletingId) return;
    const snapshot = comments;
    setDeletingId(id);
    // Optimistic remove
    setComments((prev) => prev.filter((c) => c.id !== id));
    const nextOwned = new Set(owned);
    nextOwned.delete(id);
    setOwned(nextOwned);
    writeOwned(postSlug, nextOwned);
    try {
      const res = await fetch("/api/blog/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        // Roll back — the row probably isn't ours (e.g., session changed IP).
        setComments(snapshot);
        const restore = new Set(nextOwned);
        restore.add(id);
        setOwned(restore);
        writeOwned(postSlug, restore);
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete that comment.");
      }
    } catch {
      setComments(snapshot);
      setError("Network error while deleting.");
    } finally {
      setDeletingId(null);
    }
  }

  const count = comments.length;
  const countLabel = loading
    ? "Loading comments..."
    : count === 0
      ? "No comments yet."
      : count === 1
        ? "1 comment"
        : `${count} comments`;

  return (
    <section className="not-prose mt-12 border-t border-dashed border-border-primary pt-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Comments
        </h2>
        <p className="text-sm text-text-tertiary tabular-nums">{countLabel}</p>
      </div>

      <form onSubmit={submit} className="mb-8 rounded-2xl border border-border-primary bg-bg-primary/60 p-4">
        {/* Honeypot — visually hidden, named "website" to bait crawlers */}
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
          aria-hidden
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          maxLength={40}
          disabled={submitting}
          className="mb-3 w-full rounded-lg border border-border-primary bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary disabled:opacity-50"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment..."
          rows={3}
          maxLength={1000}
          disabled={submitting}
          required
          className="w-full resize-y rounded-lg border border-border-primary bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-purple-primary focus:outline-none focus:ring-1 focus:ring-purple-primary disabled:opacity-50"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
            {body.length}/1000
          </span>
          <button
            type="submit"
            disabled={submitting || body.trim().length === 0}
            className="rounded-full bg-purple-primary px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-purple-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post comment"}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Posted. Thanks for chiming in.
          </p>
        )}
      </form>

      {!loading && comments.length > 0 && (
        <ul className="space-y-4">
          {comments.map((c) => {
            const isMine = owned.has(c.id);
            const isDeleting = deletingId === c.id;
            return (
              <li
                key={c.id}
                className={`rounded-xl border border-border-primary bg-bg-primary/40 p-4 transition-opacity ${isDeleting ? "opacity-50" : ""}`}
              >
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">
                    {c.authorName || "Anonymous"}
                  </span>
                  <div className="flex items-baseline gap-3">
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        disabled={isDeleting}
                        title="Delete your comment"
                        className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary transition-colors hover:text-rose-600 disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    )}
                    <time
                      dateTime={c.createdAt}
                      title={new Date(c.createdAt).toLocaleString()}
                      className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary"
                    >
                      {timeAgo(c.createdAt)}
                    </time>
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">
                  {c.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
