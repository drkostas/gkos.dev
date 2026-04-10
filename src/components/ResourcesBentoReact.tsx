type Resource = {
  name: string;
  description: string;
  url: string;
  icon: string; // simple-icons or iconify URL
};

const DEFAULT_RESOURCES: Resource[] = [
  { name: "arXiv", description: "Daily reading list", url: "https://arxiv.org/", icon: "https://cdn.simpleicons.org/arxiv" },
  { name: "Papers With Code", description: "Benchmarks + code", url: "https://paperswithcode.com/", icon: "https://cdn.simpleicons.org/paperswithcode" },
  { name: "Yannic Kilcher", description: "Paper walkthroughs", url: "https://www.youtube.com/@YannicKilcher", icon: "https://cdn.simpleicons.org/youtube/ff0000" },
  { name: "Two Minute Papers", description: "AI research highlights", url: "https://www.youtube.com/@TwoMinutePapers", icon: "https://cdn.simpleicons.org/youtube/ff0000" },
  { name: "Lex Fridman", description: "Long-form interviews", url: "https://lexfridman.com/podcast/", icon: "https://cdn.simpleicons.org/spotify/1db954" },
];

export function ResourcesBentoReact({
  resources = DEFAULT_RESOURCES,
}: {
  resources?: Resource[];
}) {
  return (
    <div className="group relative flex h-full min-h-[280px] flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 transition-colors hover:bg-white">
      <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-purple-400/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />

      <div className="relative z-20 mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-medium text-text-primary">Where I Stay Current</h2>
          <p className="text-xs text-text-tertiary">daily reads & listens</p>
        </div>
      </div>

      <div className="relative z-20 flex flex-1 flex-col justify-center space-y-2">
        {resources.map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-border-primary/20"
            data-umami-event={`resource-${r.name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-border-primary/20">
              <img
                src={r.icon}
                alt={r.name}
                className="h-4 w-4"
                loading="lazy"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{r.name}</p>
              <p className="truncate text-xs text-text-tertiary">{r.description}</p>
            </div>
            <svg
              className="h-3.5 w-3.5 shrink-0 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l10-10M7 7h10v10" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
