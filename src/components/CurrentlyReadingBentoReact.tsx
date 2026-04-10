import { motion } from "framer-motion";

type CurrentlyReading = {
  title: string;
  author: string;
  cover: string;
  url?: string;
};

const DEFAULT: CurrentlyReading = {
  title: "On Intelligence",
  author: "Jeff Hawkins",
  cover: "https://m.media-amazon.com/images/I/71lVIKzk9TL._AC_UF1000,1000_QL80_.jpg",
  url: "https://www.amazon.com/Intelligence-Jeff-Hawkins/dp/0805078533",
};

export function CurrentlyReadingBentoReact({
  book = DEFAULT,
}: {
  book?: CurrentlyReading;
}) {
  const content = (
    <div className="group relative flex h-full flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 transition-colors hover:bg-white">
      <div className="user-select-none pointer-events-none absolute inset-0 z-30 rounded-2xl bg-gradient-to-tl from-amber-400/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />

      {/* Header */}
      <div className="relative z-20 mb-3 flex items-start justify-between">
        <div>
          <h2 className="font-medium text-text-primary">Currently Reading</h2>
          <p className="text-xs text-text-tertiary">on the nightstand</p>
        </div>
        <span className="inline-flex h-6 items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2 font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
          Reading
        </span>
      </div>

      {/* Book display */}
      <div className="relative z-20 flex flex-1 items-center justify-center">
        <motion.div
          className="relative"
          initial={{ rotate: 0 }}
          whileHover={{ rotate: -3, y: -6 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {/* Book shadow */}
          <div className="absolute inset-x-2 -bottom-2 h-4 rounded-xl bg-black/10 blur-lg dark:bg-black/30" />

          {/* Book cover */}
          <div className="relative overflow-hidden rounded-lg shadow-xl">
            {/* Spine highlight */}
            <div className="absolute inset-y-0 left-0 z-10 w-[6px] bg-gradient-to-r from-black/20 to-transparent" />
            <img
              src={book.cover}
              alt={`${book.title} by ${book.author}`}
              className="h-[180px] w-auto rounded-lg object-cover"
            />
          </div>
        </motion.div>
      </div>

      {/* Title + author */}
      <div className="relative z-20 mt-3 text-center">
        <p className="text-sm font-semibold text-text-primary">{book.title}</p>
        <p className="text-xs text-text-tertiary">by {book.author}</p>
      </div>
    </div>
  );

  return book.url ? (
    <a
      href={book.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"
      data-umami-event="currently-reading-click"
    >
      {content}
    </a>
  ) : (
    content
  );
}
