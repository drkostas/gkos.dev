// Compact contact card — uses the SAME visual chrome as RSSSubscribeCard:
// .rss-card-light light gradient background, filled indigo-500 icon circle,
// rounded-full inputs/buttons with indigo-100/700 button colors.
//
// This card pairs the email contact action with social profile links so it
// doubles as the "find me on" answer.

import { useState, type FormEvent } from "react";
import { siteMetadata } from "@/data/siteMetadata";

type FormStatus = "idle" | "loading" | "success" | "error";

const HF_PATH =
  "M16.781 3.277c2.997 1.704 4.844 4.851 4.844 8.258 0 .995-.155 1.955-.443 2.857a1.332 1.332 0 011.125.4 1.41 1.41 0 01.2 1.723c.204.165.352.385.428.632l.017.062c.06.222.12.69-.2 1.166.244.37.279.836.093 1.236-.255.57-.893 1.018-2.128 1.5l-.202.078-.131.048c-.478.173-.89.295-1.061.345l-.086.024c-.89.243-1.808.375-2.732.394-1.32 0-2.3-.36-2.923-1.067a9.852 9.852 0 01-3.18.018C9.778 21.647 8.802 22 7.494 22a11.249 11.249 0 01-2.541-.343l-.221-.06-.273-.08a16.574 16.574 0 01-1.175-.405c-1.237-.483-1.875-.93-2.13-1.501-.186-.4-.151-.867.093-1.236a1.42 1.42 0 01-.2-1.166c.069-.273.226-.516.447-.694a1.41 1.41 0 01.2-1.722c.233-.248.557-.391.917-.407l.078-.001a9.385 9.385 0 01-.44-2.85c0-3.407 1.847-6.554 4.844-8.258a9.822 9.822 0 019.687 0zM11.938 2.984c-4.798 0-8.688 3.829-8.688 8.55 0 .692.083 1.364.24 2.008l.008-.009c.252-.298.612-.46 1.017-.46.355.008.699.117.993.312.22.14.465.384.715.694.261-.372.69-.598 1.15-.605.852 0 1.367.728 1.562 1.383l.047.105.06.127c.192.396.595 1.139 1.143 1.68 1.06 1.04 1.324 2.115.8 3.266a8.865 8.865 0 002.024-.014c-.505-1.12-.26-2.17.74-3.186l.066-.066c.695-.684 1.157-1.69 1.252-1.912.195-.655.708-1.383 1.56-1.383.46.007.889.233 1.15.605.25-.31.495-.553.718-.694a1.87 1.87 0 01.99-.312c.357 0 .682.126.925.36.14-.61.215-1.245.215-1.898 0-4.722-3.89-8.55-8.687-8.55zm1.857 8.926l.439-.212c.553-.264.89-.383.89.152 0 1.093-.771 3.208-3.155 3.262h-.184c-2.325-.052-3.116-2.06-3.156-3.175l-.001-.087c0-1.107 1.452.586 3.25.586.716 0 1.379-.272 1.917-.526zm4.017-3.143c.45 0 .813.358.813.8 0 .441-.364.8-.813.8a.806.806 0 01-.812-.8c0-.442.364-.8.812-.8zm-11.624 0c.448 0 .812.358.812.8 0 .441-.364.8-.812.8a.806.806 0 01-.813-.8c0-.442.364-.8.813-.8z";

const SOCIALS = [
  {
    label: "LinkedIn",
    url: siteMetadata.linkedin,
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    url: siteMetadata.github,
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  {
    label: "Scholar",
    url: siteMetadata.scholar,
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" />
      </svg>
    ),
  },
  {
    label: "HuggingFace",
    url: siteMetadata.huggingface,
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d={HF_PATH} />
      </svg>
    ),
  },
];

export function ContactCompactReact({
  title = "Let's get in touch",
  description = "Drop me a message about anything.",
  showSocials = true,
}: {
  title?: string;
  description?: string;
  /** Set to false on pages that already render their own social list
   *  (e.g. /contact, which has a dedicated "Where to find me" grid). */
  showSocials?: boolean;
}) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", message: "", website: "" });

  function update(field: keyof typeof formData, v: string) {
    setFormData((p) => ({ ...p, [field]: v }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong. Try again.");
        return;
      }
      setStatus("success");
      setFormData({ name: "", email: "", message: "", website: "" });
    } catch {
      setStatus("error");
      setErrorMessage("Network error.");
    }
  }

  return (
    <div className="group relative overflow-hidden rss-card-light rounded-2xl border border-border-primary p-6 md:p-8 transition-colors hover:border-indigo-300/60">
      <div className="user-select-none pointer-events-none absolute inset-0 z-0 bg-gradient-to-tl from-indigo-400/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
      <div className="relative z-10 mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22 11 13 2 9z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
      </div>

      {status === "success" ? (
        <div className="relative z-10 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-100">
          Message sent. I'll reply soon.{" "}
          <button type="button" onClick={() => setStatus("idle")} className="ml-2 font-medium underline">
            Send another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative z-10 space-y-3">
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={formData.website}
            onChange={(e) => update("website", e.target.value)}
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
            aria-hidden="true"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              maxLength={100}
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => update("name", e.target.value)}
              disabled={status === "loading"}
              className="rounded-full border border-border-primary bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
            <input
              type="email"
              required
              maxLength={200}
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => update("email", e.target.value)}
              disabled={status === "loading"}
              className="rounded-full border border-border-primary bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <textarea
            required
            maxLength={5000}
            rows={3}
            placeholder="What's on your mind?"
            value={formData.message}
            onChange={(e) => update("message", e.target.value)}
            disabled={status === "loading"}
            className="w-full resize-none rounded-2xl border border-border-primary bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:border-indigo-500 focus:outline-none disabled:opacity-50"
          />

          {status === "error" && (
            <p className="text-xs text-rose-600">{errorMessage}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              disabled={status === "loading"}

              className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-100 px-5 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600"
            >
              {status === "loading" ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22 11 13 2 9z" />
                  </svg>
                  Send
                </>
              )}
            </button>

            {showSocials && (
              <div className="flex items-center gap-1.5">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border-primary bg-bg-primary text-text-secondary transition-colors hover:border-indigo-500 hover:text-indigo-600"
                  >
                    {s.svg}
                  </a>
                ))}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
