/**
 * Inspirations page widgets. Shared chrome (rounded-2xl card, hover overlay,
 * external-link arrow, header pattern) lives here once instead of being
 * copied across multiple files.
 *
 * Six widgets exported:
 *   <BookshelfGridReact />        — visual cover grid, 3×2
 *   <PeopleAvatarGridReact />     — circular avatars + name + role rows
 *   <ChannelsBentoReact />        — YouTube channels with avatars
 *   <PodcastsBentoReact />        — podcast covers
 *   <NewslettersBentoReact />     — newsletter wordmarks
 *   <BlogsBentoReact />           — blogs + communities with logos
 *
 * Every widget takes its data via props with sensible defaults, so the
 * inspirations.astro page can pass curated lists in.
 */

import { motion } from "framer-motion";

// ----------------------------------------------------------------------------
// Shared chrome
// ----------------------------------------------------------------------------

type Accent = "indigo" | "emerald" | "amber" | "rose" | "purple" | "sky";

const ACCENT_OVERLAY: Record<Accent, string> = {
  indigo: "from-indigo-400/15",
  emerald: "from-emerald-400/15",
  amber: "from-amber-400/15",
  rose: "from-rose-400/15",
  purple: "from-purple-400/15",
  sky: "from-sky-400/15",
};

const ACCENT_BADGE: Record<Accent, string> = {
  indigo: "border-indigo-400/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  emerald: "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "border-rose-400/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  purple: "border-purple-400/40 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  sky: "border-sky-400/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

function CardShell({
  accent,
  heading,
  subhead,
  badge,
  children,
  bodyClassName = "",
}: {
  accent: Accent;
  heading: string;
  subhead?: string;
  badge?: string;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-primary p-6 transition-colors hover:bg-white">
      <div
        className={`user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl ${ACCENT_OVERLAY[accent]} via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100`}
      />
      <div className="relative z-20 mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-medium text-text-primary">{heading}</h2>
          {subhead && <p className="text-xs text-text-tertiary">{subhead}</p>}
        </div>
        {badge && (
          <span
            className={`inline-flex h-6 items-center rounded-full border px-2 font-mono text-[10px] uppercase tracking-widest ${ACCENT_BADGE[accent]}`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className={`relative z-20 flex-1 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

function ExternalArrow() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover/row:opacity-100"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l10-10M7 7h10v10" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// 1. Bookshelf — visual cover grid
// ----------------------------------------------------------------------------

export type Book = {
  title: string;
  author: string;
  cover: string; // path under /public
  url: string;
};

const DEFAULT_BOOKS: Book[] = [
  { title: "Pattern Recognition and Machine Learning", author: "Christopher M. Bishop", cover: "/inspirations/book-prml.jpg", url: "https://link.springer.com/book/9780387310732" },
  { title: "Deep Learning", author: "Goodfellow, Bengio, Courville", cover: "/inspirations/book-deep-learning.jpg", url: "https://www.deeplearningbook.org" },
  { title: "Fundamentals of Computer Vision", author: "Wesley E. Snyder & Hairong Qi", cover: "/inspirations/book-snyder.jpg", url: "https://www.cambridge.org/highereducation/books/fundamentals-of-computer-vision/F95B5B57C8FA12CAEFD06EBEDE05C8FB" },
  { title: "On Intelligence", author: "Jeff Hawkins", cover: "/inspirations/book-on-intelligence.jpg", url: "https://us.macmillan.com/books/9780805078534/onintelligence" },
  { title: "A Thousand Brains", author: "Jeff Hawkins", cover: "/inspirations/a-thousand-brains.jpg", url: "https://www.basicbooks.com/titles/jeff-hawkins/a-thousand-brains/9781541675810/" },
  { title: "How to Create a Mind", author: "Ray Kurzweil", cover: "/inspirations/book-how-to-create-mind.jpg", url: "https://www.penguinrandomhouse.com/books/308759/how-to-create-a-mind-by-ray-kurzweil/" },
];

export function BookshelfGridReact({ books = DEFAULT_BOOKS }: { books?: Book[] }) {
  return (
    <CardShell
      accent="amber"
      heading="Bookshelf"
      subhead="books that shaped my thinking"
      badge={`${books.length} books`}
    >
      {/* 6 books in one row at lg+ (1 row of 6). On smaller screens stays 3-col so
          covers don't get too small to read. Each cover is much smaller than the
          previous 3-col layout — reads as a shelf row, not a feature grid. */}
      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
        {books.map((book, i) => (
          <a
            key={i}
            href={book.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/book relative block"
          >
            <motion.div
              whileHover={{ y: -4, rotate: -1 }}
              transition={{ type: "spring", stiffness: 250, damping: 18 }}
              className="relative aspect-[2/3] overflow-hidden rounded-md shadow-md ring-1 ring-black/5"
            >
              <img
                src={book.cover}
                alt={`${book.title} cover`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {/* Title + author overlay on hover */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/85 via-black/70 to-transparent px-2 py-1.5 transition-transform duration-200 ease-out group-hover/book:translate-y-0">
                <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white">
                  {book.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[9px] text-white/70">{book.author}</p>
              </div>
            </motion.div>
          </a>
        ))}
      </div>
    </CardShell>
  );
}

// ----------------------------------------------------------------------------
// 2. People avatar grid (used for Mentors and Researchers)
// ----------------------------------------------------------------------------

export type Person = {
  name: string;
  role: string;
  avatar: string;
  url?: string;
};

export function PeopleAvatarGridReact({
  people,
  heading,
  subhead,
  accent = "emerald",
}: {
  people: Person[];
  heading: string;
  subhead?: string;
  accent?: Accent;
}) {
  return (
    <CardShell accent={accent} heading={heading} subhead={subhead}>
      <div className="space-y-2.5">
        {people.map((person, i) => {
          const inner = (
            <div className="group/row flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-border-primary/20">
              <img
                src={person.avatar}
                alt={person.name}
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border-primary"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{person.name}</p>
                <p className="truncate text-xs text-text-tertiary">{person.role}</p>
              </div>
              {person.url && <ExternalArrow />}
            </div>
          );
          return person.url ? (
            <a
              key={i}
              href={person.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {inner}
            </a>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </CardShell>
  );
}

// ----------------------------------------------------------------------------
// 3. Generic icon-row widget (Channels, Podcasts, Newsletters, Blogs)
// ----------------------------------------------------------------------------

export type IconItem = {
  name: string;
  description?: string;
  icon: string; // path under /public or full URL
  url: string;
  /** "cover" (default) for face/avatar/cover art; "contain" for wordmark logos with whitespace */
  fit?: "cover" | "contain";
  /** Background color behind the icon — useful for transparent SVGs that need contrast */
  iconBg?: string;
};

export function IconRowsBentoReact({
  items,
  heading,
  subhead,
  badge,
  accent,
}: {
  items: IconItem[];
  heading: string;
  subhead?: string;
  badge?: string;
  accent: Accent;
}) {
  return (
    <CardShell accent={accent} heading={heading} subhead={subhead} badge={badge}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="group/row flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-border-primary/20">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border-primary"
                style={{ background: item.iconBg ?? "#FFFFFF" }}
              >
                <img
                  src={item.icon}
                  alt=""
                  className={`h-full w-full ${item.fit === "contain" ? "object-contain p-1" : "object-cover"}`}
                  loading="lazy"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
                {item.description && (
                  <p className="truncate text-xs text-text-tertiary">{item.description}</p>
                )}
              </div>
              <ExternalArrow />
            </div>
          </a>
        ))}
      </div>
    </CardShell>
  );
}
