import { useScroll, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Deterministic narrative curve for the about page's story section.
 *
 * Instead of a hand-tuned static path, this component measures the actual
 * narrative-section grid boxes on mount + resize, then synthesizes the SVG
 * path so:
 *  - Every transition (the horizontal stroke that swaps the curve from one
 *    side to the other) lands in the inter-section padding gap, never inside
 *    body text.
 *  - The curve container is positioned at the midpoint between the text
 *    column and the photo column, so the visual gap from text to curve and
 *    from curve to photo is roughly equal at any viewport width.
 *  - The path height matches the actual narrative wrapper height.
 *
 * Sides alternate L/R/L/R… starting LEFT (Origins has photo on the left and
 * the curve weaves around it). The component reads each section's `data-curve-side`
 * attribute to know which side the curve should be on, falling back to the
 * alternating pattern if the attribute is absent.
 */

const BOX_W = 32; // curve bounding box internal width (left line to right line)
const CORNER = 8; // bezier corner radius for the L→R / R→L transitions
const VERT_X_LEFT = 4; // X of left vertical (curve weaving on the left side)
const VERT_X_RIGHT = VERT_X_LEFT + BOX_W * 8 - CORNER; // 4 + 32*8 - 8 = 252  -- intentionally same proportion as the original hand-tuned curve
const SVG_W = 380; // curve bounding box width (left margin to right margin)
const SVG_PAD = 10; // viewBox padding so the stroke is not clipped

type SectionRect = {
  top: number;
  bottom: number;
  side: "left" | "right"; // which side of the curve the photo sits on
};

function buildPathD(sections: SectionRect[]): string {
  if (sections.length === 0) return "";
  const RIGHT = SVG_W - 4 - 110; // x position of the right vertical line, mirrored from the left margin
  // Final curve geometry. Keep proportions close to the original hand-tuned values:
  const VL = 4; // left vertical x
  const VR = 266; // right vertical x — matches the original handmade path
  const HL_START = 20; // x where the horizontal segment starts after the left corner
  const HR_END = 250; // x where the horizontal segment ends before the right corner

  const segments: string[] = [];
  // Start: vertical down from the top
  segments.push(`M145 0L145 30C145 38 138 45 130 45L${HL_START} 45C12 45 ${VL} 53 ${VL} 60`);

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const isLeft = s.side === "left";
    const xVert = isLeft ? VL : VR;
    const isLast = i === sections.length - 1;

    if (isLast) {
      // Final vertical to the bottom, no transition after.
      segments.push(`L${xVert} ${s.bottom}`);
      continue;
    }

    // Transition Y sits 24px before the section's bottom (in the padding gap).
    const transY = Math.round(s.bottom - 24);
    // End the vertical 8px above the transition center to leave room for the corner.
    segments.push(`L${xVert} ${transY - CORNER}`);

    const next = sections[i + 1];
    const nextLeft = next.side === "left";

    if (isLeft && !nextLeft) {
      // Going from left-side vertical (x=4) to right-side vertical (x=266).
      segments.push(`C${VL} ${transY - 2} 12 ${transY} ${HL_START} ${transY}`);
      segments.push(`L${HR_END} ${transY}`);
      segments.push(`C258 ${transY} ${VR} ${transY + 2} ${VR} ${transY + CORNER}`);
    } else if (!isLeft && nextLeft) {
      // Going from right-side vertical (x=266) to left-side vertical (x=4).
      segments.push(`C${VR} ${transY - 2} 258 ${transY} ${HR_END} ${transY}`);
      segments.push(`L${HL_START} ${transY}`);
      segments.push(`C12 ${transY} ${VL} ${transY + 2} ${VL} ${transY + CORNER}`);
    } else {
      // Same side as next; just keep going vertical (rare with strict alternation).
      segments.push(`L${xVert} ${transY + CORNER}`);
    }
  }

  return segments.join("");
}

