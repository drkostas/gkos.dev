import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";

interface FormState {
  email: string;
  message: string;
  isSuccess: boolean;
  isLoading: boolean;
}

export function NewsletterSignUpReact({
  title = "Subscribe to my newsletter",
  description = "A periodic update about my life, recent blog posts, how-tos, and discoveries.",
  buttonText = "Subscribe",
}: {
  title?: string;
  description?: string;
  buttonText?: string;
}) {
  const [formState, setFormState] = useState<FormState>({
    email: "",
    message: "",
    isSuccess: false,
    isLoading: false,
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formState.email) {
      setFormState((prev) => ({ ...prev, message: "Please provide an email address." }));
      return;
    }
    // Simulate success for clone purposes
    setFormState((prev) => ({ ...prev, isLoading: true }));
    setTimeout(() => {
      setFormState({ email: "", message: "You're signed up!", isSuccess: true, isLoading: false });
    }, 800);
  };

  return (
    <div className="relative pb-16">
      {/* GridWrapper lines */}
      <div className="relative w-full before:absolute before:top-0 before:h-px before:bg-border-primary/50 before:-left-4 before:right-[-1rem] md:before:-left-8 md:before:right-[-2rem] lg:before:inset-x-0 after:-left-4 after:right-[-1rem] md:after:-left-8 md:after:right-[-2rem] lg:after:inset-x-0 after:absolute after:bottom-0 after:h-px after:bg-border-primary/50">
        <div className="relative overflow-x-clip">
          <div className="drama-shadow rounded-2xl bg-dark-primary p-14 md:p-[100px]">
            {/* Lines */}
            <div className="absolute left-0 right-0 top-[34px] z-10 h-px w-full bg-zinc-600 md:top-[48px]" />
            <div className="absolute bottom-0 right-[34px] top-0 z-10 h-full w-px bg-zinc-600 md:right-[48px]" />
            <div className="absolute bottom-[34px] left-0 right-0 z-10 h-px w-full bg-zinc-600 md:bottom-[48px]" />
            <div className="absolute bottom-0 left-[34px] top-0 z-10 h-full w-px bg-zinc-600 md:left-[48px]" />

            {/* Crosses */}
            <div className="absolute right-[44.5px] top-[48px] z-20 hidden h-px w-2 bg-zinc-300 md:block" />
            <div className="absolute right-[48px] top-[44.5px] z-20 hidden h-2 w-px bg-zinc-300 md:block" />
            <div className="absolute left-[44.5px] right-0 top-[48px] z-20 hidden h-px w-2 bg-zinc-300 md:block" />
            <div className="absolute left-[48px] right-0 top-[44.5px] z-20 hidden h-2 w-px bg-zinc-300 md:block" />
            <div className="absolute bottom-[48px] left-[44.5px] right-0 z-20 hidden h-px w-2 bg-zinc-300 md:block" />
            <div className="absolute bottom-[44.5px] left-[48px] right-0 z-20 hidden h-2 w-px bg-zinc-300 md:block" />
            <div className="absolute bottom-[48px] right-[44.5px] z-20 hidden h-px w-2 bg-zinc-300 md:block" />
            <div className="absolute bottom-[44.5px] right-[48px] z-20 hidden h-2 w-px bg-zinc-300 md:block" />

            <h2 className="mb-4 text-3xl font-medium text-slate-50">{title}</h2>
            <p className="z-50 mb-8 max-w-[336px] text-base leading-8 text-gray-300 md:mb-12">{description}</p>
            <div className="z-50 mb-4 space-y-4">
              <form onSubmit={handleSubmit} className="relative md:inline-block">
                <label htmlFor="nl-email" className="sr-only">Email</label>
                <input
                  id="nl-email"
                  type="email"
                  placeholder="bobloblaw@gmail.com"
                  value={formState.email}
                  onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-full border border-gray-400 bg-transparent px-5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:ring-offset-2 focus:ring-offset-dark-primary md:w-[425px]"
                  disabled={formState.isLoading}
                />
                <button
                  type="submit"
                  className="group absolute right-1 top-1 isolate inline-flex h-[42px] items-center justify-center overflow-hidden rounded-full bg-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-900 shadow-[0_1px_theme(colors.white/0.07)_inset,0_1px_3px_theme(colors.gray.900/0.2)] ring-1 ring-white transition duration-300 ease-[cubic-bezier(0.4,0.36,0,1)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-gradient-to-b before:from-white/20 before:opacity-50 before:transition-opacity before:duration-300 before:ease-[cubic-bezier(0.4,0.36,0,1)] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-full after:bg-gradient-to-b after:from-white/10 after:from-[46%] after:to-[54%] after:mix-blend-overlay hover:before:opacity-100"
                  disabled={formState.isLoading}
                >
                  {formState.isLoading ? "Loading..." : buttonText}
                </button>
              </form>
              <div className="min-h-[15px] md:min-h-[30px]">
                {formState.message && (
                  <p className={`text-sm ${formState.isSuccess ? "text-indigo-300" : "text-rose-400"}`}>
                    {formState.message}
                  </p>
                )}
              </div>
            </div>
            <p className="text-base text-gray-300">
              <span className="font-bold text-white">NO SPAM.</span> I never send spam. You can unsubscribe at any time!
            </p>

            {/* Decorative SVG — gradient changes on success */}
            <svg
              className="absolute -top-8 right-0 z-10 hidden lg:block"
              width="453" height="501" viewBox="0 0 453 501" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
              <g filter="url(#nl-decor-f)">
                <path
                  d="M297.175 327.447C262.78 292.292 227.449 258.05 192.524 223.411C190.939 221.838 189.299 220.266 187.713 218.655C178.01 208.641 177.197 195.879 185.721 187.847C193.907 180.092 206.375 181.017 215.916 190.476C252.019 226.079 287.797 261.973 324.077 297.418C372.201 344.41 450.615 334.752 485.987 277.787C511.045 237.427 504.404 186.063 468.545 150.222C434.438 116.082 400.142 82.1269 325.61 8.37003C320.933 3.74206 313.386 3.72751 308.711 8.35643L296.238 20.705C291.483 25.4123 291.513 33.1151 296.283 37.8068C371.954 112.236 407.14 147.218 442.212 182.311C471.025 211.177 463.408 259.384 427.427 279.002C402.396 292.609 373.583 288.527 351.669 267.178C315.024 231.482 279.002 195.311 242.573 159.509C236.998 153.957 230.347 149.54 223.006 146.515C215.666 143.49 207.782 141.916 199.812 141.885C191.842 141.854 183.945 143.367 176.58 146.336C169.215 149.305 162.529 153.67 156.909 159.179C145.247 170.485 138.652 185.833 138.569 201.866C138.485 217.899 144.918 233.312 156.462 244.733C191.955 280.376 227.937 315.583 263.349 351.306C269.339 357.33 274.963 364.345 278.595 371.941C291.998 400.041 283 431.483 257.318 449.371C233.276 466.122 200.588 463.256 178.62 441.708C151.254 414.827 124.13 387.723 38.1941 302.517C33.5176 297.88 25.977 297.878 21.2989 302.513L8.59664 315.098C3.86063 319.791 3.85839 327.445 8.59103 332.141C95.0067 417.885 122.889 445.32 151.203 472.384C170.047 490.507 195.387 500.769 221.857 500.996C248.327 501.223 273.848 491.397 293.015 473.6C334.837 434.918 337.114 368.308 297.175 327.447Z"
                  fill="url(#nl-grad0)"
                />
                <path
                  d="M215.221 416.712C215.709 416.91 216.156 417.108 216.644 417.28C225.724 419.817 234.045 417.478 239.181 409.036C245.049 399.432 243.261 390.475 235.346 382.601C198.795 346.377 162.109 310.284 125.721 273.915C92.9516 241.099 87.2866 190.593 111.342 149.732C133.947 111.341 181.638 92.0789 225.642 103.586C243.545 108.276 259.063 116.784 272.235 129.876C307.892 165.4 343.507 200.964 379.854 235.761C385.072 240.768 394.532 244.164 401.66 243.596C407 243.199 413.437 236.131 416.378 230.477C420.579 222.366 416.215 214.769 409.819 208.428C373.214 172.296 336.745 135.966 300.099 99.8338C282.047 81.9858 260.255 70.7302 235.671 64.2304C178.413 49.0906 113.294 72.7779 80.9713 120.668C46.5348 171.741 46.4536 240.24 83.9935 286.465C88.3032 291.802 92.8703 296.928 97.6001 301.935C112.44 319.862 159.141 364.304 189.214 392.562L211.06 414.202C211.589 414.73 212.158 415.18 212.768 415.536C213.5 415.946 214.231 416.302 214.977 416.593"
                  fill="url(#nl-grad1)"
                />
              </g>
              <defs>
                <filter id="nl-decor-f" x="0" y="0" width="501" height="503" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                  <feOffset dy="2" />
                  <feGaussianBlur stdDeviation="2" />
                  <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                  <feBlend mode="normal" in2="shape" result="effect1" />
                </filter>
                <motion.linearGradient id="nl-grad0" x1="250.5" y1="119.845" x2="250.5" y2="501" gradientUnits="userSpaceOnUse">
                  <motion.stop animate={{ stopColor: formState.isSuccess ? "#4f46e5" : "#4B4B4F" }} transition={{ duration: 0.5 }} />
                  <motion.stop offset="1" animate={{ stopColor: formState.isSuccess ? "#818cf8" : "#3C3C3F", stopOpacity: formState.isSuccess ? 1 : 0 }} transition={{ duration: 0.5 }} />
                </motion.linearGradient>
                <motion.linearGradient id="nl-grad1" x1="236.758" y1="59.688" x2="236.758" y2="418.249" gradientUnits="userSpaceOnUse">
                  <motion.stop animate={{ stopColor: formState.isSuccess ? "#4f46e5" : "#4B4B4F" }} transition={{ duration: 0.5 }} />
                  <motion.stop offset="1" animate={{ stopColor: formState.isSuccess ? "#818cf8" : "#3C3C3F" }} transition={{ duration: 0.5 }} />
                </motion.linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
