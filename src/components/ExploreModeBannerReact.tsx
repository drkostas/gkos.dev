import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type Sparkle = { id: number; x: number; y: number };

// Ambient (idle) spawns: random twinkles across the card whenever the mouse is
// NOT actively moving — outside the card, or inside but stationary.
const IDLE_SPAWN_MS = 1800; // slower ambient base frequency

// Each sparkle lives and fades on its own fixed schedule. Mouse movement only
// affects WHERE and HOW OFTEN new sparkles are created — never the light-up /
// light-down speed of an individual dot.
const SPARKLE_LIFESPAN_MS = 3000;

// Trail mode (active movement): spawn along the mouse path.
// Time-throttled so the spawn count is ~1/10 of the raw mousemove rate, with
// optional interpolation filling in fast flicks between throttle windows.
const TRAIL_MIN_MOVE_PX = 1; // any perceptible movement triggers a spawn
const TRAIL_POINT_SPACING_PX = 120; // wide interpolation spacing (fast-flick fill)
const TRAIL_JITTER_PX = 60; // random offset per point — wide scatter radius
const MIN_SPAWN_INTERVAL_MS = 300; // hard floor between trail spawns — even sparser trail

// How long to wait after the last mousemove before switching back to idle mode.
const MOVEMENT_IDLE_TIMEOUT_MS = 80;

/**
 * Big promotional banner for explore mode.
 * Visually mirrors the ContactCompactReact card chrome (drama shadow, dark bg, decorative lines)
 * but themed around the Pokemon/gaming concept.
 *
 * Mouse interactions: sparkles twinkle at random positions at a base frequency.
 * When the mouse enters the card, the spawn frequency picks up and new sparkles
 * cluster closer to the cursor position.
 */
