import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";

/**
 * Loading screen shown while Phaser boots and assets load.
 *
 * Three phases:
 * 1. Loading assets → progress bar fills (0-100%)
 * 2. Assets ready → "Press any key to start" prompt appears
 * 3. User presses key → onStart fires (starts BGM), screen fades out
 *
 * Design matches the site's aesthetic (Geist font, purple accents,
 * border-primary), transitioning into the pixel-art game world.
 */
export function GameLoadingScreen({
  progress = 0,
  assetsReady = false,
  isComplete = false,
  onStart,
}: {
  progress: number;
  assetsReady: boolean;
  isComplete: boolean;
  onStart?: () => void;
}) {
  const [shouldHide, setShouldHide] = useState(false);

  // When assets are ready, listen for any key/click to start
  const handleStart = useCallback(() => {
    if (!assetsReady || isComplete) return;
    onStart?.();
  }, [assetsReady, isComplete, onStart]);

  useEffect(() => {
    if (!assetsReady || isComplete) return;

    const onKey = () => handleStart();
    const onClick = () => handleStart();
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [assetsReady, isComplete, handleStart]);

  // After completion, wait a beat then fade out
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setShouldHide(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  return (
    <AnimatePresence>
      {!shouldHide && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary"
        >
          {/* Dot pattern background */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(var(--color-border-primary)/0.3)_1px,transparent_2px)] [background-size:20px_20px]" />

          <div className="relative z-10 flex flex-col items-center px-6">
            {/* Gamepad icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mb-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border-primary bg-bg-primary shadow-lg">
                <svg
                  className="h-8 w-8 text-purple-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="6" x2="10" y1="11" y2="11" />
                  <line x1="8" x2="8" y1="9" y2="13" />
                  <line x1="15" x2="15.01" y1="12" y2="12" />
                  <line x1="18" x2="18.01" y1="10" y2="10" />
                  <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z" />
                </svg>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-2 text-center text-2xl font-medium tracking-tight text-text-primary"
            >
              Explore Mode
            </motion.h1>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-8 text-center text-sm text-text-secondary"
            >
              {assetsReady ? "World ready" : "Loading the world..."}
            </motion.p>

            {/* Progress bar */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-3 h-2 overflow-hidden rounded-full border border-border-primary bg-bg-primary"
              style={{ width: 240 }}
            >
              <motion.div
                className="h-full rounded-full bg-purple-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </motion.div>

            {/* Status text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="font-mono text-xs tabular-nums text-text-tertiary"
            >
              {assetsReady ? "100%" : `${Math.round(progress)}%`}
            </motion.p>

            {/* "Press any key" prompt — appears when assets are loaded */}
            <AnimatePresence>
              {assetsReady && !isComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: [0.4, 1, 0.4], y: 0 }}
                  transition={{
                    opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: 0.3 },
                  }}
                  className="mt-10 text-center"
                >
                  <p className="font-mono text-sm uppercase tracking-widest text-purple-primary">
                    Press any key to start
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls — shown during loading */}
            {!assetsReady && progress > 30 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[10px] uppercase tracking-widest text-text-tertiary"
              >
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-border-primary bg-bg-primary px-1.5 py-0.5 font-mono text-[10px]">Arrows</kbd>
                  Move
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-border-primary bg-bg-primary px-1.5 py-0.5 font-mono text-[10px]">Shift</kbd>
                  Run
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-border-primary bg-bg-primary px-1.5 py-0.5 font-mono text-[10px]">A</kbd>
                  <span className="text-text-tertiary/50">/</span>
                  <kbd className="rounded border border-border-primary bg-bg-primary px-1.5 py-0.5 font-mono text-[10px]">Space</kbd>
                  Interact
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-border-primary bg-bg-primary px-1.5 py-0.5 font-mono text-[10px]">S</kbd>
                  <span className="text-text-tertiary/50">/</span>
                  <kbd className="rounded border border-border-primary bg-bg-primary px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
                  <span className="text-text-tertiary/50">/</span>
                  <kbd className="rounded border border-border-primary bg-bg-primary px-1.5 py-0.5 font-mono text-[10px]">Backspace</kbd>
                  Back
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-border-primary bg-bg-primary px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
                  <span className="text-text-tertiary/50">/</span>
                  <kbd className="rounded border border-border-primary bg-bg-primary px-1.5 py-0.5 font-mono text-[10px]">M</kbd>
                  Menu
                </span>
              </motion.div>
            )}
          </div>

          {/* Decorative glyphs */}
          <span className="absolute bottom-6 left-8 text-zinc-300 dark:text-zinc-700">
            <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
              <path opacity="0.5" d="M0.827592 6.88352V6.01349C1.39104 6.01349 1.7838 5.89915 2.00586 5.67045C2.23124 5.43845 2.34393 5.06226 2.34393 4.5419V3.27415C2.34393 2.71401 2.41353 2.25497 2.55273 1.89702C2.69525 1.53906 2.9024 1.26065 3.17418 1.06179C3.44596 0.862926 3.7774 0.725378 4.1685 0.649147C4.5596 0.569602 5.00373 0.52983 5.50089 0.52983V1.91193C5.10979 1.91193 4.80984 1.96662 4.60103 2.07599C4.39222 2.18205 4.24805 2.34612 4.1685 2.56818C4.09227 2.79025 4.05415 3.07363 4.05415 3.41832V5.04901C4.05415 5.30421 4.01107 5.54285 3.92489 5.76491C3.83872 5.98698 3.68129 6.18253 3.45259 6.35156C3.2239 6.51728 2.89743 6.6482 2.47319 6.74432C2.05226 6.83712 1.50373 6.88352 0.827592 6.88352Z" fill="currentColor" />
            </svg>
          </span>
          <span className="absolute bottom-6 right-8 text-zinc-200 dark:text-zinc-800">
            <svg width="24" height="8" viewBox="0 0 24 8" fill="none">
              <rect width="24" height="8" rx="1" fill="currentColor" />
            </svg>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
