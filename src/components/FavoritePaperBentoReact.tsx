import { motion } from "framer-motion";

type Paper = {
  title: string;
  authors: string;
  venue: string;
  year: number;
  url: string;
  abstract?: string;
};

const DEFAULT_PAPER: Paper = {
  title: "Masked Autoencoders Are Scalable Vision Learners",
  authors: "Kaiming He, Xinlei Chen, Saining Xie, Yanghao Li, Piotr Dollar, Ross Girshick",
  venue: "CVPR 2022",
  year: 2022,
  url: "https://arxiv.org/abs/2111.06377",
  abstract:
    "This paper shows that masked autoencoders (MAE) are scalable self-supervised learners for computer vision. Our approach masks random patches of the input image and reconstructs the missing pixels.",
};

export function FavoritePaperBentoReact({
  paper = DEFAULT_PAPER,
}: {
  paper?: Paper;
}) {
  return (
    <a
      href={paper.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"

    >
      <div className="group relative flex h-full flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 transition-colors hover:bg-white">
        <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-rose-400/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />

        {/* Header */}
        <div className="relative z-20 mb-3 flex items-start justify-between">
          <div>
            <h2 className="font-medium text-text-primary">Favorite Paper</h2>
            <p className="text-xs text-text-tertiary">the one I keep re-reading</p>
          </div>
          <span className="inline-flex h-6 items-center rounded-full border border-rose-400/40 bg-rose-500/10 px-2 font-mono text-[10px] uppercase tracking-widest text-rose-500">
            {paper.venue}
          </span>
        </div>

        {/* Paper card — mimics a printed paper */}
        <div className="relative z-20 flex-1">
          <motion.div
            className="relative h-full"
            initial={{ y: 0, rotate: 0 }}
            whileHover={{ y: -4, rotate: -1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Paper shadow layers */}
            <div className="absolute inset-x-1 bottom-0 top-1 rounded-lg bg-border-primary/20" />
            <div className="absolute inset-x-0.5 bottom-0.5 top-0.5 rounded-lg bg-border-primary/10" />

            {/* Main paper */}
            <div className="relative rounded-lg border border-border-primary bg-white p-5 shadow-sm dark:bg-[rgb(var(--color-surface))]">
              {/* Red accent line (like journal header) */}
              <div className="mb-4 h-0.5 w-12 rounded-full bg-rose-400" />

              <h3 className="mb-2 text-sm font-semibold leading-snug text-text-primary">
                {paper.title}
              </h3>

              <p className="mb-3 text-[11px] leading-tight text-text-tertiary">
                {paper.authors}
              </p>

              {paper.abstract && (
                <p className="line-clamp-3 text-xs leading-relaxed text-text-secondary">
                  {paper.abstract}
                </p>
              )}

              {/* Bottom meta */}
              <div className="mt-4 flex items-center justify-between border-t border-border-primary/50 pt-3">
                <span className="font-mono text-[10px] text-text-tertiary">
                  {paper.venue} {paper.year}
                </span>
                <span className="flex items-center text-[10px] font-medium text-rose-500">
                  Read on arXiv
                  <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l10-10M7 7h10v10" />
                  </svg>
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </a>
  );
}
