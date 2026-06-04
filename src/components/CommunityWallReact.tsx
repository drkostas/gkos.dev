import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Turnstile site key (public). Empty string disables the widget — backend
// will then fail open (the bot wall is bypassed). Set this in .env.local +
// Vercel to enable real bot protection.
const TURNSTILE_SITE_KEY: string =
  (import.meta as any).env?.PUBLIC_TURNSTILE_SITE_KEY ?? "";

// Placeholder pools for the modal form. One is picked at random per page load.
const NAME_PLACEHOLDERS = [
  "Geoffrey Hinton",
  "Yann LeCun",
  "Yoshua Bengio",
  "Andrew Ng",
  "Fei-Fei Li",
  "Andrej Karpathy",
  "Demis Hassabis",
  "Ilya Sutskever",
  "Daphne Koller",
  "Judea Pearl",
  "Sara Hooker",
  "Jeff Dean",
  "Timnit Gebru",
  "Christopher Manning",
  "Cynthia Dwork",
];

const MESSAGE_PLACEHOLDERS = [
  "👋 from the internet.",
  "Hi from a fellow PhD!",
  "Would love a search bar on the blog.",
  "Subscribed to RSS, looking forward to more.",
  "Mind if I ask about your ML stack?",
  "what's the build pipeline?",
  "Found a typo in /about, happy to share.",
  "Long time lurker, first time poster.",
  "Question about your blog post on Vercel.",
  "What are you working on lately?",
  "Hey, fellow Greek here!",
  "Adding to my reading list.",
  "Saw your work on FleetSmart, curious how it went.",
  "Watching for your next post.",
  "Going to try this stack myself.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

// Lightweight Turnstile widget. Renders the Cloudflare challenge, hands the
// token back via `onToken`. Loads the Turnstile script lazily on first mount.
function TurnstileWidget({
  siteKey,
  onToken,
  theme = "auto",
}: {
  siteKey: string;
  onToken: (token: string) => void;
  theme?: "auto" | "light" | "dark";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Inject the Turnstile script once.
    if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    // Wait until window.turnstile is available, then render.
    let attempts = 0;
    const tryRender = () => {
      const ts = window.turnstile;
      if (!ts || !containerRef.current) {
        if (attempts++ < 50) setTimeout(tryRender, 100);
        return;
      }
      widgetIdRef.current = ts.render(containerRef.current, {
        sitekey: siteKey,
        callback: (t: string) => onToken(t),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
        theme,
      });
    };
    tryRender();

    return () => {
      const ts = window.turnstile;
      if (ts && widgetIdRef.current) {
        try {
          ts.remove(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
      }
    };
  }, [siteKey, onToken, theme]);

  return <div ref={containerRef} />;
}

type WallMessage = {
  id: string;
  name: string;
  message: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
  createdAt: string;
};

const COLORS = [
  // Pastel sticky-note family, ordered roughly by hue for a smooth picker.
  { id: "pink", className: "bg-pink-200 border-pink-300", swatch: "bg-pink-300" },
  { id: "rose", className: "bg-rose-200 border-rose-300", swatch: "bg-rose-300" },
  { id: "orange", className: "bg-orange-200 border-orange-300", swatch: "bg-orange-300" },
  { id: "amber", className: "bg-amber-200 border-amber-300", swatch: "bg-amber-300" },
  { id: "yellow", className: "bg-yellow-200 border-yellow-300", swatch: "bg-yellow-300" },
  { id: "lime", className: "bg-lime-200 border-lime-300", swatch: "bg-lime-300" },
  { id: "green", className: "bg-emerald-200 border-emerald-300", swatch: "bg-emerald-300" },
  { id: "teal", className: "bg-teal-200 border-teal-300", swatch: "bg-teal-300" },
  { id: "blue", className: "bg-sky-200 border-sky-300", swatch: "bg-sky-300" },
  { id: "purple", className: "bg-purple-200 border-purple-300", swatch: "bg-purple-300" },
  { id: "fuchsia", className: "bg-fuchsia-200 border-fuchsia-300", swatch: "bg-fuchsia-300" },
  { id: "stone", className: "bg-stone-200 border-stone-300", swatch: "bg-stone-300" },
];

const COLOR_LOOKUP = Object.fromEntries(COLORS.map((c) => [c.id, c.className]));

// Note dimensions
const NOTE_W = 220;
const NOTE_H = 220;

// Sunflower (Vogel) spiral layout — newest at center, older spiral outward,
// guaranteed no overlap. SPIRAL_C is center-to-center spacing for nearest
// neighbors; should be > NOTE diagonal (220 * √2 ≈ 311) for safety with rotation.
const SPIRAL_C = 320;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 137.5°

// Minimum world dimensions (used when N is small / empty state)
const MIN_WORLD = 1600;

function sunflowerOffset(index: number) {
  const r = SPIRAL_C * Math.sqrt(index);
  const theta = index * GOLDEN_ANGLE;
  return { dx: r * Math.cos(theta), dy: r * Math.sin(theta) };
}

function computeWorldSize(n: number) {
  if (n <= 1) return MIN_WORLD;
  const maxR = SPIRAL_C * Math.sqrt(n - 1);
  const diameter = (maxR + NOTE_W) * 2 + 200; // padding so outer notes aren't flush with edge
  return Math.max(MIN_WORLD, Math.round(diameter));
}

// Random rotation for new notes. Position is computed at render time
// (sunflower layout based on age index), so x/y are placeholders.
function randomRotation() {
  return Math.round(-12 + Math.random() * 24);
}

// Demo mode: generates N fake messages for visual scaling tests.
// Triggered by `?demo=N` on the URL.
const DEMO_NAMES = [
  "Alex", "Sam", "Jordan", "Riley", "Taylor", "Morgan", "Casey", "Jamie",
  "Dakota", "Quinn", "Avery", "Reese", "Skylar", "Rowan", "Sage", "Hayden",
];
const DEMO_MESSAGES = [
  "Hey, just stopping by!",
  "Love the site",
  "Cool portfolio",
  "GG",
  "👋 from the internet",
  "First time here, neat work",
  "Beautiful design",
  "Just say hello",
  "👀 cool stuff",
  "Bookmarked",
  "Wish I could draw like this",
  "Came for the blog, stayed for the wall",
  "Saw your post on HN, lovely",
  "RSS subscribed",
  "Keep shipping",
  "💯",
];
function generateDemoMessages(n: number): WallMessage[] {
  const out: WallMessage[] = [];
  const colors = COLORS.map((c) => c.id);
  for (let i = 0; i < n; i++) {
    out.push({
      id: `demo-${i}`,
      name: DEMO_NAMES[i % DEMO_NAMES.length],
      message: DEMO_MESSAGES[i % DEMO_MESSAGES.length],
      color: colors[i % colors.length],
      x: 0, // ignored at render — sunflower position computed from index
      y: 0,
      rotation: randomRotation(),
      createdAt: new Date(Date.now() - i * 60_000).toISOString(),
    });
  }
  return out;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.floor(day / 7)}w ago`;
  if (day < 365) return `${Math.floor(day / 30)}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

export function CommunityWallReact({ demoMessages }: { demoMessages?: WallMessage[] } = {}) {
  const [messages, setMessages] = useState<WallMessage[]>(demoMessages ?? []);
  const [isLoading, setIsLoading] = useState(!demoMessages);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("pink");
  const [website, setWebsite] = useState(""); // honeypot
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Random placeholder pair, locked in at first mount.
  const [namePlaceholder] = useState(() => pickRandom(NAME_PLACEHOLDERS));
  const [messagePlaceholder] = useState(() => pickRandom(MESSAGE_PLACEHOLDERS));
  const [error, setError] = useState<string | null>(null);

  // Canvas pan + zoom state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 2;
  const hasInitiallyPanned = useRef(false);
  const dragState = useRef<{
    startX: number;
    startY: number;
    panStartX: number;
    panStartY: number;
    dragged: boolean;
  } | null>(null);
  const pinchState = useRef<{ d: number; s: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ---------- fetch messages (or generate demo for ?demo=N) ----------
  useEffect(() => {
    if (demoMessages) return; // Skip network in demo mode (used by /widgets catalog).
    // URL ?demo=N → render N fake messages without hitting the API
    const params = new URLSearchParams(window.location.search);
    const demoCount = Number(params.get("demo"));
    if (Number.isFinite(demoCount) && demoCount > 0) {
      setMessages(generateDemoMessages(Math.min(demoCount, 1000)));
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/wall/messages")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages ?? []);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- initial pan + zoom: center on world, fit ~50% of messages ----------
  const worldSize = computeWorldSize(messages.length);
  const worldCenter = worldSize / 2;

  useEffect(() => {
    if (hasInitiallyPanned.current) return;
    if (!canvasRef.current) return;
    if (isLoading) return;
    hasInitiallyPanned.current = true;

    const rect = canvasRef.current.getBoundingClientRect();

    // Fixed default zoom — same regardless of message count.
    // 0.7 = slightly zoomed out from 1× so the center cluster has breathing room.
    const initScale = 0.7;
    setScale(initScale);

    // Center the world inside the viewport at that scale.
    setPan({
      x: rect.width / 2 - worldCenter * initScale,
      y: rect.height / 2 - worldCenter * initScale,
    });
  }, [isLoading, messages.length, worldSize]);

  // ---------- zoom: wheel (desktop) + pinch (touch), anchored at cursor ----------
  // Use refs in the wheel handler so we always read the latest pan/scale
  // without re-binding the listener on every change.
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const prevScale = scaleRef.current;
      const next = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, prevScale - e.deltaY * 0.002),
      );
      if (next === prevScale) return;

      // Keep the world point under the cursor fixed during zoom.
      const prevPan = panRef.current;
      const worldX = (cx - prevPan.x) / prevScale;
      const worldY = (cy - prevPan.y) / prevScale;
      const newPan = { x: cx - worldX * next, y: cy - worldY * next };

      setScale(next);
      setPan(newPan);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchState.current = { d: Math.hypot(dx, dy), s: scale };
    }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchState.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newD = Math.hypot(dx, dy);
      const next = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, pinchState.current.s * (newD / pinchState.current.d)),
      );
      // Anchor zoom at midpoint of the two fingers.
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      const prevScale = scaleRef.current;
      const prevPan = panRef.current;
      const worldX = (mx - prevPan.x) / prevScale;
      const worldY = (my - prevPan.y) / prevScale;
      setScale(next);
      setPan({ x: mx - worldX * next, y: my - worldY * next });
    }
  }
  function handleTouchEnd() {
    pinchState.current = null;
  }

  // ---------- pan handlers ----------
  function handlePointerDown(e: React.PointerEvent) {
    // Drag to pan works anywhere on the canvas, including over sticky notes.
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      panStartX: pan.x,
      panStartY: pan.y,
      dragged: false,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.dragged = true;
    setPan({
      x: dragState.current.panStartX + dx,
      y: dragState.current.panStartY + dy,
    });
  }
  function handlePointerUp(e: React.PointerEvent) {
    dragState.current = null;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  // ---------- submit ----------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !message.trim()) {
      setError("Please fill in your name and message.");
      return;
    }

    setSubmitting(true);
    // Position is computed at render time (sunflower); only rotation is stored.
    const placement = { x: 0, y: 0, rotation: randomRotation() };

    try {
      const res = await fetch("/api/wall/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          message: message.trim(),
          color,
          website, // honeypot — must be empty
          turnstile: turnstileToken,
          ...placement,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        // Reset Turnstile so retry gets a fresh single-use token
        setTurnstileToken("");
        window.turnstile?.reset();
        return;
      }
      // Prepend the new message and close the modal. The new note will be at
      // the spiral center (index 0) by sunflower layout — pan there.
      setMessages((prev) => [data.message, ...prev]);
      setIsModalOpen(false);
      setName("");
      setMessage("");
      setColor("pink");
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const newWorld = computeWorldSize(messages.length + 1);
        const wc = newWorld / 2;
        setPan({
          x: rect.width / 2 - wc * scaleRef.current,
          y: rect.height / 2 - wc * scaleRef.current,
        });
      }
    } catch {
      setError("Network error. Try again.");
      setTurnstileToken("");
      window.turnstile?.reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Header with the "Leave a note" CTA */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-text-tertiary">
          {isLoading
            ? "Loading messages…"
            : messages.length === 0
              ? ""
              : `${messages.length} ${messages.length === 1 ? "message" : "messages"}`}
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
        >
          Leave a note
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`relative h-[600px] overflow-hidden rounded-2xl border border-border-primary bg-bg-primary ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ touchAction: "none" }}
      >
        {/* Dot pattern background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(120,120,140,0.2) 1px, transparent 2px)",
            backgroundSize: "24px 24px",
            backgroundPosition: `${pan.x % 24}px ${pan.y % 24}px`,
          }}
        />

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-text-tertiary">
              No messages yet. Be the first to leave a note.
            </p>
          </div>
        )}

        {/* Sticky notes layer */}
        <div
          className="absolute left-0 top-0 select-none"
          style={{
            width: worldSize,
            height: worldSize,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          {messages.map((m, i) => {
            const { dx, dy } = sunflowerOffset(i);
            const x = worldCenter + dx - NOTE_W / 2;
            const y = worldCenter + dy - NOTE_H / 2;
            return (
              <StickyNote
                key={m.id}
                message={{ ...m, x, y }}
                zIndex={messages.length - i}
              />
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-bg-primary p-6 shadow-2xl"
            >
              <h2 className="mb-1 text-xl font-medium text-text-primary">
                Leave a note
              </h2>
              <p className="mb-4 text-sm text-text-tertiary">
                Leave a message, share your thoughts, or just say hello.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot — hidden from real users */}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="absolute -left-[9999px] h-0 w-0"
                  aria-hidden="true"
                />

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                    placeholder={namePlaceholder}
                    className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Message{" "}
                    <span className="text-text-tertiary">
                      ({message.length}/280)
                    </span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={280}
                    rows={4}
                    placeholder={messagePlaceholder}
                    className="w-full resize-none rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-text-secondary">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setColor(c.id)}
                        aria-label={`Pick ${c.id}`}
                        className={`h-8 w-8 rounded-full ${c.swatch} ring-offset-2 transition ${
                          color === c.id
                            ? "ring-2 ring-indigo-500"
                            : "hover:scale-110"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Cloudflare Turnstile bot wall (renders only if site key configured) */}
                {TURNSTILE_SITE_KEY && (
                  <div className="pt-1">
                    <TurnstileWidget
                      siteKey={TURNSTILE_SITE_KEY}
                      onToken={setTurnstileToken}
                    />
                  </div>
                )}

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      (TURNSTILE_SITE_KEY !== "" && !turnstileToken)
                    }
                    className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      TURNSTILE_SITE_KEY !== "" && !turnstileToken
                        ? "Verifying you're human…"
                        : undefined
                    }
                  >
                    {submitting
                      ? "Posting…"
                      : TURNSTILE_SITE_KEY !== "" && !turnstileToken
                        ? "Verifying…"
                        : "Post"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StickyNote({ message, zIndex }: { message: WallMessage; zIndex?: number }) {
  const colorClass = COLOR_LOOKUP[message.color] ?? COLOR_LOOKUP.pink;
  return (
    <div
      data-sticky
      className={`wall-note absolute flex flex-col rounded-lg border p-4 ${colorClass}`}
      style={{
        left: message.x,
        top: message.y,
        width: NOTE_W,
        minHeight: NOTE_H,
        ["--rotate" as any]: `${message.rotation}deg`,
        zIndex,
      }}
    >
      <p className="wall-note__msg flex-1 whitespace-pre-wrap break-words">
        {message.message}
      </p>
      <div className="wall-note__sig mt-3 flex items-baseline justify-end gap-1.5 self-end">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
          {message.name}
        </span>
        <span className="text-xs text-zinc-500">·</span>
        <span className="text-xs text-zinc-500">
          {formatRelativeTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