export function AboutNarrativeTrack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  const [pathD, setPathD] = useState<string>("");
  const [svgHeight, setSvgHeight] = useState<number>(1);
  // svgLeftPx is the absolute pixel offset (relative to the narrative wrapper)
  // at which the SVG should sit. Centered between the text column and the photo column.
  const [svgLeftPx, setSvgLeftPx] = useState<number>(0);

  // Measure layout (sections, columns) and rebuild the path + container position.
  // Why this is fiddly: section heights depend on how text wraps AND on photo
  // dimensions, and photos load asynchronously. A single measure-on-mount sees
  // pre-image-load heights and produces a curve that doesn't fit the final
  // layout. We schedule measurements on: mount (rAF), ResizeObserver, every
  // image's load/error event, and window resize.
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const wrapper = root.closest<HTMLElement>("[data-narrative-wrapper]");
    if (!wrapper) return;

    let rafId = 0;

    function scheduleMeasure() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    }

    function measure() {
      const wrapperRect = wrapper!.getBoundingClientRect();
      const wrapperTop = wrapperRect.top + window.scrollY;
      const grids = Array.from(wrapper!.querySelectorAll<HTMLElement>("[data-curve-side]"));
      const sections: SectionRect[] = [];
      // Use the first section's horizontal centre as the curve's horizontal
      // anchor — all sections share the same grid width, so the gap between
      // the text column and the photo column lives at that midpoint regardless
      // of which side has the photo. Anchoring the curve there guarantees the
      // visual lines (at x=4 and x=266 within the 380px box) always land
      // close to the photo column edge.
      let firstGridCenter: number | null = null;

      grids.forEach((g, idx) => {
        const r = g.getBoundingClientRect();
        const sideAttr = g.getAttribute("data-curve-side") as "left" | "right" | null;
        const side: "left" | "right" = sideAttr ?? (idx % 2 === 0 ? "left" : "right");
        sections.push({
          top: Math.round(r.top + window.scrollY - wrapperTop),
          bottom: Math.round(r.bottom + window.scrollY - wrapperTop),
          side,
        });
        if (firstGridCenter === null) {
          firstGridCenter = r.left + r.width / 2;
        }
      });

      if (sections.length === 0) return;

      setPathD(buildPathD(sections));
      setSvgHeight(sections[sections.length - 1].bottom);

      // Centre the SVG bounding box on the grid centre (the gap between text
      // and photo columns), so the visual lines (at x=4 and x=266 inside the
      // 380px box) always sit just inside the photo column on either side.
      const left =
        firstGridCenter !== null
          ? Math.round(firstGridCenter - SVG_W / 2 - wrapperRect.left)
          : Math.round((wrapperRect.width - SVG_W) / 2);
      setSvgLeftPx(left);
    }

    scheduleMeasure();

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(wrapper);
    window.addEventListener("resize", scheduleMeasure);

    // Re-measure when each photo finishes loading; section heights jump when
    // images go from "no intrinsic size" to "fully rendered."
    const imgListeners: Array<{ img: HTMLImageElement; handler: () => void }> = [];
    wrapper.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      if (!img.complete) {
        const handler = () => scheduleMeasure();
        img.addEventListener("load", handler);
        img.addEventListener("error", handler);
        imgListeners.push({ img, handler });
      }
    });

    // Safety net: if measuring still hasn't produced a valid path after 800ms
    // (e.g., a slow image), measure once more on a timer.
    const safetyTimer = window.setTimeout(scheduleMeasure, 800);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(safetyTimer);
      ro.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      imgListeners.forEach(({ img, handler }) => {
        img.removeEventListener("load", handler);
        img.removeEventListener("error", handler);
      });
    };
  }, []);

  // Scroll-tracked indicator (glowing dot)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });
  const [pathLength, setPathLength] = useState(0);
  const [position, setPosition] = useState({ x: 145, y: 0 });
  useEffect(() => {
    if (!pathRef.current) return;
    setPathLength(pathRef.current.getTotalLength());
  }, [pathD]);
  useEffect(() => {
    if (!pathRef.current || !pathLength) return;
    return scrollYProgress.on("change", (latest) => {
      const clampedProgress = Math.max(0, Math.min(latest, 1));
      if (pathRef.current) {
        const point = pathRef.current.getPointAtLength(pathLength * clampedProgress);
        setPosition({ x: point.x, y: point.y });
      }
    });
  }, [pathLength, scrollYProgress]);

  return (
    <div
      ref={containerRef}
      style={{ left: svgLeftPx, top: 0, position: "absolute" }}
      className="pointer-events-none hidden lg:block"
    >
      <svg
        className="user-select-none pointer-events-none"
        width={SVG_W}
        height={svgHeight + SVG_PAD * 2}
        viewBox={`-${SVG_PAD} -${SVG_PAD} ${SVG_W} ${svgHeight + SVG_PAD * 2}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="aboutNarrativeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.423 0 0 0 0 0.278 0 0 0 0 1 0 0 0 0.6 0"
            />
          </filter>
          <mask id="aboutNarrativeMask">
            <path d={pathD} stroke="white" strokeWidth="8" strokeLinejoin="round" fill="none" />
          </mask>
        </defs>

        {/* Masked glow circle */}
        <g mask="url(#aboutNarrativeMask)">
          <motion.circle
            cx={position.x}
            cy={position.y}
            r="120"
            fill="#6C47FF"
            filter="url(#aboutNarrativeGlow)"
            opacity="0.5"
            transition={{ type: "spring", damping: 20, stiffness: 100, mass: 0.5 }}
          />
        </g>

        {/* Curve path */}
        <path
          ref={pathRef}
          d={pathD}
          stroke="#D6DADE"
          strokeOpacity="0.24"
          strokeWidth="8"
          strokeLinejoin="round"
        />

        {/* Scroll indicator dot */}
        <motion.circle
          className="fill-indigo-600"
          cx={position.x}
          cy={position.y}
          r="10"
          transition={{ type: "spring", damping: 20, stiffness: 100, mass: 0.5 }}
        />
      </svg>
    </div>
  );
}
