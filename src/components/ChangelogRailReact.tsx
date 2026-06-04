import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Approximate half-height of one changelog entry. The fill's bottom edge tracks
// (viewport center + this offset), so when a dot (which sits at the vertical
// middle of its entry) is at viewport center, the fill end lines up with the
// bottom of that entry's box.
const HALF_ENTRY_PX = 95;

export function ChangelogRailReact() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const scaleY = useMotionValue(0);
  const { scrollY } = useScroll();

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

  // Initial measurement + react to layout changes. We compute once on mount,
  // then jump the spring to the computed value (otherwise the spring starts at
  // 0 and only animates from the next scroll event). Subsequent updates flow
  // through normally so the spring smooths the motion.
  useEffect(() => {
    setReady(true);
    recompute();
    smoothed.jump(scaleY.get());
    const ro = new ResizeObserver(recompute);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
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
