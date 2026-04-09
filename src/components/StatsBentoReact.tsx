import { motion, useSpring, useTransform } from "framer-motion";
import { useState, useRef } from "react";

const bars = [
  { height: 35 }, { height: 52 }, { height: 45 }, { height: 68 },
  { height: 58 }, { height: 82 }, { height: 75 },
];

const peakIndex = bars.findIndex(b => b.height === Math.max(...bars.map(b => b.height)));

export function StatsBentoReact() {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useSpring(50, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    mouseX.set(Math.max(0, Math.min(100, x)));
  };

  const totalBars = bars.length;
  const getX = (i: number) => ((i * 2 + 1) / (totalBars * 2)) * 100;
  const getY = (h: number) => 100 - h;

  const points = bars.map((b, i) => `${getX(i)},${getY(b.height)}`).join(" ");
  const areaPath = `M ${getX(0)},100 L ${bars.map((b, i) => `${getX(i)},${getY(b.height)}`).join(" L ")} L ${getX(bars.length - 1)},100 Z`;

  // Derive Y on trend line from animated X
  const animatedY = useTransform(mouseX, (xPercent) => {
    for (let i = 0; i < bars.length - 1; i++) {
      const x1 = getX(i), x2 = getX(i + 1);
      if (xPercent >= x1 && xPercent <= x2) {
        const t = (xPercent - x1) / (x2 - x1);
        return getY(bars[i].height) + t * (getY(bars[i + 1].height) - getY(bars[i].height));
      }
    }
    return xPercent < getX(0) ? getY(bars[0].height) : getY(bars[bars.length - 1].height);
  });

  return (
    <div
      className="group relative flex h-full min-h-[200px] flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 hover:bg-white overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      ref={containerRef}
    >
      <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100"></div>
      <h2 className="mb-2 text-base font-medium text-text-primary">Site Analytics</h2>
      <div className="relative flex-1">
        {/* Grid lines */}
        <div className="pointer-events-none absolute bottom-0 left-0 -right-6 top-8">
          {[0, 25, 50, 75, 100].map((percent, i) => (
            <motion.div
              key={percent}
              className="absolute left-0 right-0 border-t border-dashed"
              style={{ bottom: `${percent}%` }}
              initial={{ opacity: 0.4, borderColor: "rgba(209, 213, 219, 0.6)" }}
              animate={{
                opacity: isHovered ? 0.6 : 0.4,
                borderColor: isHovered ? "rgba(139, 92, 246, 0.3)" : "rgba(209, 213, 219, 0.6)",
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* Bars */}
        <div className="absolute bottom-0 left-0 right-0 flex h-full items-end justify-around gap-1 pb-2">
          {bars.map((bar, i) => (
            <motion.div
              key={i}
              className="w-3 rounded-t"
              initial={{ height: `${bar.height}%`, backgroundColor: "rgba(165, 174, 184, 0.4)" }}
              animate={{
                height: isHovered ? `${bar.height + 5}%` : `${bar.height}%`,
                backgroundColor: isHovered
                  ? i === peakIndex ? "rgb(99, 102, 241)" : "rgba(139, 92, 246, 0.6)"
                  : "rgba(165, 174, 184, 0.4)",
              }}
              transition={{ duration: 0.4, delay: i * 0.05, type: "spring", stiffness: 200 }}
            />
          ))}
        </div>

        {/* Trend line + indicator */}
        <svg
          className="pointer-events-none absolute bottom-0 left-0 -right-6 top-8"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="statsTrendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.4" />
              <stop offset="50%" stopColor="rgb(139, 92, 246)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="statsAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity={isHovered ? "0.25" : "0.12"} />
              <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={areaPath}
            fill="url(#statsAreaGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.polyline
            points={points}
            fill="none"
            stroke="url(#statsTrendGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0.6 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          />
          <motion.circle
            cx={mouseX}
            cy={animatedY}
            r="2.5"
            fill="rgb(139, 92, 246)"
            vectorEffect="non-scaling-stroke"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isHovered ? 1 : 0, opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ filter: "drop-shadow(0 0 4px rgba(139, 92, 246, 0.6))" }}
          />
        </svg>
      </div>
    </div>
  );
}
