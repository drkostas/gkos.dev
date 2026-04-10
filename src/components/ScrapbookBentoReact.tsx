import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";

const stickerRotations = [-8, 12, -5, 10];
const stickerYOffsets = [12, -8, 15, -10];

function Sticker({
  children,
  index = 1,
  caption,
}: {
  children: React.ReactNode;
  index: number;
  caption?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isCaptionVisible, setIsCaptionVisible] = useState(false);
  const initialRotation = stickerRotations[index % stickerRotations.length];
  const initialY = stickerYOffsets[index % stickerYOffsets.length];

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scale: 0.9, y: 10 },
        shown: { opacity: 1, scale: 1, y: initialY },
      }}
      style={{ zIndex: isDragging ? 1000 : undefined }}
      className="relative cursor-grab active:cursor-grabbing"
    >
      <motion.div
        className="flex-shrink-1 relative h-fit min-w-[96px] drop-shadow-lg"
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragTransition={{ power: 0.1, bounceStiffness: 200 }}
        dragElastic={0.8}
        style={{ rotate: initialRotation }}
        whileDrag={{ scale: 1.2, zIndex: 1000 }}
        onHoverStart={() => { setIsCaptionVisible(true); setIsDragging(true); }}
        onHoverEnd={() => { setIsCaptionVisible(false); setIsDragging(false); }}
        onDragEnd={() => { setIsCaptionVisible(false); setIsDragging(false); }}
      >
        <div className="pointer-events-none select-none">{children}</div>

        <AnimatePresence>
          {caption && isCaptionVisible && (
            <motion.div
              key="caption"
              initial={{ opacity: 0, y: -48, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 0.9 }}
              exit={{ opacity: 0, y: -48, scale: 0.5 }}
              style={{ left: "50%", x: "-50%" }}
              className="pointer-events-none absolute top-full z-10 mx-auto mt-2 min-w-[160px] max-w-screen-sm select-none text-balance rounded-sm bg-white/95 px-3 py-2 text-center text-[10px] text-black backdrop-blur-3xl"
            >
              {caption}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

type Sticker = {
  src: string;
  width: number;
  caption: string;
};

const DEFAULT_STICKERS: Sticker[] = [
  {
    src: "https://cdn.simpleicons.org/pytorch",
    width: 96,
    caption: "PyTorch has powered every paper I've published. MEDiC, Cross-Scale MAE, MaskDistill — all born on top of it.",
  },
  {
    // simple-icons doesn't render the HuggingFace logo cleanly, so pull it
    // from iconify's logos collection like we do in ConnectionsBentoReact.
    src: "https://api.iconify.design/logos:hugging-face-icon.svg",
    width: 96,
    caption: "HuggingFace is where I publish my trained models and the first place I look for pretrained backbones.",
  },
  {
    src: "https://cdn.simpleicons.org/python",
    width: 96,
    caption: "Python is the language I've shipped 7 PyPI packages in and the one I reach for first, every time.",
  },
  {
    src: "https://cdn.simpleicons.org/arxiv",
    width: 96,
    caption: "arXiv is my daily reading list. It's where I keep up with everything happening in ML.",
  },
];

export function ScrapbookBentoReact({
  stickers = DEFAULT_STICKERS,
}: {
  stickers?: Sticker[];
}) {
  const container = {
    hidden: { opacity: 0 },
    shown: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 hover:bg-white h-[220px]">
      <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
      <h2 className="mb-2 font-medium text-text-primary">Scrapbook</h2>
      <div className="absolute top-0 h-[220px] w-full overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_2px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,black_40%,transparent_100%)]" />
      <div className="w-full rounded-3xl p-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="shown"
          className="-mt-8 grid h-full w-full grid-cols-4 items-center gap-4"
        >
          {stickers.map((s, i) => (
            <Sticker key={i} caption={s.caption} index={i}>
              <img
                width={s.width}
                src={s.src}
                className="max-w-[100px] xs:max-w-none"
                draggable={false}
              />
            </Sticker>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
