import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Approximate half-height of one changelog entry. The fill's bottom edge tracks
// (viewport center + this offset), so when a dot (which sits at the vertical
// middle of its entry) is at viewport center, the fill end lines up with the
// bottom of that entry's box.
const HALF_ENTRY_PX = 95;

interface Props {
  /** Which dot column this rail tracks — desktop dots sit at left:220px,
   *  mobile dots at left:20px. The component finds matching dots by class
   *  visibility and uses their centerY for endpoint alignment. */
  variant?: "desktop" | "mobile";
}

export function ChangelogRailReact({ variant = "desktop" }: Props = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const scaleY = useMotionValue(0);
  const { scrollY } = useScroll();

  // Re-position the OUTER wrapper so its top/bottom land exactly on the first
  // and last entry dots' vertical centers. Without this the rail "floats" away
  // from the dots when entry heights vary (which they always do).
  // NB: ref.current.parentElement is the <astro-island>, not the wrapper —
  // we query by class to find the right .changelog-rail-* wrapper.
  function repositionWrapper() {
    const wrapperClass = variant === "desktop" ? "changelog-rail-desktop" : "changelog-rail-mobile";
    const wrapper = document.querySelector<HTMLElement>(`.${wrapperClass}`);
    if (!wrapper) return;
    const container = wrapper.parentElement as HTMLElement | null;
    if (!container) return;
    const entries = container.querySelectorAll<HTMLElement>("li.entry");
    if (entries.length === 0) return;
    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];
    const containerRect = container.getBoundingClientRect();
    const firstRect = firstEntry.getBoundingClientRect();
    const lastRect = lastEntry.getBoundingClientRect();
    // Dots are at top: 50% of their entry — so dot centerY === entry centerY.
    const firstCenterY = firstRect.top + firstRect.height / 2 - containerRect.top;
    const lastCenterY = lastRect.top + lastRect.height / 2 - containerRect.top;
    const containerHeight = containerRect.height;
    wrapper.style.top = `${firstCenterY}px`;
    wrapper.style.bottom = `${containerHeight - lastCenterY}px`;
  }

  // Compute the fill ratio for the current scroll position.
  function recompute() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const railTop = window.scrollY + rect.top;
    const railHeight = rect.height;
    if (railHeight <= 1) {
      scaleY.set(0);
      return;
    }
    const fillEndDoc = window.scrollY + window.innerHeight / 2 + HALF_ENTRY_PX;
    const fillEndInRail = fillEndDoc - railTop;
    scaleY.set(Math.max(0, Math.min(1, fillEndInRail / railHeight)));
  }

  const smoothed = useSpring(scaleY, { stiffness: 120, damping: 30, mass: 0.3 });

  // Initial measurement + react to layout changes.
  useEffect(() => {
    setReady(true);
    repositionWrapper();
    recompute();
    smoothed.jump(scaleY.get());
    const ro = new ResizeObserver(() => {
      repositionWrapper();
      recompute();
    });
    if (ref.current) ro.observe(ref.current);
    // Also observe the timeline container (parent of the rail wrapper) so we
    // re-position when entry-list grows or any entry's content reflows.
    const wrapperClass = variant === "desktop" ? "changelog-rail-desktop" : "changelog-rail-mobile";
    const container = document.querySelector(`.${wrapperClass}`)?.parentElement;
    if (container) ro.observe(container);
    window.addEventListener("resize", () => {
      repositionWrapper();
      recompute();
    });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", repositionWrapper);
      window.removeEventListener("resize", recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to scroll.
  useMotionValueEvent(scrollY, "change", recompute);

  return (
    <div
      ref={ref}
      className="absolute inset-0 rounded-full bg-[#E8ECEF] shadow-[inset_0_2px_1.5px_rgba(165,174,184,0.32)] dark:bg-white/10"
      data-variant={variant}
    >
      {ready && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            scaleY: smoothed,
            transformOrigin: "top",
            backgroundImage:
              "linear-gradient(to bottom, rgb(79 70 229) 0%, rgb(129 140 248) 50%, rgb(165 180 252) 100%)",
          }}
        />
      )}
    </div>
  );
}
