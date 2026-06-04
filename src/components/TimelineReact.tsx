import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface TimelineProps {
  avatarUrl: string;
}

/**
 * Vertical rail with avatar that tracks scroll. Avatar sits at the top of the
 * rail when the page is at scroll 0 and moves linearly down to the bottom of
 * the rail as the user scrolls to the bottom edge of the Resume container.
 *
 * Why absolute-scroll math instead of useScroll({ target, offset }): for the
 * V4-style layout where the Resume sits near the top of the page, container-
 * relative offsets either give a fractional initial progress (avatar a few px
 * below top) or clamp at the top for the first N pixels of scroll (avatar
 * appears stuck). Absolute-scroll mapping gives the avatar an exact starting
 * position AND immediate response to scroll.
 */
export function TimelineReact({ avatarUrl }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [endScroll, setEndScroll] = useState(1);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Page-coords bottom of the rail container
      const end = rect.top + window.scrollY + rect.height;
      setEndScroll(Math.max(end, 1));
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const y = useTransform(scrollY, [0, endScroll], ["0%", "100%"], { clamp: true });
  const scaleY = useTransform(scrollY, [0, endScroll], [0, 1], { clamp: true });

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <motion.div
        className="absolute -left-0.5 z-10 flex"
        style={{
          top: 0,
          height: "100%",
          y,
        }}
      >
        {/* -mt-1 (-4px) aligns the avatar's visual center with the entry title's
            text center (avatar=36px tall, title=28px tall, both anchored at the
            same top edge). */}
        <div className="relative -mt-1 h-9 w-9 overflow-hidden rounded-full border-2 border-bg-primary bg-bg-primary shadow-md">
          <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
        </div>
      </motion.div>
      <div className="bg-opacity-24 absolute bottom-0 left-1/2 top-0 w-2 -translate-x-1/2 rounded-full bg-[#E8ECEF] shadow-[inset_0_2px_1.5px_rgba(165,174,184,0.32)]">
        <motion.div
          className="absolute inset-0 w-full origin-top rounded-full bg-gradient-to-b from-indigo-300 to-transparent"
          style={{ scaleY }}
        />
      </div>
    </div>
  );
}
