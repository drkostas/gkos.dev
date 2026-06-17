/**
 * Reaction picker for the bottom of a blog post.
 *
 * Renders four emoji buttons (like / heart / celebrate / insightful) with live
 * counts. Clicking a button toggles the reaction:
 *   - first click  → POST /api/reactions (insert + email)
 *   - second click → DELETE /api/reactions (remove, no email)
 *
 * Picked state is mirrored in localStorage so the filled UI survives reloads.
 */
import { useEffect, useState } from "react";

type EmojiType = "like" | "heart" | "celebrate" | "insightful";

type Counts = Record<EmojiType, number>;
const ZERO: Counts = { like: 0, heart: 0, celebrate: 0, insightful: 0 };

const EMOJIS: { type: EmojiType; label: string; symbol: string }[] = [
  { type: "like", label: "Like", symbol: "👍" },
  { type: "heart", label: "Heart", symbol: "❤️" },
  { type: "celebrate", label: "Celebrate", symbol: "🎉" },
  { type: "insightful", label: "Insightful", symbol: "💡" },
];

function storageKey(slug: string) {
  return `reaction:${slug}`;
}

function readPickedFromStorage(slug: string): Set<EmojiType> {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as EmojiType[]);
  } catch {
    return new Set();
  }
}

function writePickedToStorage(slug: string, picked: Set<EmojiType>) {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(Array.from(picked)));
  } catch {
    /* ignore — privacy mode etc. */
  }
}

export function ReactionPickerReact({ postSlug }: { postSlug: string }) {
  const [counts, setCounts] = useState<Counts>(ZERO);
  const [picked, setPicked] = useState<Set<EmojiType>>(new Set());
  const [pending, setPending] = useState<EmojiType | null>(null);

  useEffect(() => {
    setPicked(readPickedFromStorage(postSlug));
    fetch(`/api/reactions?post=${encodeURIComponent(postSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        setCounts(data.counts ?? ZERO);
      })
      .catch(() => {
        /* keep zeros */
      });
  }, [postSlug]);

  async function onPick(emoji: EmojiType) {
    if (pending) return;
    const isUndoing = picked.has(emoji);
    setPending(emoji);

    // Optimistic count update + picked-set update + storage mirror.
    setCounts((c) => ({
      ...c,
      [emoji]: Math.max(0, c[emoji] + (isUndoing ? -1 : 1)),
    }));
    const next = new Set(picked);
    if (isUndoing) next.delete(emoji);
    else next.add(emoji);
    setPicked(next);
    writePickedToStorage(postSlug, next);

    try {
      const res = await fetch("/api/reactions", {
        method: isUndoing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: postSlug, emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.counts) setCounts(data.counts);
      } else {
        // Roll back optimistic update on server error.
        setCounts((c) => ({
          ...c,
          [emoji]: Math.max(0, c[emoji] + (isUndoing ? 1 : -1)),
        }));
        const revert = new Set(picked);
        if (isUndoing) revert.add(emoji);
        else revert.delete(emoji);
        setPicked(revert);
        writePickedToStorage(postSlug, revert);
      }
    } catch {
      /* swallow — optimistic count stays */
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="not-prose my-12 rounded-2xl border border-border-primary bg-bg-secondary/30 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        How did this read?
      </p>
      <div className="flex flex-wrap gap-2">
        {EMOJIS.map(({ type, label, symbol }) => {
          const isPicked = picked.has(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => onPick(type)}
              disabled={pending !== null && pending !== type}
              aria-pressed={isPicked}
              aria-label={isPicked ? `Remove ${label} reaction` : `React with ${label}`}
              title={isPicked ? "Click again to take it back" : `React with ${label}`}
              className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
                isPicked
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:border-rose-400/60 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                  : "border-border-primary bg-bg-primary text-text-secondary hover:border-indigo-400 hover:text-indigo-700"
              } ${pending === type ? "opacity-60" : ""}`}
            >
              <span aria-hidden className="text-base leading-none">
                {symbol}
              </span>
              <span className="hidden font-medium sm:inline">{label}</span>
              <span className="rounded-full bg-border-primary/40 px-2 py-0.5 font-mono text-[11px] tabular-nums">
                {counts[type]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
