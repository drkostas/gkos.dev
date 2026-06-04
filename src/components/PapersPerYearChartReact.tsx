// Papers per year — small bar chart visualizing publication output across years.

type YearPoint = { year: number; papers: number; citations: number };

const DEFAULT_DATA: YearPoint[] = [
  { year: 2019, papers: 1, citations: 3 },
  { year: 2020, papers: 0, citations: 0 },
  { year: 2021, papers: 0, citations: 0 },
  { year: 2022, papers: 0, citations: 0 },
  { year: 2023, papers: 2, citations: 85 },
  { year: 2024, papers: 3, citations: 14 },
  { year: 2025, papers: 2, citations: 0 },
  { year: 2026, papers: 2, citations: 0 },
];

export function PapersPerYearChartReact({
  data = DEFAULT_DATA,
  heading = "Output over time",
  subhead = "Papers and citations per year.",
}: {
  data?: YearPoint[];
  heading?: string;
  subhead?: string;
}) {
  const maxPapers = Math.max(1, ...data.map((d) => d.papers));
  const maxCit = Math.max(1, ...data.map((d) => d.citations));
  const totalPapers = data.reduce((s, d) => s + d.papers, 0);
  const totalCit = data.reduce((s, d) => s + d.citations, 0);

  return (
    <div className="rounded-2xl border border-border-primary bg-bg-primary p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-medium text-text-primary">{heading}</h2>
          <p className="text-xs text-text-tertiary">{subhead}</p>
        </div>
        <div className="font-mono text-xs text-text-tertiary">
          <span className="text-purple-primary">{totalPapers}</span> papers ·
          <span className="ml-1 text-purple-primary">{totalCit}+</span> citations
        </div>
      </div>

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d) => (
          <div key={d.year} className="flex flex-col items-center gap-2">
            <div className="relative flex h-32 w-full items-end gap-0.5">
              <div
                className="flex-1 rounded-t bg-purple-primary transition-opacity hover:opacity-80"
                style={{ height: `${(d.papers / maxPapers) * 100}%` }}
                title={`${d.papers} paper${d.papers === 1 ? "" : "s"}`}
              />
              <div
                className="flex-1 rounded-t bg-purple-secondary transition-opacity hover:opacity-80"
                style={{ height: `${(d.citations / maxCit) * 100}%` }}
                title={`${d.citations} citations`}
              />
            </div>
            <div className="font-mono text-[10px] text-text-tertiary">
              {String(d.year).slice(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-tertiary">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-purple-primary" />
          <span>Papers</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-purple-secondary" />
          <span>Citations</span>
        </div>
      </div>
    </div>
  );
}
