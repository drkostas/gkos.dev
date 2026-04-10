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
