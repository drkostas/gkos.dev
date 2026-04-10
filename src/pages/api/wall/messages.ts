import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { getSupabasePublic, getSupabaseAdmin, type WallMessage } from "@/lib/supabase";

export const prerender = false;

const ALLOWED_COLORS = ["pink", "yellow", "blue", "green", "purple", "orange"];

// In-memory rate limiter: 1 message per IP per 30s. Module-scoped Map.
// Survives across requests in the same Vercel Function instance, resets on
// cold start. Good enough for a hobby site.
const lastSubmit = new Map<string, number>();
const SUBMIT_COOLDOWN_MS = 30_000;

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
        // Edge cache for 30s, allow stale for 5 min
        "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=300",
      },
    },
  );
};

// ----------------------------------------------------------------------------
// POST /api/wall/messages — create a new message
// ----------------------------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  // Cooldown check
  const last = lastSubmit.get(ipHash) ?? 0;
  const now = Date.now();
  if (now - last < SUBMIT_COOLDOWN_MS) {
    const waitSec = Math.ceil((SUBMIT_COOLDOWN_MS - (now - last)) / 1000);
    return new Response(
      JSON.stringify({ error: `Slow down — try again in ${waitSec}s` }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Honeypot — bots fill in the hidden field, real users don't
  if (body.website && String(body.website).trim() !== "") {
    // Pretend it succeeded so the bot doesn't retry
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

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

  const admin = getSupabaseAdmin();
  if (!admin) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  lastSubmit.set(ipHash, now);

  return new Response(JSON.stringify({ message: rowToMessage(data) }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