export function ExploreModeBannerReact() {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  // Whether the cursor is ACTIVELY moving. Stationary cursor (inside or outside
  // the card) counts as false, which means the idle spawner runs.
  const [isMoving, setIsMoving] = useState(false);
  // Ref to the motion card so we can read its bounding rect from a window-level listener.
  const cardRef = useRef<HTMLDivElement>(null);
  // Last spawn position stored in raw pixels (relative to the card), -1 when reset.
  // lastSpawnTime is used for the rate throttle.
  const trailRef = useRef({ lastX: -1, lastY: -1, lastSpawnTime: 0 });
  const moveTimerRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);

  // Spawn a single sparkle at a normalized position (0-100 percentages).
  const spawnSparkle = useCallback((x: number, y: number) => {
    const id = nextIdRef.current++;
    setSparkles((prev) => [...prev, { id, x, y }]);
    window.setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => s.id !== id));
    }, SPARKLE_LIFESPAN_MS);
  }, []);

  // Window-level mouse tracking — more robust than React synthetic events
  // because it works regardless of when the component hydrates. Detection is
  // purely geometric: we hit-test the cursor against the card's bounding rect
  // on every mousemove. Enter/leave transitions are computed from a local
  // `wasInside` flag, not from browser mouseenter/mouseleave events.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let wasInside = false;

    function markMoving() {
      setIsMoving(true);
      if (moveTimerRef.current !== null) {
        window.clearTimeout(moveTimerRef.current);
      }
      moveTimerRef.current = window.setTimeout(() => {
        setIsMoving(false);
        moveTimerRef.current = null;
      }, MOVEMENT_IDLE_TIMEOUT_MS);
    }

    function spawnJittered(relX: number, relY: number, rect: DOMRect) {
      const jx = (Math.random() - 0.5) * TRAIL_JITTER_PX * 2;
      const jy = (Math.random() - 0.5) * TRAIL_JITTER_PX * 2;
      spawnSparkle(
        clamp(((relX + jx) / rect.width) * 100, 1, 99),
        clamp(((relY + jy) / rect.height) * 100, 1, 99),
      );
    }

    function processPosition(clientX: number, clientY: number) {
      const rect = card!.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const inside =
        relX >= 0 && relX <= rect.width && relY >= 0 && relY <= rect.height;
      const trail = trailRef.current;
      const now = performance.now();

      if (!inside) {
        if (wasInside) {
          // Leaving — reset trail and flip to idle immediately.
          trail.lastX = -1;
          trail.lastY = -1;
          trail.lastSpawnTime = 0;
          if (moveTimerRef.current !== null) {
            window.clearTimeout(moveTimerRef.current);
            moveTimerRef.current = null;
          }
          setIsMoving(false);
          wasInside = false;
        }
        return;
      }

      if (!wasInside) {
        // Entering — spawn one sparkle at the cursor IMMEDIATELY, bypassing
        // the rate throttle. This happens on the very first mousemove that
        // crosses the card boundary.
        wasInside = true;
        markMoving();
        spawnJittered(relX, relY, rect);
        trail.lastX = relX;
        trail.lastY = relY;
        trail.lastSpawnTime = now;
        return;
      }

      // Moving inside — run the normal trail logic with throttle.
      markMoving();

      const dx = relX - trail.lastX;
      const dy = relY - trail.lastY;
      const distance = Math.hypot(dx, dy);

      if (distance < TRAIL_MIN_MOVE_PX) return;
      if (now - trail.lastSpawnTime < MIN_SPAWN_INTERVAL_MS) return;

      if (distance < TRAIL_POINT_SPACING_PX) {
        spawnJittered(relX, relY, rect);
      } else {
        const steps = Math.floor(distance / TRAIL_POINT_SPACING_PX);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          spawnJittered(trail.lastX + dx * t, trail.lastY + dy * t, rect);
        }
      }

      trail.lastX = relX;
      trail.lastY = relY;
      trail.lastSpawnTime = now;
    }

    function onWindowMouseMove(e: MouseEvent) {
      processPosition(e.clientX, e.clientY);
    }

    window.addEventListener("mousemove", onWindowMouseMove, { passive: true });

    // Catch the "cursor was already over the card at hydration" case by
    // checking CSS :hover state on mount. We don't have exact coords in that
    // scenario, so we seed the trail at the card center — the next real
    // mousemove will correct it instantly.
    if (card.matches(":hover")) {
      const rect = card.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      wasInside = true;
      markMoving();
      spawnJittered(cx, cy, rect);
      trailRef.current.lastX = cx;
      trailRef.current.lastY = cy;
      trailRef.current.lastSpawnTime = performance.now();
    }

    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      if (moveTimerRef.current !== null) {
        window.clearTimeout(moveTimerRef.current);
        moveTimerRef.current = null;
      }
    };
  }, [spawnSparkle]);

  // Idle ambient spawner — runs whenever the mouse is NOT actively moving.
  // Covers: mouse outside the card, mouse inside but still, or never hovered.
  useEffect(() => {
    if (isMoving) return;

    const timer = window.setInterval(() => {
      const x = 5 + Math.random() * 90;
      const y = 5 + Math.random() * 90;
      spawnSparkle(x, y);
    }, IDLE_SPAWN_MS);

    return () => window.clearInterval(timer);
  }, [isMoving, spawnSparkle]);

  return (
    <div className="relative pb-16">
      <div className="relative w-full before:absolute before:top-0 before:h-px before:bg-border-primary/50 before:-left-4 before:right-[-1rem] md:before:-left-8 md:before:right-[-2rem] lg:before:inset-x-0 after:-left-4 after:right-[-1rem] md:after:-left-8 md:after:right-[-2rem] lg:after:inset-x-0 after:absolute after:bottom-0 after:h-px after:bg-border-primary/50">
        <div className="relative overflow-x-clip">
          <a href="/explore" className="group relative block" data-umami-event="explore-banner-click">
            <motion.div
              ref={cardRef}
              className="rss-card-light drama-shadow relative overflow-hidden rounded-2xl border border-border-primary p-14 transition-colors hover:border-indigo-300/60 md:p-[100px]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
            {/* Lines */}
            <div className="pointer-events-none absolute left-0 right-0 top-[34px] z-10 h-px w-full bg-border-primary md:top-[48px]" />
            <div className="pointer-events-none absolute bottom-0 right-[34px] top-0 z-10 h-full w-px bg-border-primary md:right-[48px]" />
            <div className="pointer-events-none absolute bottom-[34px] left-0 right-0 z-10 h-px w-full bg-border-primary md:bottom-[48px]" />
            <div className="pointer-events-none absolute bottom-0 left-[34px] top-0 z-10 h-full w-px bg-border-primary md:left-[48px]" />

            {/* Crosses */}
            <div className="pointer-events-none absolute right-[44.5px] top-[48px] z-20 hidden h-px w-2 bg-indigo-300 md:block" />
            <div className="pointer-events-none absolute right-[48px] top-[44.5px] z-20 hidden h-2 w-px bg-indigo-300 md:block" />
            <div className="pointer-events-none absolute left-[44.5px] right-0 top-[48px] z-20 hidden h-px w-2 bg-indigo-300 md:block" />
            <div className="pointer-events-none absolute left-[48px] right-0 top-[44.5px] z-20 hidden h-2 w-px bg-indigo-300 md:block" />
            <div className="pointer-events-none absolute bottom-[48px] left-[44.5px] right-0 z-20 hidden h-px w-2 bg-indigo-300 md:block" />
            <div className="pointer-events-none absolute bottom-[44.5px] left-[48px] right-0 z-20 hidden h-2 w-px bg-indigo-300 md:block" />
            <div className="pointer-events-none absolute bottom-[48px] right-[44.5px] z-20 hidden h-px w-2 bg-indigo-300 md:block" />
            <div className="pointer-events-none absolute bottom-[44.5px] right-[48px] z-20 hidden h-2 w-px bg-indigo-300 md:block" />

            {/* Secret-mode label */}
            <div className="relative z-30 mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-mono text-xs uppercase tracking-widest text-indigo-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              Secret Mode
            </div>

            <h2 className="relative z-30 mb-4 max-w-[520px] text-3xl font-medium leading-tight text-text-primary md:text-4xl">
              Try the playable version of my portfolio.
            </h2>
            <p className="relative z-30 mb-8 max-w-[480px] text-base leading-8 text-text-secondary md:mb-12">
              Walk around a pixel-art world where buildings are pages, Pokemon are my projects, and NPCs hand out my papers and blog posts. The portfolio you deserved.
            </p>

            {/* CTA button — matches the indigo Send button on the Get-in-Touch widget */}
            <div className="relative z-30 mb-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-100 px-5 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="6" x2="10" y1="11" y2="11" />
                  <line x1="8" x2="8" y1="9" y2="13" />
                  <line x1="15" x2="15.01" y1="12" y2="12" />
                  <line x1="18" x2="18.01" y1="10" y2="10" />
                  <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z" />
                </svg>
                Enter the world
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-1">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
                No install needed
              </span>
            </div>

            {/* Subtle scrolling dotted grid — "game world" map panning effect, indigo on light */}
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(99,102,241,0.45) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
              animate={{ backgroundPosition: ["0px 0px", "16px 16px"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />

            {/* Glow pulse behind the CTA button — soft indigo */}
            <motion.div
              className="pointer-events-none absolute left-[56px] bottom-[100px] z-0 h-24 w-56 rounded-full bg-indigo-300 blur-3xl md:left-[100px] md:bottom-[140px]"
              animate={{ opacity: [0.08, 0.22, 0.08], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Dynamic sparkle twinkles — indigo on light */}
            <AnimatePresence>
              {sparkles.map((s) => (
                <motion.span
                  key={s.id}
                  className="pointer-events-none absolute z-20 h-1.5 w-1.5 rounded-full bg-indigo-400"
                  style={{ top: `${s.y}%`, left: `${s.x}%` }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.3, 0],
                    boxShadow: [
                      "0 0 0 0 rgba(99, 102, 241, 0)",
                      "0 0 10px 2px rgba(99, 102, 241, 0.7)",
                      "0 0 0 0 rgba(99, 102, 241, 0)",
                    ],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: SPARKLE_LIFESPAN_MS / 1000, ease: "easeInOut" }}
                />
              ))}
            </AnimatePresence>
            </motion.div>
          </a>
        </div>
      </div>

      {/* Bottom decorative glyphs — use currentColor so they respond to theme.
          (Previously had hardcoded near-white fills that became bright artifacts in dark mode.) */}
      <span className="absolute bottom-6 left-8 text-zinc-300 dark:text-zinc-700">
        <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
          <path
            opacity="0.5"
            d="M0.827592 6.88352V6.01349C1.39104 6.01349 1.7838 5.89915 2.00586 5.67045C2.23124 5.43845 2.34393 5.06226 2.34393 4.5419V3.27415C2.34393 2.71401 2.41353 2.25497 2.55273 1.89702C2.69525 1.53906 2.9024 1.26065 3.17418 1.06179C3.44596 0.862926 3.7774 0.725378 4.1685 0.649147C4.5596 0.569602 5.00373 0.52983 5.50089 0.52983V1.91193C5.10979 1.91193 4.80984 1.96662 4.60103 2.07599C4.39222 2.18205 4.24805 2.34612 4.1685 2.56818C4.09227 2.79025 4.05415 3.07363 4.05415 3.41832V5.04901C4.05415 5.30421 4.01107 5.54285 3.92489 5.76491C3.83872 5.98698 3.68129 6.18253 3.45259 6.35156C3.2239 6.51728 2.89743 6.6482 2.47319 6.74432C2.05226 6.83712 1.50373 6.88352 0.827592 6.88352Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="absolute bottom-6 right-8 text-zinc-200 dark:text-zinc-800">
        <svg width="24" height="8" viewBox="0 0 24 8" fill="none">
          <rect width="24" height="8" rx="1" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
