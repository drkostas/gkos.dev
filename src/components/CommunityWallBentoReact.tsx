import { motion } from "framer-motion";

const lineVariants = {
  initial: { opacity: 0.5 },
  hover: {
    opacity: [0.5, 0.8, 0.5],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

const card1Variants = {
  initial: { rotate: -8, y: -15, transition: { duration: 0.3, ease: "easeOut" } },
  hover: { rotate: 0, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const card2Variants = {
  initial: { rotate: 8, y: -5, transition: { duration: 0.3, ease: "easeOut" } },
  hover: { rotate: 0, y: 0, transition: { duration: 0.3, ease: "easeOut", delay: 0.15 } },
};

export function CommunityWallBentoReact() {
  return (
    <motion.div initial="initial" whileHover="hover">
      <div className="group relative flex flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 hover:bg-white overflow-hidden h-[276px]">
        <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100"></div>
        {/* Link arrow */}
        <div className="absolute bottom-4 right-4 z-[999] flex h-9 w-9 rotate-6 items-center justify-center rounded-full bg-indigo-200 opacity-0 transition-all duration-300 ease-in-out group-hover:translate-y-[-8px] group-hover:rotate-0 group-hover:opacity-100">
          <svg className="h-6 w-6 text-indigo-600" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.25 15.25V6.75H8.75"></path>
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 7L6.75 17.25"></path>
          </svg>
        </div>

        {/* Dots pattern */}
        <div className="absolute top-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_2px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

        {/* Card 1 */}
        <motion.svg
          className="absolute top-0 w-48 md:w-40"
          viewBox="0 0 171 152"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          variants={card1Variants}
        >
          <g clipPath="url(#cw-r-clip0)">
            <rect x="-0.170898" y="-17.4697" width="130" height="160" rx="8" transform="rotate(-12 -0.170898 -17.4697)" fill="#F7F7F8" />
            <g opacity="0.75">
              <g clipPath="url(#cw-r-clip1)">
                <rect width="125.899" height="124.298" rx="2.56284" transform="matrix(-0.978148 0.207912 0.207912 0.978148 120.827 -35.0101)" fill="#E6649C" />
                <motion.rect opacity="0.5" x="32.8682" y="22.5352" width="58" height="8" rx="4" transform="rotate(-12 32.8682 22.5352)" fill="white" variants={lineVariants} />
                <motion.rect opacity="0.5" x="39.5215" y="53.8359" width="58" height="8" rx="4" transform="rotate(-12 39.5215 53.8359)" fill="white" variants={lineVariants} />
                <motion.rect opacity="0.5" x="97.4263" y="8.81303" width="16" height="8" rx="4" transform="rotate(-12 97.4263 8.81303)" fill="white" variants={lineVariants} />
                <motion.rect opacity="0.5" width="58" height="8" rx="4" transform="matrix(-0.978148 0.207912 0.207912 0.978148 116.403 21.1368)" fill="white" variants={lineVariants} />
                <motion.rect opacity="0.5" width="16" height="8" rx="4" transform="matrix(-0.978148 0.207912 0.207912 0.978148 51.8452 34.859)" fill="white" variants={lineVariants} />
              </g>
            </g>
            <circle opacity="0.25" cx="46.9592" cy="117.685" r="10" transform="rotate(-12 46.9592 117.685)" fill="#A5AEB8" />
          </g>
          <defs>
            <clipPath id="cw-r-clip0"><rect width="171" height="152" fill="white" /></clipPath>
            <clipPath id="cw-r-clip1"><rect width="114" height="116" rx="2" transform="matrix(-0.978148 0.207912 0.207912 0.978148 120.826 -35.0097)" fill="white" /></clipPath>
          </defs>
        </motion.svg>

        {/* Card 2 */}
        <motion.svg
          className="absolute -right-5 top-8 w-56 md:right-0 md:top-0"
          viewBox="0 0 214 223"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          variants={card2Variants}
        >
          <rect x="64.5547" y="8.50171" width="130" height="160" rx="8" transform="rotate(12 64.5547 8.50171)" fill="#F7F7F8" />
          <g opacity="0.75">
            <g clipPath="url(#cw-r-clip2)">
              <rect width="125.899" height="124.298" rx="2.56284" transform="matrix(-0.978148 -0.207912 -0.207912 0.978148 182.226 41.6919)" fill="url(#cw-r-grad)" />
              <motion.rect opacity="0.5" x="78.4663" y="58.4864" width="58" height="8" rx="4" transform="rotate(12 78.4663 58.4864)" fill="white" variants={lineVariants} />
              <motion.rect opacity="0.5" x="71.8135" y="89.7871" width="58" height="8" rx="4" transform="rotate(12 71.8135 89.7871)" fill="white" variants={lineVariants} />
              <motion.rect opacity="0.5" x="143.024" y="72.2085" width="16" height="8" rx="4" transform="rotate(12 143.024 72.2085)" fill="white" variants={lineVariants} />
              <motion.rect opacity="0.5" width="58" height="8" rx="4" transform="matrix(-0.978148 -0.207912 -0.207912 0.978148 155.348 91.1855)" fill="white" variants={lineVariants} />
              <motion.rect opacity="0.5" width="16" height="8" rx="4" transform="matrix(-0.978148 -0.207912 -0.207912 0.978148 90.79 77.4633)" fill="white" variants={lineVariants} />
            </g>
          </g>
          <circle opacity="0.25" cx="52.6379" cy="151.141" r="10" transform="rotate(12 52.6379 151.141)" fill="#A5AEB8" />
          <defs>
            <linearGradient id="cw-r-grad" x1="110.398" y1="-2.56166" x2="-4.8642" y2="120.596" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFD2ED" />
              <stop offset="1" stopColor="#C691FF" />
            </linearGradient>
            <clipPath id="cw-r-clip2"><rect width="114" height="116" rx="2" transform="matrix(-0.978148 -0.207912 -0.207912 0.978148 182.226 41.6921)" fill="white" /></clipPath>
          </defs>
        </motion.svg>

        <div className="grid h-full grid-cols-2 grid-rows-2 items-end gap-8">
          <div className="col-1 z-10 row-start-2">
            <h2 className="mb-2 font-medium text-text-primary">Community Wall</h2>
            <p className="text-text-secondary">Let everyone know you were here</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
