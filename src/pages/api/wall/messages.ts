import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import {
  getSupabasePublic,
  getSupabaseAdmin,
  logModerationBlock,
  type WallMessage,
} from "@/lib/supabase";
import { checkContent } from "@/lib/moderation";
import { getVisitorInfo } from "@/lib/visitor";
import { notify } from "@/lib/notify";

export const prerender = false;

const ALLOWED_COLORS = [
  "pink", "rose", "orange", "amber", "yellow", "lime",
  "green", "teal", "blue", "purple", "fuchsia", "stone",
];

// In-memory IP cooldown — atomic CHECK + RESERVE pattern.
// Reserved synchronously before any await so a flood of parallel requests
// from one IP can only get one slot through.
const lastSubmit = new Map<string, number>();
const SUBMIT_COOLDOWN_MS = 30_000;

// Strict per-day limit: 1 successful message per IP per 24h. Persistent (DB).
const PER_DAY_HOURS = 24;

// Block budget: at most this many tone/safety blocks per IP per 24h.
// In-memory; resets on cold start (acceptable trade-off for a personal site).
const MAX_BLOCKS_PER_DAY = 2;
const blockedByIp = new Map<string, number[]>();

function recordBlock(ipHash: string): void {
  const now = Date.now();
  const cutoff = now - PER_DAY_HOURS * 3600 * 1000;
  const fresh = (blockedByIp.get(ipHash) ?? []).filter((t) => t > cutoff);
  fresh.push(now);
  blockedByIp.set(ipHash, fresh);
}
function getRecentBlocks(ipHash: string): number {
  const cutoff = Date.now() - PER_DAY_HOURS * 3600 * 1000;
  return (blockedByIp.get(ipHash) ?? []).filter((t) => t > cutoff).length;
}

// Spam heuristic: reject obvious link spam.
const MAX_LINKS = 2;
const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

// Origin allowlist — only browsers from trusted origins can submit.
// Bots that don't send Origin are silently rejected.
const ALLOWED_ORIGINS = new Set([
  "https://gkos.dev",
  "http://localhost:4321",
]);

// Global cap on OpenAI calls per minute. Prevents a multi-IP attack from
// racking up quota usage. Sliding 1-minute window.
const GLOBAL_OPENAI_RPM = 20;
const globalOpenAITimestamps: number[] = [];

function reserveGlobalOpenAISlot(): boolean {
  const now = Date.now();
  const cutoff = now - 60_000;
  while (globalOpenAITimestamps.length && globalOpenAITimestamps[0] < cutoff) {
    globalOpenAITimestamps.shift();
  }
  if (globalOpenAITimestamps.length >= GLOBAL_OPENAI_RPM) return false;
  globalOpenAITimestamps.push(now);
  return true;
}

// Cloudflare Turnstile verification. Server-to-server, free, fast (~50ms).
// Fails open if TURNSTILE_SECRET_KEY missing (so dev works without setup).
async function verifyTurnstile(
  token: string,
  ip: string,
): Promise<{ ok: boolean; reason?: string }> {
  const secret =
    (import.meta.env.TURNSTILE_SECRET_KEY as string | undefined) ??
    process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY missing — skipping verification",
    );
    return { ok: true };
  }
  if (!token) {
    return { ok: false, reason: "Bot check missing — please reload the page" };
  }
  try {
    const params = new URLSearchParams({
      secret,
      response: token,
      remoteip: ip,
    });
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      },
    );
    if (!res.ok) {
      console.warn("[turnstile] verify HTTP", res.status);
      return { ok: false, reason: "Bot check service unavailable" };
    }
    const data = await res.json();
    if (data.success) return { ok: true };
    console.warn("[turnstile] verify failed", data["error-codes"]);
    return { ok: false, reason: "Bot check failed — please retry" };
  } catch (err) {
    console.warn("[turnstile] verify error", err);
    return { ok: false, reason: "Bot check error" };
  }
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function countLinks(text: string): number {
  const matches = text.match(URL_RE);
  return matches ? matches.length : 0;
}

function rowToMessage(row: any): WallMessage {
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    color: row.color,
    x: row.x,
    y: row.y,
    rotation: row.rotation,
    createdAt: row.created_at,
  };
}

// ----------------------------------------------------------------------------
// GET /api/wall/messages — list all visible messages
// ----------------------------------------------------------------------------

