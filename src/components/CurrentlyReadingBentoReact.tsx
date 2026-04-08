export function CurrentlyReadingBentoReact() {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 hover:bg-white overflow-hidden h-full">
      <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
      <h2 className="mb-2 font-medium">Currently Reading</h2>
      <div className="relative h-full">
        <div className="absolute left-10 top-6 h-full origin-bottom-left transition-transform duration-300 ease-in-out group-hover:-rotate-3">
          <div className="relative aspect-video h-full w-96 overflow-hidden rounded bg-red-500">
            <div className="absolute left-5 h-full w-2 bg-slate-900/20 blur-sm" />
            <img src="/red_rising_cover.jpeg" alt="Red Rising book cover" className="h-full" />
          </div>
        </div>
      </div>
      {/* Gradient overlay */}
      <div className="absolute inset-0 h-full w-full bg-gradient-to-t from-white via-transparent to-transparent" />
    </div>
  );
}
