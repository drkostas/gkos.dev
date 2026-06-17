/**
 * Reactions API.
 *
 * GET  /api/reactions?post=<slug>      → counts for a single post
 * GET  /api/reactions                  → totals across every post
 * GET  /api/reactions/top              → top N most-reacted posts
 * POST /api/reactions                  → add a reaction (JSON: { post, emoji })
 *
 * Reactions are de-duplicated per (post, emoji, ip_hash). The same IP can use
 * each emoji once per post — they cannot double-stack the same reaction.
 *
 * Inserts go through the service-role Supabase client because anon doesn't
 * have INSERT permission on the reactions table.
 */

import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import {
  addReaction,
  removeReaction,
  getReactionCounts,
  getTopReactedPosts,
  getTotalReactions,
  EMOJI_TYPES,
  type EmojiType,
} from "@/lib/supabase";
import { getVisitorInfo } from "@/lib/visitor";
import { notify } from "@/lib/notify";

export const prerender = false;

const IP_HASH_SALT = process.env.IP_HASH_SALT ?? "portfolio-v2-reactions-default-salt";

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function hashIp(ip: string, ua: string): string {
  return createHash("sha256").update(`${ip}|${ua}|${IP_HASH_SALT}`).digest("hex").slice(0, 24);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

// ----------------------------------------------------------------------------
// GET — read counts
// ----------------------------------------------------------------------------

export const GET: APIRoute = async ({ url }) => {
  const post = url.searchParams.get("post");
  const view = url.searchParams.get("view");

  if (view === "top") {
    const top = await getTopReactedPosts(5);
    return json({ top });
  }

  if (post) {
    const counts = await getReactionCounts(post);
    return json({ post, counts });
  }

  // Default: site-wide totals + top 5, used by /stats page.
  const [totals, top] = await Promise.all([getTotalReactions(), getTopReactedPosts(5)]);
  return json({ totals, top });
};

// ----------------------------------------------------------------------------
// POST — add a reaction
// ----------------------------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  let payload: { post?: string; emoji?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const post = (payload.post ?? "").trim();
  const emoji = (payload.emoji ?? "").trim() as EmojiType;

  if (!post || post.length > 200) {
    return json({ error: "Missing or oversized post slug" }, 400);
  }
  if (!EMOJI_TYPES.includes(emoji)) {
    return json({ error: `emoji must be one of ${EMOJI_TYPES.join(", ")}` }, 400);
  }

  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";
  const ipHash = hashIp(ip, ua);
  const visitor = getVisitorInfo(request);

  const result = await addReaction(post, emoji, ipHash, visitor);
  if (!result) {
    return json({ error: "Could not record reaction" }, 500);
  }
  const { counts, isNew, id: reactionId } = result;

  // Notify only on the first reaction from this IP+emoji, not on retries.
  if (isNew) {
    const total = counts.like + counts.heart + counts.celebrate + counts.insightful;
    void notify({
      kind: "reaction",
      data: {
        postSlug: post,
        emoji,
        postTotalAfter: total,
        entityId: reactionId ?? undefined,
        ip: ipHash,
        visitor: {
          country: visitor.country,
          city: visitor.city,
          region: visitor.region,
          device: visitor.deviceType,
          browser: visitor.browserFamily,
          browserVersion: visitor.browserVersion,
          os: visitor.osFamily,
          userAgent: visitor.userAgent,
          referrer: visitor.referrer,
          language: visitor.acceptLanguage,
        },
      },
    });
  }

  return json({ post, counts });
};

// ----------------------------------------------------------------------------
// DELETE — take back a reaction (same dedup key as POST)
// ----------------------------------------------------------------------------

export const DELETE: APIRoute = async ({ request }) => {
  let payload: { post?: string; emoji?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const post = (payload.post ?? "").trim();
  const emoji = (payload.emoji ?? "").trim() as EmojiType;

  if (!post || post.length > 200) {
    return json({ error: "Missing or oversized post slug" }, 400);
  }
  if (!EMOJI_TYPES.includes(emoji)) {
    return json({ error: `emoji must be one of ${EMOJI_TYPES.join(", ")}` }, 400);
  }

  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";
  const ipHash = hashIp(ip, ua);

  const counts = await removeReaction(post, emoji, ipHash);
  if (!counts) {
    return json({ error: "Could not remove reaction" }, 500);
  }
  // Deliberately silent — no notification on un-react.
  return json({ post, counts });
};
