import { useMemo, useState } from "react";

type StreamKey = "blog" | "changelog" | "publications" | "projects";

const STREAMS: { key: StreamKey; label: string }[] = [
  { key: "blog", label: "Blog posts" },
  { key: "changelog", label: "Site updates" },
  { key: "publications", label: "Publications" },
  { key: "projects", label: "Projects" },
];

const BASE_PATH = "/rss.xml";

function buildFeedUrl(selected: Set<StreamKey>, origin: string) {
  const allOn = STREAMS.every((s) => selected.has(s.key));
  if (allOn) return `${origin}${BASE_PATH}`;
  const params = Array.from(selected).join(",");
  return `${origin}${BASE_PATH}?include=${params}`;
}

export function RSSSubscribeCard({
  siteUrl,
  title = "Subscribe via RSS",
  description = "Stay in the loop. Posts, papers, projects, and site updates.",
}: {
  siteUrl: string;
  title?: string;
  description?: string;
}) {
  const [selected, setSelected] = useState<Set<StreamKey>>(
    () => new Set(STREAMS.map((s) => s.key)),
  );
  const [copied, setCopied] = useState(false);

  const feedUrl = useMemo(
    () => buildFeedUrl(selected, siteUrl),
    [selected, siteUrl],
  );
  const anySelected = selected.size > 0;

  function toggle(key: StreamKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleCopy() {
    if (!anySelected) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent: user can still select+copy from the input manually.
    }
  }

  const pillChecked =
    "border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-400/60 dark:bg-indigo-500/25 dark:text-indigo-100";
  const pillUnchecked =
    "border-border-primary bg-transparent text-text-tertiary hover:border-text-secondary hover:text-text-primary";

  return (
    <div className="w-full">
      <div className="group relative overflow-hidden rss-card-light rounded-2xl border border-border-primary p-6 md:p-8 transition-colors hover:border-indigo-300/60">
        <div className="user-select-none pointer-events-none absolute inset-0 z-0 bg-gradient-to-tl from-indigo-400/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
        <div className="relative z-10 mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6.18 15.64a2.18 2.18 0 012.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 012.18-2.18M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44m0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {title}
            </h2>
            <p className="text-xs text-text-secondary">{description}</p>
          </div>
        </div>

        <div className="relative z-10 mb-6 flex flex-wrap gap-2">
          {STREAMS.map((s) => {
            const checked = selected.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                aria-pressed={checked}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 " +
                  (checked ? pillChecked : pillUnchecked)
                }
              >
                {checked && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="relative z-10 flex max-w-[580px] flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-text-tertiary"
              aria-hidden="true"
            >
              ↳
            </span>
            <input
              type="text"
              readOnly
              value={
                anySelected
                  ? feedUrl
                  : "Pick at least one stream to get a feed URL"
              }
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-full border border-border-primary bg-bg-primary py-3 pl-8 pr-4 font-mono text-xs text-text-primary focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              disabled={!anySelected}
            />
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!anySelected}

            className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-100 px-5 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600"
          >
            {copied ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy link
              </>
            )}
          </button>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-tertiary">
          <span>Paste into Feedly, Reeder, NetNewsWire, or Inoreader.</span>
          {anySelected && (
            <a
              href={feedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Preview the feed
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