export const GET: APIRoute = async () => {
  const supabase = getSupabasePublic();
  if (!supabase) {
    return new Response(JSON.stringify({ messages: [], error: "supabase not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("wall_messages")
    .select("id, name, message, color, x, y, rotation, created_at")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[api/wall/messages GET]", error);
    return new Response(JSON.stringify({ messages: [], error: "fetch failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ messages: (data ?? []).map(rowToMessage) }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=300",
      },
    },
  );
};

// ----------------------------------------------------------------------------
// POST /api/wall/messages — create a new message
// ----------------------------------------------------------------------------
//
// Defense pipeline (cheapest first; abort on first fail):
//   1.  Parse JSON
//   2.  Honeypot field (silent success for bots)
//   3.  Origin allowlist (rejects non-browser callers / wrong origins)
//   4.  Field validation (lengths, types)
//   5.  Cloudflare Turnstile token verification (fails open if no key)
//   6.  Link-count heuristic (≤ MAX_LINKS)
//   7.  In-memory IP cooldown — atomic CHECK + RESERVE before any await,
//       so parallel requests from one IP can't all slip through.
//   8.  Block budget (max blocks/IP/24h — refuses upfront once exceeded)
//   9.  DB-side per-day rate limit (1 successful message/IP/24h, persistent)
//  10.  Global OpenAI rate cap — sliding 1-min window across all IPs.
//       Prevents multi-IP attacks from blowing through quota.
//  11.  Content check (safety + tone via @/lib/moderation, "strict" policy).
//       Both layers fail open if API key missing or call errors.
//       On block, increments the block budget and surfaces remaining tries.
//  12.  DB insert.

export const POST: APIRoute = async ({ request }) => {
  // ---- 1. Parse JSON ----
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ---- 2. Honeypot ----
  if (body.website && String(body.website).trim() !== "") {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // ---- 3. Origin allowlist ----
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ---- 4. Validate fields ----
  const name = String(body.name ?? "").trim();
  const message = String(body.message ?? "").trim();
  const color = ALLOWED_COLORS.includes(body.color) ? body.color : "pink";
  const x = Number.isFinite(body.x) ? Math.max(0, Math.min(2000, Math.round(body.x))) : 500;
  const y = Number.isFinite(body.y) ? Math.max(0, Math.min(2000, Math.round(body.y))) : 500;
  const rotation = Number.isFinite(body.rotation)
    ? Math.max(-15, Math.min(15, Math.round(body.rotation)))
    : 0;

  if (name.length < 1 || name.length > 40) {
    return new Response(JSON.stringify({ error: "Name must be 1-40 chars" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (message.length < 1 || message.length > 280) {
    return new Response(JSON.stringify({ error: "Message must be 1-280 chars" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip = getClientIp(request);
  const ipHash = hashIp(ip);
  const visitor = getVisitorInfo(request);

  // ---- 5. Turnstile (Cloudflare bot wall) ----
  const turnstileToken = String(body.turnstile ?? "");
  const ts = await verifyTurnstile(turnstileToken, ip);
  if (!ts.ok) {
    return new Response(JSON.stringify({ error: ts.reason }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ---- 6. Link spam heuristic ----
  if (countLinks(message) > MAX_LINKS) {
    return new Response(
      JSON.stringify({ error: "Too many links — looks like spam." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // ---- 7. In-memory IP cooldown — ATOMIC CHECK + RESERVE ----
  // Reservation must happen synchronously before any await to be atomic.
  const last = lastSubmit.get(ipHash) ?? 0;
  const now = Date.now();
  if (now - last < SUBMIT_COOLDOWN_MS) {
    const waitSec = Math.ceil((SUBMIT_COOLDOWN_MS - (now - last)) / 1000);
    return new Response(
      JSON.stringify({ error: `Slow down — try again in ${waitSec}s` }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }
  lastSubmit.set(ipHash, now); // reserve slot — no await between check and set

  // ---- 8. Block budget ----
  if (getRecentBlocks(ipHash) >= MAX_BLOCKS_PER_DAY) {
    return new Response(
      JSON.stringify({
        error: "You've used your tries for today. Come back tomorrow.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // ---- 9. DB-side per-day rate limit ----
  const admin = getSupabaseAdmin();
  if (!admin) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const since = new Date(now - PER_DAY_HOURS * 3600 * 1000).toISOString();
  const { data: recent, error: rlErr } = await admin
    .from("wall_messages")
    .select("id")
    .eq("ip_hash", ipHash)
    .gte("created_at", since)
    .limit(1);
  if (rlErr) {
    console.error("[api/wall/messages POST] rate-limit query failed", rlErr);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (recent && recent.length > 0) {
    return new Response(
      JSON.stringify({
        error: "You've already left a note today. Come back tomorrow!",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // ---- 10. Global OpenAI cap (sliding 1-min window) ----
  if (!reserveGlobalOpenAISlot()) {
    return new Response(
      JSON.stringify({
        error: "The wall is busy right now. Please try again in a minute.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // ---- 11. Content check (safety + tone) ----
  const check = await checkContent(`${name}: ${message}`, "strict");
  if (!check.ok) {
    recordBlock(ipHash);
    void logModerationBlock({
      source: "wall",
      reason: check.reason ?? "blocked by moderation",
      ip_hash: ipHash,
      country: visitor.country,
      preview: `${name}: ${message}`.slice(0, 400),
    });
    const remaining = MAX_BLOCKS_PER_DAY - getRecentBlocks(ipHash);
    const suffix =
      remaining > 0
        ? ` (${remaining} ${remaining === 1 ? "try" : "tries"} left today)`
        : " (no more tries today)";
    return new Response(JSON.stringify({ error: check.reason + suffix }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ---- 12. Insert ----
  const { data, error } = await admin
    .from("wall_messages")
    .insert({
      name,
      message,
      color,
      x,
      y,
      rotation,
      ip_hash: ipHash,
      country: visitor.country,
      device_type: visitor.deviceType,
      browser_family: visitor.browserFamily,
    })
    .select("id, name, message, color, x, y, rotation, created_at")
    .single();

  if (error) {
    console.error("[api/wall/messages POST]", error);
    return new Response(JSON.stringify({ error: "Failed to save" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fire-and-forget notification email.
  void notify({
    kind: "wall",
    data: { name, message, color, country: visitor.country },
  });

  return new Response(JSON.stringify({ message: rowToMessage(data) }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
