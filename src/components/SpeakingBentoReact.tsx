import { motion } from "framer-motion";
import { useState } from "react";

export function SpeakingBentoReact() {
  const [isHovered, setIsHovered] = useState(false);

  const rings = [
    { width: 195, height: 195, x: 86.5, y: 108.5, delay: 0 },
    { width: 267, height: 267, x: 50.5, y: 72.5, delay: 0.2 },
    { width: 339, height: 339, x: 14.5, y: 36.5, delay: 0.4 },
    { width: 411, height: 411, x: -21.5, y: 0.5, delay: 0.6 },
  ];

  const audioBars = [
    { baseHeight: 12, delay: 0 }, { baseHeight: 18, delay: 0.1 },
    { baseHeight: 14, delay: 0.2 }, { baseHeight: 12, delay: 0.3 },
    { baseHeight: 16, delay: 0.4 }, { baseHeight: 18, delay: 0.5 },
    { baseHeight: 14, delay: 0.6 }, { baseHeight: 12, delay: 0.7 },
    { baseHeight: 16, delay: 0.8 }, { baseHeight: 18, delay: 0.9 },
    { baseHeight: 14, delay: 1.0 }, { baseHeight: 12, delay: 1.1 },
    { baseHeight: 16, delay: 1.2 }, { baseHeight: 18, delay: 1.3 },
    { baseHeight: 14, delay: 1.4 }, { baseHeight: 12, delay: 1.5 },
  ];

  return (
    <a href="/inspirations" className="block">
      <div
        className="group relative flex flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 hover:bg-white overflow-hidden h-[276px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100"></div>
        <div className="absolute bottom-4 right-4 z-[999] flex h-9 w-9 rotate-6 items-center justify-center rounded-full bg-indigo-200 opacity-0 transition-all duration-300 ease-in-out group-hover:translate-y-[-8px] group-hover:rotate-0 group-hover:opacity-100">
          <svg className="h-6 w-6 text-indigo-600" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.25 15.25V6.75H8.75"></path>
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 7L6.75 17.25"></path>
          </svg>
        </div>

        <div className="group h-full">
          {/* Ring pattern */}
          <span className="absolute left-1/2 -translate-x-1/2">
            <svg className="h-full w-[400px]" viewBox="0 0 368 256" fill="none" xmlns="http://www.w3.org/2000/svg">
              {rings.map((ring, i) => (
                <motion.rect
                  key={i}
                  x={ring.x} y={ring.y}
                  width={ring.width} height={ring.height}
                  rx={ring.width / 2}
                  fill="none"
                  initial={{ stroke: "#D6DADE", strokeOpacity: 0.5 }}
                  animate={{
                    stroke: isHovered ? "#818cf8" : "#D6DADE",
                    strokeOpacity: isHovered ? 1 : 0.5,
                  }}
                  transition={{
                    duration: 0.4,
                    delay: isHovered ? ring.delay : 0.45 - ring.delay,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </svg>
          </span>

          {/* Audio indicator */}
          <span className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2">
            <svg width="103" height="32" viewBox="0 0 103 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g filter="url(#sbr-audio-filter)">
                <rect width="103" height="32" rx="16" fill="#F7F7F8" />
                <rect x="0.75" y="0.75" width="101.5" height="30.5" rx="15.25" stroke="#D6DADE" strokeOpacity="0.5" strokeWidth="1.5" />
                {audioBars.map((bar, i) => (
                  <motion.rect
                    key={i}
                    x={14 + i * 5}
                    width="2"
                    rx="1"
                    initial={{ fill: "#A5AEB8", height: bar.baseHeight, y: 16 - bar.baseHeight / 2 }}
                    animate={isHovered ? "hover" : "initial"}
                    variants={{
                      initial: { fill: "#A5AEB8", height: bar.baseHeight, y: 16 - bar.baseHeight / 2 },
                      hover: {
                        fill: "#6c47ff",
                        height: bar.baseHeight * 1.5,
                        y: 16 - (bar.baseHeight * 1.5) / 2,
                        transition: {
                          duration: 0.6, repeat: Infinity, repeatType: "reverse" as const,
                          delay: bar.delay, ease: "easeInOut",
                        },
                      },
                    }}
                  />
                ))}
              </g>
              <defs>
                <filter id="sbr-audio-filter" x="0" y="-2" width="103" height="34" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                  <feOffset dy="-2" />
                  <feGaussianBlur stdDeviation="1" />
                  <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                  <feColorMatrix type="matrix" values="0 0 0 0 0.647059 0 0 0 0 0.682353 0 0 0 0 0.721569 0 0 0 0.5 0" />
                  <feBlend mode="normal" in2="shape" result="effect1" />
                </filter>
              </defs>
            </svg>
          </span>

          <div className="flex justify-around">
            {/* Secondary photo 1 */}
            <motion.span className="mt-16" initial={{ y: 0 }} animate={{ y: isHovered ? -6 : 0 }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.1, type: "spring", stiffness: 150 }}>
              <span className="relative">
                <svg width="76" height="76" viewBox="0 0 76 76" fill="none"><rect width="76" height="76" rx="38" fill="#F7F7F8" /><rect x="0.75" y="0.75" width="74.5" height="74.5" rx="37.25" stroke="#D6DADE" strokeOpacity="0.5" strokeWidth="1.5" /></svg>
                <img className="absolute left-1/2 top-1/2 h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2 transform rounded-full object-cover" src="/kostas_speaking.jpg" alt="Kostas Georgiou" />
              </span>
            </motion.span>

            {/* Primary photo */}
            <motion.span className="z-20 mt-4" initial={{ y: 0 }} animate={{ y: isHovered ? -8 : 0 }} transition={{ duration: 0.6, ease: "easeOut", type: "spring", stiffness: 150 }}>
              <span className="relative">
                <svg width="117" height="116" viewBox="0 0 117 116" fill="none"><rect x="0.5" width="116" height="116" rx="58" fill="#F7F7F8" /><rect x="1.25" y="0.75" width="114.5" height="114.5" rx="57.25" stroke="#D6DADE" strokeOpacity="0.5" strokeWidth="1.5" /></svg>
                <img className="absolute left-1/2 top-1/2 h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 transform rounded-full object-cover" src="/kostas_neurips_square.jpg" alt="Kostas Georgiou" />
              </span>
            </motion.span>

            {/* Secondary photo 2 */}
            <motion.span className="mt-16" initial={{ y: 0 }} animate={{ y: isHovered ? -6 : 0 }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.2, type: "spring", stiffness: 150 }}>
              <span className="relative">
                <svg width="76" height="76" viewBox="0 0 76 76" fill="none"><rect width="76" height="76" rx="38" fill="#F7F7F8" /><rect x="0.75" y="0.75" width="74.5" height="74.5" rx="37.25" stroke="#D6DADE" strokeOpacity="0.5" strokeWidth="1.5" /></svg>
                <img className="absolute left-1/2 top-1/2 h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2 transform rounded-full object-cover" src="/kostas_poster.jpg" alt="Kostas Georgiou" />
              </span>
            </motion.span>
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 h-full w-full bg-gradient-to-t from-white"></div>
          <div className="absolute bottom-6 left-6 z-50 grid h-full grid-cols-2 grid-rows-2 items-end gap-8">
            <div className="col-1 row-start-2 text-balance">
              <h2 className="mb-2 font-medium text-text-primary">Inspirations</h2>
              <p className="text-text-secondary">Books, papers, people that shape my thinking</p>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
