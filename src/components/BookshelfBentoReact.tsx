import { motion } from "framer-motion";
import { useState } from "react";

type Book = {
  title: string;
  author: string;
  color: string; // tailwind bg class for the spine
  url?: string;
};

const DEFAULT_BOOKS: Book[] = [
  { title: "On Intelligence", author: "Jeff Hawkins", color: "bg-indigo-600", url: "https://www.amazon.com/Intelligence-Jeff-Hawkins/dp/0805078533" },
  { title: "Deep Learning", author: "Goodfellow et al.", color: "bg-sky-700", url: "https://www.deeplearningbook.org/" },
  { title: "DDIA", author: "Kleppmann", color: "bg-rose-600", url: "https://dataintensive.net/" },
  { title: "Pragmatic Programmer", author: "Hunt & Thomas", color: "bg-amber-600" },
  { title: "Thinking, Fast & Slow", author: "Kahneman", color: "bg-emerald-700" },
];

export function BookshelfBentoReact({
  books = DEFAULT_BOOKS,
}: {
  books?: Book[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-colors hover:bg-white">
      <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-amber-400/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />

      {/* Header */}
      <div className="relative z-20 mb-3 flex items-start justify-between">
        <div>
          <h2 className="font-medium text-text-primary">Bookshelf</h2>
          <p className="text-xs text-text-tertiary">books that shaped my thinking</p>
        </div>
        <span className="inline-flex h-6 items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2 font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
          {books.length} books
        </span>
      </div>

      {/* Bookshelf */}
      <div className="relative z-20 flex flex-1 items-end justify-center pb-2">
        {/* Shelf surface */}
        <div className="absolute bottom-0 left-0 right-0 h-3 rounded-b-lg bg-amber-900/20 dark:bg-amber-200/10" />
        <div className="absolute bottom-3 left-0 right-0 h-px bg-amber-900/10 dark:bg-amber-200/5" />

        {/* Books */}
        <div className="flex items-end gap-[6px]">
          {books.map((book, i) => {
            const isHovered = hoveredIdx === i;
            // Vary heights for visual interest
            const heights = [160, 148, 168, 142, 155];
            const h = heights[i % heights.length];

            const spine = (
              <motion.div
                key={i}
                className={`relative cursor-pointer rounded-sm ${book.color} shadow-md`}
                style={{ width: 44, height: h }}
                animate={{
                  y: isHovered ? -12 : 0,
                  rotateZ: isHovered ? -2 : 0,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Spine highlight */}
                <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-sm bg-white/20" />
                <div className="absolute inset-y-0 right-0 w-px bg-black/10" />

                {/* Title on spine (rotated) */}
                <div
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                  style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                >
                  <span className="rotate-180 truncate px-1 text-[9px] font-semibold leading-none tracking-wide text-white/90">
                    {book.title}
                  </span>
                </div>

                {/* Tooltip on hover */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-16 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-dark-primary px-3 py-2 text-center shadow-lg dark:bg-zinc-800"
                  >
                    <p className="text-xs font-semibold text-white">{book.title}</p>
                    <p className="text-[10px] text-gray-400">{book.author}</p>
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-dark-primary dark:bg-zinc-800" />
                  </motion.div>
                )}
              </motion.div>
            );

            return book.url ? (
              <a
                key={i}
                href={book.url}
                target="_blank"
                rel="noopener noreferrer"
                data-umami-event={`bookshelf-${book.title.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`}
              >
                {spine}
              </a>
            ) : (
              spine
            );
          })}
        </div>
      </div>
    </div>
  );
}
