import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

type StickerData = {
  src: string;
  width: number;
  caption: string;
};

const stickerRotations = [-6, 8, -4, 10, -8, 5];
const stickerYOffsets = [8, -6, 10, -8, 6, -4];

// Key tools and platforms that define the workflow.
const DEFAULT_STICKERS: StickerData[] = [
  {
    src: "https://cdn.simpleicons.org/pytorch",
    width: 72,
    caption: "PyTorch powers every paper — MEDiC, Cross-Scale MAE, MaskDistill.",
  },
  {
    src: "https://cdn.simpleicons.org/arxiv",
    width: 72,
    caption: "Daily reading list for ML and computer vision.",
  },
  {
    src: "https://api.iconify.design/logos:hugging-face-icon.svg",
    width: 72,
    caption: "Where I publish trained models and find pretrained backbones.",
  },
  {
    src: "https://cdn.simpleicons.org/openai",
    width: 72,
    caption: "CLIP and GPT changed how I think about multi-modal AI.",
  },
  {
    src: "https://cdn.simpleicons.org/googlescholar",
    width: 60,
    caption: "102+ citations. The scoreboard that keeps me publishing.",
  },
  {
    src: "https://cdn.simpleicons.org/python",
    width: 72,
    caption: "7 PyPI packages, 10 papers, every side project.",
  },
];

function Sticker({
  sticker,
  index,
}: {
  sticker: StickerData;
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const rotation = stickerRotations[index % stickerRotations.length];
  const yOff = stickerYOffsets[index % stickerYOffsets.length];

  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: yOff }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 200 }}
    >
      <motion.div
        className="relative cursor-grab drop-shadow-md active:cursor-grabbing"
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragTransition={{ power: 0.1, bounceStiffness: 200 }}
        dragElastic={0.8}
        style={{ rotate: rotation }}
        whileHover={{ scale: 1.15, rotate: 0, zIndex: 50 }}
        whileDrag={{ scale: 1.2, zIndex: 100 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <img
          width={sticker.width}
          src={sticker.src}
          alt={sticker.caption.split(".")[0]}
          className="pointer-events-none select-none"
          draggable={false}
        />

        <AnimatePresence>
          {isHovered && sticker.caption && (
            <motion.div
              key="caption"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute left-1/2 top-full z-[100] mt-3 w-[180px] -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-center text-[10px] leading-snug text-white shadow-lg"
            >
              {sticker.caption}
              <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-zinc-900" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export function ScrapbookBentoReact({
  stickers = DEFAULT_STICKERS,
}: {
  stickers?: StickerData[];
}) {
  return (
    <div className="group relative flex h-full min-h-[260px] flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 transition-colors hover:bg-white">
      <div className="user-select-none pointer-events-none absolute inset-0 z-30 rounded-2xl bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />

      {/* Dot pattern bg — uses CSS custom property so it adapts to dark mode */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(rgb(var(--color-border-primary)/0.4)_1px,transparent_2px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,black_40%,transparent_100%)]" />

      <div className="relative z-20 mb-3 flex items-start justify-between">
        <div>
          <h2 className="font-medium text-text-primary">Scrapbook</h2>
          <p className="text-xs text-text-tertiary">tools of the trade</p>
        </div>
      </div>

      {/* Sticker grid — overflow visible so tooltips aren't clipped */}
      <div className="relative z-20 flex flex-1 items-center justify-center overflow-visible">
        <div className="grid w-full grid-cols-3 gap-6 px-2 lg:grid-cols-6 lg:gap-4">
          {stickers.map((s, i) => (
            <Sticker key={i} sticker={s} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
