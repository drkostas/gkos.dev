import { motion, AnimatePresence } from "framer-motion";
import { useState, type FormEvent } from "react";
import { siteMetadata } from "@/data/siteMetadata";

type FormStatus = "idle" | "loading" | "success" | "error";

export function GetInTouchReact({
  title = "Let's get in touch",
  description = "Want to chat about ML, research, or building products that ship? Drop me a line and I'll get back to you.",
}: {
  title?: string;
  description?: string;
}) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    website: "", // honeypot
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setFormData({ name: "", email: "", message: "", website: "" });
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  }

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="relative pb-16">
      {/* GridWrapper lines */}
      <div className="relative w-full before:absolute before:top-0 before:h-px before:bg-border-primary/50 before:-left-4 before:right-[-1rem] md:before:-left-8 md:before:right-[-2rem] lg:before:inset-x-0 after:-left-4 after:right-[-1rem] md:after:-left-8 md:after:right-[-2rem] lg:after:inset-x-0 after:absolute after:bottom-0 after:h-px after:bg-border-primary/50">
        <div className="relative overflow-x-clip">
          <motion.div
            className="dark-panel drama-shadow relative overflow-hidden rounded-2xl bg-dark-primary p-14 md:p-[100px]"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
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

            <div className="relative z-30">
              <h2 className="mb-4 text-3xl font-medium text-slate-50">{title}</h2>
              <p className="z-50 mb-8 max-w-[420px] text-base leading-8 text-gray-300 md:mb-10">
                {description}
              </p>

              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-[480px] rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-5"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <path d="M22 4 12 14.01l-3-3" />
                      </svg>
                      <p className="text-base font-medium text-emerald-200">Message sent!</p>
                    </div>
                    <p className="text-sm text-emerald-100/80">
                      Thanks — I'll get back to you as soon as I can.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="mt-4 text-sm font-medium text-emerald-300 hover:text-emerald-200"
                    >
                      Send another
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSubmit}
                    className="max-w-[520px] space-y-3"
                  >
                    {/* Honeypot — hidden from real users via CSS, bots fill it */}
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData.website}
                      onChange={(e) => updateField("website", e.target.value)}
                      className="absolute left-[-9999px] h-0 w-0 opacity-0"
                      aria-hidden="true"
                    />

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="contact-name" className="sr-only">Name</label>
                        <input
                          id="contact-name"
                          type="text"
                          required
                          maxLength={100}
                          placeholder="Your name"
                          value={formData.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          disabled={status === "loading"}
                          className="w-full rounded-lg border border-gray-600 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-400 focus:border-white/60 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="sr-only">Email</label>
                        <input
                          id="contact-email"
                          type="email"
                          required
                          maxLength={200}
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          disabled={status === "loading"}
                          className="w-full rounded-lg border border-gray-600 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-400 focus:border-white/60 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="contact-message" className="sr-only">Message</label>
                      <textarea
                        id="contact-message"
                        required
                        maxLength={5000}
                        rows={4}
                        placeholder="What's on your mind?"
                        value={formData.message}
                        onChange={(e) => updateField("message", e.target.value)}
                        disabled={status === "loading"}
                        className="w-full resize-none rounded-lg border border-gray-600 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-400 focus:border-white/60 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                      />
                    </div>

                    {status === "error" && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-rose-400"
                      >
                        {errorMessage}
                      </motion.p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={status === "loading"}
                        data-umami-event="contact-form-submit"
                        className="group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-slate-100 px-5 py-3 text-sm font-medium text-slate-900 shadow-[0_1px_theme(colors.white/0.07)_inset,0_1px_3px_theme(colors.gray.900/0.2)] ring-1 ring-white transition duration-300 ease-[cubic-bezier(0.4,0.36,0,1)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-gradient-to-b before:from-white/20 before:opacity-50 before:transition-opacity before:duration-300 hover:before:opacity-100 after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-full after:bg-gradient-to-b after:from-white/10 after:from-[46%] after:to-[54%] after:mix-blend-overlay disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {status === "loading" ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Sending...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 2 11 13" />
                              <path d="M22 2 15 22 11 13 2 9z" />
                            </svg>
                            Send message
                          </>
                        )}
                      </button>

                      <span className="text-xs text-gray-500">or find me on</span>

                      <a
                        href={siteMetadata.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-600 text-gray-300 transition-colors hover:border-white hover:text-white"
                        aria-label="LinkedIn"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </a>
                      <a
                        href={siteMetadata.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-600 text-gray-300 transition-colors hover:border-white hover:text-white"
                        aria-label="GitHub"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                        </svg>
                      </a>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
