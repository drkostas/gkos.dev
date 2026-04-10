// People I Learn From — avatar grid widget

type Person = {
  name: string;
  role: string;
  url?: string;
  avatar?: string; // URL to avatar image
};

const DEFAULT_PEOPLE: Person[] = [
  { name: "Dr. Hairong Qi", role: "PhD Advisor, UTK", url: "https://scholar.google.com/citations?user=2HBSM2AAAAAJ" },
  { name: "Andrej Karpathy", role: "CS231n, Tesla AI", url: "https://karpathy.ai/" },
  { name: "Yann LeCun", role: "Meta AI, NYU", url: "https://yann.lecun.com/" },
  { name: "Kaiming He", role: "ResNet, MAE", url: "https://scholar.google.com/citations?user=DhtAFkwAAAAJ" },
  { name: "Jeremy Howard", role: "fast.ai", url: "https://www.fast.ai/" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-purple-500",
];

export function PeopleGridBentoReact({
  people = DEFAULT_PEOPLE,
}: {
  people?: Person[];
}) {
  return (
    <div className="group relative flex h-full min-h-[280px] flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 transition-colors hover:bg-white">
      <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-emerald-400/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />

      <div className="relative z-20 mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-medium text-text-primary">People I Learn From</h2>
          <p className="text-xs text-text-tertiary">researchers & engineers</p>
        </div>
      </div>

      <div className="relative z-20 flex flex-1 flex-col justify-center space-y-3">
        {people.map((person, i) => {
          const inner = (
            <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-border-primary/20">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${COLORS[i % COLORS.length]}`}
              >
                {getInitials(person.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {person.name}
                </p>
                <p className="truncate text-xs text-text-tertiary">{person.role}</p>
              </div>
              {person.url && (
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-text-tertiary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l10-10M7 7h10v10" />
                </svg>
              )}
            </div>
          );

          return person.url ? (
            <a
              key={i}
              href={person.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              data-umami-event={`people-${person.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {inner}
            </a>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
