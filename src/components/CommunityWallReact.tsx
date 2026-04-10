import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  { id: "pink", className: "bg-pink-200 border-pink-300", swatch: "bg-pink-300" },
  { id: "yellow", className: "bg-yellow-200 border-yellow-300", swatch: "bg-yellow-300" },
  { id: "blue", className: "bg-sky-200 border-sky-300", swatch: "bg-sky-300" },
  { id: "green", className: "bg-emerald-200 border-emerald-300", swatch: "bg-emerald-300" },
  { id: "purple", className: "bg-purple-200 border-purple-300", swatch: "bg-purple-300" },
  { id: "orange", className: "bg-orange-200 border-orange-300", swatch: "bg-orange-300" },
];

const COLOR_LOOKUP = Object.fromEntries(COLORS.map((c) => [c.id, c.className]));

// Canvas size — messages get random x/y inside this box
const CANVAS_W = 2000;
const CANVAS_H = 1400;
const NOTE_W = 220;
const NOTE_H = 220;

function randomPlacement() {
  const padding = 40;
  return {
    x: Math.round(padding + Math.random() * (CANVAS_W - NOTE_W - padding * 2)),
    y: Math.round(padding + Math.random() * (CANVAS_H - NOTE_H - padding * 2)),
    rotation: Math.round(-12 + Math.random() * 24),
  };
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

export function CommunityWallReact() {
  const [messages, setMessages] = useState<WallMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("pink");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canvas pan state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{
    startX: number;
    startY: number;
    panStartX: number;
    panStartY: number;
    dragged: boolean;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ---------- fetch messages ----------
  useEffect(() => {
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

  // ---------- center the pan on first load ----------
  useEffect(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setPan({
      x: -(CANVAS_W / 2 - rect.width / 2),
      y: -(CANVAS_H / 2 - rect.height / 2),
    });
  }, []);

  // ---------- pan handlers ----------
  function handlePointerDown(e: React.PointerEvent) {
    // Don't pan when clicking inside a sticky note
    if ((e.target as HTMLElement).closest("[data-sticky]")) return;
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
    const placement = randomPlacement();

    try {
      const res = await fetch("/api/wall/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          message: message.trim(),
          color,
          website, // honeypot — must be empty
          ...placement,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      // Prepend the new message and close the modal
      setMessages((prev) => [data.message, ...prev]);
      setIsModalOpen(false);
      setName("");
      setMessage("");
      setColor("pink");
      // Pan to the new note so the user sees it land
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setPan({
          x: -(data.message.x - rect.width / 2 + NOTE_W / 2),
          y: -(data.message.y - rect.height / 2 + NOTE_H / 2),
        });
      }
    } catch {
      setError("Network error. Try again.");
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
              No messages yet. Be the first to leave a note!
            </p>
          </div>
        )}

        {/* Sticky notes layer */}
        <div
          className="absolute left-0 top-0 select-none"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
          }}
        >
          {messages.map((m) => (
            <StickyNote key={m.id} message={m} />
          ))}
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
                Say hi, share a thought, or drop a recommendation.
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
                    placeholder="Ada Lovelace"
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
                    placeholder="Loved your work on..."
                    className="w-full resize-none rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-text-secondary">
                    Color
                  </label>
                  <div className="flex gap-2">
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
                    disabled={submitting}
                    className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? "Posting…" : "Post"}
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

function StickyNote({ message }: { message: WallMessage }) {
  const colorClass = COLOR_LOOKUP[message.color] ?? COLOR_LOOKUP.pink;
  return (
    <div
      data-sticky
      className={`absolute flex flex-col rounded-lg border p-4 shadow-md ${colorClass}`}
      style={{
        left: message.x,
        top: message.y,
        width: NOTE_W,
        minHeight: NOTE_H,
        transform: `rotate(${message.rotation}deg)`,
      }}
    >
      <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-snug text-zinc-800">
        {message.message}
      </p>
      <div className="mt-3 border-t border-black/10 pt-2">
        <p className="text-xs font-semibold text-zinc-800">— {message.name}</p>
        <p className="text-[10px] text-zinc-600">
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
