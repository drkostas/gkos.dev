/**
 * Supabase clients.
 *
 * Two clients:
 * - `supabasePublic`  — uses the publishable (anon) key. Safe for the browser.
 *                        Row-level security policies enforce what it can read/write.
 * - `supabaseAdmin`   — uses the secret key. Server-only. Bypasses RLS.
 *                        Used inside API routes for moderation / rate limiting.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Hybrid env access:
// - In Astro dev mode, Vite populates import.meta.env from .env.local
// - In Vercel runtime, process.env is populated by the platform
// Falling back covers both cases without needing astro:env schema setup.
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const PUBLIC_KEY = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = import.meta.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY;

let _public: SupabaseClient | null = null;
let _admin: SupabaseClient | null = null;

export function getSupabasePublic(): SupabaseClient | null {
  if (!SUPABASE_URL || !PUBLIC_KEY) {
    console.warn("[supabase] missing PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    return null;
  }
  if (!_public) {
    _public = createClient(SUPABASE_URL, PUBLIC_KEY, {
      auth: { persistSession: false },
    });
  }
  return _public;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_URL || !SECRET_KEY) {
    console.warn("[supabase] missing SUPABASE_SECRET_KEY");
    return null;
  }
  if (!_admin) {
    _admin = createClient(SUPABASE_URL, SECRET_KEY, {
      auth: { persistSession: false },
    });
  }
  return _admin;
}

// ----------------------------------------------------------------------------
// Reactions
// ----------------------------------------------------------------------------

export type EmojiType = "like" | "heart" | "celebrate" | "insightful";
export const EMOJI_TYPES: readonly EmojiType[] = ["like", "heart", "celebrate", "insightful"] as const;

export interface ReactionCounts {
  like: number;
  heart: number;
  celebrate: number;
  insightful: number;
}

export interface TopReactedPost {
  postSlug: string;
  totalReactions: number;
}

/** Fetch all reaction counts for a single blog post, grouped by emoji. */
export async function getReactionCounts(postSlug: string): Promise<ReactionCounts> {
  const zero: ReactionCounts = { like: 0, heart: 0, celebrate: 0, insightful: 0 };
  const supabase = getSupabasePublic();
  if (!supabase) return zero;
  const { data, error } = await supabase
    .from("reactions_per_post")
    .select("emoji_type, count")
    .eq("post_slug", postSlug);
  if (error || !data) {
    console.warn("[supabase] getReactionCounts:", error);
    return zero;
  }
  const counts: ReactionCounts = { ...zero };
  for (const row of data) {
    const emoji = row.emoji_type as EmojiType;
    if (emoji in counts) counts[emoji] = row.count ?? 0;
  }
  return counts;
}

/** Aggregate total reaction counts across all posts (for the /stats Reactions card). */
export async function getTotalReactions(): Promise<ReactionCounts> {
  const zero: ReactionCounts = { like: 0, heart: 0, celebrate: 0, insightful: 0 };
  const supabase = getSupabasePublic();
  if (!supabase) return zero;
  const { data, error } = await supabase.from("reactions_per_post").select("emoji_type, count");
  if (error || !data) {
    console.warn("[supabase] getTotalReactions:", error);
    return zero;
  }
  const totals: ReactionCounts = { ...zero };
  for (const row of data) {
    const emoji = row.emoji_type as EmojiType;
    if (emoji in totals) totals[emoji] += row.count ?? 0;
  }
  return totals;
}

/** Top-N most-reacted blog posts, ranked by total reaction count. */
export async function getTopReactedPosts(limit = 5): Promise<TopReactedPost[]> {
  const supabase = getSupabasePublic();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reactions_top_posts")
    .select("post_slug, total_reactions")
    .limit(limit);
  if (error || !data) {
    console.warn("[supabase] getTopReactedPosts:", error);
    return [];
  }
  return data.map((r) => ({ postSlug: r.post_slug, totalReactions: r.total_reactions ?? 0 }));
}

/**
 * Insert a reaction. Returns the new total counts for the post. Service-role
 * required because anon doesn't have insert permission on the table.
 *
 * `ipHash` should already be sha256(ip + UA + salt). Caller hashes; this
 * function never sees the raw IP.
 *
 * Duplicate inserts (same post + emoji + ipHash) are silently ignored thanks
 * to the unique index — we just return the existing counts.
 */
export async function addReaction(
  postSlug: string,
  emoji: EmojiType,
  ipHash: string,
): Promise<ReactionCounts | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { error } = await supabase
    .from("reactions")
    .insert({ post_slug: postSlug, emoji_type: emoji, ip_hash: ipHash });
  // 23505 = unique_violation — duplicate reaction, treat as success.
  if (error && error.code !== "23505") {
    console.warn("[supabase] addReaction:", error);
    return null;
  }
  return getReactionCounts(postSlug);
}

// ----------------------------------------------------------------------------
// Wall message types
// ----------------------------------------------------------------------------

export interface WallMessage {
  id: string;
  name: string;
  message: string;
  color: string; // background color token (e.g. "pink", "yellow")
  x: number; // canvas x coordinate (0-1000)
  y: number; // canvas y coordinate (0-1000)
  rotation: number; // degrees (-15 to 15)
  createdAt: string; // ISO
}

export interface NewWallMessage {
  name: string;
  message: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
}

/**
 * Count of visible (non-hidden) wall messages.
 * Used by /stats and the home bento. Returns 0 on any failure.
 */
export async function getWallMessageCount(): Promise<number> {
  const supabase = getSupabasePublic();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("wall_messages")
    .select("*", { count: "exact", head: true })
    .eq("hidden", false);
  if (error) {
    console.warn("[supabase] getWallMessageCount:", error);
    return 0;
  }
  return count ?? 0;
}
