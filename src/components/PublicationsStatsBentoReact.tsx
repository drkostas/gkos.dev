// Publications stats bento — 4 metric cards: papers, citations, h-index, top venue.

type Stats = {
  papers: number;
  citations: number;
  hIndex: number;
  topVenue: string;
};

const DEFAULTS: Stats = {
  papers: 10,
  citations: 102,
  hIndex: 4,
  topVenue: "NeurIPS",
};

export function PublicationsStatsBentoReact({
  stats = DEFAULTS,
}: {
  stats?: Stats;
}) {
  const cards = [
    { value: stats.papers, label: "Papers", caption: "across 5 venues" },
    { value: `${stats.citations}+`, label: "Citations", caption: "live from OpenAlex" },
    { value: stats.hIndex, label: "h-index", caption: "papers with ≥h citations" },
    { value: stats.topVenue, label: "Top venue", caption: "by paper count" },
  ];
  return (
    <div className="rounded-2xl border border-border-primary bg-bg-primary p-6">
      <div className="mb-5">
        <h2 className="font-medium text-text-primary">Research at a glance</h2>
        <p className="text-xs text-text-tertiary">Numbers since 2019.</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <li
            key={c.label}
            className="flex flex-col rounded-xl border border-border-primary bg-white p-4"
          >
            <div className="text-3xl font-medium tracking-tight text-purple-primary">
              {c.value}
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
              {c.label}
            </div>
            <div className="mt-auto pt-2 text-xs text-text-tertiary">
              {c.caption}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
