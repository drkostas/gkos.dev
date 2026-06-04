/**
 * Blog comments API.
 *
 * GET  /api/blog/comments?post=<slug>   → comments for one post (newest first)
 * GET  /api/blog/comments               → totals + top-N most-commented
 * POST /api/blog/comments               → create a comment
 *
 * POST goes through the same defense pipeline as the community wall, with
 * slightly looser per-day caps (5 comments per IP per 24h instead of 1).
 */

import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import {
  addComment,
  getCommentsForPost,
  getTopCommentedPosts,
  getTotalCommentCount,
  logModerationBlock,
} from "@/lib/supabase";
import { checkContent } from "@/lib/moderation";
import { getVisitorInfo } from "@/lib/visitor";
import { notify } from "@/lib/notify";

export const prerender = false;

// ----------------------------------------------------------------------------
// Defense knobs
// ----------------------------------------------------------------------------

const IP_HASH_SALT =
  process.env.IP_HASH_SALT ?? "portfolio-v2-reactions-default-salt";
const SUBMIT_COOLDOWN_MS = 30_000;
const PER_DAY_HOURS = 24;
const MAX_PER_DAY = 5;
const MAX_LINKS = 2;
const MAX_BLOCKS_PER_DAY = 3;
const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

const ALLOWED_ORIGINS = new Set([
  "https://gkos.dev",
  "https://www.gkos.dev",
  "http://localhost:4321",
]);

const lastSubmit = new Map<string, number>();
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

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function hashIp(ip: string, ua: string): string {
  return createHash("sha256")
    .update(`${ip}|${ua}|${IP_HASH_SALT}`)
    .digest("hex")
    .slice(0, 24);
}

function countLinks(text: string): number {
  const m = text.match(URL_RE);
  return m ? m.length : 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// ----------------------------------------------------------------------------
// GET
// ----------------------------------------------------------------------------

export const GET: APIRoute = async ({ url }) => {
  const post = url.searchParams.get("post");
  if (post) {
    const comments = await getCommentsForPost(post);
    return json({ post, comments });
  }
  const [total, top] = await Promise.all([
    getTotalCommentCount(),
    getTopCommentedPosts(5),
  ]);
  return json({ total, top });
};

// ----------------------------------------------------------------------------
// POST
// ----------------------------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Honeypot: silent success for obvious bots.
  if (body.website && String(body.website).trim() !== "") {
    return json({ ok: true });
  }

  // Origin allowlist.
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: "Forbidden origin" }, 403);
  }

  const postSlug = String(body.post ?? "").trim();
  const author = String(body.author ?? "").trim();
  const commentBody = String(body.body ?? "").trim();

  if (!postSlug || postSlug.length > 200) {
    return json({ error: "Missing or oversized post slug" }, 400);
  }
  if (commentBody.length < 1 || commentBody.length > 1000) {
    return json({ error: "Comment must be 1-1000 characters" }, 400);
  }
  if (author.length > 40) {
    return json({ error: "Name must be 40 characters or fewer" }, 400);
  }
  if (countLinks(commentBody) > MAX_LINKS) {
    return json({ error: "Too many links — looks like spam." }, 400);
  }

  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";
  const ipHash = hashIp(ip, ua);
  const visitor = getVisitorInfo(request);

  // In-memory cooldown — atomic CHECK + RESERVE before any await.
  const last = lastSubmit.get(ipHash) ?? 0;
  const now = Date.now();
  if (now - last < SUBMIT_COOLDOWN_MS) {
    const waitSec = Math.ceil((SUBMIT_COOLDOWN_MS - (now - last)) / 1000);
    return json({ error: `Slow down — try again in ${waitSec}s` }, 429);
  }
  lastSubmit.set(ipHash, now);

  if (getRecentBlocks(ipHash) >= MAX_BLOCKS_PER_DAY) {
    return json(
      { error: "You've used your tries for today. Come back tomorrow." },
      429,
    );
  }

  // DB-side per-day cap (persistent across cold starts).
  const since = new Date(now - PER_DAY_HOURS * 3600 * 1000).toISOString();
  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const admin = getSupabaseAdmin();
  if (!admin) return json({ error: "Server not configured" }, 500);
  const { count, error: rlErr } = await admin
    .from("blog_comments")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (rlErr) {
    console.error("[api/blog/comments POST] rate-limit query failed", rlErr);
    return json({ error: "Server error" }, 500);
  }
  if ((count ?? 0) >= MAX_PER_DAY) {
    return json(
      {
        error: `You've hit the ${MAX_PER_DAY}-comment daily cap. Come back tomorrow.`,
      },
      429,
    );
  }

  // Content moderation (safety + tone). Fails open if no API key.
  const check = await checkContent(
    `${author || "anon"}: ${commentBody}`,
    "strict",
  );
  if (!check.ok) {
    recordBlock(ipHash);
    // Log for the daily digest (fire-and-forget)
    void logModerationBlock({
      source: "comment",
      reason: check.reason ?? "blocked by moderation",
      ip_hash: ipHash,
      country: visitor.country,
      preview: `${author || "anon"}: ${commentBody}`.slice(0, 400),
    });
    const remaining = MAX_BLOCKS_PER_DAY - getRecentBlocks(ipHash);
    const suffix =
      remaining > 0
        ? ` (${remaining} ${remaining === 1 ? "try" : "tries"} left today)`
        : " (no more tries today)";
    return json({ error: check.reason + suffix }, 400);
  }

  const comment = await addComment(
    postSlug,
    author || null,
    commentBody,
    ipHash,
    visitor,
  );
  if (!comment) return json({ error: "Could not save comment" }, 500);

  // Fire-and-forget notification email — never block the response on it.
  void notify({
    kind: "comment",
    data: {
      postSlug,
      authorName: comment.authorName,
      body: comment.body,
      country: visitor.country,
    },
  });

  return json({ comment }, 201);
};
